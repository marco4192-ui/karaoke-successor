import React from 'react';
import { Note, LyricLine } from '@/types/game';

// Note shape style type
export type NoteShapeStyle = 'rounded' | 'sharp' | 'pill' | 'diamond';

// Note display style type
export type NoteDisplayStyle = 'classic' | 'fill-level' | 'color-feedback' | 'glow-intensity';

// Note display constants
export const NOTE_HEIGHT = 52;
export const PITCH_RANGE = 24;
export const BASE_PITCH = 48; // C3 - lowest pitch to display

// ---- Note shape configuration (shared between NoteBlock and NoteLane) ----

interface NoteShapeConfig {
  style: React.CSSProperties;
  /** Active-class for standard note blocks */
  activeClass: string;
  /** Active-class for the lane (larger ring/offset) */
  laneActiveClass: string;
  /** Override for lane-specific borderRadius (if any) */
  laneBorderRadius?: string;
}

const NOTE_SHAPE_CONFIGS: Record<NoteShapeStyle, NoteShapeConfig> = {
  sharp: {
    style: {
      clipPath: 'polygon(4% 0%, 100% 0%, 96% 100%, 0% 100%)',
      transition: 'clip-path 0.3s ease',
    },
    activeClass: 'ring-2 ring-white/80 brightness-110',
    laneActiveClass: 'ring-4 ring-white ring-offset-2 ring-offset-transparent brightness-125',
  },
  pill: {
    style: {
      borderRadius: '9999px',
      border: 'none',
      transition: 'border-radius 0.3s ease',
    },
    activeClass: 'ring-2 ring-white/60 brightness-110',
    laneActiveClass: 'ring-4 ring-white ring-offset-2 ring-offset-transparent brightness-110',
  },
  diamond: {
    style: {
      clipPath: 'polygon(10% 50%, 50% 5%, 90% 50%, 50% 95%)',
      transition: 'clip-path 0.3s ease',
    },
    // NOTE: Do NOT use Tailwind scale-* — it overrides inline translateY(-50%)
    activeClass: 'brightness-125',
    laneActiveClass: 'brightness-125',
  },
  rounded: {
    style: {
      borderRadius: '10px',
      border: '1.5px solid rgba(255,255,255,0.25)',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12), inset 0 -1px 0 rgba(0,0,0,0.1)',
      transition: 'border-radius 0.3s ease',
    },
    activeClass: 'ring-2 ring-white/80 brightness-125',
    laneActiveClass: 'ring-4 ring-white ring-offset-2 ring-offset-transparent brightness-125',
    laneBorderRadius: '14px',
  },
};

/**
 * Get note shape classes based on theme setting.
 * Used by NoteBlock (game screen notes).
 */
export function getNoteShapeClasses(noteStyle: NoteShapeStyle): {
  baseClass: string;
  activeClass: string;
  style: React.CSSProperties;
} {
  const cfg = NOTE_SHAPE_CONFIGS[noteStyle] ?? NOTE_SHAPE_CONFIGS.rounded;
  return { baseClass: '', activeClass: cfg.activeClass, style: { ...cfg.style } };
}

/**
 * Get note shape classes for the note lane (active notes with larger ring/offset).
 */
export function getNoteShapeClassesForLane(noteStyle: NoteShapeStyle): {
  baseClass: string;
  activeClass: string;
  style: React.CSSProperties;
} {
  const cfg = NOTE_SHAPE_CONFIGS[noteStyle] ?? NOTE_SHAPE_CONFIGS.rounded;
  const style: React.CSSProperties = { ...cfg.style };
  if (cfg.laneBorderRadius) style.borderRadius = cfg.laneBorderRadius;
  return { baseClass: '', activeClass: cfg.laneActiveClass, style };
}

/**
 * Get note display style classes based on display mode
 * Controls how notes are visually rendered (fill-level, color-feedback, glow-intensity)
 * Each mode provides a clearly distinct and visually appealing effect.
 */
