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

/** Get the pitch class (0-11) from a MIDI note number. */
function getPitchClass(midiNote: number): number {
  return ((Math.round(midiNote) % 12) + 12) % 12;
}

/**
 * Calculate the relative pitch difference between two MIDI notes.
 * Uses UltraStar-style octave wrapping: notes in the same pitch class have 0 difference.
 * Maximum difference is 6 semitones (half an octave).
 */
function getRelativePitchDiff(sungNote: number, targetNote: number): number {
  const sungClass = getPitchClass(sungNote);
  const targetClass = getPitchClass(targetNote);

  let diff = Math.abs(sungClass - targetClass);
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

  for (const note of notes) {
    const ticksInNote = Math.max(1, Math.round(note.duration / beatDuration));
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

/** Calculate points for a single tick. Golden notes receive a higher multiplier. */
export function calculateTickPoints(
  accuracy: number,
  isGolden: boolean,
  pointsPerTick: number,
): number {
  if (accuracy <= 0) return 0;

  // NOTE: noteScoreMultiplier is intentionally NOT applied here.
  // The scoring metadata (pointsPerTick) is normalized so that a perfect game
  // yields exactly MAX_POINTS_PER_SONG. Applying an additional multiplier
  // per difficulty would break this invariant and allow scores > 10000.
  // Difficulty is reflected in pitch tolerance (stricter = harder to hit notes),
  // not in score scaling.
  const multiplier = isGolden ? PERFECT_GOLDEN_MULTIPLIER : PERFECT_NOTE_MULTIPLIER;
  const points = pointsPerTick * accuracy * multiplier;

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
