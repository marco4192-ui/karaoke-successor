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
}

interface UseBattleRoyaleRoundTimerReturn {
  roundTimeLeft: number;
  snippetTimeLeft: number | null; // Time left in current medley snippet, null if not medley
}

/**
 * Counts down the round timer and triggers auto-elimination when time runs out.
 * Supports medley mode with per-snippet countdowns and snippet transition triggers.
 */
export function useBattleRoyaleRoundTimer({
  gameStatus,
  roundDuration,
  gameCurrentRound: _gameCurrentRound,
  handleRoundEndRef,
  medleySnippetList,
  currentSnippetIndex,
  onSnippetEndRef,
}: UseBattleRoyaleRoundTimerParams): UseBattleRoyaleRoundTimerReturn {
  const [roundTimeLeft, setRoundTimeLeft] = useState(roundDuration || 0);
  const [snippetTimeLeft, setSnippetTimeLeft] = useState<number | null>(null);

  const skipAutoElimRef = useRef(false);

  // Calculate snippet duration if in medley mode
  const isMedley = medleySnippetList.length > 1;
  const snippetDuration = isMedley
    ? medleySnippetList[currentSnippetIndex]?.duration ?? null
    : null;

  // Main timer: countdown round time
  useEffect(() => {
    if (gameStatus === 'playing' && roundDuration) {
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
  }, [gameStatus, roundDuration, _gameCurrentRound]);

  // Medley snippet timer: countdown within each snippet
  useEffect(() => {
    if (!isMedley || !snippetDuration || gameStatus !== 'playing') {
      setSnippetTimeLeft(null);
      return;
    }

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
  }, [gameStatus, snippetDuration, currentSnippetIndex, isMedley]);

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
