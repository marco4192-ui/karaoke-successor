'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { StorageKeys, getString, setItem, removeItem, clearAll, getJsonOptional, getJson, setJson } from '@/lib/storage';
import { getAllSongs, clearCustomSongs, replaceCustomSongs, acquireScanLock, invalidateSongCache, clearSongCache } from '@/lib/game/song-library';
import { remapSongIdsInPlaylists, remapPlayCountIds, getAllReferencedSongIds } from '@/lib/playlist-manager';
import { clearCustomSongsFromDB } from '@/lib/db/custom-songs-db';
import { Song } from '@/types/game';
import { isTauri, normalizeFilePath } from '@/lib/tauri-file-storage';
import { safeAlert, safeConfirm, safePrompt } from '@/lib/safe-dialog';
import { useTranslation } from '@/lib/i18n/translations';
import { nativePickFolder } from '@/lib/native-fs';

interface ScanProgress {
  stage: 'scanning' | 'importing' | 'complete' | 'error';
  message: string;
  count: number;
}

interface UseFolderScannerReturn {
  songsFolder: string;
  setSongsFolder: (_folder: string) => void;
  songCount: number;
  setSongCount: (_count: number) => void;
  isScanning: boolean;
  scanProgress: ScanProgress | null;
  folderSaveComplete: boolean;
  isResetting: boolean;
  resetComplete: boolean;
  handleSaveFolder: () => Promise<void>;
  handleBrowseFolder: () => Promise<void>;
  handleResetLibrary: () => Promise<void>;
  handleClearAllData: () => Promise<void>;
  executeResetLibrary: () => Promise<void>;
  executeClearAllData: () => Promise<void>;
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

  const { t } = useTranslation();

  // Refs for setTimeout cleanup
  const scanProgressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resetCompleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear timers on unmount
  useEffect(() => {
    return () => {
      if (scanProgressTimerRef.current) clearTimeout(scanProgressTimerRef.current);
      if (resetCompleteTimerRef.current) clearTimeout(resetCompleteTimerRef.current);
    };
  }, []);

  // Initialize folder and song count from localStorage
  const initializeFromStorage = useCallback(() => {
    try {
      let savedFolder = getString(StorageKeys.SONGS_FOLDER);
      // CRITICAL: Normalize HTML entities in stored folder path
      // (e.g. &amp; → &) that may have been introduced during serialization
      if (savedFolder) {
        savedFolder = normalizeFilePath(savedFolder);
        setItem(StorageKeys.SONGS_FOLDER, savedFolder);
      }
      setSongsFolder(savedFolder);
      setSongCount(getAllSongs().length);

      // Check if songs have baseFolder but localStorage is empty (migration needed)
      const songs = getAllSongs();
      if (songs.length > 0 && songs[0].baseFolder && !savedFolder) {
        setItem(StorageKeys.SONGS_FOLDER, songs[0].baseFolder);
        setSongsFolder(songs[0].baseFolder);
      }
    } catch {
      // Ignore errors
    }
  }, []);

