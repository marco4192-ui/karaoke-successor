import {
  Difficulty,
  DIFFICULTY_SETTINGS,
} from '@/types/game';

// ===================== SCORING CONSTANTS =====================
export const MAX_POINTS_PER_SONG = 10000;

// ===================== SCORING ENHANCEMENT CONSTANTS =====================

/**
 * Power-curve exponent for accuracy scaling (< 1 = concave, forgiving).
 * Example mappings: 0.1 -> 0.25, 0.3 -> 0.52, 0.5 -> 0.66, 0.8 -> 0.87, 1.0 -> 1.0
 */
export const ACCURACY_CURVE_EXPONENT = 0.6;

// ===================== INTERFACES =====================
export interface NoteProgress {
  noteId: string;
  totalTicks: number;
  ticksHit: number;
  ticksEvaluated: number;
  isGolden: boolean;
  /** Whether this note was in a blind section when it started. */
  isBlindNote: boolean;
  lastEvaluatedTime: number;
  isComplete: boolean;
  wasPerfect: boolean;
  accumulatedPoints: number;
}

export interface ScoringMetadata {
  totalNoteTicks: number;
  goldenNoteTicks: number;
  normalNoteTicks: number;
  perfectScoreBase: number;
  pointsPerTick: number;
  /** Number of individual notes (not ticks) in this song. */
  totalNotes: number;
  /** Always 1 — no combo multiplier in simplified scoring. */
  comboMultiplier: number;
}

interface TickEvaluation {
  accuracy: number;
  isHit: boolean;
  displayType: 'Perfect' | 'Great' | 'Good' | 'Okay' | 'Miss';
}

// ===================== ACCURACY SCALING =====================

/**
 * Apply a power-curve transformation to accuracy.
 * Exponent < 1 (e.g. 0.6) makes the curve concave, meaning:
 * - Low accuracy values are boosted (e.g. 0.1 -> 0.25)
 * - High accuracy values are barely changed (e.g. 0.9 -> 0.94)
 * - Perfect accuracy (1.0) stays at 1.0
 *
 * This makes scoring more forgiving for beginners without affecting perfect play.
 */
/** @deprecated No-op in simplified scoring — returns accuracy unchanged. Kept for backward compat. */
export function scaleAccuracy(accuracy: number): number {
  return accuracy;
}

// ===================== COMBO FACTOR =====================

/** @deprecated No-op in simplified scoring — always returns 1. Kept for backward compat. */
export function getComboFactor(_combo: number, _comboMultiplier: number): number {
  return 1;
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
 * Pre-computes the point distribution for a song, normalized so that
 * a perfect game (all ticks hit with accuracy=1.0) yields exactly `maxPoints`.
 */
export function calculateScoringMetadata(
  notes: Array<{ duration: number; isGolden: boolean }>,
  beatDuration: number,
  _difficulty: Difficulty = 'medium',
  maxPoints: number = MAX_POINTS_PER_SONG,
): ScoringMetadata {
  let totalNoteTicks = 0;
  let goldenNoteTicks = 0;
  const totalNotes = notes.length;

  const safeBeatDuration = beatDuration > 0 ? beatDuration : 500;

  for (const note of notes) {
    const ticksInNote = Math.max(1, Math.round(note.duration / safeBeatDuration));
    totalNoteTicks += ticksInNote;
    if (note.isGolden) goldenNoteTicks += ticksInNote;
  }

  const normalNoteTicks = totalNoteTicks - goldenNoteTicks;
  const pointsPerTick = totalNoteTicks > 0 ? maxPoints / totalNoteTicks : 1;

  return { totalNoteTicks, goldenNoteTicks, normalNoteTicks, perfectScoreBase: totalNoteTicks, pointsPerTick, totalNotes, comboMultiplier: 1 };
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
  // Guard against NaN/Infinity pitch values — treat as a miss
  if (!Number.isFinite(sungNote)) {
    return { accuracy: 0, isHit: false, displayType: 'Miss' };
  }

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

/** Calculate points for a single tick.
 *  Each tick hit: points = accuracy * pointsPerTick, minimum 1 point.
 */
export function calculateTickPoints(
  accuracy: number,
  _isGolden: boolean,
  pointsPerTick: number,
): number {
  if (accuracy <= 0) return 0;
  return Math.max(1, Math.round(accuracy * pointsPerTick));
}

// ===================== NOTE COMPLETION BONUS =====================

/** @deprecated No completion bonus in simplified scoring. Returns 0. Kept for backward compat. */
export function calculateNoteCompletionBonus(
  _note: { totalTicks: number; isGolden: boolean },
  _scoringMeta: ScoringMetadata,
): number {
  return 0;
}

// ===================== CONSOLATION POINTS =====================

/** @deprecated No consolation points in simplified scoring. Returns 0. Kept for backward compat. */
export function calculateNoteConsolation(
  _note: { totalTicks: number; isGolden: boolean },
  _scoringMeta: ScoringMetadata,
): number {
  return 0;
}

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
