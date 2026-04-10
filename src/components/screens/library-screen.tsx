'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Song, Difficulty, GameMode } from '@/types/game';
import { useGameStore } from '@/lib/game/store';
import { getAllSongs, getAllSongsAsync, getSongByIdWithLyrics, ensureSongUrls } from '@/lib/game/song-library';
import { 
  getPlaylists, 
  deletePlaylist, 
  removeSongFromPlaylist, 
  getPlaylistById,
  toggleFavorite,
  initializePlaylists,
  Playlist
} from '@/lib/playlist-manager';
import { SongHighscoreModal } from './results-screen';

// Extracted components
import { SongCard } from './library/song-card';
import { SongStartModal } from './library/song-start-modal';
import { PlaylistView } from './library/playlist-view';
import { AddToPlaylistModal } from './library/add-to-playlist-modal';
import { CreatePlaylistModal } from './library/create-playlist-modal';
import { LibraryFilters } from './library/library-filters';
import { FolderView } from './library/folder-view';
import { SongCardProps, LibraryViewMode, LibraryGroupBy, LibrarySettings, StartOptions } from './library/types';
import { groupSongs, getGroupDisplayName } from './library/utils';
import { useLibraryFilters } from '@/hooks/use-library-filters';
import { useLibraryPreview } from '@/hooks/use-library-preview';

