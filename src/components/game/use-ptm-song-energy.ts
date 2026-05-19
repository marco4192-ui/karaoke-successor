/**
 * Sub-hook: song energy tracking for animated backgrounds.
 * Uses binary search over sorted note start times to compute
 * how "dense" the current moment is in terms of nearby notes.
 */
'use client';

import { useEffect, useMemo, useState } from 'react';
import { Note } from '@/types/game';

interface UsePtmSongEnergyOptions {
  allNotes: Array<Note & { lineIndex: number; line: unknown }>;
  isPlaying: boolean;
  phase: string;
  currentTimeRef: React.RefObject<number>;
}

export function usePtmSongEnergy({
  allNotes,
  isPlaying,
  phase,
  currentTimeRef,
}: UsePtmSongEnergyOptions): { songEnergy: number } {
  const [songEnergy, setSongEnergy] = useState(0);

  // Pre-sort note start times for O(log n) binary search
  const sortedNoteStarts = useMemo(() => {
    return allNotes.map(n => n.startTime).sort((a, b) => a - b);
  }, [allNotes]);

  useEffect(() => {
    if (!isPlaying || phase !== 'playing') { setSongEnergy(0); return; }
    const interval = setInterval(() => {
      // Binary search: count notes within ±2s of current time
      const t = currentTimeRef.current;
      const lo = t - 2000;
      const hi = t + 2000;
      // bisect_left for lo
      let left = 0, right = sortedNoteStarts.length;
      while (left < right) {
        const mid = (left + right) >> 1;
        if (sortedNoteStarts[mid] < lo) left = mid + 1;
        else right = mid;
      }
      const startIdx = left;
      // bisect_left for hi
      left = startIdx; right = sortedNoteStarts.length;
      while (left < right) {
        const mid = (left + right) >> 1;
        if (sortedNoteStarts[mid] < hi) left = mid + 1;
        else right = mid;
      }
      const nearbyNotes = left - startIdx;
      setSongEnergy(Math.min(1, nearbyNotes / 5));
    }, 200);
    return () => clearInterval(interval);
  }, [isPlaying, phase, sortedNoteStarts, currentTimeRef]);

  return { songEnergy };
}
