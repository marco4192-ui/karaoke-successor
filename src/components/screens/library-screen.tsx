'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Song, Difficulty, GameMode } from '@/types/game';
import { useGameStore } from '@/lib/game/store';
import { getAllSongs, getAllSongsAsync, restoreSongUrls } from '@/lib/game/song-library';
import { 
  getPlaylists, 
  deletePlaylist, 
  addSongToPlaylist, 
  removeSongFromPlaylist, 
  getPlaylistSongs,
  getPlaylistById,
  initializePlaylists,
  Playlist
} from '@/lib/playlist-manager';
import { SongHighscoreModal } from '@/components/results';
import { SongStartModal, StartOptions } from '@/components/library/song-start-modal';
import { CreatePlaylistForm } from '@/components/library/create-playlist-form';
import { SongCard } from '@/components/library/song-card';
import { LANGUAGE_NAMES } from '@/lib/i18n/translations';
import { logger } from '@/lib/logger';
// Icons - imported from central icons file
import {
  MusicIcon,
  PlayIcon,
  FolderIcon,
  TrashIcon,
  QueueIcon,
} from '@/components/icons';
// Hooks
import { useLibrarySettings, LibraryViewMode, LibraryGroupBy } from '@/hooks/use-library-settings';
import { useLibraryPreview } from '@/hooks/use-library-preview';
// Utils
import { 
  getLetterGroup, 
  groupSongs, 
  getSortedFolderKeys,
  filterSongs,
  sortSongs,
  getAvailableGenres,
  getAvailableLanguages,
  isDuetSong
} from '@/lib/library-utils';

