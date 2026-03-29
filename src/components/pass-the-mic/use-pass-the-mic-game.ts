import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Song, LyricLine, Note, DIFFICULTY_SETTINGS } from '@/types/game';
import { usePitchDetector } from '@/hooks/use-pitch-detector';
import { PassTheMicPlayer, PassTheMicSettings } from './use-pass-the-mic-setup';
import { PassTheMicSegment } from '@/components/game/pass-the-mic-screen';
import { calculatePitchStats, PitchStats } from '@/lib/game/note-utils';
import { calculateScoringMetadata, ScoringMetadata } from '@/lib/game/scoring';
import { setGameType } from '@/lib/audio/mobile-audio-processor';

// Constants
const NOTE_WINDOW = 4000;
const VISIBLE_TOP = 8;
const VISIBLE_RANGE = 77;

export function usePassTheMicGame(
  players: PassTheMicPlayer[],
  song: Song,
  segments: PassTheMicSegment[],
  settings: PassTheMicSettings,
  onEndGame: () => void
) {
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [switchCountdown, setSwitchCountdown] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const gameLoopRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMountedRef = useRef(true);
  
  // Set game type for audio-streaming mode (not Battle Royale)
  useEffect(() => {
    setGameType('pass-the-mic');
    return () => {
      setGameType('single');
    };
  }, []);
  
  // Player scores state
  const [playerScores, setPlayerScores] = useState<Map<string, number>>(new Map());
  const [playerCombos, setPlayerCombos] = useState<Map<string, number>>(new Map());
  const [playerNotesHit, setPlayerNotesHit] = useState<Map<string, number>>(new Map());
  
  // Pitch detection
  const { isInitialized, isListening, pitchResult, initialize, start, stop } = usePitchDetector();
  
  // Track processed notes for scoring
  const processedNotesRef = useRef<Map<string, { ticksHit: number; ticksTotal: number }>>(new Map());
  const lastEvaluatedTimeRef = useRef<number>(0);

  const currentSegment = segments[currentSegmentIndex];
  const currentPlayer = players[currentPlayerIndex];

  // Pre-compute timing data for scoring
  const timingData = useMemo(() => {
    if (!song || song.lyrics.length === 0) return null;
    
    const allNotes: Array<Note & { lineIndex: number; line: LyricLine }> = [];
    
    song.lyrics.forEach((line, lineIndex) => {
      line.notes.forEach(note => {
        allNotes.push({ ...note, lineIndex, line });
      });
    });
    
    allNotes.sort((a, b) => a.startTime - b.startTime);
    
    const beatDurationMs = song.bpm ? 15000 / song.bpm : 500;
    
    return {
      allNotes,
      beatDuration: beatDurationMs,
    };
  }, [song]);

  // Calculate pitch stats for display
  const pitchStats = useMemo<PitchStats>(() => {
    return calculatePitchStats(timingData?.allNotes || null);
  }, [timingData]);

  // Get visible notes for note highway
  const visibleNotes = useMemo(() => {
    if (!timingData) return [];
    
    const windowStart = currentTime - 1000;
    const windowEnd = currentTime + NOTE_WINDOW;
    const result: Array<Note & { line: LyricLine }> = [];
    
    for (const note of timingData.allNotes) {
      const noteEnd = note.startTime + note.duration;
      if (note.startTime > windowEnd) break;
      if (noteEnd >= windowStart) {
        result.push({ ...note, line: note.line });
      }
    }
    
    return result;
  }, [timingData, currentTime]);

  // Initialize pitch detection
  useEffect(() => {
    isMountedRef.current = true;
    
    const init = async () => {
      const success = await initialize();
      if (success && isMountedRef.current) {
        start();
      }
    };
    
    init();
    
    return () => {
      isMountedRef.current = false;
      stop();
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [initialize, start, stop]);

  // Score evaluation based on pitch
  const evaluatePitch = useCallback((time: number, pitch: typeof pitchResult) => {
    if (!timingData || !pitch || !currentPlayer) return;
    
    const tickInterval = 50; // Evaluate every 50ms
    if (time - lastEvaluatedTimeRef.current < tickInterval) return;
    lastEvaluatedTimeRef.current = time;
    
    // Find active notes at current time
    for (const note of timingData.allNotes) {
      const noteEnd = note.startTime + note.duration;
      if (note.startTime > time) break;
      if (time > noteEnd) continue;
      
      // Check if this note is in current segment
      if (currentSegment) {
        if (note.startTime < currentSegment.startTime || note.startTime >= currentSegment.endTime) {
          continue;
        }
      }
      
      // Evaluate pitch match
      const detectedNote = pitch.note;
      if (detectedNote === null || detectedNote === undefined) continue;
      
      const pitchDiff = Math.abs(detectedNote - note.pitch);
      const isHit = pitchDiff <= 2; // Within 2 semitones
      
      // Get or create note tracking
      const noteKey = note.id;
      let noteTrack = processedNotesRef.current.get(noteKey);
      if (!noteTrack) {
        const totalTicks = Math.ceil(note.duration / tickInterval);
        noteTrack = { ticksHit: 0, ticksTotal: totalTicks };
        processedNotesRef.current.set(noteKey, noteTrack);
      }
      
      noteTrack.ticksHit += isHit ? 1 : 0;
      
      // Calculate score contribution
      if (isHit) {
        const difficultySettings = DIFFICULTY_SETTINGS[settings.difficulty || 'medium'];
        const basePoints = note.isGolden ? 100 : 50;
        const accuracyBonus = pitchDiff === 0 ? 1.5 : pitchDiff === 1 ? 1.2 : 1.0;
        const points = Math.round(basePoints * accuracyBonus * difficultySettings.noteScoreMultiplier);
        
        setPlayerScores(prev => {
          const newScores = new Map(prev);
          const currentScore = newScores.get(currentPlayer.id) || 0;
          newScores.set(currentPlayer.id, currentScore + points);
          return newScores;
        });
        
        setPlayerCombos(prev => {
          const newCombos = new Map(prev);
          const currentCombo = (newCombos.get(currentPlayer.id) || 0) + 1;
          newCombos.set(currentPlayer.id, currentCombo);
          return newCombos;
        });
        
        setPlayerNotesHit(prev => {
          const newHits = new Map(prev);
          const current = newHits.get(currentPlayer.id) || 0;
          newHits.set(currentPlayer.id, current + 1);
          return newHits;
        });
      } else {
        // Reset combo on miss
        setPlayerCombos(prev => {
          const newCombos = new Map(prev);
          newCombos.set(currentPlayer.id, 0);
          return newCombos;
        });
      }
    }
  }, [timingData, currentPlayer, currentSegment, settings.difficulty]);

  // Game loop
  useEffect(() => {
    if (!isPlaying) return;

    const gameLoop = () => {
      let elapsed: number;
      
      // Use audio time if available
      if (audioRef.current && !audioRef.current.paused && audioRef.current.readyState >= 2) {
        elapsed = audioRef.current.currentTime * 1000;
      } else {
        elapsed = (Date.now() - startTimeRef.current);
      }
      
      setCurrentTime(elapsed);
      
      // Evaluate pitch for scoring
      if (pitchResult) {
        evaluatePitch(elapsed, pitchResult);
      }
      
      // Check if we need to switch segments
      if (currentSegment && elapsed >= currentSegment.endTime) {
        if (currentSegmentIndex < segments.length - 1) {
          setCurrentSegmentIndex(prev => prev + 1);
          setCurrentPlayerIndex(prev => (prev + 1) % players.length);
          
          // Clear processed notes for new segment
          processedNotesRef.current.clear();
          lastEvaluatedTimeRef.current = 0;
        } else {
          setIsPlaying(false);
          stop();
          if (audioRef.current) {
            audioRef.current.pause();
          }
          return;
        }
      }
      
      // Random switches
      if (settings.randomSwitches && Math.random() < 0.0005) {
        const nextPlayer = (currentPlayerIndex + 1 + Math.floor(Math.random() * (players.length - 1))) % players.length;
        setCurrentPlayerIndex(nextPlayer);
        setSwitchCountdown(3);
      }
      
      // Check if song ended
      if (elapsed >= song.duration) {
        setIsPlaying(false);
        stop();
        return;
      }
      
      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };
    
    gameLoopRef.current = requestAnimationFrame(gameLoop);
    
    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [isPlaying, currentSegment, currentSegmentIndex, segments.length, settings.randomSwitches, currentPlayerIndex, players.length, pitchResult, evaluatePitch, stop, song.duration]);

  // Switch countdown
  useEffect(() => {
    if (switchCountdown === null || switchCountdown <= 0) return;

    const timer = setTimeout(() => {
      setSwitchCountdown(prev => prev !== null ? prev - 1 : null);
    }, 1000);

    return () => clearTimeout(timer);
  }, [switchCountdown]);

  // Start game
  const startGame = useCallback(async () => {
    setCountdown(3);
    
    let currentCount = 3;
    countdownIntervalRef.current = setInterval(() => {
      if (!isMountedRef.current) {
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
        }
        return;
      }
      
      currentCount -= 1;
      
      if (currentCount <= 0) {
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
        }
        setCountdown(0);
        setIsPlaying(true);
        startTimeRef.current = Date.now();
        
        if (audioRef.current && song.audioUrl) {
          audioRef.current.currentTime = 0;
          audioRef.current.play().catch(() => {});
        }
      } else {
        setCountdown(currentCount);
      }
    }, 1000);
  }, [song.audioUrl]);

  // Progress calculation
  const progress = (currentTime / song.duration) * 100;
  const segmentProgress = currentSegment 
    ? ((currentTime - currentSegment.startTime) / (currentSegment.endTime - currentSegment.startTime)) * 100 
    : 0;

  // Get lyrics for current time
  const getCurrentLyrics = useCallback((): LyricLine | null => {
    if (!song.lyrics || song.lyrics.length === 0) return null;
    
    const currentLine = song.lyrics.find((line, index) => {
      const nextLine = song.lyrics[index + 1];
      return currentTime >= line.startTime && (!nextLine || currentTime < nextLine.startTime);
    });

    return currentLine || null;
  }, [song.lyrics, currentTime]);

  // Format time helper
  const formatTime = (ms: number): string => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // End game early
  const endGameEarly = useCallback(() => {
    setIsPlaying(false);
    stop();
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    if (gameLoopRef.current) {
      cancelAnimationFrame(gameLoopRef.current);
      gameLoopRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
    }
    onEndGame();
  }, [onEndGame, stop]);

  // Get current player's score
  const currentPlayerScore = currentPlayer ? (playerScores.get(currentPlayer.id) || 0) : 0;
  const currentPlayerCombo = currentPlayer ? (playerCombos.get(currentPlayer.id) || 0) : 0;

  return {
    // State
    currentSegmentIndex,
    currentPlayerIndex,
    currentTime,
    isPlaying,
    countdown,
    switchCountdown,
    currentSegment,
    currentPlayer,
    
    // Refs
    audioRef,
    
    // Computed
    progress,
    segmentProgress,
    currentLyrics: getCurrentLyrics(),
    
    // Scoring
    playerScores,
    playerCombos,
    currentPlayerScore,
    currentPlayerCombo,
    
    // Note highway data
    visibleNotes,
    pitchStats,
    pitchResult,
    
    // Actions
    startGame,
    endGameEarly,
    
    // Helpers
    formatTime,
  };
}
