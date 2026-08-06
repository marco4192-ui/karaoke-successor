import React from 'react';
import { Note, LyricLine } from '@/types/game';

// Note display constants
export const NOTE_HEIGHT = 52;
export const PITCH_RANGE = 24;
export const BASE_PITCH = 48; // C3 - lowest pitch to display

/**
 * Get note display style classes based on display mode.
 * Currently only 'tick-fill-singstar' is supported — all other
 * display styles have been removed in favor of this Singstar-style
 * segmented tick rendering.
 */
export function getNoteDisplayStyleClasses(
  _displayStyle: string,
  accuracy: number = 1,
  isGolden: boolean = false,
  isBonus: boolean = false,
  performanceSamples?: Array<{ time: number; accuracy: number; hit: boolean; sungPitch?: number | null }>,
  targetPitch?: number,
  pitchStats?: PitchStats,
  visibleTop?: number,
  visibleRange?: number,
  /** 0-1: fraction of the note the singline has passed (left-to-right fill) */
  fillFraction: number = 1,
  /** Note start time in ms (for time-based segment mapping) */
  noteStartTime?: number,
  /** Note duration in ms (for time-based segment mapping) */
  noteDuration?: number,
  /** Container height in px (for exact ghost-bar pitch positioning) */
  containerHeight?: number,
): {
  additionalClasses: string;
  inlineStyle: React.CSSProperties;
  overlayElement: React.ReactNode | null;
} {
  // Singstar-style tick fill: The note fills from LEFT to RIGHT like a
  // progress bar as the singline passes over it. Only the portion the
  // singline has already passed shows hit/miss colours; the rest remains
  // as a dim "unreached" track. This prevents the confusing "rolling"
  // effect where segments appeared to shift as new samples arrived.
  //
  // Time-based segment mapping: each segment covers a fixed time slice
  // of the note (~50 ms). Adding new samples for later time slices no
  // longer shifts earlier segments, eliminating flicker.
  //
  // Missed ticks create a GAP in the note bar, and a pale "ghost bar"
  // appears at the actual sung pitch (above or below) so the singer
  // sees where they are vs. where they need to be.

  const samples = performanceSamples || [];
  const clampedFill = Math.max(0, Math.min(1, fillFraction));

  // Segment count: one per ~50 ms of note duration, clamped 4-24
  const segCount = noteDuration
    ? Math.max(4, Math.min(24, Math.round(noteDuration / 50)))
    : Math.max(4, Math.min(24, samples.length));

  // How many segments the singline has fully passed
  const reachedFloat = clampedFill * segCount;
  const reachedCount = Math.floor(reachedFloat);
  const partialFill = reachedFloat - reachedCount;

  // ── Colour palette (high-saturation / neon for visibility over video) ──
  // Chosen to punch through bright video backgrounds: full saturation,
  // high luminance edges, strong glow.
  const hitColors = {
    Perfect: isGolden ? '#FFD700' : isBonus ? '#FF1493' : '#00FF7F',
    Great:   isGolden ? '#FFC107' : isBonus ? '#FF69B4' : '#00E5FF',
    Good:    isGolden ? '#FF9800' : isBonus ? '#FF007F' : '#2979FF',
    Okay:    isGolden ? '#E65100' : isBonus ? '#C51162' : '#7C4DFF',
  };
  const missGap       = 'rgba(255, 255, 255, 0.02)';
  const missGapBorder = 'rgba(255, 255, 255, 0.05)';
  const unreachedBg   = 'rgba(255, 255, 255, 0.08)';
  const unreachedBdr  = 'rgba(255, 255, 255, 0.14)';

  // ── Time-based segment → sample mapping ────────────────────────
  const segDur = (noteDuration ?? 0) / segCount;
  const nStart = noteStartTime ?? 0;

  const segData: Array<{
    hit: boolean;
    accuracy: number;
    displayType: string;
    sungPitch: number | null;
  }> = [];

  for (let i = 0; i < segCount; i++) {
    const segStart = nStart + i * segDur;
    const segEnd   = segStart + segDur;

    // Filter samples that fall into this segment's time window
    const segSamples = noteDuration !== undefined && noteDuration > 0
      ? samples.filter(s => s.time >= segStart && s.time < segEnd)
      : samples.slice(
          Math.floor((i / segCount) * samples.length),
          Math.ceil(((i + 1) / segCount) * samples.length),
        );

    if (segSamples.length === 0) {
      segData.push({ hit: false, accuracy: 0, displayType: 'Miss', sungPitch: null });
      continue;
    }

    const bestHit = segSamples.reduce(
      (best, s) => (s.hit && s.accuracy > best.accuracy ? s : best),
      segSamples[0],
    );
    const anyHit  = segSamples.some(s => s.hit);
    const lastSung = segSamples[segSamples.length - 1];

    if (anyHit) {
      let dt = 'Okay';
      if (bestHit.accuracy > 0.95) dt = 'Perfect';
      else if (bestHit.accuracy > 0.8) dt = 'Great';
      else if (bestHit.accuracy > 0.6) dt = 'Good';
      segData.push({ hit: true, accuracy: bestHit.accuracy, displayType: dt, sungPitch: null });
    } else {
      segData.push({ hit: false, accuracy: 0, displayType: 'Miss', sungPitch: lastSung.sungPitch ?? null });
    }
  }

  // ── Hit ratio (only reached segments) ──────────────────────────
  const reachedSegs = segData.slice(0, reachedCount);
  const hitRatio = reachedSegs.length > 0
    ? reachedSegs.filter(s => s.hit).length / reachedSegs.length
    : 0;
  const hasHits = hitRatio > 0;

  // ── Ghost bars for missed segments within the reached area ─────
  // Positioned at the EXACT sung pitch using the same pitch-to-Y
  // formula as NoteBlock, so the singer sees precisely where they are.
  const ghostBars: Array<{ segmentIndex: number; yOffset: number; color: string }> = [];
  if (targetPitch !== undefined && pitchStats && visibleTop !== undefined && visibleRange !== undefined) {
    const pr = pitchStats.pitchRange || 1;
    const cH = containerHeight || 800;

    // Pre-compute target pitch Y position (percent of container)
    const targetY = visibleTop + visibleRange - ((targetPitch - pitchStats.minPitch) / pr) * visibleRange;

    for (let si = 0; si < Math.min(reachedCount, segData.length); si++) {
      const seg = segData[si];
      if (!seg.hit && seg.sungPitch !== null) {
        // Compute the exact Y position of the sung pitch
        const sungY = visibleTop + visibleRange - ((seg.sungPitch - pitchStats.minPitch) / pr) * visibleRange;
        // Convert percent difference to pixel offset relative to the note center
        const yOffset = ((sungY - targetY) / 100) * cH;

        // Colour by distance: close = bright yellow, far = vivid red
        let rawDiff = Math.abs(seg.sungPitch - targetPitch) % 12;
        if (rawDiff > 6) rawDiff = 12 - rawDiff;
        const color = rawDiff > 2
          ? 'rgba(255, 30, 30, 0.85)'
          : rawDiff > 1
            ? 'rgba(255, 120, 0, 0.80)'
            : 'rgba(255, 230, 0, 0.75)';
        ghostBars.push({ segmentIndex: si, yOffset, color });
      }
    }
  }

  const glowColor = isGolden ? 'rgba(255, 193, 7,' : isBonus ? 'rgba(255, 20, 147,' : 'rgba(0, 229, 255,';

  // ── Render ──────────────────────────────────────────────────────
  return {
    additionalClasses: 'overflow-visible',
    inlineStyle: {
      backgroundImage: 'linear-gradient(135deg, rgba(255, 255, 255, 0.06) 0%, rgba(120, 160, 200, 0.04) 100%)',
      backgroundColor: 'rgba(100, 130, 160, 0.08)',
      border: '1.5px solid rgba(255, 255, 255, 0.16)',
      boxShadow: hasHits
        ? `0 0 ${6 + hitRatio * 14}px ${glowColor}${hitRatio * 0.5}), 0 0 ${2 + hitRatio * 6}px ${glowColor}${hitRatio * 0.3}), inset 0 2px 0 rgba(255,255,255,0.15), inset 0 -2px 0 rgba(0,0,0,0.18)`
        : 'inset 0 2px 0 rgba(255,255,255,0.12), inset 0 -2px 0 rgba(0,0,0,0.18), 0 2px 4px rgba(0,0,0,0.2)',
      filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.25))',
    },
    overlayElement: (
      <>
        {/* Segments: unreached (dim) → reached+hit (coloured) / reached+miss (gap) */}
        <div className="absolute inset-y-0 left-0 right-0 flex" style={{ gap: '1px', padding: '2px 3px' }}>
          {segData.map((seg, idx) => {
            const isUnreached  = idx > reachedCount;
            const isAtFront    = idx === reachedCount;

            let bgColor: string;
            let borderCol: string;
            let clipPath: string | undefined;

            if (isUnreached) {
              bgColor   = unreachedBg;
              borderCol = unreachedBdr;
            } else if (seg.hit) {
              bgColor   = hitColors[seg.displayType as keyof typeof hitColors] || hitColors.Okay;
              borderCol = 'transparent';
            } else {
              bgColor   = missGap;
              borderCol = missGapBorder;
            }

            // The segment exactly at the fill front may be partially visible
            if (isAtFront && partialFill > 0 && partialFill < 1) {
              clipPath = `inset(0 ${(1 - partialFill) * 100}% 0 0)`;
            } else if (isAtFront && partialFill <= 0) {
              bgColor   = unreachedBg;
              borderCol = unreachedBdr;
            }

            return (
              <div
                key={idx}
                className="flex-1 rounded-sm"
                style={{
                  backgroundColor: bgColor,
                  border: `1px solid ${borderCol}`,
                  clipPath,
                  transition: 'background-color 60ms linear',
                }}
              />
            );
          })}
        </div>

        {/* Ghost bars: missed notes shown at sung pitch, paler */}
        {ghostBars.length > 0 && (
          <div className="absolute pointer-events-none" style={{ inset: 0, overflow: 'visible' }}>
            {ghostBars.map((bar) => {
              const segW    = 100 / segData.length;
              const barLeft = segW * bar.segmentIndex + segW * 0.1;
              const barW    = segW * 0.8;
              return (
                <div
                  key={`ghost-${bar.segmentIndex}`}
                  className="absolute rounded-sm"
                  style={{
                    left: `${barLeft}%`,
                    top: '50%',
                    width: `${barW}%`,
                    height: '18px',
                    transform: `translateY(-50%) translateY(${bar.yOffset}px)`,
                    backgroundColor: bar.color,
                    opacity: 0.9,
                    boxShadow: `0 0 8px ${bar.color}`,
                  }}
                />
              );
            })}
          </div>
        )}
      </>
    ),
  };
}

