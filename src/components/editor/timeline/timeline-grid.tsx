'use client';

/**
 * Timeline grid component (background beat + pitch lines of one lane).
 * Extracted verbatim from timeline.tsx (R2 refactor) — only the props were
 * lifted into a named interface; the rendering logic is unchanged.
 */
import React from 'react';
import { cn } from '@/lib/utils';

interface TimelineGridProps {
  viewportWidth: number;
  pixelsPerSecond: number;
  scrollOffset: number;
  bpm: number;
  gap: number;
  minPitch: number;
  maxPitch: number;
  pitchHeight: number;
}

export function TimelineGrid({
  viewportWidth,
  pixelsPerSecond,
  scrollOffset,
  bpm,
  gap,
  minPitch,
  maxPitch,
  pitchHeight
}: TimelineGridProps) {
  // UltraStar beat formula — MUST match generateUltraStarTxt / the parser:
  // beatDuration = 15000 / BPM (ms per beat), beat n occurs at GAP + n * beatDuration.
  // (The old grid used 60000/BPM without GAP — beats were 4× too wide and offset.)
  const beatDuration = 15000 / (bpm > 0 ? bpm : 120);
  const pixelsPerBeat = (beatDuration / 1000) * pixelsPerSecond;

  // Generate beat lines for the visible range only
  const beatLines: React.JSX.Element[] = [];
  if (pixelsPerBeat > 4 && isFinite(pixelsPerBeat)) {
    const firstBeat = Math.floor((scrollOffset - (gap / 1000) * pixelsPerSecond) / pixelsPerBeat);
    const lastBeat = Math.ceil((scrollOffset + viewportWidth - (gap / 1000) * pixelsPerSecond) / pixelsPerBeat);

    for (let beat = firstBeat; beat <= lastBeat; beat++) {
      const x = beat * pixelsPerBeat + (gap / 1000) * pixelsPerSecond - scrollOffset;
      if (x < -1 || x > viewportWidth + 1) continue;
      const isDownbeat = ((beat % 4) + 4) % 4 === 0;

      beatLines.push(
        <div
          key={`beat-${beat}`}
          className={cn(
            'absolute top-0 bottom-0 w-px',
            isDownbeat ? 'bg-slate-600' : 'bg-slate-800'
          )}
          style={{ left: `${x}px` }}
        />
      );
    }
  }

  // Generate pitch lines
  const pitchLines: React.JSX.Element[] = [];
  for (let pitch = Math.ceil(minPitch); pitch <= Math.floor(maxPitch); pitch++) {
    const y = (maxPitch - pitch) * pitchHeight;
    const isC = pitch % 12 === 0;
    const isSharp = [1, 3, 6, 8, 10].includes(pitch % 12);

    pitchLines.push(
      <div
        key={`pitch-${pitch}`}
        className={cn(
          'absolute left-0 right-0 h-px',
          isC ? 'bg-slate-600' : isSharp ? 'bg-slate-900' : 'bg-slate-800'
        )}
        style={{ top: `${y}px` }}
      />
    );
  }

  return (
    <div className="absolute inset-0 ml-8 pointer-events-none">
      {/* Pitch grid */}
      <div className="absolute inset-0">{pitchLines}</div>

      {/* Beat lines */}
      <div className="absolute inset-0">{beatLines}</div>
    </div>
  );
}
