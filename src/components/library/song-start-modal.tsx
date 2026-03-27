'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Song, Difficulty, GameMode, PlayerProfile, HighscoreEntry } from '@/types/game';
import { toggleFavorite, getPlaylists } from '@/lib/playlist-manager';
import {
  MusicIcon,
  PlayIcon,
  MicIcon,
  StarIcon,
  TrophyIcon,
  QueueIcon,
} from '@/components/icons';

export interface StartOptions {
  difficulty: Difficulty;
  mode: 'single' | 'duel' | 'duet' | GameMode;
  players: string[];
  partyMode?: GameMode;
}

interface SongStartModalProps {
  song: Song | null;
  isOpen: boolean;
  onClose: () => void;
  startOptions: StartOptions;
  onStartOptionsChange: (options: StartOptions) => void;
  profiles: PlayerProfile[];
  highscores: HighscoreEntry[];
  favoriteSongIds: Set<string>;
  onFavoriteChange: (favoriteIds: Set<string>) => void;
  onShowHighscores: (song: Song) => void;
  onAddToQueue: (song: Song) => void;
  onAddToPlaylist: (song: Song) => void;
  onStartGame: () => void;
  playerQueueCount: number;
  activeProfileId: string | null;
}

export function SongStartModal({
  song,
  isOpen,
  onClose,
  startOptions,
  onStartOptionsChange,
  profiles,
  highscores,
  favoriteSongIds,
  onFavoriteChange,
  onShowHighscores,
  onAddToQueue,
  onAddToPlaylist,
  onStartGame,
  playerQueueCount,
  activeProfileId,
}: SongStartModalProps) {
  if (!song) return null;

  const activeProfiles = profiles.filter(p => p.isActive !== false);

  const handleFavoriteToggle = () => {
    toggleFavorite(song.id);
    const allPlaylists = getPlaylists();
    const favorites = allPlaylists.find(p => p.id === 'system-favorites');
    if (favorites) {
      const favs = new Set<string>();
      favorites.songIds.forEach(id => favs.add(id));
      onFavoriteChange(favs);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border-white/10 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">{song.title}</DialogTitle>
          <DialogDescription className="text-white/60">{song.artist}</DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Cover Preview */}
          <div className="aspect-video rounded-lg overflow-hidden bg-gradient-to-br from-purple-600/30 to-blue-600/30">
            {song.coverImage ? (
              <img src={song.coverImage} alt={song.title} className="w-full h-full object-cover" />
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
                  onClick={() => onStartOptionsChange({ ...startOptions, difficulty: diff })}
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
                    onClick={() => onStartOptionsChange({ ...startOptions, partyMode: undefined, mode: 'single' })}
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
              <div className={`grid ${song?.isDuet ? 'grid-cols-1' : 'grid-cols-2'} gap-2`}>
                {/* Duet Mode - Only show for duet songs */}
                {song?.isDuet ? (
                  <button
                    onClick={() => onStartOptionsChange({ ...startOptions, mode: 'duet' })}
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
                      onClick={() => onStartOptionsChange({ ...startOptions, mode: 'single' })}
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
                      onClick={() => onStartOptionsChange({ ...startOptions, mode: 'duel' })}
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
          {!startOptions.partyMode && startOptions.mode === 'single' && activeProfiles.length > 1 && (
            <div>
              <label className="text-sm text-white/60 mb-2 block">Select Player</label>
              <div className={`grid grid-cols-2 gap-2 ${activeProfiles.length > 6 ? 'max-h-48 overflow-y-auto pr-1' : ''}`}>
                {activeProfiles.map((profile) => (
                  <button
                    key={profile.id}
                    onClick={() => onStartOptionsChange({ ...startOptions, players: [profile.id] })}
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
          {!startOptions.partyMode && startOptions.mode === 'duel' && activeProfiles.length >= 2 && (
            <div>
              <label className="text-sm text-white/60 mb-2 block">Select 2 Players ({activeProfiles.length} available)</label>
              <div className={`grid grid-cols-2 gap-2 ${activeProfiles.length > 6 ? 'max-h-48 overflow-y-auto pr-1' : ''}`}>
                {activeProfiles.map((profile) => {
                  const isSelected = startOptions.players.includes(profile.id);
                  return (
                    <button
                      key={profile.id}
                      onClick={() => {
                        const players = isSelected
                          ? startOptions.players.filter(id => id !== profile.id)
                          : startOptions.players.length < 2
                            ? [...startOptions.players, profile.id]
                            : startOptions.players;
                        onStartOptionsChange({ ...startOptions, players });
                      }}
                      className={`flex items-center gap-2 p-2 rounded-lg transition-all ${
                        isSelected 
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
                  );
                })}
              </div>
            </div>
          )}

          {/* Player Selection (for Party Games) */}
          {startOptions.partyMode && activeProfiles.length >= 1 && (
            <div>
              <label className="text-sm text-white/60 mb-2 block">
                Select Players ({startOptions.partyMode === 'pass-the-mic' ? '2-8' :
                                startOptions.partyMode === 'medley' ? '1-4' :
                                startOptions.partyMode === 'missing-words' ? '1-4' :
                                startOptions.partyMode === 'blind' ? '1-4' : '1-8'} players)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-40 overflow-y-auto pr-1">
                {activeProfiles.map((profile) => {
                  const isSelected = startOptions.players.includes(profile.id);
                  return (
                    <button
                      key={profile.id}
                      onClick={() => {
                        const players = isSelected
                          ? startOptions.players.filter(id => id !== profile.id)
                          : [...startOptions.players, profile.id];
                        onStartOptionsChange({ ...startOptions, players });
                      }}
                      className={`flex items-center gap-2 p-2 rounded-lg transition-all ${
                        isSelected 
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
                  );
                })}
              </div>
            </div>
          )}
          
          {/* Player Selection (for Duet mode) */}
          {!startOptions.partyMode && startOptions.mode === 'duet' && activeProfiles.length >= 2 && (
            <div>
              <label className="text-sm text-white/60 mb-2 block">Select 2 Players (P1 & P2) - {activeProfiles.length} available</label>
              <div className={`grid grid-cols-2 gap-2 ${activeProfiles.length > 6 ? 'max-h-48 overflow-y-auto pr-1' : ''}`}>
                {activeProfiles.map((profile) => {
                  const isSelected = startOptions.players.includes(profile.id);
                  return (
                    <button
                      key={profile.id}
                      onClick={() => {
                        const players = isSelected
                          ? startOptions.players.filter(id => id !== profile.id)
                          : startOptions.players.length < 2
                            ? [...startOptions.players, profile.id]
                            : startOptions.players;
                        onStartOptionsChange({ ...startOptions, players });
                      }}
                      className={`flex items-center gap-2 p-2 rounded-lg transition-all ${
                        isSelected 
                          ? 'bg-pink-500 text-white' 
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
                  );
                })}
              </div>
            </div>
          )}
          
          {/* Song Info */}
          <div className="text-xs text-white/40 space-y-1">
            <p>BPM: {song.bpm} | Duration: {Math.floor(song.duration / 60000)}:{String(Math.floor((song.duration % 60000) / 1000)).padStart(2, '0')}</p>
            {song.genre && <p>Genre: {song.genre}</p>}
          </div>

          {/* Local Highscore Preview */}
          {(() => {
            const songScores = highscores.filter(h => h.songId === song.id).sort((a, b) => b.score - a.score);
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
                    onClick={() => onShowHighscores(song)}
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
            onClick={handleFavoriteToggle}
            className={favoriteSongIds.has(song.id) 
              ? "bg-yellow-500/20 border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/30" 
              : "border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10"
            }
          >
            <StarIcon className="w-4 h-4 mr-2" filled={favoriteSongIds.has(song.id)} />
            {favoriteSongIds.has(song.id) ? 'Favorited' : 'Favorite'}
          </Button>
          <Button 
            variant="outline" 
            onClick={() => onShowHighscores(song)}
            className="border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10"
          >
            <TrophyIcon className="w-4 h-4 mr-2" /> Scores
          </Button>
          <Button 
            variant="outline" 
            onClick={() => {
              onAddToQueue(song);
              onClose();
            }}
            disabled={!activeProfileId || playerQueueCount >= 3}
            className="border-purple-500/50 text-purple-400 hover:bg-purple-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <QueueIcon className="w-4 h-4 mr-2" /> Queue {!activeProfileId && '(Select Player)'}
          </Button>
          <Button 
            variant="outline" 
            onClick={() => onAddToPlaylist(song)}
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
            onClick={onClose}
            className="border-white/20 text-white hover:bg-white/10"
          >
            Cancel
          </Button>
          <Button 
            onClick={onStartGame}
            disabled={
              // Single mode: need player selection if multiple profiles
              (startOptions.mode === 'single' && 
               activeProfiles.length > 1 && 
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
