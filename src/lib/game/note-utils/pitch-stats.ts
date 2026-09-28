/**
 * Pitch math: vertical position, display constants and pitch statistics
 * for the note display range.
 *
 * R13: moved byte-identically from src/lib/game/note-utils.tsx.
 */

// Note display constants
export const NOTE_HEIGHT = 52;
export const PITCH_RANGE = 24;
export const BASE_PITCH = 48; // C3 - lowest pitch to display

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
  isRap?: boolean;
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
