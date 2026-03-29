import { useState, useCallback, useEffect, useRef } from 'react';
import { Song, LyricLine } from '@/types/game';
import { CompanionPlayer, CompanionSingAlongSettings } from './use-companion-setup';
import { setGameType as setMobileGameType } from '@/lib/audio/mobile-audio-processor';

type GamePhase = 'setup' | 'playing' | 'switching' | 'ended';

export function useCompanionGame(
  players: CompanionPlayer[],
  song: Song,
  settings: CompanionSingAlongSettings,
  onEndGame: () => void
) {
  // Set game type for audio streaming mode (not Battle Royale)
  useEffect(() => {
    setMobileGameType('companion-singalong');
    return () => {
      setMobileGameType('single');
    };
  }, []);
  
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [nextPlayerIndex, setNextPlayerIndex] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [switchWarning, setSwitchWarning] = useState(false);
  const [timeUntilSwitch, setTimeUntilSwitch] = useState(0);
  const [gamePhase, setGamePhase] = useState<GamePhase>('setup');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const currentPlayer = players[currentPlayerIndex];

  // Generate random switch time
  const generateSwitchTime = useCallback(() => {
    return (
      settings.minTurnDuration * 1000 + 
      Math.random() * (settings.maxTurnDuration - settings.minTurnDuration) * 1000
    );
  }, [settings.minTurnDuration, settings.maxTurnDuration]);

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

  // Start the game
  const startGame = useCallback(async () => {
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
  }, [generateSwitchTime, song.audioUrl]);

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
    setGamePhase('ended');
    if (audioRef.current) {
      audioRef.current.pause();
    }
    onEndGame();
  }, [onEndGame]);

  // Get sorted players for final scores
  const getSortedPlayers = (): CompanionPlayer[] => {
    return [...players].sort((a, b) => b.score - a.score);
  };

  return {
    // State
    currentPlayerIndex,
    nextPlayerIndex,
    currentTime,
    isPlaying,
    countdown,
    switchWarning,
    timeUntilSwitch,
    gamePhase,
    currentPlayer,
    
    // Refs
    audioRef,
    
    // Computed
    progress,
    switchProgress,
    currentLyrics: getCurrentLyrics(),
    
    // Actions
    startGame,
    endGameEarly,
    
    // Helpers
    formatTime,
    getSortedPlayers,
  };
}
