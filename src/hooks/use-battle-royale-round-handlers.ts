'use client';

import { useCallback, useEffect, useRef } from 'react';
import {
  startRound,
  endRoundAndEliminate,
  advanceToNextRound,
  BattleRoyaleGame,
  BattleRoyalePlayer,
} from '@/lib/game/battle-royale';
import { Song } from '@/types/game';

interface UseBattleRoyaleRoundHandlersParams {
  game: BattleRoyaleGame;
  activePlayers: BattleRoyalePlayer[];
  onUpdateGame: (game: BattleRoyaleGame) => void;
  stopPitch: () => void;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  audioHasPlayedRef: React.RefObject<boolean>;
  getRandomSong: () => Song | null;
  setShowElimination: (show: boolean) => void;
}

interface UseBattleRoyaleRoundHandlersReturn {
  handleRoundEnd: () => void;
  handleStartRound: () => void;
  handleRoundEndRef: React.RefObject<() => void>;
  activePlayersRef: React.RefObject<BattleRoyalePlayer[]>;
  gameRef: React.RefObject<BattleRoyaleGame>;
}

/**
 * Manages round lifecycle: starting rounds, ending rounds with elimination,
 * and the elimination animation timer.
 */
export function useBattleRoyaleRoundHandlers({
  game,
  activePlayers,
  onUpdateGame,
  stopPitch,
  audioRef,
  videoRef,
  audioHasPlayedRef,
  getRandomSong,
  setShowElimination,
}: UseBattleRoyaleRoundHandlersParams): UseBattleRoyaleRoundHandlersReturn {
  // Refs for game/activePlayers — used by the game loop and auto-elimination timer
  // to avoid stale closures.
  const activePlayersRef = useRef(activePlayers);
  activePlayersRef.current = activePlayers;
  const gameRef = useRef(game);
  gameRef.current = game;

  // Ref for the elimination-animation timer
  const roundEndTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Ref that the auto-elimination timer uses to call the latest handleRoundEnd
  const handleRoundEndRef = useRef<() => void>(() => {});

  // Handle round end - eliminates lowest scoring player
  const handleRoundEnd = useCallback(() => {
    // Stop media
    if (audioRef.current) {
      audioRef.current.pause();
    }
    if (videoRef.current) {
      videoRef.current.pause();
    }

    // Reset audio-has-played guard
    audioHasPlayedRef.current = false;

    // Stop pitch detection
    stopPitch();

    if (activePlayers.length <= 1) return;

    const updatedGame = endRoundAndEliminate(game);
    onUpdateGame(updatedGame);
    setShowElimination(true);

    // Clear any previous elimination timer (e.g. if handleRoundEnd is called twice)
    if (roundEndTimerRef.current !== null) {
      clearTimeout(roundEndTimerRef.current);
    }
    roundEndTimerRef.current = setTimeout(() => {
      roundEndTimerRef.current = null;
      setShowElimination(false);

      if (updatedGame.winner) {
        return;
      }

      const nextGame = advanceToNextRound(updatedGame);
      onUpdateGame(nextGame);
    }, 4000); // 4 seconds to show elimination animation
  }, [activePlayers.length, game, onUpdateGame, stopPitch, audioRef, videoRef, audioHasPlayedRef, setShowElimination]);

  // Keep the auto-elimination timer's ref to handleRoundEnd up-to-date
  useEffect(() => {
    handleRoundEndRef.current = handleRoundEnd;
  }, [handleRoundEnd]);

  // Clean up the elimination timer on unmount to prevent state updates
  // on an unmounted component.
  useEffect(() => {
    return () => {
      if (roundEndTimerRef.current !== null) {
        clearTimeout(roundEndTimerRef.current);
        roundEndTimerRef.current = null;
      }
    };
  }, []);

  // Start next round
  const handleStartRound = useCallback(() => {
    const song = getRandomSong();
    if (!song) {
      console.error('[BattleRoyale] No playable songs found in library. Cannot start round.');
      return;
    }

    const updatedGame = startRound(game, song.id, song.title);
    onUpdateGame(updatedGame);
  }, [game, onUpdateGame, getRandomSong]);

  return {
    handleRoundEnd,
    handleStartRound,
    handleRoundEndRef,
    activePlayersRef,
    gameRef,
  };
}
