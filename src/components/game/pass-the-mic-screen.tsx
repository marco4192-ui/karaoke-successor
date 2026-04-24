'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Song, PlayerProfile, PLAYER_COLORS, LyricLine, Difficulty } from '@/types/game';
import { useGameStore } from '@/lib/game/store';
import { getAllSongs } from '@/lib/game/song-library';
import { usePitchDetector } from '@/hooks/use-pitch-detector';
import { DIFFICULTY_SETTINGS } from '@/types/game';
import { usePartyStore } from '@/lib/game/party-store';
import { QuickSwapOverlay } from '@/components/game/quick-swap-overlay';

interface PassTheMicPlayer {
  id: string;
  name: string;
  avatar?: string;
  color: string;
  score: number;
  notesHit: number;
  notesMissed: number;
  combo: number;
  maxCombo: number;
  isActive: boolean;
  segmentsSung: number;
}

export interface PassTheMicSegment {
  startTime: number;
  endTime: number;
  playerId: string | null; // null means random/unassigned
}

interface PassTheMicSetupProps {
  profiles: PlayerProfile[];
  onSelectSong: (players: PassTheMicPlayer[], settings: PassTheMicSettings) => void;
  onBack: () => void;
}

interface PassTheMicSettings {
  segmentDuration: number; // in seconds
  randomSwitches: boolean; // random player switches during song
  difficulty: Difficulty;
  micId: string; // selected microphone device ID
  micName: string; // display name for selected mic
}

const DEFAULT_SETTINGS: PassTheMicSettings = {
  segmentDuration: 30, // 30 seconds per segment
  randomSwitches: true,
  difficulty: 'medium',
  micId: 'default',
  micName: 'Standard',
};

export function PassTheMicSetupScreen({ profiles, onSelectSong, onBack }: PassTheMicSetupProps) {
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [settings, setSettings] = useState<PassTheMicSettings>(DEFAULT_SETTINGS);
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
      if (prev.length >= 8) {
        setError('Maximum 8 players allowed');
        return prev;
      }
      setError(null);
      return [...prev, playerId];
    });
  };

  const handleSelectSong = () => {
    if (selectedPlayers.length < 2) {
      setError('Minimum 2 players required');
      return;
    }
    setError(null);

    // Create players
    const players: PassTheMicPlayer[] = selectedPlayers.map((id, index) => {
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
        isActive: index === 0,
        segmentsSung: 0,
      };
    });

    // Pass players and settings to parent, which will navigate to library
    onSelectSong(players, { ...settings, difficulty: globalDifficulty });
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={onBack} className="text-white/60">
          ← Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold">🎤 Pass the Mic</h1>
          <p className="text-white/60">Take turns singing parts of a song!</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 mb-6 text-red-400">
          {error}
        </div>
      )}

      {/* Settings */}
      <Card className="bg-white/5 border-white/10 mb-6">
        <CardHeader>
          <CardTitle>Game Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Segment Duration */}
          <div>
            <label className="text-sm text-white/60 mb-2 block">Segment Duration: {settings.segmentDuration}s</label>
            <input
              type="range"
              min={15}
              max={60}
              step={5}
              value={settings.segmentDuration}
              onChange={(e) => setSettings(prev => ({ ...prev, segmentDuration: Number(e.target.value) }))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-white/40 mt-1">
              <span>15s (Fast switches)</span>
              <span>60s (Long segments)</span>
            </div>
          </div>

          {/* Random Switches */}
          <div className="flex items-center justify-between">
            <div>
              <label className="font-medium">Random Switches</label>
              <p className="text-sm text-white/60">Randomly switch players mid-segment</p>
            </div>
            <Button
              variant={settings.randomSwitches ? 'default' : 'outline'}
              onClick={() => setSettings(prev => ({ ...prev, randomSwitches: !prev.randomSwitches }))}
              className={settings.randomSwitches ? 'bg-cyan-500 hover:bg-cyan-600' : 'border-white/20'}
            >
              {settings.randomSwitches ? '✓ On' : 'Off'}
            </Button>
          </div>

          {/* Microphone Selection */}
          <div>
            <label className="text-sm text-white/60 mb-2 block">Microphone</label>
            <select
              value={settings.micId}
              onChange={(e) => {
                const opt = e.target.options[e.target.selectedIndex];
                setSettings(prev => ({ ...prev, micId: e.target.value, micName: opt.textContent }));
              }}
              className="w-full bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-white text-sm"
            >
              <option value="default">Standard (System Default)</option>
            </select>
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
                  className={globalDifficulty === diff ? 'bg-cyan-500 hover:bg-cyan-600' : 'border-white/20'}
                >
                  {diff.charAt(0).toUpperCase() + diff.slice(1)}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Player Selection */}
      <Card className="bg-white/5 border-white/10 mb-6">
        <CardHeader>
          <CardTitle>Select Players ({selectedPlayers.length}/8)</CardTitle>
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
                      ? 'bg-gradient-to-br from-cyan-500/30 to-blue-500/30 border-2 border-cyan-500' 
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
                    {isSelected && <span className="ml-auto text-cyan-400">✓</span>}
                  </div>
                </div>
              );
            })}
          </div>
          
          {activeProfiles.length < 2 && (
            <p className="text-yellow-400 mt-4">
              ⚠️ Need at least 2 active profiles. Create more in Character selection or activate existing ones.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Summary */}
      <Card className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 mb-6">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-lg">Ready to Play!</h3>
              <p className="text-sm text-white/60">{selectedPlayers.length} players selected</p>
              <p className="text-xs text-white/40 mt-1">
                Segment duration: {settings.segmentDuration}s • Random switches: {settings.randomSwitches ? 'On' : 'Off'}
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-cyan-400">{selectedPlayers.length}</div>
              <div className="text-xs text-white/40">players</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Select Song Button */}
      <Button
        onClick={handleSelectSong}
        disabled={selectedPlayers.length < 2}
        className="w-full py-6 text-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400"
      >
        🎵 Select Song ({selectedPlayers.length} Players)
      </Button>
    </div>
  );
}

