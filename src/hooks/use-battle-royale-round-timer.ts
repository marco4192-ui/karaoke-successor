'use client';

import { useState, useEffect, useRef } from 'react';
import { MedleySnippet } from '@/lib/game/battle-royale';

interface UseBattleRoyaleRoundTimerParams {
  gameStatus: string;
  roundDuration: number | undefined;
  gameCurrentRound: number;
  handleRoundEndRef: React.RefObject<() => void>;
  // #1 Medley support
  medleySnippetList: MedleySnippet[];
  currentSnippetIndex: number;
  /** Called when a medley snippet timer reaches zero to advance to the next snippet */
  onSnippetEndRef: React.RefObject<(() => void) | null>;
  isPaused?: boolean;
}

interface UseBattleRoyaleRoundTimerReturn {
  roundTimeLeft: number;
  snippetTimeLeft: number | null; // Time left in current medley snippet, null if not medley
}

/**
 * Counts down the round timer and triggers auto-elimination when time runs out.
 * Supports medley mode with per-snippet countdowns and snippet transition triggers.
 * Properly preserves remaining time across pause/unpause cycles.
 */
export function useBattleRoyaleRoundTimer({
  gameStatus,
  roundDuration,
  gameCurrentRound,
  handleRoundEndRef,
  medleySnippetList,
  currentSnippetIndex,
  onSnippetEndRef,
  isPaused,
}: UseBattleRoyaleRoundTimerParams): UseBattleRoyaleRoundTimerReturn {
  const [roundTimeLeft, setRoundTimeLeft] = useState(roundDuration || 0);
  const [snippetTimeLeft, setSnippetTimeLeft] = useState<number | null>(null);

  const skipAutoElimRef = useRef(false);
  // Track the last round number to detect new rounds vs pause toggles
  const lastRoundRef = useRef(gameCurrentRound);
  // Preserve remaining time across pause/unpause
  const preservedRoundTimeRef = useRef<number | null>(null);
  const preservedSnippetTimeRef = useRef<number | null>(null);
  // Track if we've already started the timer for this round
  const timerStartedRef = useRef(false);

  // Calculate snippet duration if in medley mode
  const isMedley = medleySnippetList.length > 1;
  const snippetDuration = isMedley
    ? medleySnippetList[currentSnippetIndex]?.duration ?? null
    : null;

  // Detect new round start (round number changed)
  useEffect(() => {
    if (gameCurrentRound !== lastRoundRef.current) {
      lastRoundRef.current = gameCurrentRound;
      timerStartedRef.current = false;
      preservedRoundTimeRef.current = null;
      preservedSnippetTimeRef.current = null;
    }
  }, [gameCurrentRound]);

  // Main timer: countdown round time
  useEffect(() => {
    if (gameStatus !== 'playing' || !roundDuration) return;

    // If timer was already started for this round and we're just toggling pause,
    // restore the preserved time instead of resetting
    if (timerStartedRef.current && preservedRoundTimeRef.current !== null) {
      if (isPaused) {
        // Pausing: save current time and clear interval
        // The cleanup will handle clearing the interval
        return;
      }
      // Unpausing: restore saved time and start interval from there
      const restoredTime = preservedRoundTimeRef.current;
      preservedRoundTimeRef.current = null;
      
      const interval = setInterval(() => {
        setRoundTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // Also restore snippet timer
      if (isMedley && preservedSnippetTimeRef.current !== null) {
        const restoredSnippetTime = preservedSnippetTimeRef.current;
        preservedSnippetTimeRef.current = null;
        const snippetInterval = setInterval(() => {
          setSnippetTimeLeft(prev => {
            if (prev === null || prev <= 1) {
              clearInterval(snippetInterval);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
        return () => {
          clearInterval(interval);
          clearInterval(snippetInterval);
        };
      }

      return () => clearInterval(interval);
    }

    // New round: initialize timer
    if (!isPaused) {
      timerStartedRef.current = true;
      setRoundTimeLeft(roundDuration);
      skipAutoElimRef.current = true;

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
  }, [gameStatus, roundDuration, gameCurrentRound, isPaused]);

  // Save timer state when pausing
  useEffect(() => {
    if (isPaused && timerStartedRef.current) {
      // We need to capture the current state. Use a microtask to ensure
      // we read after any pending setState flushes
      setRoundTimeLeft(current => {
        preservedRoundTimeRef.current = current;
        return current; // Don't change state, just capture
      });
      setSnippetTimeLeft(current => {
        preservedSnippetTimeRef.current = current;
        return current; // Don't change state, just capture
      });
    }
  }, [isPaused]);

  // Medley snippet timer: countdown within each snippet
  useEffect(() => {
    if (!isMedley || !snippetDuration || gameStatus !== 'playing' || isPaused) {
      return; // Don't reset snippetTimeLeft to null here, it's managed by pause/unpause
    }

    if (!timerStartedRef.current) return;

    // Only set snippet time if it hasn't been restored from pause
    if (preservedSnippetTimeRef.current !== null) return;

    setSnippetTimeLeft(snippetDuration);

    const interval = setInterval(() => {
      setSnippetTimeLeft(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [gameStatus, snippetDuration, currentSnippetIndex, isMedley, isPaused]);

  // Trigger auto-elimination when round timer reaches zero
  useEffect(() => {
    if (gameStatus === 'playing' && roundTimeLeft === 0 && roundDuration !== undefined && roundDuration > 0) {
      if (skipAutoElimRef.current) {
        skipAutoElimRef.current = false;
        return;
      }
      handleRoundEndRef.current();
    }
  }, [gameStatus, roundTimeLeft, roundDuration, handleRoundEndRef]);

  // Trigger snippet transition when snippet timer reaches zero
  useEffect(() => {
    if (
      gameStatus === 'playing' &&
      isMedley &&
      snippetTimeLeft === 0 &&
      snippetDuration !== null &&
      snippetDuration > 0 &&
      onSnippetEndRef.current
    ) {
      onSnippetEndRef.current();
    }
  }, [gameStatus, isMedley, snippetTimeLeft, snippetDuration, onSnippetEndRef]);

  return { roundTimeLeft, snippetTimeLeft };
}
