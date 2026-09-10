import { Playlist, PlaylistExport, SYSTEM_PLAYLISTS, DEFAULT_PLAYLIST_SETTINGS, Song } from '@/types/game';
import { StorageKeys, getItem, getJson, setJson, removeItem } from '@/lib/storage';
import { t } from '@/lib/i18n/translations';
// IDs use crypto.randomUUID() for collision-free 128-bit random IDs

// Re-export types for convenience
export type { Playlist, PlaylistExport } from '@/types/game';

const STORAGE_KEY = StorageKeys.PLAYLISTS;
const PLAY_COUNTS_KEY = StorageKeys.SONG_PLAY_COUNTS;

// ============ PLAY COUNT TRACKING ============

/** Load play counts from localStorage. */
function getPlayCounts(): Record<string, number> {
  return getJson<Record<string, number>>(PLAY_COUNTS_KEY, {});
}

/** Persist play counts to localStorage. */
function savePlayCounts(counts: Record<string, number>): void {
  setJson(PLAY_COUNTS_KEY, counts);
}

// Get all playlists from storage
export function getPlaylists(): Playlist[] {
  const stored = getItem(STORAGE_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (!Array.isArray(parsed)) {
        throw new Error('Expected array, got ' + typeof parsed);
      }
      return parsed;
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Failed to load playlists — resetting to defaults:', e);
      // Corrupt data — remove and recreate defaults
      removeItem(STORAGE_KEY);
    }
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
      nameKey: 'library.playlists.favorites',
      description: 'Your favorite songs',
      descriptionKey: 'library.playlists.favoritesDesc',
      songIds: [],
      createdAt: now,
      updatedAt: now,
      isSystem: true,
    },
    {
      id: SYSTEM_PLAYLISTS.RECENTLY_PLAYED,
      name: '🕐 Recently Played',
      nameKey: 'library.playlists.recentlyPlayed',
      description: 'Songs you played recently',
      descriptionKey: 'library.playlists.recentlyPlayedDesc',
      songIds: [],
      createdAt: now,
      updatedAt: now,
      isSystem: true,
    },
    {
      id: SYSTEM_PLAYLISTS.MOST_PLAYED,
      name: '🔥 Most Played',
      nameKey: 'library.playlists.mostPlayed',
      description: 'Your most played songs',
      descriptionKey: 'library.playlists.mostPlayedDesc',
      songIds: [],
      createdAt: now,
      updatedAt: now,
      isSystem: true,
    },
  ];
}

// Save playlists to storage
function savePlaylists(playlists: Playlist[]): void {
  setJson(STORAGE_KEY, playlists);
}

