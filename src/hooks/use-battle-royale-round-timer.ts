'use client';

import { useState, useEffect, useRef} from 'react';

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

  // Guards against spurious auto-elimination when a new round starts.
  // Without this, React batching can cause the auto-elimination effect to
  // fire with the stale roundTimeLeft===0 from the previous round before
  // the timer-reset effect has a chance to set the new duration.
  const skipAutoElimRef = useRef(false);

  useEffect(() => {
    if (gameStatus === 'playing' && roundDuration) {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync
      setRoundTimeLeft(roundDuration);
      skipAutoElimRef.current = true; // suppress auto-elim on this render

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
      if (skipAutoElimRef.current) {
        skipAutoElimRef.current = false;
        return;
      }
      handleRoundEndRef.current();
    }
  }, [gameStatus, roundTimeLeft, roundDuration, handleRoundEndRef]);

  return { roundTimeLeft };
}
