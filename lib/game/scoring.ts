import {
  Difficulty,
  DIFFICULTY_SETTINGS,
} from '@/types/game';

// ===================== SCORING CONSTANTS =====================
export const MAX_POINTS_PER_SONG = 10000;
const PERFECT_NOTE_MULTIPLIER = 2;
const PERFECT_GOLDEN_MULTIPLIER = 10;

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

interface TickEvaluation {
  accuracy: number;
  isHit: boolean;
  displayType: 'Perfect' | 'Great' | 'Good' | 'Okay' | 'Miss';
}

// ===================== PITCH UTILITIES =====================

/**
 * Calculate the relative pitch difference between two MIDI notes using
 * continuous (non-quantized) values for sub-semitone accuracy.
 * Uses UltraStar-style octave wrapping: notes in the same pitch class have 0 difference.
 * Maximum difference is 6 semitones (half an octave).
 */
function getRelativePitchDiff(sungNote: number, targetNote: number): number {
  // Use continuous MIDI values instead of quantized pitch classes.
  // This gives sub-semitone precision (e.g., 0.3 semitones off instead of 0 or 1).
  let diff = Math.abs(sungNote - targetNote) % 12;
  if (diff > 6) diff = 12 - diff;
  return diff;
}

// ===================== SCORING METADATA =====================
/**
 * Calculate scoring metadata for duration-based scoring.
 * Pre-computes the point distribution for a song.
 */
export function calculateScoringMetadata(
  notes: Array<{ duration: number; isGolden: boolean }>,
  beatDuration: number
): ScoringMetadata {
  let totalNoteTicks = 0;
  let goldenNoteTicks = 0;

  // Guard against division by zero — if BPM is 0 or missing, fall back to
  // ~120 BPM (500ms per beat) so scoring still works for malformed songs.
  const safeBeatDuration = beatDuration > 0 ? beatDuration : 500;

  for (const note of notes) {
    const ticksInNote = Math.max(1, Math.round(note.duration / safeBeatDuration));
    totalNoteTicks += ticksInNote;
    if (note.isGolden) goldenNoteTicks += ticksInNote;
  }

  const normalNoteTicks = totalNoteTicks - goldenNoteTicks;
  const perfectScoreBase = (normalNoteTicks * PERFECT_NOTE_MULTIPLIER) + (goldenNoteTicks * PERFECT_GOLDEN_MULTIPLIER);
  const pointsPerTick = perfectScoreBase > 0 ? MAX_POINTS_PER_SONG / perfectScoreBase : 1;

  return { totalNoteTicks, goldenNoteTicks, normalNoteTicks, perfectScoreBase, pointsPerTick };
}

// ===================== TICK-BASED SCORING =====================
/**
 * Evaluate a single tick during note playback.
 * Used for duration-based scoring where notes are evaluated continuously.
 */
export function evaluateTick(
  sungNote: number,
  targetNote: number,
  difficulty: Difficulty
): TickEvaluation {
  const settings = DIFFICULTY_SETTINGS[difficulty];
  const relativeDiff = getRelativePitchDiff(sungNote, targetNote);
  const effectiveTolerance = settings.pitchTolerance;

  if (relativeDiff > effectiveTolerance) {
    return { accuracy: 0, isHit: false, displayType: 'Miss' };
  }

  // Normalize accuracy to 0-1 range within the tolerance window.
  // Uses (effectiveTolerance) as denominator so that being exactly on-pitch
  // yields accuracy=1.0 and being at the edge of tolerance yields accuracy=0.
  const accuracy = effectiveTolerance > 0
    ? 1 - (relativeDiff / effectiveTolerance)
    : (relativeDiff === 0 ? 1 : 0);

  // Use difficulty-specific evaluation thresholds.
  // On Easy: being in-tolerance is already an achievement, so thresholds are relaxed.
  // On Hard: precision matters, thresholds are tighter.
  const thresholds = {
    perfect: settings.perfectThreshold ?? 0.95,
    great: settings.greatThreshold ?? 0.8,
    good: settings.goodThreshold ?? 0.6,
    okay: settings.okayThreshold ?? 0.4,
  };

  let displayType: 'Perfect' | 'Great' | 'Good' | 'Okay' | 'Miss' = 'Miss';

  if (accuracy > thresholds.perfect) displayType = 'Perfect';
  else if (accuracy > thresholds.great) displayType = 'Great';
  else if (accuracy > thresholds.good) displayType = 'Good';
  else if (accuracy > thresholds.okay) displayType = 'Okay';

  return { accuracy, isHit: true, displayType };
}

/** Calculate points for a single tick. Golden notes receive a higher weight.
 *  The per-tick base (pointsPerTick) is pre-normalized in calculateScoringMetadata
 *  so that a perfect game yields exactly MAX_POINTS_PER_SONG. The golden/normal
 *  weight is already factored into that normalization — multiplying again here
 *  preserves the 10 000 invariant.
 */
export function calculateTickPoints(
  accuracy: number,
  isGolden: boolean,
  pointsPerTick: number,
): number {
  if (accuracy <= 0) return 0;

  const weight = isGolden ? PERFECT_GOLDEN_MULTIPLIER : PERFECT_NOTE_MULTIPLIER;
  const points = pointsPerTick * accuracy * weight;

  return points;
}

/**
 * NOTE: calculateNoteCompletionBonus has been REMOVED.
 *
 * The old implementation added extra points when all ticks in a note were hit,
 * but these bonus points were NOT accounted for in the scoring normalization
 * (calculateScoringMetadata). This caused scores to exceed MAX_POINTS_PER_SONG
 * on perfect games (~15000 instead of 10000).
 *
 * The tick-based scoring already rewards perfect accuracy through higher accuracy
 * values (more points per tick when pitch is closer to target), so a separate
 * completion bonus is redundant and mathematically incorrect.
 */

/**
 * Estimate the number of "perfect" notes from overall hit count and rating.
 * Used as a fallback when per-note quality data is unavailable (e.g. tournament
 * results built without the main game loop's tick-by-tick tracking).
 *
 * The ratio reflects how many of the hit notes were likely rated "Perfect"
 * (accuracy > 95%) given the overall rating band.
 */
export function estimatePerfectNotes(notesHit: number, rating: string): number {
  if (notesHit <= 0) return 0;
  const ratio = rating === 'perfect' ? 0.85
    : rating === 'excellent' ? 0.55
    : rating === 'good' ? 0.25
    : rating === 'okay' ? 0.08
    : 0.02;
  return Math.floor(notesHit * ratio);
}
