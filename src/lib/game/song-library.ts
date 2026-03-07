// Song Library Store - Manages songs with persistent storage
import { Song } from '@/types/game';
import { sampleSongs } from '@/data/songs/songs';
import { isTauri, getPlayableUrl } from '@/lib/tauri-file-storage';
import { getSongMediaUrls, storeMedia, hasMedia } from '@/lib/db/media-db';

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
      const songs = JSON.parse(stored);
      // Validate that it's an array
      if (!Array.isArray(songs)) {
        console.error('[SongLibrary] Invalid songs data - not an array, resetting');
        localStorage.removeItem(CUSTOM_SONGS_KEY);
        return [];
      }
      // Validate each song has required fields
      const validSongs = songs.filter((s: unknown) => {
        if (typeof s !== 'object' || s === null) return false;
        const song = s as Partial<Song>;
        return song.id && song.title && song.artist;
      });
      
      if (validSongs.length !== songs.length) {
        console.warn(`[SongLibrary] Filtered out ${songs.length - validSongs.length} invalid songs`);
        // Save the filtered valid songs
        saveCustomSongs(validSongs);
      }
      
      console.log(`[SongLibrary] Loaded ${validSongs.length} custom songs from localStorage`);
      customSongsCache = validSongs;
      return customSongsCache || [];
    } else {
      console.log('[SongLibrary] No custom songs found in localStorage');
    }
  } catch (e) {
    console.error('[SongLibrary] Failed to load custom songs:', e);
    // Try to recover by clearing corrupted data
    try {
      localStorage.removeItem(CUSTOM_SONGS_KEY);
      console.log('[SongLibrary] Cleared corrupted songs data');
    } catch {
      // Ignore cleanup errors
    }
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
      id: song.id || `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
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
        id: song.id || `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
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
function saveCustomSongs(songs: Song[]): void {
  try {
    const songsJson = JSON.stringify(songs);
    const sizeInMB = (songsJson.length / (1024 * 1024)).toFixed(2);
    console.log(`[SongLibrary] Saving ${songs.length} songs (${sizeInMB} MB)`);
    localStorage.setItem(CUSTOM_SONGS_KEY, songsJson);
    customSongsCache = songs;
    console.log(`[SongLibrary] Successfully saved songs to localStorage`);
  } catch (e) {
    console.error('[SongLibrary] Failed to save custom songs:', e);
    // Try to save without large data
    try {
      const minimalSongs = songs.map(s => ({
        ...s,
        audioUrl: undefined,  // Remove blob URLs that don't persist
        videoBackground: undefined,
        coverImage: s.coverImage && !s.coverImage.startsWith('blob:') ? s.coverImage : undefined,
      }));
      localStorage.setItem(CUSTOM_SONGS_KEY, JSON.stringify(minimalSongs));
      console.log('[SongLibrary] Saved minimal song data (without blob URLs)');
    } catch (e2) {
      console.error('[SongLibrary] Failed to save even minimal data:', e2);
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
}

// Reload library - clear cache and force fresh load from localStorage
export function reloadLibrary(): Song[] {
  songCache = null;
  customSongsCache = null;
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
      id: song.id || `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    });
  }
  
  saveCustomSongs(customSongs);
  songCache = null;
}

// Restore song URLs for Tauri - converts relative paths back to playable URLs
export async function restoreSongUrls(song: Song): Promise<Song> {
  if (!isTauri()) {
    // In browser mode, URLs should already be valid
    return song;
  }
  
  const restored = { ...song };
  
  try {
    // Restore audio URL
    if (song.relativeAudioPath) {
      const url = await getPlayableUrl(song.relativeAudioPath);
      if (url) restored.audioUrl = url;
    }
    
    // Restore video URL
    if (song.relativeVideoPath) {
      const url = await getPlayableUrl(song.relativeVideoPath);
      if (url) restored.videoBackground = url;
    }
    
    // Restore cover URL
    if (song.relativeCoverPath) {
      const url = await getPlayableUrl(song.relativeCoverPath);
      if (url) restored.coverImage = url;
    }
  } catch (error) {
    console.error('Failed to restore song URLs:', error);
  }
  
  return restored;
}

// Get all songs asynchronously (with URL restoration for Tauri and IndexedDB for browser)
export async function getAllSongsAsync(): Promise<Song[]> {
  const songs = getAllSongs();
  
  if (isTauri()) {
    // In Tauri, restore URLs for all songs that have relative paths
    const restoredSongs = await Promise.all(
      songs.map(song => {
        // Only restore if the song has relative paths stored
        if (song.relativeAudioPath || song.relativeVideoPath || song.relativeCoverPath) {
          return restoreSongUrls(song);
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
