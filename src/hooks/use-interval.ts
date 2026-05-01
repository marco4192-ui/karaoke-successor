import { useRef, useCallback, useEffect } from 'react';

/**
 * Declarative setInterval hook with automatic cleanup on unmount or re-render.
 *
 * @param callback - Function to call on each interval tick
 * @param delay - Interval in ms, or null to pause the interval
 * @returns Object with `isActive()` to check if running
 *
 * @example
 * useInterval(() => syncGameState(), 2000);
 * // Interval starts on mount, restarts if delay changes, clears on unmount
 *
 * @example
 * const [speed, setSpeed] = useState(1000);
 * useInterval(tick, speed); // Reactively adjusts interval speed
 *
 * @example
 * useInterval(poll, isPlaying ? 2000 : null); // Pauses when not playing
 */
export function useInterval(callback: () => void, delay: number | null): { isActive: () => boolean } {
  const callbackRef = useRef(callback);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Keep callback ref in sync without triggering effect
  callbackRef.current = callback;

  const isActive = useCallback(() => intervalRef.current !== null, []);

  useEffect(() => {
    // Clear any existing interval
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Start new interval if delay is valid
    if (delay !== null) {
      intervalRef.current = setInterval(() => callbackRef.current(), delay);
    }

    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [delay]);

  return { isActive };
}
