'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  createBattleRoyale,
  getActivePlayers,
  getPlayersByScore,
  startRound,
  endRoundAndEliminate,
  advanceToNextRound,
  getBattleRoyaleStats,
  addCompanionPlayer,
  removeCompanionPlayer,
  updatePlayerScore,
  BattleRoyaleGame,
  BattleRoyalePlayer,
  BattleRoyaleSettings,
  DEFAULT_BATTLE_ROYALE_SETTINGS,
  MAX_LOCAL_MIC_PLAYERS,
  MAX_COMPANION_PLAYERS,
  MAX_BATTLE_ROYALE_PLAYERS,
  PlayerType,
} from '@/lib/game/battle-royale';
import { Song, PlayerProfile, PLAYER_COLORS, Note, LyricLine, Difficulty, DIFFICULTY_SETTINGS, frequencyToMidi } from '@/types/game';
import { getSongMediaUrls } from '@/lib/db/media-db';
import { useGameStore } from '@/lib/game/store';
import { usePitchDetector } from '@/hooks/use-pitch-detector';
import { evaluateTick, calculateTickPoints, calculateScoringMetadata, getRelativePitchDiff } from '@/lib/game/scoring';
import { getMultiMicrophoneManager, MultiMicrophoneManager } from '@/lib/audio/microphone-manager';

interface BattleRoyaleSetupProps {
  profiles: PlayerProfile[];
  songs: Song[];
  onStartGame: (game: BattleRoyaleGame) => void;
  onBack: () => void;
}

