'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
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
  BattleRoyaleRound,
} from '@/lib/game/battle-royale';
import { Song, Note, Difficulty } from '@/types/game';
import { getSongMediaUrls } from '@/lib/db/media-db';
import { usePitchDetector } from '@/hooks/use-pitch-detector';
import { evaluateTick, calculateTickPoints, calculateScoringMetadata } from '@/lib/game/scoring';

interface UseBattleRoyaleGameParams {
  game: BattleRoyaleGame;
  songs: Song[];
  onUpdateGame: (game: BattleRoyaleGame) => void;
}

interface UseBattleRoyaleGameReturn {
  showElimination: boolean;
  stats: ReturnType<typeof getBattleRoyaleStats>;
  sortedPlayers: BattleRoyalePlayer[];
  activePlayers: BattleRoyalePlayer[];
  currentRound: BattleRoyaleRound | undefined;
  difficulty: Difficulty;
  currentSong: Song | null;
  currentTime: number;
  roundTimeLeft: number;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  handleRoundEnd: () => void;
  handleStartRound: () => void;
  setCurrentTime: (time: number) => void;
}

export function useBattleRoyaleGame({ game, songs, onUpdateGame }: UseBattleRoyaleGameParams): UseBattleRoyaleGameReturn {
  const [showElimination, setShowElimination] = useState(false);
  const stats = getBattleRoyaleStats(game);

  const sortedPlayers = useMemo(() => getPlayersByScore(game), [game]);
  const activePlayers = useMemo(() => getActivePlayers(game), [game]);
  const currentRound = game.rounds[game.rounds.length - 1];
  
  // Get difficulty from game settings
  const difficulty = game.settings.difficulty || 'medium';
  
  // Pitch detection for all active microphone players (Champions League - all sing simultaneously)
  const { isInitialized: pitchInitialized, pitchResult, initialize: initPitch, start: startPitch, stop: stopPitch } = usePitchDetector();
  
  // Game state
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
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

  // Get current song from the round
  useEffect(() => {
    if (currentRound?.songId) {
      const song = songs.find(s => s.id === currentRound.songId);
      if (song) {
        setCurrentSong(song);
      }
    }
  }, [currentRound?.songId, songs]);

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
  }, [game.status, mediaLoaded, currentSong, pitchInitialized, initPitch, startPitch, stopPitch]);
  
  // Game loop for simultaneous scoring (Champions League - all players scored at once)
  const startGameLoop = () => {
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
  };

  // Get random song for the round
  const getRandomSong = useCallback((): Song | null => {
    if (songs.length === 0) return null;
    return songs[Math.floor(Math.random() * songs.length)];
  }, [songs]);
  
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
  }, [game.status, currentRound?.duration]);

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

  // Start next round
  const handleStartRound = () => {
    const song = getRandomSong();
    if (!song) return;

    const updatedGame = startRound(game, song.id, song.title);
    onUpdateGame(updatedGame);
  };

  return {
    showElimination,
    stats,
    sortedPlayers,
    activePlayers,
    currentRound,
    difficulty,
    currentSong,
    currentTime,
    roundTimeLeft,
    audioRef,
    videoRef,
    handleRoundEnd,
    handleStartRound,
    setCurrentTime,
  };
}
