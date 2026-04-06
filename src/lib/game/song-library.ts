// Song Library Store - Manages songs with persistent storage
import { Song, LyricLine } from '@/types/game';
import { sampleSongs } from '@/data/songs/songs';
import { isTauri, getPlayableUrl, getSongMediaUrl, clearBlobUrlCache } from '@/lib/tauri-file-storage';
import { getSongMediaUrls, storeMedia, hasMedia, getTxtContent } from '@/lib/db/media-db';
import { saveCustomSongsToDB, loadCustomSongsFromDB, migrateFromLocalStorage, clearCustomSongsFromDB } from '@/lib/db/custom-songs-db';
import { convertNotesToLyricLines } from '@/lib/parsers/notes-to-lyric-lines';

const STORAGE_KEY = 'karaoke-successor-songs';
const SETTINGS_KEY = 'karaoke-successor-settings';
const CUSTOM_SONGS_KEY = 'karaoke-successor-custom-songs';

export interface LibrarySettings {
  sortBy: 'title' | 'artist' | 'difficulty' | 'rating' | 'lastPlayed' | 'dateAdded';
  sortOrder: 'asc' | 'desc';
  filterDifficulty: 'all' | 'easy' | 'medium' | 'hard';
  filterGenre: string;
  viewMode: 'grid' | 'list';
  folders: string[]; // Scanned folders
}

const defaultSettings: LibrarySettings = {
  sortBy: 'title',
  sortOrder: 'asc',
  filterDifficulty: 'all',
  filterGenre: 'all',
  viewMode: 'grid',
  folders: [],
};

// In-memory song cache
let songCache: Song[] | null = null;
let customSongsCache: Song[] | null = null;
// Cache timestamp for automatic staleness detection
let songCacheTimestamp = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Scan lock: prevents loadCustomSongsFromStorage from overwriting cache
// while a Settings scan is in progress (avoids race condition)
let scanInProgress = false;

/** Mark that a scan is starting — prevents async IndexedDB load from overwriting. */
export function setScanInProgress(inProgress: boolean): void {
  scanInProgress = inProgress;
  console.log('[SongLibrary] Scan in progress:', inProgress);
}

/** Invalidate all in-memory caches, forcing fresh reads from storage. */
export function clearSongCache(): void {
  songCache = null;
  customSongsCache = null;
  songCacheTimestamp = 0;
}

/** Invalidate only the combined song cache, preserving customSongsCache.
 *  Use after replaceCustomSongs() to avoid clearing the freshly set cache. */
export function invalidateSongCache(): void {
  songCache = null;
  songCacheTimestamp = 0;
}

// Get all songs (sample + custom)
export function getAllSongs(): Song[] {
  // Auto-expire cache after TTL
  if (songCache && Date.now() - songCacheTimestamp > CACHE_TTL_MS) {
    songCache = null;
  }
  
  if (songCache) return songCache;
  
  const customSongs = getCustomSongs();
  songCache = [...sampleSongs, ...customSongs];
  songCacheTimestamp = Date.now();
  return songCache;
}

// Get custom/imported songs — reads from IndexedDB cache, falls back to localStorage
export function getCustomSongs(): Song[] {
  if (customSongsCache) return customSongsCache;
  
  // Check if running in browser
  if (typeof window === 'undefined') {
    return [];
  }
  
  // Try localStorage first (fast, sync)
  try {
    const stored = localStorage.getItem(CUSTOM_SONGS_KEY);
    if (stored) {
      const songs = JSON.parse(stored);
      customSongsCache = songs;
      // Trigger background migration to IndexedDB
      if (typeof indexedDB !== 'undefined' && songs.length > 0) {
        migrateFromLocalStorage(songs, CUSTOM_SONGS_KEY).then(migrated => {
          if (migrated) {
            customSongsCache = migrated;
            songCache = null; // Force refresh
          }
        }).catch(() => {});
      }
      return customSongsCache || [];
    }
  } catch (e) {
    console.error('[SongLibrary] Failed to load custom songs from localStorage:', e);
  }
  return [];
}

