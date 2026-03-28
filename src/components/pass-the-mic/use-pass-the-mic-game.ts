import { useState, useEffect, useRef, useCallback } from 'react';
import { Song, LyricLine } from '@/types/game';
import { usePitchDetector } from '@/hooks/use-pitch-detector';
import { PassTheMicPlayer, PassTheMicSettings } from './use-pass-the-mic-setup';
import { PassTheMicSegment } from '@/components/game/pass-the-mic-screen';

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
  
  // Pitch detection
  const { isInitialized, isListening, pitchResult, initialize, start, stop } = usePitchDetector();
  
  // Track processed notes
  const processedNotesRef = useRef<Set<string>>(new Set());

  const currentSegment = segments[currentSegmentIndex];
  const currentPlayer = players[currentPlayerIndex];

  // Game loop
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setCurrentTime(prev => {
        const newTime = prev + 100;
        
        // Check if we need to switch segments
        if (currentSegment && newTime >= currentSegment.endTime) {
          if (currentSegmentIndex < segments.length - 1) {
            setCurrentSegmentIndex(prev => prev + 1);
            setCurrentPlayerIndex(prev => (prev + 1) % players.length);
          } else {
            setIsPlaying(false);
          }
        }

        // Random switches
        if (settings.randomSwitches && Math.random() < 0.001) {
          const nextPlayer = (currentPlayerIndex + 1 + Math.floor(Math.random() * (players.length - 1))) % players.length;
          setCurrentPlayerIndex(nextPlayer);
          setSwitchCountdown(3);
        }

        return newTime;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isPlaying, currentSegment, currentSegmentIndex, segments.length, settings.randomSwitches, currentPlayerIndex, players.length]);

  // Switch countdown
  useEffect(() => {
    if (switchCountdown === null) {
      return;
    }

    if (switchCountdown <= 0) {
      // Countdown finished, reset to null
      // Using a ref to avoid the setState-in-effect issue
      return;
    }

    const timer = setTimeout(() => {
      setSwitchCountdown(prev => prev !== null ? prev - 1 : null);
    }, 1000);

    return () => clearTimeout(timer);
  }, [switchCountdown]);

  // Start game
  const startGame = useCallback(async () => {
    setCountdown(3);
    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          setIsPlaying(true);
          if (audioRef.current && song.audioUrl) {
            audioRef.current.play().catch(() => {});
          }
          return 0;
        }
        return prev - 1;
      });
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
    if (audioRef.current) {
      audioRef.current.pause();
    }
    onEndGame();
  }, [onEndGame]);

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
    
    // Actions
    startGame,
    endGameEarly,
    
    // Helpers
    formatTime,
  };
}
