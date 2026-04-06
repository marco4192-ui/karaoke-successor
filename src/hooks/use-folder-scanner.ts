'use client';

import { useState, useCallback } from 'react';
import { getAllSongs, clearCustomSongs, replaceCustomSongs, setScanInProgress, invalidateSongCache } from '@/lib/game/song-library';
import { Song } from '@/types/game';
import { isTauri } from '@/lib/tauri-file-storage';
import { safeAlert, safeConfirm, safePrompt } from '@/lib/safe-dialog';
import { nativePickFolder } from '@/lib/native-fs';

export interface ScanProgress {
  stage: 'scanning' | 'importing' | 'complete' | 'error';
  message: string;
  count: number;
}

export interface UseFolderScannerReturn {
  songsFolder: string;
  setSongsFolder: (folder: string) => void;
  songCount: number;
  setSongCount: (count: number) => void;
  isScanning: boolean;
  scanProgress: ScanProgress | null;
  folderSaveComplete: boolean;
  isResetting: boolean;
  resetComplete: boolean;
  handleSaveFolder: () => Promise<void>;
  handleBrowseFolder: () => Promise<void>;
  handleResetLibrary: () => Promise<void>;
  handleClearAllData: () => Promise<void>;
  initializeFromStorage: () => void;
}

/**
 * Hook that encapsulates all folder scanning, browsing, and library reset logic.
 * Extracted from settings-screen.tsx to reduce component size.
 */
