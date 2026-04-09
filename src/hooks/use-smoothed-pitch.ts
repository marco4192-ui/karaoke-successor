'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Hook that applies exponential moving average (EMA) smoothing to raw pitch values.
 * This prevents the pitch indicator from flickering/jumping rapidly when the singer's
 * voice has natural micro-variations between detections.
 *
 * @param rawPitch - The raw detected pitch (MIDI note number), or null
 * @param smoothingFactor - EMA factor (0 = no change / max smoothing, 1 = no smoothing). Default: 0.35
 * @param deadZone - Minimum pitch change (in semitones) required to trigger an update.
 *                   Prevents tiny micro-jitters. Default: 0.3
 * @returns The smoothed pitch value, or null
 */
export function useSmoothedPitch(
  rawPitch: number | null,
  smoothingFactor: number = 0.35,
  deadZone: number = 0.3,
): number | null {
  const [smoothedPitch, setSmoothedPitch] = useState<number | null>(null);
  const prevRawRef = useRef<number | null>(null);

  useEffect(() => {
    if (rawPitch === null) {
      // When no pitch is detected, fade out smoothly by keeping last value briefly
      // then clearing after a short delay
      const timeout = setTimeout(() => setSmoothedPitch(null), 150);
      return () => clearTimeout(timeout);
    }

    // Apply dead zone: ignore changes smaller than deadZone semitones
    if (prevRawRef.current !== null) {
      const delta = Math.abs(rawPitch - prevRawRef.current);
      if (delta < deadZone) {
        return; // Skip this update — too small a change
      }
    }
    prevRawRef.current = rawPitch;

    // Exponential moving average
    setSmoothedPitch(prev => {
      if (prev === null) return rawPitch;
      return prev + smoothingFactor * (rawPitch - prev);
    });
  }, [rawPitch, smoothingFactor, deadZone]);

  return smoothedPitch;
}
