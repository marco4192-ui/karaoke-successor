import { Playlist, PlaylistFolder, PlaylistExport, SYSTEM_PLAYLISTS, DEFAULT_PLAYLIST_SETTINGS, Song } from '@/types/game';
// IDs use crypto.randomUUID() for collision-free 128-bit random IDs

// Re-export types for convenience
export type { Playlist, PlaylistFolder, PlaylistExport } from '@/types/game';

const STORAGE_KEY = 'karaoke-playlists';
const PLAY_COUNTS_KEY = 'karaoke-song-play-counts';

// ============ PLAY COUNT TRACKING ============

/** Load play counts from localStorage. */
function getPlayCounts(): Record<string, number> {
  if (typeof window === 'undefined') return {};
  try {
    const stored = localStorage.getItem(PLAY_COUNTS_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

/** Persist play counts to localStorage. */
function savePlayCounts(counts: Record<string, number>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PLAY_COUNTS_KEY, JSON.stringify(counts));
  } catch (e) {
    console.error('Failed to save play counts:', e);
  }
}

// Get all playlists from storage
export function getPlaylists(): Playlist[] {
  if (typeof window === 'undefined') return getDefaultPlaylists();
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (!Array.isArray(parsed)) {
        throw new Error('Expected array, got ' + typeof parsed);
      }
      return parsed;
    }
  } catch (e) {
    console.error('Failed to load playlists — resetting to defaults:', e);
    // Corrupt data — remove and recreate defaults
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch { /* ignore */ }
  }
  
  // Return default playlists if none exist or data was corrupt
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
    throw e;
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
    id: crypto.randomUUID(),
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


export function getPlaylistById(id: string): Playlist | null {
  const playlists = getPlaylists();
  return playlists.find(p => p.id === id) || null;
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
  
  // Update Most Played — track actual play counts and sort by count descending
  const mostPlayedPlaylist = playlists.find(p => p.id === SYSTEM_PLAYLISTS.MOST_PLAYED);
  if (mostPlayedPlaylist) {
    const counts = getPlayCounts();
    counts[songId] = (counts[songId] || 0) + 1;
    savePlayCounts(counts);

    // Collect all unique song IDs with their counts (existing + current)
    const countMap = new Map<string, number>();
    const existingIds = [...mostPlayedPlaylist.songIds];
    for (const id of existingIds) {
      countMap.set(id, counts[id] || 0);
    }
    countMap.set(songId, counts[songId]);

    // Sort by play count descending, then by recency (existing order = more recent first)
    // Use a Map for O(1) index lookup instead of O(n) indexOf per comparison
    const recencyMap = new Map(existingIds.map((id, idx) => [id, idx]));
    mostPlayedPlaylist.songIds = [...countMap.keys()]
      .sort((a, b) => {
        const countDiff = (countMap.get(b) || 0) - (countMap.get(a) || 0);
        if (countDiff !== 0) return countDiff;
        // Tiebreaker: more recently played (earlier in existing list) first
        return (recencyMap.get(a) ?? 0) - (recencyMap.get(b) ?? 0);
      })
      .slice(0, 100);
    mostPlayedPlaylist.updatedAt = now;
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

// Get playlist songs (full song objects) - requires songs to be passed in
export function getPlaylistSongs(playlistId: string, allSongs: Song[]): Song[] {
  const playlist = getPlaylistById(playlistId);
  if (!playlist) return [];
  
  const songMap = new Map(allSongs.map(s => [s.id, s]));
  
  return playlist.songIds
    .map(id => songMap.get(id))
    .filter((s): s is Song => s !== undefined);
}

// ============ PLAYLIST IMPORT / EXPORT ============

/** Export a playlist as a JSON-serializable object. */
export function exportPlaylist(playlistId: string): PlaylistExport | null {
  const playlist = getPlaylistById(playlistId);
  if (!playlist) return null;

  const payload: PlaylistExport = {
    version: 1,
    exportedAt: Date.now(),
    playlist: {
      name: playlist.name,
      description: playlist.description,
      songIds: playlist.songIds,
      tags: playlist.tags,
    },
  };
  return payload;
}

/** Import a playlist from a PlaylistExport JSON object. Returns the new playlist or null on failure. */
export function importPlaylist(data: PlaylistExport): Playlist | null {
  if (!data || data.version !== 1 || !data.playlist?.name) return null;

  const created = createPlaylist(data.playlist.name, data.playlist.description);
  if (!created) return null;

  // If tags were exported, update them
  if (data.playlist.tags?.length) {
    updatePlaylist(created.id, { tags: data.playlist.tags });
  }

  // If song IDs are provided, add them one by one (skipping duplicates automatically)
  if (data.playlist.songIds?.length) {
    for (const songId of data.playlist.songIds) {
      addSongToPlaylist(created.id, songId);
    }
  }

  return getPlaylistById(created.id);
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