// ===================== LIBRARY SCREEN =====================
export function LibraryScreen({ onSelectSong, initialGameMode }: { onSelectSong: (song: Song) => void; initialGameMode?: GameMode }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [showSongModal, setShowSongModal] = useState(false);
  const [showHighscoreModal, setShowHighscoreModal] = useState(false);
  const [highscoreSong, setHighscoreSong] = useState<Song | null>(null);
  const [libraryVersion, setLibraryVersion] = useState(0);
  const [songsLoading, setSongsLoading] = useState(true);
  const [loadedSongs, setLoadedSongs] = useState<Song[]>([]);
  // Custom YouTube background video state
  const [customYoutubeUrl, setCustomYoutubeUrl] = useState('');
  const [customYoutubeId, setCustomYoutubeId] = useState<string | null>(null);
  
  // Use custom hooks for preview and settings management
  const {
    previewSong,
    previewAudio,
    startPreviewDelayed,
    stopPreview,
    cancelPreview,
    registerVideoRef,
  } = useLibraryPreview();
  
  const {
    settings,
    viewState,
    updateSettings,
    setViewMode,
    navigateToFolder,
    exitFolder,
    setFilterGenre,
    setFilterLanguage,
    setFilterDuet,
    setGroupBy,
  } = useLibrarySettings();
  
  // Extract view state
  const { viewMode, groupBy, currentFolder, folderBreadcrumb } = viewState;
  
  const { setDifficulty, gameState, addToQueue, queue, activeProfileId, profiles, setGameMode, highscores, setActiveProfile, addPlayer } = useGameStore();
  
  // Get global difficulty from store for initialization
  const storeDifficulty = gameState.difficulty;
  
  // Playlist state
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [showCreatePlaylistModal, setShowCreatePlaylistModal] = useState(false);
  const [showAddToPlaylistModal, setShowAddToPlaylistModal] = useState(false);
  const [songToAddToPlaylist, setSongToAddToPlaylist] = useState<Song | null>(null);
  const [favoriteSongIds, setFavoriteSongIds] = useState<Set<string>>(new Set());
  
  // Initialize playlists on mount
  useEffect(() => {
    initializePlaylists();
    setPlaylists(getPlaylists());
  }, []);
  
  // Refresh playlists when viewMode changes to playlists
  useEffect(() => {
    if (viewMode === 'playlists') {
      setPlaylists(getPlaylists());
      // Update favorite song IDs
      const favs = new Set<string>();
      const allPlaylists = getPlaylists();
      const favorites = allPlaylists.find(p => p.id === 'system-favorites');
      if (favorites) {
        favorites.songIds.forEach(id => favs.add(id));
      }
      setFavoriteSongIds(favs);
    }
  }, [viewMode]);
  
  // Load songs asynchronously on mount and when library changes
  useEffect(() => {
    const loadSongs = async () => {
      setSongsLoading(true);
      try {
        const songs = await getAllSongsAsync();
        setLoadedSongs(songs);
      } catch (error) {
        logger.error('[LibraryScreen]', 'Failed to load songs:', error);
        // Fallback to sync version
        setLoadedSongs(getAllSongs());
      } finally {
        setSongsLoading(false);
      }
    };
    loadSongs();
  }, [libraryVersion]);
  
  // Song start modal state - use initialGameMode if it's a party mode
  const isPartyMode = initialGameMode && initialGameMode !== 'standard' && initialGameMode !== 'duel' && initialGameMode !== 'duet';
  const [startOptions, setStartOptions] = useState<StartOptions>({
    difficulty: storeDifficulty, // Initialize with global store difficulty
    mode: initialGameMode === 'duel' ? 'duel' : initialGameMode === 'duet' ? 'duet' : 'single',
    players: [],
    partyMode: isPartyMode ? initialGameMode : undefined,
  });
  
  // Sync with store difficulty when it changes
  useEffect(() => {
    setStartOptions(prev => ({ ...prev, difficulty: storeDifficulty }));
  }, [storeDifficulty]);
  
  // Load default difficulty from localStorage after mount (fallback if store not hydrated)
  useEffect(() => {
    const saved = localStorage.getItem('karaoke-default-difficulty');
    if (saved === 'easy' || saved === 'medium' || saved === 'hard') {
      // Only use localStorage if store hasn't been hydrated yet
      if (storeDifficulty === 'medium') {
        setStartOptions(prev => ({ ...prev, difficulty: saved }));
      }
    }
  }, [storeDifficulty]);
  
  // Listen for difficulty changes from settings
  useEffect(() => {
    const handleDifficultyChange = () => {
      const saved = localStorage.getItem('karaoke-default-difficulty');
      if (saved === 'easy' || saved === 'medium' || saved === 'hard') {
        setStartOptions(prev => ({
          ...prev,
          difficulty: saved as Difficulty
        }));
      }
    };
    window.addEventListener('storage', handleDifficultyChange);
    window.addEventListener('settingsChange', handleDifficultyChange);
    return () => {
      window.removeEventListener('storage', handleDifficultyChange);
      window.removeEventListener('settingsChange', handleDifficultyChange);
    };
  }, []);
  
  const activeProfile = profiles.find(p => p.id === activeProfileId);
  const playerQueueCount = queue.filter(item => item.playerId === activeProfileId).length;

  // Local refs for video preview (not provided by hook)
  const previewVideoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());

  // Preview handlers - use hook functions with video enhancement
  const handlePreviewStart = useCallback((song: Song) => {
    // Allow preview even without audioUrl if there's video
    if (!song.audioUrl && !song.videoBackground && !song.youtubeUrl) return;
    
    // Use hook's delayed preview for audio
    startPreviewDelayed(song, 500);
    
    // Handle video preview separately (not in hook)
    if (song.videoBackground) {
      setTimeout(() => {
        const videoEl = previewVideoRefs.current.get(song.id);
        if (videoEl) {
          if (song.preview) {
            videoEl.currentTime = song.preview.startTime / 1000;
          }
          if (song.hasEmbeddedAudio && !song.audioUrl) {
            videoEl.muted = false;
          }
          videoEl.play().catch(() => {});
        }
      }, 500);
    }
  }, [startPreviewDelayed]);
  
  const handlePreviewStop = useCallback(() => {
    // Use hook's stop function
    stopPreview();
    
    // Stop all local video previews
    previewVideoRefs.current.forEach((video) => {
      video.pause();
      video.currentTime = 0;
    });
  }, [stopPreview]);

  const filteredSongs = useMemo(() => {
    let songs = loadedSongs;
    
    // Search filter
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      songs = songs.filter(s => 
        s.title.toLowerCase().includes(lowerQuery) ||
        s.artist.toLowerCase().includes(lowerQuery) ||
        s.genre?.toLowerCase().includes(lowerQuery) ||
        s.album?.toLowerCase().includes(lowerQuery)
      );
    }
    
    // Difficulty filter
    if (settings.filterDifficulty !== 'all') {
      songs = songs.filter(s => s.difficulty === settings.filterDifficulty);
    }
    
    // Genre filter - reads from #Genre: tag in txt files
    if (settings.filterGenre && settings.filterGenre !== 'all') {
      songs = songs.filter(s => s.genre === settings.filterGenre);
    }
    
    // Language filter - reads from #Language: tag in txt files
    if (settings.filterLanguage && settings.filterLanguage !== 'all') {
      songs = songs.filter(s => s.language === settings.filterLanguage);
    }
    
    // Duet filter - show only duet songs when enabled
    if (settings.filterDuet) {
      songs = songs.filter(s => {
        // Check if explicitly marked as duet
        if (s.isDuet === true) return true;
        // Check folder path for [DUET] marker (case insensitive)
        if (s.folderPath?.toLowerCase().includes('[duet]')) return true;
        if (s.storageFolder?.toLowerCase().includes('[duet]')) return true;
        // Check if song has duet player data
        if (s.duetPlayerNames && s.duetPlayerNames.length >= 2) return true;
        // Check if any lyric lines have notes with P1/P2 player assignments
        if (s.lyrics && s.lyrics.length > 0) {
          const hasDuetNotes = s.lyrics.some(line => 
            line.notes && line.notes.some(note => 
              note.player === 'P1' || note.player === 'P2'
            )
          );
          if (hasDuetNotes) return true;
        }
        return false;
      });
    }
    
    // Duet mode filter - show only duet-compatible songs when in duet mode (NOT duel mode)
    // Duet mode: Two players sing different parts (need duet songs)
    // Duel mode: Two players compete on the same song (any song works)
    if (startOptions.mode === 'duet') {
      songs = songs.filter(s => {
        // Check if explicitly marked as duet
        if (s.isDuet === true) return true;
        // Check folder path for [DUET] marker (case insensitive)
        if (s.folderPath?.toLowerCase().includes('[duet]')) return true;
        if (s.storageFolder?.toLowerCase().includes('[duet]')) return true;
        // Check if song has duet player data
        if (s.duetPlayerNames && s.duetPlayerNames.length >= 2) return true;
        // Check if any lyric lines have notes with P1/P2 player assignments
        if (s.lyrics && s.lyrics.length > 0) {
          const hasDuetNotes = s.lyrics.some(line => 
            line.notes && line.notes.some(note => 
              note.player === 'P1' || note.player === 'P2'
            )
          );
          if (hasDuetNotes) return true;
        }
        return false;
      });
    }
    
    // Sort
    songs = [...songs].sort((a, b) => {
      let comparison = 0;
      switch (settings.sortBy) {
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'artist':
          comparison = a.artist.localeCompare(b.artist);
          break;
        case 'dateAdded':
          comparison = (b.dateAdded || 0) - (a.dateAdded || 0);
          break;
      }
      return settings.sortOrder === 'asc' ? comparison : -comparison;
    });
    
    return songs;
  }, [loadedSongs, searchQuery, settings, startOptions.mode]);
  
  // Get unique genres from loaded songs (read from #Genre: in txt files)
  const availableGenres = useMemo(() => {
    const genreSet = new Set<string>();
    loadedSongs.forEach(s => {
      if (s.genre) genreSet.add(s.genre);
    });
    return ['all', ...Array.from(genreSet).sort()];
  }, [loadedSongs]);
  
  // Get unique languages from loaded songs (read from #Language: in txt files)
  const availableLanguages = useMemo(() => {
    const langSet = new Set<string>();
    loadedSongs.forEach(s => {
      if (s.language) langSet.add(s.language);
    });
    return ['all', ...Array.from(langSet).sort()];
  }, [loadedSongs]);
  
  // Group songs for folder view
  const groupedSongs = useMemo(() => {
    if (groupBy === 'none' || viewMode === 'grid') {
      return new Map<string, Song[]>();
    }
    return groupSongs(filteredSongs, groupBy);
  }, [filteredSongs, groupBy, viewMode]);
  
  // Get songs for current folder
  const currentFolderSongs = useMemo(() => {
    if (!currentFolder || groupBy === 'none') {
      return filteredSongs;
    }
    return groupedSongs.get(currentFolder) || [];
  }, [currentFolder, groupBy, filteredSongs, groupedSongs]);
  
  // Get display name for a group key
  const getGroupDisplayName = (key: string): string => {
    if (groupBy === 'language') {
      return LANGUAGE_NAMES[key] || key;
    }
    return key;
  };
  
  // Handle folder navigation
  const handleOpenFolder = (folder: string) => {
    navigateToFolder(folder, [...folderBreadcrumb, folder]);
  };
  
  const handleBackFolder = () => {
    const newBreadcrumb = folderBreadcrumb.slice(0, -1);
    navigateToFolder(
      newBreadcrumb.length > 0 ? newBreadcrumb[newBreadcrumb.length - 1] : '',
      newBreadcrumb
    );
    if (newBreadcrumb.length === 0) {
      exitFolder();
    }
  };
  
  const handleBreadcrumbClick = (index: number) => {
    if (index === -1) {
      exitFolder();
    } else {
      const newBreadcrumb = folderBreadcrumb.slice(0, index + 1);
      navigateToFolder(folderBreadcrumb[index], newBreadcrumb);
    }
  };

  const handleSongClick = (song: Song) => {
    setSelectedSong(song);
    setStartOptions({
      difficulty: song.difficulty,
      mode: initialGameMode === 'duel' ? 'duel' : 'single',
      players: activeProfileId ? [activeProfileId] : [],
      partyMode: isPartyMode ? initialGameMode : undefined,
    });
    setShowSongModal(true);
  };

  const handleStartGame = async () => {
    if (!selectedSong) return;
    
    // CRITICAL: Ensure the song has valid media URLs before passing to game screen
    // This is necessary because blob URLs don't persist across app restarts
    let songWithUrls = selectedSong;
    if (!selectedSong.audioUrl && !selectedSong.videoBackground && selectedSong.relativeAudioPath) {
      logger.info('[LibraryScreen]', 'Restoring URLs for song:', selectedSong.title);
      songWithUrls = await restoreSongUrls(selectedSong);
    }
    
    // Check if player selection is required (multiple active profiles)
    const activeProfiles = profiles.filter(p => p.isActive !== false);
    const needsPlayerSelection = activeProfiles.length > 1;
    
    // For single mode with multiple profiles, ensure a player is selected
    if (startOptions.mode === 'single' && !startOptions.partyMode && needsPlayerSelection) {
      if (startOptions.players.length === 0) {
        return; // No player selected
      }
      // Set the selected player as active
      setActiveProfile(startOptions.players[0]);
    }
    
    // For duel mode, ensure 2 players are selected
    if (startOptions.mode === 'duel' && startOptions.players.length < 2) {
      return;
    }
    
    // For duet mode, need 2 players as well
    if (startOptions.mode === 'duet' && startOptions.players.length < 2) {
      return;
    }
    
    // For party modes, add all selected players to the game
    if (startOptions.partyMode && startOptions.players.length > 0) {
      // Clear existing players first by resetting game state
      // Then add all selected players
      startOptions.players.forEach((playerId) => {
        const profile = profiles.find(p => p.id === playerId);
        if (profile) {
          addPlayer(profile);
        }
      });
    } else if (startOptions.mode === 'single') {
      // CRITICAL FIX: For single-player mode, ensure exactly one player is added
      // Use the selected player, active profile, or create a default player
      const playerId = startOptions.players[0] || activeProfileId;
      if (playerId) {
        const profile = profiles.find(p => p.id === playerId);
        if (profile) {
          addPlayer(profile);
        }
      }
      // If still no player, the game screen will create a default player
    } else if ((startOptions.mode === 'duel' || startOptions.mode === 'duet') && startOptions.players.length >= 2) {
      // For duel/duet mode, add both players
      startOptions.players.forEach((playerId) => {
        const profile = profiles.find(p => p.id === playerId);
        if (profile) {
          addPlayer(profile);
        }
      });
    }
    
    setDifficulty(startOptions.difficulty);
    // Set the game mode - use party mode if available, otherwise use the selected mode
    if (startOptions.partyMode) {
      setGameMode(startOptions.partyMode);
    } else if (startOptions.mode === 'duel') {
      setGameMode('duel');
    } else if (startOptions.mode === 'duet') {
      setGameMode('duet');
    } else {
      setGameMode('standard');
    }
    setShowSongModal(false);
    
    // Pass song with custom YouTube background if set
    if (customYoutubeId) {
      onSelectSong({
        ...songWithUrls,
        videoBackground: `https://www.youtube.com/watch?v=${customYoutubeId}`,
        youtubeId: customYoutubeId,
      });
    } else {
      onSelectSong(songWithUrls);
    }
  };

  const handleAddToQueue = (song: Song) => {
    if (activeProfileId && playerQueueCount < 3) {
      addToQueue(song, activeProfileId, activeProfile?.name || 'Player');
    }
  };

  return (
    <div className="w-[90%] mx-auto max-w-[1800px]">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Music Library</h1>
        <p className="text-white/60">
          {songsLoading ? 'Loading songs...' : `${loadedSongs.length} songs available`}
        </p>
      </div>

      {/* Loading indicator */}
      {songsLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full mr-3" />
          <span className="text-white/60">Loading songs...</span>
        </div>
      )}

      {/* Search and Filters */}
      {!songsLoading && (
        <div className="space-y-4 mb-6">
          {/* Search Row */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Input
                id="song-search"
                name="song-search"
                placeholder="Search songs, artists, or genres..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/40 pr-10"
              />
              <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
            </div>
            
            {/* Sort dropdown */}
            <select
              value={`${settings.sortBy}-${settings.sortOrder}`}
              onChange={(e) => {
                const [sortBy, sortOrder] = e.target.value.split('-') as [typeof settings.sortBy, typeof settings.sortOrder];
                updateSettings({ sortBy, sortOrder });
              }}
              className="bg-gray-800 border border-white/20 rounded-md px-3 py-2 text-white appearance-none cursor-pointer hover:border-cyan-500/50 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='white'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center', backgroundSize: '16px', paddingRight: '32px' }}
            >
              <option value="title-asc" className="bg-gray-800 text-white">Title (A-Z)</option>
              <option value="title-desc" className="bg-gray-800 text-white">Title (Z-A)</option>
              <option value="artist-asc" className="bg-gray-800 text-white">Artist (A-Z)</option>
              <option value="artist-desc" className="bg-gray-800 text-white">Artist (Z-A)</option>
              <option value="dateAdded-desc" className="bg-gray-800 text-white">Recently Added</option>
            </select>
          </div>
          
          {/* Filter Row - Genre, Language, and Duet in same row */}
          <div className="flex flex-wrap gap-3 items-center">
            {/* Genre Filter - reads from #Genre: tag in txt files */}
            <div className="flex items-center gap-2">
              <span className="text-white/40 text-sm">🎸 Genre:</span>
              <select
                value={settings.filterGenre || 'all'}
                onChange={(e) => setFilterGenre(e.target.value)}
                className="bg-gray-800 border border-white/20 rounded-md px-3 py-1.5 text-white text-sm appearance-none cursor-pointer hover:border-purple-500/50 focus:border-purple-500 focus:outline-none"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='white'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 6px center', backgroundSize: '14px', paddingRight: '28px' }}
              >
                {availableGenres.map(g => (
                  <option key={g} value={g} className="bg-gray-800 text-white">{g === 'all' ? 'All Genres' : g}</option>
                ))}
              </select>
            </div>
            
            {/* Language Filter - reads from #Language: tag in txt files */}
            <div className="flex items-center gap-2">
              <span className="text-white/40 text-sm">🌍 Language:</span>
              <select
                value={settings.filterLanguage || 'all'}
                onChange={(e) => setFilterLanguage(e.target.value)}
                className="bg-gray-800 border border-white/20 rounded-md px-3 py-1.5 text-white text-sm appearance-none cursor-pointer hover:border-cyan-500/50 focus:border-cyan-500 focus:outline-none"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='white'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 6px center', backgroundSize: '14px', paddingRight: '28px' }}
              >
                {availableLanguages.map(l => (
                  <option key={l} value={l} className="bg-gray-800 text-white">{l === 'all' ? 'All Languages' : (LANGUAGE_NAMES[l] || l)}</option>
                ))}
              </select>
            </div>
            
            {/* Duet Filter Toggle - in same row as other filters */}
            <button
              onClick={() => setFilterDuet(!settings.filterDuet)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                settings.filterDuet 
                  ? 'bg-pink-500/30 text-pink-300 border border-pink-500/50' 
                  : 'bg-white/5 text-white/60 hover:bg-white/10 border border-white/10'
              }`}
            >
              <span>🎭</span>
              <span>Duet</span>
            </button>
            
            {/* Active Filters Display */}
            {(settings.filterGenre !== 'all' || settings.filterLanguage !== 'all' || settings.filterDuet) && (
              <button
                onClick={() => updateSettings({ filterGenre: 'all', filterLanguage: 'all', filterDuet: false })}
                className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
              >
                ✕ Clear filters
              </button>
            )}
          </div>
          
          {/* View Mode and Group By Options */}
          <div className="flex flex-wrap gap-2 items-center">
            {/* View Mode Toggle */}
            <div className="flex bg-white/5 rounded-lg p-1">
              <button
                onClick={() => { setViewMode('grid'); setGroupBy('none'); setSelectedPlaylist(null); }}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  viewMode === 'grid' && groupBy === 'none' ? 'bg-cyan-500 text-white' : 'text-white/60 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="7" height="7" />
                    <rect x="14" y="3" width="7" height="7" />
                    <rect x="14" y="14" width="7" height="7" />
                    <rect x="3" y="14" width="7" height="7" />
                  </svg>
                  Grid
                </div>
              </button>
              <button
                onClick={() => { setViewMode('playlists'); setSelectedPlaylist(null); }}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  viewMode === 'playlists' ? 'bg-purple-500 text-white' : 'text-white/60 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 18V5l12-2v13" />
                    <circle cx="6" cy="18" r="3" />
                    <circle cx="18" cy="16" r="3" />
                  </svg>
                  Playlists
                </div>
              </button>
            </div>
            
            <span className="text-white/30">|</span>
            
            {/* Group By Options */}
            <span className="text-white/40 text-sm">Group by:</span>
            <div className="flex flex-wrap gap-1">
              {[
                { value: 'artist', label: 'Artist A-Z', icon: '🎤' },
                { value: 'title', label: 'Title A-Z', icon: '🎵' },
                { value: 'genre', label: 'Genre', icon: '🎸' },
                { value: 'language', label: 'Language', icon: '🌍' },
                { value: 'folder', label: 'Folder', icon: '📁' },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    setViewMode('folder');
                    setGroupBy(option.value as LibraryGroupBy);
                  }}
                  className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                    groupBy === option.value && viewMode === 'folder' 
                      ? 'bg-purple-500 text-white' 
                      : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <span className="mr-1">{option.icon}</span>
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          
          {/* Breadcrumb Navigation */}
          {viewMode === 'folder' && folderBreadcrumb.length > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <button
                onClick={() => handleBreadcrumbClick(-1)}
                className="text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                All
              </button>
              {folderBreadcrumb.map((folder, index) => (
                <React.Fragment key={index}>
                  <span className="text-white/30">/</span>
                  <button
                    onClick={() => handleBreadcrumbClick(index)}
                    className={`transition-colors ${
                      index === folderBreadcrumb.length - 1 
                        ? 'text-white font-medium' 
                        : 'text-cyan-400 hover:text-cyan-300'
                    }`}
                  >
                    {getGroupDisplayName(folder)}
                  </button>
                </React.Fragment>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Song Grid or Folder View or Playlist View */}
      {!songsLoading && (
        <>
          {viewMode === 'playlists' ? (
            // Playlist View
            <div className="space-y-6">
              {/* Back button if viewing playlist songs */}
              {selectedPlaylist && (
                <button
                  onClick={() => setSelectedPlaylist(null)}
                  className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M19 12H5M12 19l-7-7 7-7" />
                  </svg>
                  Back to Playlists
                </button>
              )}
              
              {!selectedPlaylist ? (
                // Show all playlists
                <>
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold">
                      {playlists.length} Playlist{playlists.length !== 1 ? 's' : ''}
                    </h2>
                    <Button
                      onClick={() => setShowCreatePlaylistModal(true)}
                      className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400"
                    >
                      <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                      Create Playlist
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {playlists.map((playlist) => {
                      const playlistSongs = getPlaylistSongs(playlist.id, loadedSongs);
                      return (
                        <button
                          key={playlist.id}
                          onClick={() => setSelectedPlaylist(playlist)}
                          className="bg-white/5 rounded-xl p-4 border border-white/10 hover:border-purple-500/50 hover:bg-white/10 transition-all text-left group relative"
                        >
                          {/* System playlist badge */}
                          {playlist.isSystem && (
                            <div className="absolute top-2 right-2 bg-purple-500/30 text-purple-300 text-xs px-2 py-0.5 rounded-full">
                              System
                            </div>
                          )}
                          
                          {/* Cover Image */}
                          <div className="w-full aspect-square rounded-lg mb-3 overflow-hidden bg-gradient-to-br from-purple-600/30 to-cyan-600/30 flex items-center justify-center">
                            {playlistSongs.length > 0 && playlistSongs[0].coverImage ? (
                              <img src={playlistSongs[0].coverImage} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <MusicIcon className="w-12 h-12 text-white/30" />
                            )}
                          </div>
                          
                          {/* Playlist Name */}
                          <h3 className="font-semibold text-white truncate">{playlist.name}</h3>
                          <p className="text-xs text-white/40">{playlistSongs.length} song{playlistSongs.length !== 1 ? 's' : ''}</p>
                          
                          {/* Delete button for non-system playlists */}
                          {!playlist.isSystem && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm(`Delete "${playlist.name}"?`)) {
                                  deletePlaylist(playlist.id);
                                  setPlaylists(getPlaylists());
                                }
                              }}
                              className="absolute top-2 left-2 p-1.5 rounded-lg bg-red-500/20 text-red-400 opacity-0 group-hover:opacity-100 hover:bg-red-500/40 transition-all"
                              title="Delete playlist"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </>
              ) : (
                // Show songs in selected playlist
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold">{selectedPlaylist.name}</h2>
                      {selectedPlaylist.description && (
                        <p className="text-white/60 text-sm">{selectedPlaylist.description}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => {
                          const songs = getPlaylistSongs(selectedPlaylist.id, loadedSongs);
                          songs.forEach(song => {
                            if (activeProfileId && queue.filter(q => q.playerId === activeProfileId).length < 3) {
                              addToQueue(song, activeProfileId, activeProfile?.name || 'Player');
                            }
                          });
                        }}
                        variant="outline"
                        className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/20"
                        disabled={!activeProfileId}
                      >
                        <QueueIcon className="w-4 h-4 mr-2" />
                        Add to Queue
                      </Button>
                      <Button
                        onClick={() => {
                          const songs = getPlaylistSongs(selectedPlaylist.id, loadedSongs);
                          if (songs.length > 0) {
                            // Navigate to jukebox with these songs
                            localStorage.setItem('jukebox-playlist', JSON.stringify(songs.map(s => s.id)));
                            // Could also set screen to jukebox here
                          }
                        }}
                        className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400"
                      >
                        <PlayIcon className="w-4 h-4 mr-2" />
                        Play in Jukebox
                      </Button>
                    </div>
                  </div>
                  
                  {getPlaylistSongs(selectedPlaylist.id, loadedSongs).length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-white/60">This playlist is empty</p>
                      <p className="text-white/40 text-sm mt-2">Add songs from the library</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                      {getPlaylistSongs(selectedPlaylist.id, loadedSongs).map((song) => (
                        <div key={song.id} className="relative group">
                          <SongCard 
                            song={song}
                            previewSong={previewSong}
                            onSongClick={handleSongClick}
                            onPreviewStart={handlePreviewStart}
                            onPreviewStop={handlePreviewStop}
                            previewVideoRefs={previewVideoRefs}
                          />
                          {/* Remove from playlist button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeSongFromPlaylist(selectedPlaylist.id, song.id);
                              setPlaylists(getPlaylists());
                              setSelectedPlaylist(getPlaylistById(selectedPlaylist.id));
                            }}
                            className="absolute top-2 right-2 p-1.5 rounded-lg bg-red-500/80 text-white opacity-0 group-hover:opacity-100 hover:bg-red-500 transition-all z-10"
                            title="Remove from playlist"
                          >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <line x1="18" y1="6" x2="6" y2="18" />
                              <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : filteredSongs.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-white/60 mb-4">No songs found</p>
              <p className="text-white/40 text-sm">Try a different search or import some songs</p>
            </div>
          ) : viewMode === 'grid' || (viewMode === 'folder' && currentFolder) ? (
            // Grid View (either plain grid or folder contents)
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4">
              {currentFolderSongs.map((song) => (
                <SongCard 
                  key={song.id}
                  song={song}
                  previewSong={previewSong}
                  onSongClick={handleSongClick}
                  onPreviewStart={handlePreviewStart}
                  onPreviewStop={handlePreviewStop}
                  previewVideoRefs={previewVideoRefs}
                />
              ))}
            </div>
          ) : (
            // Folder View - Show Folders
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-4">
              {getSortedFolderKeys(groupedSongs, groupBy).map((folderKey) => {
                const songs = groupedSongs.get(folderKey) || [];
                const displayName = getGroupDisplayName(folderKey);
                
                return (
                  <button
                    key={folderKey}
                    onClick={() => handleOpenFolder(folderKey)}
                    className="bg-white/5 rounded-xl p-4 border border-white/10 hover:border-cyan-500/50 hover:bg-white/10 transition-all text-left group"
                  >
                    {/* Folder Icon */}
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-yellow-500/20 to-orange-500/20 flex items-center justify-center mb-3 group-hover:from-yellow-500/30 group-hover:to-orange-500/30 transition-all">
                      <FolderIcon className="w-6 h-6 text-yellow-400" />
                    </div>
                    
                    {/* Folder Name */}
                    <h3 className="font-semibold text-white truncate">{displayName}</h3>
                    <p className="text-xs text-white/40">{songs.length} song{songs.length !== 1 ? 's' : ''}</p>
                    
                    {/* Preview covers */}
                    <div className="flex -space-x-2 mt-3">
                      {songs.slice(0, 4).map((song, i) => (
                        <div 
                          key={song.id}
                          className="w-8 h-8 rounded bg-gradient-to-br from-purple-600/50 to-blue-600/50 border-2 border-gray-900 overflow-hidden"
                          style={{ zIndex: 4 - i }}
                        >
                          {song.coverImage ? (
                            <img src={song.coverImage} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <MusicIcon className="w-4 h-4 text-white/30" />
                            </div>
                          )}
                        </div>
                      ))}
                      {songs.length > 4 && (
                        <div className="w-8 h-8 rounded bg-black/50 border-2 border-gray-900 flex items-center justify-center text-xs text-white/60">
                          +{songs.length - 4}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Song Start Modal */}
      <SongStartModal
        song={selectedSong}
        isOpen={showSongModal}
        onClose={() => setShowSongModal(false)}
        startOptions={startOptions}
        onStartOptionsChange={setStartOptions}
        profiles={profiles}
        highscores={highscores}
        favoriteSongIds={favoriteSongIds}
        onFavoriteChange={setFavoriteSongIds}
        onShowHighscores={(song) => {
          setHighscoreSong(song);
          setShowHighscoreModal(true);
        }}
        onAddToQueue={(song) => {
          if (activeProfileId) {
            addToQueue(song, activeProfileId, activeProfile?.name || 'Player');
          }
        }}
        onAddToPlaylist={(song) => {
          setSongToAddToPlaylist(song);
          setShowAddToPlaylistModal(true);
        }}
        onStartGame={handleStartGame}
        playerQueueCount={playerQueueCount}
        activeProfileId={activeProfileId}
      />

      {/* Song Highscore Modal */}
      {highscoreSong && (
        <SongHighscoreModal
          song={highscoreSong}
          isOpen={showHighscoreModal}
          onClose={() => {
            setShowHighscoreModal(false);
            setHighscoreSong(null);
          }}
        />
      )}

      {/* Create Playlist Modal */}
      {showCreatePlaylistModal && (
        <Dialog open={showCreatePlaylistModal} onOpenChange={setShowCreatePlaylistModal}>
          <DialogContent className="bg-gray-900 border-white/10 text-white max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Playlist</DialogTitle>
              <DialogDescription className="text-white/60">
                Give your playlist a name and optionally a description
              </DialogDescription>
            </DialogHeader>
            <CreatePlaylistForm 
              onClose={() => setShowCreatePlaylistModal(false)}
              onSuccess={() => {
                setPlaylists(getPlaylists());
                setShowCreatePlaylistModal(false);
              }}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Add to Playlist Modal */}
      {showAddToPlaylistModal && songToAddToPlaylist && (
        <Dialog open={showAddToPlaylistModal} onOpenChange={setShowAddToPlaylistModal}>
          <DialogContent className="bg-gray-900 border-white/10 text-white max-w-md">
            <DialogHeader>
              <DialogTitle>Add to Playlist</DialogTitle>
              <DialogDescription className="text-white/60">
                Select a playlist to add "{songToAddToPlaylist.title}" to
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-2 max-h-96 overflow-y-auto">
              {playlists.filter(p => !p.isSystem || p.id !== 'system-favorites' || !p.songIds.includes(songToAddToPlaylist.id)).map((playlist) => {
                const isInPlaylist = playlist.songIds.includes(songToAddToPlaylist.id);
                return (
                  <button
                    key={playlist.id}
                    onClick={() => {
                      if (!isInPlaylist) {
                        addSongToPlaylist(playlist.id, songToAddToPlaylist.id);
                        setPlaylists(getPlaylists());
                        setShowAddToPlaylistModal(false);
                        setSongToAddToPlaylist(null);
                      }
                    }}
                    disabled={isInPlaylist}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all text-left ${
                      isInPlaylist 
                        ? 'bg-white/5 opacity-50 cursor-not-allowed' 
                        : 'bg-white/5 hover:bg-white/10 cursor-pointer'
                    }`}
                  >
                    <div className="w-10 h-10 rounded bg-gradient-to-br from-purple-600/30 to-cyan-600/30 flex items-center justify-center flex-shrink-0">
                      {playlist.isSystem ? (
                        <span className="text-lg">
                          {playlist.id === 'system-favorites' ? '⭐' : 
                           playlist.id === 'system-recently-played' ? '🕐' : '🔥'}
                        </span>
                      ) : (
                        <MusicIcon className="w-5 h-5 text-white/50" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{playlist.name}</div>
                      <div className="text-xs text-white/40">{playlist.songIds.length} songs</div>
                    </div>
                    {isInPlaylist && (
                      <span className="text-xs text-green-400 flex items-center gap-1">
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        Added
                      </span>
                    )}
                  </button>
                );
              })}
              {playlists.length === 0 && (
                <div className="text-center py-8 text-white/60">
                  <p>No playlists yet</p>
                  <Button 
                    onClick={() => {
                      setShowAddToPlaylistModal(false);
                      setShowCreatePlaylistModal(true);
                    }}
                    className="mt-4 bg-gradient-to-r from-purple-500 to-pink-500"
                  >
                    Create Your First Playlist
                  </Button>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t border-white/10">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddToPlaylistModal(false);
                  setSongToAddToPlaylist(null);
                }}
                className="border-white/20 text-white hover:bg-white/10"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setShowAddToPlaylistModal(false);
                  setShowCreatePlaylistModal(true);
                }}
                className="bg-gradient-to-r from-purple-500 to-pink-500"
              >
                <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                New Playlist
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
