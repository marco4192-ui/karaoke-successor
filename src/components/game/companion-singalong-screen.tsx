'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Song, PlayerProfile, PLAYER_COLORS, LyricLine, Difficulty } from '@/types/game';
import { useGameStore } from '@/lib/game/store';
import { getAllSongs } from '@/lib/game/song-library';
import { setGameType } from '@/lib/audio/mobile-audio-processor';

interface CompanionPlayer {
  id: string;
  name: string;
  avatar?: string;
  color: string;
  score: number;
  notesHit: number;
  notesMissed: number;
  combo: number;
  maxCombo: number;
  deviceConnected: boolean;
  turnCount: number;
}

interface CompanionSingAlongSettings {
  minTurnDuration: number; // minimum seconds before next random switch
  maxTurnDuration: number; // maximum seconds before next random switch
  difficulty: Difficulty;
  blinkWarning: number; // seconds of blink warning before switch
}

const DEFAULT_SETTINGS: CompanionSingAlongSettings = {
  minTurnDuration: 15,
  maxTurnDuration: 45,
  difficulty: 'medium',
  blinkWarning: 3,
};

interface CompanionSingAlongSetupProps {
  profiles: PlayerProfile[];
  onSelectSong: (players: CompanionPlayer[], settings: CompanionSingAlongSettings) => void;
  onBack: () => void;
}

export function CompanionSingAlongSetupScreen({ profiles, onSelectSong, onBack }: CompanionSingAlongSetupProps) {
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [settings, setSettings] = useState<CompanionSingAlongSettings>(DEFAULT_SETTINGS);
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
    const players: CompanionPlayer[] = selectedPlayers.map((id, index) => {
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
        deviceConnected: true, // Assume all devices connected
        turnCount: 0,
      };
    });

    onSelectSong(players, { ...settings, difficulty: globalDifficulty });
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={onBack} className="text-white/60">
          ← Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold">📱 Companion Sing-A-Long</h1>
          <p className="text-white/60">Your phone randomly lights up - that's your cue to sing!</p>
        </div>
      </div>

      {/* How it works */}
      <Card className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/30 mb-6">
        <CardContent className="py-4">
          <h3 className="font-bold text-lg mb-2 text-emerald-400">🎮 How it works</h3>
          <ul className="text-sm text-white/70 space-y-2">
            <li>📱 Everyone keeps their phone nearby</li>
            <li>⚡ When your phone screen flashes, it's YOUR turn to sing!</li>
            <li>🎤 No one knows who's next until the blink</li>
            <li>🏆 Score points for your team while you sing!</li>
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
          <CardTitle>Game Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Min Turn Duration */}
          <div>
            <label className="text-sm text-white/60 mb-2 block">Min Turn Duration: {settings.minTurnDuration}s</label>
            <input
              type="range"
              min={5}
              max={30}
              step={5}
              value={settings.minTurnDuration}
              onChange={(e) => setSettings(prev => ({ ...prev, minTurnDuration: Number(e.target.value) }))}
              className="w-full"
            />
          </div>

          {/* Max Turn Duration */}
          <div>
            <label className="text-sm text-white/60 mb-2 block">Max Turn Duration: {settings.maxTurnDuration}s</label>
            <input
              type="range"
              min={30}
              max={90}
              step={5}
              value={settings.maxTurnDuration}
              onChange={(e) => setSettings(prev => ({ ...prev, maxTurnDuration: Number(e.target.value) }))}
              className="w-full"
            />
          </div>

          {/* Blink Warning */}
          <div>
            <label className="text-sm text-white/60 mb-2 block">Blink Warning: {settings.blinkWarning}s</label>
            <input
              type="range"
              min={1}
              max={5}
              step={1}
              value={settings.blinkWarning}
              onChange={(e) => setSettings(prev => ({ ...prev, blinkWarning: Number(e.target.value) }))}
              className="w-full"
            />
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
                  className={globalDifficulty === diff ? 'bg-emerald-500 hover:bg-emerald-600' : 'border-white/20'}
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
                      ? 'bg-gradient-to-br from-emerald-500/30 to-teal-500/30 border-2 border-emerald-500' 
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
                    {isSelected && <span className="ml-auto text-emerald-400">✓</span>}
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
      <Card className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/30 mb-6">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-lg">Ready to Play!</h3>
              <p className="text-sm text-white/60">{selectedPlayers.length} players selected</p>
              <p className="text-xs text-white/40 mt-1">
                Turn duration: {settings.minTurnDuration}-{settings.maxTurnDuration}s • Blink warning: {settings.blinkWarning}s
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-emerald-400">{selectedPlayers.length}</div>
              <div className="text-xs text-white/40">players</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Select Song Button */}
      <Button
        onClick={handleSelectSong}
        disabled={selectedPlayers.length < 2}
        className="w-full py-6 text-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400"
      >
        🎵 Select Song ({selectedPlayers.length} Players)
      </Button>
    </div>
  );
}

