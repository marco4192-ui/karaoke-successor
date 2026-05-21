// Song Library Store - Manages songs with persistent storage
import type { Song } from '@/types/game';
import { isTauri, getSongMediaUrl, clearBlobUrlCache} from '@/lib/tauri-file-storage';
import { StorageKeys, getItem, removeItem, setJson } from '@/lib/storage';
import { getSongMediaUrls, revokeSongMediaUrls } from '@/lib/db/media-db';
import { saveCustomSongsToDB, loadCustomSongsFromDB, migrateFromLocalStorage, clearCustomSongsFromDB } from '@/lib/db/custom-songs-db';
// IDs use crypto.randomUUID() for collision-free 128-bit random IDs
import { isAbsolutePath, resolveSongsBaseFolder, normalizeSongPathFields } from './song-paths';
import { normalizeLanguage, splitGenres, normalizeGenreName } from '@/lib/parsers/meta-normalizer';

// Internal imports (not re-exported — consumers import directly from the source modules)
// NOTE: ensureSongUrls was previously re-exported here but caused a Turbopack
// circular dependency crash (TDZ: "Cannot access 'n' before initialization").
// All consumers now import directly from song-url-restore.ts.
import { restoreSongUrls } from './song-url-restore';
import { loadSongLyrics } from './song-lyrics-loader';

// CUSTOM_SONGS_KEY migrated to StorageKeys.CUSTOM_SONGS

// In-memory song cache
let songCache: Song[] | null = null;
let customSongsCache: Song[] | null = null;
// Cache timestamp for automatic staleness detection
let songCacheTimestamp = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Track blob URLs created by getAllSongsAsync() browser-mode path for cleanup.
// Without this, every library refresh leaks up to 4 blob URLs per storedMedia song.
let lastBrowserBlobUrls: Array<{ audioUrl?: string; videoUrl?: string; coverUrl?: string; txtUrl?: string }> = [];

// Scan lock: prevents loadCustomSongsFromStorage from overwriting cache
// while a Settings scan is in progress (avoids race condition).
// Uses a Promise-based lock instead of a boolean for thread safety.
let scanLock: Promise<void> = Promise.resolve();

/** Acquire the scan lock. Returns a release function that must be called when done. */
export function acquireScanLock(): { release: () => void } {
  let releaseLock!: () => void;
  const nextLock = new Promise<void>(resolve => { releaseLock = resolve; });
  const currentLock = scanLock;
  scanLock = currentLock.then(() => nextLock);
  return {
    release: () => releaseLock(),
  };
}

/** Wait for any in-progress scan to complete. */
function waitForScanLock(): Promise<void> {
  return scanLock;
}

/** Revoke all blob URLs tracked by getAllSongsAsync browser-mode path. */
function revokeBrowserBlobUrls(): void {
  for (const urls of lastBrowserBlobUrls) {
    revokeSongMediaUrls(urls);
  }
  lastBrowserBlobUrls = [];
}

/** Invalidate all in-memory caches, forcing fresh reads from storage. */
export function clearSongCache(): void {
  songCache = null;
  customSongsCache = null;
  songCacheTimestamp = 0;
  revokeBrowserBlobUrls();
}

/** Invalidate only the combined song cache, preserving customSongsCache.
 *  Use after replaceCustomSongs() to avoid clearing the freshly set cache. */
export function invalidateSongCache(): void {
  songCache = null;
  songCacheTimestamp = 0;
}

// Get all songs (custom/imported)
export function getAllSongs(): Song[] {
  // Auto-expire cache after TTL
  if (songCache && Date.now() - songCacheTimestamp > CACHE_TTL_MS) {
    songCache = null;
  }

  if (songCache) return songCache;

  const customSongs = getCustomSongs();
  songCache = [...customSongs];
  songCacheTimestamp = Date.now();
  return songCache;
}

// Get all non-duet songs (for party modes where duets are excluded)
// Inline duet detection to avoid circular dependency with library/utils.ts
export function getNonDuetSongs(): Song[] {
  return getAllSongs().filter(s => {
    if (s.isDuet === true) return false;
    if (s.title && /\[\s*duet\s*\]/i.test(s.title)) return false;
    if (s.title && /\(\s*duet\s*\)/i.test(s.title)) return false;
    if (s.lyrics && s.lyrics.length > 0) {
      let hasP1 = false;
      let hasP2 = false;
      for (const line of s.lyrics) {
        if (line.player === 'P1') hasP1 = true;
        if (line.player === 'P2') hasP2 = true;
        if (hasP1 && hasP2) return false;
        if (line.notes) {
          for (const note of line.notes) {
            if (note.player === 'P1') hasP1 = true;
            if (note.player === 'P2') hasP2 = true;
            if (hasP1 && hasP2) return false;
          }
        }
      }
    }
    return true;
  });
}

