'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Song, PlayerProfile, PLAYER_COLORS, Difficulty } from '@/types/game';
import { useGameStore } from '@/lib/game/store';
import { getAllSongs } from '@/lib/game/song-library';

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
}

const DEFAULT_SETTINGS: MedleySettings = {
  snippetDuration: 30,
  snippetCount: 5,
  transitionTime: 3,
  difficulty: 'medium',
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
    const availableSongs = songs.filter(s => s.duration > settings.snippetDuration * 1000);
    const shuffled = [...availableSongs].sort(() => Math.random() - 0.5);
    const selectedSongs = shuffled.slice(0, settings.snippetCount);
    
    return selectedSongs.map(song => {
      // Calculate random start time that allows for full snippet duration
      const maxStartTime = song.duration - settings.snippetDuration * 1000;
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
    if (selectedPlayers.length < 1) {
      setError('At least 1 player required');
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

// ===================== MEDLEY GAME VIEW =====================
interface MedleyGameViewProps {
  players: MedleyPlayer[];
  medleySongs: MedleySong[];
  settings: MedleySettings;
  onUpdatePlayers: (players: MedleyPlayer[]) => void;
  onEndGame: () => void;
}

export function MedleyGameView({ players, medleySongs, settings, onUpdatePlayers, onEndGame }: MedleyGameViewProps) {
  const [currentSongIndex, setCurrentSongIndex] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [songTime, setSongTime] = useState(0); // Time within current song snippet
  const [isPlaying, setIsPlaying] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [phase, setPhase] = useState<'countdown' | 'playing' | 'transition' | 'ended'>('countdown');
  const [transitionCountdown, setTransitionCountdown] = useState(settings.transitionTime);

  const currentMedleySong = medleySongs[currentSongIndex];
  const currentPlayer = players[0]; // In medley, all players sing together

  // Start game
  const startGame = () => {
    setCountdown(3);
    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          setIsPlaying(true);
          setPhase('playing');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Game loop
  useEffect(() => {
    if (!isPlaying || phase !== 'playing') return;

    const interval = setInterval(() => {
      setSongTime(prev => {
        const newTime = prev + 100;
        
        // Check if snippet ended
        if (newTime >= currentMedleySong.duration) {
          if (currentSongIndex < medleySongs.length - 1) {
            // Transition to next song
            setPhase('transition');
            setTransitionCountdown(settings.transitionTime);
            setIsPlaying(false);
          } else {
            // Game ended
            setPhase('ended');
            setIsPlaying(false);
          }
          return 0;
        }

        return newTime;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isPlaying, phase, currentMedleySong.duration, currentSongIndex, medleySongs.length, settings.transitionTime]);

  // Transition countdown
  useEffect(() => {
    if (phase !== 'transition') return;

    const interval = setInterval(() => {
      setTransitionCountdown(prev => {
        if (prev <= 1) {
          // Move to next song
          setCurrentSongIndex(i => i + 1);
          setPhase('playing');
          setIsPlaying(true);
          return settings.transitionTime;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [phase, settings.transitionTime]);

  // Calculate total progress
  const totalDuration = medleySongs.reduce((sum, s) => sum + s.duration, 0);
  const completedDuration = medleySongs.slice(0, currentSongIndex).reduce((sum, s) => sum + s.duration, 0);
  const currentProgress = songTime;
  const totalProgress = ((completedDuration + currentProgress) / totalDuration) * 100;

  // Snippet progress
  const snippetProgress = (songTime / currentMedleySong.duration) * 100;

  // Get lyrics for current time
  const getCurrentLyrics = () => {
    const song = currentMedleySong.song;
    if (!song.lyrics || song.lyrics.length === 0) return null;
    
    const actualTime = currentMedleySong.startTime + songTime;
    
    const currentLine = song.lyrics.find((line, index) => {
      const nextLine = song.lyrics[index + 1];
      return actualTime >= line.startTime && (!nextLine || actualTime < nextLine.startTime);
    });

    return currentLine;
  };

  const currentLyrics = getCurrentLyrics();

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Badge className="bg-purple-500/20 text-purple-400 text-lg px-3 py-1">🎵 MEDLEY CONTEST</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-pink-500/20 text-pink-400">
            Song {currentSongIndex + 1}/{medleySongs.length}
          </Badge>
        </div>
      </div>

      {/* Current Song Display */}
      <Card className={`bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/30 mb-4 ${
        phase === 'playing' ? '' : 'opacity-50'
      }`}>
        <CardContent className="py-6">
          {phase === 'countdown' && countdown > 0 ? (
            <div className="text-center">
              <div className="text-6xl font-bold text-purple-400 animate-pulse">{countdown}</div>
              <div className="text-lg text-white/60 mt-2">Get ready for Medley!</div>
            </div>
          ) : phase === 'countdown' && countdown === 0 ? (
            <div className="text-center">
              <div className="text-4xl mb-4">🎵</div>
              <h3 className="text-xl font-bold mb-2">Medley Contest</h3>
              <p className="text-white/60 mb-4">{medleySongs.length} song snippets await!</p>
              <Button onClick={startGame} className="bg-gradient-to-r from-purple-500 to-pink-500 px-8 py-4 text-xl">
                🎤 Start Medley!
              </Button>
            </div>
          ) : phase === 'transition' ? (
            <div className="text-center">
              <div className="text-4xl mb-4 animate-pulse">🔄</div>
              <h3 className="text-2xl font-bold mb-2">Next Song Coming...</h3>
              <div className="text-4xl font-bold text-pink-400">{transitionCountdown}</div>
              <div className="text-white/60 mt-2">Get ready!</div>
            </div>
          ) : phase === 'ended' ? (
            <div className="text-center">
              <div className="text-6xl mb-4">🎉</div>
              <h2 className="text-2xl font-bold mb-4">Medley Complete!</h2>
              <Button onClick={onEndGame} className="bg-gradient-to-r from-purple-500 to-pink-500 px-8">
                Return to Menu
              </Button>
            </div>
          ) : (
            <>
              {/* Current Song Info */}
              <div className="text-center mb-4">
                <div className="text-sm text-white/60 mb-1">NOW SINGING</div>
                <h3 className="text-2xl font-bold">{currentMedleySong.song.title}</h3>
                <p className="text-white/60">{currentMedleySong.song.artist}</p>
              </div>

              {/* Snippet Progress */}
              <div className="mb-4">
                <div className="flex justify-between text-xs text-white/40 mb-1">
                  <span>Snippet Progress</span>
                  <span>{Math.floor(songTime / 1000)}s / {Math.floor(currentMedleySong.duration / 1000)}s</span>
                </div>
                <Progress value={snippetProgress} className="h-3 bg-white/10" />
              </div>

              {/* Player Scores */}
              <div className="flex justify-center gap-6">
                {players.map(player => (
                  <div key={player.id} className="text-center">
                    {player.avatar ? (
                      <img src={player.avatar} alt={player.name} className="w-12 h-12 rounded-full object-cover mx-auto border-2 border-purple-500" />
                    ) : (
                      <div 
                        className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold mx-auto border-2 border-purple-500"
                        style={{ backgroundColor: player.color }}
                      >
                        {player.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="font-medium mt-1">{player.name}</div>
                    <div className="text-purple-400 font-bold">{player.score.toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Total Progress */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-white/40 mb-1">
          <span>Total Progress</span>
          <span>Song {currentSongIndex + 1} of {medleySongs.length}</span>
        </div>
        <Progress value={totalProgress} className="h-2 bg-white/10" />
      </div>

      {/* Song Queue Preview */}
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
                  index === currentSongIndex 
                    ? 'bg-gradient-to-br from-purple-500/30 to-pink-500/30 border-2 border-purple-500' 
                    : index < currentSongIndex 
                      ? 'bg-white/5 border border-white/10 opacity-50' 
                      : 'bg-white/5 border border-white/10'
                }`}
              >
                <div className="flex items-center gap-2">
                  {medleySong.song.coverImage ? (
                    <img src={medleySong.song.coverImage} alt="" className="w-10 h-10 rounded object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded bg-purple-500/20 flex items-center justify-center">
                      🎵
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate text-sm">{medleySong.song.title}</p>
                    <p className="text-xs text-white/40">{Math.floor(medleySong.duration / 1000)}s</p>
                  </div>
                </div>
                {index < currentSongIndex && <div className="text-xs text-green-400 mt-1">✓ Done</div>}
                {index === currentSongIndex && phase === 'playing' && <div className="text-xs text-purple-400 mt-1">♪ Now</div>}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Lyrics Display */}
      {phase === 'playing' && currentLyrics && (
        <Card className="bg-black/30 border-white/10 mb-4">
          <CardContent className="py-6">
            <div className="text-center text-2xl font-bold text-white">
              {currentLyrics.text}
            </div>
          </CardContent>
        </Card>
      )}

      {/* End Game Button */}
      {isPlaying && (
        <Button
          onClick={onEndGame}
          variant="outline"
          className="w-full border-white/20 text-white/60 hover:text-white"
        >
          End Game Early
        </Button>
      )}
    </div>
  );
}
