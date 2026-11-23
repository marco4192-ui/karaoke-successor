'use client';

/**
 * React binding for the song pitch shift (R105).
 *
 * Keeps the <audio> element's Web Audio chain in sync with the requested
 * semitones: engage the worklet insert while ≠ 0, restore the pristine
 * bypass routing when back to 0 (zero added latency when off).
 *
 * The heavy lifting (guards, shared source, routing) lives in
 * src/lib/audio/pitch-shift.ts — this hook only reacts to prop changes.
 */

import { useEffect, useRef, useState } from 'react';
import { setPitchShift, clearPitchShift } from '@/lib/audio/pitch-shift';

interface UsePitchShiftOptions {
  /** The element playing the song's music (null while switching songs). */
  element: HTMLMediaElement | null;
  /** Requested transposition in semitones (−12..+12, 0 = off). */
  semitones: number;
}

interface UsePitchShiftResult {
  /** True when the last engage attempt failed (element/medium unsupported). */
  unavailable: boolean;
}

export function usePitchShift({ element, semitones }: UsePitchShiftOptions): UsePitchShiftResult {
  const [unavailable, setUnavailable] = useState(false);

  // Track the latest element for the unmount cleanup without re-triggering
  // the engage effect.
  const elementRef = useRef<HTMLMediaElement | null>(null);
  elementRef.current = element;

  // Engage / update / bypass whenever the element or the value changes.
  useEffect(() => {
    if (!element) return;
    let cancelled = false;
    if (semitones === 0) {
      setUnavailable(false);
      clearPitchShift(element);
      return;
    }
    setPitchShift(element, semitones).then((ok) => {
      if (!cancelled) setUnavailable(!ok);
    });
    return () => {
      cancelled = true;
    };
  }, [element, semitones]);

  // Restore the pristine routing when the song element unmounts (elements
  // are re-created per song via key={song.id}).
  useEffect(() => {
    return () => {
      const el = elementRef.current;
      if (el) clearPitchShift(el);
    };
  }, []);

  return { unavailable };
}
