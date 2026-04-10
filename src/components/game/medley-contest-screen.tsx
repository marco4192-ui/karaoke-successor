'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Song, PlayerProfile, PLAYER_COLORS, Difficulty } from '@/types/game';
import { useGameStore } from '@/lib/game/store';
import { getAllSongs } from '@/lib/game/song-library';
// useMedleyGame is no longer used — medley now uses the main game screen for each snippet
// import { useMedleyGame } from '@/hooks/use-medley-game';

interface MedleyPlayer {
  id: string;
  name: string;
  avatar?: string;
  color: string;
  score: number;
  notesHit: number;
  notesMissed: number;
  combo: number;
  maxCombo: number;
  songsCompleted: number;
}

export interface MedleySong {
  song: Song;
  startTime: number; // Start time in the original song
  endTime: number; // End time in the original song
  duration: number; // Duration of this snippet
}

interface MedleySettings {
  snippetDuration: number; // Duration of each snippet in seconds
  snippetCount: number; // Number of songs in medley
  transitionTime: number; // Seconds between snippets
  difficulty: Difficulty;
  playMode: 'cooperative' | 'competitive'; // Cooperative or competitive
}

const DEFAULT_SETTINGS: MedleySettings = {
  snippetDuration: 30,
  snippetCount: 5,
  transitionTime: 3,
  difficulty: 'medium',
  playMode: 'cooperative',
};

interface MedleySetupProps {
  profiles: PlayerProfile[];
  songs: Song[];
  onStartGame: (players: MedleyPlayer[], medleySongs: MedleySong[], settings: MedleySettings) => void;
  onBack: () => void;
}