/**
 * Calculate note background classes based on note type
 */
export function getNoteBackgroundClasses(isGolden: boolean, isBonus: boolean): string {
  if (isGolden) {
    return 'bg-gradient-to-r from-yellow-400 to-orange-500';
  }
  if (isBonus) {
    return 'bg-gradient-to-r from-pink-500 to-purple-500';
  }
  return 'bg-gradient-to-r from-cyan-500 to-blue-500';
}

/**
 * Calculate note box shadow based on active state and type
 */
export function getNoteBoxShadow(isActive: boolean, isGolden: boolean): string {
  if (!isActive) return 'none';
  if (isGolden) {
    return '0 0 30px rgba(251, 191, 36, 0.7)';
  }
  return '0 0 25px rgba(34, 211, 238, 0.7)';
}

/**
 * Calculate vertical position for a pitch value
 */
export function calculatePitchY(pitch: number, windowHeight: number): number {
  const pitchOffset = pitch - BASE_PITCH;
  return windowHeight - ((pitchOffset / PITCH_RANGE) * windowHeight);
}

/**
 * Note position data for rendering
 */
export interface NotePositionData {
  noteId: string;
  x: number;
  width: number;
  pitchY: number;
  isActive: boolean;
  isPast: boolean;
  lyric: string;
  isGolden: boolean;
  isBonus: boolean;
}

