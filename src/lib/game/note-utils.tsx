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
): {
  additionalClasses: string;
  inlineStyle: React.CSSProperties;
  overlayElement: React.ReactNode | null;
} {
  // Singstar-style tick fill: Each visual tick is a segment that fills
  // when hit (color-coded by accuracy) or stays empty when missed.
  // Missed ticks with a recorded sungPitch show a small indicator dot
  // offset vertically to show WHERE the singer actually was.
  //
  // With high-rate visual sampling (~50ms intervals), we now get
  // 8-20 samples per typical note, giving smooth real-time filling.
  const samples = performanceSamples || [];

  // Segment count based on note duration (50ms per tick), clamped to
  // a readable range.
  const segmentCount = Math.max(4, Math.min(24, samples.length));

  const hitColorPerfect = isGolden ? '#fbbf24' : isBonus ? '#f472b6' : '#34d399';
  const hitColorGreat = isGolden ? '#f59e0b' : isBonus ? '#ec4899' : '#22d3ee';
  const hitColorGood = isGolden ? '#d97706' : isBonus ? '#db2777' : '#3b82f6';
  const hitColorOkay = isGolden ? '#92400e' : isBonus ? '#9d174d' : '#6366f1';
  const missColor = 'rgba(255, 255, 255, 0.05)';
  const missBorder = 'rgba(255, 255, 255, 0.10)';

  // Map samples to segments: distribute samples evenly across segments.
  const segData: Array<{
    hit: boolean;
    accuracy: number;
    displayType: string;
    sungPitch: number | null;
  }> = [];
  for (let i = 0; i < segmentCount; i++) {
    const segStart = (i / segmentCount) * samples.length;
    const segEnd = ((i + 1) / segmentCount) * samples.length;
    const segSamples = samples.slice(Math.floor(segStart), Math.ceil(segEnd));

    if (segSamples.length === 0) {
      segData.push({ hit: false, accuracy: 0, displayType: 'Miss', sungPitch: null });
      continue;
    }

    const bestHit = segSamples.reduce((best, s) => s.hit && s.accuracy > best.accuracy ? s : best, segSamples[0]);
    const anyHit = segSamples.some(s => s.hit);
    const lastSung = segSamples[segSamples.length - 1];

    if (anyHit) {
      let dt: string = 'Okay';
      if (bestHit.accuracy > 0.95) dt = 'Perfect';
      else if (bestHit.accuracy > 0.8) dt = 'Great';
      else if (bestHit.accuracy > 0.6) dt = 'Good';
      segData.push({ hit: true, accuracy: bestHit.accuracy, displayType: dt, sungPitch: null });
    } else {
      segData.push({ hit: false, accuracy: 0, displayType: 'Miss', sungPitch: lastSung.sungPitch ?? null });
    }
  }

  const hitRatio = segData.filter(s => s.hit).length / segData.length;
  const hasHits = hitRatio > 0;

  // Calculate deviation dots for missed segments that have a recorded sung pitch.
  const deviationDots: Array<{ segmentIndex: number; yOffset: number; color: string }> = [];
  if (targetPitch !== undefined && pitchStats && visibleTop !== undefined && visibleRange !== undefined) {
    const pr = pitchStats.pitchRange || 1;
    for (let si = 0; si < segData.length; si++) {
      const seg = segData[si];
      if (!seg.hit && seg.sungPitch !== null) {
        let rawDiff = Math.abs(seg.sungPitch - targetPitch) % 12;
        if (rawDiff > 6) rawDiff = 12 - rawDiff;
        const pxPerSemitone = (visibleRange / pr) * 0.5;
        const yDiff = (seg.sungPitch > targetPitch ? -1 : 1) * rawDiff * pxPerSemitone;
        const clampedY = Math.max(-32, Math.min(32, yDiff));
        const color = rawDiff > 2
          ? 'rgba(239, 68, 68, 0.85)'
          : rawDiff > 1
            ? 'rgba(249, 115, 22, 0.8)'
            : 'rgba(234, 179, 8, 0.75)';
        deviationDots.push({ segmentIndex: si, yOffset: clampedY, color });
      }
    }
  }

  const glowColor = isGolden ? 'rgba(251, 191, 36,' : isBonus ? 'rgba(236, 72, 153,' : 'rgba(34, 211, 238,';

  return {
    additionalClasses: 'overflow-visible',
    inlineStyle: {
      backgroundImage: 'linear-gradient(135deg, rgba(255, 255, 255, 0.06) 0%, rgba(120, 160, 200, 0.04) 100%)',
      backgroundColor: 'rgba(100, 130, 160, 0.12)',
      border: '1.5px solid rgba(255, 255, 255, 0.16)',
      boxShadow: hasHits
        ? `0 0 ${4 + hitRatio * 10}px ${glowColor}${hitRatio * 0.35}), inset 0 2px 0 rgba(255,255,255,0.12), inset 0 -2px 0 rgba(0,0,0,0.18)`
        : 'inset 0 2px 0 rgba(255,255,255,0.12), inset 0 -2px 0 rgba(0,0,0,0.18), 0 2px 4px rgba(0,0,0,0.2)',
      filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.25))',
    },
    overlayElement: (
      <>
        {/* Tick segments */}
        <div className="absolute inset-y-0 left-0 right-0 flex" style={{ gap: '1px', padding: '2px 3px' }}>
          {segData.map((seg, idx) => {
            let bgColor: string;
            if (!seg.hit) {
              bgColor = missColor;
            } else {
              switch (seg.displayType) {
                case 'Perfect': bgColor = hitColorPerfect; break;
                case 'Great': bgColor = hitColorGreat; break;
                case 'Good': bgColor = hitColorGood; break;
                default: bgColor = hitColorOkay;
              }
            }
            const borderCol = seg.hit ? 'transparent' : missBorder;
            return (
              <div
                key={idx}
                className="flex-1 rounded-sm"
                style={{
                  backgroundColor: bgColor,
                  border: `1px solid ${borderCol}`,
                  transition: 'background-color 40ms linear, border-color 40ms linear',
                }}
              />
            );
          })}
        </div>
        {/* Deviation dots for missed ticks */}
        {deviationDots.length > 0 && (
          <div className="absolute inset-0 pointer-events-none" style={{ overflow: 'visible' }}>
            {deviationDots.map((dot) => {
              const segWidth = 100 / segData.length;
              const centerX = segWidth * dot.segmentIndex + segWidth / 2;
              return (
                <div
                  key={`dot-${dot.segmentIndex}`}
                  className="absolute rounded-full"
                  style={{
                    left: `${centerX}%`,
                    top: '50%',
                    width: '5px',
                    height: '5px',
                    transform: `translate(-50%, calc(-50% + ${dot.yOffset}px))`,
                    backgroundColor: dot.color,
                    boxShadow: `0 0 3px ${dot.color}`,
                    opacity: 0.85,
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
