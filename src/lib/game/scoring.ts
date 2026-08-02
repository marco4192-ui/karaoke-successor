import {
  Difficulty,
  DIFFICULTY_SETTINGS,
} from '@/types/game';

// ===================== SCORING CONSTANTS =====================
export const MAX_POINTS_PER_SONG = 10000;

/** Fraction of max points allocated to tick-based scoring (normal notes). */
const TICK_POOL_FRACTION = 0.70;
/** Fraction of max points allocated to golden note bonus pool. */
const GOLDEN_POOL_FRACTION = 0.10;
/** Fraction of max points allocated to combo progress bar. */
const COMBO_POOL_FRACTION = 0.20;

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

/**
 * Mutable combo scoring state (persists across scoring passes).
 * Tracks note-based combo (consecutive completed notes) and the
 * combo progress bar toward `comboPoolMaxPoints`.
 */
export interface ComboScoringState {
  /** Current consecutive notes completed (for multiplier lookup). */
  comboNotes: number;
  /** Maximum consecutive notes completed. */
  maxComboNotes: number;
  /** Sum of combo multipliers earned so far. */
  earnedProgress: number;
  /** Last computed combo score (for delta calculation). */
  lastComboScore: number;
}

/** Create a fresh ComboScoringState. */
export function createComboScoringState(): ComboScoringState {
  return { comboNotes: 0, maxComboNotes: 0, earnedProgress: 0, lastComboScore: 0 };
}

export interface ScoringMetadata {
  totalNoteTicks: number;
  goldenNoteTicks: number;
  normalNoteTicks: number;
  totalNotes: number;

  /** Points per tick for normal notes (from tick pool). */
  pointsPerTick: number;
  /** Points per tick for golden notes (tick pool base + golden bonus pool). */
  goldenPointsPerTick: number;

  /** Whether the full scoring split (tick/golden/combo) is active. */
  isFullScoring: boolean;

  /** Maximum combo bonus points (2,000 for full scoring, 0 for party modes). */
  comboPoolMaxPoints: number;
  /**
   * Pre-calculated max combo progress for perfect play.
   * Sum of all combo multipliers if every note is completed in sequence.
   * Used to normalize the combo progress bar.
   */
  maxComboProgress: number;
}

interface TickEvaluation {
  accuracy: number;
  isHit: boolean;
  displayType: 'Perfect' | 'Great' | 'Good' | 'Okay' | 'Miss';
}

// ===================== ACCURACY SCALING =====================

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
  let diff = Math.abs(sungNote - targetNote) % 12;
  if (diff > 6) diff = 12 - diff;
  return diff;
}

// ===================== COMBO SYSTEM =====================

/**
 * Calculate the combo multiplier based on consecutive completed notes.
 * Increases by 0.25× every 5 notes, from 1× (0–4) to 2× (20+).
 */
export function calculateComboMultiplier(comboNotes: number): number {
  if (comboNotes < 5) return 1;
  if (comboNotes < 10) return 1.25;
  if (comboNotes < 15) return 1.5;
  if (comboNotes < 20) return 1.75;
  return 2;
}

/**
 * Determine whether a note counts as "completed" for combo purposes.
 * The tolerance varies by difficulty:
 * - Easy: up to 2 missed ticks allowed
 * - Medium: up to 1 missed tick allowed
 * - Hard: every tick must be hit
 */
export function isNoteCompleteForCombo(
  ticksHit: number,
  totalTicks: number,
  difficulty: Difficulty,
): boolean {
  const missed = totalTicks - ticksHit;
  if (difficulty === 'easy') return missed <= 2;
  if (difficulty === 'medium') return missed <= 1;
  return missed <= 0; // hard
}

// ===================== SCORING METADATA =====================

