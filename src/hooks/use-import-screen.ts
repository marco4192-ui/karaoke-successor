'use client';

import { useState, useMemo, useCallback } from 'react';
import { parseUltraStarTxt, convertUltraStarToSong } from '@/lib/parsers/ultrastar-parser';
import {
  scanFolderWithPicker,
  scanFilesFromFileList,
  convertScannedSongToSong,
  ScannedSong,
} from '@/lib/parsers/folder-scanner';
import { addSong, addSongs, getAllSongs } from '@/lib/game/song-library';
import { storeMedia } from '@/lib/db/media-db';
import { Song } from '@/types/game';
import { logger } from '@/lib/logger';

// Duplicate detection result
export interface DuplicateInfo {
  index: number;
  song: ScannedSong;
  existingSong: Song | null;
  matchType: 'exact' | 'similar' | 'none';
}

// Check for duplicates
function findDuplicates(scannedSongs: ScannedSong[], existingSongs: Song[]): DuplicateInfo[] {
  return scannedSongs.map((song, index) => {
    const exactMatch = existingSongs.find(
      (existing) =>
        existing.title.toLowerCase() === song.title.toLowerCase() &&
        existing.artist.toLowerCase() === song.artist.toLowerCase()
    );

    if (exactMatch) {
      return { index, song, existingSong: exactMatch, matchType: 'exact' };
    }

    const similarMatch = existingSongs.find(
      (existing) =>
        existing.title.toLowerCase() === song.title.toLowerCase() ||
        existing.artist.toLowerCase() === song.artist.toLowerCase()
    );

    if (similarMatch) {
      return { index, song, existingSong: similarMatch, matchType: 'similar' };
    }

    return { index, song, existingSong: null, matchType: 'none' };
  });
}

interface ProgressState {
  stage: string;
  progress: number;
  message: string;
}

