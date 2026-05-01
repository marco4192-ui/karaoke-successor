'use client';

import { useState, useEffect, useRef } from 'react';

interface UseBattleRoyaleRoundTimerParams {
  gameStatus: string;
  roundDuration: number | undefined;
  /** Included in effect deps to restart timer when round changes */
  gameCurrentRound: number;
  /** Ref to the latest handleRoundEnd callback — avoids stale closure in interval */
  handleRoundEndRef: React.RefObject<() => void>;
}

interface UseBattleRoyaleRoundTimerReturn {
  roundTimeLeft: number;
}

/**
 * Counts down the round timer and triggers auto-elimination when time runs out.
 * Uses a ref for the end callback to avoid stale closures in the setInterval timer.
 */
export function useBattleRoyaleRoundTimer({
  gameStatus,
  roundDuration,
  gameCurrentRound: _gameCurrentRound,
  handleRoundEndRef,
}: UseBattleRoyaleRoundTimerParams): UseBattleRoyaleRoundTimerReturn {
  const [roundTimeLeft, setRoundTimeLeft] = useState(roundDuration || 0);

  useEffect(() => {
    if (gameStatus === 'playing' && roundDuration) {
      setRoundTimeLeft(roundDuration);

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

  // Trigger auto-elimination when the timer reaches zero.
  // Kept separate from the setRoundTimeLeft updater to avoid
  // side effects inside a React state updater function, which
  // can be called multiple times in Concurrent Mode.
  useEffect(() => {
    if (gameStatus === 'playing' && roundTimeLeft === 0 && roundDuration !== undefined && roundDuration > 0) {
      handleRoundEndRef.current();
    }
  }, [gameStatus, roundTimeLeft, roundDuration, handleRoundEndRef]);

  return { roundTimeLeft };
}
