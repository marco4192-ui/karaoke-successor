'use client';

import { useEffect, useRef, useCallback, useMemo } from 'react';
import type { Song, Note, LyricLine, Difficulty } from '@/types/game';
import { findActiveNote, shouldSkipPitch, evaluateAndScoreTick } from '@/lib/game/party-scoring';
import { calculateScoringMetadata, type ScoringMetadata } from '@/lib/game/scoring';
import type { CptmPlayer, CptmSegment } from './cptm-types';
import type { CompanionPitchEntry } from './cptm-companion-polling';

// ===================== CONSTANTS =====================

/** Minimum interval (ms) between scoring evaluations to avoid excessive recalculation */
const SCORING_THROTTLE_MS = 250;

/** Max points per player in CPTM mode */
const CPTM_MAX_POINTS = 2000;

// ===================== HELPERS =====================

/** Extract notes overlapping a time range from a flat notes array. */
function getNotesInRange(
  allNotes: Array<{ startTime: number; duration: number }>,
  startTime: number,
  endTime: number,
): Array<{ duration: number; isGolden: boolean }> {
  const result: Array<{ duration: number; isGolden: boolean }> = [];
  for (const note of allNotes) {
    const noteEnd = note.startTime + note.duration;
    if (note.startTime < endTime && noteEnd > startTime) {
      result.push({ duration: note.duration, isGolden: (note as Note).isGolden ?? false });
    }
  }
  return result;
}

// ===================== HOOK PARAMS =====================

export interface CptmScoringParams {
  phase: string;
  isPlaying: boolean;
  playersRef: React.MutableRefObject<CptmPlayer[]>;
  currentPlayerIndex: number;
  companionPitchCacheRef: React.MutableRefObject<Map<string, CompanionPitchEntry>>;
  notesSource: Song | null;
  currentTime: number;
  difficulty: Difficulty;
  /** All notes from the song (for segment-scoped scoring) */
  allNotes: Array<Note & { lineIndex: number; line: LyricLine }>;
  /** Current segments */
  segments: CptmSegment[];
  /** Current segment index */
  currentSegmentIndex: number;
  /** BPM for beat duration */
  bpm: number | null;
  forceRender: () => void;
}

// ===================== HOOK =====================

/**
 * Runs a scoring RAF loop that evaluates the current player's pitch
 * (from the companion pitch cache) against active notes.
 *
 * CPTM scoring: each player can earn max 2,000 points, distributed across
 * the ticks in THEIR segments. The scoring metadata (pointsPerTick) is
 * computed from the notes within the current segment only.
 */
export function useCptmScoring(params: CptmScoringParams): void {
  const {
    phase,
    isPlaying,
    playersRef,
    currentPlayerIndex,
    companionPitchCacheRef,
    notesSource,
    currentTime,
    difficulty,
    allNotes,
    segments,
    currentSegmentIndex,
    bpm,
    forceRender,
  } = params;

  const lastEvalTimeRef = useRef(0);

  // Read currentTime from a ref inside the callback to avoid recreating
  // the RAF loop ~40 times/sec (currentTime changes every frame).
  const currentTimeRef = useRef(currentTime);
  currentTimeRef.current = currentTime;

  // Compute scoring metadata from the CURRENT PLAYER's segment notes only.
  const scoringMeta = useMemo((): ScoringMetadata | null => {
    const segment = segments[currentSegmentIndex];
    if (!segment || allNotes.length === 0) return null;
    const segmentNotes = getNotesInRange(allNotes, segment.startTime, segment.endTime);
    if (segmentNotes.length === 0) return null;
    const beatDuration = bpm ? 15000 / bpm : 500;
    return calculateScoringMetadata(segmentNotes, beatDuration, 'medium', CPTM_MAX_POINTS);
  }, [segments, currentSegmentIndex, allNotes, bpm]);

  const scoreCurrentPlayer = useCallback(() => {
    const time = currentTimeRef.current;

    const player = playersRef.current[currentPlayerIndex];
    if (!player) return;

    const cachedPitch = companionPitchCacheRef.current.get(player.id);
    if (!cachedPitch || cachedPitch.note == null) return;

    // Build a fake pitchResult from cached data.
    // IMPORTANT: Use null (not 0) as the frequency fallback so that
    // shouldSkipPitch can distinguish "no frequency data" from a valid
    // but unexpectedly-zero frequency. Using 0 would make !frequency
    // truthy and incorrectly skip scoring even when note is present.
    const pitchResult = {
      note: cachedPitch.note,
      rawNote: cachedPitch.note, // Companion pitch is not stabilized
      frequency: cachedPitch.frequency ?? null,
      clarity: cachedPitch.clarity,
      volume: cachedPitch.volume,
      isSinging: cachedPitch.isSinging,
    };

    if (shouldSkipPitch(pitchResult, difficulty)) return;

    const activeNote = findActiveNote(notesSource?.lyrics, time);
    if (!activeNote) return;

    if (time - lastEvalTimeRef.current < SCORING_THROTTLE_MS) return;
    lastEvalTimeRef.current = time;

    const note = pitchResult.note;
    if (note == null) return;
    const tick = evaluateAndScoreTick(note, activeNote, difficulty, scoringMeta);
    const p = playersRef.current[currentPlayerIndex];
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
  }, [notesSource, difficulty, currentPlayerIndex, scoringMeta, forceRender, playersRef, companionPitchCacheRef]);

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
