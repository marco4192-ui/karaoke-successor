/**
 * Sub-hook: scoring RAF loop for Pass-the-Mic mode.
 * Evaluates pitch accuracy on each animation frame and updates player scores.
 *
 * PTM scoring: each player can earn max 2,000 points, distributed across
 * the ticks in THEIR segments. The scoring metadata (pointsPerTick) is
 * computed from the notes within the current segment only.
 */
'use client';

import { useEffect, useRef, useCallback, useMemo } from 'react';
import { Song, PitchDetectionResult, Difficulty, Note, LyricLine } from '@/types/game';
import type { PtmPlayer, PtmSegment } from './ptm-types';
import { findActiveNote, shouldSkipPitch, evaluateAndScoreTick } from '@/lib/game/party-scoring';
import { calculateScoringMetadata, type ScoringMetadata } from '@/lib/game/scoring';

/** Minimum interval (ms) between scoring evaluations to avoid excessive recalculation */
export const SCORING_THROTTLE_MS = 250;

/** Max points per player in PTM mode */
const PTM_MAX_POINTS = 2000;

interface UsePtmScoringOptions {
  phase: string;
  isPlaying: boolean;
  pitchResult: PitchDetectionResult | null;
  notesSource: Song | null;
  currentTime: number;
  difficulty: Difficulty;
  currentPlayerIndex: number;
  /** Current segments for the song */
  segments: PtmSegment[];
  /** Current segment index */
  currentSegmentIndex: number;
  /** All notes (from usePtmNoteData) — used to find segment notes */
  allNotes: Array<Note & { lineIndex: number; line: LyricLine }>;
  /** BPM for beat duration calculation */
  bpm: number | null;
  playersRef: React.RefObject<PtmPlayer[]>;
  forceRender: () => void;
}

/**
 * Extract notes that fall within a time range from a flat notes array.
 */
function getNotesInRange(
  allNotes: Array<{ startTime: number; duration: number }>,
  startTime: number,
  endTime: number,
): Array<{ duration: number; isGolden: boolean }> {
  const result: Array<{ duration: number; isGolden: boolean }> = [];
  for (const note of allNotes) {
    const noteEnd = note.startTime + note.duration;
    // Note overlaps with segment if it starts before segment end AND ends after segment start
    if (note.startTime < endTime && noteEnd > startTime) {
      result.push({ duration: note.duration, isGolden: (note as Note).isGolden ?? false });
    }
  }
  return result;
}

export function usePtmScoring({
  phase,
  isPlaying,
  pitchResult,
  notesSource,
  currentTime,
  difficulty,
  currentPlayerIndex,
  segments,
  currentSegmentIndex,
  allNotes,
  bpm,
  playersRef,
  forceRender,
}: UsePtmScoringOptions): void {
  const lastEvalTimeRef = useRef(0);

  // Separate throttle counters for different log messages.
  const noPitchLogCooldownRef = useRef(0);
  const skipPitchLogCooldownRef = useRef(0);

  // Read currentTime from a ref inside the callback to avoid recreating
  // the RAF loop ~40 times/sec (currentTime changes every frame).
  const currentTimeRef = useRef(currentTime);
  currentTimeRef.current = currentTime;

  // Compute scoring metadata from the CURRENT PLAYER's segment notes only.
  // This ensures each player can earn up to 2,000 points across THEIR ticks.
  const scoringMeta = useMemo((): ScoringMetadata | null => {
    const segment = segments[currentSegmentIndex];
    if (!segment || allNotes.length === 0) return null;
    const segmentNotes = getNotesInRange(allNotes, segment.startTime, segment.endTime);
    if (segmentNotes.length === 0) return null;
    const beatDuration = bpm ? 15000 / bpm : 500;
    return calculateScoringMetadata(segmentNotes, beatDuration, 'medium', PTM_MAX_POINTS);
  }, [segments, currentSegmentIndex, allNotes, bpm]);

  const scoreCurrentPlayer = useCallback(() => {
    const time = currentTimeRef.current;

    if (!pitchResult) {
      noPitchLogCooldownRef.current++;
      if (noPitchLogCooldownRef.current <= 1) {
        // eslint-disable-next-line no-console
        console.warn('[PTM-Scoring] scoreCurrentPlayer() called but pitchResult is null — pitch detector may not be initialized');
      }
      return;
    }
    noPitchLogCooldownRef.current = 0;

    if (shouldSkipPitch(pitchResult, difficulty)) {
      if (skipPitchLogCooldownRef.current <= 0) {
        // eslint-disable-next-line no-console
        console.warn('[PTM-Scoring] shouldSkipPitch=true:',
          !pitchResult.frequency || pitchResult.note === null ? 'no frequency/note' :
          pitchResult.volume < (difficulty === 'easy' ? 0.02 : difficulty === 'medium' ? 0.04 : 0.06)
            ? `volume too low (${pitchResult.volume?.toFixed(4)})` :
          pitchResult.isSinging === false ? 'isSinging=false (vocal detector rejected)' :
          'unknown');
      }
      skipPitchLogCooldownRef.current = 1;
      return;
    }
    skipPitchLogCooldownRef.current = 0;

    const activeNote = findActiveNote(notesSource?.lyrics, time);
    if (!activeNote) return;

    if (time - lastEvalTimeRef.current < SCORING_THROTTLE_MS) return;
    lastEvalTimeRef.current = time;

    const note = pitchResult.note;
    if (note == null) return;
    const tick = evaluateAndScoreTick(note, activeNote, difficulty, scoringMeta);
    const p = playersRef.current?.[currentPlayerIndex];
    if (!p) return;
    const idx = currentPlayerIndex;

    if (tick.hit) {
      p.score += tick.points;
      p.notesHit++;
      p.combo++;
      if (p.combo > p.maxCombo) p.maxCombo = p.combo;
    } else {
      p.combo = 0;
      p.notesMissed++;
    }

    playersRef.current[idx] = { ...p };
    forceRender();
  }, [pitchResult, notesSource, difficulty, currentPlayerIndex, scoringMeta, forceRender, playersRef]);

  // Reset log cooldowns when scoring restarts (e.g., phase or isPlaying changes)
  useEffect(() => {
    noPitchLogCooldownRef.current = 0;
    skipPitchLogCooldownRef.current = 0;
  }, [phase, isPlaying]);

  // ── Game loop: score during playing ──
  useEffect(() => {
    if (phase !== 'playing' || !isPlaying) return;
    let rafId: number;
    const loop = () => {
      scoreCurrentPlayer();
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [phase, isPlaying, scoreCurrentPlayer]);
}
