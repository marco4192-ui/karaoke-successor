import { useState, useEffect, useCallback } from 'react';
import { LyricLine } from '@/types/game';
import { MedleyPlayer, MedleySong, MedleySettings } from './use-medley-setup';
import { setGameType } from '@/lib/audio/mobile-audio-processor';

type GamePhase = 'countdown' | 'playing' | 'transition' | 'ended';

export function useMedleyGame(
  players: MedleyPlayer[],
  medleySongs: MedleySong[],
  settings: MedleySettings,
  onEndGame: () => void
) {
  const [currentSongIndex, setCurrentSongIndex] = useState(0);
  const [songTime, setSongTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [phase, setPhase] = useState<GamePhase>('countdown');
  const [transitionCountdown, setTransitionCountdown] = useState(settings.transitionTime);

  // Set game type for audio-streaming mode (not Battle Royale)
  useEffect(() => {
    setGameType('medley');
    return () => {
      setGameType('single');
    };
  }, []);

  const currentMedleySong = medleySongs[currentSongIndex];
  const currentPlayer = players[0];

  // Start game
  const startGame = useCallback(() => {
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
  }, []);

  // Game loop
  useEffect(() => {
    if (!isPlaying || phase !== 'playing') return;

    const interval = setInterval(() => {
      setSongTime(prev => {
        const newTime = prev + 100;
        
        if (newTime >= currentMedleySong.duration) {
          if (currentSongIndex < medleySongs.length - 1) {
            setPhase('transition');
            setTransitionCountdown(settings.transitionTime);
            setIsPlaying(false);
          } else {
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
  const totalProgress = ((completedDuration + songTime) / totalDuration) * 100;

  // Snippet progress
  const snippetProgress = (songTime / currentMedleySong.duration) * 100;

  // Get lyrics for current time
  const getCurrentLyrics = useCallback((): LyricLine | null => {
    const song = currentMedleySong.song;
    if (!song.lyrics || song.lyrics.length === 0) return null;
    
    const actualTime = currentMedleySong.startTime + songTime;
    
    const currentLine = song.lyrics.find((line, index) => {
      const nextLine = song.lyrics[index + 1];
      return actualTime >= line.startTime && (!nextLine || actualTime < nextLine.startTime);
    });

    return currentLine || null;
  }, [currentMedleySong, songTime]);

  // End game early
  const endGameEarly = useCallback(() => {
    setIsPlaying(false);
    setPhase('ended');
    onEndGame();
  }, [onEndGame]);

  return {
    // State
    currentSongIndex,
    songTime,
    isPlaying,
    countdown,
    phase,
    transitionCountdown,
    currentMedleySong,
    currentPlayer,
    
    // Computed
    totalProgress,
    snippetProgress,
    currentLyrics: getCurrentLyrics(),
    
    // Actions
    startGame,
    endGameEarly,
  };
}