export function MedleySetupScreen({ profiles, songs, onStartGame, onBack }: MedleySetupProps) {
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [settings, setSettings] = useState<MedleySettings>(DEFAULT_SETTINGS);
  const [error, setError] = useState<string | null>(null);

  // Filter to only show active profiles (isActive === true or undefined for backwards compatibility)
  const activeProfiles = useMemo(() => 
    profiles.filter(p => p.isActive !== false),
    [profiles]
  );

  // Use global difficulty from store
  const globalDifficulty = useGameStore((state) => state.gameState.difficulty);
  const setGlobalDifficulty = useGameStore((state) => state.setDifficulty);

  const togglePlayer = (playerId: string) => {
    setSelectedPlayers(prev => {
      if (prev.includes(playerId)) {
        return prev.filter(id => id !== playerId);
      }
      if (prev.length >= 4) {
        setError('Maximum 4 players allowed');
        return prev;
      }
      setError(null);
      return [...prev, playerId];
    });
  };

  // Generate random medley songs
  const generateMedleySongs = useCallback(() => {
    // UltraStar beat duration formula: beatDuration = 15000 / BPM (ms per beat)
    const beatDurationMs = (bpm: number) => 15000 / bpm;

    const availableSongs = songs.filter(s => s.duration > settings.snippetDuration * 1000);
    const shuffled = [...availableSongs].sort(() => Math.random() - 0.5);
    const selectedSongs = shuffled.slice(0, settings.snippetCount);
    
    return selectedSongs.map(song => {
      // If #MEDLEYSTARTBEAT: and #MEDLEYENDBEAT: are defined, use them
      if (song.medleyStartBeat !== undefined && song.medleyEndBeat !== undefined && song.bpm > 0) {
        const bd = beatDurationMs(song.bpm);
        const startTime = song.medleyStartBeat * bd;
        const endTime = song.medleyEndBeat * bd;
        return {
          song,
          startTime,
          endTime,
          duration: endTime - startTime,
        };
      }

      // If only #MEDLEYSTARTBEAT: is defined, start there and play for snippetDuration
      if (song.medleyStartBeat !== undefined && song.bpm > 0) {
        const bd = beatDurationMs(song.bpm);
        const startTime = song.medleyStartBeat * bd;
        return {
          song,
          startTime,
          endTime: startTime + settings.snippetDuration * 1000,
          duration: settings.snippetDuration * 1000,
        };
      }

      // Fallback: calculate random start time within song's actual note range.
      // Use last lyric end time instead of song.duration (which includes buffer).
      const maxSafeTime = song.lyrics && song.lyrics.length > 0
        ? Math.max(...song.lyrics.map(l => l.endTime))
        : Math.min(song.duration, settings.snippetDuration * 1000 * 3);
      const maxStartTime = Math.max(0, maxSafeTime - settings.snippetDuration * 1000);
      const startTime = Math.random() * maxStartTime;
      
      return {
        song,
        startTime,
        endTime: startTime + settings.snippetDuration * 1000,
        duration: settings.snippetDuration * 1000,
      };
    });
  }, [songs, settings.snippetCount, settings.snippetDuration]);

  const handleStartGame = () => {
    const minPlayers = settings.playMode === 'competitive' ? 2 : 1;
    if (selectedPlayers.length < minPlayers) {
      setError(`Minimum ${minPlayers} player${minPlayers > 1 ? 's' : ''} required for ${settings.playMode} mode`);
      return;
    }

    // Create players
    const players: MedleyPlayer[] = selectedPlayers.map((id, index) => {
      const profile = profiles.find(p => p.id === id);
      return {
        id,
        name: profile?.name || 'Unknown',
        avatar: profile?.avatar,
        color: profile?.color || PLAYER_COLORS[index % PLAYER_COLORS.length],
        score: 0,
        notesHit: 0,
        notesMissed: 0,
        combo: 0,
        maxCombo: 0,
        songsCompleted: 0,
      };
    });

    // Generate medley songs
    const medleySongs = generateMedleySongs();
    
    if (medleySongs.length === 0) {
      setError('No suitable songs found. Need songs longer than snippet duration.');
      return;
    }

    onStartGame(players, medleySongs, { ...settings, difficulty: globalDifficulty });
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={onBack} className="text-white/60">
          ← Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold">🎵 Medley Contest</h1>
          <p className="text-white/60">Sing short snippets of multiple songs in a row!</p>
        </div>
      </div>

      {/* How it works */}
      <Card className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/30 mb-6">
        <CardContent className="py-4">
          <h3 className="font-bold text-lg mb-2 text-purple-400">🎮 How it works</h3>
          <ul className="text-sm text-white/70 space-y-2">
            <li>🎵 Random song snippets will play one after another</li>
            <li>⏱️ Each snippet is {settings.snippetDuration} seconds long</li>
            <li>🎤 Sing as many snippets as you can!</li>
            <li>🏆 Score is calculated across all snippets</li>
          </ul>
        </CardContent>
      </Card>

      {error && (
        <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 mb-6 text-red-400">
          {error}
        </div>
      )}

      {/* Settings */}
      <Card className="bg-white/5 border-white/10 mb-6">
        <CardHeader>
          <CardTitle>Medley Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Snippet Duration */}
          <div>
            <label className="text-sm text-white/60 mb-2 block">Snippet Duration: {settings.snippetDuration}s</label>
            <input
              type="range"
              min={15}
              max={60}
              step={5}
              value={settings.snippetDuration}
              onChange={(e) => setSettings(prev => ({ ...prev, snippetDuration: Number(e.target.value) }))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-white/40 mt-1">
              <span>15s (Quick)</span>
              <span>60s (Extended)</span>
            </div>
          </div>

          {/* Snippet Count */}
          <div>
            <label className="text-sm text-white/60 mb-2 block">Number of Songs: {settings.snippetCount}</label>
            <input
              type="range"
              min={3}
              max={10}
              step={1}
              value={settings.snippetCount}
              onChange={(e) => setSettings(prev => ({ ...prev, snippetCount: Number(e.target.value) }))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-white/40 mt-1">
              <span>3 songs</span>
              <span>10 songs</span>
            </div>
          </div>

          {/* Transition Time */}
          <div>
            <label className="text-sm text-white/60 mb-2 block">Transition Time: {settings.transitionTime}s</label>
            <input
              type="range"
              min={1}
              max={5}
              step={1}
              value={settings.transitionTime}
              onChange={(e) => setSettings(prev => ({ ...prev, transitionTime: Number(e.target.value) }))}
              className="w-full"
            />
            <p className="text-xs text-white/40 mt-1">Time between snippets</p>
          </div>

          {/* Difficulty */}
          <div>
            <label className="text-sm text-white/60 mb-2 block">Difficulty</label>
            <div className="flex gap-2">
              {['easy', 'medium', 'hard'].map(diff => (
                <Button
                  key={diff}
                  variant={globalDifficulty === diff ? 'default' : 'outline'}
                  onClick={() => setGlobalDifficulty(diff as Difficulty)}
                  className={globalDifficulty === diff ? 'bg-purple-500 hover:bg-purple-600' : 'border-white/20'}
                >
                  {diff.charAt(0).toUpperCase() + diff.slice(1)}
                </Button>
              ))}
            </div>
          </div>

          {/* Play Mode */}
          <div>
            <label className="text-sm text-white/60 mb-2 block">Play Mode</label>
            <div className="flex gap-2">
              <Button
                variant={settings.playMode === 'cooperative' ? 'default' : 'outline'}
                onClick={() => setSettings(prev => ({ ...prev, playMode: 'cooperative' }))}
                className={settings.playMode === 'cooperative' ? 'bg-purple-500 hover:bg-purple-600' : 'border-white/20'}
              >
                🤝 Kooperativ
              </Button>
              <Button
                variant={settings.playMode === 'competitive' ? 'default' : 'outline'}
                onClick={() => setSettings(prev => ({ ...prev, playMode: 'competitive' }))}
                className={settings.playMode === 'competitive' ? 'bg-purple-500 hover:bg-purple-600' : 'border-white/20'}
              >
                ⚔️ Kompetitiv
              </Button>
            </div>
            <p className="text-xs text-white/40 mt-1">
              {settings.playMode === 'competitive'
                ? '1v1 oder 2v2 — Snippets abwechselnd, Punkte vergleichen'
                : 'Alle singen zusammen — gemeinsamer Score'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Player Selection */}
      <Card className="bg-white/5 border-white/10 mb-6">
        <CardHeader>
          <CardTitle>Select Players ({selectedPlayers.length}/4)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {activeProfiles.map(profile => {
              const isSelected = selectedPlayers.includes(profile.id);
              return (
                <div
                  key={profile.id}
                  onClick={() => togglePlayer(profile.id)}
                  className={`p-4 rounded-lg cursor-pointer transition-all ${
                    isSelected 
                      ? 'bg-gradient-to-br from-purple-500/30 to-pink-500/30 border-2 border-purple-500' 
                      : 'bg-white/5 border border-white/10 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {profile.avatar ? (
                      <img src={profile.avatar} alt={profile.name} className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div 
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                        style={{ backgroundColor: profile.color }}
                      >
                        {profile.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="font-medium truncate">{profile.name}</span>
                    {isSelected && <span className="ml-auto text-purple-400">✓</span>}
                  </div>
                </div>
              );
            })}
          </div>
          
          {activeProfiles.length < 1 && (
            <p className="text-yellow-400 mt-4">
              ⚠️ No active profiles available. Create and activate profiles in Character selection.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Preview */}
      <Card className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/30 mb-6">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-lg">Medley Preview</h3>
              <p className="text-sm text-white/60">
                {settings.snippetCount} songs × {settings.snippetDuration}s = {Math.ceil(settings.snippetCount * settings.snippetDuration / 60)} min total
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-purple-400">{settings.snippetCount * settings.snippetDuration}s</div>
              <div className="text-xs text-white/40">total duration</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Start Button */}
      <Button
        onClick={handleStartGame}
        disabled={selectedPlayers.length < 1}
        className="w-full py-6 text-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400"
      >
        🎵 Start Medley Contest ({selectedPlayers.length} Players)
      </Button>
    </div>
  );
}

// ===================== MEDLEY GAME VIEW (Flow Controller) =====================
interface MedleyGameViewProps {
  players: MedleyPlayer[];
  medleySongs: MedleySong[];
  settings: MedleySettings & { currentSnippetIndex?: number };
  onUpdatePlayers: (players: MedleyPlayer[]) => void;
  onPlaySnippet: (playerId: string, snippetIndex: number) => void;
  onEndGame: () => void;
}

export function MedleyGameView({ players, medleySongs, settings, onUpdatePlayers, onPlaySnippet, onEndGame }: MedleyGameViewProps) {
  // Derive how many snippets have been played from settings
  const lastPlayedSnippetIndex = settings.currentSnippetIndex ?? -1;
  const nextSnippetIndex = lastPlayedSnippetIndex + 1;
  const allDone = nextSnippetIndex >= medleySongs.length;
  const isCompetitive = settings.playMode === 'competitive';

  // Local state for UI phases
  const [phase, setPhase] = useState<'ready' | 'countdown' | 'transition' | 'ended'>(() => {
    if (allDone) return 'ended';
    if (lastPlayedSnippetIndex >= 0) return 'transition';
    return 'ready';
  });
  const [countdown, setCountdown] = useState(3);
  const [transitionCountdown, setTransitionCountdown] = useState(settings.transitionTime);

  // ── In competitive mode, determine which player sings the next snippet ──
  const getActivePlayerId = useCallback((snippetIdx: number): string => {
    if (isCompetitive) {
      const playerIdx = snippetIdx % players.length;
      return players[playerIdx]?.id || players[0]?.id || '';
    }
    // Cooperative: use the first player (all share the same cumulative score)
    return players[0]?.id || '';
  }, [isCompetitive, players]);

  // ── Countdown then launch snippet ──
  const launchWithCountdown = useCallback((snippetIdx: number) => {
    setPhase('countdown');
    setCountdown(3);
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          const playerId = getActivePlayerId(snippetIdx);
          onPlaySnippet(playerId, snippetIdx);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [getActivePlayerId, onPlaySnippet]);

  // ── Start button handler (initial start) ──
  const handleStart = useCallback(() => {
    launchWithCountdown(nextSnippetIndex);
  }, [nextSnippetIndex, launchWithCountdown]);

  // ── Auto-start next snippet after transition ──
  useEffect(() => {
    if (phase !== 'transition') return;

    setTransitionCountdown(settings.transitionTime);
    const interval = setInterval(() => {
      setTransitionCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          if (!allDone) {
            launchWithCountdown(nextSnippetIndex);
          }
          return settings.transitionTime;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [phase, allDone, nextSnippetIndex, settings.transitionTime, launchWithCountdown]);

  // ── Current snippet info (for display during transition/countdown) ──
  const currentSnippet = !allDone ? medleySongs[nextSnippetIndex] : null;
  const activePlayerId = currentSnippet ? getActivePlayerId(nextSnippetIndex) : '';
  const activePlayer = players.find(p => p.id === activePlayerId);

  // ── Calculate overall progress ──
  const totalSnippets = medleySongs.length;
  const completedSnippets = Math.max(0, lastPlayedSnippetIndex + 1);
  const totalProgress = totalSnippets > 0 ? (completedSnippets / totalSnippets) * 100 : 0;

  // ── Determine winner in competitive mode ──
  const winner = useMemo(() => {
    if (!isCompetitive) return null;
    return [...players].sort((a, b) => b.score - a.score)[0];
  }, [isCompetitive, players]);

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={onEndGame} className="text-white/60">
            ← Quit
          </Button>
          <Badge className="bg-purple-500/20 text-purple-400 text-lg px-3 py-1">🎵 MEDLEY CONTEST</Badge>
          {isCompetitive && (
            <Badge className="bg-red-500/20 text-red-400">⚔️ Kompetitiv</Badge>
          )}
        </div>
        <Badge className="bg-pink-500/20 text-pink-400">
          Song {completedSnippets}/{totalSnippets}
        </Badge>
      </div>

      {/* Total Progress */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-white/40 mb-1">
          <span>Total Progress</span>
          <span>{completedSnippets}/{totalSnippets} Snippets</span>
        </div>
        <Progress value={totalProgress} className="h-2 bg-white/10" />
      </div>

      {/* ── ENDED: Final Results ── */}
      {phase === 'ended' && (
        <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/30 mb-4">
          <CardContent className="py-8">
            <div className="text-center">
              <div className="text-6xl mb-4">🎉</div>
              <h2 className="text-2xl font-bold mb-6">
                {isCompetitive ? 'Medley Contest — Ergebnis' : 'Medley Complete!'}
              </h2>

              {/* Competitive: Show rankings */}
              {isCompetitive && (
                <div className="mb-6">
                  {[...players]
                    .sort((a, b) => b.score - a.score)
                    .map((player, index) => (
                      <div
                        key={player.id}
                        className={`flex items-center gap-4 p-3 rounded-lg mb-2 ${
                          index === 0
                            ? 'bg-yellow-500/10 border border-yellow-500/30'
                            : 'bg-white/5 border border-white/10'
                        }`}
                      >
                        <div className="text-2xl w-8 text-center">
                          {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}`}
                        </div>
                        {player.avatar ? (
                          <img src={player.avatar} alt={player.name} className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold" style={{ backgroundColor: player.color }}>
                            {player.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="flex-1 text-left">
                          <div className="font-medium">{player.name}</div>
                          <div className="text-xs text-white/40">
                            {player.songsCompleted} Snippet{player.songsCompleted !== 1 ? 's' : ''} gesungen · {player.notesHit} Hit · {player.notesMissed} Miss · Max Combo: {player.maxCombo}
                          </div>
                        </div>
                        <div className="text-xl font-bold text-purple-400">{player.score.toLocaleString()}</div>
                      </div>
                    ))}
                  {winner && (
                    <div className="mt-4 text-lg">
                      🏆 <span className="font-bold text-yellow-400">{winner.name}</span> gewinnt!
                    </div>
                  )}
                </div>
              )}

              {/* Cooperative: Show total + per-player scores */}
              {!isCompetitive && players.length > 0 && (
                <div className="space-y-3">
                  <div className="text-4xl font-bold text-purple-400 mb-4">
                    {players.reduce((sum, p) => sum + p.score, 0).toLocaleString()} Punkte
                  </div>
                  {players.map(player => (
                    <div key={player.id} className="flex items-center gap-3 justify-center">
                      {player.avatar ? (
                        <img src={player.avatar} alt={player.name} className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: player.color }}>
                          {player.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="text-white/60">{player.name}</span>
                      <span className="text-sm text-white/40">{player.notesHit} Hit · {player.notesMissed} Miss</span>
                    </div>
                  ))}
                </div>
              )}

              <Button onClick={onEndGame} className="bg-gradient-to-r from-purple-500 to-pink-500 px-8 mt-6">
                Return to Menu
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── COUNTDOWN: Before launching snippet ── */}
      {phase === 'countdown' && currentSnippet && (
        <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/30 mb-4">
          <CardContent className="py-8">
            <div className="text-center">
              {countdown > 0 ? (
                <>
                  <div className="text-6xl font-bold text-purple-400 animate-pulse mb-4">{countdown}</div>
                  <p className="text-lg text-white/60">Get ready!</p>
                </>
              ) : (
                <p className="text-lg text-white/60 animate-pulse">Loading...</p>
              )}

              {/* Show which song and who sings */}
              <div className="mt-6 bg-black/30 rounded-xl p-4">
                <p className="text-sm text-white/40 mb-1">NEXT SONG</p>
                <h3 className="text-xl font-bold">{currentSnippet.song.title}</h3>
                <p className="text-white/60">{currentSnippet.song.artist}</p>
                {isCompetitive && activePlayer && (
                  <p className="text-sm text-yellow-400 mt-2">🎤 {activePlayer.name} singt</p>
                )}
                <p className="text-xs text-white/30 mt-1">{Math.floor(currentSnippet.duration / 1000)}s snippet</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── TRANSITION: Between snippets ── */}
      {phase === 'transition' && currentSnippet && (
        <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/30 mb-4">
          <CardContent className="py-8">
            <div className="text-center">
              <div className="text-4xl mb-4 animate-pulse">🔄</div>
              <h3 className="text-2xl font-bold mb-2">Next Song Coming...</h3>
              <div className="text-4xl font-bold text-pink-400 mb-4">{transitionCountdown}</div>

              {/* Show upcoming song */}
              <div className="bg-black/30 rounded-xl p-4 inline-block">
                <p className="text-sm text-white/40 mb-1">UP NEXT</p>
                <h3 className="text-xl font-bold">{currentSnippet.song.title}</h3>
                <p className="text-white/60">{currentSnippet.song.artist}</p>
                {isCompetitive && activePlayer && (
                  <p className="text-sm text-yellow-400 mt-2">🎤 {activePlayer.name} singt</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── READY: Initial start screen ── */}
      {phase === 'ready' && (
        <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/30 mb-4">
          <CardContent className="py-8">
            <div className="text-center">
              <div className="text-4xl mb-4">🎵</div>
              <h3 className="text-xl font-bold mb-2">Medley Contest</h3>
              <p className="text-white/60 mb-2">{medleySongs.length} song snippets await!</p>
              {currentSnippet && (
                <div className="bg-black/30 rounded-xl p-4 inline-block mt-4">
                  <p className="text-sm text-white/40 mb-1">FIRST SONG</p>
                  <h3 className="text-xl font-bold">{currentSnippet.song.title}</h3>
                  <p className="text-white/60">{currentSnippet.song.artist}</p>
                  {isCompetitive && activePlayer && (
                    <p className="text-sm text-yellow-400 mt-2">🎤 {activePlayer.name} singt zuerst</p>
                  )}
                  <p className="text-xs text-white/30 mt-1">{Math.floor(currentSnippet.duration / 1000)}s snippet</p>
                </div>
              )}
              <div className="mt-6">
                <Button onClick={handleStart} className="bg-gradient-to-r from-purple-500 to-pink-500 px-8 py-4 text-xl">
                  🎤 Start Medley!
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Player Scores */}
      <Card className="bg-white/5 border-white/10 mb-4">
        <CardHeader>
          <CardTitle className="text-lg">Scores</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center gap-6">
            {players.map(player => (
              <div key={player.id} className="text-center">
                {player.avatar ? (
                  <img src={player.avatar} alt={player.name} className="w-12 h-12 rounded-full object-cover mx-auto border-2 border-purple-500" />
                ) : (
                  <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold mx-auto border-2 border-purple-500" style={{ backgroundColor: player.color }}>
                    {player.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="font-medium mt-1">{player.name}</div>
                <div className="text-purple-400 font-bold text-lg">{player.score.toLocaleString()}</div>
                <div className="text-xs text-white/40">
                  ✓{player.notesHit} ✗{player.notesMissed} · {player.songsCompleted} gesungen
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Song Queue */}
      <Card className="bg-white/5 border-white/10 mb-4">
        <CardHeader>
          <CardTitle className="text-lg">Song Queue</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {medleySongs.map((medleySong, index) => (
              <div
                key={index}
                className={`flex-shrink-0 p-3 rounded-lg min-w-[140px] ${
                  index <= lastPlayedSnippetIndex
                    ? 'bg-white/5 border border-white/10 opacity-50'
                    : index === nextSnippetIndex
                      ? 'bg-gradient-to-br from-purple-500/30 to-pink-500/30 border-2 border-purple-500'
                      : 'bg-white/5 border border-white/10'
                }`}
              >
                <div className="flex items-center gap-2">
                  {medleySong.song.coverImage ? (
                    <img src={medleySong.song.coverImage} alt="" className="w-10 h-10 rounded object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded bg-purple-500/20 flex items-center justify-center">🎵</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate text-sm">{medleySong.song.title}</p>
                    <p className="text-xs text-white/40">{Math.floor(medleySong.duration / 1000)}s</p>
                  </div>
                </div>
                {index <= lastPlayedSnippetIndex && <div className="text-xs text-green-400 mt-1">✓ Done</div>}
                {index === nextSnippetIndex && <div className="text-xs text-purple-400 mt-1">♪ Next</div>}
                {isCompetitive && (
                  <div className="text-xs mt-1" style={{ color: players[index % players.length]?.color || '#999' }}>
                    → {players[index % players.length]?.name}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
