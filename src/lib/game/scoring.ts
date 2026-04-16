import {
  Note,
  Player,
  Difficulty,
  DIFFICULTY_SETTINGS,
  SCORE_VALUES,
  frequencyToMidi,
} from '@/types/game';

// ===================== SCORING CONSTANTS =====================
export const MAX_POINTS_PER_SONG = 10000;
/** @internal Dead export — not used outside this file. Kept for reference. */
export const SCORING_TICK_INTERVAL = 100;
/** @internal Dead export — only used internally by calculateScoringMetadata and calculateTickPoints. */
export const GOLDEN_NOTE_MULTIPLIER = 5;
/** @internal Dead export — only used internally by calculateScoringMetadata. */
export const PERFECT_NOTE_MULTIPLIER = 2;
/** @internal Dead export — only used internally by calculateScoringMetadata. */
export const PERFECT_GOLDEN_MULTIPLIER = 10;

// ===================== INTERFACES =====================
export interface NoteProgress {
  noteId: string;
  totalTicks: number;
  ticksHit: number;
  ticksEvaluated: number;
  isGolden: boolean;
  lastEvaluatedTime: number;
  isComplete: boolean;
  wasPerfect: boolean;
}

export interface ScoringMetadata {
  totalNoteTicks: number;
  goldenNoteTicks: number;
  normalNoteTicks: number;
  perfectScoreBase: number;
  pointsPerTick: number;
}

/** @internal Dead export — only used internally by evaluateTick return type. */
export interface TickEvaluation {
  accuracy: number;
  isHit: boolean;
  displayType: 'Perfect' | 'Great' | 'Good' | 'Okay' | 'Miss';
}

// ===================== PITCH UTILITIES =====================
/**
 * @internal Dead export — only used internally by getRelativePitchDiff.
 *
 * Get the pitch class (0-11) from a MIDI note number.
 * Pitch class represents the note name regardless of octave (C=0, C#=1, ... B=11)
 * IMPORTANT: Rounds to nearest integer before computing pitch class
 */
export function getPitchClass(midiNote: number): number {
  return ((Math.round(midiNote) % 12) + 12) % 12;
}

/**
 * @internal Dead export — only used internally by evaluateTick.
 *
 * Calculate the relative pitch difference between two MIDI notes.
 * Uses UltraStar-style octave wrapping: notes in the same pitch class have 0 difference.
 * Maximum difference is 6 semitones (half an octave)
 */
export function getRelativePitchDiff(sungNote: number, targetNote: number): number {
  const sungClass = getPitchClass(sungNote);
  const targetClass = getPitchClass(targetNote);
  
  // Calculate the shortest distance on the pitch class circle
  let diff = Math.abs(sungClass - targetClass);
  if (diff > 6) {
    diff = 12 - diff;
  }
  
  return diff;
}

// ===================== SCORING METADATA =====================
/**
 * Calculate scoring metadata for duration-based scoring
 * This pre-computes the point distribution for a song
 */
export function calculateScoringMetadata(
  notes: Array<{ duration: number; isGolden: boolean }>,
  beatDuration: number
): ScoringMetadata {
  let totalNoteTicks = 0;
  let goldenNoteTicks = 0;
  
  for (const note of notes) {
    const ticksInNote = Math.max(1, Math.round(note.duration / beatDuration));
    totalNoteTicks += ticksInNote;
    if (note.isGolden) {
      goldenNoteTicks += ticksInNote;
    }
  }
  
  const normalNoteTicks = totalNoteTicks - goldenNoteTicks;
  const perfectScoreBase = (normalNoteTicks * PERFECT_NOTE_MULTIPLIER) + (goldenNoteTicks * PERFECT_GOLDEN_MULTIPLIER);
  const pointsPerTick = perfectScoreBase > 0 ? MAX_POINTS_PER_SONG / perfectScoreBase : 1;
  
  return { totalNoteTicks, goldenNoteTicks, normalNoteTicks, perfectScoreBase, pointsPerTick };
}

// ===================== TICK-BASED SCORING =====================
/**
 * Evaluate a single tick during note playback
 * Used for duration-based scoring where notes are evaluated continuously
 */
export function evaluateTick(
  sungNote: number,
  targetNote: number,
  difficulty: Difficulty
): TickEvaluation {
  const settings = DIFFICULTY_SETTINGS[difficulty];
  const relativeDiff = getRelativePitchDiff(sungNote, targetNote);
  const effectiveTolerance = difficulty === 'hard' ? 0 : settings.pitchTolerance;
  
  if (relativeDiff > effectiveTolerance) {
    return { accuracy: 0, isHit: false, displayType: 'Miss' };
  }
  
  const accuracy = 1 - (relativeDiff / (effectiveTolerance + 1));
  
  let displayType: 'Perfect' | 'Great' | 'Good' | 'Okay' | 'Miss' = 'Miss';
  
  if (accuracy > 0.95) {
    displayType = 'Perfect';
  } else if (accuracy > 0.8) {
    displayType = 'Great';
  } else if (accuracy > 0.6) {
    displayType = 'Good';
  } else if (accuracy > 0.4) {
    displayType = 'Okay';
  }
  
  return { accuracy, isHit: true, displayType };
}

/**
 * Calculate points for a single tick
 */
export function calculateTickPoints(
  accuracy: number,
  isGolden: boolean,
  pointsPerTick: number,
  difficulty: Difficulty
): number {
  if (accuracy <= 0) return 0;
  
  const settings = DIFFICULTY_SETTINGS[difficulty];
  let points = pointsPerTick * accuracy * settings.noteScoreMultiplier;
  
  if (isGolden) {
    points *= GOLDEN_NOTE_MULTIPLIER;
  }
  
  return points;
}

/**
 * Calculate bonus points for completing a note
 */
export function calculateNoteCompletionBonus(
  noteProgress: NoteProgress,
  pointsPerTick: number
): number {
  if (noteProgress.ticksHit < noteProgress.totalTicks) {
    return 0;
  }
  
  const basePoints = noteProgress.totalTicks * pointsPerTick;
  
  if (noteProgress.isGolden) {
    return basePoints * GOLDEN_NOTE_MULTIPLIER;
  } else {
    return basePoints;
  }
}

// ===================== RATING HELPERS =====================
/** @internal Dead export — not used anywhere in the codebase. Rating logic is done inline in results screen. */
export function calculateFinalRating(accuracy: number): 'perfect' | 'excellent' | 'good' | 'okay' | 'poor' {
  if (accuracy >= 95) return 'perfect';
  if (accuracy >= 85) return 'excellent';
  if (accuracy >= 70) return 'good';
  if (accuracy >= 50) return 'okay';
  return 'poor';
}

/** @internal Dead export — not used anywhere in the codebase. Rating colors are defined inline in components. */
export function getRatingColor(rating: 'perfect' | 'good' | 'okay' | 'miss'): string {
  switch (rating) {
    case 'perfect':
      return '#FFD700'; // Gold
    case 'good':
      return '#4ADE80'; // Green
    case 'okay':
      return '#FBBF24'; // Yellow
    case 'miss':
      return '#EF4444'; // Red
    default:
      return '#FFFFFF';
  }
}

/** @internal Dead export — not used anywhere in the codebase. Rating text is defined inline in components. */
export function getRatingText(rating: 'perfect' | 'good' | 'okay' | 'miss'): string {
  switch (rating) {
    case 'perfect':
      return 'PERFECT!';
    case 'good':
      return 'GOOD!';
    case 'okay':
      return 'OKAY';
    case 'miss':
      return 'MISS';
    default:
      return '';
  }
}
