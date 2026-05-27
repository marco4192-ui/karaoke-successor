import {
  Difficulty,
  DIFFICULTY_SETTINGS,
} from '@/types/game';

// ===================== SCORING CONSTANTS =====================
export const MAX_POINTS_PER_SONG = 10000;
const PERFECT_NOTE_MULTIPLIER = 2;
const PERFECT_GOLDEN_MULTIPLIER = 10;

// ===================== SCORING ENHANCEMENT CONSTANTS =====================

/**
 * Power-curve exponent for accuracy scaling (< 1 = concave, forgiving).
 * Example mappings: 0.1 -> 0.25, 0.3 -> 0.52, 0.5 -> 0.66, 0.8 -> 0.87, 1.0 -> 1.0
 */
export const ACCURACY_CURVE_EXPONENT = 0.6;

/** Bonus ratio for completing every tick in a note (normalized into max score). */
const COMPLETION_BONUS_RATIO = 0.15;

/**
 * Number of consecutive hits needed to reach the full difficulty combo multiplier.
 * The combo factor ramps linearly from 1.0 at combo=0 to `comboMultiplier` at combo=50.
 */
const COMBO_RAMP_TICKS = 50;

/**
 * Fraction of a note's max points awarded when the singer attempted the note
 * (at least 1 tick evaluated) but missed every single tick.
 */
const CONSOLATION_RATIO = 0.10;

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
  /** Combo multiplier for the current difficulty (Easy=1.5, Medium=2.0, Hard=2.5). */
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
export function scaleAccuracy(accuracy: number): number {
  if (accuracy <= 0) return 0;
  if (accuracy >= 1) return 1;
  return Math.pow(accuracy, ACCURACY_CURVE_EXPONENT);
}

// ===================== COMBO FACTOR =====================

/**
 * Calculate the combo factor for the current combo count.
 * Ramps linearly from 1.0 (combo=0) to `comboMultiplier` (combo >= COMBO_RAMP_TICKS).
 *
 * Examples (Medium, comboMultiplier=2.0):
 *   combo=0  -> 1.0   (no bonus)
 *   combo=25 -> 1.5   (50% of max bonus)
 *   combo=50 -> 2.0   (full bonus)
 *   combo=100-> 2.0   (capped)
 */
