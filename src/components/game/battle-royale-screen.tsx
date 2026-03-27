'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  getActivePlayers,
  getPlayersByScore,
  startRound,
  endRoundAndEliminate,
  advanceToNextRound,
  getBattleRoyaleStats,
  updatePlayerScore,
  BattleRoyaleGame,
  BattleRoyalePlayer,
} from '@/lib/game/battle-royale';
import { Song, Note, LyricLine } from '@/types/game';
import { getSongMediaUrls } from '@/lib/db/media-db';
import { usePitchDetector } from '@/hooks/use-pitch-detector';
import { evaluateTick, calculateTickPoints, calculateScoringMetadata } from '@/lib/game/scoring';
import { logger } from '@/lib/logger';

// Re-export Setup Screen from separate file
export { BattleRoyaleSetupScreen } from './battle-royale-setup';
export { PlayerCard } from './battle-royale-player-card';
import { PlayerCard } from './battle-royale-player-card';

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
          logger.error('[BattleRoyale]', 'Failed to load media from IndexedDB:', e);
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
          audioRef.current.play().catch(e => logger.error('[BattleRoyale]', 'Audio play error:', e));
        }
        if (videoRef.current && currentSong.videoBackground) {
          videoRef.current.play().catch(e => logger.error('[BattleRoyale]', 'Video play error:', e));
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