  // Perform folder scan and import songs
  const performFolderScan = useCallback(async (folderPath: string) => {
    setIsScanning(true);
    setScanProgress({ stage: 'scanning', message: t('library.scanProgress.scanning'), count: 0 });

    // CRITICAL: Acquire scan lock to prevent loadCustomSongsFromStorage race condition
    const scanLock = acquireScanLock();

    // CRITICAL: Always save the songs folder to localStorage (normalized)
    const normalizedFolder = normalizeFilePath(folderPath);
    setItem(StorageKeys.SONGS_FOLDER, normalizedFolder);

    // ── Stable song IDs across rescans ──
    // Snapshot the CURRENT library BEFORE clearCustomSongs() wipes it below.
    // Each snapshot song is keyed by stable identity (file location), so scanned
    // songs can REUSE their previous ID — keeping playlist / play-count /
    // favorites references alive across a rescan instead of orphaning them.
    const preScanSongs = getAllSongs();
    const preScanIds = new Set(preScanSongs.map(s => s.id));
    // `${baseFolder}/${relativeTxtPath}` → old song ID (songs WITH file info)
    const oldIdByPathKey = new Map<string, string>();
    // `title|artist|Math.round(duration)` → old song ID (fallback: songs WITHOUT file info)
    const oldIdByMetaKey = new Map<string, string>();
    for (const s of preScanSongs) {
      if (s.baseFolder && s.relativeTxtPath) {
        const key = `${s.baseFolder}/${s.relativeTxtPath}`;
        if (!oldIdByPathKey.has(key)) oldIdByPathKey.set(key, s.id);
      } else {
        const key = `${s.title}|${s.artist}|${Math.round(s.duration || 0)}`;
        if (!oldIdByMetaKey.has(key)) oldIdByMetaKey.set(key, s.id);
      }
    }
    // PERSISTENT identity map (survives scans in which the song was missing):
    // path → last known song ID. Consulted when the pre-scan snapshot can't
    // resolve a scanned song — this is what makes a song that returns in a
    // LATER scan reuse its ORIGINAL ID, so greyed-out playlist entries and
    // play counts resolve again automatically.
    const persistentIdByPathKey = getJson<Record<string, string>>(StorageKeys.SONG_IDENTITY_MAP, {});
    // Old IDs already handed out in THIS scan — guarantees uniqueness when
    // duplicate identities exist (two files with the same title/artist/duration).
    const reusedOldIds = new Set<string>();

    /**
     * Resolve the ID for a scanned song: REUSE the previous scan's ID when the
     * identity matches, otherwise generate a fresh one. Reusing IDs is what
     * keeps playlists, play counts and favorites intact across rescans.
     */
    const resolveStableSongId = (
      baseFolder: string,
      relativeTxtPath: string | undefined,
      title: string,
      artist: string,
      duration: number,
    ): string => {
      if (relativeTxtPath) {
        const pathKey = `${baseFolder}/${relativeTxtPath}`;
        // 1. Same file in the current library → keep its ID
        const oldId = oldIdByPathKey.get(pathKey);
        if (oldId && !reusedOldIds.has(oldId)) {
          reusedOldIds.add(oldId);
          return oldId;
        }
        // 2. Song was missing in a previous scan but its file is back →
        //    restore the ORIGINAL ID so playlist/play-count refs resolve again
        const persistentId = persistentIdByPathKey[pathKey];
        if (persistentId && !reusedOldIds.has(persistentId)) {
          reusedOldIds.add(persistentId);
          return persistentId;
        }
      } else {
        // No file info — fall back to title/artist/duration identity
        const oldId = oldIdByMetaKey.get(`${title}|${artist}|${Math.round(duration || 0)}`);
        if (oldId && !reusedOldIds.has(oldId)) {
          reusedOldIds.add(oldId);
          return oldId;
        }
      }
      return `song-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    };

    try {
      // Import the Tauri scanner
      const { scanSongsFolderTauri, isTauri: checkTauri } = await import('@/lib/tauri-file-storage');

      if (!checkTauri()) {
        safeAlert(t('library.scanProgress.folderScanningDesktopOnly'));
        setIsScanning(false);
        return;
      }

      // Run the scan with the normalized path
      // eslint-disable-next-line no-console
      console.log('[FolderScanner] Starting scan:', normalizedFolder);
      const result = await scanSongsFolderTauri(normalizedFolder);
      // eslint-disable-next-line no-console
      console.log('[FolderScanner] Scan result:', result.songs.length, 'songs,', result.scannedFiles, 'files scanned,', result.errors.length, 'errors');
      if (result.errors.length > 0) {
        // eslint-disable-next-line no-console
        console.warn('[FolderScanner] Scan errors:', result.errors);
      }

      setScanProgress({
        stage: 'importing',
        message: t('library.scanProgress.foundSongs').replace('{n}', String(result.songs.length)),
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
            // Calculate actual song duration (needed BEFORE the ID resolution —
            // the stable-ID fallback identity uses the rounded duration):
            // Priority 1: #END tag from TXT (explicit song end time)
            // Priority 2: Last lyric end time + buffer (realistic display)
            // Priority 3: Fallback 180000 (3 minutes)
            let calculatedDuration = 180000;
            if (scanned.end && scanned.end > 0) {
              calculatedDuration = scanned.end;
            } else if (scanned.lyrics && scanned.lyrics.length > 0) {
              const lastLineEnd = Math.max(...scanned.lyrics.map(l => l.endTime));
              calculatedDuration = lastLineEnd + 5000;
            }

            // Song ID — REUSED from the previous scan when the identity matches,
            // so playlists / play counts / favorites survive a rescan.
            const songId = resolveStableSongId(folderPath, scanned.relativeTxtPath, scanned.title, scanned.artist, calculatedDuration);

            // PERFORMANCE: Load TXT cache and cover image in parallel per song.
            // Audio/video URLs are deferred — loaded lazily when played.
            let storedTxt = false;
            let coverImage: string | undefined = undefined;

            const [txtResult, coverResult] = await Promise.allSettled([
              // Cache TXT content in IndexedDB
              (async () => {
                if (!scanned.relativeTxtPath) return false;
                const { nativeReadFileText } = await import('@/lib/native-fs');
                const txtContent = await nativeReadFileText(
                  `${normalizeFilePath(folderPath)}/${normalizeFilePath(scanned.relativeTxtPath)}`
                );
                if (txtContent) {
                  const txtBlob = new Blob([txtContent], { type: 'text/plain' });
                  await storeMedia(songId, 'txt', txtBlob);
                  return true;
                }
                return false;
              })(),
              // Load cover image blob URL
              (async () => {
                if (!scanned.relativeCoverPath) return undefined;
                return await getSongMediaUrl(scanned.relativeCoverPath, folderPath) || undefined;
              })(),
            ]);

            if (txtResult.status === 'fulfilled') storedTxt = txtResult.value;
            // eslint-disable-next-line no-console
            else console.warn('Could not cache TXT for', scanned.title);

            if (coverResult.status === 'fulfilled') coverImage = coverResult.value;
            // eslint-disable-next-line no-console
            else console.warn(`[Import] Failed to create cover URL for ${scanned.title}`);

            // Create song object with relative paths and cover blob URL.
            // Audio/video URLs are NOT set here — they are loaded lazily
            // by ensureSongUrls() / restoreSongUrls() when a song is played.
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
              relativeBackgroundPath: scanned.relativeBackgroundPath,
              videoBackground: scanned.videoFile &&
                (scanned.videoFile.startsWith('http://') || scanned.videoFile.startsWith('https://'))
                ? scanned.videoFile : undefined,
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
              // Raw TXT metadata file references (for editor metadata tab)
              mp3File: scanned.mp3File,
              coverFile: scanned.coverFile,
              backgroundFile: scanned.backgroundFile,
              videoFile: scanned.videoFile,
              dateAdded: Date.now(),
            };

            songsToImport.push(song);
            imported++;

            setScanProgress({
              stage: 'importing',
              message: t('library.scanProgress.importing').replace('{current}', String(imported)).replace('{total}', String(result.songs.length)),
              count: imported
            });
          } catch (e) {
            // eslint-disable-next-line no-console
            console.error('Failed to import song:', scanned.title, e);
          }
        }

        // Replace ALL songs (not addSongs — avoids duplicate detection race condition)
        if (songsToImport.length > 0) {
          replaceCustomSongs(songsToImport);
        }

        // ── Scan additional library sources (additive, no reset) ──
        const additionalFolders: string[] = getJsonOptional<string[]>(StorageKeys.ADDITIONAL_SONG_FOLDERS) ?? [];
        let additionalImported = 0;
        for (const extraFolder of additionalFolders) {
          try {
            const sourceName = extraFolder.split(/[/\\]/).pop() || extraFolder;
            setScanProgress({
              stage: 'scanning',
              message: t('library.scanProgress.scanningAdditional').replace('{source}', sourceName),
              count: imported + additionalImported,
            });
            const extraResult = await scanSongsFolderTauri(normalizeFilePath(extraFolder));
            if (extraResult.songs.length > 0) {
              const extraSongs: Song[] = [];
              for (const scanned of extraResult.songs) {
                try {
                  let calculatedDuration = 180000;
                  if (scanned.end && scanned.end > 0) calculatedDuration = scanned.end;
                  else if (scanned.lyrics && scanned.lyrics.length > 0) {
                    calculatedDuration = Math.max(...scanned.lyrics.map(l => l.endTime)) + 5000;
                  }
                  // REUSE the previous scan's ID when the identity matches
                  // (keeps playlist / play-count references alive).
                  const songId = resolveStableSongId(extraFolder, scanned.relativeTxtPath, scanned.title, scanned.artist, calculatedDuration);
                  let coverImage: string | undefined = undefined;
                  try {
                    if (scanned.relativeCoverPath) {
                      coverImage = await getSongMediaUrl(scanned.relativeCoverPath, extraFolder) || undefined;
                    }
                  } catch {
                    // Cover loading failed for this song — continue without cover
                  }

                  extraSongs.push({
                    id: songId, title: scanned.title, artist: scanned.artist,
                    duration: calculatedDuration, bpm: scanned.bpm, difficulty: 'medium', rating: 3,
                    gap: scanned.gap, baseFolder: extraFolder, folderPath: scanned.folderPath,
                    relativeTxtPath: scanned.relativeTxtPath, relativeAudioPath: scanned.relativeAudioPath,
                    relativeVideoPath: scanned.relativeVideoPath, relativeCoverPath: scanned.relativeCoverPath,
                    relativeBackgroundPath: scanned.relativeBackgroundPath,
                    videoBackground: scanned.videoFile?.startsWith('http') ? scanned.videoFile : undefined,
                    coverImage, genre: scanned.genre, language: scanned.language,
                    year: scanned.year, creator: scanned.creator, version: scanned.version,
                    edition: scanned.edition, tags: scanned.tags, start: scanned.start, end: scanned.end,
                    videoGap: scanned.videoGap, videoStart: scanned.videoStart,
                    preview: scanned.previewStart ? { startTime: scanned.previewStart * 1000, duration: (scanned.previewDuration || 15) * 1000 } : undefined,
                    previewStart: scanned.previewStart, previewDuration: scanned.previewDuration,
                    medleyStartBeat: scanned.medleyStartBeat, medleyEndBeat: scanned.medleyEndBeat,
                    isDuet: scanned.isDuet, duetPlayerNames: scanned.duetPlayerNames,
                    lyrics: scanned.lyrics || [], storedTxt: false, storedMedia: false,
                    hasEmbeddedAudio: scanned.hasEmbeddedAudio ?? (!scanned.relativeAudioPath && !!scanned.relativeVideoPath),
                    mp3File: scanned.mp3File, coverFile: scanned.coverFile,
                    backgroundFile: scanned.backgroundFile, videoFile: scanned.videoFile,
                    dateAdded: Date.now(),
                  });
                  additionalImported++;
                } catch {
                  // Skip individual song errors in additional folders
                }
              }
              if (extraSongs.length > 0) {
                const existing = getAllSongs();
                replaceCustomSongs([...existing, ...extraSongs]);
              }
            }
          } catch (e) {
            // eslint-disable-next-line no-console
            console.warn(`[Settings] Failed to scan additional folder: ${extraFolder}`, e);
          }
        }

        // CRITICAL: Only invalidate songCache, NOT customSongsCache.
        // replaceCustomSongs already set customSongsCache correctly.
        // reloadLibrary() would clear it, causing getAllSongs() to return [].
        // Note: blob URL cache was already cleared by clearCustomSongs() at scan start.
        // New blob URLs created during scan are still valid.
        invalidateSongCache();
        const finalSongs = getAllSongs();

        // ── Remap references for songs whose ID changed (e.g. file moved) ──
        // An old song that was NOT re-detected at its old path but matches a
        // freshly scanned song by title/artist/duration is the same song that
        // moved: transfer its playlist / play-count references to the new ID.
        // Nothing is dropped — old IDs without a counterpart stay in playlists
        // and render there as greyed-out "missing" entries until the song
        // returns to the library.
        if (finalSongs.length > 0) {
          const freshByMetaKey = new Map<string, string>();
          for (const s of finalSongs) {
            // Only brand-new IDs can be remap targets (reused IDs — snapshot
            // or persistent-map — already carry their references with them).
            if (preScanIds.has(s.id) || reusedOldIds.has(s.id)) continue;
            const key = `${s.title}|${s.artist}|${Math.round(s.duration || 0)}`;
            if (!freshByMetaKey.has(key)) freshByMetaKey.set(key, s.id);
          }
          if (freshByMetaKey.size > 0) {
            const idChanges = new Map<string, string>();
            for (const old of preScanSongs) {
              if (reusedOldIds.has(old.id)) continue; // identity already preserved directly
              const key = `${old.title}|${old.artist}|${Math.round(old.duration || 0)}`;
              const newId = freshByMetaKey.get(key);
              if (newId !== undefined) {
                idChanges.set(old.id, newId);
                freshByMetaKey.delete(key); // one-to-one matching only
              }
            }
            if (idChanges.size > 0) {
              const remappedPlaylists = remapSongIdsInPlaylists(idChanges);
              const remappedCounts = remapPlayCountIds(idChanges);
              // eslint-disable-next-line no-console
              console.log(`[FolderScanner] Remapped ${idChanges.size} song ID(s) after rescan (${remappedPlaylists} playlist refs, ${remappedCounts} play-count entries)`);
            }
          }
        }

        // ── Persist the song identity map (path → ID) ──
        // Records the identity of every scanned song so a song that goes
        // missing and returns in a LATER scan reuses its ORIGINAL ID (its
        // playlist entries / play counts then resolve again automatically).
        // Entries for songs that are gone AND no longer referenced anywhere
        // are pruned to keep the map bounded.
        const finalIdSet = new Set(finalSongs.map(s => s.id));
        const referencedIds = getAllReferencedSongIds();
        for (const s of finalSongs) {
          if (s.baseFolder && s.relativeTxtPath) {
            persistentIdByPathKey[`${s.baseFolder}/${s.relativeTxtPath}`] = s.id;
          }
        }
        for (const pathKey of Object.keys(persistentIdByPathKey)) {
          const id = persistentIdByPathKey[pathKey];
          if (!finalIdSet.has(id) && !referencedIds.has(id)) {
            delete persistentIdByPathKey[pathKey];
          }
        }
        setJson(StorageKeys.SONG_IDENTITY_MAP, persistentIdByPathKey);

        const finalCount = finalSongs.length;
        // eslint-disable-next-line no-console
        console.log('[FolderScanner] Scan complete. Final song count:', finalCount);
        setSongCount(finalCount);
        setFolderSaveComplete(true);
        const totalImported = imported + additionalImported;
        setScanProgress({
          stage: 'complete',
          message: t('library.scanProgress.importSuccess').replace('{n}', String(totalImported)) +
            (additionalImported > 0 ? ` (${additionalImported} from additional sources)` : ''),
          count: totalImported
        });
      } else {
        setScanProgress({
          stage: 'complete',
          message: t('library.scanProgress.noSongsFound'),
          count: 0
        });
      }

      if (result.errors.length > 0) {
        // eslint-disable-next-line no-console
        console.warn('Scan errors:', result.errors);
      }

    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Folder scan failed:', error);
      const errMsg = error instanceof Error ? error.message : 'Unknown error';
      setScanProgress({
        stage: 'error',
        message: t('library.scanProgress.scanFailed').replace('{error}', errMsg),
        count: 0
      });
    } finally {
      // Always release the scan lock
      scanLock.release();
    }

    setIsScanning(false);
    if (scanProgressTimerRef.current) clearTimeout(scanProgressTimerRef.current);
    scanProgressTimerRef.current = setTimeout(() => {
      setFolderSaveComplete(false);
      setScanProgress(null);
    }, 5000);
  }, []);

  // Save songs folder and reload library
  const handleSaveFolder = useCallback(async () => {
    if (!songsFolder.trim()) {
      safeAlert(t('library.scanProgress.pleaseEnterPath'));
      return;
    }

    const normalized = normalizeFilePath(songsFolder);
    setItem(StorageKeys.SONGS_FOLDER, normalized);
    await performFolderScan(normalized);
  }, [songsFolder, performFolderScan]);

  // Browse folder using native Tauri command (bypasses ACL restrictions)
  const handleBrowseFolder = useCallback(async () => {
    if (!isTauri()) {
      safeAlert(t('library.scanProgress.folderPickerDesktopOnly'));
      return;
    }

    try {
      // Use native command instead of plugin dialog — bypasses ACL
      const selected = await nativePickFolder('Select Songs Folder');

      if (selected) {
        setSongsFolder(selected);
        setItem(StorageKeys.SONGS_FOLDER, selected);
        await performFolderScan(selected);
      } else {
        // user cancelled folder picker
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('[Settings] Error in handleBrowseFolder:', e);
      const errorMessage = e instanceof Error ? e.message : String(e);
      safeAlert(t('library.scanProgress.couldNotOpenPicker').replace('{error}', errorMessage));
    }
  }, [performFolderScan]);

  /** Execute the actual library reset — no confirmation dialog. */
  const executeResetLibrary = useCallback(async () => {
    setIsResetting(true);
    setResetComplete(false);

    try {
      clearCustomSongs();

      const allKeys = Object.keys(localStorage);
      for (const key of allKeys) {
        if (key.startsWith('karaoke-songs') || key.startsWith('imported-song-') || key === 'karaoke-library') {
          removeItem(key);
        }
      }

      clearSongCache();

      try {
        await clearCustomSongsFromDB();
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('[Settings] Failed to clear custom songs from IndexedDB:', e);
      }

      try {
        const { clearCache: clearLibraryCache } = await import('@/lib/game/library-cache');
        await clearLibraryCache();
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('[Settings] Failed to clear library cache:', e);
      }

      setSongCount(0);
      setResetComplete(true);

      if (resetCompleteTimerRef.current) clearTimeout(resetCompleteTimerRef.current);
      resetCompleteTimerRef.current = setTimeout(() => setResetComplete(false), 3000);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to reset library:', error);
    } finally {
      setIsResetting(false);
    }
  }, []);

  /** Execute the actual clear-all — no confirmation dialog. */
  const executeClearAllData = useCallback(async () => {
    setIsResetting(true);
    try {
      clearAll();
      window.location.reload();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to clear data:', error);
      setIsResetting(false);
    }
  }, []);

  // Reset library without deleting highscores
  const handleResetLibrary = useCallback(async () => {
    if (!(await safeConfirm(t('library.scanProgress.confirmResetLibrary')))) {
      return;
    }
    await executeResetLibrary();
  }, [executeResetLibrary]);

  // Clear all data including highscores
  const handleClearAllData = useCallback(async () => {
    if (!(await safeConfirm(t('library.scanProgress.confirmClearAllData')))) {
      return;
    }

    const confirmation = await safePrompt(t('library.scanProgress.typeDeleteConfirm'));
    if (confirmation !== 'DELETE') {
      return;
    }
    await executeClearAllData();
  }, [executeClearAllData]);

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
    executeResetLibrary,
    executeClearAllData,
    initializeFromStorage,
  };
}