// ===================== PASS THE MIC GAME VIEW =====================
interface PassTheMicGameViewProps {
  players: PassTheMicPlayer[];
  song: Song;
  segments: PassTheMicSegment[];
  settings: PassTheMicSettings | null;
  onUpdateGame: (players: PassTheMicPlayer[], segments: PassTheMicSegment[]) => void;
  onEndGame: () => void;
}

export function PassTheMicGameView({ players, song, segments, settings, onUpdateGame, onEndGame }: PassTheMicGameViewProps) {
  // Fallback to defaults if settings is null (prevents white screen when party-store has null)
  const safeSettings: PassTheMicSettings = settings ?? DEFAULT_SETTINGS;
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [switchCountdown, setSwitchCountdown] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const party = usePartyStore();

  // Pitch detection for the active player only
  const { isInitialized, isListening, pitchResult, initialize, start, stop } = usePitchDetector();

  // ── Report song playing status to page.tsx for Escape handler ──
  useEffect(() => {
    party.setIsSongPlaying(!!isPlaying);
  }, [isPlaying, party]);

  // ── Pause / Resume when page.tsx shows/hides the song-pause dialog ──
  useEffect(() => {
    if (party.pauseDialogAction === 'song-pause') {
      if (audioRef.current && !audioRef.current.paused) {
        audioRef.current.pause();
      }
    } else if (party.pauseDialogAction === null && isPlaying) {
      if (audioRef.current && audioRef.current.paused) {
        audioRef.current.play().catch(() => {});
      }
    }
  }, [party.pauseDialogAction, isPlaying]);

  // Track which notes have been processed to avoid double counting
  const processedNotesRef = useRef<Set<string>>(new Set());

  const currentSegment = segments[currentSegmentIndex];
  const currentPlayer = players[currentPlayerIndex];

  // Assign players to segments in round-robin order
  useEffect(() => {
    const updatedSegments = segments.map((seg, index) => ({
      ...seg,
      playerId: players[index % players.length].id,
    }));
    onUpdateGame(players, updatedSegments);
  }, []);

  // Game loop — uses requestAnimationFrame for smooth timing
  // NOTE: currentTime is driven ONLY by the audio element's onTimeUpdate.
  // We do NOT manually increment it here — that would conflict with the audio
  // source and cause erratic jumping / loop behaviour.
  useEffect(() => {
    if (!isPlaying) return;

    const checkSegmentSwitch = () => {
      // Random switches
      if (safeSettings.randomSwitches && Math.random() < 0.001) {
        const nextPlayer = (currentPlayerIndex + 1 + Math.floor(Math.random() * (players.length - 1))) % players.length;
        setCurrentPlayerIndex(nextPlayer);
        setSwitchCountdown(3);
      }
    };

    const interval = setInterval(checkSegmentSwitch, 100);
    return () => clearInterval(interval);
  }, [isPlaying, safeSettings.randomSwitches, currentPlayerIndex, players.length]);

  // Segment switching — driven by currentTime from audio onTimeUpdate
  useEffect(() => {
    if (!isPlaying) return;
    if (currentSegment && currentTime >= currentSegment.endTime) {
      if (currentSegmentIndex < segments.length - 1) {
        setCurrentSegmentIndex(prev => prev + 1);
        setCurrentPlayerIndex(prev => (prev + 1) % players.length);
      } else {
        setIsPlaying(false);
      }
    }
  }, [isPlaying, currentTime, currentSegment, currentSegmentIndex, segments.length, players.length]);

  // Switch countdown
  useEffect(() => {
    if (switchCountdown === null || switchCountdown <= 0) {
      setSwitchCountdown(null);
      return;
    }

    const timer = setTimeout(() => {
      setSwitchCountdown(prev => prev !== null ? prev - 1 : null);
    }, 1000);

    return () => clearTimeout(timer);
  }, [switchCountdown]);

  // Start game
  const startGame = async () => {
    setCountdown(3);
    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          setIsPlaying(true);
          // Reset currentTime for clean start
          setCurrentTime(0);
          if (audioRef.current) {
            audioRef.current.currentTime = 0;
            audioRef.current.play().catch((e) => {
              console.warn('[PassTheMic] Audio play failed:', e);
            });
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Progress calculation
  const progress = (currentTime / song.duration) * 100;
  const segmentProgress = currentSegment 
    ? ((currentTime - currentSegment.startTime) / (currentSegment.endTime - currentSegment.startTime)) * 100 
    : 0;

  // Get lyrics for current time
  const getCurrentLyrics = () => {
    if (!song.lyrics || song.lyrics.length === 0) return null;
    
    const currentLine = song.lyrics.find((line, index) => {
      const nextLine = song.lyrics[index + 1];
      return currentTime >= line.startTime && (!nextLine || currentTime < nextLine.startTime);
    });

    return currentLine;
  };

  const currentLyrics = getCurrentLyrics();

  return (
    <div className="max-w-6xl mx-auto">
      {/* Audio Element */}
      <audio
        ref={audioRef}
        src={song.audioUrl || song.videoBackground || ''}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime * 1000)}
        onEnded={() => setIsPlaying(false)}
        onError={(e) => console.error('[PassTheMic] Audio error:', e)}
        className="hidden"
        preload="auto"
      />

      {/* Quick Swap Overlay — shows when segment changes */}
      <QuickSwapOverlay
        currentTime={currentTime}
        isPlaying={isPlaying}
        segments={segments}
      />

      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Badge className="bg-cyan-500/20 text-cyan-400 text-lg px-3 py-1">🎤 PASS THE MIC</Badge>
          <span className="text-white/60 text-sm">{song.title}</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-purple-500/20 text-purple-400">
            Segment {currentSegmentIndex + 1}/{segments.length}
          </Badge>
        </div>
      </div>

      {/* Current Player Display */}
      <Card className={`bg-gradient-to-br ${currentPlayer ? `from-${currentPlayer.color}/20` : 'from-white/5'} border-white/10 mb-4`}>
        <CardContent className="py-6">
          <div className="text-center">
            {switchCountdown !== null && (
              <div className="mb-4 text-2xl text-yellow-400 animate-pulse">
                🔄 Switching in {switchCountdown}...
              </div>
            )}
            
            {!isPlaying && countdown > 0 ? (
              <div className="text-6xl font-bold text-cyan-400 animate-pulse">{countdown}</div>
            ) : !isPlaying && countdown === 0 ? (
              <Button onClick={startGame} className="bg-gradient-to-r from-cyan-500 to-blue-500 px-8 py-4 text-xl">
                🎤 Start Singing!
              </Button>
            ) : (
              <>
                <div className="text-sm text-white/60 mb-2">NOW SINGING</div>
                <div className="flex items-center justify-center gap-4 mb-4">
                  {currentPlayer?.avatar ? (
                    <img src={currentPlayer.avatar} alt={currentPlayer.name} className="w-16 h-16 rounded-full object-cover border-4 border-cyan-500" />
                  ) : (
                    <div 
                      className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold border-4 border-cyan-500"
                      style={{ backgroundColor: currentPlayer?.color }}
                    >
                      {currentPlayer?.name?.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="text-4xl font-bold">{currentPlayer?.name}</span>
                </div>
                <div className="text-2xl font-bold text-cyan-400">{currentPlayer?.score.toLocaleString()} pts</div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Progress */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-white/40 mb-1">
          <span>Song Progress</span>
          <span>{Math.floor(currentTime / 60000)}:{Math.floor((currentTime % 60000) / 1000).toString().padStart(2, '0')} / {Math.floor(song.duration / 60000)}:{Math.floor((song.duration % 60000) / 1000).toString().padStart(2, '0')}</span>
        </div>
        <Progress value={progress} className="h-2 bg-white/10" />
      </div>

      {/* Lyrics Display */}
      {currentLyrics && (
        <Card className="bg-black/30 border-white/10 mb-4">
          <CardContent className="py-6">
            <div className="text-center text-2xl font-bold text-white">
              {currentLyrics.text}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Player Queue */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-lg">Player Order</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {players.map((player, index) => (
              <div 
                key={player.id}
                className={`p-3 rounded-lg transition-all ${
                  index === currentPlayerIndex 
                    ? 'bg-gradient-to-br from-cyan-500/30 to-blue-500/30 border-2 border-cyan-500 scale-110' 
                    : 'bg-white/5 border border-white/10'
                }`}
              >
                <div className="flex items-center gap-2">
                  {player.avatar ? (
                    <img src={player.avatar} alt={player.name} className="w-8 h-8 rounded-full object-cover" />
                  ) : (
                    <div 
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                      style={{ backgroundColor: player.color }}
                    >
                      {player.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="font-medium">{player.name}</span>
                </div>
                <div className="text-xs text-white/40 mt-1">{player.score.toLocaleString()} pts</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* End Game Button */}
      {isPlaying && (
        <Button
          onClick={onEndGame}
          variant="outline"
          className="w-full mt-4 border-white/20 text-white/60 hover:text-white"
        >
          End Game Early
        </Button>
      )}

      {/* Game Over */}
      {!isPlaying && countdown === 0 && (
        <Card className="bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-500/30 mt-6">
          <CardContent className="py-8">
            <div className="text-center">
              <div className="text-6xl mb-4">🎉</div>
              <h2 className="text-2xl font-bold mb-4">Game Complete!</h2>
              <Button onClick={onEndGame} className="bg-gradient-to-r from-amber-500 to-yellow-500 px-8">
                Return to Menu
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