export function getNoteDisplayStyleClasses(
  displayStyle: NoteDisplayStyle,
  accuracy: number = 1, // 0-1, how accurate the player is
  isGolden: boolean = false,
  isBonus: boolean = false
): {
  additionalClasses: string;
  inlineStyle: React.CSSProperties;
  overlayElement: React.ReactNode | null;
} {
  switch (displayStyle) {
    case 'fill-level': {
      // Fill-level: The note is an empty shell (dark outline) that fills
      // from left to right based on singing accuracy. Clear color difference
      // between filled (bright color) and unfilled (dark) portions.
      const fillColor = isGolden
        ? 'linear-gradient(90deg, rgba(251, 191, 36, 0.9), rgba(251, 191, 36, 0.6))'
        : isBonus
          ? 'linear-gradient(90deg, rgba(236, 72, 153, 0.9), rgba(236, 72, 153, 0.6))'
          : 'linear-gradient(90deg, rgba(34, 211, 238, 0.9), rgba(59, 130, 246, 0.6))';
      // NOTE: Do NOT add 'relative' here — it would override the
      // NoteBlock's 'absolute' positioning, causing notes to wander
      // vertically. 'absolute' already establishes a containing block
      // for the child overlay divs, so 'relative' is not needed.
      return {
        additionalClasses: 'overflow-hidden',
        // Override the Tailwind gradient background to show empty shell.
        // backgroundImage: 'none' clears the Tailwind bg-gradient, while
        // backgroundColor sets the dark shell base. A visible border makes
        // the empty shell clearly distinguishable from the background.
        inlineStyle: {
          backgroundImage: 'none',
          backgroundColor: 'rgba(255, 255, 255, 0.08)',
          border: '1.5px solid rgba(255, 255, 255, 0.25)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12), inset 0 -1px 0 rgba(0,0,0,0.1)',
        },
        overlayElement: (
          <>
            {/* Bright fill overlay — fills from left to right */}
            <div
              className="absolute inset-y-0 left-0"
              style={{
                width: `${accuracy * 100}%`,
                background: fillColor,
                transition: 'width 200ms ease-out',
                borderTopLeftRadius: 'inherit',
                borderBottomLeftRadius: 'inherit',
              }}
            />
          </>
        )
      };
    }

    case 'color-feedback': {
      // Color-feedback: Note background color shifts from red→orange→yellow→green
      // based on accuracy. Provides immediate visual scoring feedback.
      let bgColor: string;
      let borderColor: string;
      if (accuracy > 0.85) {
        bgColor = 'linear-gradient(90deg, #22c55e, #4ade80)'; // green
        borderColor = 'rgba(34,197,94,0.8)';
      } else if (accuracy > 0.6) {
        bgColor = 'linear-gradient(90deg, #eab308, #facc15)'; // yellow
        borderColor = 'rgba(234,179,8,0.8)';
      } else if (accuracy > 0.35) {
        bgColor = 'linear-gradient(90deg, #f97316, #fb923c)'; // orange
        borderColor = 'rgba(249,115,22,0.8)';
      } else {
        bgColor = 'linear-gradient(90deg, #ef4444, #f87171)'; // red
        borderColor = 'rgba(239,68,68,0.8)';
      }
      // Keep golden/bonus colors for special notes
      const finalBg = isGolden
        ? 'linear-gradient(90deg, #f59e0b, #fbbf24)'
        : isBonus
          ? 'linear-gradient(90deg, #ec4899, #f472b6)'
          : bgColor;
      return {
        additionalClasses: 'transition-all duration-200 ease-out',
        inlineStyle: {
          background: finalBg,
          boxShadow: `0 0 12px ${borderColor}, inset 0 1px 0 rgba(255,255,255,0.2)`,
        },
        overlayElement: null
      };
    }

    case 'glow-intensity': {
      // Glow-intensity: Notes start very pale/dim and glow brighter as the player
      // sings accurately. accuracy=0 → barely visible, accuracy=1 → vivid glow.
      const glowIntensity = 0.05 + accuracy * 0.95;
      const glowSpread1 = 2 + accuracy * 30;
      const glowSpread2 = 4 + accuracy * 60;
      const glowColor = isGolden
        ? `rgba(251, 191, 36, ${glowIntensity})`
        : isBonus
          ? `rgba(236, 72, 153, ${glowIntensity})`
          : `rgba(34, 211, 238, ${glowIntensity})`;
      // Inner glow only kicks in at higher accuracy for a satisfying reveal
      const innerGlow = accuracy > 0.4
        ? `inset 0 0 ${4 + accuracy * 16}px rgba(255,255,255,${accuracy * 0.3})`
        : 'none';
      return {
        additionalClasses: 'transition-all duration-200 ease-out',
        inlineStyle: {
          boxShadow: `${innerGlow}, 0 0 ${glowSpread1}px ${glowColor}, 0 0 ${glowSpread2}px ${glowColor}`,
          filter: `brightness(${0.4 + accuracy * 0.6})`,
        },
        overlayElement: null
      };
    }

    case 'classic':
    default:
      return {
        additionalClasses: '',
        inlineStyle: {},
        overlayElement: null
      };
  }
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
export const DEFAULT_PITCH_STATS: PitchStats = {
  minPitch: 48,
  maxPitch: 72,
  pitchRange: 24,
};

/**
 * Calculate pitch range statistics from an array of notes
 * Used to determine the vertical display range for note highway
 * 
 * @param notes - Array of notes with pitch property
 * @param padding - Semitones to add as padding (default: 2)
 * @returns PitchStats with minPitch, maxPitch, and pitchRange
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
  
  // Add padding and clamp to valid MIDI range (0-127)
  const paddedMin = Math.max(0, minPitch - padding);
  const paddedMax = Math.min(127, maxPitch + padding);
  
  return {
    minPitch: paddedMin,
    maxPitch: paddedMax,
    pitchRange: Math.max(12, paddedMax - paddedMin), // At least 1 octave
  };
}

// Game display constants — defined once, outside any component
export const SING_LINE_POSITION = 25; // percentage from left (like UltraStar/Vocaluxe)
export const NOTE_WINDOW = 4000; // Fixed 4 second window for upcoming notes
export const VISIBLE_TOP = 8; // percentage from top (padding for header)
export const VISIBLE_BOTTOM = 85; // percentage from bottom (padding for lyrics)
export const VISIBLE_RANGE = VISIBLE_BOTTOM - VISIBLE_TOP;

/**
 * Get visible notes within a time window using binary search.
 * Extracted from game-screen.tsx to eliminate triple code duplication.
 *
 * @param notes - Pre-sorted array of notes (sorted by startTime)
 * @param currentTime - Current playback time in ms
 * @param noteWindow - Time window in ms to look ahead
 * @returns Filtered array of notes visible in the current window
 */
export function getVisibleNotes(
  notes: Array<Note & { lineIndex: number; line: LyricLine }> | undefined | null,
  currentTime: number,
  noteWindow: number
): Array<Note & { lineIndex: number; line: LyricLine }> {
  if (!notes || notes.length === 0) return [];

  const windowStart = currentTime - 1000;
  const windowEnd = currentTime + noteWindow;
  const result: Array<Note & { lineIndex: number; line: LyricLine }> = [];

  // Binary search to find the first note that could be visible
  let startIdx = 0;
  let endIdx = notes.length - 1;

  while (startIdx <= endIdx) {
    const midIdx = Math.floor((startIdx + endIdx) / 2);
    if (notes[midIdx].startTime < windowStart) {
      startIdx = midIdx + 1;
    } else {
      endIdx = midIdx - 1;
    }
  }

  // Collect visible notes from the starting point
  for (let i = startIdx; i < notes.length; i++) {
    const note = notes[i];
    const noteEnd = note.startTime + note.duration;

    if (note.startTime > windowEnd) break;
    if (noteEnd >= windowStart) {
      result.push({ ...note, line: note.line });
    }
  }

  return result;
}
