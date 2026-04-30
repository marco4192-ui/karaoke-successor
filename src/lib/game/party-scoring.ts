/**
 * Shared scoring utilities for party game modes.
 *
 * Centralizes the duplicated evaluateTick → calculateTickPoints → apply-score
 * pattern used across ptm-game-screen, companion-singalong-screen, pass-the-mic-screen,
 * medley-game-screen, and battle-royale-game.
 *
 * Each game mode retains its own loop / timing / player-update strategy.
 * These are pure functions — no React hooks, no side effects.
 */

import { Note, LyricLine, Difficulty, DIFFICULTY_SETTINGS } from '@/types/game';
import {
  evaluateTick,
  calculateTickPoints,
  ScoringMetadata,
} from './scoring';

// ===================== TYPES =====================

/** Minimal pitch input expected by the scoring functions. */
interface PitchInput {
  note: number | null;
  frequency: number | null;
  volume: number;
  isSinging?: boolean;
}

/** Result of scoring a single tick against a note. */
interface TickScoreResult {
  hit: boolean;
  points: number;
  accuracy: number;
  displayType: 'Perfect' | 'Great' | 'Good' | 'Okay' | 'Miss';
}

/** A note with enough data for scoring (pitch, timing, golden flag). */
type ScorableNote = Pick<Note, 'pitch' | 'startTime' | 'duration' | 'isGolden'>;

// ===================== NOTE FINDING =====================

/**
 * Find the first note currently active at `currentTime` within a lyrics array.
 * Returns `null` if no note is active.
 */
export function findActiveNote(
  lyrics: LyricLine[] | null | undefined,
  currentTime: number,
): ScorableNote | null {
  if (!lyrics) return null;

  for (const line of lyrics) {
    for (const note of line.notes) {
      const noteEnd = note.startTime + note.duration;
      if (currentTime >= note.startTime && currentTime <= noteEnd) {
        return note;
      }
    }
  }

  return null;
}

/**
 * Find the first active note in a flat (pre-flattened) notes array.
 * Used by medley mode which stores notes flat instead of nested in lyrics.
 */
export function findActiveNoteFlat(
  notes: ScorableNote[] | null | undefined,
  currentTime: number,
): ScorableNote | null {
  if (!notes) return null;

  for (const note of notes) {
    const noteEnd = note.startTime + note.duration;
    if (currentTime >= note.startTime && currentTime <= noteEnd) {
      return note;
    }
  }

  return null;
}

// ===================== PRE-SCORING CHECKS =====================

/**
 * Check whether pitch input is valid for scoring.
 * Returns `true` if the pitch should be skipped (invalid / too quiet / humming).
 */
export function shouldSkipPitch(
  pitch: PitchInput,
  difficulty: Difficulty,
): boolean {
  if (!pitch.frequency || pitch.note === null) return true;
  const diffSettings = DIFFICULTY_SETTINGS[difficulty];
  if (pitch.volume < diffSettings.volumeThreshold) return true;
  if (pitch.isSinging === false) return true; // humming / noise detected
  return false;
}

// ===================== SCORING =====================

/**
 * Evaluate a single tick: pitch vs note target.
 * Combines `evaluateTick` + `calculateTickPoints` with an optional fallback
 * when no `scoringMetadata` is available.
 *
 * @returns A `TickScoreResult` with hit/points/accuracy/displayType.
 */
export function evaluateAndScoreTick(
  pitchNote: number,
  note: ScorableNote,
  difficulty: Difficulty,
  scoringMeta?: ScoringMetadata | null,
): TickScoreResult {
  const result = evaluateTick(pitchNote, note.pitch, difficulty);

  if (!result.isHit) {
    return { hit: false, points: 0, accuracy: result.accuracy, displayType: result.displayType };
  }

  let tickPts: number;
  if (scoringMeta) {
    tickPts = calculateTickPoints(result.accuracy, note.isGolden, scoringMeta.pointsPerTick);
  } else {
    // Fallback when no scoring metadata is available (e.g. missing BPM).
    // Cap at 3 points per tick to prevent scores from exceeding MAX_POINTS_PER_SONG
    // on long songs. Without normalization, accuracy*10 could yield 20000+ on songs
    // with 2000+ ticks.
    tickPts = Math.min(result.accuracy * 10, 3);
  }

  const points = Math.max(1, Math.round(tickPts));

  return { hit: true, points, accuracy: result.accuracy, displayType: result.displayType };
}