// Load custom songs from IndexedDB (async — call on app startup)
// IMPORTANT: Skips entirely if a scan is in progress to prevent race conditions.
// A scan calls clearCustomSongs() → cache=[] → then loadCustomSongsFromStorage
// could overwrite with old IndexedDB data during the async scan loop.
export async function loadCustomSongsFromStorage(): Promise<Song[]> {
  // CRITICAL: If a scan is in progress, DO NOT overwrite the cache.
  // The scan will set the cache when it completes.
  if (scanInProgress) {
    console.log('[SongLibrary] Skipping loadCustomSongsFromStorage — scan in progress');
    return getCustomSongs();
  }
  
  if (typeof indexedDB === 'undefined') return getCustomSongs();
  
  try {
    const songs = await loadCustomSongsFromDB();
    // Re-check scan flag after async operation
    if (scanInProgress) {
      console.log('[SongLibrary] Skipping loadCustomSongsFromStorage — scan started during load');
      return getCustomSongs();
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
      await migrateFromLocalStorage(lsSongs, CUSTOM_SONGS_KEY);
    }
    return lsSongs;
  } catch (e) {
    console.error('[SongLibrary] Failed to load from IndexedDB:', e);
    return getCustomSongs();
  }
}

// Add a song to the library
export function addSong(song: Song): void {
  const customSongs = getCustomSongs();
  
  // Check for duplicates
  const exists = customSongs.some(s => 
    s.id === song.id || 
    (s.title === song.title && s.artist === song.artist)
  );
  
  if (!exists) {
    const newSong = {
      ...song,
      id: song.id || `custom-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
    };
    customSongs.push(newSong);
    saveCustomSongs(customSongs);
    
    // Update cache
    songCache = null; // Clear cache to force refresh
  }
}

// Add multiple songs
export function addSongs(songs: Song[]): void {
  const customSongs = getCustomSongs();
  let added = false;
  
  for (const song of songs) {
    const exists = customSongs.some(s => 
      s.id === song.id || 
      (s.title === song.title && s.artist === song.artist)
    );
    
    if (!exists) {
      customSongs.push({
        ...song,
        id: song.id || `custom-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
      });
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
  console.log('[SongLibrary] Replacing all custom songs with', songs.length, 'songs');
  saveCustomSongs(songs);
  songCache = null;
}

// Remove a song
export function removeSong(songId: string): void {
  let customSongs = getCustomSongs();
  customSongs = customSongs.filter(s => s.id !== songId);
  saveCustomSongs(customSongs);
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
      console.log('[SongLibrary] Saved', minimalSongs.length, 'custom songs to IndexedDB');
    }).catch(err => {
      console.error('[SongLibrary] IndexedDB save failed (localStorage still has data):', err);
    });
  }
}

/** Legacy localStorage save — used as fallback when IndexedDB is unavailable. */
function saveToLocalStorage(songs: Song[]): void {
  try {
    localStorage.setItem(CUSTOM_SONGS_KEY, JSON.stringify(songs));
  } catch (e) {
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
        lyrics: [],
      }));
      localStorage.setItem(CUSTOM_SONGS_KEY, JSON.stringify(ultraMinimalSongs));
    } catch (e2) {
      console.error('[SongLibrary] Failed to save even ultra-minimal data — storage is full!', e2);
    }
  }
}

// Get library settings
export function getLibrarySettings(): LibrarySettings {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) {
      return { ...defaultSettings, ...JSON.parse(stored) };
    }
  } catch (e) {
    console.error('Failed to load library settings:', e);
  }
  return defaultSettings;
}

// Save library settings
export function saveLibrarySettings(settings: Partial<LibrarySettings>): void {
  try {
    const current = getLibrarySettings();
    const updated = { ...current, ...settings };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to save library settings:', e);
  }
}

// Sort songs
export function sortSongs(songs: Song[], settings: LibrarySettings): Song[] {
  const { sortBy, sortOrder } = settings;
  
  const sorted = [...songs].sort((a, b) => {
    let comparison = 0;
    
    switch (sortBy) {
      case 'title':
        comparison = a.title.localeCompare(b.title);
        break;
      case 'artist':
        comparison = a.artist.localeCompare(b.artist);
        break;
      case 'difficulty':
        const diffOrder = { easy: 1, medium: 2, hard: 3 };
        comparison = diffOrder[a.difficulty] - diffOrder[b.difficulty];
        break;
      case 'rating':
        comparison = (b.rating || 0) - (a.rating || 0);
        break;
      case 'lastPlayed':
        comparison = (b.lastPlayed || 0) - (a.lastPlayed || 0);
        break;
      case 'dateAdded':
        comparison = (b.dateAdded || 0) - (a.dateAdded || 0);
        break;
    }
    
    return sortOrder === 'asc' ? comparison : -comparison;
  });
  
  return sorted;
}

// Filter songs
export function filterSongs(songs: Song[], settings: LibrarySettings): Song[] {
  let filtered = [...songs];
  
  if (settings.filterDifficulty !== 'all') {
    filtered = filtered.filter(s => s.difficulty === settings.filterDifficulty);
  }
  
  if (settings.filterGenre && settings.filterGenre !== 'all') {
    filtered = filtered.filter(s => 
      s.genre?.toLowerCase().includes(settings.filterGenre.toLowerCase())
    );
  }
  
  return filtered;
}