export function BattleRoyaleSetupScreen({ profiles, songs, onStartGame, onBack }: BattleRoyaleSetupProps) {
  const [micPlayers, setMicPlayers] = useState<string[]>([]);
  const [companionPlayers, setCompanionPlayers] = useState<string[]>([]);
  const [roundDuration, setRoundDuration] = useState(60);
  const [finalRoundDuration, setFinalRoundDuration] = useState(120);
  const [medleyMode, setMedleyMode] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter to only show active profiles (isActive === true or undefined for backwards compatibility)
  const activeProfiles = useMemo(() => 
    profiles.filter(p => p.isActive !== false),
    [profiles]
  );

  // Use global difficulty from store instead of local state
  const globalDifficulty = useGameStore((state) => state.gameState.difficulty);
  const setGlobalDifficulty = useGameStore((state) => state.setDifficulty);
  const difficulty = globalDifficulty;

  const totalPlayers = micPlayers.length + companionPlayers.length;

  const toggleMicPlayer = (playerId: string) => {
    setMicPlayers(prev => {
      if (prev.includes(playerId)) {
        return prev.filter(id => id !== playerId);
      }
      if (prev.length >= MAX_LOCAL_MIC_PLAYERS) {
        setError(`Maximum ${MAX_LOCAL_MIC_PLAYERS} local microphone players`);
        return prev;
      }
      // Remove from companion if present
      setCompanionPlayers(cp => cp.filter(id => id !== playerId));
      setError(null);
      return [...prev, playerId];
    });
  };

  const toggleCompanionPlayer = (playerId: string) => {
    setCompanionPlayers(prev => {
      if (prev.includes(playerId)) {
        return prev.filter(id => id !== playerId);
      }
      if (prev.length >= MAX_COMPANION_PLAYERS) {
        setError(`Maximum ${MAX_COMPANION_PLAYERS} companion players`);
        return prev;
      }
      if (totalPlayers >= MAX_BATTLE_ROYALE_PLAYERS) {
        setError(`Maximum ${MAX_BATTLE_ROYALE_PLAYERS} total players`);
        return prev;
      }
      // Remove from mic if present
      setMicPlayers(mp => mp.filter(id => id !== playerId));
      setError(null);
      return [...prev, playerId];
    });
  };

  const handleStartGame = () => {
    if (totalPlayers < 2) {
      setError('Minimum 2 players required');
      return;
    }

    const players: Array<{
      id: string;
      name: string;
      avatar?: string;
      color: string;
      playerType: PlayerType;
    }> = [];

    // Add microphone players
    micPlayers.forEach((id) => {
      const profile = profiles.find(p => p.id === id);
      players.push({
        id,
        name: profile?.name || 'Unknown',
        avatar: profile?.avatar,
        color: profile?.color || PLAYER_COLORS[players.length % PLAYER_COLORS.length],
        playerType: 'microphone',
      });
    });

    // Add companion players
    companionPlayers.forEach((id) => {
      const profile = profiles.find(p => p.id === id);
      players.push({
        id,
        name: profile?.name || 'Unknown',
        avatar: profile?.avatar,
        color: profile?.color || PLAYER_COLORS[players.length % PLAYER_COLORS.length],
        playerType: 'companion',
      });
    });

    const settings: BattleRoyaleSettings = {
      ...DEFAULT_BATTLE_ROYALE_SETTINGS,
      roundDuration,
      finalRoundDuration,
      medleyMode,
      difficulty,
    };

    const songIds = songs.map(s => s.id);

    try {
      const game = createBattleRoyale(players, settings, songIds);
      onStartGame(game);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create game');
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={onBack} className="text-white/60">
          ← Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold">👑 Battle Royale</h1>
          <p className="text-white/60">All sing together - lowest score eliminated each round!</p>
        </div>
      </div>

      {/* Player Limits Info */}
      <div className="bg-gradient-to-r from-red-500/20 to-pink-500/20 border border-red-500/30 rounded-lg p-4 mb-6">
        <div className="flex flex-wrap gap-6 text-center justify-center">
          <div>
            <div className="text-3xl font-bold text-red-400">{micPlayers.length}/{MAX_LOCAL_MIC_PLAYERS}</div>
            <div className="text-sm text-white/60">🎤 Local Mics</div>
          </div>
          <div className="text-white/20 text-4xl">+</div>
          <div>
            <div className="text-3xl font-bold text-purple-400">{companionPlayers.length}/{MAX_COMPANION_PLAYERS}</div>
            <div className="text-sm text-white/60">📱 Companions</div>
          </div>
          <div className="text-white/20 text-4xl">=</div>
          <div>
            <div className="text-3xl font-bold text-amber-400">{totalPlayers}/{MAX_BATTLE_ROYALE_PLAYERS}</div>
            <div className="text-sm text-white/60">👥 Total</div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 mb-6 text-red-400">
          {error}
        </div>
      )}

      {/* Game Settings */}
      <Card className="bg-white/5 border-white/10 mb-6">
        <CardHeader>
          <CardTitle>Game Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Round Duration */}
          <div>
            <label className="text-sm text-white/60 mb-2 block">Round Duration: {roundDuration}s</label>
            <input
              type="range"
              min={30}
              max={180}
              step={15}
              value={roundDuration}
              onChange={(e) => setRoundDuration(Number(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-white/40 mt-1">
              <span>30s (Fast)</span>
              <span>180s (Long)</span>
            </div>
          </div>

          {/* Final Round Duration */}
          <div>
            <label className="text-sm text-white/60 mb-2 block">Final Round Duration: {finalRoundDuration}s</label>
            <input
              type="range"
              min={60}
              max={300}
              step={30}
              value={finalRoundDuration}
              onChange={(e) => setFinalRoundDuration(Number(e.target.value))}
              className="w-full"
            />
          </div>

          {/* Medley Mode */}
          <div className="flex items-center justify-between">
            <div>
              <label className="font-medium">Medley Mode</label>
              <p className="text-sm text-white/60">Multiple song snippets per round</p>
            </div>
            <Button
              variant={medleyMode ? 'default' : 'outline'}
              onClick={() => setMedleyMode(!medleyMode)}
              className={medleyMode ? 'bg-purple-500 hover:bg-purple-600' : 'border-white/20'}
            >
              {medleyMode ? '✓ On' : 'Off'}
            </Button>
          </div>

          {/* Difficulty */}
          <div>
            <label className="text-sm text-white/60 mb-2 block">Difficulty</label>
            <div className="flex gap-2">
              {['easy', 'medium', 'hard'].map(diff => (
                <Button
                  key={diff}
                  variant={difficulty === diff ? 'default' : 'outline'}
                  onClick={() => setGlobalDifficulty(diff as Difficulty)}
                  className={difficulty === diff ? 'bg-red-500 hover:bg-red-600' : 'border-white/20'}
                >
                  {diff.charAt(0).toUpperCase() + diff.slice(1)}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Player Selection - Two Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Local Microphone Players */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-2xl">🎤</span>
              Local Microphone
              <Badge variant="outline" className="border-red-500 text-red-400">
                {micPlayers.length}/{MAX_LOCAL_MIC_PLAYERS}
              </Badge>
            </CardTitle>
            <p className="text-sm text-white/60">Players at this device with microphone</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {activeProfiles.map(profile => {
                const isSelected = micPlayers.includes(profile.id);
                const isCompanion = companionPlayers.includes(profile.id);
                return (
                  <div
                    key={profile.id}
                    onClick={() => !isCompanion && toggleMicPlayer(profile.id)}
                    className={`p-3 rounded-lg cursor-pointer transition-all ${
                      isCompanion 
                        ? 'opacity-30 cursor-not-allowed' 
                        : isSelected 
                          ? 'bg-gradient-to-br from-red-500/30 to-pink-500/30 border-2 border-red-500' 
                          : 'bg-white/5 border border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {profile.avatar ? (
                        <img src={profile.avatar} alt={profile.name} className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <div 
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                          style={{ backgroundColor: profile.color }}
                        >
                          {profile.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="font-medium truncate text-sm">{profile.name}</span>
                      {isSelected && <span className="ml-auto text-red-400 text-lg">🎤</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Companion Players */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-2xl">📱</span>
              Companion App
              <Badge variant="outline" className="border-purple-500 text-purple-400">
                {companionPlayers.length}/{MAX_COMPANION_PLAYERS}
              </Badge>
            </CardTitle>
            <p className="text-sm text-white/60">Players using the mobile companion app</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {activeProfiles.map(profile => {
                const isSelected = companionPlayers.includes(profile.id);
                const isMic = micPlayers.includes(profile.id);
                return (
                  <div
                    key={profile.id}
                    onClick={() => !isMic && toggleCompanionPlayer(profile.id)}
                    className={`p-3 rounded-lg cursor-pointer transition-all ${
                      isMic 
                        ? 'opacity-30 cursor-not-allowed' 
                        : isSelected 
                          ? 'bg-gradient-to-br from-purple-500/30 to-indigo-500/30 border-2 border-purple-500' 
                          : 'bg-white/5 border border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {profile.avatar ? (
                        <img src={profile.avatar} alt={profile.name} className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <div 
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                          style={{ backgroundColor: profile.color }}
                        >
                          {profile.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="font-medium truncate text-sm">{profile.name}</span>
                      {isSelected && <span className="ml-auto text-purple-400 text-lg">📱</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary */}
      <Card className="bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border border-amber-500/30 mb-6">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-lg">Ready to Battle!</h3>
              <p className="text-sm text-white/60">
                {micPlayers.length} mic + {companionPlayers.length} companion = {totalPlayers} total players
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-amber-400">{totalPlayers}</div>
              <div className="text-xs text-white/40">players selected</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Start Button */}
      <Button
        onClick={handleStartGame}
        disabled={totalPlayers < 2}
        className="w-full py-6 text-xl bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-400 hover:to-pink-400"
      >
        👑 Start Battle Royale ({totalPlayers} Players)
      </Button>
    </div>
  );
}

// Battle Royale Game View
interface BattleRoyaleGameViewProps {
  game: BattleRoyaleGame;
  songs: Song[];
  onUpdateGame: (game: BattleRoyaleGame) => void;
  onEndGame: () => void;
}

export function BattleRoyaleGameView({ game, songs, onUpdateGame, onEndGame }: BattleRoyaleGameViewProps) {
  const [showElimination, setShowElimination] = useState(false);
  const stats = getBattleRoyaleStats(game);

  const sortedPlayers = useMemo(() => getPlayersByScore(game), [game]);
  const activePlayers = useMemo(() => getActivePlayers(game), [game]);
  const currentRound = game.rounds[game.rounds.length - 1];
  
  // Get difficulty from game settings
  const difficulty = game.settings.difficulty || 'medium';
  
  // Pitch detection for all active microphone players (Champions League - all sing simultaneously)
  const { isInitialized: pitchInitialized, isListening, pitchResult, initialize: initPitch, start: startPitch, stop: stopPitch } = usePitchDetector();
  
  // Game state
  // Derive currentSong directly from currentRound and songs
  const currentSong = useMemo(() => {
    if (!currentRound?.songId) return null;
    return songs.find(s => s.id === currentRound.songId) || null;
  }, [currentRound?.songId, songs]);
  
  const [mediaLoaded, setMediaLoaded] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [roundTimeLeft, setRoundTimeLeft] = useState(currentRound?.duration || 0);
  
  // Media playback refs
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const gameLoopRef = useRef<number | null>(null);
  const lastScoringTimeRef = useRef<number>(0);
  const noteProgressRef = useRef<Map<string, { ticksHit: number; ticksTotal: number }>>(new Map());
  
  // Pre-compute timing data for scoring when song is loaded
  const timingData = useMemo(() => {
    if (!currentSong || currentSong.lyrics.length === 0) return null;
    
    // Create flat array of all notes
    const allNotes: Array<Note & { lineIndex: number }> = [];
    currentSong.lyrics.forEach((line, lineIndex) => {
      line.notes.forEach(note => {
        allNotes.push({ ...note, lineIndex });
      });
    });
    allNotes.sort((a, b) => a.startTime - b.startTime);
    
    // Calculate beat duration
    const beatDurationMs = currentSong.bpm ? 15000 / currentSong.bpm : 500;
    
    // Calculate scoring metadata
    const scoringMetadata = calculateScoringMetadata(allNotes, beatDurationMs);
    
    return { allNotes, beatDuration: beatDurationMs, scoringMetadata };
  }, [currentSong]);

  // Load media when song changes
  useEffect(() => {
    const loadMedia = async () => {
      if (!currentSong) {
        setMediaLoaded(false);
        return;
      }
      
      let audioUrl = currentSong.audioUrl;
      let videoUrl = currentSong.videoBackground;
      
      // Load from IndexedDB if storedMedia flag is set
      if (currentSong.storedMedia) {
        try {
          const mediaUrls = await getSongMediaUrls(currentSong.id);
          if (mediaUrls.audioUrl) audioUrl = mediaUrls.audioUrl;
          if (mediaUrls.videoUrl) videoUrl = mediaUrls.videoUrl;
        } catch (e) {
          console.error('Failed to load media from IndexedDB:', e);
        }
      }
      
      // Set up audio element
      if (audioRef.current && audioUrl) {
        audioRef.current.src = audioUrl;
        audioRef.current.load();
      }
      
      // Set up video element
      if (videoRef.current && videoUrl) {
        videoRef.current.src = videoUrl;
        videoRef.current.load();
      }
      
      setMediaLoaded(true);
    };
    
    loadMedia();
  }, [currentSong]);
  
  // Game loop for simultaneous scoring (Champions League - all players scored at once)
  const startGameLoop = useCallback(() => {
    const TICK_INTERVAL = 100; // 100ms between scoring evaluations
    let lastTickTime = performance.now();
    
    const gameLoop = (timestamp: number) => {
      if (game.status !== 'playing') return;
      
      const deltaTime = timestamp - lastTickTime;
      
      // Update current time from audio
      if (audioRef.current) {
        setCurrentTime(audioRef.current.currentTime * 1000);
      }
      
      // Evaluate scoring for all active players simultaneously
      if (deltaTime >= TICK_INTERVAL && pitchResult && timingData && currentSong) {
        lastTickTime = timestamp;
        
        // Get the detected pitch from microphone
        const detectedPitch = pitchResult.note; // MIDI note number
        
        // Find active notes at current time
        const currentAudioTime = audioRef.current ? audioRef.current.currentTime * 1000 : currentTime;
        
        timingData.allNotes.forEach(note => {
          // Check if note is currently active (within its time window)
          if (currentAudioTime >= note.startTime && currentAudioTime <= note.startTime + note.duration) {
            // Score for all active microphone players simultaneously
            const micPlayers = activePlayers.filter(p => p.playerType === 'microphone' && !p.eliminated);
            
            micPlayers.forEach(player => {
              // Evaluate this tick for this player
              const tickResult = evaluateTick(detectedPitch || 0, note.pitch, difficulty);
              
              if (tickResult.isHit) {
                // Calculate points
                const points = calculateTickPoints(
                  tickResult.accuracy,
                  note.isGolden,
                  timingData.scoringMetadata.pointsPerTick,
                  difficulty
                );
                
                // Update player score
                const updatedGame = updatePlayerScore(
                  game,
                  player.id,
                  points,
                  tickResult.accuracy,
                  1, // notesHitDelta
                  0, // notesMissedDelta
                  1  // comboDelta
                );
                onUpdateGame(updatedGame);
              }
            });
          }
        });
      }
      
      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };
    
    gameLoopRef.current = requestAnimationFrame(gameLoop);
  }, [game, pitchResult, timingData, currentSong, currentTime, activePlayers, difficulty, onUpdateGame]);

  // Initialize pitch detection and start game loop when playing
  useEffect(() => {
    if (game.status === 'playing' && mediaLoaded && currentSong) {
      // Initialize pitch detection
      const initGame = async () => {
        if (!pitchInitialized) {
          await initPitch();
        }
        startPitch();
        
        // Start audio/video playback
        if (audioRef.current && currentSong.audioUrl) {
          audioRef.current.play().catch(e => console.error('Audio play error:', e));
        }
        if (videoRef.current && currentSong.videoBackground) {
          videoRef.current.play().catch(e => console.error('Video play error:', e));
        }
        
        // Start game loop for simultaneous scoring
        startGameLoop();
      };
      
      initGame();
      
      return () => {
        stopPitch();
        if (gameLoopRef.current) {
          cancelAnimationFrame(gameLoopRef.current);
        }
      };
    }
  }, [game.status, mediaLoaded, currentSong, pitchInitialized, initPitch, startPitch, stopPitch, startGameLoop]);

  // Get random song for the round
  const getRandomSong = useCallback((): Song | null => {
    if (songs.length === 0) return null;
    return songs[Math.floor(Math.random() * songs.length)];
  }, [songs]);
  
  // Handle round end - eliminates lowest scoring player
  const handleRoundEnd = useCallback(() => {
    // Stop media
    if (audioRef.current) {
      audioRef.current.pause();
    }
    if (videoRef.current) {
      videoRef.current.pause();
    }
    
    // Stop pitch detection
    stopPitch();
    
    if (activePlayers.length <= 1) return;

    const updatedGame = endRoundAndEliminate(game);
    onUpdateGame(updatedGame);
    setShowElimination(true);

    setTimeout(() => {
      setShowElimination(false);
      
      if (updatedGame.winner) {
        return;
      }
      
      const nextGame = advanceToNextRound(updatedGame);
      onUpdateGame(nextGame);
    }, 4000); // 4 seconds to show elimination animation
  }, [activePlayers.length, game, onUpdateGame, stopPitch]);
  
  // Update time when round changes - AUTO ELIMINATION when time runs out
  useEffect(() => {
    if (game.status === 'playing' && currentRound) {
      queueMicrotask(() => setRoundTimeLeft(currentRound.duration));
      
      const interval = setInterval(() => {
        setRoundTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            // AUTO ELIMINATION - trigger when time runs out
            handleRoundEnd();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [game.status, currentRound?.duration, handleRoundEnd]);

  // Start next round
  const handleStartRound = () => {
    const song = getRandomSong();
    if (!song) return;

    const updatedGame = startRound(game, song.id, song.title);
    onUpdateGame(updatedGame);
  };

  // Winner celebration
  if (game.status === 'completed' && game.winner) {
    return (
      <div className="max-w-5xl mx-auto text-center">
        <div className="bg-gradient-to-r from-amber-500/30 to-yellow-500/30 border-2 border-amber-500 rounded-xl p-12">
          <div className="text-8xl mb-6 animate-bounce">👑</div>
          <h1 className="text-4xl font-bold text-amber-400 mb-4">WINNER!</h1>
          <div className="flex items-center justify-center gap-4 mb-6">
            {game.winner.avatar ? (
              <img src={game.winner.avatar} alt={game.winner.name} className="w-24 h-24 rounded-full object-cover border-4 border-amber-500" />
            ) : (
              <div 
                className="w-24 h-24 rounded-full flex items-center justify-center text-white text-3xl font-bold border-4 border-amber-500"
                style={{ backgroundColor: game.winner.color }}
              >
                {game.winner.name.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="text-5xl font-bold">{game.winner.name}</span>
            <Badge className={`${game.winner.playerType === 'microphone' ? 'bg-red-500/20 text-red-400' : 'bg-purple-500/20 text-purple-400'} text-lg px-3 py-1`}>
              {game.winner.playerType === 'microphone' ? '🎤 Mic' : '📱 Companion'}
            </Badge>
          </div>
          <div className="text-xl text-white/60 mb-8">
            Final Score: <span className="text-amber-400 font-bold">{game.winner.score.toLocaleString()}</span>
          </div>
          <Button
            onClick={onEndGame}
            className="bg-gradient-to-r from-amber-500 to-yellow-500 px-8 py-4 text-xl"
          >
            🏠 Return to Menu
          </Button>
        </div>

        {/* Elimination Order */}
        <div className="mt-8">
          <h2 className="text-xl font-bold mb-4">Elimination Order</h2>
          <ScrollArea className="h-64">
            <div className="flex justify-center gap-3 flex-wrap">
              {sortedPlayers.reverse().map((player, index) => (
                <div 
                  key={player.id}
                  className={`p-3 rounded-lg ${player.id === game.winner?.id ? 'bg-amber-500/20 border border-amber-500' : 'bg-white/5'}`}
                >
                  <div className="text-sm text-white/40 mb-1">#{sortedPlayers.length - index}</div>
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
                    <span>{player.name}</span>
                    <span className="text-lg">
                      {player.playerType === 'microphone' ? '🎤' : '📱'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>
    );
  }

  // Elimination animation with "look up and turn gray" effect
  if (showElimination) {
    const eliminatedPlayer = sortedPlayers[sortedPlayers.length - 1];
    return (
      <div className="max-w-4xl mx-auto text-center">
        <div className="bg-gradient-to-r from-red-500/30 to-pink-500/30 border-2 border-red-500 rounded-xl p-12">
          <div className="text-6xl mb-6 animate-bounce">💔</div>
          <h1 className="text-3xl font-bold text-red-400 mb-4">ELIMINATED!</h1>
          
          {/* Player card with "look up and turn gray" animation */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              {/* The avatar that "looks up" and turns gray */}
              {eliminatedPlayer?.avatar ? (
                <div className="relative">
                  <img 
                    src={eliminatedPlayer.avatar} 
                    alt={eliminatedPlayer.name} 
                    className="w-24 h-24 rounded-full object-cover border-4 border-red-500 transition-all duration-1000"
                    style={{
                      filter: 'grayscale(100%)',
                      opacity: 0.5,
                      transform: 'rotateX(15deg)', // "Looking up" effect
                    }}
                  />
                  {/* Sad eyes overlay */}
                  <div className="absolute inset-0 flex items-center justify-center text-3xl opacity-70">
                    😢
                  </div>
                </div>
              ) : (
                <div 
                  className="w-24 h-24 rounded-full flex items-center justify-center text-white text-3xl font-bold border-4 border-red-500 transition-all duration-1000"
                  style={{ 
                    backgroundColor: '#666',
                    filter: 'grayscale(100%)',
                    opacity: 0.5,
                    transform: 'rotateX(15deg)',
                  }}
                >
                  {eliminatedPlayer?.name?.charAt(0).toUpperCase()}
                </div>
              )}
              
              {/* X mark overlay */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-6xl text-red-500 opacity-80 animate-pulse">✕</div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <span className="text-3xl font-bold text-white/50">{eliminatedPlayer?.name}</span>
              <Badge className={`${eliminatedPlayer?.playerType === 'microphone' ? 'bg-red-500/20 text-red-400' : 'bg-purple-500/20 text-purple-400'}`}>
                {eliminatedPlayer?.playerType === 'microphone' ? '🎤' : '📱'}
              </Badge>
            </div>
            
            <p className="text-white/40 text-lg">
              Score: <span className="text-red-400 font-bold">{eliminatedPlayer?.score?.toLocaleString()}</span>
            </p>
            
            <p className="text-white/30 text-sm mt-2">
              Eliminated in Round {eliminatedPlayer?.eliminationRound}
            </p>
          </div>
          
          {/* Remaining players count */}
          <div className="mt-6 pt-4 border-t border-white/10">
            <p className="text-white/60">
              <span className="text-amber-400 font-bold">{activePlayers.length - 1}</span> players remaining
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Setup phase (before round starts)
  if (game.status === 'setup') {
    return (
      <div className="max-w-5xl mx-auto text-center">
        <h1 className="text-3xl font-bold mb-2">Round {game.currentRound + 1}</h1>
        <p className="text-white/60 mb-6">
          {stats.activeMicPlayers} 🎤 Mic + {stats.activeCompanionPlayers} 📱 Companion = {activePlayers.length} players
        </p>
        
        {/* Player Grid - Split by Type */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Mic Players */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <span>🎤</span> Local Microphone ({stats.activeMicPlayers})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {game.players.filter(p => p.playerType === 'microphone').map(player => (
                  <div 
                    key={player.id}
                    className={`p-3 rounded-xl transition-all ${
                      player.eliminated 
                        ? 'grayscale opacity-30 scale-75' 
                        : 'bg-gradient-to-br from-red-500/20 to-pink-500/20'
                    }`}
                  >
                    {player.avatar ? (
                      <img src={player.avatar} alt={player.name} className="w-12 h-12 rounded-full object-cover mx-auto mb-2" />
                    ) : (
                      <div 
                        className="w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-bold mx-auto mb-2"
                        style={{ backgroundColor: player.eliminated ? '#666' : player.color }}
                      >
                        {player.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="font-bold text-sm">{player.name}</div>
                    {player.eliminated ? (
                      <div className="text-xs text-red-400">Eliminated R{player.eliminationRound}</div>
                    ) : (
                      <div className="text-xs text-white/60">{player.score.toLocaleString()} pts</div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Companion Players */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <span>📱</span> Companion App ({stats.activeCompanionPlayers})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-48">
                <div className="grid grid-cols-2 gap-2">
                  {game.players.filter(p => p.playerType === 'companion').map(player => (
                    <div 
                      key={player.id}
                      className={`p-2 rounded-lg transition-all ${
                        player.eliminated 
                          ? 'grayscale opacity-30 scale-90' 
                          : 'bg-gradient-to-br from-purple-500/20 to-indigo-500/20'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {player.avatar ? (
                          <img src={player.avatar} alt={player.name} className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                          <div 
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                            style={{ backgroundColor: player.eliminated ? '#666' : player.color }}
                          >
                            {player.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{player.name}</div>
                          {player.eliminated ? (
                            <div className="text-xs text-red-400">Out</div>
                          ) : (
                            <div className="text-xs text-white/40">{player.score.toLocaleString()}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        <Button
          onClick={handleStartRound}
          className="px-12 py-6 text-xl bg-gradient-to-r from-red-500 to-pink-500"
        >
          🎤 Start Round {game.currentRound + 1}
        </Button>
      </div>
    );
  }

  // Playing phase
  return (
    <div className="max-w-6xl mx-auto">
      {/* Hidden Audio Element */}
      {currentSong?.audioUrl && (
        <audio
          ref={audioRef}
          onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime * 1000)}
          onEnded={() => handleRoundEnd()}
          className="hidden"
          preload="auto"
        />
      )}
      
      {/* Video Background - More visible with overlay */}
      {currentSong?.videoBackground && (
        <>
          <video
            ref={videoRef}
            className="fixed inset-0 w-full h-full object-cover -z-10"
            style={{ opacity: 0.5 }}
            muted
            playsInline
            loop
            preload="auto"
          />
          {/* Dark overlay to ensure text readability */}
          <div className="fixed inset-0 bg-black/40 -z-10" />
        </>
      )}

      {/* Round Info */}
      <div className="text-center mb-4">
        <h1 className="text-2xl font-bold">Round {game.currentRound}</h1>
        <p className="text-white/60">{currentRound?.songName || currentSong?.title || 'Loading...'}</p>
        <div className="flex items-center justify-center gap-4 mt-2">
          <Badge variant="outline" className="border-red-500 text-red-400">
            {activePlayers.length} Remaining
          </Badge>
          <Badge className="bg-purple-500/20 text-purple-400">
            {roundTimeLeft}s Left
          </Badge>
          <Badge variant="outline" className="border-green-500 text-green-400">
            🎤 {stats.activeMicPlayers} | 📱 {stats.activeCompanionPlayers}
          </Badge>
        </div>
      </div>

      {/* Timer Progress */}
      <div className="mb-4">
        <Progress 
          value={(roundTimeLeft / (currentRound?.duration || 60)) * 100} 
          className="h-3 bg-white/10"
        />
      </div>
      
      {/* Lyrics Display */}
      {currentSong && (
        <div className="mb-4 bg-black/30 rounded-lg p-3">
          <LyricsDisplay 
            lyrics={currentSong.lyrics} 
            currentTime={currentTime} 
          />
        </div>
      )}

      {/* Player Display - Evenly distributed rows with profile, name, and score box */}
      <div className="flex flex-col gap-4 mb-6">
        {/* Calculate how many players per row based on count */}
        {(() => {
          const activePlayerCount = sortedPlayers.filter(p => !p.eliminated).length;
          const playersPerRow = activePlayerCount <= 4 ? activePlayerCount : Math.ceil(activePlayerCount / 2);
          const firstRow = sortedPlayers.filter(p => !p.eliminated).slice(0, playersPerRow);
          const secondRow = sortedPlayers.filter(p => !p.eliminated).slice(playersPerRow);
          const eliminatedPlayers = sortedPlayers.filter(p => p.eliminated);

          return (
            <>
              {/* Active Players - Row 1 */}
              <div className={`grid gap-3 ${firstRow.length <= 4 ? 'grid-cols-' + firstRow.length : 'grid-cols-4'}`}
                   style={{ gridTemplateColumns: `repeat(${Math.min(firstRow.length, 6)}, 1fr)` }}>
                {firstRow.map((player, index) => (
                  <PlayerCard
                    key={player.id}
                    player={player}
                    rank={index + 1}
                    isLeading={index === 0}
                  />
                ))}
              </div>

              {/* Active Players - Row 2 (if needed) */}
              {secondRow.length > 0 && (
                <div className="grid gap-3"
                     style={{ gridTemplateColumns: `repeat(${Math.min(secondRow.length, 6)}, 1fr)` }}>
                  {secondRow.map((player, index) => (
                    <PlayerCard
                      key={player.id}
                      player={player}
                      rank={playersPerRow + index + 1}
                      isLeading={false}
                    />
                  ))}
                </div>
              )}

              {/* Eliminated Players - Grayed out at bottom */}
              {eliminatedPlayers.length > 0 && (
                <div className="flex flex-wrap gap-2 justify-center pt-4 border-t border-white/10">
                  {eliminatedPlayers.map((player) => (
                    <div
                      key={player.id}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 grayscale opacity-50"
                    >
                      {player.avatar ? (
                        <img src={player.avatar} alt={player.name} className="w-6 h-6 rounded-full object-cover" />
                      ) : (
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold bg-gray-500"
                        >
                          {player.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="text-sm text-white/60">{player.name}</span>
                      <span className="text-xs text-red-400">Out</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          );
        })()}
      </div>

      {/* End Round Button */}
      {roundTimeLeft === 0 && game.status === 'playing' && (
        <div className="text-center">
          <Button
            onClick={handleRoundEnd}
            className="px-12 py-6 text-xl bg-gradient-to-r from-red-500 to-pink-500 animate-pulse"
          >
            💔 Eliminate Lowest Scorer
          </Button>
        </div>
      )}
    </div>
  );
}

// Simple Lyrics Display Component
function LyricsDisplay({ lyrics, currentTime }: { lyrics: LyricLine[]; currentTime: number }) {
  // Find current line
  const currentLineIndex = lyrics.findIndex((line, index) => {
    const nextLine = lyrics[index + 1];
    return currentTime >= line.startTime && (!nextLine || currentTime < nextLine.startTime);
  });

  const currentLine = currentLineIndex >= 0 ? lyrics[currentLineIndex] : null;
  const prevLine = currentLineIndex > 0 ? lyrics[currentLineIndex - 1] : null;
  const nextLine = currentLineIndex >= 0 && currentLineIndex < lyrics.length - 1 ? lyrics[currentLineIndex + 1] : null;

  if (!currentLine) return null;

  return (
    <div className="text-center">
      <div className="text-white/40 text-sm mb-1">{prevLine?.text}</div>
      <div className="text-white text-xl font-bold">{currentLine.text}</div>
      <div className="text-white/40 text-sm mt-1">{nextLine?.text}</div>
    </div>
  );
}

// Player Card Component - Profile picture, name, and score box
interface PlayerCardProps {
  player: BattleRoyalePlayer;
  rank: number;
  isLeading: boolean;
}

function PlayerCard({ player, rank, isLeading }: PlayerCardProps) {
  const [isEliminating, setIsEliminating] = useState(false);

  // Determine badge styling based on player type and rank
  const cardBgClass = player.playerType === 'microphone'
    ? 'from-red-500/20 to-pink-500/20'
    : 'from-purple-500/20 to-indigo-500/20';

  const borderClass = isLeading
    ? 'border-2 border-amber-500 shadow-lg shadow-amber-500/20'
    : 'border border-white/10';

  return (
    <div
      className={`
        relative flex flex-col items-center p-4 rounded-xl
        bg-gradient-to-br ${cardBgClass}
        ${borderClass}
        transition-all duration-500
        ${player.eliminated ? 'grayscale opacity-30 scale-90' : ''}
        ${isEliminating ? 'animate-pulse' : ''}
      `}
    >
      {/* Rank Badge */}
      <div className={`absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
        ${isLeading ? 'bg-amber-500 text-black' : 'bg-white/20 text-white/60'}`}>
        #{rank}
      </div>

      {/* Profile Picture */}
      <div className="relative mb-2">
        {player.avatar ? (
          <img
            src={player.avatar}
            alt={player.name}
            className={`w-16 h-16 rounded-full object-cover border-2 ${isLeading ? 'border-amber-400' : 'border-white/20'}`}
          />
        ) : (
          <div
            className={`w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold border-2 ${isLeading ? 'border-amber-400' : 'border-white/20'}`}
            style={{ backgroundColor: player.color }}
          >
            {player.name.charAt(0).toUpperCase()}
          </div>
        )}

        {/* Player Type Indicator */}
        <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-black/50 flex items-center justify-center text-sm">
          {player.playerType === 'microphone' ? '🎤' : '📱'}
        </div>
      </div>

      {/* Player Name */}
      <div className="font-bold text-sm text-center truncate max-w-full mb-2">
        {player.name}
      </div>

      {/* Score Box */}
      <div className={`
        w-full px-3 py-2 rounded-lg text-center font-bold
        ${isLeading ? 'bg-amber-500/30 text-amber-300' : 'bg-black/30 text-white'}
      `}>
        <div className="text-2xl">{player.score.toLocaleString()}</div>
        <div className="text-xs text-white/40 mt-1">
          ✓ {player.notesHit} | 🔥 {player.maxCombo}
        </div>
      </div>
    </div>
  );
}
