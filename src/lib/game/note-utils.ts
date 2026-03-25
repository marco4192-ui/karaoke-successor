import React from 'react';

// Note shape style type
export type NoteShapeStyle = 'rounded' | 'sharp' | 'pill' | 'diamond';

// Note display constants
export const NOTE_HEIGHT = 52;
export const PITCH_RANGE = 24;
export const BASE_PITCH = 48; // C3 - lowest pitch to display

/**
 * Get note shape classes based on theme setting
 * Used by both NoteLane and GameScreen components
 */
export function getNoteShapeClasses(noteStyle: NoteShapeStyle): {
  baseClass: string;
  activeClass: string;
  style: React.CSSProperties;
} {
  switch (noteStyle) {
    case 'sharp':
      return {
        baseClass: 'rounded-none',
        activeClass: 'ring-2 ring-white/80',
        style: { clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)' }
      };
    case 'pill':
      return {
        baseClass: 'rounded-full',
        activeClass: 'ring-2 ring-white/60 ring-offset-1',
        style: { borderRadius: '9999px' }
      };
    case 'diamond':
      return {
        baseClass: 'rounded-sm',
        activeClass: 'ring-2 ring-white/80',
        style: { clipPath: 'polygon(15% 50%, 50% 0, 85% 50%, 50% 100%)' }
      };
    case 'rounded':
    default:
      return {
        baseClass: 'rounded-md',
        activeClass: 'ring-2 ring-white/80 brightness-125',
        style: {}
      };
  }
}

/**
 * Get note shape classes for active note with larger scale
 * Used specifically in NoteLane for active notes
 */
export function getNoteShapeClassesForLane(noteStyle: NoteShapeStyle): {
  baseClass: string;
  activeClass: string;
  style: React.CSSProperties;
} {
  switch (noteStyle) {
    case 'sharp':
      return {
        baseClass: 'rounded-none',
        activeClass: 'ring-4 ring-white ring-offset-2 ring-offset-transparent scale-125',
        style: { clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)' }
      };
    case 'pill':
      return {
        baseClass: 'rounded-full',
        activeClass: 'ring-4 ring-white ring-offset-2 ring-offset-transparent scale-125',
        style: { borderRadius: '9999px' }
      };
    case 'diamond':
      return {
        baseClass: 'rounded-sm',
        activeClass: 'ring-4 ring-white ring-offset-2 ring-offset-transparent scale-125',
        style: { clipPath: 'polygon(15% 50%, 50% 0, 85% 50%, 50% 100%)' }
      };
    case 'rounded':
    default:
      return {
        baseClass: 'rounded-xl',
        activeClass: 'ring-4 ring-white ring-offset-2 ring-offset-transparent scale-125',
        style: {}
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