// Search songs
// Includes title, artist, genre, album, tags, and edition in search
export function searchSongs(query: string): Song[] {
  const songs = getAllSongs();
  if (!query) return songs;

  const lowerQuery = query.toLowerCase();
  return songs.filter(song => {
    // Search in basic fields
    if (song.title.toLowerCase().includes(lowerQuery)) return true;
    if (song.artist.toLowerCase().includes(lowerQuery)) return true;
    if (song.genre?.toLowerCase().includes(lowerQuery)) return true;
    if (song.album?.toLowerCase().includes(lowerQuery)) return true;

    // Search in tags (comma-separated)
    if (song.tags) {
      const tags = song.tags.toLowerCase().split(',').map(t => t.trim());
      if (tags.some(tag => tag.includes(lowerQuery))) return true;
    }

    // Search in edition
    if (song.edition?.toLowerCase().includes(lowerQuery)) return true;

    return false;
  });
}

// Get song by ID
export function getSongById(id: string): Song | undefined {
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
      console.log('[SongLibrary] getSongByIdWithLyrics: Restoring URLs for Tauri song:', id, {
        needsAudioRestore,
        needsVideoRestore,
        needsCoverRestore,
      });
      restoredSong = await restoreSongUrls(song);
    }
  }
  
  // If lyrics are already loaded, return the song as-is
  if (restoredSong.lyrics && restoredSong.lyrics.length > 0) {
    console.log('[SongLibrary] getSongByIdWithLyrics: Lyrics already loaded for', id);
    return restoredSong;
  }
  
  // If lyrics are missing, try to load them.
  // Trigger loading if storedTxt is set (IndexedDB cache) OR if relativeTxtPath exists (filesystem).
  // This ensures lyrics are loaded even if storedTxt was never set (e.g. scan cache miss).
  const canLoadLyrics = restoredSong.storedTxt || !!restoredSong.relativeTxtPath;
  if (canLoadLyrics) {
    console.log('[SongLibrary] getSongByIdWithLyrics: Loading lyrics for', id, {
      storedTxt: restoredSong.storedTxt,
      relativeTxtPath: restoredSong.relativeTxtPath,
    });
    const lyrics = await loadSongLyrics(restoredSong);
    if (lyrics.length > 0) {
      console.log('[SongLibrary] getSongByIdWithLyrics: Loaded', lyrics.length, 'lyric lines');
      // Update storedTxt flag since we successfully loaded lyrics
      if (!restoredSong.storedTxt) {
        try { updateSong(id, { storedTxt: true }); } catch {}
      }
      return { ...restoredSong, lyrics, storedTxt: true };
    } else {
      console.warn('[SongLibrary] getSongByIdWithLyrics: Failed to load lyrics for song', id);
    }
  }
  
  console.warn('[SongLibrary] getSongByIdWithLyrics: No lyrics available for song', id);
  return restoredSong;
}

// Update a song
export function updateSong(songId: string, updates: Partial<Song>): void {
  let customSongs = getCustomSongs();
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
    if (song.genre) genres.add(song.genre);
  });
  
  return Array.from(genres).sort();
}

// Export songs for backup
export function exportSongs(): string {
  const customSongs = getCustomSongs();
  return JSON.stringify(customSongs, null, 2);
}

// Import songs from backup
export function importSongsFromBackup(json: string): number {
  try {
    const songs = JSON.parse(json) as Song[];
    addSongs(songs);
    return songs.length;
  } catch (e) {
    console.error('Failed to import songs:', e);
    return 0;
  }
}

// Clear all custom songs
export function clearCustomSongs(): void {
  try { localStorage.removeItem(CUSTOM_SONGS_KEY); } catch {}
  customSongsCache = [];
  songCache = null;
  // Clear blob URL cache in Tauri to force fresh loads
  if (isTauri()) {
    clearBlobUrlCache();
  }
  // Also clear IndexedDB
  if (typeof indexedDB !== 'undefined') {
    clearCustomSongsFromDB().catch(e => {
      console.warn('[SongLibrary] Failed to clear IndexedDB:', e);
    });
  }
}

// Reload library - clear cache and force fresh load from localStorage
export function reloadLibrary(): Song[] {
  clearSongCache();
  // Clear blob URL cache in Tauri to force fresh loads
  if (isTauri()) {
    clearBlobUrlCache();
  }
  return getAllSongs();
}

// Check if a song exists in custom songs (for update detection)
export function songExists(title: string, artist: string): boolean {
  const customSongs = getCustomSongs();
  return customSongs.some(s => s.title === title && s.artist === artist);
}

