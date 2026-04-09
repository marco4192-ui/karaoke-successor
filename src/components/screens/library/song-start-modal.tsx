'use client';

import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Song, GameMode } from '@/types/game';
import { SongStartModalProps } from './types';
import { MusicIcon, MicIcon, StarIcon, TrophyIcon, QueueIcon, PlayIcon } from './icons';
import { isDuetSong } from './utils';

export function SongStartModal({
  selectedSong,
  startOptions,
  setStartOptions,
  favoriteSongIds,
  activeProfileId,
  playerQueueCount,
  showSongModal,
  setShowSongModal,
  setShowHighscoreModal,
  setHighscoreSong,
  addToQueue,
  toggleFavorite,
  setPlaylists,
  getPlaylists,
  setShowAddToPlaylistModal,
  setSongToAddToPlaylist,
  onStartGame,
  profiles,
  highscores,
}: SongStartModalProps) {
  const isPartyMode = startOptions.partyMode && startOptions.partyMode !== 'standard' && startOptions.partyMode !== 'duel' && startOptions.partyMode !== 'duet';
  const songIsDuet = isDuetSong(selectedSong);

  // Auto-remove deactivated players from selection to prevent blocked slots
  useEffect(() => {
    const activeIds = new Set(profiles.filter(p => p.isActive !== false).map(p => p.id));
    const cleanedPlayers = startOptions.players.filter(id => activeIds.has(id));
    if (cleanedPlayers.length !== startOptions.players.length) {
      setStartOptions(prev => ({ ...prev, players: cleanedPlayers }));
    }
  }, [profiles, startOptions.players, setStartOptions]);
  
  const handleFavorite = () => {
    toggleFavorite(selectedSong.id);
    setPlaylists(getPlaylists());
    // Update favorite IDs
    const favs = new Set<string>();
    const allPlaylists = getPlaylists();
    const favorites = allPlaylists.find(p => p.id === 'system-favorites');
    if (favorites) {
      favorites.songIds.forEach(id => favs.add(id));
    }
    // Note: favoriteSongIds update is handled by parent via getPlaylists refresh
  };

  const handleAddToQueue = () => {
    if (activeProfileId) {
      addToQueue(selectedSong, activeProfileId, profiles.find(p => p.id === activeProfileId)?.name || 'Player');
    }
    setShowSongModal(false);
  };

  return (
    <Dialog open={showSongModal} onOpenChange={setShowSongModal}>
      <DialogContent className="bg-gray-900 border-white/10 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">{selectedSong.title}</DialogTitle>
          <DialogDescription className="text-white/60">{selectedSong.artist}</DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Cover Preview */}
          <div className="aspect-video rounded-lg overflow-hidden bg-gradient-to-br from-purple-600/30 to-blue-600/30">
            {selectedSong.coverImage ? (
              <img src={selectedSong.coverImage} alt={selectedSong.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <MusicIcon className="w-16 h-16 text-white/30" />
              </div>
            )}
          </div>
          
          {/* Difficulty Selection */}
          <div>
            <label className="text-sm text-white/60 mb-2 block">Difficulty</label>
            <div className="grid grid-cols-3 gap-2">
              {(['easy', 'medium', 'hard'] as const).map((diff) => (
                <button
                  key={diff}
                  onClick={() => setStartOptions(prev => ({ ...prev, difficulty: diff }))}
                  className={`py-3 rounded-lg font-medium transition-all ${
                    startOptions.difficulty === diff 
                      ? diff === 'easy' ? 'bg-green-500 text-white' 
                        : diff === 'medium' ? 'bg-yellow-500 text-black'
                        : 'bg-red-500 text-white'
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  <div className="text-sm font-bold">{diff.charAt(0).toUpperCase() + diff.slice(1)}</div>
                  <div className="text-xs opacity-70">
                    {diff === 'easy' ? '±2 Tones' : diff === 'medium' ? '±1 Tone' : 'Exact'}
                  </div>
                </button>
              ))}
            </div>
          </div>
          
          {/* Mode Selection */}
          <div>
            <label className="text-sm text-white/60 mb-2 block">Mode</label>
            {startOptions.partyMode ? (
              // Show party mode info
              <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">
                      {startOptions.partyMode === 'pass-the-mic' ? '🎤' :
                       startOptions.partyMode === 'companion-singalong' ? '📱' :
                       startOptions.partyMode === 'medley' ? '🎵' :
                       startOptions.partyMode === 'missing-words' ? '📝' :
                       startOptions.partyMode === 'blind' ? '🙈' : '🎮'}
                    </span>
                    <div>
                      <div className="font-bold text-white">
                        {startOptions.partyMode === 'pass-the-mic' ? 'Pass the Mic' :
                         startOptions.partyMode === 'companion-singalong' ? 'Companion Sing-A-Long' :
                         startOptions.partyMode === 'medley' ? 'Medley Contest' :
                         startOptions.partyMode === 'missing-words' ? 'Missing Words' :
                         startOptions.partyMode === 'blind' ? 'Blind Karaoke' : startOptions.partyMode}
                      </div>
                      <div className="text-xs text-white/60">Party Mode Active</div>
                    </div>
                  </div>
                  {/* Reset button to exit party mode */}
                  <button
                    onClick={() => setStartOptions(prev => ({ ...prev, partyMode: undefined, mode: 'single' }))}
                    className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white/60 hover:text-white transition-all"
                    title="Reset to Single Mode"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              </div>
            ) : (
              // Regular single/duel/duet selection
              // Duet mode only shows if song is a duet song
              // Single and Duel are hidden/grayed when Duet is available
              <div className={`grid ${songIsDuet ? 'grid-cols-1' : 'grid-cols-2'} gap-2`}>
                {/* Duet Mode - Only show for duet songs */}
                {songIsDuet ? (
                  <button
                    onClick={() => setStartOptions(prev => ({ ...prev, mode: 'duet' }))}
                    className={`py-3 rounded-lg font-medium transition-all ${
                      startOptions.mode === 'duet' 
                        ? 'bg-pink-500 text-white' 
                        : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
                  >
                    <span className="text-lg">🎭</span>
                    <div className="text-sm">Duet Mode</div>
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => setStartOptions(prev => ({ ...prev, mode: 'single' }))}
                      className={`py-3 rounded-lg font-medium transition-all ${
                        startOptions.mode === 'single' 
                          ? 'bg-cyan-500 text-white' 
                          : 'bg-white/10 text-white hover:bg-white/20'
                      }`}
                    >
                      <MicIcon className="w-5 h-5 mx-auto mb-1" />
                      <div className="text-sm">Single</div>
                    </button>
                    <button
                      onClick={() => setStartOptions(prev => ({ ...prev, mode: 'duel' }))}
                      className={`py-3 rounded-lg font-medium transition-all ${
                        startOptions.mode === 'duel' 
                          ? 'bg-purple-500 text-white' 
                          : 'bg-white/10 text-white hover:bg-white/20'
                      }`}
                    >
                      <span className="text-lg">⚔️</span>
                      <div className="text-sm">Duel</div>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
          
          {/* Player Selection (for Single mode) */}
          {!startOptions.partyMode && startOptions.mode === 'single' && profiles.filter(p => p.isActive !== false).length > 1 && (
            <div>
              <label className="text-sm text-white/60 mb-2 block">Select Player</label>
              <div className={`grid grid-cols-2 gap-2 ${profiles.filter(p => p.isActive !== false).length > 6 ? 'max-h-48 overflow-y-auto pr-1' : ''}`}>
                {profiles.filter(p => p.isActive !== false).map((profile) => (
                  <button
                    key={profile.id}
                    onClick={() => setStartOptions(prev => ({ ...prev, players: [profile.id] }))}
                    className={`flex items-center gap-2 p-2 rounded-lg transition-all ${
                      startOptions.players[0] === profile.id 
                        ? 'bg-cyan-500 text-white' 
                        : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
                  >
                    <div 
                      className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                      style={{ backgroundColor: profile.color }}
                    >
                      {profile.avatar ? (
                        <img src={profile.avatar} alt={profile.name} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        profile.name[0]
                      )}
                    </div>
                    <span className="text-sm truncate">{profile.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Player Selection (for Duel mode) */}
          {!startOptions.partyMode && startOptions.mode === 'duel' && profiles.filter(p => p.isActive !== false).length >= 2 && (
            <div>
              <label className="text-sm text-white/60 mb-2 block">Select 2 Players ({profiles.filter(p => p.isActive !== false).length} available)</label>
              <div className={`grid grid-cols-2 gap-2 ${profiles.filter(p => p.isActive !== false).length > 6 ? 'max-h-48 overflow-y-auto pr-1' : ''}`}>
                {profiles.filter(p => p.isActive !== false).map((profile) => (
                  <button
                    key={profile.id}
                    onClick={() => {
                      const players = startOptions.players.includes(profile.id)
                        ? startOptions.players.filter(id => id !== profile.id)
                        : startOptions.players.length < 2
                          ? [...startOptions.players, profile.id]
                          : startOptions.players;
                      setStartOptions(prev => ({ ...prev, players }));
                    }}
                    className={`flex items-center gap-2 p-2 rounded-lg transition-all ${
                      startOptions.players.includes(profile.id) 
                        ? 'bg-purple-500 text-white' 
                        : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
                  >
                    <div 
                      className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                      style={{ backgroundColor: profile.color }}
                    >
                      {profile.avatar ? (
                        <img src={profile.avatar} alt={profile.name} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        profile.name[0]
                      )}
                    </div>
                    <span className="text-sm truncate">{profile.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Player Selection (for Party Games) */}
          {startOptions.partyMode && profiles.filter(p => p.isActive !== false).length >= 1 && (
            <div>
              <label className="text-sm text-white/60 mb-2 block">
                Select Players ({startOptions.partyMode === 'pass-the-mic' ? '2-8' :
                                startOptions.partyMode === 'medley' ? '1-4' :
                                startOptions.partyMode === 'missing-words' ? '1-4' :
                                startOptions.partyMode === 'blind' ? '1-4' : '1-8'} players)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-40 overflow-y-auto pr-1">
                {profiles.filter(p => p.isActive !== false).map((profile) => (
                  <button
                    key={profile.id}
                    onClick={() => {
                      const players = startOptions.players.includes(profile.id)
                        ? startOptions.players.filter(id => id !== profile.id)
                        : [...startOptions.players, profile.id];
                      setStartOptions(prev => ({ ...prev, players }));
                    }}
                    className={`flex items-center gap-2 p-2 rounded-lg transition-all ${
                      startOptions.players.includes(profile.id) 
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white' 
                        : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
                  >
                    <div 
                      className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                      style={{ backgroundColor: profile.color }}
                    >
                      {profile.avatar ? (
                        <img src={profile.avatar} alt={profile.name} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        profile.name[0]
                      )}
                    </div>
                    <span className="text-sm truncate">{profile.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {/* Player Selection (for Duet mode) — shows P1/P2 part info and allows swapping */}
          {!startOptions.partyMode && startOptions.mode === 'duet' && profiles.filter(p => p.isActive !== false).length >= 2 && (
            <div>
              <label className="text-sm text-white/60 mb-2 block">
                Select 2 Players — {selectedSong.duetPlayerNames?.[0] || 'Part 1'} & {selectedSong.duetPlayerNames?.[1] || 'Part 2'}
              </label>
              {startOptions.players.length === 2 && (
                <div className="flex items-center justify-center gap-2 mb-3">
                  <div className="text-xs text-pink-300 font-medium px-3 py-1 rounded-full bg-pink-500/20">
                    {profiles.find(p => p.id === startOptions.players[0])?.name || 'Player 1'} → {selectedSong.duetPlayerNames?.[0] || 'P1'}
                  </div>
                  <button
                    onClick={() => setStartOptions(prev => ({ ...prev, players: [prev.players[1], prev.players[0]] }))}
                    className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/60 hover:text-white transition-all"
                    title="Swap P1 / P2"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M7 16l-4-4 4-4M17 8l4 4-4 4M3 12h18" />
                    </svg>
                  </button>
                  <div className="text-xs text-purple-300 font-medium px-3 py-1 rounded-full bg-purple-500/20">
                    {profiles.find(p => p.id === startOptions.players[1])?.name || 'Player 2'} → {selectedSong.duetPlayerNames?.[1] || 'P2'}
                  </div>
                </div>
              )}
              <div className={`grid grid-cols-2 gap-2 ${profiles.filter(p => p.isActive !== false).length > 6 ? 'max-h-48 overflow-y-auto pr-1' : ''}`}>
                {profiles.filter(p => p.isActive !== false).map((profile) => {
                  const playerIndex = startOptions.players.indexOf(profile.id);
                  const isP1 = playerIndex === 0;
                  const isP2 = playerIndex === 1;
                  return (
                    <button
                      key={profile.id}
                      onClick={() => {
                        const players = startOptions.players.includes(profile.id)
                          ? startOptions.players.filter(id => id !== profile.id)
                          : startOptions.players.length < 2
                            ? [...startOptions.players, profile.id]
                            : startOptions.players;
                        setStartOptions(prev => ({ ...prev, players }));
                      }}
                      className={`flex items-center gap-2 p-2 rounded-lg transition-all ${
                        isP1
                          ? 'bg-pink-500 text-white ring-1 ring-pink-300'
                          : isP2
                            ? 'bg-purple-500 text-white ring-1 ring-purple-300'
                            : 'bg-white/10 text-white hover:bg-white/20'
                      }`}
                    >
                      <div 
                        className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                        style={{ backgroundColor: profile.color }}
                      >
                        {profile.avatar ? (
                          <img src={profile.avatar} alt={profile.name} className="w-full h-full rounded-full object-cover" />
                        ) : (
                          profile.name[0]
                        )}
                      </div>
                      <div className="flex flex-col items-start min-w-0">
                        <span className="text-sm truncate">{profile.name}</span>
                        {isP1 && <span className="text-[10px] opacity-70">{selectedSong.duetPlayerNames?.[0] || 'Part 1'}</span>}
                        {isP2 && <span className="text-[10px] opacity-70">{selectedSong.duetPlayerNames?.[1] || 'Part 2'}</span>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          
          {/* Song Info */}
          <div className="text-xs text-white/40 space-y-1">
            <p>BPM: {selectedSong.bpm} | Duration: {Math.floor(selectedSong.duration / 60000)}:{String(Math.floor((selectedSong.duration % 60000) / 1000)).padStart(2, '0')}</p>
            {selectedSong.genre && <p>Genre: {selectedSong.genre}</p>}
          </div>

          {/* Local Highscore Preview */}
          {(() => {
            const songScores = highscores.filter(h => h.songId === selectedSong.id).sort((a, b) => b.score - a.score);
            const topScore = songScores[0];
            if (topScore) {
              return (
                <div className="bg-white/5 rounded-lg p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrophyIcon className="w-4 h-4 text-yellow-400" />
                    <span className="text-sm text-white/60">Your Best:</span>
                    <span className="text-sm font-bold text-cyan-400">{topScore.score.toLocaleString()}</span>
                    <span className="text-xs text-white/40">({topScore.accuracy.toFixed(1)}%)</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-purple-400 hover:text-purple-300"
                    onClick={() => {
                      setHighscoreSong(selectedSong);
                      setShowHighscoreModal(true);
                    }}
                  >
                    View All →
                  </Button>
                </div>
              );
            }
            return null;
          })()}
        </div>
        
        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          {/* Favorite Button */}
          <Button 
            variant="outline" 
            onClick={handleFavorite}
            className={favoriteSongIds.has(selectedSong.id) 
              ? "bg-yellow-500/20 border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/30" 
              : "border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10"
            }
          >
            <StarIcon className="w-4 h-4 mr-2" filled={favoriteSongIds.has(selectedSong.id)} />
            {favoriteSongIds.has(selectedSong.id) ? 'Favorited' : 'Favorite'}
          </Button>
          <Button 
            variant="outline" 
            onClick={() => {
              setHighscoreSong(selectedSong);
              setShowHighscoreModal(true);
            }}
            className="border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10"
          >
            <TrophyIcon className="w-4 h-4 mr-2" /> Scores
          </Button>
          <Button 
            variant="outline" 
            onClick={handleAddToQueue}
            disabled={!activeProfileId || playerQueueCount >= 3}
            className="border-purple-500/50 text-purple-400 hover:bg-purple-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <QueueIcon className="w-4 h-4 mr-2" /> Queue {!activeProfileId && '(Select Player)'}
          </Button>
          <Button 
            variant="outline" 
            onClick={() => {
              setSongToAddToPlaylist(selectedSong);
              setShowAddToPlaylistModal(true);
            }}
            className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10"
          >
            <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 18V5l12-2v13" />
              <circle cx="6" cy="18" r="3" />
              <circle cx="18" cy="16" r="3" />
            </svg>
            Add to Playlist
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setShowSongModal(false)}
            className="border-white/20 text-white hover:bg-white/10"
          >
            Cancel
          </Button>
          <Button 
            onClick={onStartGame}
            disabled={
              // Single mode: need player selection if multiple profiles
              (startOptions.mode === 'single' && 
               profiles.filter(p => p.isActive !== false).length > 1 && 
               startOptions.players.length === 0) ||
              // Duet mode: need 2 players selected
              (startOptions.mode === 'duet' && 
               startOptions.players.length < 2) ||
              // Duel mode: need 2 players selected
              (startOptions.mode === 'duel' && 
               startOptions.players.length < 2)
            }
            className="flex-1 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <PlayIcon className="w-4 h-4 mr-2" /> Start
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
