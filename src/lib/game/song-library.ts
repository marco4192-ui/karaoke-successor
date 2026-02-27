// Song Library Store - Manages songs with persistent storage
import { Song } from '@/types/game';
import { sampleSongs } from '@/data/songs/songs';

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