export function useImportScreen(onImport: (song: Song) => void) {
  const [importType, setImportType] = useState<'ultrastar' | 'folder'>('ultrastar');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<ProgressState | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Files
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [ultrastarFile, setUltrastarFile] = useState<File | null>(null);

  // URLs
  const [audioUrl, setAudioUrl] = useState<string>('');
  const [videoUrl, setVideoUrl] = useState<string>('');

  // Metadata
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [useVideoAudio, setUseVideoAudio] = useState(false);

  // Preview
  const [previewSong, setPreviewSong] = useState<Song | null>(null);

  // Folder scan results
  const [scannedSongs, setScannedSongs] = useState<ScannedSong[]>([]);
  const [selectedScanned, setSelectedScanned] = useState<Set<number>>(new Set());
  const [scanErrors, setScanErrors] = useState<string[]>([]);
  const [duplicates, setDuplicates] = useState<DuplicateInfo[]>([]);

  // Existing songs for duplicate check
  const existingSongs = useMemo(() => getAllSongs(), []);

  // Parse UltraStar file
  const parseUltrastarFile = async (file: File) => {
    try {
      const text = await file.text();
      const ultraStar = parseUltraStarTxt(text);

      setTitle(ultraStar.title);
      setArtist(ultraStar.artist);
    } catch (err) {
      setError(
        'Failed to parse UltraStar file: ' + (err instanceof Error ? err.message : 'Unknown error')
      );
    }
  };

  // Handle file selection
  const handleFileSelect = useCallback(
    (type: 'audio' | 'video' | 'ultrastar', file: File) => {
      setError(null);
      setPreviewSong(null);

      switch (type) {
        case 'audio':
          setAudioFile(file);
          const audioObjUrl = URL.createObjectURL(file);
          setAudioUrl(audioObjUrl);
          if (!title) {
            setTitle(file.name.replace(/\.[^/.]+$/, ''));
          }
          break;
        case 'video':
          setVideoFile(file);
          const videoObjUrl = URL.createObjectURL(file);
          setVideoUrl(videoObjUrl);
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
    },
    [title, audioFile]
  );

  // Process UltraStar import
  const processUltrastarImport = async () => {
    if (!ultrastarFile) {
      setError('Please provide an UltraStar txt file');
      return;
    }

    if (!audioFile && !videoFile) {
      setError('Please provide an audio or video file');
      return;
    }

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
        // Store TXT file content for on-demand lyrics loading
        if (ultrastarFile) {
          const txtContent = await ultrastarFile.text();
          if (txtContent && txtContent.length > 0) {
            const txtBlob = new Blob([txtContent], { type: 'text/plain' });
            await storeMedia(song.id, 'txt', txtBlob);
            song.storedTxt = true;
            logger.info('[Import]', 'Cached TXT content in IndexedDB');
          }
        }

        const { storeSongFiles, isTauri, generateSongFolderName } = await import(
          '@/lib/tauri-file-storage'
        );

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

          logger.info('[Import]', 'Stored files in AppData:', storedPaths);
        }
      } catch (mediaErr) {
        logger.warn('[Import]', 'Failed to store media:', mediaErr);
      }

      setPreviewSong(song);
      setProgress({ stage: 'complete', progress: 100, message: 'Import complete!' });
    } catch (err) {
      setError('Failed to import: ' + (err instanceof Error ? err.message : 'Unknown error'));
      setProgress({ stage: 'error', progress: 0, message: 'Import failed' });
    }

    setIsProcessing(false);
  };

  // Scan folder
  const handleScanFolder = async () => {
    setIsProcessing(true);
    setError(null);
    setScannedSongs([]);
    setScanErrors([]);
    setDuplicates([]);
    setProgress({ stage: 'loading', progress: 0, message: 'Scanning folder...' });

    try {
      const result = await scanFolderWithPicker();

      setScannedSongs(result.songs);
      setScanErrors(result.errors);

      setProgress({ stage: 'processing', progress: 90, message: 'Checking for duplicates...' });
      const duplicateResults = findDuplicates(result.songs, existingSongs);
      setDuplicates(duplicateResults);

      const nonDuplicateIndexes = duplicateResults
        .filter((d) => d.matchType === 'none')
        .map((d) => d.index);
      setSelectedScanned(new Set(nonDuplicateIndexes));

      setProgress({
        stage: 'complete',
        progress: 100,
        message: `Found ${result.songs.length} songs${result.errors.length ? ` (${result.errors.length} errors)` : ''}`,
      });
    } catch (err) {
      setError('Failed to scan folder: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }

    setIsProcessing(false);
  };

  // Scan from file list (fallback for browsers without File System Access API)
  const handleScanFromFileList = async (files: FileList) => {
    setIsProcessing(true);
    setProgress({ stage: 'loading', progress: 0, message: 'Scanning files...' });

    try {
      const result = await scanFilesFromFileList(files);

      setScannedSongs(result.songs);
      setScanErrors(result.errors);

      const duplicateResults = findDuplicates(result.songs, existingSongs);
      setDuplicates(duplicateResults);

      const nonDuplicateIndexes = duplicateResults
        .filter((d) => d.matchType === 'none')
        .map((d) => d.index);
      setSelectedScanned(new Set(nonDuplicateIndexes));
    } catch (err) {
      setError('Failed to scan files: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }

    setIsProcessing(false);
  };

  // Import selected scanned songs
  const importSelectedScanned = async () => {
    if (selectedScanned.size === 0) {
      setError('No songs selected');
      return;
    }

    setIsProcessing(true);
    setProgress({ stage: 'loading', progress: 0, message: 'Importing songs...' });

    const songsToImport: Song[] = [];
    const selectedArray = Array.from(selectedScanned);

    for (let i = 0; i < selectedArray.length; i++) {
      const index = selectedArray[i];
      const scanned = scannedSongs[index];

      try {
        const song = await convertScannedSongToSong(scanned);
        songsToImport.push(song);

        setProgress({
          stage: 'processing',
          progress: ((i + 1) / selectedArray.length) * 100,
          message: `Importing ${i + 1}/${selectedArray.length}: ${scanned.title}`,
        });
      } catch (err) {
        setScanErrors((prev) => [
          ...prev,
          `Failed to import ${scanned.title}: ${(err as Error).message}`,
        ]);
      }
    }

    if (songsToImport.length > 0) {
      addSongs(songsToImport);
    }

    setProgress({
      stage: 'complete',
      progress: 100,
      message: `Imported ${songsToImport.length} songs!`,
    });

    setIsProcessing(false);

    if (songsToImport.length > 0) {
      setTimeout(() => {
        onImport(songsToImport[0]);
      }, 1500);
    }
  };

  // Confirm import for single song
  const confirmImport = () => {
    if (previewSong) {
      addSong(previewSong);
      onImport(previewSong);
    }
  };

  return {
    // State
    importType,
    setImportType,
    isProcessing,
    progress,
    error,
    audioFile,
    videoFile,
    ultrastarFile,
    audioUrl,
    videoUrl,
    title,
    setTitle,
    artist,
    setArtist,
    useVideoAudio,
    setUseVideoAudio,
    previewSong,
    scannedSongs,
    selectedScanned,
    setSelectedScanned,
    scanErrors,
    duplicates,

    // Actions
    handleFileSelect,
    processUltrastarImport,
    handleScanFolder,
    handleScanFromFileList,
    importSelectedScanned,
    confirmImport,
  };
}