export function useFolderScanner(): UseFolderScannerReturn {
  const [songsFolder, setSongsFolder] = useState<string>('');
  const [songCount, setSongCount] = useState(0);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState<ScanProgress | null>(null);
  const [folderSaveComplete, setFolderSaveComplete] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetComplete, setResetComplete] = useState(false);

  // Initialize folder and song count from localStorage
  const initializeFromStorage = useCallback(() => {
    try {
      const savedFolder = localStorage.getItem('karaoke-songs-folder') || '';
      setSongsFolder(savedFolder);
      setSongCount(getAllSongs().length);

      console.log('[Settings] Loaded karaoke-songs-folder from localStorage:', savedFolder);

      // Check if songs have baseFolder but localStorage is empty (migration needed)
      const songs = getAllSongs();
      if (songs.length > 0 && songs[0].baseFolder && !savedFolder) {
        console.log('[Settings] Songs have baseFolder but localStorage is empty - setting localStorage from songs');
        localStorage.setItem('karaoke-songs-folder', songs[0].baseFolder);
        setSongsFolder(songs[0].baseFolder);
      }
    } catch {
      // Ignore errors
    }
  }, []);

  // Perform folder scan and import songs
  const performFolderScan = useCallback(async (folderPath: string) => {
    setIsScanning(true);
    setScanProgress({ stage: 'scanning', message: 'Scanning folder...', count: 0 });

    // CRITICAL: Set scan lock to prevent loadCustomSongsFromStorage race condition
    setScanInProgress(true);

    // CRITICAL: Always save the songs folder to localStorage
    localStorage.setItem('karaoke-songs-folder', folderPath);
    console.log('[Import] Saved karaoke-songs-folder to localStorage:', folderPath);

    try {
      // Import the Tauri scanner
      const { scanSongsFolderTauri, isTauri: checkTauri } = await import('@/lib/tauri-file-storage');

      if (!checkTauri()) {
        safeAlert('Folder scanning is only available in the desktop app.');
        setIsScanning(false);
        return;
      }

      // Run the scan
      const result = await scanSongsFolderTauri(folderPath);

      setScanProgress({
        stage: 'importing',
        message: `Found ${result.songs.length} songs, importing...`,
        count: result.songs.length
      });

      if (result.songs.length > 0) {
        // Clear existing songs first
        clearCustomSongs();

        // Convert scanned songs to Song format
        const { storeMedia } = await import('@/lib/db/media-db');
        const { getSongMediaUrl } = await import('@/lib/tauri-file-storage');

        const songsToImport: Song[] = [];
        let imported = 0;

        for (const scanned of result.songs) {
          try {
            // Generate song ID
            const songId = `song-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

            // Store TXT content in IndexedDB for caching (using native command)
            let storedTxt = false;
            if (scanned.relativeTxtPath) {
              try {
                const { nativeReadFileText } = await import('@/lib/native-fs');
                const txtContent = await nativeReadFileText(`${folderPath}/${scanned.relativeTxtPath}`);
                if (txtContent) {
                  const txtBlob = new Blob([txtContent], { type: 'text/plain' });
                  await storeMedia(songId, 'txt', txtBlob);
                  storedTxt = true;
                }
              } catch (e) {
                console.warn('Could not cache TXT for', scanned.title);
              }
            }

            // CRITICAL: Create blob URLs for media files NOW
            let audioUrl: string | undefined = undefined;
            let videoBackground: string | undefined = undefined;
            let coverImage: string | undefined = undefined;

            const effectiveBaseFolder = folderPath;
            console.log(`[Import] Using baseFolder: ${effectiveBaseFolder} for ${scanned.title}`);

            // Load audio URL
            if (scanned.relativeAudioPath) {
              try {
                audioUrl = await getSongMediaUrl(scanned.relativeAudioPath, effectiveBaseFolder) || undefined;
              } catch (e) {
                console.warn(`[Import] Failed to create audio URL for ${scanned.title}:`, e);
              }
            }

            // Load video URL
            if (scanned.relativeVideoPath) {
              try {
                videoBackground = await getSongMediaUrl(scanned.relativeVideoPath, effectiveBaseFolder) || undefined;
              } catch (e) {
                console.warn(`[Import] Failed to create video URL for ${scanned.title}:`, e);
              }
            }

            // Load cover URL
            if (scanned.relativeCoverPath) {
              try {
                coverImage = await getSongMediaUrl(scanned.relativeCoverPath, effectiveBaseFolder) || undefined;
              } catch (e) {
                console.warn(`[Import] Failed to create cover URL for ${scanned.title}:`, e);
              }
            }

            // Create song object with relative paths AND blob URLs
            const song: Song = {
              id: songId,
              title: scanned.title,
              artist: scanned.artist,
              duration: 180000,
              bpm: scanned.bpm,
              difficulty: 'medium',
              rating: 3,
              gap: scanned.gap,
              baseFolder: effectiveBaseFolder,
              folderPath: scanned.folderPath,
              relativeTxtPath: scanned.relativeTxtPath,
              relativeAudioPath: scanned.relativeAudioPath,
              relativeVideoPath: scanned.relativeVideoPath,
              relativeCoverPath: scanned.relativeCoverPath,
              relativeBackgroundPath: scanned.relativeBackgroundPath,
              audioUrl,
              videoBackground,
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
              dateAdded: Date.now(),
            };

            songsToImport.push(song);
            imported++;

            setScanProgress({
              stage: 'importing',
              message: `Importing ${imported}/${result.songs.length}...`,
              count: imported
            });
          } catch (e) {
            console.error('Failed to import song:', scanned.title, e);
          }
        }

        // Replace ALL songs (not addSongs — avoids duplicate detection race condition)
        if (songsToImport.length > 0) {
          replaceCustomSongs(songsToImport);
        }

        // CRITICAL: Only invalidate songCache, NOT customSongsCache.
        // replaceCustomSongs already set customSongsCache correctly.
        // reloadLibrary() would clear it, causing getAllSongs() to return [].
        // Note: blob URL cache was already cleared by clearCustomSongs() at scan start.
        // New blob URLs created during scan are still valid.
        invalidateSongCache();
        setSongCount(getAllSongs().length);
        setFolderSaveComplete(true);
        setScanProgress({
          stage: 'complete',
          message: `Successfully imported ${imported} songs!`,
          count: imported
        });
      } else {
        setScanProgress({
          stage: 'complete',
          message: 'No songs found in the selected folder.',
          count: 0
        });
      }

      if (result.errors.length > 0) {
        console.warn('Scan errors:', result.errors);
      }

    } catch (error) {
      console.error('Folder scan failed:', error);
      setScanProgress({
        stage: 'error',
        message: `Scan failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        count: 0
      });
    } finally {
      // Always clear the scan lock
      setScanInProgress(false);
    }

    setIsScanning(false);
    setTimeout(() => {
      setFolderSaveComplete(false);
      setScanProgress(null);
    }, 5000);
  }, []);

  // Save songs folder and reload library
  const handleSaveFolder = useCallback(async () => {
    if (!songsFolder.trim()) {
      safeAlert('Please enter a folder path first.');
      return;
    }

    localStorage.setItem('karaoke-songs-folder', songsFolder);
    await performFolderScan(songsFolder);
  }, [songsFolder, performFolderScan]);

  // Browse folder using native Tauri command (bypasses ACL restrictions)
  const handleBrowseFolder = useCallback(async () => {
    if (!isTauri()) {
      safeAlert(
        'Folder picker is only available in the desktop app.\n\n' +
        'Please use the desktop app (Tauri) to browse for folders.\n\n' +
        'If you are running the desktop app, there may be an issue with Tauri detection.'
      );
      return;
    }

    try {
      // Use native command instead of plugin dialog — bypasses ACL
      const selected = await nativePickFolder('Select Songs Folder');

      if (selected) {
        console.log('[Settings] Folder selected:', selected);
        setSongsFolder(selected);
        localStorage.setItem('karaoke-songs-folder', selected);
        await performFolderScan(selected);
      } else {
        console.log('[Settings] User cancelled the dialog');
      }
    } catch (e) {
      console.error('[Settings] Error in handleBrowseFolder:', e);
      const errorMessage = e instanceof Error ? e.message : String(e);
      safeAlert(
        'Could not open folder picker.\n\n' +
        'Error: ' + errorMessage + '\n\n' +
        'Please enter the path manually in the input field and click "Scan".'
      );
    }
  }, [performFolderScan]);

  // Reset library without deleting highscores
  const handleResetLibrary = useCallback(async () => {
    if (!safeConfirm('Are you sure you want to reset the song library? This will remove all imported songs, but your highscores will be preserved.')) {
      return;
    }

    setIsResetting(true);
    setResetComplete(false);

    try {
      clearCustomSongs();

      const allKeys = Object.keys(localStorage);
      for (const key of allKeys) {
        if (key.startsWith('karaoke-songs') || key.startsWith('imported-song-') || key === 'karaoke-library') {
          localStorage.removeItem(key);
        }
      }

      reloadLibrary();

      await new Promise(resolve => setTimeout(resolve, 500));

      setSongCount(0);
      setResetComplete(true);

      setTimeout(() => setResetComplete(false), 3000);
    } catch (error) {
      console.error('Failed to reset library:', error);
    } finally {
      setIsResetting(false);
    }
  }, []);

  // Clear all data including highscores
  const handleClearAllData = useCallback(async () => {
    if (!safeConfirm('⚠️ WARNING: This will delete ALL data including highscores, profiles, and settings. This cannot be undone!\n\nType "DELETE" to confirm.')) {
      return;
    }

    const confirmation = safePrompt('Type "DELETE" to confirm complete data reset:');
    if (confirmation !== 'DELETE') {
      return;
    }

    setIsResetting(true);

    try {
      localStorage.clear();
      window.location.reload();
    } catch (error) {
      console.error('Failed to clear data:', error);
      setIsResetting(false);
    }
  }, []);

  return {
    songsFolder,
    setSongsFolder,
    songCount,
    setSongCount,
    isScanning,
    scanProgress,
    folderSaveComplete,
    isResetting,
    resetComplete,
    handleSaveFolder,
    handleBrowseFolder,
    handleResetLibrary,
    handleClearAllData,
    initializeFromStorage,
  };
}