// ===================== COMPANION GAME VIEW =====================
interface CompanionGameViewProps {
  players: CompanionPlayer[];
  song: Song;
  settings: CompanionSingAlongSettings;
  onUpdatePlayers: (players: CompanionPlayer[]) => void;
  onEndGame: () => void;
}

export function CompanionGameView({ players, song, settings, onUpdatePlayers, onEndGame }: CompanionGameViewProps) {
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [nextPlayerIndex, setNextPlayerIndex] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [switchWarning, setSwitchWarning] = useState(false);
  const [timeUntilSwitch, setTimeUntilSwitch] = useState(0);
  const [gamePhase, setGamePhase] = useState<'setup' | 'playing' | 'switching' | 'ended'>('setup');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Set game type for audio streaming mode (not Battle Royale)
  useEffect(() => {
    setGameType('companion-singalong');
    return () => {
      // Reset to default when unmounting
      setGameType('single');
    };
  }, []);

  const currentPlayer = players[currentPlayerIndex];

  // Generate random switch time
  const generateSwitchTime = useCallback(() => {
    return (
      settings.minTurnDuration * 1000 + 
      Math.random() * (settings.maxTurnDuration - settings.minTurnDuration) * 1000
    );
  }, [settings.minTurnDuration, settings.maxTurnDuration]);

  // Start the game
  const startGame = async () => {
    setCountdown(3);
    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          setIsPlaying(true);
          setGamePhase('playing');
          // Set initial switch time
          setTimeUntilSwitch(generateSwitchTime());
          if (audioRef.current && song.audioUrl) {
            audioRef.current.play().catch(() => {});
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Handle random player switch
  const switchPlayer = useCallback(() => {
    // Pick random different player
    let newPlayerIndex: number;
    do {
      newPlayerIndex = Math.floor(Math.random() * players.length);
    } while (newPlayerIndex === currentPlayerIndex && players.length > 1);

    setNextPlayerIndex(newPlayerIndex);
    setGamePhase('switching');
    setSwitchWarning(false);

    // Flash animation, then switch
    setTimeout(() => {
      setCurrentPlayerIndex(newPlayerIndex);
      setNextPlayerIndex(null);
      setGamePhase('playing');
      setTimeUntilSwitch(generateSwitchTime());
    }, 2000);
  }, [currentPlayerIndex, players.length, generateSwitchTime]);

  // Game loop
  useEffect(() => {
    if (!isPlaying || gamePhase !== 'playing') return;

    const interval = setInterval(() => {
      setCurrentTime(prev => {
        const newTime = prev + 100;
        
        // Update switch countdown
        setTimeUntilSwitch(prev => {
          const newSwitchTime = prev - 100;
          
          // Warning blink
          if (newSwitchTime <= settings.blinkWarning * 1000 && !switchWarning) {
            setSwitchWarning(true);
          }
          
          // Time to switch!
          if (newSwitchTime <= 0) {
            switchPlayer();
            return generateSwitchTime();
          }
          
          return newSwitchTime;
        });

        // Check if song ended
        if (newTime >= song.duration) {
          setIsPlaying(false);
          setGamePhase('ended');
        }

        return newTime;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isPlaying, gamePhase, switchWarning, settings.blinkWarning, song.duration, switchPlayer, generateSwitchTime]);

  // Progress calculation
  const progress = (currentTime / song.duration) * 100;
  const switchProgress = (timeUntilSwitch / (settings.maxTurnDuration * 1000)) * 100;

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
      {song.audioUrl && (
        <audio
          ref={audioRef}
          src={song.audioUrl}
          onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime * 1000)}
          onEnded={() => { setIsPlaying(false); setGamePhase('ended'); }}
          className="hidden"
        />
      )}

      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Badge className="bg-emerald-500/20 text-emerald-400 text-lg px-3 py-1">📱 COMPANION SING-A-LONG</Badge>
          <span className="text-white/60 text-sm">{song.title}</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-purple-500/20 text-purple-400">
            {Math.floor(currentTime / 60000)}:{Math.floor((currentTime % 60000) / 1000).toString().padStart(2, '0')}
          </Badge>
        </div>
      </div>

      {/* Current Player Display */}
      <Card className={`relative overflow-hidden ${
        gamePhase === 'switching' 
          ? 'animate-pulse bg-gradient-to-br from-yellow-500/30 to-orange-500/30 border-2 border-yellow-500' 
          : switchWarning 
            ? 'animate-pulse bg-gradient-to-br from-red-500/30 to-pink-500/30 border-2 border-red-500' 
            : 'bg-white/5 border-white/10'
      } mb-4`}>
        {gamePhase === 'switching' && (
          <div className="absolute inset-0 bg-yellow-500/20 animate-pulse flex items-center justify-center">
            <div className="text-center">
              <div className="text-4xl mb-2">🔄</div>
              <div className="text-xl font-bold text-yellow-400">SWITCHING TO...</div>
              <div className="text-2xl font-bold mt-2">{players[nextPlayerIndex!]?.name}</div>
            </div>
          </div>
        )}
        <CardContent className="py-8">
          {!isPlaying && countdown > 0 ? (
            <div className="text-center">
              <div className="text-6xl font-bold text-emerald-400 animate-pulse">{countdown}</div>
              <div className="text-lg text-white/60 mt-2">Get ready!</div>
            </div>
          ) : !isPlaying && gamePhase === 'setup' ? (
            <div className="text-center">
              <div className="text-4xl mb-4">📱</div>
              <h3 className="text-xl font-bold mb-2">Everyone keep your phone nearby!</h3>
              <p className="text-white/60 mb-4">When your screen flashes, it's your turn to sing!</p>
              <Button onClick={startGame} className="bg-gradient-to-r from-emerald-500 to-teal-500 px-8 py-4 text-xl">
                🎤 Start!
              </Button>
            </div>
          ) : (
            <div className="text-center">
              {switchWarning && (
                <div className="mb-4 text-xl text-red-400 animate-pulse">
                  ⚡ SWITCH COMING SOON! ⚡
                </div>
              )}
              
              <div className="text-sm text-white/60 mb-2">NOW SINGING</div>
              <div className="flex items-center justify-center gap-4 mb-4">
                {currentPlayer?.avatar ? (
                  <img src={currentPlayer.avatar} alt={currentPlayer.name} className="w-20 h-20 rounded-full object-cover border-4 border-emerald-500" />
                ) : (
                  <div 
                    className="w-20 h-20 rounded-full flex items-center justify-center text-white text-3xl font-bold border-4 border-emerald-500"
                    style={{ backgroundColor: currentPlayer?.color }}
                  >
                    {currentPlayer?.name?.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="text-5xl font-bold">{currentPlayer?.name}</span>
              </div>
              <div className="text-3xl font-bold text-emerald-400">{currentPlayer?.score.toLocaleString()} pts</div>
              <div className="text-sm text-white/40 mt-2">Turn #{currentPlayer?.turnCount}</div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Progress */}
      <div className="mb-4 space-y-2">
        <div>
          <div className="flex justify-between text-xs text-white/40 mb-1">
            <span>Song Progress</span>
            <span>{Math.floor(currentTime / 60000)}:{Math.floor((currentTime % 60000) / 1000).toString().padStart(2, '0')} / {Math.floor(song.duration / 60000)}:{Math.floor((song.duration % 60000) / 1000).toString().padStart(2, '0')}</span>
          </div>
          <Progress value={progress} className="h-2 bg-white/10" />
        </div>
        
        {isPlaying && gamePhase === 'playing' && (
          <div>
            <div className="flex justify-between text-xs text-white/40 mb-1">
              <span>Next Switch</span>
              <span>{Math.ceil(timeUntilSwitch / 1000)}s</span>
            </div>
            <Progress 
              value={switchProgress} 
              className={`h-1 ${switchWarning ? 'bg-red-500/30' : 'bg-white/10'}`}
            />
          </div>
        )}
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
          <CardTitle className="text-lg">Players ({players.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {players.map((player, index) => (
              <div 
                key={player.id}
                className={`p-3 rounded-lg transition-all ${
                  index === currentPlayerIndex 
                    ? 'bg-gradient-to-br from-emerald-500/30 to-teal-500/30 border-2 border-emerald-500 scale-110' 
                    : index === nextPlayerIndex 
                      ? 'bg-gradient-to-br from-yellow-500/30 to-orange-500/30 border-2 border-yellow-500 animate-pulse'
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
      {gamePhase === 'ended' && (
        <Card className="bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-500/30 mt-6">
          <CardContent className="py-8">
            <div className="text-center">
              <div className="text-6xl mb-4">🎉</div>
              <h2 className="text-2xl font-bold mb-4">Game Complete!</h2>
              <div className="mb-6">
                <h3 className="text-lg font-bold mb-2">Final Scores:</h3>
                <div className="flex flex-wrap justify-center gap-3">
                  {[...players].sort((a, b) => b.score - a.score).map((player, index) => (
                    <div key={player.id} className={`p-3 rounded-lg ${index === 0 ? 'bg-amber-500/20 border border-amber-500' : 'bg-white/5'}`}>
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
                        {index === 0 && <span className="text-amber-400">👑</span>}
                      </div>
                      <div className="text-sm text-white/60 mt-1">{player.score.toLocaleString()} pts</div>
                    </div>
                  ))}
                </div>
              </div>
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