// Create a new playlist
export function createPlaylist(name: string, description?: string): Playlist {
  const playlists = getPlaylists();
  
  if (playlists.length >= DEFAULT_PLAYLIST_SETTINGS.maxPlaylists) {
    throw new Error(t('library.playlists.maxPlaylistsReached').replace('{n}', String(DEFAULT_PLAYLIST_SETTINGS.maxPlaylists)));
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
    throw new Error(t('library.playlists.maxSongsReached').replace('{n}', String(DEFAULT_PLAYLIST_SETTINGS.maxSongsPerPlaylist)));
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

// Get playlist songs (full song objects) - requires songs to be passed in.
// Returns ONLY the songs that currently exist in the library (missing IDs are
// silently dropped) — use getPlaylistEntries() when missing entries must be
// surfaced (e.g. greyed-out rows in the playlist view).
export function getPlaylistSongs(playlistId: string, allSongs: Song[]): Song[] {
  const playlist = getPlaylistById(playlistId);
  if (!playlist) return [];

  const songMap = new Map(allSongs.map(s => [s.id, s]));

  return playlist.songIds
    .map(id => songMap.get(id))
    .filter((s): s is Song => s !== undefined);
}

/** A single playlist entry in stored order. */
export interface PlaylistSongEntry {
  /** Stored playlist song ID (stable across rescans). */
  songId: string;
  /** Resolved song object — undefined when the song is missing from the library. */
  song?: Song;
  /** true when the song is missing from the library (i.e. `song` is undefined). */
  missing: boolean;
}

/**
 * Get playlist entries in STORED ORDER, resolving IDs against the live song
 * list. Unlike getPlaylistSongs(), IDs that no longer resolve are NOT dropped:
 * they come back with `missing: true` (and no song object, so no placeholder
 * Song can leak into playback). This lets the playlist view grey them out,
 * keep them manually removable, and automatically resolve them again once the
 * song returns to the library (song IDs are stable across rescans).
 */
export function getPlaylistEntries(playlistId: string, allSongs: Song[]): PlaylistSongEntry[] {
  const playlist = getPlaylistById(playlistId);
  if (!playlist) return [];

  const songMap = new Map(allSongs.map(s => [s.id, s]));

  return playlist.songIds.map(songId => {
    const song = songMap.get(songId);
    return { songId, song, missing: song === undefined };
  });
}

/**
 * Remap song IDs in ALL playlists (system + user). Used after a rescan when a
 * song's ID changed (e.g. its file moved to a different path): playlist
 * references to the old ID are transferred to the new ID. Nothing is dropped —
 * IDs without a mapping stay as-is so they can still resolve when the song
 * returns to the library later.
 * @returns Number of remapped ID occurrences
 */
export function remapSongIdsInPlaylists(idMap: Map<string, string>): number {
  if (idMap.size === 0) return 0;

  const playlists = getPlaylists();
  let remapped = 0;

  for (const playlist of playlists) {
    if (!playlist.songIds.some(id => idMap.has(id))) continue;
    playlist.songIds = playlist.songIds.map(id => {
      const newId = idMap.get(id);
      if (newId !== undefined) {
        remapped++;
        return newId;
      }
      return id;
    });
    playlist.updatedAt = Date.now();
  }

  if (remapped > 0) {
    savePlaylists(playlists);
  }

  return remapped;
}

/**
 * Remap play-count keys after song IDs changed (e.g. file moved during a
 * rescan). Counts for old and new ID are merged so no play history is lost.
 * @returns Number of remapped entries
 */
export function remapPlayCountIds(idMap: Map<string, string>): number {
  if (idMap.size === 0) return 0;

  const counts = getPlayCounts();
  let remapped = 0;

  for (const [oldId, newId] of idMap) {
    if (oldId === newId) continue;
    const oldCount = counts[oldId];
    if (oldCount === undefined) continue;
    counts[newId] = (counts[newId] || 0) + oldCount;
    delete counts[oldId];
    remapped++;
  }

  if (remapped > 0) {
    savePlayCounts(counts);
  }

  return remapped;
}

/**
 * All song IDs referenced anywhere (playlist entries + play counts) —
 * including IDs whose songs are currently MISSING from the library.
 * Used by the rescan identity logic to decide which song IDs must stay
 * resolvable (so their entries can reappear when the song returns).
 */
export function getAllReferencedSongIds(): Set<string> {
  const referenced = new Set<string>();
  for (const playlist of getPlaylists()) {
    for (const songId of playlist.songIds) referenced.add(songId);
  }
  for (const songId of Object.keys(getPlayCounts())) referenced.add(songId);
  return referenced;
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
  if (!getItem(STORAGE_KEY)) {
    // Create default playlists
    savePlaylists(getDefaultPlaylists());
  }
}

// ============ CONSISTENCY CLEANUP ============

/**
 * Remove orphaned song IDs from all playlists — IDs that reference songs
 * no longer in the library. Also removes duplicate entries within the same playlist.
 * Call this after loading the song library to keep playlists in sync.
 *
 * @returns Number of orphaned IDs removed
 */
export function cleanupPlaylistSongIds(allSongIds: Set<string> | string[]): number {
  const playlists = getPlaylists();
  let totalRemoved = 0;

  for (const playlist of playlists) {
    if (playlist.songIds.length === 0) continue;

    const seen = new Set<string>();
    const cleaned: string[] = [];
    let removed = 0;

    for (const songId of playlist.songIds) {
      // Skip duplicates within this playlist
      if (seen.has(songId)) {
        removed++;
        continue;
      }
      seen.add(songId);

      // Skip IDs not in the song library (orphaned)
      const hasId = allSongIds instanceof Set ? allSongIds.has(songId) : allSongIds.includes(songId);
      if (!hasId) {
        removed++;
        continue;
      }

      cleaned.push(songId);
    }

    if (removed > 0) {
      playlist.songIds = cleaned;
      playlist.updatedAt = Date.now();
      totalRemoved += removed;
    }
  }

  if (totalRemoved > 0) {
    savePlaylists(playlists);
  }

  return totalRemoved;
}

/**
 * Clean up stale play counts — entries referencing songs no longer in the library.
 * @returns Number of stale entries removed
 */
export function cleanupPlayCounts(allSongIds: Set<string> | string[]): number {
  const counts = getPlayCounts();
  const idSet = allSongIds instanceof Set ? allSongIds : new Set(allSongIds);
  let removed = 0;

  for (const key of Object.keys(counts)) {
    if (!idSet.has(key)) {
      delete counts[key];
      removed++;
    }
  }

  if (removed > 0) {
    savePlayCounts(counts);
  }

  return removed;
}
