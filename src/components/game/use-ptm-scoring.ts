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
import { calculateScoringMetadata, evaluateTick, type ScoringMetadata } from '@/lib/game/scoring';

/** Minimum interval (ms) between scoring evaluations to avoid excessive recalculation */
export const SCORING_THROTTLE_MS = 250;

/** Max points per player in PTM mode */
const PTM_MAX_POINTS = 2000;

// ── Visual note performance samples (note-hit display) ──────────────
// Same shape as the standard game's notePerformance map: per-note
// samples used by NoteHighway / SinglePlayerLyrics to render the
// Singstar-style fill, misses (Aussetzer) and pitch ghosts.
export interface PtmVisualSample {
  time: number;
  accuracy: number;
  hit: boolean;
  sungPitch?: number | null;
  /** Color of the player who produced the sample (per-player miss ghosts). */
  playerColor?: string;
}
export type PtmNotePerformance = Map<string, PtmVisualSample[]>;

/** ms between visual samples (~matches the ~50ms visual tick granularity). */
const VISUAL_SAMPLE_INTERVAL_MS = 50;
/** Cap per note so long notes don't accumulate unbounded samples. */
const MAX_VISUAL_SAMPLES_PER_NOTE = 80;
/** Suppress vibrato jitter smaller than this (semitones). */
const VIBRATO_THRESHOLD = 0.5;

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
  playersRef: React.RefObject<PtmPlayer[]>;
  forceRender: () => void;
}

