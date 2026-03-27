'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Song, Difficulty, GameMode } from '@/types/game';
import { useGameStore } from '@/lib/game/store';
import { getAllSongs, getAllSongsAsync, restoreSongUrls } from '@/lib/game/song-library';
import { 
  getPlaylists, 
  deletePlaylist, 
  addSongToPlaylist, 
  getPlaylistSongs,
  getPlaylistById,
  initializePlaylists,
  Playlist
} from '@/lib/playlist-manager';
import { SongHighscoreModal } from '@/components/results';
import { SongStartModal, StartOptions } from '@/components/library/song-start-modal';
import { CreatePlaylistForm } from '@/components/library/create-playlist-form';
import { SongCard } from '@/components/library/song-card';
import { LibraryFilters } from '@/components/library/library-filters';
import { PlaylistView } from '@/components/library/playlist-view';
import { FolderGridView } from '@/components/library/folder-grid-view';
import { logger } from '@/lib/logger';
// Hooks
import { useLibrarySettings, LibraryViewMode, LibraryGroupBy } from '@/hooks/use-library-settings';
import { useLibraryPreview } from '@/hooks/use-library-preview';
// Utils
import { groupSongs } from '@/lib/library-utils';

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
  
  // Handle folder navigation
  const handleOpenFolder = (folder: string) => {
    navigateToFolder(folder, [...folderBreadcrumb, folder]);
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

  // Handle sort change
  const handleSortChange = (sortBy: 'title' | 'artist' | 'dateAdded', sortOrder: 'asc' | 'desc') => {
    updateSettings({ sortBy, sortOrder });
  };

  // Handle view mode change with playlist reset
  const handleViewModeChange = (mode: LibraryViewMode) => {
    setViewMode(mode);
    if (mode !== 'playlists') {
      setSelectedPlaylist(null);
    }
  };

  // Handle group by change with playlist reset
  const handleGroupByChange = (newGroupBy: LibraryGroupBy) => {
    setGroupBy(newGroupBy);
    setSelectedPlaylist(null);
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
        <LibraryFilters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          sortBy={settings.sortBy}
          sortOrder={settings.sortOrder}
          onSortChange={handleSortChange}
          filterGenre={settings.filterGenre || 'all'}
          onFilterGenreChange={setFilterGenre}
          filterLanguage={settings.filterLanguage || 'all'}
          onFilterLanguageChange={setFilterLanguage}
          filterDuet={settings.filterDuet}
          onFilterDuetChange={setFilterDuet}
          viewMode={viewMode}
          groupBy={groupBy}
          onViewModeChange={handleViewModeChange}
          onGroupByChange={handleGroupByChange}
          availableGenres={availableGenres}
          availableLanguages={availableLanguages}
          folderBreadcrumb={folderBreadcrumb}
          onBreadcrumbClick={handleBreadcrumbClick}
          onClearFilters={() => updateSettings({ filterGenre: 'all', filterLanguage: 'all', filterDuet: false })}
        />
      )}

      {/* Song Grid or Folder View or Playlist View */}
      {!songsLoading && (
        <>
          {viewMode === 'playlists' ? (
            <PlaylistView
              playlists={playlists}
              selectedPlaylist={selectedPlaylist}
              loadedSongs={loadedSongs}
              previewSong={previewSong}
              onSelectPlaylist={setSelectedPlaylist}
              onDeselectPlaylist={() => setSelectedPlaylist(null)}
              onCreatePlaylist={() => setShowCreatePlaylistModal(true)}
              onDeletePlaylist={(id) => {
                deletePlaylist(id);
                setPlaylists(getPlaylists());
              }}
              onSongClick={handleSongClick}
              onPreviewStart={handlePreviewStart}
              onPreviewStop={handlePreviewStop}
              previewVideoRefs={previewVideoRefs}
              activeProfileId={activeProfileId}
              activeProfileName={activeProfile?.name || 'Player'}
              addToQueue={addToQueue}
              queueCount={queue.filter(q => q.playerId === activeProfileId).length}
              onUpdatePlaylists={setPlaylists}
              onUpdateSelectedPlaylist={setSelectedPlaylist}
            />
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
            <FolderGridView
              groupedSongs={groupedSongs}
              groupBy={groupBy}
              onOpenFolder={handleOpenFolder}
            />
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
                        <svg className="w-5 h-5 text-white/50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M9 18V5l12-2v13" />
                          <circle cx="6" cy="18" r="3" />
                          <circle cx="18" cy="16" r="3" />
                        </svg>
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
