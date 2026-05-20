'use client';

import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { parseUltraStarTxt, convertUltraStarToSong } from '@/lib/parsers/ultrastar-parser';
import { normalizeFilePath } from '@/lib/tauri-file-storage';
import { StorageKeys, getItem, setItem } from '@/lib/storage';
import {
  scanFolderWithPicker,
  scanFilesFromFileList,
  convertScannedSongToSong,
  isFileSystemAccessSupported,
  revokeAllScanBlobUrls,
  ScannedSong,
} from '@/lib/parsers/folder-scanner';
import { addSong, addSongs, getAllSongs, replaceCustomSongs, acquireScanLock, invalidateSongCache } from '@/lib/game/song-library';
import { storeMedia } from '@/lib/db/media-db';
import { Song } from '@/types/game';
import { findDuplicates, DuplicateInfo, ProgressInfo } from './import-types';

export function useImportScreen(onImport: (_song: Song) => void, translateFn: (key: string) => string = (key: string) => key) {
  const [importType, setImportType] = useState<'ultrastar' | 'folder' | 'alt-format'>('ultrastar');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<ProgressInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [ultrastarFile, setUltrastarFile] = useState<File | null>(null);

  const [audioUrl, setAudioUrl] = useState<string>('');
  const [videoUrl, setVideoUrl] = useState<string>('');

  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [useVideoAudio, setUseVideoAudio] = useState(false);

  const [previewSong, setPreviewSong] = useState<Song | null>(null);

  // Track current blob URLs for cleanup on unmount to prevent memory leaks.
  // handleFileSelect already revokes previous URLs on re-selection, but if the
  // component unmounts (user navigates away), those URLs stay allocated.
  const blobUrlsRef = useRef({ audio: audioUrl, video: videoUrl });
  useEffect(() => { blobUrlsRef.current = { audio: audioUrl, video: videoUrl }; }, [audioUrl, videoUrl]);
  useEffect(() => {
    return () => {
      const { audio, video } = blobUrlsRef.current;
      if (audio?.startsWith('blob:')) URL.revokeObjectURL(audio);
      if (video?.startsWith('blob:')) URL.revokeObjectURL(video);
      // H17: Revoke all blob URLs created during folder scanning
      revokeAllScanBlobUrls();
    };
  }, []);

  const [scannedSongs, setScannedSongs] = useState<ScannedSong[]>([]);
  const [selectedScanned, setSelectedScanned] = useState<Set<number>>(new Set());
  const [scanErrors, setScanErrors] = useState<string[]>([]);

  const [duplicates, setDuplicates] = useState<DuplicateInfo[]>([]);

  // Store Tauri scan result for native import path
  const tauriScanResultRef = useRef<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
  const tauriScanFolderRef = useRef<string | null>(null);
  const autoNavTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear auto-navigation timer on unmount
  useEffect(() => {
    return () => { if (autoNavTimerRef.current) clearTimeout(autoNavTimerRef.current); };
  }, []);

  // H20: Re-compute existingSongs on every render so re-scans detect duplicates correctly.
  // The empty dependency array caused stale data after songs were added.
  // eslint-disable-next-line react-hooks/exhaustive-deps -- scannedSongs triggers re-compute of existing songs
  const existingSongs = useMemo(() => getAllSongs(), [scannedSongs]);

  const audioInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const ultrastarInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const parseUltrastarFile = async (file: File) => {
    try {
      const text = await file.text();
      const ultraStar = parseUltraStarTxt(text);
      setTitle(ultraStar.title);
      setArtist(ultraStar.artist);
    } catch (err) {
      setError(translateFn('importHook.failedToParse').replace('{error}', err instanceof Error ? err.message : translateFn('importHook.unknownError')));
    }
  };

  const handleFileSelect = useCallback((type: 'audio' | 'video' | 'ultrastar', file: File) => {
    setError(null);
    setPreviewSong(null);
    switch (type) {
      case 'audio':
        if (audioUrl.startsWith('blob:')) URL.revokeObjectURL(audioUrl);
        setAudioFile(file);
        setAudioUrl(URL.createObjectURL(file));
        if (!title) setTitle(file.name.replace(/\.[^/.]+$/, ''));
        break;
      case 'video':
        if (videoUrl.startsWith('blob:')) URL.revokeObjectURL(videoUrl);
        setVideoFile(file);
        setVideoUrl(URL.createObjectURL(file));
        if (!audioFile && !title) {
          setTitle(file.name.replace(/\.[^/.]+$/, ''));
          setUseVideoAudio(true);
        }
        break;
      case 'ultrastar':
        setUltrastarFile(file);
        parseUltrastarFile(file);
        break;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- audioUrl/videoUrl excluded; effect triggers on title change which is sufficient
  }, [title, audioFile]);

  const handleDrop = useCallback((e: React.DragEvent, type: 'audio' | 'video' | 'ultrastar') => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(type, file);
  }, [handleFileSelect]);

  const processUltrastarImport = async () => {
    if (!ultrastarFile) { setError(translateFn('importHook.pleaseProvideTxt')); return; }
    if (!audioFile && !videoFile) { setError(translateFn('importHook.pleaseProvideMedia')); return; }

    setIsProcessing(true);
    setProgress({ stage: 'loading', progress: 0, message: translateFn('importHook.processingImport') });

    try {
      const text = await ultrastarFile.text();
      const ultraStar = parseUltraStarTxt(text);
      const finalAudioUrl = audioUrl || (useVideoAudio ? videoUrl : '');
      const song = convertUltraStarToSong(ultraStar, finalAudioUrl, videoUrl || undefined);

      if (title && title !== ultraStar.title) song.title = title;
      if (artist && artist !== ultraStar.artist) song.artist = artist;
      if (useVideoAudio && videoFile && !audioFile) {
        song.hasEmbeddedAudio = true;
        song.audioUrl = videoUrl;
      }

      setProgress({ stage: 'processing', progress: 50, message: translateFn('importHook.storingMedia') });

      try {
        if (ultrastarFile) {
          const txtContent = await ultrastarFile.text();
          if (txtContent && txtContent.length > 0) {
            const txtBlob = new Blob([txtContent], { type: 'text/plain' });
            await storeMedia(song.id, 'txt', txtBlob);
            song.storedTxt = true;
          }
        }
        const { storeSongFiles, isTauri, generateSongFolderName } = await import('@/lib/tauri-file-storage');
        if (isTauri() && (audioFile || videoFile)) {
          const songFolder = generateSongFolderName(song.title, song.artist);
          const storedPaths = await storeSongFiles(songFolder, {
            audio: audioFile || undefined,
            video: videoFile || undefined,
            txt: ultrastarFile || undefined,
            cover: undefined,
          });
          if (storedPaths.audioPath) song.relativeAudioPath = storedPaths.audioPath;
          if (storedPaths.videoPath) song.relativeVideoPath = storedPaths.videoPath;
          if (storedPaths.txtPath) song.relativeTxtPath = storedPaths.txtPath;
        }
      } catch (mediaErr) {
        // eslint-disable-next-line no-console
        console.warn('[Import] Failed to store media:', mediaErr);
      }

      setPreviewSong(song);
      setProgress({ stage: 'complete', progress: 100, message: translateFn('importHook.importComplete') });
    } catch (err) {
      setError(translateFn('importHook.failedToImport').replace('{error}', err instanceof Error ? err.message : translateFn('importHook.unknownError')));
      setProgress({ stage: 'error', progress: 0, message: translateFn('importHook.importFailed') });
    }
    setIsProcessing(false);
  };

  const handleScanFolder = async () => {
    setIsProcessing(true);
    setError(null);
    setScannedSongs([]);
    setScanErrors([]);
    setDuplicates([]);
    tauriScanResultRef.current = null;
    tauriScanFolderRef.current = null;
    setProgress({ stage: 'loading', progress: 0, message: translateFn('importHook.scanningFolder') });

    try {
      // ── Tauri: Use native folder picker and filesystem scanner ──
      const { isTauri } = await import('@/lib/tauri-file-storage');
      if (isTauri()) {
        const { nativePickFolder } = await import('@/lib/native-fs');
        const { scanSongsFolderTauri } = await import('@/lib/tauri-file-storage');

        const folderPath = await nativePickFolder(translateFn('importHook.selectSongsFolder'));
        if (!folderPath) {
          // User cancelled
          setIsProcessing(false);
          setProgress(null);
          return;
        }

        setProgress({ stage: 'scanning', progress: 10, message: translateFn('importHook.scanningPath').replace('{path}', folderPath) });
        const result = await scanSongsFolderTauri(folderPath);

        // Store Tauri result for later import
        tauriScanResultRef.current = result;
        tauriScanFolderRef.current = folderPath;

        // Convert TauriScannedSong[] to ScannedSong[] for display
        const displaySongs: ScannedSong[] = result.songs.map(s => ({
          title: s.title,
          artist: s.artist,
          folder: s.folderPath.split('/').pop() || s.folderPath,
          folderPath: s.folderPath,
          baseFolder: s.baseFolder,
          // Fake File objects — display only checks truthiness and .name
          audioFile: s.relativeAudioPath ? { name: s.relativeAudioPath.split('/').pop() || 'audio' } as File : undefined,
          videoFile: s.relativeVideoPath ? { name: s.relativeVideoPath.split('/').pop() || 'video' } as File : undefined,
          txtFile: s.relativeTxtPath ? { name: s.relativeTxtPath.split('/').pop() || 'song.txt' } as File : undefined,
          coverFile: s.relativeCoverPath ? { name: s.relativeCoverPath.split('/').pop() || 'cover' } as File : undefined,
        }));

        setScannedSongs(displaySongs);
        setScanErrors(result.errors);
        setProgress({ stage: 'processing', progress: 90, message: translateFn('importHook.checkingDuplicates') });

        const duplicateResults = findDuplicates(displaySongs, existingSongs);
        setDuplicates(duplicateResults);
        const nonDuplicateIndexes = duplicateResults.filter(d => d.matchType === 'none').map(d => d.index);
        setSelectedScanned(new Set(nonDuplicateIndexes));

        setProgress({
          stage: 'complete', progress: 100,
          message: translateFn('importHook.foundSongs').replace('{count}', String(result.songs.length)).replace('{duplicates}', result.errors.length ? translateFn('importHook.errors').replace('{count}', String(result.errors.length)) : ''),
        });
        setIsProcessing(false);
        return;
      }

      // ── Browser: existing File System Access / webkitdirectory flow ──
      let result;
      if (isFileSystemAccessSupported()) {
        result = await scanFolderWithPicker();
      } else if (folderInputRef.current?.files?.length) {
        result = await scanFilesFromFileList(folderInputRef.current.files);
      } else {
        setError(translateFn('importHook.folderScanNotSupported'));
        setIsProcessing(false);
        return;
      }

      setScannedSongs(result.songs);
      setScanErrors(result.errors);
      setProgress({ stage: 'processing', progress: 90, message: translateFn('importHook.checkingDuplicates') });

      const duplicateResults = findDuplicates(result.songs, existingSongs);
      setDuplicates(duplicateResults);
      const nonDuplicateIndexes = duplicateResults.filter(d => d.matchType === 'none').map(d => d.index);
      setSelectedScanned(new Set(nonDuplicateIndexes));

      setProgress({
        stage: 'complete', progress: 100,
        message: translateFn('importHook.foundSongs').replace('{count}', String(result.songs.length)).replace('{duplicates}', result.errors.length ? translateFn('importHook.errors').replace('{count}', String(result.errors.length)) : ''),
      });
    } catch (err) {
      setError(translateFn('importHook.failedToScanFolder').replace('{error}', err instanceof Error ? err.message : translateFn('importHook.unknownError')));
    }
    setIsProcessing(false);
  };

  const importSelectedScanned = async () => {
    if (selectedScanned.size === 0) { setError(translateFn('importHook.noSongsSelected')); return; }

    setIsProcessing(true);
    setProgress({ stage: 'loading', progress: 0, message: translateFn('importHook.importingSongs') });

    // ── Tauri: Import using native scan result (no File objects needed) ──
    if (tauriScanResultRef.current && tauriScanFolderRef.current) {
      const tauriResult = tauriScanResultRef.current;
      const folderPath = tauriScanFolderRef.current;
      const selectedArray = Array.from(selectedScanned);

      const scanLock = acquireScanLock();
      setItem(StorageKeys.SONGS_FOLDER, folderPath);

      try {
        const { storeMedia } = await import('@/lib/db/media-db');
        const { getSongMediaUrl } = await import('@/lib/tauri-file-storage');
        const songsToImport: Song[] = [];

        for (let i = 0; i < selectedArray.length; i++) {
          const scanned = tauriResult.songs[selectedArray[i]];
          try {
            const songId = `song-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
            let storedTxt = false;
            let coverImage: string | undefined = undefined;

            // Load TXT cache and cover image in parallel
            const [txtResult, coverResult] = await Promise.allSettled([
              (async () => {
                if (!scanned.relativeTxtPath) return false;
                const { nativeReadFileText } = await import('@/lib/native-fs');
                const txtContent = await nativeReadFileText(
                  `${normalizeFilePath(folderPath)}/${normalizeFilePath(scanned.relativeTxtPath)}`
                );
                if (txtContent) {
                  await storeMedia(songId, 'txt', new Blob([txtContent], { type: 'text/plain' }));
                  return true;
                }
                return false;
              })(),
              (async () => {
                if (!scanned.relativeCoverPath) return undefined;
                return await getSongMediaUrl(scanned.relativeCoverPath, folderPath) || undefined;
              })(),
            ]);

            if (txtResult.status === 'fulfilled') storedTxt = txtResult.value;
            if (coverResult.status === 'fulfilled') coverImage = coverResult.value;

            // Calculate duration
            let calculatedDuration = 180000;
            if (scanned.end && scanned.end > 0) {
              calculatedDuration = scanned.end;
            } else if (scanned.lyrics?.length > 0) {
              calculatedDuration = Math.max(...scanned.lyrics.map((l: { endTime: number }) => l.endTime)) + 5000;
            }

            const isVideoUrl = scanned.videoFile &&
              (scanned.videoFile.startsWith('http://') || scanned.videoFile.startsWith('https://'));
            const isMp3Url = scanned.mp3File &&
              (scanned.mp3File.startsWith('http://') || scanned.mp3File.startsWith('https://'));

            const song: Song = {
              id: songId,
              title: scanned.title,
              artist: scanned.artist,
              duration: calculatedDuration,
              bpm: scanned.bpm,
              difficulty: 'medium',
              rating: 3,
              gap: scanned.gap,
              baseFolder: folderPath,
              folderPath: scanned.folderPath,
              relativeTxtPath: scanned.relativeTxtPath,
              relativeAudioPath: scanned.relativeAudioPath,
              relativeVideoPath: scanned.relativeVideoPath,
              relativeCoverPath: scanned.relativeCoverPath,
              videoBackground: isVideoUrl ? scanned.videoFile : undefined,
              audioUrl: isMp3Url ? scanned.mp3File : undefined,
              relativeBackgroundPath: scanned.relativeBackgroundPath,
              coverImage,
              genre: scanned.genre,
              language: scanned.language,
              year: scanned.year,
              creator: scanned.creator,
              version: scanned.version,
              edition: scanned.edition,
              tags: scanned.tags,
              start: scanned.start,
              end: scanned.end,
              videoGap: scanned.videoGap,
              videoStart: scanned.videoStart,
              preview: scanned.previewStart ? {
                startTime: scanned.previewStart * 1000,
                duration: (scanned.previewDuration || 15) * 1000,
              } : undefined,
              previewStart: scanned.previewStart,
              previewDuration: scanned.previewDuration,
              medleyStartBeat: scanned.medleyStartBeat,
              medleyEndBeat: scanned.medleyEndBeat,
              isDuet: scanned.isDuet,
              duetPlayerNames: scanned.duetPlayerNames,
              lyrics: scanned.lyrics || [],
              storedTxt,
              storedMedia: false,
              hasEmbeddedAudio: scanned.hasEmbeddedAudio ?? (!scanned.relativeAudioPath && !!scanned.relativeVideoPath),
              mp3File: scanned.mp3File,
              coverFile: scanned.coverFile,
              backgroundFile: scanned.backgroundFile,
              videoFile: scanned.videoFile,
              dateAdded: Date.now(),
            };

            songsToImport.push(song);
            setProgress({
              stage: 'processing',
              progress: ((i + 1) / selectedArray.length) * 100,
              message: translateFn('importHook.importingProgress').replace('{current}', String(i + 1)).replace('{total}', String(selectedArray.length)).replace('{title}', scanned.title),
            });
          } catch (err) {
            setScanErrors(prev => [...prev, translateFn('importHook.failedToImportSong').replace('{title}', scanned.title).replace('{error}', (err as Error).message)]);
          }
        }

        if (songsToImport.length > 0) {
          replaceCustomSongs(songsToImport);
          invalidateSongCache();
        }

        setProgress({
          stage: 'complete', progress: 100,
          message: translateFn('importHook.importedCount').replace('{count}', String(songsToImport.length)),
        });

        if (songsToImport.length > 0) {
          if (autoNavTimerRef.current) clearTimeout(autoNavTimerRef.current);
          autoNavTimerRef.current = setTimeout(() => onImport(songsToImport[0]), 1500);
        }
      } catch (err) {
        setError(translateFn('importHook.tauriImportFailed').replace('{error}', err instanceof Error ? err.message : translateFn('importHook.unknownError')));
      } finally {
        scanLock.release();
        tauriScanResultRef.current = null;
        tauriScanFolderRef.current = null;
      }

      setIsProcessing(false);
      return;
    }

    // ── Browser: existing File-based import flow ──
    const songsToImport: Song[] = [];
    const selectedArray = Array.from(selectedScanned);
    let detectedBaseFolder: string | undefined;

    for (let i = 0; i < selectedArray.length; i++) {
      const index = selectedArray[i];
      const scanned = scannedSongs[index];
      if (!detectedBaseFolder && scanned.baseFolder) detectedBaseFolder = scanned.baseFolder;
      try {
        const song = await convertScannedSongToSong(scanned);
        songsToImport.push(song);
        setProgress({
          stage: 'processing', progress: ((i + 1) / selectedArray.length) * 100,
          message: translateFn('importHook.importingProgress').replace('{current}', String(i + 1)).replace('{total}', String(selectedArray.length)).replace('{title}', scanned.title),
        });
      } catch (err) {
        setScanErrors(prev => [...prev, translateFn('importHook.failedToImportSong').replace('{title}', scanned.title).replace('{error}', (err as Error).message)]);
      }
    }

    if (songsToImport.length > 0) {
      await addSongs(songsToImport);
      if (detectedBaseFolder) {
        if (!getItem(StorageKeys.SONGS_FOLDER)) {
          setItem(StorageKeys.SONGS_FOLDER, detectedBaseFolder);
        }
      }
    }

    setProgress({ stage: 'complete', progress: 100, message: translateFn('importHook.importedCount').replace('{count}', String(songsToImport.length)) });
    setIsProcessing(false);

    if (songsToImport.length > 0) {
      if (autoNavTimerRef.current) clearTimeout(autoNavTimerRef.current);
      autoNavTimerRef.current = setTimeout(() => onImport(songsToImport[0]), 1500);
    }
  };

  const confirmImport = () => {
    if (previewSong) {
      addSong(previewSong);
      onImport(previewSong);
    }
  };

  return {
    // State
    importType, setImportType, isProcessing, progress, error, setError,
    audioFile, videoFile, ultrastarFile, audioUrl, videoUrl,
    title, setTitle, artist, setArtist, useVideoAudio, setUseVideoAudio,
    previewSong, setPreviewSong, scannedSongs, setScannedSongs, selectedScanned, setSelectedScanned,
    scanErrors, setScanErrors, setIsProcessing,
    duplicates,
    // Refs
    audioInputRef, videoInputRef, ultrastarInputRef, folderInputRef,
    // Actions
    handleFileSelect, handleDrop, processUltrastarImport,
    handleScanFolder, importSelectedScanned, confirmImport,
  };
}