/**
 * Pitch statistics for display range calculation
 */
export interface PitchStats {
  minPitch: number;
  maxPitch: number;
  pitchRange: number;
}

/**
 * Default pitch stats (fallback when no notes available)
 */
const DEFAULT_PITCH_STATS: PitchStats = {
  minPitch: 48,
  maxPitch: 72,
  pitchRange: 24,
};

/**
 * Calculate pitch range statistics from an array of notes
 */
export function calculatePitchStats(
  notes: Array<{ pitch: number }> | null | undefined,
  padding: number = 2
): PitchStats {
  if (!notes || notes.length === 0) {
    return DEFAULT_PITCH_STATS;
  }

  let minPitch = Infinity;
  let maxPitch = -Infinity;

  for (const note of notes) {
    minPitch = Math.min(minPitch, note.pitch);
    maxPitch = Math.max(maxPitch, note.pitch);
  }

  const paddedMin = Math.max(0, minPitch - padding);
  const paddedMax = Math.min(127, maxPitch + padding);

  return {
    minPitch: paddedMin,
    maxPitch: paddedMax,
    pitchRange: Math.max(12, paddedMax - paddedMin),
  };
}

// Game display constants
export const SING_LINE_POSITION = 20;
export const NOTE_WINDOW = 4000;
export const VISIBLE_TOP = 8;
const VISIBLE_BOTTOM = 85;
export const VISIBLE_RANGE = VISIBLE_BOTTOM - VISIBLE_TOP;

/**
 * Get visible notes within a time window using binary search.
 */
export function getVisibleNotes(
  notes: Array<Note & { lineIndex: number; line: LyricLine }> | undefined | null,
  currentTime: number,
  noteWindow: number
): Array<Note & { lineIndex: number; line: LyricLine }> {
  if (!notes || notes.length === 0) return [];

  const searchWindowStart = currentTime - 20000;
  const filterWindowStart = currentTime - 5000;
  const windowEnd = currentTime + noteWindow;
  const result: Array<Note & { lineIndex: number; line: LyricLine }> = [];

  let startIdx = 0;
  let endIdx = notes.length - 1;

  while (startIdx <= endIdx) {
    const midIdx = Math.floor((startIdx + endIdx) / 2);
    if (notes[midIdx].startTime < searchWindowStart) {
      startIdx = midIdx + 1;
    } else {
      endIdx = midIdx - 1;
    }
  }

  for (let i = startIdx; i < notes.length; i++) {
    const note = notes[i];
    const noteEnd = note.startTime + note.duration;

    if (note.startTime > windowEnd) break;
    if (noteEnd >= filterWindowStart) {
      result.push(note);
    }
  }

  return result;
}
