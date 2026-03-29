'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Song, Note } from '@/types/game';
import { getSongMediaUrls } from '@/lib/db/media-db';
import { usePitchDetector } from '@/hooks/use-pitch-detector';
import {
  evaluateTick,
  calculateTickPoints,
  calculateScoringMetadata,
  ScoringMetadata,
} from '@/lib/game/scoring';
import {
  BattleRoyaleGame,
  getActivePlayers,
  updatePlayerScore,
} from '@/lib/game/battle-royale';
import { logger } from '@/lib/logger';
import { setGameType } from '@/lib/audio/mobile-audio-processor';

interface UseBattleRoyaleGameOptions {
  game: BattleRoyaleGame;
  songs: Song[];
  currentRound: { songId: string; duration: number } | undefined;
  onUpdateGame: (game: BattleRoyaleGame) => void;
}

interface TimingData {
  allNotes: Array<Note & { lineIndex: number }>;
  beatDuration: number;
  scoringMetadata: ScoringMetadata;
}

export function useBattleRoyaleGame({
  game,
  songs,
  currentRound,
  onUpdateGame,
}: UseBattleRoyaleGameOptions) {
  const difficulty = game.settings.difficulty || 'medium';
  
  // Set game type for pitch-only mode (optimized for Battle Royale)
  useEffect(() => {
    setGameType('battle-royale');
    return () => {
      setGameType('single');
    };
  }, []);
  
  // Pitch detection
  const {
    isInitialized: pitchInitialized,
    isListening,
    pitchResult,
    initialize: initPitch,
    start: startPitch,
    stop: stopPitch,
  } = usePitchDetector();
  
  // State
  const [mediaLoaded, setMediaLoaded] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [roundTimeLeft, setRoundTimeLeft] = useState(currentRound?.duration || 0);
  
  // Refs
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const gameLoopRef = useRef<number | null>(null);
  const lastScoringTimeRef = useRef<number>(0);
  const noteProgressRef = useRef<Map<string, { ticksHit: number; ticksTotal: number }>>(new Map());
  
  // Derive currentSong
  const currentSong = useMemo(() => {
    if (!currentRound?.songId) return null;
    return songs.find(s => s.id === currentRound.songId) || null;
  }, [currentRound?.songId, songs]);
  
  // Active players
  const activePlayers = useMemo(() => getActivePlayers(game), [game]);
  
  // Pre-compute timing data
  const timingData: TimingData | null = useMemo(() => {
    if (!currentSong || currentSong.lyrics.length === 0) return null;
    
    const allNotes: Array<Note & { lineIndex: number }> = [];
    currentSong.lyrics.forEach((line, lineIndex) => {
      line.notes.forEach(note => {
        allNotes.push({ ...note, lineIndex });
      });
    });
    allNotes.sort((a, b) => a.startTime - b.startTime);
    
    const beatDurationMs = currentSong.bpm ? 15000 / currentSong.bpm : 500;
    const scoringMetadata = calculateScoringMetadata(allNotes, beatDurationMs);
    
    return { allNotes, beatDuration: beatDurationMs, scoringMetadata };
  }, [currentSong]);
  
  // Load media
  useEffect(() => {
    const loadMedia = async () => {
      if (!currentSong) {
        setMediaLoaded(false);
        return;
      }
      
      let audioUrl = currentSong.audioUrl;
      let videoUrl = currentSong.videoBackground;
      
      if (currentSong.storedMedia) {
        try {
          const mediaUrls = await getSongMediaUrls(currentSong.id);
          if (mediaUrls.audioUrl) audioUrl = mediaUrls.audioUrl;
          if (mediaUrls.videoUrl) videoUrl = mediaUrls.videoUrl;
        } catch (e) {
          logger.error('[BattleRoyale]', 'Failed to load media from IndexedDB:', e);
        }
      }
      
      if (audioRef.current && audioUrl) {
        audioRef.current.src = audioUrl;
        audioRef.current.load();
      }
      
      if (videoRef.current && videoUrl) {
        videoRef.current.src = videoUrl;
        videoRef.current.load();
      }
      
      setMediaLoaded(true);
    };
    
    loadMedia();
  }, [currentSong]);
  
  // Game loop
  const startGameLoop = useCallback(() => {
    const TICK_INTERVAL = 100;
    let lastTickTime = performance.now();
    
    const gameLoop = (timestamp: number) => {
      if (game.status !== 'playing') return;
      
      const deltaTime = timestamp - lastTickTime;
      
      if (audioRef.current) {
        setCurrentTime(audioRef.current.currentTime * 1000);
      }
      
      if (deltaTime >= TICK_INTERVAL && pitchResult && timingData && currentSong) {
        lastTickTime = timestamp;
        
        const detectedPitch = pitchResult.note;
        const currentAudioTime = audioRef.current ? audioRef.current.currentTime * 1000 : currentTime;
        
        timingData.allNotes.forEach(note => {
          if (currentAudioTime >= note.startTime && currentAudioTime <= note.startTime + note.duration) {
            const micPlayers = activePlayers.filter(p => p.playerType === 'microphone' && !p.eliminated);
            
            micPlayers.forEach(player => {
              const tickResult = evaluateTick(detectedPitch || 0, note.pitch, difficulty);
              
              if (tickResult.isHit) {
                const points = calculateTickPoints(
                  tickResult.accuracy,
                  note.isGolden,
                  timingData.scoringMetadata.pointsPerTick,
                  difficulty
                );
                
                const updatedGame = updatePlayerScore(
                  game,
                  player.id,
                  points,
                  tickResult.accuracy,
                  1,
                  0,
                  1
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
  
  // Initialize and start
  useEffect(() => {
    if (game.status === 'playing' && mediaLoaded && currentSong) {
      const initGame = async () => {
        if (!pitchInitialized) {
          await initPitch();
        }
        startPitch();
        
        if (audioRef.current && currentSong.audioUrl) {
          audioRef.current.play().catch(e => logger.error('[BattleRoyale]', 'Audio play error:', e));
        }
        if (videoRef.current && currentSong.videoBackground) {
          videoRef.current.play().catch(e => logger.error('[BattleRoyale]', 'Video play error:', e));
        }
        
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
  
  // Timer countdown
  useEffect(() => {
    if (game.status === 'playing' && currentRound) {
      queueMicrotask(() => setRoundTimeLeft(currentRound.duration));
      
      const interval = setInterval(() => {
        setRoundTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [game.status, currentRound?.duration]);
  
  // Cleanup function for ending round
  const stopMedia = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    if (videoRef.current) {
      videoRef.current.pause();
    }
    stopPitch();
  }, [stopPitch]);
  
  return {
    // State
    currentSong,
    mediaLoaded,
    currentTime,
    roundTimeLeft,
    setRoundTimeLeft,
    activePlayers,
    timingData,
    pitchInitialized,
    isListening,
    
    // Refs
    audioRef,
    videoRef,
    
    // Actions
    stopMedia,
    startGameLoop,
  };
}
