'use client';

import { useState, useEffect } from 'react';

/**
 * Debounce a value by `delay` milliseconds.
 * Returns the debounced value that only updates after the input
 * has been stable for the specified delay.
 *
 * Usage: const debouncedQuery = useDebouncedValue(query, 200);
 */
export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
