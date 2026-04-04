// Playlist Manager - CRUD operations for user playlists
import { Playlist, PlaylistFolder, PlaylistExport, SYSTEM_PLAYLISTS, DEFAULT_PLAYLIST_SETTINGS, Song } from '@/types/game';

// Re-export types for convenience
export type { Playlist, PlaylistFolder, PlaylistExport } from '@/types/game';

const STORAGE_KEY = 'karaoke-playlists';
const FOLDERS_KEY = 'karaoke-playlist-folders';

// Generate unique ID
function generateId(): string {
  return `playlist-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

// Get all playlists from storage
export function getPlaylists(): Playlist[] {
  if (typeof window === 'undefined') return getDefaultPlaylists();
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load playlists:', e);
  }
  
  // Return default playlists if none exist
  return getDefaultPlaylists();
}

// Get default system playlists
function getDefaultPlaylists(): Playlist[] {
  const now = Date.now();
  return [
    {
      id: SYSTEM_PLAYLISTS.FAVORITES,
      name: '⭐ Favorites',
      description: 'Your favorite songs',
      songIds: [],
      createdAt: now,
      updatedAt: now,
      isSystem: true,
    },
    {
      id: SYSTEM_PLAYLISTS.RECENTLY_PLAYED,
      name: '🕐 Recently Played',
      description: 'Songs you played recently',
      songIds: [],
      createdAt: now,
      updatedAt: now,
      isSystem: true,
    },
    {
      id: SYSTEM_PLAYLISTS.MOST_PLAYED,
      name: '🔥 Most Played',
      description: 'Your most played songs',
      songIds: [],
      createdAt: now,
      updatedAt: now,
      isSystem: true,
    },
  ];
}

// Save playlists to storage
function savePlaylists(playlists: Playlist[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(playlists));
  } catch (e) {
    console.error('Failed to save playlists:', e);
  }
}

// Create a new playlist
export function createPlaylist(name: string, description?: string): Playlist {
  const playlists = getPlaylists();
  
  if (playlists.length >= DEFAULT_PLAYLIST_SETTINGS.maxPlaylists) {
    throw new Error(`Maximum number of playlists (${DEFAULT_PLAYLIST_SETTINGS.maxPlaylists}) reached`);
  }
  
  const now = Date.now();
  const playlist: Playlist = {
    id: generateId(),
    name: name.trim(),
    description: description?.trim(),
    songIds: [],
    createdAt: now,
    updatedAt: now,
    playCount: 0,
  };
  
  playlists.push(playlist);
  savePlaylists(playlists);
  
  return playlist;
}

// Update a playlist
export function updatePlaylist(id: string, updates: Partial<Pick<Playlist, 'name' | 'description' | 'coverImage' | 'tags'>>): Playlist | null {
  const playlists = getPlaylists();
  const index = playlists.findIndex(p => p.id === id);
  
  if (index === -1) return null;
  
  const playlist = playlists[index];
  
  // Don't allow renaming system playlists
  if (playlist.isSystem && updates.name) {
    delete updates.name;
  }
  
  playlists[index] = {
    ...playlist,
    ...updates,
    updatedAt: Date.now(),
  };
  
  savePlaylists(playlists);
  return playlists[index];
}

// Delete a playlist
export function deletePlaylist(id: string): boolean {
  const playlists = getPlaylists();
  const index = playlists.findIndex(p => p.id === id);
  
  if (index === -1) return false;
  
  // Don't allow deleting system playlists
  if (playlists[index].isSystem) {
    return false;
  }
  
  playlists.splice(index, 1);
  savePlaylists(playlists);
  return true;
}

// Add song to playlist
export function addSongToPlaylist(playlistId: string, songId: string): boolean {
  const playlists = getPlaylists();
  const playlist = playlists.find(p => p.id === playlistId);
  
  if (!playlist) return false;
  
  if (playlist.songIds.length >= DEFAULT_PLAYLIST_SETTINGS.maxSongsPerPlaylist) {
    throw new Error(`Maximum songs per playlist (${DEFAULT_PLAYLIST_SETTINGS.maxSongsPerPlaylist}) reached`);
  }
  
  // Don't add duplicates
  if (playlist.songIds.includes(songId)) {
    return false;
  }
  
  playlist.songIds.push(songId);
  playlist.updatedAt = Date.now();
  
  savePlaylists(playlists);
  return true;
}

// Remove song from playlist
export function removeSongFromPlaylist(playlistId: string, songId: string): boolean {
  const playlists = getPlaylists();
  const playlist = playlists.find(p => p.id === playlistId);
  
  if (!playlist) return false;
  
  const index = playlist.songIds.indexOf(songId);
  if (index === -1) return false;
  
  playlist.songIds.splice(index, 1);
  playlist.updatedAt = Date.now();
  
  savePlaylists(playlists);
  return true;
}

// Reorder songs in playlist
export function reorderPlaylistSongs(playlistId: string, fromIndex: number, toIndex: number): boolean {
  const playlists = getPlaylists();
  const playlist = playlists.find(p => p.id === playlistId);
  
  if (!playlist) return false;
  if (fromIndex < 0 || fromIndex >= playlist.songIds.length) return false;
  if (toIndex < 0 || toIndex >= playlist.songIds.length) return false;
  
  const [songId] = playlist.songIds.splice(fromIndex, 1);
  playlist.songIds.splice(toIndex, 0, songId);
  playlist.updatedAt = Date.now();
  
  savePlaylists(playlists);
  return true;
}

// Move all songs from one playlist to another
export function moveAllSongs(sourceId: string, targetId: string): boolean {
  const playlists = getPlaylists();
  const source = playlists.find(p => p.id === sourceId);
  const target = playlists.find(p => p.id === targetId);
  
  if (!source || !target) return false;
  
  // Add songs that aren't already in target
  for (const songId of source.songIds) {
    if (!target.songIds.includes(songId)) {
      target.songIds.push(songId);
    }
  }
  
  source.songIds = [];
  source.updatedAt = Date.now();
  target.updatedAt = Date.now();
  
  savePlaylists(playlists);
  return true;
}

// Get playlist by ID
export function getPlaylistById(id: string): Playlist | null {
  const playlists = getPlaylists();
  return playlists.find(p => p.id === id) || null;
}

// Check if song is in playlist
export function isSongInPlaylist(playlistId: string, songId: string): boolean {
  const playlist = getPlaylistById(playlistId);
  return playlist?.songIds.includes(songId) || false;
}

// Get all playlists containing a song
export function getPlaylistsContainingSong(songId: string): Playlist[] {
  const playlists = getPlaylists();
  return playlists.filter(p => p.songIds.includes(songId));
}

// Export playlist
export function exportPlaylist(id: string): PlaylistExport | null {
  const playlist = getPlaylistById(id);
  if (!playlist) return null;
  
  return {
    version: 1,
    exportedAt: Date.now(),
    playlist: {
      name: playlist.name,
      description: playlist.description,
      songIds: playlist.songIds,
      tags: playlist.tags,
    },
  };
}

// Import playlist
export function importPlaylist(data: PlaylistExport): Playlist | null {
  try {
    const playlist = createPlaylist(data.playlist.name, data.playlist.description);
    
    // Add songs
    for (const songId of data.playlist.songIds) {
      addSongToPlaylist(playlist.id, songId);
    }
    
    // Add tags
    if (data.playlist.tags) {
      updatePlaylist(playlist.id, { tags: data.playlist.tags });
    }
    
    return getPlaylistById(playlist.id);
  } catch (e) {
    console.error('Failed to import playlist:', e);
    return null;
  }
}

// Record song play (for Recently Played and Most Played)
export function recordSongPlay(songId: string): void {
  const playlists = getPlaylists();
  const now = Date.now();
  
  // Update Recently Played
  const recentPlaylist = playlists.find(p => p.id === SYSTEM_PLAYLISTS.RECENTLY_PLAYED);
  if (recentPlaylist) {
    // Remove if already in list
    const index = recentPlaylist.songIds.indexOf(songId);
    if (index !== -1) {
      recentPlaylist.songIds.splice(index, 1);
    }
    // Add to front
    recentPlaylist.songIds.unshift(songId);
    // Keep only last 50 songs
    if (recentPlaylist.songIds.length > 50) {
      recentPlaylist.songIds = recentPlaylist.songIds.slice(0, 50);
    }
    recentPlaylist.updatedAt = now;
  }
  
  savePlaylists(playlists);
}

// Toggle favorite
export function toggleFavorite(songId: string): boolean {
  const playlists = getPlaylists();
  const favorites = playlists.find(p => p.id === SYSTEM_PLAYLISTS.FAVORITES);
  
  if (!favorites) return false;
  
  const index = favorites.songIds.indexOf(songId);
  if (index === -1) {
    favorites.songIds.push(songId);
  } else {
    favorites.songIds.splice(index, 1);
  }
  
  favorites.updatedAt = Date.now();
  savePlaylists(playlists);
  
  return index === -1; // Returns true if added, false if removed
}

// Check if song is favorite
export function isFavorite(songId: string): boolean {
  const playlists = getPlaylists();
  const favorites = playlists.find(p => p.id === SYSTEM_PLAYLISTS.FAVORITES);
  return favorites?.songIds.includes(songId) || false;
}

// Get playlist songs (full song objects) - requires songs to be passed in
export function getPlaylistSongs(playlistId: string, allSongs: Song[]): Song[] {
  const playlist = getPlaylistById(playlistId);
  if (!playlist) return [];
  
  const songMap = new Map(allSongs.map(s => [s.id, s]));
  
  return playlist.songIds
    .map(id => songMap.get(id))
    .filter((s): s is Song => s !== undefined);
}

// Calculate playlist duration - requires songs to be passed in
export function calculatePlaylistDuration(playlistId: string, allSongs: Song[]): number {
  const songs = getPlaylistSongs(playlistId, allSongs);
  return songs.reduce((sum, song) => sum + song.duration, 0);
}

// Increment play count
export function incrementPlaylistPlayCount(playlistId: string): void {
  const playlists = getPlaylists();
  const playlist = playlists.find(p => p.id === playlistId);
  
  if (playlist) {
    playlist.playCount = (playlist.playCount || 0) + 1;
    playlist.updatedAt = Date.now();
    savePlaylists(playlists);
  }
}

// ============ FOLDER MANAGEMENT ============

export function getFolders(): PlaylistFolder[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(FOLDERS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load folders:', e);
  }
  return [];
}

function saveFolders(folders: PlaylistFolder[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(FOLDERS_KEY, JSON.stringify(folders));
  } catch (e) {
    console.error('Failed to save folders:', e);
  }
}

export function createFolder(name: string): PlaylistFolder {
  const folders = getFolders();
  
  if (folders.length >= DEFAULT_PLAYLIST_SETTINGS.maxFolders) {
    throw new Error(`Maximum number of folders (${DEFAULT_PLAYLIST_SETTINGS.maxFolders}) reached`);
  }
  
  const folder: PlaylistFolder = {
    id: `folder-${Date.now()}`,
    name: name.trim(),
    playlistIds: [],
    createdAt: Date.now(),
  };
  
  folders.push(folder);
  saveFolders(folders);
  
  return folder;
}

export function deleteFolder(id: string): boolean {
  const folders = getFolders();
  const index = folders.findIndex(f => f.id === id);
  
  if (index === -1) return false;
  
  folders.splice(index, 1);
  saveFolders(folders);
  return true;
}

export function addPlaylistToFolder(folderId: string, playlistId: string): boolean {
  const folders = getFolders();
  const folder = folders.find(f => f.id === folderId);
  
  if (!folder) return false;
  if (folder.playlistIds.includes(playlistId)) return false;
  
  folder.playlistIds.push(playlistId);
  saveFolders(folders);
  return true;
}

export function removePlaylistFromFolder(folderId: string, playlistId: string): boolean {
  const folders = getFolders();
  const folder = folders.find(f => f.id === folderId);
  
  if (!folder) return false;
  
  const index = folder.playlistIds.indexOf(playlistId);
  if (index === -1) return false;
  
  folder.playlistIds.splice(index, 1);
  saveFolders(folders);
  return true;
}

export function renameFolder(id: string, name: string): boolean {
  const folders = getFolders();
  const folder = folders.find(f => f.id === id);
  
  if (!folder) return false;
  
  folder.name = name.trim();
  saveFolders(folders);
  return true;
}

// Initialize playlists (call on app start)
export function initializePlaylists(): void {
  if (typeof window === 'undefined') return;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    // Create default playlists
    savePlaylists(getDefaultPlaylists());
  }
}
