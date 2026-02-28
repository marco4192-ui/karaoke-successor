// Song Library Store - Manages songs with persistent storage
import { Song } from '@/types/game';
import { sampleSongs } from '@/data/songs/songs';
import { isTauri, getPlayableUrl } from '@/lib/tauri-file-storage';
import { 
  initDB, 
  storeMedia, 
  getMediaUrl, 
  storeSong, 
  getAllStoredSongs, 
  deleteSong as deleteStoredSong,
  StoredSong,
  isIndexedDBAvailable
} from '@/lib/song-storage';

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
let dbInitialized = false;

// Initialize IndexedDB on module load
async function ensureDB(): Promise<boolean> {
  if (dbInitialized) return true;
  try {
    await initDB();
    dbInitialized = true;
    return true;
  } catch (e) {
    console.error('Failed to initialize IndexedDB:', e);
    return false;
  }
}

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
  
  try {
    const stored = localStorage.getItem(CUSTOM_SONGS_KEY);
    if (stored) {
      customSongsCache = JSON.parse(stored);
      return customSongsCache || [];
    }
  } catch (e) {
    console.error('Failed to load custom songs:', e);
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
      dateAdded: Date.now(),
    };
    customSongs.push(newSong);
    saveCustomSongs(customSongs);
    
    // Update cache
    songCache = null; // Clear cache to force refresh
  }
}

// Add a song with media files (persists to IndexedDB)
export async function addSongWithMedia(
  songData: Omit<Song, 'id' | 'dateAdded'>,
  files: {
    audio?: File;
    video?: File;
    cover?: File;
  }
): Promise<Song> {
  const songId = `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  // Store media files in IndexedDB
  let audioMediaId: string | undefined;
  let videoMediaId: string | undefined;
  let coverMediaId: string | undefined;
  
  if (isIndexedDBAvailable()) {
    await ensureDB();
    
    if (files.audio) {
      audioMediaId = await storeMedia(files.audio, 'audio');
    }
    if (files.video) {
      videoMediaId = await storeMedia(files.video, 'video');
    }
    if (files.cover) {
      coverMediaId = await storeMedia(files.cover, 'cover');
    }
    
    // Store song metadata in IndexedDB
    const storedSong: StoredSong = {
      id: songId,
      title: songData.title,
      artist: songData.artist,
      album: songData.album,
      year: songData.year,
      genre: songData.genre,
      duration: songData.duration,
      bpm: songData.bpm,
      difficulty: songData.difficulty,
      rating: songData.rating,
      gap: songData.gap,
      start: songData.start,
      videoGap: songData.videoGap,
      lyrics: songData.lyrics,
      preview: songData.preview,
      dateAdded: Date.now(),
      audioMediaId,
      videoMediaId,
      coverMediaId,
      hasEmbeddedAudio: songData.hasEmbeddedAudio,
    };
    
    await storeSong(storedSong);
  }
  
  // Create song with blob URLs for immediate use
  const song: Song = {
    ...songData,
    id: songId,
    dateAdded: Date.now(),
    audioUrl: files.audio ? URL.createObjectURL(files.audio) : songData.audioUrl,
    videoBackground: files.video ? URL.createObjectURL(files.video) : songData.videoBackground,
    coverImage: files.cover ? URL.createObjectURL(files.cover) : songData.coverImage,
    // Store media IDs for later restoration
    audioMediaId,
    videoMediaId,
    coverMediaId,
  };
  
  // Also save to localStorage for backwards compatibility
  addSong(song);
  
  return song;
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
    localStorage.setItem(CUSTOM_SONGS_KEY, JSON.stringify(songs));
    customSongsCache = songs;
  } catch (e) {
    console.error('Failed to save custom songs:', e);
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

// Restore song URLs for browser - loads from IndexedDB
export async function restoreSongUrls(song: Song): Promise<Song> {
  // In Tauri, use the file system
  if (isTauri()) {
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
  
  // In browser, restore from IndexedDB using media IDs
  const restored = { ...song };
  
  // Check if song has media IDs stored
  const songWithMedia = song as Song & { 
    audioMediaId?: string; 
    videoMediaId?: string; 
    coverMediaId?: string;
  };
  
  if (isIndexedDBAvailable()) {
    await ensureDB();
    
    try {
      // Restore audio URL from IndexedDB
      if (songWithMedia.audioMediaId) {
        const url = await getMediaUrl(songWithMedia.audioMediaId);
        if (url) {
          restored.audioUrl = url;
          // Revoke old blob URL if it exists and is a blob
          if (song.audioUrl?.startsWith('blob:')) {
            URL.revokeObjectURL(song.audioUrl);
          }
        }
      }
      
      // Restore video URL from IndexedDB
      if (songWithMedia.videoMediaId) {
        const url = await getMediaUrl(songWithMedia.videoMediaId);
        if (url) {
          restored.videoBackground = url;
          if (song.videoBackground?.startsWith('blob:')) {
            URL.revokeObjectURL(song.videoBackground);
          }
        }
      }
      
      // Restore cover URL from IndexedDB
      if (songWithMedia.coverMediaId) {
        const url = await getMediaUrl(songWithMedia.coverMediaId);
        if (url) {
          restored.coverImage = url;
          if (song.coverImage?.startsWith('blob:')) {
            URL.revokeObjectURL(song.coverImage);
          }
        }
      }
    } catch (error) {
      console.error('Failed to restore song media from IndexedDB:', error);
    }
  }
  
  return restored;
}

// Get all songs asynchronously (with URL restoration)
export async function getAllSongsAsync(): Promise<Song[]> {
  const songs = getAllSongs();
  
  // Restore URLs for all songs that have media stored
  const restoredSongs = await Promise.all(
    songs.map(async (song) => {
      const songWithMedia = song as Song & { 
        audioMediaId?: string; 
        videoMediaId?: string; 
        coverMediaId?: string;
        relativeAudioPath?: string;
        relativeVideoPath?: string;
        relativeCoverPath?: string;
      };
      
      // Only restore if the song has media IDs or relative paths stored
      if (songWithMedia.audioMediaId || 
          songWithMedia.videoMediaId || 
          songWithMedia.coverMediaId ||
          songWithMedia.relativeAudioPath ||
          songWithMedia.relativeVideoPath ||
          songWithMedia.relativeCoverPath) {
        return restoreSongUrls(song);
      }
      return song;
    })
  );
  
  return restoredSongs;
}