// Replace a song (for updates)
export function replaceSong(song: Song): void {
  let customSongs = getCustomSongs();
  const index = customSongs.findIndex(s => s.title === song.title && s.artist === song.artist);
  
  if (index !== -1) {
    customSongs[index] = { ...song, id: customSongs[index].id };
  } else {
    customSongs.push({
      ...song,
      id: song.id || `custom-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
    });
  }
  
  saveCustomSongs(customSongs);
  songCache = null;
}

// Restore song URLs for Tauri - converts relative paths back to playable URLs
// IMPORTANT: Uses getSongMediaUrl which reads from the songs folder
// Falls back to song.baseFolder if localStorage 'karaoke-songs-folder' is not set
// Restores ONLY the URLs that are missing - doesn't re-fetch existing ones
export async function restoreSongUrls(song: Song): Promise<Song> {
  console.log('[SongLibrary] restoreSongUrls called for:', song.title, {
    isTauri: isTauri(),
    baseFolder: song.baseFolder,
    localStorageFolder: typeof window !== 'undefined' ? localStorage.getItem('karaoke-songs-folder') : 'N/A',
    relativeAudioPath: song.relativeAudioPath,
    relativeVideoPath: song.relativeVideoPath,
    relativeCoverPath: song.relativeCoverPath,
    hasAudioUrl: !!song.audioUrl,
    hasVideoUrl: !!song.videoBackground,
    hasCoverUrl: !!song.coverImage,
  });
  
  if (!isTauri()) {
    // In browser mode, URLs should already be valid
    console.log('[SongLibrary] restoreSongUrls: Not in Tauri mode, returning song as-is');
    return song;
  }
  
  const restored = { ...song };
  
  // Determine the base folder to use:
  // 1. Priority: song's own baseFolder (stored when scanned) — ONLY if absolute
  // 2. Fallback: localStorage 'karaoke-songs-folder'
  // IMPORTANT: A relative baseFolder (e.g. "Songs") will NOT work for file access.
  // We must validate that baseFolder is an absolute path.
  let localStorageFolder: string | null = null;
  try {
    localStorageFolder = localStorage.getItem('karaoke-songs-folder');
  } catch (e) {
    console.warn('[SongLibrary] Could not access localStorage:', e);
  }
  
  // Helper: check if a path looks absolute (Windows: D:\... or Unix: /...)
  const isAbsolutePath = (p: string): boolean => 
    p.startsWith('/') || /^[A-Za-z]:[\\/]/.test(p);
  
  let baseFolder = song.baseFolder || localStorageFolder || undefined;
  
  // CRITICAL FIX: If baseFolder is relative, prefer localStorage if it's absolute
  if (baseFolder && !isAbsolutePath(baseFolder)) {
    if (localStorageFolder && isAbsolutePath(localStorageFolder)) {
      console.warn('[SongLibrary] baseFolder is relative, replacing with absolute localStorage value:',
        `"${baseFolder}" -> "${localStorageFolder}"`);
      baseFolder = localStorageFolder;
    } else {
      console.warn('[SongLibrary] baseFolder is relative and no absolute fallback available:', baseFolder);
      console.warn('[SongLibrary] SOLUTION: Please re-scan your songs folder in Settings');
    }
  }
  
  // Update the song's baseFolder if we fixed it (so it persists)
  if (baseFolder && baseFolder !== song.baseFolder && isAbsolutePath(baseFolder)) {
    restored.baseFolder = baseFolder;
    // Persist the fix silently
    try {
      updateSong(song.id, { baseFolder });
    } catch (e) {
      // Non-critical — the fix is in memory for this session
    }
  }
  
  // If baseFolder is still not set, check if relative paths look like absolute paths
  if (!baseFolder) {
    // Try to extract base folder from the relative paths
    const allPaths = [song.relativeAudioPath, song.relativeVideoPath, song.relativeCoverPath].filter(Boolean);
    if (allPaths.length > 0) {
      console.warn('[SongLibrary] No baseFolder set for song:', song.title, '- attempting to use paths as-is');
      // Check if any path looks like an absolute path
      for (const path of allPaths) {
        if (path && (path.startsWith('/') || path.match(/^[A-Za-z]:\\/))) {
          console.log('[SongLibrary] Found absolute path, using as-is:', path);
          baseFolder = undefined; // Will try to load directly
          break;
        }
      }
    }
  }
  
  if (!baseFolder) {
    console.warn('[SongLibrary] No base folder available for song:', song.title);
    console.warn('[SongLibrary] SOLUTION: Please re-scan your songs folder in Settings to set the base folder');
    return song;
  }
  
  console.log('[SongLibrary] Using baseFolder:', baseFolder, 'for song:', song.title);
  
  try {
    // Restore audio URL from songs folder - only if missing
    if (song.relativeAudioPath && !song.audioUrl) {
      console.log('[SongLibrary] Restoring audio URL:', song.relativeAudioPath, 'from baseFolder:', baseFolder);
      const url = await getSongMediaUrl(song.relativeAudioPath, baseFolder);
      if (url) {
        restored.audioUrl = url;
        console.log('[SongLibrary] Restored audio URL for', song.title);
      } else {
        console.warn('[SongLibrary] Failed to restore audio URL for', song.title, '- file may not exist:', song.relativeAudioPath);
      }
    }
    
    // Restore video URL from songs folder - only if missing
    if (song.relativeVideoPath && !song.videoBackground) {
      console.log('[SongLibrary] Restoring video URL:', song.relativeVideoPath, 'from baseFolder:', baseFolder);
      const url = await getSongMediaUrl(song.relativeVideoPath, baseFolder);
      if (url) {
        restored.videoBackground = url;
        console.log('[SongLibrary] Restored video URL for', song.title);
      } else {
        console.warn('[SongLibrary] Failed to restore video URL for', song.title, '- file may not exist:', song.relativeVideoPath);
      }
    }
    
    // Restore cover URL from songs folder - only if missing
    if (song.relativeCoverPath && !song.coverImage) {
      console.log('[SongLibrary] Restoring cover URL:', song.relativeCoverPath, 'from baseFolder:', baseFolder);
      const url = await getSongMediaUrl(song.relativeCoverPath, baseFolder);
      if (url) {
        restored.coverImage = url;
        console.log('[SongLibrary] Restored cover URL for', song.title);
      } else {
        console.warn('[SongLibrary] Failed to restore cover URL for', song.title, '- file may not exist:', song.relativeCoverPath);
      }
    }
  } catch (error) {
    console.error('[SongLibrary] Failed to restore song URLs:', error);
  }
  
  return restored;
}

// CRITICAL: Ensure a song has valid media URLs
// This is the central function that should be called before using a song
// It restores URLs from relative paths if needed (Tauri only)
export async function ensureSongUrls(song: Song): Promise<Song> {
  // Skip if not in Tauri or song has no relative paths
  if (!isTauri()) {
    return song;
  }
  
  // Check if any URL restoration is needed
  const needsAudio = song.relativeAudioPath && !song.audioUrl;
  const needsVideo = song.relativeVideoPath && !song.videoBackground;
  const needsCover = song.relativeCoverPath && !song.coverImage;
  
  if (!needsAudio && !needsVideo && !needsCover) {
    // All URLs are already present
    return song;
  }
  
  console.log('[SongLibrary] ensureSongUrls: Restoring URLs for', song.title, {
    needsAudio: !!needsAudio,
    needsVideo: !!needsVideo,
    needsCover: !!needsCover,
    baseFolder: song.baseFolder,
  });
  
  // Use restoreSongUrls to do the actual restoration
  return await restoreSongUrls(song);
}

// Get all songs asynchronously (with URL restoration for Tauri and IndexedDB for browser)
export async function getAllSongsAsync(): Promise<Song[]> {
  const songs = getAllSongs();
  console.log('[SongLibrary] getAllSongsAsync called, songs count:', songs.length);
  
  // Debug: Check localStorage songs folder
  let localStorageFolder: string | null = null;
  try {
    localStorageFolder = localStorage.getItem('karaoke-songs-folder');
  } catch (e) {
    console.warn('[SongLibrary] Could not read localStorage:', e);
  }
  console.log('[SongLibrary] localStorage karaoke-songs-folder:', localStorageFolder);
  
  // Debug: Log first song's properties to verify baseFolder is stored
  if (songs.length > 0) {
    const firstSong = songs[0];
    console.log('[SongLibrary] First song sample:', {
      id: firstSong.id,
      title: firstSong.title,
      baseFolder: firstSong.baseFolder,
      relativeAudioPath: firstSong.relativeAudioPath,
      relativeVideoPath: firstSong.relativeVideoPath,
      relativeCoverPath: firstSong.relativeCoverPath,
      audioUrl: firstSong.audioUrl ? 'present' : 'missing',
      videoBackground: firstSong.videoBackground ? 'present' : 'missing',
      coverImage: firstSong.coverImage ? 'present' : 'missing',
    });
    
    // CRITICAL: If songs have no baseFolder or a RELATIVE baseFolder, fix them
    // A relative baseFolder (e.g. "Songs") cannot be used for file access
    const isAbsPath = (p: string): boolean => 
      p.startsWith('/') || /^[A-Za-z]:[\\/]/.test(p);
    
    const needsBaseFolderFix = firstSong.baseFolder && !isAbsPath(firstSong.baseFolder);
    const needsBaseFolderMigration = !firstSong.baseFolder && localStorageFolder && 
      (firstSong.relativeAudioPath || firstSong.relativeVideoPath || firstSong.relativeCoverPath);
    
    if ((needsBaseFolderFix || needsBaseFolderMigration) && localStorageFolder && isAbsPath(localStorageFolder)) {
      console.log('[SongLibrary] Songs have', needsBaseFolderFix ? 'relative' : 'no', 'baseFolder - updating all songs with:', localStorageFolder);
      const updatedSongs = songs.map(s => ({
        ...s,
        baseFolder: (s.baseFolder && isAbsPath(s.baseFolder)) ? s.baseFolder : (localStorageFolder || undefined),
      }));
      saveCustomSongs(updatedSongs);
      console.log('[SongLibrary] Updated all songs with absolute baseFolder from localStorage');
    }
  }
  
  if (isTauri()) {
    // PERFORMANCE: Only restore COVER URLs eagerly (small images for library grid).
    // Audio/Video URLs are restored lazily when a song is actually played (via ensureSongUrls).
    // This avoids loading potentially hundreds of MB of video data at library load time.
    const songsNeedingCover = songs.filter(song =>
      song.relativeCoverPath && !song.coverImage
    );
    if (songsNeedingCover.length > 0) {
      console.log(`[SongLibrary] Restoring cover URLs for ${songsNeedingCover.length} songs (audio/video deferred)`);
    }
    const coverUrlMap = new Map<string, string>();
    await Promise.all(
      songsNeedingCover.map(async (song) => {
        if (song.relativeCoverPath && song.baseFolder) {
          try {
            const url = await getSongMediaUrl(song.relativeCoverPath, song.baseFolder);
            if (url) coverUrlMap.set(song.id, url);
          } catch (e) {
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
  
  // In browser mode, restore URLs from IndexedDB for songs that have storedMedia flag
  const restoredSongs = await Promise.all(
    songs.map(async (song) => {
      if (song.storedMedia) {
        try {
          const mediaUrls = await getSongMediaUrls(song.id);
          return {
            ...song,
            audioUrl: mediaUrls.audioUrl || song.audioUrl,
            videoBackground: mediaUrls.videoUrl || song.videoBackground,
            coverImage: mediaUrls.coverUrl || song.coverImage
          };
        } catch (error) {
          console.error(`Failed to restore media for song ${song.id}:`, error);
          return song;
        }
      }
      return song;
    })
  );
  
  return restoredSongs;
}

// Load lyrics on-demand from IndexedDB
// This is used when a song is played and the lyrics weren't stored in localStorage
export async function loadSongLyrics(song: Song): Promise<LyricLine[]> {
  console.log('[SongLibrary] loadSongLyrics called for song:', song.id, song.title);
  console.log('[SongLibrary] song.lyrics length:', song.lyrics?.length || 0);
  console.log('[SongLibrary] song.storedTxt:', song.storedTxt);
  console.log('[SongLibrary] song.relativeTxtPath:', song.relativeTxtPath);
  console.log('[SongLibrary] song.gap:', song.gap, 'song.bpm:', song.bpm);
  
  // If lyrics are already loaded, return them
  if (song.lyrics && song.lyrics.length > 0) {
    console.log('[SongLibrary] Lyrics already loaded, returning them');
    return song.lyrics;
  }
  
  // Strategy 1: Load from IndexedDB if storedTxt flag is set
  if (song.storedTxt) {
    try {
      console.log('[SongLibrary] Attempting to load TXT from IndexedDB for song:', song.id);
      const txtContent = await getTxtContent(song.id);
      console.log('[SongLibrary] TXT content loaded from IndexedDB, length:', txtContent?.length || 0);
      if (txtContent && txtContent.length > 0) {
        const parsedLyrics = parseUltraStarTxtContent(txtContent, song.gap || 0, song.bpm || 120);
        console.log('[SongLibrary] Parsed lyrics, lines:', parsedLyrics.length);
        if (parsedLyrics.length > 0) {
          return parsedLyrics;
        }
      } else {
        console.warn('[SongLibrary] TXT content is null or empty for song:', song.id, '- falling through to file system');
      }
    } catch (error) {
      console.error('[SongLibrary] Failed to load lyrics from IndexedDB:', error, '- falling through to file system');
    }
  }
  
  // Strategy 2: Load directly from file system in Tauri using native command (bypass ACL)
  if (song.relativeTxtPath && typeof window !== 'undefined' && ('__TAURI__' in window || '__TAURI_INTERNALS__' in window)) {
    try {
      console.log('[SongLibrary] Attempting to load TXT from file system (native):', song.relativeTxtPath);
      const { nativeReadFileText } = await import('@/lib/native-fs');
      
      // Use song.baseFolder as primary source, fallback to localStorage
      // IMPORTANT: Validate that baseFolder is absolute — relative paths won't work
      let songsFolder = song.baseFolder || localStorage.getItem('karaoke-songs-folder');
      if (songsFolder && !songsFolder.startsWith('/') && !/^[A-Za-z]:[\\/]/.test(songsFolder)) {
        const lsFolder = localStorage.getItem('karaoke-songs-folder');
        if (lsFolder && (lsFolder.startsWith('/') || /^[A-Za-z]:[\\/]/.test(lsFolder))) {
          songsFolder = lsFolder;
        }
      }
      
      if (songsFolder) {
        const filePath = `${songsFolder}/${song.relativeTxtPath}`;
        console.log('[SongLibrary] Loading from path:', filePath);
        
        const txtContent = await nativeReadFileText(filePath);
        console.log('[SongLibrary] TXT content loaded from file system, length:', txtContent?.length || 0);
        
        if (txtContent && txtContent.length > 0) {
          const parsedLyrics = parseUltraStarTxtContent(txtContent, song.gap || 0, song.bpm || 120);
          console.log('[SongLibrary] Parsed lyrics from file, lines:', parsedLyrics.length);
          if (parsedLyrics.length > 0) {
            // Cache in IndexedDB for future use
            try {
              const txtBlob = new Blob([txtContent], { type: 'text/plain' });
              await storeMedia(song.id, 'txt', txtBlob);
              console.log('[SongLibrary] Cached TXT in IndexedDB for future use');
            } catch (cacheErr) {
              console.warn('[SongLibrary] Failed to cache TXT:', cacheErr);
            }
            return parsedLyrics;
          }
        }
      } else {
        console.warn('[SongLibrary] No songs folder available for loading TXT');
      }
    } catch (error) {
      console.error('[SongLibrary] Failed to load lyrics from file system:', error);
    }
  }
  
  // Strategy 3: Try to load from stored media in IndexedDB with different key format
  // Sometimes the song ID might not match due to how it was stored
  if (song.storedTxt) {
    try {
      console.log('[SongLibrary] Trying alternative IndexedDB lookup strategies');
      const { getMedia } = await import('@/lib/db/media-db');
      
      // Try with original ID
      let blob = await getMedia(song.id, 'txt');
      
      // Try with scanned- prefix stripped
      if (!blob && song.id.startsWith('scanned-')) {
        const altId = song.id.replace('scanned-', '');
        console.log('[SongLibrary] Trying alt ID:', altId);
        blob = await getMedia(altId, 'txt');
      }
      
      if (blob && blob.size > 0) {
        const txtContent = await blob.text();
        if (txtContent && txtContent.length > 0) {
          const parsedLyrics = parseUltraStarTxtContent(txtContent, song.gap || 0, song.bpm || 120);
          console.log('[SongLibrary] Parsed lyrics from alt IndexedDB lookup, lines:', parsedLyrics.length);
          if (parsedLyrics.length > 0) {
            return parsedLyrics;
          }
        }
      }
    } catch (error) {
      console.error('[SongLibrary] Alternative IndexedDB lookup failed:', error);
    }
  }
  
  console.warn('[SongLibrary] Could not load lyrics for song:', song.id);
  return [];
}

// Parse UltraStar TXT content to lyrics
// IMPORTANT: Don't trim lines or lyrics - trailing spaces are significant for word boundaries
function parseUltraStarTxtContent(content: string, gap: number, bpm: number): LyricLine[] {
  // Strip BOM if present (common on Windows)
  let cleanContent = content;
  if (cleanContent.charCodeAt(0) === 0xFEFF) {
    cleanContent = cleanContent.substring(1);
  }

  // Also strip \r from all lines (Windows \r\n line endings)
  cleanContent = cleanContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  const lines = cleanContent.split('\n').filter(l => l.trim().length > 0);
  const notes: Array<{ type: string; startBeat: number; duration: number; pitch: number; lyric: string; player?: 'P1' | 'P2' }> = [];
  const lineBreakBeats = new Set<number>();

  let currentPlayer: 'P1' | 'P2' | undefined = undefined;
  let noteLineCount = 0;

  for (const line of lines) {
    const trimmedLine = line.trim();

    if (trimmedLine === 'P1' || trimmedLine === 'P1:') { currentPlayer = 'P1'; continue; }
    if (trimmedLine === 'P2' || trimmedLine === 'P2:') { currentPlayer = 'P2'; continue; }
    if (trimmedLine.startsWith('#')) continue;
    if (trimmedLine === 'E') break;

    if (trimmedLine.startsWith('-')) {
      const lineBreakMatch = trimmedLine.match(/^-\s*(-?\d+)/);
      if (lineBreakMatch) lineBreakBeats.add(parseInt(lineBreakMatch[1]));
      continue;
    }

    const duetPrefixMatch = line.match(/^(P1|P2):\s*(.*)$/);
    let noteLine = line;
    let notePlayer: 'P1' | 'P2' | undefined = currentPlayer;
    if (duetPrefixMatch) {
      notePlayer = duetPrefixMatch[1] as 'P1' | 'P2';
      noteLine = duetPrefixMatch[2];
    }

    const noteMatch = noteLine.match(/^\s*([:*FGR])\s*(-?\d+)\s+(\d+)\s+(-?\d+)\s*(.*)$/);
    if (noteMatch) {
      const [, type, startStr, durationStr, pitchStr, lyric] = noteMatch;
      notes.push({ type, startBeat: parseInt(startStr), duration: parseInt(durationStr), pitch: parseInt(pitchStr), lyric, player: notePlayer });
      noteLineCount++;
      continue;
    }

    // Line break note format: : (Beat) -  (colon type, beat number, hyphen only → line break)
    // This format has NO duration and NO pitch — it's a simplified line break marker.
    // Example: ": 30 -" → line break at beat 30
    // All other hyphens in lyrics are treated as normal text.
    const lineBreakNoteMatch = noteLine.match(/^\s*:\s*(-?\d+)\s+-\s*$/);
    if (lineBreakNoteMatch) {
      const startBeat = parseInt(lineBreakNoteMatch[1]);
      notes.push({ type: ':', startBeat, duration: 1, pitch: 0, lyric: '-', player: notePlayer });
      noteLineCount++;
    }
  }

  // DIAGNOSTIC: If no notes were found, log sample lines to identify the format
  if (noteLineCount === 0 && lines.length > 0) {
    const nonHeaderLines = lines.filter(l => {
      const t = l.trim();
      return t.length > 0 && !t.startsWith('#') && t !== 'E' && t !== 'P1' && t !== 'P2' && t !== 'P1:' && t !== 'P2:' && !t.startsWith('-');
    });
    const sampleLines = nonHeaderLines.slice(0, 5).map(l => `"${l.substring(0, 100)}"`);
    console.warn('[SongLibrary] parseUltraStarTxtContent: 0 notes found!', {
      totalLines: lines.length,
      nonHeaderLines: nonHeaderLines.length,
      contentLength: cleanContent.length,
      bpm, gap,
      sampleLines,
    });
  }

  const result = convertNotesToLyricLines(notes, lineBreakBeats, bpm, gap);

  // FALLBACK: If UltraStar parsing found no lines but content exists,
  // try to create simple lyric lines from non-header text.
  if (result.length === 0 && noteLineCount === 0 && lines.length > 0) {
    const fallbackLines = createFallbackLyrics(lines);
    if (fallbackLines.length > 0) {
      console.log('[SongLibrary] Using fallback lyric parser, lines:', fallbackLines.length);
      return fallbackLines;
    }
  }

  return result;
}

/**
 * Create simple LyricLine[] from non-header text lines when UltraStar parsing fails.
 * This allows displaying lyrics even without note timing data.
 * Each non-header text line becomes a lyric line with a small time offset.
 */
function createFallbackLyrics(lines: string[]): LyricLine[] {
  const lyricLines: LyricLine[] = [];
  let timeOffset = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    // Skip headers, control lines, and empty lines
    if (!trimmed || trimmed.startsWith('#') || trimmed === 'E' ||
        trimmed === 'P1' || trimmed === 'P2' || trimmed.startsWith('-')) {
      continue;
    }
    // Skip lines that look like UltraStar notes (even if regex didn't match)
    if (/^\s*[:*FGR]\s*-?\d+\s+\d+\s+-?\d+/.test(trimmed)) {
      continue;
    }

    const startTime = timeOffset;
    const endTime = timeOffset + 3000; // 3 seconds per line default
    timeOffset += 3500;

    lyricLines.push({
      id: `line-${lyricLines.length}`,
      text: trimmed,
      startTime,
      endTime,
      notes: [{
        id: `note-${lyricLines.length}-0`,
        pitch: 0,
        frequency: 261.63, // C4
        startTime,
        duration: 3000,
        lyric: trimmed,
        isBonus: false,
        isGolden: false,
      }],
    });
  }

  return lyricLines;
}