/**
 * Calculate scoring metadata for duration-based scoring.
 *
 * **Full scoring mode** (maxPoints = 10,000):
 * - 70% tick pool (shared across all notes)
 * - 10% golden bonus pool (extra for golden notes, redistributed to ticks if none)
 * - 20% combo progress bar
 *
 * **Party/simple mode** (maxPoints ≠ 10,000):
 * - All points in tick pool with golden 2× weighting (old behavior)
 * - No combo scoring
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

  const isFullScoring = maxPoints === MAX_POINTS_PER_SONG;

  if (isFullScoring) {
    // Full scoring: 70% tick pool + 10% golden pool + 20% combo pool
    const hasGoldenNotes = goldenNoteTicks > 0;
    const tickPoolMax = hasGoldenNotes ? maxPoints * TICK_POOL_FRACTION : maxPoints * (TICK_POOL_FRACTION + GOLDEN_POOL_FRACTION);
    const goldenPoolMax = hasGoldenNotes ? maxPoints * GOLDEN_POOL_FRACTION : 0;
    const comboPoolMax = maxPoints * COMBO_POOL_FRACTION;

    const pointsPerTick = totalNoteTicks > 0 ? tickPoolMax / totalNoteTicks : 1;
    const goldenBonusPerTick = goldenNoteTicks > 0 ? goldenPoolMax / goldenNoteTicks : 0;
    const goldenPointsPerTick = pointsPerTick + goldenBonusPerTick;

    // Pre-calculate max combo progress (sum of multipliers for perfect play)
    let maxComboProgress = 0;
    for (let i = 1; i <= totalNotes; i++) {
      maxComboProgress += calculateComboMultiplier(i);
    }

    return {
      totalNoteTicks,
      goldenNoteTicks,
      normalNoteTicks,
      totalNotes,
      pointsPerTick,
      goldenPointsPerTick,
      isFullScoring,
      comboPoolMaxPoints: comboPoolMax,
      maxComboProgress,
    };
  }

  // Party/simple mode: all points in tick pool, golden 2×
  const effectiveTotalTicks = normalNoteTicks + goldenNoteTicks * 2;
  const basePointsPerTick = effectiveTotalTicks > 0 ? maxPoints / effectiveTotalTicks : 1;

  return {
    totalNoteTicks,
    goldenNoteTicks,
    normalNoteTicks,
    totalNotes,
    pointsPerTick: basePointsPerTick,
    goldenPointsPerTick: basePointsPerTick * 2,
    isFullScoring: false,
    comboPoolMaxPoints: 0,
    maxComboProgress: 0,
  };
}

// ===================== TICK-BASED SCORING =====================

/**
 * Evaluate a single tick during note playback.
 */
export function evaluateTick(
  sungNote: number,
  targetNote: number,
  difficulty: Difficulty
): TickEvaluation {
  if (!Number.isFinite(sungNote)) {
    return { accuracy: 0, isHit: false, displayType: 'Miss' };
  }

  const settings = DIFFICULTY_SETTINGS[difficulty];
  const relativeDiff = getRelativePitchDiff(sungNote, targetNote);
  const effectiveTolerance = settings.pitchTolerance;

  if (relativeDiff > effectiveTolerance) {
    return { accuracy: 0, isHit: false, displayType: 'Miss' };
  }

  const accuracy = effectiveTolerance > 0
    ? 1 - (relativeDiff / effectiveTolerance)
    : (relativeDiff === 0 ? 1 : 0);

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

/**
 * Calculate points for a single tick.
 *  Points = accuracy * pointsPerTick, minimum 1 point.
 *  The caller passes the correct pointsPerTick value
 *  (use goldenPointsPerTick for golden notes when available).
 */
export function calculateTickPoints(
  accuracy: number,
  _isGolden: boolean,
  pointsPerTick: number,
): number {
  if (accuracy <= 0) return 0;
  return Math.max(1, Math.round(accuracy * pointsPerTick));
}

// ===================== DEPRECATED (kept for backward compat) =====================

/** @deprecated */
export function calculateNoteCompletionBonus(
  _note: { totalTicks: number; isGolden: boolean },
  _scoringMeta: ScoringMetadata,
): number {
  return 0;
}

/** @deprecated */
export function calculateNoteConsolation(
  _note: { totalTicks: number; isGolden: boolean },
  _scoringMeta: ScoringMetadata,
): number {
  return 0;
}

/**
 * Estimate the number of "perfect" notes from overall hit count and rating.
 * Used as a fallback when per-note quality data is unavailable.
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
