'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Song } from '@/types/game';
import { SongStartModalProps } from './types';
import { MusicIcon, MicIcon, StarIcon, TrophyIcon, QueueIcon, PlayIcon } from './icons';
import { isDuetSong } from './utils';

// ===================== MIC SELECTOR (Single mode) =====================
function useSavedMics() {
  const [savedMics, setSavedMics] = useState<Array<{ id: string; customName: string; deviceName: string }>>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('karaoke-multi-mic-config');
      if (saved) {
        const parsed = JSON.parse(saved);
        setSavedMics((parsed.assignedMics || []).map((m: any) => ({
          id: m.id,
          customName: m.customName,
          deviceName: m.deviceName,
        })));
      }
    } catch { /* ignore */ }
  }, []);

  return savedMics;
}

function MicSelector({ micId, onMicChange }: { micId?: string; onMicChange: (id: string | undefined) => void }) {
  const savedMics = useSavedMics();

  if (savedMics.length === 0) return null;

  return (
    <div>
      <label className="text-xs text-white/60 mb-1 block">🎤 Mikrofon zuweisen</label>
      <select
        value={micId || ''}
        onChange={(e) => onMicChange(e.target.value || undefined)}
        className="w-full bg-gray-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
      >
        <option value="">— Automatisch —</option>
        {savedMics.map(mic => (
          <option key={mic.id} value={mic.id}>
            {mic.customName || mic.deviceName}
          </option>
        ))}
      </select>
    </div>
  );
}

