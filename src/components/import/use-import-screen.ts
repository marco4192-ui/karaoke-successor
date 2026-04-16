'use client';

import { useState, useRef, useCallback, useMemo } from 'react';
import { parseUltraStarTxt, convertUltraStarToSong } from '@/lib/parsers/ultrastar-parser';
import {
  scanFolderWithPicker,
  scanFilesFromFileList,
  convertScannedSongToSong,
  isFileSystemAccessSupported,
  ScannedSong,
} from '@/lib/parsers/folder-scanner';
import { addSong, addSongs, getAllSongs } from '@/lib/game/song-library';
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
            console.log('[Import] Cached TXT content in IndexedDB');
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
          console.log('[Import] Stored files in AppData:', storedPaths);
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
    setProgress({ stage: 'loading', progress: 0, message: 'Scanning folder...' });

    try {
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
            console.log('[Import] Saved baseFolder to localStorage:', detectedBaseFolder);
          } else {
            console.log('[Import] localStorage already has karaoke-songs-folder:', existingFolder);
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
