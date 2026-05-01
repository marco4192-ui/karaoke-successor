import { useRef, useCallback, useEffect } from 'react';

/**
 * Declarative setTimeout hook with automatic cleanup on unmount or re-render.
 *
 * @param callback - Function to call after the delay
 * @param delay - Delay in ms, or null to clear the timer
 * @returns Object with `reset()` to restart the timer and `clear()` to cancel it
 *
 * @example
 * const { reset, clear } = useTimeout(() => setMessage(null), 3000);
 * // Timer starts on mount, restarts if delay changes, clears on unmount
 */
export function useTimeout(callback: () => void, delay: number | null): { reset: () => void; clear: () => void } {
  const callbackRef = useRef(callback);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep callback ref in sync without triggering effect
  callbackRef.current = callback;

  const clear = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    clear();
    if (delay !== null) {
      timerRef.current = setTimeout(() => callbackRef.current(), delay);
    }
  }, [delay, clear]);

  // Start/clear timer when delay changes
  useEffect(() => {
    reset();
    return clear;
  }, [delay, reset, clear]);

  return { reset, clear };
}
