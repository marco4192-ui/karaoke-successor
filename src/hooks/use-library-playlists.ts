/**
 * Custom hook for managing playlists in the library
 * Handles creation, deletion, and modification of playlists
 */
import { useState, useEffect, useCallback } from 'react';
import { Song } from '@/types/game';
import {
  getPlaylists,
  createPlaylist,
  deletePlaylist,
  addSongToPlaylist,
  removeSongFromPlaylist,
  getPlaylistById,
  toggleFavorite,
  initializePlaylists,
  Playlist,
} from '@/lib/playlist-manager';
import { logger } from '@/lib/logger';

export interface UseLibraryPlaylistsReturn {
  playlists: Playlist[];
  selectedPlaylist: Playlist | null;
  favoriteSongIds: Set<string>;
  showCreatePlaylistModal: boolean;
  showAddToPlaylistModal: boolean;
  songToAddToPlaylist: Song | null;
  setSelectedPlaylist: (playlist: Playlist | null) => void;
  setShowCreatePlaylistModal: (show: boolean) => void;
  setShowAddToPlaylistModal: (show: boolean) => void;
  setSongToAddToPlaylist: (song: Song | null) => void;
  handleCreatePlaylist: (name: string, description?: string) => Playlist | null;
  handleDeletePlaylist: (playlistId: string) => void;
  handleAddToPlaylist: (playlistId: string) => boolean;
  handleRemoveFromPlaylist: (playlistId: string, songId: string) => void;
  handleToggleFavorite: (songId: string) => boolean;
  refreshPlaylists: () => void;
  isSongInPlaylist: (songId: string, playlistId: string) => boolean;
  isFavorite: (songId: string) => boolean;
}

export function useLibraryPlaylists(): UseLibraryPlaylistsReturn {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [favoriteSongIds, setFavoriteSongIds] = useState<Set<string>>(new Set());
  const [showCreatePlaylistModal, setShowCreatePlaylistModal] = useState(false);
  const [showAddToPlaylistModal, setShowAddToPlaylistModal] = useState(false);
  const [songToAddToPlaylist, setSongToAddToPlaylist] = useState<Song | null>(null);

  // Refresh playlists - defined first to avoid hoisting issues
  const refreshPlaylists = useCallback(() => {
    const allPlaylists = getPlaylists();
    setPlaylists(allPlaylists);
    
    // Update favorite song IDs
    const favs = new Set<string>();
    const favorites = allPlaylists.find(p => p.id === 'system-favorites');
    if (favorites) {
      favorites.songIds.forEach(id => favs.add(id));
    }
    setFavoriteSongIds(favs);
  }, []);

  // Initialize playlists on mount
  useEffect(() => {
    initializePlaylists();
    refreshPlaylists();
  }, [refreshPlaylists]);

  // Create a new playlist
  const handleCreatePlaylist = useCallback((name: string, description?: string): Playlist | null => {
    try {
      const playlist = createPlaylist(name, description);
      refreshPlaylists();
      return playlist;
    } catch (error) {
      logger.error('[useLibraryPlaylists]', 'Failed to create playlist:', error);
      return null;
    }
  }, [refreshPlaylists]);

  // Delete a playlist
  const handleDeletePlaylist = useCallback((playlistId: string) => {
    try {
      deletePlaylist(playlistId);
      refreshPlaylists();
      
      // If deleted playlist was selected, clear selection
      if (selectedPlaylist?.id === playlistId) {
        setSelectedPlaylist(null);
      }
    } catch (error) {
      logger.error('[useLibraryPlaylists]', 'Failed to delete playlist:', error);
    }
  }, [selectedPlaylist, refreshPlaylists]);

  // Add song to playlist
  const handleAddToPlaylist = useCallback((playlistId: string): boolean => {
    if (!songToAddToPlaylist) return false;
    
    try {
      const success = addSongToPlaylist(playlistId, songToAddToPlaylist.id);
      if (success) {
        refreshPlaylists();
        
        // Update selected playlist if viewing it
        if (selectedPlaylist?.id === playlistId) {
          setSelectedPlaylist(getPlaylistById(playlistId) || null);
        }
      }
      return success;
    } catch (error) {
      logger.error('[useLibraryPlaylists]', 'Failed to add to playlist:', error);
      return false;
    }
  }, [songToAddToPlaylist, selectedPlaylist, refreshPlaylists]);

  // Remove song from playlist
  const handleRemoveFromPlaylist = useCallback((playlistId: string, songId: string) => {
    try {
      removeSongFromPlaylist(playlistId, songId);
      refreshPlaylists();
      
      // Update selected playlist if viewing it
      if (selectedPlaylist?.id === playlistId) {
        setSelectedPlaylist(getPlaylistById(playlistId) || null);
      }
    } catch (error) {
      logger.error('[useLibraryPlaylists]', 'Failed to remove from playlist:', error);
    }
  }, [selectedPlaylist, refreshPlaylists]);

  // Toggle favorite status
  const handleToggleFavorite = useCallback((songId: string): boolean => {
    try {
      const isNowFavorite = toggleFavorite(songId);
      refreshPlaylists();
      return isNowFavorite;
    } catch (error) {
      logger.error('[useLibraryPlaylists]', 'Failed to toggle favorite:', error);
      return false;
    }
  }, [refreshPlaylists]);

  // Check if song is in a specific playlist
  const isSongInPlaylist = useCallback((songId: string, playlistId: string): boolean => {
    const playlist = getPlaylistById(playlistId);
    return playlist?.songIds.includes(songId) ?? false;
  }, []);

  // Check if song is a favorite
  const isFavorite = useCallback((songId: string): boolean => {
    return favoriteSongIds.has(songId);
  }, [favoriteSongIds]);

  return {
    playlists,
    selectedPlaylist,
    favoriteSongIds,
    showCreatePlaylistModal,
    showAddToPlaylistModal,
    songToAddToPlaylist,
    setSelectedPlaylist,
    setShowCreatePlaylistModal,
    setShowAddToPlaylistModal,
    setSongToAddToPlaylist,
    handleCreatePlaylist,
    handleDeletePlaylist,
    handleAddToPlaylist,
    handleRemoveFromPlaylist,
    handleToggleFavorite,
    refreshPlaylists,
    isSongInPlaylist,
    isFavorite,
  };
}

export default useLibraryPlaylists;
