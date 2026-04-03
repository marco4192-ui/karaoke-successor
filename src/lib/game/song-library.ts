// Song Library Store - Manages songs with persistent storage
import { Song, LyricLine, Note, midiToFrequency } from '@/types/game';
import { sampleSongs } from '@/data/songs/songs';
import { isTauri, getPlayableUrl, getSongMediaUrl, clearBlobUrlCache } from '@/lib/tauri-file-storage';
import { getSongMediaUrls, storeMedia, hasMedia, getTxtContent } from '@/lib/db/media-db';

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

// Get all songs (sample + custom)
export function getAllSongs(): Song[] {
  if (songCache) return songCache;
  
  const customSongs = getCustomSongs();
  songCache = [...sampleSongs, ...customSongs];
  return songCache;
}

// Get custom/imported songs
export function getCustomSongs(): Song[] {
  if (customSongsCache) return customSongsCache;
  
  // Check if running in browser
  if (typeof window === 'undefined') {
    return [];
  }
  
  try {
    const stored = localStorage.getItem(CUSTOM_SONGS_KEY);
    if (stored) {
      let songs = JSON.parse(stored);
      
      // MIGRATION: Fix songs with hasEmbeddedAudio but incorrectly set audioUrl
      // If hasEmbeddedAudio is true and audioUrl is set, clear audioUrl
      // This was a bug in earlier versions where the video URL was incorrectly
      // assigned to audioUrl for videos with embedded audio
      let needsSave = false;
      songs = songs.map((song: Song) => {
        if (song.hasEmbeddedAudio && song.audioUrl) {
          needsSave = true;
          return { ...song, audioUrl: undefined };
        }
        return song;
      });
      
      if (needsSave) {
        try {
          localStorage.setItem(CUSTOM_SONGS_KEY, JSON.stringify(songs));
        } catch (e) {
          console.error('[SongLibrary] Failed to save migrated songs:', e);
        }
      }
      customSongsCache = songs;
      return customSongsCache || [];
    }
  } catch (e) {
    console.error('[SongLibrary] Failed to load custom songs:', e);
  }
  return [];
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

// Remove a song
export function removeSong(songId: string): void {
  let customSongs = getCustomSongs();
  customSongs = customSongs.filter(s => s.id !== songId);
  saveCustomSongs(customSongs);
  songCache = null;
}

// Save custom songs to localStorage
// IMPORTANT: We store relative paths, not blob URLs
// Audio/Video/Cover are loaded from filesystem using relative paths
// TXT content is cached in IndexedDB for fast lyrics loading
function saveCustomSongs(songs: Song[]): void {
  try {
    // Create minimal versions for localStorage
    const minimalSongs = songs.map(s => {
      return {
        ...s,
        // Keep the storedTxt flag so we know TXT is cached in IndexedDB
        storedTxt: s.storedTxt,
        storedMedia: false, // We don't store large media in IndexedDB anymore
        // Important: Store baseFolder for loading media from filesystem
        baseFolder: s.baseFolder,
        // Remove blob URLs that don't persist across sessions
        audioUrl: s.audioUrl && !s.audioUrl.startsWith('blob:') ? s.audioUrl : undefined,
        videoBackground: s.videoBackground && !s.videoBackground.startsWith('blob:') ? s.videoBackground : undefined,
        coverImage: s.coverImage && !s.coverImage.startsWith('blob:') ? s.coverImage : undefined,
        // Remove lyrics - they will be loaded on-demand from IndexedDB or file system
        lyrics: [],
        // Keep relative paths for loading from filesystem
        relativeAudioPath: s.relativeAudioPath,
        relativeVideoPath: s.relativeVideoPath,
        relativeCoverPath: s.relativeCoverPath,
        relativeTxtPath: s.relativeTxtPath,
      };
    });
    localStorage.setItem(CUSTOM_SONGS_KEY, JSON.stringify(minimalSongs));
    customSongsCache = minimalSongs;
  } catch (e) {
    console.error('[SongLibrary] Failed to save custom songs:', e);
    // Try even more minimal save
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
        baseFolder: s.baseFolder, // Store base songs folder for media loading
        // Relative paths for loading from filesystem
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
      console.error('[SongLibrary] Failed to save even ultra-minimal data:', e2);
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
export function searchSongs(query: string): Song[] {
  const songs = getAllSongs();
  if (!query) return songs;
  
  const lowerQuery = query.toLowerCase();
  return songs.filter(song =>
    song.title.toLowerCase().includes(lowerQuery) ||
    song.artist.toLowerCase().includes(lowerQuery) ||
    song.genre?.toLowerCase().includes(lowerQuery) ||
    song.album?.toLowerCase().includes(lowerQuery)
  );
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
  
  // If TXT is stored in IndexedDB, load lyrics
  if (restoredSong.storedTxt) {
    console.log('[SongLibrary] getSongByIdWithLyrics: Loading lyrics from IndexedDB for', id);
    const lyrics = await loadSongLyrics(restoredSong);
    if (lyrics.length > 0) {
      console.log('[SongLibrary] getSongByIdWithLyrics: Loaded', lyrics.length, 'lyric lines');
      return { ...restoredSong, lyrics };
    } else {
      console.warn('[SongLibrary] getSongByIdWithLyrics: Failed to load lyrics from IndexedDB');
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
  localStorage.removeItem(CUSTOM_SONGS_KEY);
  customSongsCache = [];
  songCache = null;
  // Clear blob URL cache in Tauri to force fresh loads
  if (isTauri()) {
    clearBlobUrlCache();
  }
}

// Reload library - clear cache and force fresh load from localStorage
export function reloadLibrary(): Song[] {
  songCache = null;
  customSongsCache = null;
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
  // 1. Priority: song's own baseFolder (stored when scanned)
  // 2. Fallback: localStorage 'karaoke-songs-folder'
  const baseFolder = song.baseFolder || localStorage.getItem('karaoke-songs-folder') || undefined;
  
  if (!baseFolder) {
    console.warn('[SongLibrary] No base folder available for song:', song.title);
    return song;
  }
  
  try {
    // Restore audio URL from songs folder - only if missing
    if (song.relativeAudioPath && !song.audioUrl) {
      console.log('[SongLibrary] Restoring audio URL:', song.relativeAudioPath, 'from baseFolder:', baseFolder);
      const url = await getSongMediaUrl(song.relativeAudioPath, baseFolder);
      if (url) {
        restored.audioUrl = url;
        console.log('[SongLibrary] Restored audio URL for', song.title, ':', url.substring(0, 50) + '...');
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
        console.log('[SongLibrary] Restored video URL for', song.title, ':', url.substring(0, 50) + '...');
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
        console.log('[SongLibrary] Restored cover URL for', song.title, ':', url.substring(0, 50) + '...');
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
  }
  
  if (isTauri()) {
    console.log('[SongLibrary] Running in Tauri mode, restoring URLs for songs with relative paths');
    // In Tauri, restore URLs for all songs that have relative paths with missing URLs
    const restoredSongs = await Promise.all(
      songs.map(async (song) => {
        // Check if ANY URL needs to be restored (not just all of them)
        const hasRelativePaths = song.relativeAudioPath || song.relativeVideoPath || song.relativeCoverPath;
        const needsAudioRestore = song.relativeAudioPath && !song.audioUrl;
        const needsVideoRestore = song.relativeVideoPath && !song.videoBackground;
        const needsCoverRestore = song.relativeCoverPath && !song.coverImage;
        
        if (hasRelativePaths && (needsAudioRestore || needsVideoRestore || needsCoverRestore)) {
          console.log(`[SongLibrary] Restoring URLs for song: ${song.title}`, {
            relativeAudioPath: song.relativeAudioPath,
            relativeVideoPath: song.relativeVideoPath,
            relativeCoverPath: song.relativeCoverPath,
            baseFolder: song.baseFolder,
            needsAudioRestore,
            needsVideoRestore,
            needsCoverRestore,
          });
          const restored = await restoreSongUrls(song);
          console.log(`[SongLibrary] Restored URLs for ${song.title}:`, {
            audioUrl: restored.audioUrl ? 'set' : 'not set',
            videoBackground: restored.videoBackground ? 'set' : 'not set',
            coverImage: restored.coverImage ? 'set' : 'not set',
          });
          return restored;
        }
        return song;
      })
    );
    return restoredSongs;
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
  
  // Strategy 2: Load directly from file system in Tauri (if relativeTxtPath is set)
  // This is now the PRIMARY fallback when IndexedDB fails or storedTxt is false
  if (song.relativeTxtPath && typeof window !== 'undefined' && '__TAURI__' in window) {
    try {
      console.log('[SongLibrary] Attempting to load TXT from file system:', song.relativeTxtPath);
      const { readTextFile } = await import('@tauri-apps/plugin-fs');
      
      // Use song.baseFolder as primary source, fallback to localStorage
      const songsFolder = song.baseFolder || localStorage.getItem('karaoke-songs-folder');
      
      if (songsFolder) {
        const filePath = `${songsFolder}/${song.relativeTxtPath}`;
        console.log('[SongLibrary] Loading from path:', filePath);
        
        const txtContent = await readTextFile(filePath);
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
// - Trailing space in lyric = end of word (space is displayed)
// - No trailing space = syllable connected to next note
function parseUltraStarTxtContent(content: string, gap: number, bpm: number): LyricLine[] {
  // DON'T trim lines! Trailing spaces in lyrics are significant for word boundaries.
  // Only filter out completely empty lines (after trimming for the check)
  const lines = content.split('\n').filter(l => l.trim().length > 0);
  const notes: Array<{ type: string; startBeat: number; duration: number; pitch: number; lyric: string; player?: 'P1' | 'P2' }> = [];
  const lineBreakBeats = new Set<number>();
  
  let currentPlayer: 'P1' | 'P2' | undefined = undefined;
  
  for (const line of lines) {
    // Use trimmed version for header/marker parsing (these should be trimmed)
    const trimmedLine = line.trim();
    
    // Check for player markers
    if (trimmedLine === 'P1' || trimmedLine === 'P1:') {
      currentPlayer = 'P1';
      continue;
    }
    if (trimmedLine === 'P2' || trimmedLine === 'P2:') {
      currentPlayer = 'P2';
      continue;
    }
    
    // Skip headers (use trimmed version)
    if (trimmedLine.startsWith('#')) continue;
    if (trimmedLine === 'E') break;
    
    // Line break (use trimmed version for matching)
    if (trimmedLine.startsWith('-')) {
      const lineBreakMatch = trimmedLine.match(/^-\s*(-?\d+)/);
      if (lineBreakMatch) {
        lineBreakBeats.add(parseInt(lineBreakMatch[1]));
      }
      continue;
    }
    
    // Check for P1/P2 prefix in note line
    const duetPrefixMatch = line.match(/^(P1|P2):\s*(.*)$/);
    let noteLine = line;
    let notePlayer: 'P1' | 'P2' | undefined = currentPlayer;
    
    if (duetPrefixMatch) {
      notePlayer = duetPrefixMatch[1] as 'P1' | 'P2';
      noteLine = duetPrefixMatch[2];
    }
    
    // Parse note - use original note line for matching to preserve trailing spaces in lyric
    // The regex handles leading whitespace with \s* at the start
    const noteMatch = noteLine.match(/^\s*([:*FGR])\s*(-?\d+)\s+(\d+)\s+(-?\d+)\s*(.*)$/);
    if (noteMatch) {
      const [, type, startStr, durationStr, pitchStr, lyric] = noteMatch;
      notes.push({
        type,
        startBeat: parseInt(startStr),
        duration: parseInt(durationStr),
        pitch: parseInt(pitchStr),
        // Preserve trailing spaces for syllable detection - trailing space = word boundary
        lyric: lyric,
        player: notePlayer,
      });
    }
  }
  
  // Convert to LyricLines
  const beatDuration = 15000 / bpm;
  const MIDI_BASE_OFFSET = 48;
  const lyricLines: LyricLine[] = [];
  let currentLineNotes: Note[] = [];
  let currentLineText = '';
  let currentLinePlayer: 'P1' | 'P2' | 'both' | undefined = undefined;
  
  const sortedNotes = [...notes].sort((a, b) => a.startBeat - b.startBeat);
  
  for (let i = 0; i < sortedNotes.length; i++) {
    const note = sortedNotes[i];
    const noteEndBeat = note.startBeat + note.duration;
    const startTime = gap + (note.startBeat * beatDuration);
    const duration = note.duration * beatDuration;
    
    // Skip hyphen separators - they indicate line breaks but should NOT be removed from text
    if (note.lyric === '-' || (note.lyric.trim() === '-' && note.lyric.length <= 2)) {
      if (currentLineNotes.length > 0) {
        const lineStartTime = currentLineNotes[0].startTime;
        const lineEndTime = currentLineNotes[currentLineNotes.length - 1].startTime + currentLineNotes[currentLineNotes.length - 1].duration;
        // Keep the line text as-is, including trailing spaces
        // Only remove leading whitespace for display
        let finalLineText = currentLineText.replace(/^\s+/, '');
        
        if (finalLineText) {
          lyricLines.push({
            id: `line-${lyricLines.length}`,
            text: finalLineText,
            startTime: lineStartTime,
            endTime: lineEndTime,
            notes: currentLineNotes,
            player: currentLinePlayer,
          });
        }
        currentLineNotes = [];
        currentLineText = '';
        currentLinePlayer = undefined;
      }
      continue;
    }
    
    const convertedNote: Note = {
      id: `note-${lyricLines.length}-${currentLineNotes.length}`,
      pitch: note.pitch + MIDI_BASE_OFFSET,
      frequency: midiToFrequency(note.pitch + MIDI_BASE_OFFSET),
      startTime: Math.round(startTime),
      duration: Math.round(duration),
      lyric: note.lyric,
      isBonus: note.type === 'F',
      isGolden: note.type === '*' || note.type === 'G',
      player: note.player,
    };
    
    currentLineNotes.push(convertedNote);
    currentLineText += note.lyric;
    
    if (currentLinePlayer === undefined) {
      currentLinePlayer = note.player;
    } else if (currentLinePlayer !== note.player && note.player !== undefined) {
      currentLinePlayer = 'both';
    }
    
    // Check for line break
    const isLineBreak = lineBreakBeats.has(noteEndBeat) ||
      (i < sortedNotes.length - 1 && sortedNotes[i + 1].startBeat - noteEndBeat >= 8);
    
    if ((isLineBreak || i === sortedNotes.length - 1) && currentLineNotes.length > 0) {
      const lineStartTime = currentLineNotes[0].startTime;
      const lineEndTime = currentLineNotes[currentLineNotes.length - 1].startTime + currentLineNotes[currentLineNotes.length - 1].duration;
      // Keep the line text as-is, including trailing spaces
      // Only remove leading whitespace for display
      let finalLineText = currentLineText.replace(/^\s+/, '');
      
      if (finalLineText) {
        lyricLines.push({
          id: `line-${lyricLines.length}`,
          text: finalLineText,
          startTime: lineStartTime,
          endTime: lineEndTime,
          notes: currentLineNotes,
          player: currentLinePlayer,
        });
      }
      currentLineNotes = [];
      currentLineText = '';
      currentLinePlayer = undefined;
    }
  }
  
  return lyricLines;
}