// ===================== DUAL MIC SELECTOR (Duel/Duet mode) =====================
function DualMicSelector({
  p1Id, p2Id, profiles,
  micIdP1, micIdP2,
  onMicP1Change, onMicP2Change,
  p1Label, p2Label,
}: {
  p1Id: string; p2Id: string;
  profiles: { id: string; name: string; color: string; avatar?: string }[];
  micIdP1?: string; micIdP2?: string;
  onMicP1Change: (id: string | undefined) => void;
  onMicP2Change: (id: string | undefined) => void;
  p1Label?: string; p2Label?: string;
}) {
  const savedMics = useSavedMics();

  if (savedMics.length === 0) return null;

  const p1Profile = profiles.find(p => p.id === p1Id);
  const p2Profile = profiles.find(p => p.id === p2Id);

  return (
    <div>
      <label className="text-xs text-white/40 mb-2 block">🎤 Mikrofon-Zuweisung</label>
      <div className="grid grid-cols-2 gap-3">
        {/* Player 1 */}
        <div className="bg-white/5 rounded-lg p-3 space-y-2">
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
              style={{ backgroundColor: p1Profile?.color || '#888' }}
            >
              {p1Profile?.avatar ? (
                <img src={p1Profile.avatar} alt="" className="w-full h-full rounded-full object-cover" />
              ) : p1Profile?.name?.[0] || '?'}
            </div>
            <span className="text-sm font-medium truncate">{p1Profile?.name || 'Player 1'}</span>
            {p1Label && <span className="text-[10px] text-cyan-400 ml-auto">{p1Label}</span>}
          </div>
          <select
            value={micIdP1 || ''}
            onChange={(e) => onMicP1Change(e.target.value || undefined)}
            className="w-full bg-gray-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
          >
            <option value="">— Automatisch —</option>
            {savedMics.map(mic => (
              <option key={mic.id} value={mic.id}>
                {mic.customName || mic.deviceName}
              </option>
            ))}
          </select>
        </div>
        {/* Player 2 */}
        <div className="bg-white/5 rounded-lg p-3 space-y-2">
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
              style={{ backgroundColor: p2Profile?.color || '#888' }}
            >
              {p2Profile?.avatar ? (
                <img src={p2Profile.avatar} alt="" className="w-full h-full rounded-full object-cover" />
              ) : p2Profile?.name?.[0] || '?'}
            </div>
            <span className="text-sm font-medium truncate">{p2Profile?.name || 'Player 2'}</span>
            {p2Label && <span className="text-[10px] text-purple-400 ml-auto">{p2Label}</span>}
          </div>
          <select
            value={micIdP2 || ''}
            onChange={(e) => onMicP2Change(e.target.value || undefined)}
            className="w-full bg-gray-800 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
          >
            <option value="">— Automatisch —</option>
            {savedMics.map(mic => (
              <option key={mic.id} value={mic.id}>
                {mic.customName || mic.deviceName}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

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

  // Auto-fix mode mismatch: if current mode is duet/duel but song is not a duet, reset to single
  useEffect(() => {
    if (!startOptions.partyMode && !songIsDuet && (startOptions.mode === 'duet')) {
      setStartOptions(prev => ({ ...prev, mode: 'single', players: [] }));
    }
  }, [songIsDuet, startOptions.partyMode, startOptions.mode, setStartOptions]);

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
    // Use the selected player from startOptions, NOT activeProfileId
    const selectedPlayerId = startOptions.players[0] || activeProfileId;
    if (selectedPlayerId) {
      const selectedProfile = profiles.find(p => p.id === selectedPlayerId);
      const partnerId = startOptions.players[1] || undefined;
      const partnerProfile = partnerId ? profiles.find(p => p.id === partnerId) : undefined;

      addToQueue(selectedSong, selectedPlayerId, selectedProfile?.name || 'Player', {
        partnerId,
        partnerName: partnerProfile?.name,
        gameMode: startOptions.mode === 'duel' ? 'duel' 
                 : startOptions.mode === 'duet' ? 'duet' 
                 : 'single',
      });
    }
    setShowSongModal(false);
  };

  // Determine which player sections are visible to decide if player area needs scrolling
  const activeProfiles = profiles.filter(p => p.isActive !== false);
  const needsPlayerScroll = activeProfiles.length > 6;

  return (
    <Dialog open={showSongModal} onOpenChange={setShowSongModal}>
      <DialogContent className="bg-gray-900 border-white/10 text-white max-w-xl max-h-[92vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-lg">{selectedSong.title}</DialogTitle>
          <DialogDescription className="text-white/60">{selectedSong.artist}</DialogDescription>
        </DialogHeader>
        
        {/* Cover + info row */}
        <div className="flex items-center gap-4 flex-shrink-0">
          <div className="w-28 h-20 rounded-lg overflow-hidden bg-gradient-to-br from-purple-600/30 to-blue-600/30 flex-shrink-0">
            {selectedSong.coverImage ? (
              <img src={selectedSong.coverImage} alt={selectedSong.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <MusicIcon className="w-10 h-10 text-white/30" />
              </div>
            )}
          </div>
          <div className="text-sm text-white/40 space-y-0.5 min-w-0">
            <p>BPM: {selectedSong.bpm} | Duration: {Math.floor(selectedSong.duration / 60000)}:{String(Math.floor((selectedSong.duration % 60000) / 1000)).padStart(2, '0')}</p>
            {selectedSong.genre && <p>Genre: {selectedSong.genre}</p>}
          </div>
          {/* Local Highscore Preview */}
          {(() => {
            const songScores = highscores.filter(h => h.songId === selectedSong.id).sort((a, b) => b.score - a.score);
            const topScore = songScores[0];
            if (topScore) {
              return (
                <button
                  className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors flex-shrink-0"
                  onClick={() => { setHighscoreSong(selectedSong); setShowHighscoreModal(true); }}
                >
                  <TrophyIcon className="w-4 h-4 text-yellow-400" />
                  <span className="text-base font-bold text-cyan-400">{topScore.score.toLocaleString()}</span>
                  <span className="text-xs text-white/40">{topScore.accuracy.toFixed(1)}%</span>
                </button>
              );
            }
            return null;
          })()}
        </div>

        <div className="space-y-3 py-2 overflow-hidden flex-1 min-h-0">
          {/* Difficulty + Mode row (compact side-by-side) */}
          <div className="grid grid-cols-2 gap-3 flex-shrink-0">
            {/* Difficulty Selection */}
            <div>
              <label className="text-xs text-white/60 mb-1 block">Difficulty</label>
              <div className="grid grid-cols-3 gap-1">
                {(['easy', 'medium', 'hard'] as const).map((diff) => (
                  <button
                    key={diff}
                    onClick={() => setStartOptions(prev => ({ ...prev, difficulty: diff }))}
                    className={`py-1.5 rounded-md text-xs font-medium transition-all ${
                      startOptions.difficulty === diff 
                        ? diff === 'easy' ? 'bg-green-500 text-white' 
                          : diff === 'medium' ? 'bg-yellow-500 text-black'
                          : 'bg-red-500 text-white'
                        : 'bg-white/10 text-white hover:bg-white/20'
                    }`}
                  >
                    <div className="font-bold">{diff.charAt(0).toUpperCase() + diff.slice(1)}</div>
                  </button>
                ))}
              </div>
            </div>
            
            {/* Mode Selection */}
            <div>
              <label className="text-xs text-white/60 mb-1 block">Mode</label>
              {startOptions.partyMode ? (
                <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-md p-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">
                        {startOptions.partyMode === 'pass-the-mic' ? '🎤' :
                         startOptions.partyMode === 'companion-singalong' ? '📱' :
                         startOptions.partyMode === 'medley' ? '🎵' :
                         startOptions.partyMode === 'missing-words' ? '📝' :
                         startOptions.partyMode === 'blind' ? '🙈' : '🎮'}
                      </span>
                      <div>
                        <div className="font-bold text-white text-xs">
                          {startOptions.partyMode === 'pass-the-mic' ? 'Pass the Mic' :
                           startOptions.partyMode === 'companion-singalong' ? 'Companion Sing-A-Long' :
                           startOptions.partyMode === 'medley' ? 'Medley Contest' :
                           startOptions.partyMode === 'missing-words' ? 'Missing Words' :
                           startOptions.partyMode === 'blind' ? 'Blind Karaoke' : startOptions.partyMode}
                        </div>
                        <div className="text-[10px] text-white/60">Party Mode Active</div>
                      </div>
                    </div>
                    <button
                      onClick={() => setStartOptions(prev => ({ ...prev, partyMode: undefined, mode: 'single' }))}
                      className="p-1 rounded-md bg-white/10 hover:bg-white/20 text-white/60 hover:text-white transition-all"
                      title="Reset to Single Mode"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                </div>
              ) : (
                <div className={`grid ${songIsDuet ? 'grid-cols-1' : 'grid-cols-2'} gap-1`}>
                  {songIsDuet ? (
                    <button
                      onClick={() => setStartOptions(prev => ({ ...prev, mode: 'duet' }))}
                      className={`py-1.5 rounded-md text-xs font-medium transition-all ${
                        startOptions.mode === 'duet' 
                          ? 'bg-pink-500 text-white' 
                          : 'bg-white/10 text-white hover:bg-white/20'
                      }`}
                    >
                      <span className="text-sm">🎭</span> Duet Mode
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => setStartOptions(prev => ({ ...prev, mode: 'single' }))}
                        className={`py-1.5 rounded-md text-xs font-medium transition-all ${
                          startOptions.mode === 'single' 
                            ? 'bg-cyan-500 text-white' 
                            : 'bg-white/10 text-white hover:bg-white/20'
                        }`}
                      >
                        <MicIcon className="w-3.5 h-3.5 inline mr-1" />Single
                      </button>
                      <button
                        onClick={() => setStartOptions(prev => ({ ...prev, mode: 'duel' }))}
                        className={`py-1.5 rounded-md text-xs font-medium transition-all ${
                          startOptions.mode === 'duel' 
                            ? 'bg-purple-500 text-white' 
                            : 'bg-white/10 text-white hover:bg-white/20'
                        }`}
                      >
                        <span className="text-sm">⚔️</span> Duel
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
          
          {/* Player Selection area — only this part scrolls when many players */}
          <div className={`overflow-y-auto ${needsPlayerScroll ? 'max-h-36' : ''} pr-1`}>
            {/* Player Selection (for Single mode) */}
            {!startOptions.partyMode && startOptions.mode === 'single' && activeProfiles.length > 1 && (
              <div>
                <label className="text-xs text-white/60 mb-1 block">Select Player</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {activeProfiles.map((profile) => (
                    <button
                      key={profile.id}
                      onClick={() => setStartOptions(prev => ({ ...prev, players: [profile.id] }))}
                      className={`flex items-center gap-2 p-1.5 rounded-md transition-all ${
                        startOptions.players[0] === profile.id 
                          ? 'bg-cyan-500 text-white' 
                          : 'bg-white/10 text-white hover:bg-white/20'
                      }`}
                    >
                      <div 
                        className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{ backgroundColor: profile.color }}
                      >
                        {profile.avatar ? (
                          <img src={profile.avatar} alt={profile.name} className="w-full h-full rounded-full object-cover" />
                        ) : (
                          profile.name[0]
                        )}
                      </div>
                      <span className="text-xs truncate">{profile.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}



            {/* Player Selection (for Duel mode) */}
            {!startOptions.partyMode && startOptions.mode === 'duel' && activeProfiles.length >= 2 && (
              <div>
                <label className="text-xs text-white/60 mb-1 block">Select 2 Players ({activeProfiles.length} available)</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {activeProfiles.map((profile) => (
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
                      className={`flex items-center gap-2 p-1.5 rounded-md transition-all ${
                        startOptions.players.includes(profile.id) 
                          ? 'bg-purple-500 text-white' 
                          : 'bg-white/10 text-white hover:bg-white/20'
                      }`}
                    >
                      <div 
                        className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{ backgroundColor: profile.color }}
                      >
                        {profile.avatar ? (
                          <img src={profile.avatar} alt={profile.name} className="w-full h-full rounded-full object-cover" />
                        ) : (
                          profile.name[0]
                        )}
                      </div>
                      <span className="text-xs truncate">{profile.name}</span>
                    </button>
                  ))}
                </div>

              </div>
            )}

            {/* Player Selection (for Party Games) */}
            {startOptions.partyMode && activeProfiles.length >= 1 && (
              <div>
                <label className="text-xs text-white/60 mb-1 block">
                  Select Players ({startOptions.partyMode === 'pass-the-mic' ? '2-8' :
                                  startOptions.partyMode === 'medley' ? '1-4' :
                                  startOptions.partyMode === 'missing-words' ? '1-4' :
                                  startOptions.partyMode === 'blind' ? '1-4' : '1-8'} players)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {activeProfiles.map((profile) => (
                    <button
                      key={profile.id}
                      onClick={() => {
                        const players = startOptions.players.includes(profile.id)
                          ? startOptions.players.filter(id => id !== profile.id)
                          : [...startOptions.players, profile.id];
                        setStartOptions(prev => ({ ...prev, players }));
                      }}
                      className={`flex items-center gap-2 p-1.5 rounded-md transition-all ${
                        startOptions.players.includes(profile.id) 
                          ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white' 
                          : 'bg-white/10 text-white hover:bg-white/20'
                      }`}
                    >
                      <div 
                        className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{ backgroundColor: profile.color }}
                      >
                        {profile.avatar ? (
                          <img src={profile.avatar} alt={profile.name} className="w-full h-full rounded-full object-cover" />
                        ) : (
                          profile.name[0]
                        )}
                      </div>
                      <span className="text-xs truncate">{profile.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {/* Player Selection (for Duet mode) */}
            {!startOptions.partyMode && startOptions.mode === 'duet' && activeProfiles.length >= 2 && (
              <div>
                <label className="text-xs text-white/60 mb-1 block">
                  Select 2 Players — {selectedSong.duetPlayerNames?.[0] || 'Part 1'} & {selectedSong.duetPlayerNames?.[1] || 'Part 2'}
                </label>
                {startOptions.players.length === 2 && (
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <div className="text-[10px] text-pink-300 font-medium px-2 py-0.5 rounded-full bg-pink-500/20">
                      {profiles.find(p => p.id === startOptions.players[0])?.name || 'Player 1'} → {selectedSong.duetPlayerNames?.[0] || 'P1'}
                    </div>
                    <button
                      onClick={() => setStartOptions(prev => ({ ...prev, players: [prev.players[1], prev.players[0]], micIdP1: prev.micIdP2, micIdP2: prev.micIdP1 }))}
                      className="p-1 rounded-md bg-white/10 hover:bg-white/20 text-white/60 hover:text-white transition-all"
                      title="Swap P1 / P2"
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M7 16l-4-4 4-4M17 8l4 4-4 4M3 12h18" />
                      </svg>
                    </button>
                    <div className="text-[10px] text-purple-300 font-medium px-2 py-0.5 rounded-full bg-purple-500/20">
                      {profiles.find(p => p.id === startOptions.players[1])?.name || 'Player 2'} → {selectedSong.duetPlayerNames?.[1] || 'P2'}
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-1.5">
                  {activeProfiles.map((profile) => {
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
                        className={`flex items-center gap-2 p-1.5 rounded-md transition-all ${
                          isP1
                            ? 'bg-pink-500 text-white ring-1 ring-pink-300'
                            : isP2
                              ? 'bg-purple-500 text-white ring-1 ring-purple-300'
                              : 'bg-white/10 text-white hover:bg-white/20'
                        }`}
                      >
                        <div 
                          className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                          style={{ backgroundColor: profile.color }}
                        >
                          {profile.avatar ? (
                            <img src={profile.avatar} alt={profile.name} className="w-full h-full rounded-full object-cover" />
                          ) : (
                            profile.name[0]
                          )}
                        </div>
                        <div className="flex flex-col items-start min-w-0">
                          <span className="text-xs truncate">{profile.name}</span>
                          {isP1 && <span className="text-[9px] opacity-70">{selectedSong.duetPlayerNames?.[0] || 'Part 1'}</span>}
                          {isP2 && <span className="text-[9px] opacity-70">{selectedSong.duetPlayerNames?.[1] || 'Part 2'}</span>}
                        </div>
                      </button>
                    );
                  })}
                </div>

              </div>
            )}
          </div>
        </div>
        
        {/* Microphone Assignment — below scrollable area */}
        <div className="flex-shrink-0 pt-2">
          {/* Single mode mic selector */}
          {!startOptions.partyMode && startOptions.mode === 'single' && startOptions.players.length === 1 && (
            <MicSelector
              micId={startOptions.micId}
              onMicChange={(id) => setStartOptions(prev => ({ ...prev, micId: id }))}
            />
          )}
          {/* Duel mode dual mic selector */}
          {!startOptions.partyMode && startOptions.mode === 'duel' && startOptions.players.length === 2 && (
            <DualMicSelector
              p1Id={startOptions.players[0]}
              p2Id={startOptions.players[1]}
              profiles={profiles}
              micIdP1={startOptions.micIdP1}
              micIdP2={startOptions.micIdP2}
              onMicP1Change={(id) => setStartOptions(prev => ({ ...prev, micIdP1: id }))}
              onMicP2Change={(id) => setStartOptions(prev => ({ ...prev, micIdP2: id }))}
              p1Label="P1"
              p2Label="P2"
            />
          )}
          {/* Duet mode dual mic selector */}
          {!startOptions.partyMode && startOptions.mode === 'duet' && startOptions.players.length === 2 && (
            <DualMicSelector
              p1Id={startOptions.players[0]}
              p2Id={startOptions.players[1]}
              profiles={profiles}
              micIdP1={startOptions.micIdP1}
              micIdP2={startOptions.micIdP2}
              onMicP1Change={(id) => setStartOptions(prev => ({ ...prev, micIdP1: id }))}
              onMicP2Change={(id) => setStartOptions(prev => ({ ...prev, micIdP2: id }))}
              p1Label={selectedSong.duetPlayerNames?.[0] || 'Part 1'}
              p2Label={selectedSong.duetPlayerNames?.[1] || 'Part 2'}
            />
          )}
        </div>
        
        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 flex-shrink-0 pt-2 border-t border-white/10">
          <Button 
            variant="outline" 
            onClick={handleFavorite}
            className={favoriteSongIds.has(selectedSong.id) 
              ? "bg-yellow-500/20 border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/30 h-10 px-3" 
              : "border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10 h-10 px-3"
            }
          >
            <StarIcon className="w-4 h-4 mr-1.5" filled={favoriteSongIds.has(selectedSong.id)} />
            {favoriteSongIds.has(selectedSong.id) ? 'Favorited' : 'Favorite'}
          </Button>
          <Button 
            variant="outline" 
            onClick={() => { setHighscoreSong(selectedSong); setShowHighscoreModal(true); }}
            className="border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10 h-10 px-3"
          >
            <TrophyIcon className="w-4 h-4 mr-1.5" /> Scores
          </Button>
          <Button 
            variant="outline" 
            onClick={handleAddToQueue}
            disabled={!(startOptions.players[0] || activeProfileId)}
            className="border-purple-500/50 text-purple-400 hover:bg-purple-500/10 disabled:opacity-50 disabled:cursor-not-allowed h-10 px-3"
          >
            <QueueIcon className="w-4 h-4 mr-1.5" /> Queue
          </Button>
          <Button 
            variant="outline" 
            onClick={() => { setSongToAddToPlaylist(selectedSong); setShowAddToPlaylistModal(true); }}
            className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10 h-10 px-3"
          >
            <svg className="w-4 h-4 mr-1.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 18V5l12-2v13" />
              <circle cx="6" cy="18" r="3" />
              <circle cx="18" cy="16" r="3" />
            </svg>
            Playlist
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setShowSongModal(false)}
            className="border-white/20 text-white hover:bg-white/10 h-10 px-3"
          >
            Cancel
          </Button>
          <Button 
            onClick={onStartGame}
            disabled={
              (!startOptions.partyMode && startOptions.mode === 'single' && 
               activeProfiles.length > 1 && 
               startOptions.players.length === 0) ||
              (startOptions.mode === 'duet' && startOptions.players.length < 2) ||
              (startOptions.mode === 'duel' && startOptions.players.length < 2)
            }
            className="flex-1 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 disabled:opacity-50 disabled:cursor-not-allowed h-10"
          >
            <PlayIcon className="w-4 h-4 mr-1.5" /> Start
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