/**
 * Extract notes that fall within a time range from a flat notes array.
 * Durations are CLIPPED to the segment so notes spanning a boundary
 * contribute their exact share to each segment's point pool.
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
      const clippedDuration = Math.min(noteEnd, endTime) - Math.max(note.startTime, startTime);
      result.push({
        duration: Math.max(1, clippedDuration),
        isGolden: (note as Note).isGolden ?? false,
      });
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
  playersRef,
  forceRender,
}: UsePtmScoringOptions): { notePerformance: PtmNotePerformance } {
  const lastEvalTimeRef = useRef(0);

  // ── Scoring dead-zone fix (medley snippets) ──
  // Each medley snippet is a DIFFERENT file: when the segment switches, the
  // media seeks to the snippet position and the song clock JUMPS — often
  // BACKWARDS. The stale lastEvalTimeRef then throttled every evaluation
  // ("time - lastEval < 250ms" with time far behind lastEval) until the new
  // snippet's clock caught up with the old one — entire snippets scored
  // NOTHING while the player was singing. Reset on segment change and on
  // any backwards clock jump so the first evaluation is immediate.
  useEffect(() => {
    lastEvalTimeRef.current = 0;
  }, [currentSegmentIndex]);

  // Read currentTime from a ref inside the callback to avoid recreating
  // the RAF loop ~40 times/sec (currentTime changes every frame).
  const currentTimeRef = useRef(currentTime);
  currentTimeRef.current = currentTime;

  // Compute scoring metadata from the CURRENT PLAYER's segment notes only.
  // This ensures each player can earn up to 2,000 points across THEIR ticks.
  //
  // Party tick grid: evaluations run on a FIXED 250 ms grid
  // (SCORING_THROTTLE_MS), so the point pool is normalized over the same
  // grid. The previous BPM-beat normalization made the earnable maximum
  // tempo-dependent — at 120 BPM a perfect segment only paid ~half of the
  // 2,000 points (8 evals/s vs 16 beat-ticks/s), at 60 BPM it paid all of
  // them. In medley mode (one song per snippet, different tempos) that gave
  // players on fast songs systematically fewer points for identical singing.
  const scoringMeta = useMemo((): ScoringMetadata | null => {
    const segment = segments[currentSegmentIndex];
    if (!segment || allNotes.length === 0) return null;
    const segmentNotes = getNotesInRange(allNotes, segment.startTime, segment.endTime);
    if (segmentNotes.length === 0) return null;
    return calculateScoringMetadata(segmentNotes, SCORING_THROTTLE_MS, 'medium', PTM_MAX_POINTS);
  }, [segments, currentSegmentIndex, allNotes]);

  // ── Visual note performance map (mutated in place; consumed fresh by
  // NoteHighway on every currentTime-driven render — same pattern as
  // use-note-scoring's notePerformanceRef) ──
  const notePerformanceRef = useRef<PtmNotePerformance>(new Map());
  const lastVisualSampleTimeRef = useRef(0);
  const lastVisualSungPitchRef = useRef<number | null>(null);

  // Reset when the note source changes (new song / medley snippet switch).
  useEffect(() => {
    notePerformanceRef.current = new Map();
    lastVisualSungPitchRef.current = null;
  }, [notesSource]);

  /**
   * High-rate visual tick sampler (no scoring side effects): records
   * hit AND miss samples for the active note so the note bar fills and
   * Aussetzer gaps render in real time.
   */
  const sampleVisualTicks = useCallback((time: number) => {
    const now = performance.now();
    if (now - lastVisualSampleTimeRef.current < VISUAL_SAMPLE_INTERVAL_MS) return;
    lastVisualSampleTimeRef.current = now;

    const activeNote = findActiveNote(notesSource?.lyrics, time);
    if (!activeNote) return;
    // Notes carry an optional runtime id; fall back to the startTime key
    // (same key format NoteBlock uses to look samples up).
    const noteId = (activeNote as Note).id || `note-${activeNote.startTime}`;

    const sungPitchRaw = pitchResult?.note ?? null;
    const hasPitch = sungPitchRaw !== null && pitchResult !== null && pitchResult.frequency !== null;

    let accuracy = 0;
    let hit = false;
    let sungPitch: number | null = sungPitchRaw;
    if (hasPitch && sungPitchRaw !== null) {
      // Vibrato filter: samples that only jitter around the last accepted
      // pitch are SNAPPED to it (still recorded — the fill stays
      // continuous) instead of being dropped. Dropping them made steady
      // singing render as regular every-other-tick gaps.
      if (lastVisualSungPitchRef.current !== null) {
        const lastAccepted = lastVisualSungPitchRef.current;
        let wrapped = Math.abs(sungPitchRaw - lastAccepted) % 12;
        if (wrapped > 6) wrapped = 12 - wrapped;
        if (wrapped < VIBRATO_THRESHOLD) {
          sungPitch = lastAccepted;
        } else {
          lastVisualSungPitchRef.current = sungPitchRaw;
        }
      } else {
        lastVisualSungPitchRef.current = sungPitchRaw;
      }

      const tick = evaluateTick(sungPitch!, activeNote.pitch, difficulty);
      accuracy = tick.accuracy;
      hit = tick.isHit;
    } else {
      sungPitch = null;
      lastVisualSungPitchRef.current = null;
    }

    const playerColor = playersRef.current?.[currentPlayerIndex]?.color;

    const perf = notePerformanceRef.current;
    let samples = perf.get(noteId);
    if (!samples) {
      samples = [];
      perf.set(noteId, samples);
    }
    samples.push({ time, accuracy, hit, sungPitch: hasPitch ? sungPitch : null, playerColor });
    if (samples.length > MAX_VISUAL_SAMPLES_PER_NOTE) {
      samples.splice(0, samples.length - MAX_VISUAL_SAMPLES_PER_NOTE);
    }
  }, [pitchResult, notesSource, difficulty, currentPlayerIndex, playersRef]);

  const scoreCurrentPlayer = useCallback(() => {
    const time = currentTimeRef.current;

    // No pitch result yet (mic still initializing after a handoff) or silent
    // input between notes — both are NORMAL during play, not warnings. The
    // visual sampler below keeps recording miss samples for the fill display.
    if (!pitchResult) return;

    if (shouldSkipPitch(pitchResult, difficulty)) return;

    const activeNote = findActiveNote(notesSource?.lyrics, time);
    if (!activeNote) return;

    // Backwards clock jump (media seek / snippet replacement) — reset so
    // the throttle never blocks the new snippet (see comment above).
    if (time < lastEvalTimeRef.current) lastEvalTimeRef.current = 0;
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

  // ── Game loop: score during playing (visual sampling every frame) ──
  useEffect(() => {
    if (phase !== 'playing' || !isPlaying) return;
    let rafId: number;
    const loop = () => {
      sampleVisualTicks(currentTimeRef.current);
      scoreCurrentPlayer();
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [phase, isPlaying, scoreCurrentPlayer, sampleVisualTicks]);

  return { notePerformance: notePerformanceRef.current };
}