export function LibraryScreen({ onSelectSong, initialGameMode }: { onSelectSong: (song: Song) => void; initialGameMode?: GameMode }) {
  // Core state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [showSongModal, setShowSongModal] = useState(false);
  const [showHighscoreModal, setShowHighscoreModal] = useState(false);
  const [highscoreSong, setHighscoreSong] = useState<Song | null>(null);
  const [songsLoading, setSongsLoading] = useState(true);
  const [loadedSongs, setLoadedSongs] = useState<Song[]>([]);
  const [customYoutubeId, setCustomYoutubeId] = useState<string | null>(null);
  
  const { setDifficulty, gameState, addToQueue, queue, activeProfileId, profiles, setGameMode, highscores, setActiveProfile, addPlayer } = useGameStore();
  const storeDifficulty = gameState.difficulty;
  
  // View state
  const [viewMode, setViewMode] = useState<LibraryViewMode>('grid');
  const [groupBy, setGroupBy] = useState<LibraryGroupBy>('none');
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [folderBreadcrumb, setFolderBreadcrumb] = useState<string[]>([]);
  
  // Playlist state
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [showCreatePlaylistModal, setShowCreatePlaylistModal] = useState(false);
  const [showAddToPlaylistModal, setShowAddToPlaylistModal] = useState(false);
  const [songToAddToPlaylist, setSongToAddToPlaylist] = useState<Song | null>(null);
  const [favoriteSongIds, setFavoriteSongIds] = useState<Set<string>>(new Set());
  
  // Preview hook
  const { previewSong, previewVideoRefs, handlePreviewStart, handlePreviewStop } = useLibraryPreview();
  
  // Settings state with localStorage persistence
  const [settings, setSettings] = useState<LibrarySettings>({
    sortBy: 'title', sortOrder: 'asc', filterDifficulty: 'all',
    filterGenre: 'all', filterLanguage: 'all', filterDuet: false,
  });
  const [startOptions, setStartOptions] = useState<StartOptions>(() => {
    const isPartyMode = initialGameMode && initialGameMode !== 'standard' && initialGameMode !== 'duel' && initialGameMode !== 'duet';
    return {
      difficulty: storeDifficulty,
      mode: initialGameMode === 'duel' ? 'duel' : initialGameMode === 'duet' ? 'duet' : 'single',
      players: [],
      partyMode: isPartyMode ? initialGameMode : undefined,
    };
  });

  // --- Effects ---
  useEffect(() => { initializePlaylists(); setPlaylists(getPlaylists()); }, []);
  
  const updateFavoriteIds = useCallback(() => {
    const favs = new Set<string>();
    const favorites = getPlaylists().find(p => p.id === 'system-favorites');
    if (favorites) favorites.songIds.forEach(id => favs.add(id));
    setFavoriteSongIds(favs);
  }, []);
  
  useEffect(() => { if (viewMode === 'playlists') { setPlaylists(getPlaylists()); updateFavoriteIds(); } }, [viewMode, updateFavoriteIds]);
  
  useEffect(() => {
    const loadSongs = async () => {
      setSongsLoading(true);
      try { setLoadedSongs(await getAllSongsAsync()); }
      catch { setLoadedSongs(getAllSongs()); }
      finally { setSongsLoading(false); }
    };
    loadSongs();
  }, []);
  
  useEffect(() => { setStartOptions(prev => ({ ...prev, difficulty: storeDifficulty })); }, [storeDifficulty]);
  
  useEffect(() => {
    const saved = localStorage.getItem('karaoke-default-difficulty');
    if (saved === 'easy' || saved === 'medium' || saved === 'hard') {
      if (storeDifficulty === 'medium') setStartOptions(prev => ({ ...prev, difficulty: saved }));
    }
  }, [storeDifficulty]);

  useEffect(() => {
    const saved = localStorage.getItem('karaoke-library-settings');
    if (saved) try { setSettings(prev => ({ ...prev, ...JSON.parse(saved) })); } catch {}
  }, []);
  
  useEffect(() => { localStorage.setItem('karaoke-library-settings', JSON.stringify(settings)); }, [settings]);
  
  useEffect(() => {
    const handler = () => {
      const saved = localStorage.getItem('karaoke-default-difficulty');
      if (saved === 'easy' || saved === 'medium' || saved === 'hard')
        setStartOptions(prev => ({ ...prev, difficulty: saved as Difficulty }));
    };
    window.addEventListener('storage', handler);
    window.addEventListener('settingsChange', handler);
    return () => { window.removeEventListener('storage', handler); window.removeEventListener('settingsChange', handler); };
  }, []);

  // --- Computed values ---
  const { filteredSongs, availableGenres, availableLanguages } = useLibraryFilters({ loadedSongs, searchQuery, settings, startMode: startOptions.mode });
  
  const groupedSongs = useMemo(() => {
    if (groupBy === 'none' || viewMode === 'grid') return new Map<string, Song[]>();
    return groupSongs(filteredSongs, groupBy);
  }, [filteredSongs, groupBy, viewMode]);
  
  const currentFolderSongs = useMemo(() => {
    if (!currentFolder || groupBy === 'none') return filteredSongs;
    return groupedSongs.get(currentFolder) || [];
  }, [currentFolder, groupBy, filteredSongs, groupedSongs]);
  
  const activeProfile = profiles.find(p => p.id === activeProfileId);
  const playerQueueCount = queue.filter(item => item.playerId === activeProfileId).length;
  const isPartyMode = initialGameMode && initialGameMode !== 'standard' && initialGameMode !== 'duel' && initialGameMode !== 'duet';

  // --- Handlers ---
  const handleClearFolder = () => { setCurrentFolder(null); setFolderBreadcrumb([]); setSelectedPlaylist(null); };
  
  const handleBreadcrumbClick = (index: number) => {
    if (index === -1) { setCurrentFolder(null); setFolderBreadcrumb([]); }
    else { setCurrentFolder(folderBreadcrumb[index]); setFolderBreadcrumb(folderBreadcrumb.slice(0, index + 1)); }
  };

  const handleSongClick = (song: Song) => {
    setSelectedSong(song);
    // Use the user's global default difficulty (from the store, which
    // reflects the Settings → Default Difficulty choice) instead of the
    // per-song difficulty, so that the global setting is actually applied.
    setStartOptions({ difficulty: gameState.difficulty, mode: initialGameMode === 'duel' ? 'duel' : 'single', players: activeProfileId ? [activeProfileId] : [], partyMode: isPartyMode ? initialGameMode : undefined });
    setShowSongModal(true);
  };

  const handleStartGame = async () => {
    if (!selectedSong) return;
    let songWithLyrics = await getSongByIdWithLyrics(selectedSong.id) || selectedSong;
    const songWithUrls = await ensureSongUrls(songWithLyrics);
    const activeProfiles = profiles.filter(p => p.isActive !== false);
    
    if (startOptions.mode === 'single' && !startOptions.partyMode && activeProfiles.length > 1) {
      if (startOptions.players.length === 0) return;
      setActiveProfile(startOptions.players[0]);
    }
    if (startOptions.mode === 'duel' && startOptions.players.length < 2) return;
    if (startOptions.mode === 'duet' && startOptions.players.length < 2) return;
    
    const addPlayers = (playerIds: string[]) => playerIds.forEach(id => { const p = profiles.find(x => x.id === id); if (p && p.isActive !== false) addPlayer(p); });
    if (startOptions.partyMode && startOptions.players.length > 0) addPlayers(startOptions.players);
    else if (startOptions.mode === 'single') { const pid = startOptions.players[0] || activeProfileId; if (pid) addPlayers([pid]); }
    else if ((startOptions.mode === 'duel' || startOptions.mode === 'duet') && startOptions.players.length >= 2) addPlayers(startOptions.players);
    
    setDifficulty(startOptions.difficulty);
    setGameMode(startOptions.partyMode || startOptions.mode === 'duel' ? 'duel' : startOptions.mode === 'duet' ? 'duet' : 'standard');
    if (startOptions.partyMode) setGameMode(startOptions.partyMode);
    setShowSongModal(false);
    
    onSelectSong(customYoutubeId ? { ...songWithUrls, videoBackground: `https://www.youtube.com/watch?v=${customYoutubeId}`, youtubeId: customYoutubeId } : songWithUrls);
  };

  const handlePlaylistDelete = (id: string) => { deletePlaylist(id); setPlaylists(getPlaylists()); };
  const handleRemoveSongFromPlaylist = (pid: string, sid: string) => { removeSongFromPlaylist(pid, sid); setPlaylists(getPlaylists()); setSelectedPlaylist(getPlaylistById(pid)); };

  const songCardBaseProps: Omit<SongCardProps, 'song'> = { previewSong, onSongClick: handleSongClick, onPreviewStart: handlePreviewStart, onPreviewStop: handlePreviewStop, previewVideoRefs };

  // --- Render ---
  return (
    <div className="w-full px-4 md:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Music Library</h1>
        <p className="text-white/60">{songsLoading ? 'Loading songs...' : `${loadedSongs.length} songs available`}</p>
      </div>

      {songsLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full mr-3" />
          <span className="text-white/60">Loading songs...</span>
        </div>
      )}

      {!songsLoading && (
        <LibraryFilters
          searchQuery={searchQuery} setSearchQuery={setSearchQuery}
          settings={settings} setSettings={setSettings}
          viewMode={viewMode} groupBy={groupBy}
          availableGenres={availableGenres} availableLanguages={availableLanguages}
          onSetViewMode={(mode) => { if (mode !== 'folder') setSelectedPlaylist(null); setViewMode(mode); }}
          onSetGroupBy={setGroupBy} onClearFolder={handleClearFolder}
          folderBreadcrumb={folderBreadcrumb} onBreadcrumbClick={handleBreadcrumbClick}
          getGroupDisplayName={(key) => getGroupDisplayName(key, groupBy)}
          startMode={startOptions.mode}
          onResetStartMode={() => setStartOptions(prev => ({ ...prev, mode: 'single' }))}
        />
      )}

      {!songsLoading && (
        <>
          {viewMode === 'playlists' ? (
            <PlaylistView
              playlists={playlists} selectedPlaylist={selectedPlaylist} loadedSongs={loadedSongs}
              onPlaylistSelect={setSelectedPlaylist} onPlaylistDelete={handlePlaylistDelete}
              onRemoveSongFromPlaylist={handleRemoveSongFromPlaylist} onSongClick={handleSongClick}
              onShowCreatePlaylist={() => setShowCreatePlaylistModal(true)}
              songCardProps={songCardBaseProps} activeProfileId={activeProfileId}
              playerQueueCount={playerQueueCount} addToQueue={addToQueue}
              activeProfileName={activeProfile?.name || 'Player'}
            />
          ) : filteredSongs.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-white/60 mb-4">No songs found</p>
              <p className="text-white/40 text-sm">Try a different search or import some songs</p>
            </div>
          ) : viewMode === 'grid' || (viewMode === 'folder' && currentFolder) ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4">
              {currentFolderSongs.map((song) => <SongCard key={song.id} song={song} {...songCardBaseProps} />)}
            </div>
          ) : (
            <FolderView
              groupedSongs={groupedSongs} groupBy={groupBy}
              onOpenFolder={(f) => { setCurrentFolder(f); setFolderBreadcrumb(prev => [...prev, f]); }}
              getGroupDisplayName={(key) => getGroupDisplayName(key, groupBy)}
            />
          )}
        </>
      )}

      {showSongModal && selectedSong && (
        <SongStartModal
          selectedSong={selectedSong} startOptions={startOptions} setStartOptions={setStartOptions}
          favoriteSongIds={favoriteSongIds} activeProfileId={activeProfileId} playerQueueCount={playerQueueCount}
          showSongModal={showSongModal} setShowSongModal={setShowSongModal}
          setShowHighscoreModal={setShowHighscoreModal} setHighscoreSong={setHighscoreSong}
          addToQueue={addToQueue} toggleFavorite={toggleFavorite}
          setPlaylists={setPlaylists} getPlaylists={getPlaylists}
          setShowAddToPlaylistModal={setShowAddToPlaylistModal} setSongToAddToPlaylist={setSongToAddToPlaylist}
          onStartGame={handleStartGame} profiles={profiles} highscores={highscores}
        />
      )}

      {highscoreSong && (
        <SongHighscoreModal song={highscoreSong} isOpen={showHighscoreModal} onClose={() => { setShowHighscoreModal(false); setHighscoreSong(null); }} />
      )}

      <CreatePlaylistModal
        show={showCreatePlaylistModal} onClose={setShowCreatePlaylistModal}
        onSuccess={() => { setPlaylists(getPlaylists()); updateFavoriteIds(); }}
      />

      <AddToPlaylistModal
        show={showAddToPlaylistModal}
        onClose={(open) => { setShowAddToPlaylistModal(open); if (!open) setSongToAddToPlaylist(null); }}
        song={songToAddToPlaylist} playlists={playlists}
        onSongAdded={() => { setPlaylists(getPlaylists()); updateFavoriteIds(); }}
        onCreateNewPlaylist={() => setShowCreatePlaylistModal(true)}
      />
    </div>
  );
}
