'use client';

import { useState, useRef, useCallback, useMemo } from 'react';
import { parseUltraStarTxt, convertUltraStarToSong } from '@/lib/parsers/ultrastar-parser';
import { normalizeFilePath } from '@/lib/tauri-file-storage';
import {
  scanFolderWithPicker,
  scanFilesFromFileList,
  convertScannedSongToSong,
  isFileSystemAccessSupported,
  ScannedSong,
} from '@/lib/parsers/folder-scanner';
import { addSong, addSongs, getAllSongs, replaceCustomSongs, acquireScanLock, invalidateSongCache } from '@/lib/game/song-library';
import { storeMedia } from '@/lib/db/media-db';
import { Song } from '@/types/game';
import { findDuplicates, DuplicateInfo, ProgressInfo } from './import-types';

export function useImportScreen(onImport: (song: Song) => void) {
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

  const [scannedSongs, setScannedSongs] = useState<ScannedSong[]>([]);
  const [selectedScanned, setSelectedScanned] = useState<Set<number>>(new Set());
  const [scanErrors, setScanErrors] = useState<string[]>([]);

  const [duplicates, setDuplicates] = useState<DuplicateInfo[]>([]);

  // Store Tauri scan result for native import path
  const tauriScanResultRef = useRef<any>(null);
  const tauriScanFolderRef = useRef<string | null>(null);

  const existingSongs = useMemo(() => getAllSongs(), []);

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
      setError('Failed to parse UltraStar file: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handleFileSelect = useCallback((type: 'audio' | 'video' | 'ultrastar', file: File) => {
    setError(null);
    setPreviewSong(null);
    switch (type) {
      case 'audio':
        setAudioFile(file);
        setAudioUrl(URL.createObjectURL(file));
        if (!title) setTitle(file.name.replace(/\.[^/.]+$/, ''));
        break;
      case 'video':
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
  }, [title, audioFile]);

  const handleDrop = useCallback((e: React.DragEvent, type: 'audio' | 'video' | 'ultrastar') => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(type, file);
  }, [handleFileSelect]);

  const processUltrastarImport = async () => {
    if (!ultrastarFile) { setError('Please provide an UltraStar txt file'); return; }
    if (!audioFile && !videoFile) { setError('Please provide an audio or video file'); return; }

    setIsProcessing(true);
    setProgress({ stage: 'loading', progress: 0, message: 'Processing UltraStar import...' });

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

      setProgress({ stage: 'processing', progress: 50, message: 'Storing media files...' });

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
        console.warn('[Import] Failed to store media:', mediaErr);
      }

      setPreviewSong(song);
      setProgress({ stage: 'complete', progress: 100, message: 'Import complete!' });
    } catch (err) {
      setError('Failed to import: ' + (err instanceof Error ? err.message : 'Unknown error'));
      setProgress({ stage: 'error', progress: 0, message: 'Import failed' });
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
    setProgress({ stage: 'loading', progress: 0, message: 'Scanning folder...' });

    try {
      // ── Tauri: Use native folder picker and filesystem scanner ──
      const { isTauri } = await import('@/lib/tauri-file-storage');
      if (isTauri()) {
        const { nativePickFolder } = await import('@/lib/native-fs');
        const { scanSongsFolderTauri } = await import('@/lib/tauri-file-storage');

        const folderPath = await nativePickFolder('Select Songs Folder');
        if (!folderPath) {
          // User cancelled
          setIsProcessing(false);
          setProgress(null);
          return;
        }

        setProgress({ stage: 'scanning', progress: 10, message: `Scanning ${folderPath}...` });
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
          audioFile: s.relativeAudioPath ? { name: s.relativeAudioPath.split('/').pop()! } as File : undefined,
          videoFile: s.relativeVideoPath ? { name: s.relativeVideoPath.split('/').pop()! } as File : undefined,
          txtFile: s.relativeTxtPath ? { name: s.relativeTxtPath.split('/').pop()! } as File : undefined,
          coverFile: s.relativeCoverPath ? { name: s.relativeCoverPath.split('/').pop()! } as File : undefined,
        }));

        setScannedSongs(displaySongs);
        setScanErrors(result.errors);
        setProgress({ stage: 'processing', progress: 90, message: 'Checking for duplicates...' });

        const duplicateResults = findDuplicates(displaySongs, existingSongs);
        setDuplicates(duplicateResults);
        const nonDuplicateIndexes = duplicateResults.filter(d => d.matchType === 'none').map(d => d.index);
        setSelectedScanned(new Set(nonDuplicateIndexes));

        setProgress({
          stage: 'complete', progress: 100,
          message: `Found ${result.songs.length} songs${result.errors.length ? ` (${result.errors.length} errors)` : ''}`,
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
        setError('Folder scanning not supported. Please use Chrome or Edge browser.');
        setIsProcessing(false);
        return;
      }

      setScannedSongs(result.songs);
      setScanErrors(result.errors);
      setProgress({ stage: 'processing', progress: 90, message: 'Checking for duplicates...' });

      const duplicateResults = findDuplicates(result.songs, existingSongs);
      setDuplicates(duplicateResults);
      const nonDuplicateIndexes = duplicateResults.filter(d => d.matchType === 'none').map(d => d.index);
      setSelectedScanned(new Set(nonDuplicateIndexes));

      setProgress({
        stage: 'complete', progress: 100,
        message: `Found ${result.songs.length} songs${result.errors.length ? ` (${result.errors.length} errors)` : ''}`,
      });
    } catch (err) {
      setError('Failed to scan folder: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
    setIsProcessing(false);
  };

  const importSelectedScanned = async () => {
    if (selectedScanned.size === 0) { setError('No songs selected'); return; }

    setIsProcessing(true);
    setProgress({ stage: 'loading', progress: 0, message: 'Importing songs...' });

    // ── Tauri: Import using native scan result (no File objects needed) ──
    if (tauriScanResultRef.current && tauriScanFolderRef.current) {
      const tauriResult = tauriScanResultRef.current;
      const folderPath = tauriScanFolderRef.current;
      const selectedArray = Array.from(selectedScanned);

      const scanLock = acquireScanLock();
      localStorage.setItem('karaoke-songs-folder', folderPath);

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
              calculatedDuration = Math.max(...scanned.lyrics.map(l => l.endTime)) + 5000;
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
              message: `Importing ${i + 1}/${selectedArray.length}: ${scanned.title}`,
            });
          } catch (err) {
            setScanErrors(prev => [...prev, `Failed to import ${scanned.title}: ${(err as Error).message}`]);
          }
        }

        if (songsToImport.length > 0) {
          replaceCustomSongs(songsToImport);
          invalidateSongCache();
        }

        setProgress({
          stage: 'complete', progress: 100,
          message: `Imported ${songsToImport.length} songs!`,
        });

        if (songsToImport.length > 0) {
          setTimeout(() => onImport(songsToImport[0]), 1500);
        }
      } catch (err) {
        setError('Tauri import failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
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
          message: `Importing ${i + 1}/${selectedArray.length}: ${scanned.title}`,
        });
      } catch (err) {
        setScanErrors(prev => [...prev, `Failed to import ${scanned.title}: ${(err as Error).message}`]);
      }
    }

    if (songsToImport.length > 0) {
      addSongs(songsToImport);
      if (detectedBaseFolder) {
        try {
          const existingFolder = localStorage.getItem('karaoke-songs-folder');
          if (!existingFolder) {
            localStorage.setItem('karaoke-songs-folder', detectedBaseFolder);
          }
        } catch (e) {
          console.warn('[Import] Could not save baseFolder to localStorage:', e);
        }
      }
    }

    setProgress({ stage: 'complete', progress: 100, message: `Imported ${songsToImport.length} songs!` });
    setIsProcessing(false);

    if (songsToImport.length > 0) {
      setTimeout(() => onImport(songsToImport[0]), 1500);
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