// Get custom/imported songs — reads from IndexedDB cache, falls back to localStorage
function getCustomSongs(): Song[] {
  if (customSongsCache) return customSongsCache;

  // Check if running in browser
  // Try storage first (fast, sync)
  try {
    const stored = getItem(StorageKeys.CUSTOM_SONGS);
    if (stored) {
      const songs = JSON.parse(stored);
      // One-time migration: normalize all path fields to fix HTML entities,
      // percent-encoding, and Unicode normalization (NFC vs NFD)
      let needsResave = false;
      for (const song of songs) {
        const result = normalizeSongPathFields(song);
        if (result.changed) needsResave = true;
      }
      if (needsResave) {
        // eslint-disable-next-line no-console
        try { setJson(StorageKeys.CUSTOM_SONGS, songs); } catch (e) { console.debug('[SongLibrary] Failed to re-save normalized songs:', e); }
      }
      customSongsCache = songs;
      // Trigger background migration to IndexedDB
      if (typeof indexedDB !== 'undefined' && songs.length > 0) {
        migrateFromLocalStorage(songs, StorageKeys.CUSTOM_SONGS).then(migrated => {
          if (migrated) {
            customSongsCache = migrated;
            songCache = null; // Force refresh
          }
        // eslint-disable-next-line no-console
        }).catch(error => { console.debug('[SongLibrary] Background migration to IndexedDB failed:', error); });
      }
      return customSongsCache || [];
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[SongLibrary] Failed to load custom songs from localStorage:', e);
  }
  return [];
}

// Load custom songs from IndexedDB (async — call on app startup)
// IMPORTANT: Waits for any in-progress scan to complete first to prevent race conditions.
// A scan calls clearCustomSongs() → cache=[] → then loadCustomSongsFromStorage
// could overwrite with old IndexedDB data during the async scan loop.
export async function loadCustomSongsFromStorage(): Promise<Song[]> {
  // CRITICAL: Wait for any in-progress scan to finish before loading from IndexedDB.
  await waitForScanLock();

  if (typeof indexedDB === 'undefined') return getCustomSongs();

  try {
    const songs = await loadCustomSongsFromDB();
    // Normalize path fields (fix HTML entities, percent-encoding, Unicode)
    let needsResave = false;
    for (const song of songs) {
      const result = normalizeSongPathFields(song);
      if (result.changed) needsResave = true;
    }
    if (needsResave) {
      saveCustomSongsToDB(songs).catch(() => {});
    }
    // Only overwrite cache if it's empty or has fewer songs.
    if (songs.length > 0 && (!customSongsCache || customSongsCache.length < songs.length)) {
      customSongsCache = songs;
      return songs;
    }
    // If cache has data, prefer it (it's more recent)
    if (customSongsCache && customSongsCache.length > 0) {
      return customSongsCache;
    }
    // IndexedDB empty — check localStorage for migration
    const lsSongs = getCustomSongs();
    if (lsSongs.length > 0) {
      await migrateFromLocalStorage(lsSongs, StorageKeys.CUSTOM_SONGS);
    }
    return lsSongs;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[SongLibrary] Failed to load from IndexedDB:', e);
    return getCustomSongs();
  }
}

// Add a song to the library (async internally to await scan lock)
export async function addSong(song: Song): Promise<void> {
  // Wait for any in-progress scan to complete to avoid race condition
  await waitForScanLock();

  const customSongs = getCustomSongs();

  // Check for duplicates
  const exists = customSongs.some(s =>
    s.id === song.id ||
    (s.title === song.title && s.artist === song.artist)
  );

  if (!exists) {
    const newSong = {
      ...song,
      id: song.id || crypto.randomUUID(),
    };
    customSongs.push(newSong);
    saveCustomSongs(customSongs);

    // Update cache
    songCache = null; // Clear cache to force refresh
  }
}

// Add multiple songs
export async function addSongs(songs: Song[]): Promise<void> {
  // Wait for any in-progress scan to complete to avoid race condition
  await waitForScanLock();

  const customSongs = getCustomSongs();
  let added = false;

  // Build lookup sets for O(1) duplicate detection instead of O(n) per song
  const existingIds = new Set(customSongs.map(s => s.id));
  const existingTitles = new Set(customSongs.map(s => `${s.title}||${s.artist}`));

  for (const song of songs) {
    const isDuplicate = existingIds.has(song.id) || existingTitles.has(`${song.title}||${song.artist}`);

    if (!isDuplicate) {
      const newId = song.id || crypto.randomUUID();
      customSongs.push({ ...song, id: newId });
      existingIds.add(newId);
      existingTitles.add(`${song.title}||${song.artist}`);
      added = true;
    }
  }

  if (added) {
    saveCustomSongs(customSongs);
    songCache = null;
  }
}

// Replace ALL custom songs (used after a full folder scan)
// Unlike addSongs, this does NOT check for duplicates — it replaces everything.
// This prevents the race condition where loadCustomSongsFromStorage overwrites
// the cache with old IndexedDB data during the scan loop.
export function replaceCustomSongs(songs: Song[]): void {
  saveCustomSongs(songs);
  songCache = null;
}

// Save custom songs — primary storage is IndexedDB, localStorage is legacy fallback
function saveCustomSongs(songs: Song[]): void {
  // PERFORMANCE: Keep blob URLs in the in-memory cache for the current session.
  // Blob URLs are valid as long as the page isn't reloaded, and recreating them
  // for all songs (especially videos) is extremely slow.
  customSongsCache = songs.map(s => ({ ...s }));

  // Create minimal versions for persistent storage (remove blob URLs and lyrics)
  const minimalSongs = songs.map(s => {
    return {
      ...s,
      storedTxt: s.storedTxt,
      storedMedia: false,
      baseFolder: s.baseFolder,
      audioUrl: s.audioUrl && !s.audioUrl.startsWith('blob:') ? s.audioUrl : undefined,
      videoBackground: s.videoBackground && !s.videoBackground.startsWith('blob:') ? s.videoBackground : undefined,
      coverImage: s.coverImage && !s.coverImage.startsWith('blob:') ? s.coverImage : undefined,
      lyrics: [],
      relativeAudioPath: s.relativeAudioPath,
      relativeVideoPath: s.relativeVideoPath,
      relativeCoverPath: s.relativeCoverPath,
      relativeTxtPath: s.relativeTxtPath,
    };
  });

  // CRITICAL: Always save to localStorage FIRST (synchronous).
  // getCustomSongs() is synchronous and depends on localStorage as its fallback
  // when customSongsCache is null (e.g., after page reload). If we only save to
  // IndexedDB and clear localStorage, songs disappear until loadCustomSongsFromStorage
  // completes — causing the Library to render empty.
  saveToLocalStorage(minimalSongs);

  // Also persist to IndexedDB (async, non-blocking) as the primary large storage.
  if (typeof window !== 'undefined' && typeof indexedDB !== 'undefined') {
    saveCustomSongsToDB(minimalSongs).then(() => {
      // Saved successfully
    }).catch(err => {
      // eslint-disable-next-line no-console
      console.error('[SongLibrary] IndexedDB save failed (localStorage still has data):', err);
    });
  }
}

/** Legacy localStorage save — used as fallback when IndexedDB is unavailable. */
function saveToLocalStorage(songs: Song[]): void {
  try {
    setJson(StorageKeys.CUSTOM_SONGS, songs);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[SongLibrary] Failed to save custom songs to localStorage:', e);
    // Try ultra-minimal save as last resort
    try {
      const ultraMinimalSongs = songs.map(s => ({
        id: s.id,
        title: s.title,
        artist: s.artist,
        duration: s.duration,
        bpm: s.bpm,
        difficulty: s.difficulty,
        rating: s.rating,
        gap: s.gap,
        genre: s.genre,
        language: s.language,
        year: s.year,
        folderPath: s.folderPath,
        baseFolder: s.baseFolder,
        relativeAudioPath: s.relativeAudioPath,
        relativeVideoPath: s.relativeVideoPath,
        relativeCoverPath: s.relativeCoverPath,
        relativeTxtPath: s.relativeTxtPath,
        storedTxt: s.storedTxt,
        storedMedia: false,
        isDuet: s.isDuet,
        hasEmbeddedAudio: s.hasEmbeddedAudio,
        youtubeUrl: s.youtubeUrl,
        videoGap: s.videoGap,
        videoFile: s.videoFile,
        mp3File: s.mp3File,
        coverFile: s.coverFile,
        backgroundFile: s.backgroundFile,
        relativeBackgroundPath: s.relativeBackgroundPath,
        lyrics: [],
      }));
      setJson(StorageKeys.CUSTOM_SONGS, ultraMinimalSongs);
    } catch (e2) {
      // eslint-disable-next-line no-console
      console.error('[SongLibrary] Failed to save even ultra-minimal data — storage is full!', e2);
    }
  }
}

// Get song by ID (used internally by getSongByIdWithLyrics)
function getSongById(id: string): Song | undefined {
  const songs = getAllSongs();
  return songs.find(song => song.id === id);
}

// Get song by ID with lyrics loaded from IndexedDB if needed
// This is the PREFERRED way to get a song when you need lyrics (editor, game, etc.)
// Also restores media URLs for Tauri if needed
export async function getSongByIdWithLyrics(id: string): Promise<Song | undefined> {
  const song = getSongById(id);
  if (!song) return undefined;

  // In Tauri, restore media URLs if the song has relative paths but URLs are missing
  // Check EACH media type individually - don't require ALL to be missing
  let restoredSong = song;
  if (isTauri() && (song.relativeAudioPath || song.relativeVideoPath || song.relativeCoverPath)) {
    const needsAudioRestore = song.relativeAudioPath && !song.audioUrl;
    const needsVideoRestore = song.relativeVideoPath && !song.videoBackground;
    const needsCoverRestore = song.relativeCoverPath && !song.coverImage;

    if (needsAudioRestore || needsVideoRestore || needsCoverRestore) {
      restoredSong = await restoreSongUrls(song, updateSong);
    }
  }

  // If lyrics are already loaded, return the song as-is
  if (restoredSong.lyrics && restoredSong.lyrics.length > 0) {
    return restoredSong;
  }

  // If lyrics are missing, try to load them.
  // Trigger loading if storedTxt is set (IndexedDB cache) OR if relativeTxtPath exists (filesystem).
  // This ensures lyrics are loaded even if storedTxt was never set (e.g. scan cache miss).
  const canLoadLyrics = restoredSong.storedTxt || !!restoredSong.relativeTxtPath;
  if (canLoadLyrics) {
    const lyrics = await loadSongLyrics(restoredSong);
    if (lyrics.length > 0) {
      // Update storedTxt flag since we successfully loaded lyrics
      if (!restoredSong.storedTxt) {
        // eslint-disable-next-line no-console
        try { updateSong(id, { storedTxt: true }); } catch (e) { console.debug('[SongLibrary] Failed to update storedTxt flag:', e); }
      }
      return { ...restoredSong, lyrics, storedTxt: true };
    } else {
      // eslint-disable-next-line no-console
      console.warn('[SongLibrary] getSongByIdWithLyrics: Failed to load lyrics for song', id);
    }
  }

  // eslint-disable-next-line no-console
  console.warn('[SongLibrary] getSongByIdWithLyrics: No lyrics available for song', id);
  return restoredSong;
}

// Update a song
export function updateSong(songId: string, updates: Partial<Song>): void {
  const customSongs = getCustomSongs();
  const index = customSongs.findIndex(s => s.id === songId);

  if (index !== -1) {
    customSongs[index] = { ...customSongs[index], ...updates };
    saveCustomSongs(customSongs);
    songCache = null;
  }
}

// Get unique genres
export function getGenres(): string[] {
  const songs = getAllSongs();
  const genres = new Set<string>();

  songs.forEach(song => {
    if (song.genre) {
      // Split comma-separated genres and normalize each one
      const parts = splitGenres(song.genre);
      parts.forEach(g => genres.add(normalizeGenreName(g)));
    }
  });

  return Array.from(genres).sort();
}

// Get unique languages (normalized)
export function getLanguages(): string[] {
  const songs = getAllSongs();
  const languages = new Set<string>();

  songs.forEach(song => {
    if (song.language) {
      languages.add(normalizeLanguage(song.language));
    }
  });

  return Array.from(languages).sort();
}

// Filter songs by genre and/or language (with normalization)
export function filterSongs(
  songs: Song[],
  genre?: string,
  language?: string,
  combined?: boolean
): Song[] {
  const hasGenre = genre && genre !== 'all';
  const hasLanguage = language && language !== 'all';

  // No filters active
  if (!hasGenre && !hasLanguage) return songs;

  // Helper: check if a song's genre matches the filter genre
  // Handles comma-separated genres (e.g., "Soundtrack, K-Pop")
  const songGenreMatches = (song: Song, filterGenre: string): boolean => {
    if (!song.genre) return false;
    const normalizedFilter = normalizeGenreName(filterGenre).toLowerCase();
    const parts = splitGenres(song.genre);
    return parts.some(g => normalizeGenreName(g).toLowerCase() === normalizedFilter);
  };

  // Helper: check if a song's language matches the filter language
  const songLanguageMatches = (song: Song, filterLanguage: string): boolean => {
    if (!song.language) return false;
    return normalizeLanguage(song.language) === normalizeLanguage(filterLanguage);
  };

  // Independent mode (combined=false): OR logic — songs matching either filter are included
  if (combined === false && hasGenre && hasLanguage) {
    return songs.filter(s =>
      songGenreMatches(s, genre!) ||
      songLanguageMatches(s, language!)
    );
  }

  // Default (combined=true or only one filter): AND logic — both must match
  let filtered = songs;

  if (hasGenre) {
    filtered = filtered.filter(s => songGenreMatches(s, genre!));
  }

  if (hasLanguage) {
    filtered = filtered.filter(s => songLanguageMatches(s, language!));
  }

  return filtered;
}

// Clear all custom songs
export function clearCustomSongs(): void {
  // eslint-disable-next-line no-console
  try { removeItem(StorageKeys.CUSTOM_SONGS); } catch (e) { console.debug('[SongLibrary] Failed to clear localStorage:', e); }
  customSongsCache = [];
  songCache = null;
  // Clear blob URL cache in Tauri to force fresh loads
  if (isTauri()) {
    clearBlobUrlCache();
  }
  // Also clear IndexedDB
  if (typeof indexedDB !== 'undefined') {
    clearCustomSongsFromDB().catch(e => {
      // eslint-disable-next-line no-console
      console.warn('[SongLibrary] Failed to clear IndexedDB:', e);
    });
  }
}

// Get all songs asynchronously (with URL restoration for Tauri and IndexedDB for browser)
export async function getAllSongsAsync(): Promise<Song[]> {
  const songs = getAllSongs();

  // Resolve localStorage folder using shared utility
  const localStorageFolder = resolveSongsBaseFolder();

  // CRITICAL: If songs have no baseFolder or a RELATIVE baseFolder, fix them
  // A relative baseFolder (e.g. "Songs") cannot be used for file access.
  // Check if ANY song needs fixing (not just the first one).
  if (songs.length > 0) {
    const needsMigration = songs.some(s => {
      if (s.baseFolder && !isAbsolutePath(s.baseFolder)) return true;
      if (!s.baseFolder && localStorageFolder &&
        (s.relativeAudioPath || s.relativeVideoPath || s.relativeCoverPath)) return true;
      return false;
    });

    if (needsMigration && localStorageFolder && isAbsolutePath(localStorageFolder)) {
      const updatedSongs = songs.map(s => ({
        ...s,
        baseFolder: (s.baseFolder && isAbsolutePath(s.baseFolder)) ? s.baseFolder : (localStorageFolder || undefined),
      }));
      saveCustomSongs(updatedSongs);
    }
  }

  if (isTauri()) {
    // PERFORMANCE: Only restore COVER URLs eagerly (small images for library grid).
    // Audio/Video URLs are restored lazily when a song is actually played (via ensureSongUrls).
    // This avoids loading potentially hundreds of MB of video data at library load time.
    const songsNeedingCover = songs.filter(song =>
      song.relativeCoverPath && !song.coverImage
    );
    const coverUrlMap = new Map<string, string>();
    await Promise.all(
      songsNeedingCover.map(async (song) => {
        if (song.relativeCoverPath && song.baseFolder) {
          try {
            const url = await getSongMediaUrl(song.relativeCoverPath, song.baseFolder);
            if (url) coverUrlMap.set(song.id, url);
          } catch {
            // Non-critical — cover just won't show
          }
        }
      })
    );
    return songs.map(song => {
      const coverUrl = coverUrlMap.get(song.id);
      if (coverUrl) return { ...song, coverImage: coverUrl };
      return song;
    });
  }

  // In browser mode, restore URLs from IndexedDB for songs that have storedMedia flag.
  // CRITICAL: Revoke previous blob URLs before creating new ones to prevent memory leaks.
  revokeBrowserBlobUrls();
  const restoredSongs = await Promise.all(
    songs.map(async (song) => {
      if (song.storedMedia) {
        try {
          const mediaUrls = await getSongMediaUrls(song.id);
          lastBrowserBlobUrls.push(mediaUrls);
          return {
            ...song,
            audioUrl: mediaUrls.audioUrl || song.audioUrl,
            videoBackground: mediaUrls.videoUrl || song.videoBackground,
            coverImage: mediaUrls.coverUrl || song.coverImage
          };
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error(`Failed to restore media for song ${song.id}:`, error);
          return song;
        }
      }
      return song;
    })
  );

  return restoredSongs;
}