export function getComboFactor(combo: number, comboMultiplier: number): number {
  return 1 + (comboMultiplier - 1) * Math.min(1, combo / COMBO_RAMP_TICKS);
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
 * a perfect game (all ticks hit with accuracy=1.0, max combo, all notes completed)
 * yields exactly MAX_POINTS_PER_SONG.
 */
export function calculateScoringMetadata(
  notes: Array<{ duration: number; isGolden: boolean }>,
  beatDuration: number,
  difficulty: Difficulty = 'medium',
): ScoringMetadata {
  let totalNoteTicks = 0;
  let goldenNoteTicks = 0;
  const totalNotes = notes.length;

  // Guard against division by zero — if BPM is 0 or missing, fall back to
  // ~120 BPM (500ms per beat) so scoring still works for malformed songs.
  const safeBeatDuration = beatDuration > 0 ? beatDuration : 500;

  for (const note of notes) {
    const ticksInNote = Math.max(1, Math.round(note.duration / safeBeatDuration));
    totalNoteTicks += ticksInNote;
    if (note.isGolden) goldenNoteTicks += ticksInNote;
  }

  const normalNoteTicks = totalNoteTicks - goldenNoteTicks;
  const baseWeight = (normalNoteTicks * PERFECT_NOTE_MULTIPLIER) + (goldenNoteTicks * PERFECT_GOLDEN_MULTIPLIER);

  // Get combo multiplier for this difficulty
  const settings = DIFFICULTY_SETTINGS[difficulty];
  const comboMultiplier = settings.comboMultiplier;

  // Calculate the normalized average combo factor for a perfect game.
  // In a perfect game, combo goes from 1 to totalNoteTicks.
  // sum(getComboFactor(i, cm) for i=1..N) = N + (cm-1)/RAMP * N*(N+1)/2
  // So comboNormFactor = sum / N = 1 + (cm-1)*(N+1)/(2*RAMP)
  let comboNormFactor: number;
  if (totalNoteTicks <= 0) {
    comboNormFactor = 1;
  } else if (totalNoteTicks <= COMBO_RAMP_TICKS) {
    comboNormFactor = 1 + (comboMultiplier - 1) * (totalNoteTicks + 1) / (2 * COMBO_RAMP_TICKS);
  } else {
    // Long song: first RAMP ticks ramp, rest are at full multiplier.
    const rampSum = COMBO_RAMP_TICKS + (comboMultiplier - 1) * COMBO_RAMP_TICKS * (COMBO_RAMP_TICKS + 1) / (2 * COMBO_RAMP_TICKS);
    const fullSum = (totalNoteTicks - COMBO_RAMP_TICKS) * comboMultiplier;
    comboNormFactor = (rampSum + fullSum) / totalNoteTicks;
  }

  // Perfect score base: the weighted sum of all tick-points with combo normalization.
  const perfectScoreBase = baseWeight * comboNormFactor;

  // Completion bonus pool: every note completed perfectly gives an extra bonus.
  // Total bonus in a perfect game = baseWeight * COMPLETION_BONUS_RATIO
  const completionBonusPool = baseWeight * COMPLETION_BONUS_RATIO;

  // Normalize: pointsPerTick so that tick points + completion bonus = 10,000 for perfect play.
  const pointsPerTick = (perfectScoreBase + completionBonusPool) > 0
    ? MAX_POINTS_PER_SONG / (perfectScoreBase + completionBonusPool)
    : 1;

  return { totalNoteTicks, goldenNoteTicks, normalNoteTicks, perfectScoreBase: baseWeight, pointsPerTick, totalNotes, comboMultiplier };
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
 *  Applies the power-curve accuracy scaling (scaleAccuracy) so that low-accuracy
 *  hits are rewarded more generously than a linear scale would.
 *
 *  The per-tick base (pointsPerTick) is pre-normalized in calculateScoringMetadata
 *  so that a perfect game yields exactly MAX_POINTS_PER_SONG.
 */
export function calculateTickPoints(
  accuracy: number,
  isGolden: boolean,
  pointsPerTick: number,
): number {
  if (accuracy <= 0) return 0;

  const scaledAccuracy = scaleAccuracy(accuracy);
  const weight = isGolden ? PERFECT_GOLDEN_MULTIPLIER : PERFECT_NOTE_MULTIPLIER;
  const points = pointsPerTick * scaledAccuracy * weight;

  return points;
}

// ===================== NOTE COMPLETION BONUS =====================

/**
 * Calculate the completion bonus for a note that was hit on every single tick.
 * The bonus is 15% of the note's maximum possible tick-point total.
 * This is normalized into the scoring metadata so perfect play still = 10,000.
 */
export function calculateNoteCompletionBonus(
  note: { totalTicks: number; isGolden: boolean },
  scoringMeta: ScoringMetadata,
): number {
  const weight = note.isGolden ? PERFECT_GOLDEN_MULTIPLIER : PERFECT_NOTE_MULTIPLIER;
  const noteMaxPoints = note.totalTicks * scoringMeta.pointsPerTick * weight;
  return Math.round(noteMaxPoints * COMPLETION_BONUS_RATIO);
}

// ===================== CONSOLATION POINTS =====================

/**
 * Calculate consolation points for a note that was attempted (at least 1 tick
 * evaluated) but every tick was a miss. Awards 10% of the note's max points
 * to soften the "all or nothing" feel.
 *
 * NOT normalized — this is "free" points that only help struggling players
 * and can never push a perfect game above 10,000 (since no notes are missed
 * in a perfect game).
 */
export function calculateNoteConsolation(
  note: { totalTicks: number; isGolden: boolean },
  scoringMeta: ScoringMetadata,
): number {
  const weight = note.isGolden ? PERFECT_GOLDEN_MULTIPLIER : PERFECT_NOTE_MULTIPLIER;
  const noteMaxPoints = note.totalTicks * scoringMeta.pointsPerTick * weight;
  return Math.max(1, Math.round(noteMaxPoints * CONSOLATION_RATIO));
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
