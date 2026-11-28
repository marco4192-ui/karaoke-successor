'use client';

import { useEffect, useRef, useCallback, useMemo } from 'react';
import type { Song, Note, LyricLine, Difficulty } from '@/types/game';
import { shouldSkipPitch, evaluateAndScoreTick, PARTY_MAX_POINTS_PER_PLAYER } from '@/lib/game/party-scoring';
import { calculateScoringMetadata, evaluateTick, type ScoringMetadata } from '@/lib/game/scoring';
import type { CptmPlayer, CptmSegment } from './cptm-types';
import type { CompanionPitchEntry } from './cptm-companion-polling';

// ===================== CONSTANTS =====================

/** Minimum interval (ms) between scoring evaluations to avoid excessive recalculation */
const SCORING_THROTTLE_MS = 250;

// ── Visual note performance samples (note-hit display) ─────────────
export interface CptmVisualSample {
  time: number;
  accuracy: number;
  hit: boolean;
  sungPitch?: number | null;
  /** Color of the companion player who produced the sample. */
  playerColor?: string;
}
export type CptmNotePerformance = Map<string, CptmVisualSample[]>;

/** ms between visual samples (~matches the ~50ms visual tick granularity). */
const VISUAL_SAMPLE_INTERVAL_MS = 50;
/** Cap per note so long notes don't accumulate unbounded samples. */
const MAX_VISUAL_SAMPLES_PER_NOTE = 80;

// ===================== HELPERS =====================

/** Extract notes overlapping a time range from a flat notes array.
 *  Durations are CLIPPED to the segment so notes spanning a boundary
 *  contribute their exact share to each segment's point pool. */
function getNotesInRange(
  allNotes: Array<{ startTime: number; duration: number }>,
  startTime: number,
  endTime: number,
): Array<{ duration: number; isGolden: boolean }> {
  const result: Array<{ duration: number; isGolden: boolean }> = [];
  for (const note of allNotes) {
    const noteEnd = note.startTime + note.duration;
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
  forceRender: () => void;
}

// ===================== HOOK =====================

/**
 * Runs a scoring RAF loop that evaluates the current player's pitch
 * (from the companion pitch cache) against active notes.
 *
 * CPTM scoring: 2,000 points is the TOTAL budget each player can earn for
 * the WHOLE song — split evenly over the segments assigned to them (a
 * player with 3 segments earns max ~667 per segment, one with 2 segments
 * max 1,000 — everyone tops out at exactly 2,000, so an extra segment
 * never means extra earning potential). The scoring metadata
 * (pointsPerTick) is computed from the notes within the current segment
 * only, scaled to that player's per-segment share of the budget.
 *
 * Also produces a visual notePerformance map (hit/miss samples per note)
 * so the NoteHighway renders the Singstar-style fill and Aussetzer gaps.
 */
export function useCptmScoring(params: CptmScoringParams): { notePerformance: CptmNotePerformance } {
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
    forceRender,
  } = params;

  const lastEvalTimeRef = useRef(0);

  // ── R116: live-value refs — the scoring callbacks below read the CURRENT
  // player index / scoring metadata from refs so their identities stay
  // STABLE across turn switches. Previously every switch recreated
  // sampleVisualTicks + scoreCurrentPlayer (deps: currentPlayerIndex,
  // scoringMeta) — tearing down and re-arming the scoring rAF loop exactly
  // at the switch frame and piling its restart onto the switch commit
  // (the visible hitch at every CPTM player change).
  const currentPlayerIndexLiveRef = useRef(currentPlayerIndex);
  currentPlayerIndexLiveRef.current = currentPlayerIndex;
  const scoringMetaLiveRef = useRef<ScoringMetadata | null>(null);

  // ── R116: cursor-based active-note lookup ──
  // findActiveNote scanned ALL lines × notes (O(n) per call, twice per frame
  // through visual sampler + scoring loop). With a monotonic cursor over
  // the pre-sorted allNotes flat array the scan is O(1) amortized — same
  // fix PTM received in R110. Reset on note-source change or a
  // backwards-running clock (seek / medley snippet switch).
  const activeNoteCursorRef = useRef(0);
  useEffect(() => {
    activeNoteCursorRef.current = 0;
  }, [notesSource]);
  const findActiveNoteFast = useCallback((time: number): (Note & { lineIndex: number; line: LyricLine }) | null => {
    const notes = allNotes;
    if (!notes || notes.length === 0) return null;
    let idx = activeNoteCursorRef.current;
    if (idx >= notes.length) idx = 0;
    // Backwards-running clock (snippet switch/seek) → re-scan from the start
    if (idx > 0 && notes[idx].startTime > time + 50) idx = 0;
    // Advance while the note is definitely over
    while (idx < notes.length && notes[idx].startTime + notes[idx].duration < time) idx++;
    activeNoteCursorRef.current = Math.min(idx, notes.length - 1);
    const n = notes[idx];
    if (n && time >= n.startTime && time <= n.startTime + n.duration) return n;
    return null;
  }, [allNotes]);

  // Reset the eval throttle on segment changes so the first evaluation of
  // every segment is immediate (fairness: no player loses scoring time at
  // their segment start; matches the PTM scoring hook).
  useEffect(() => {
    lastEvalTimeRef.current = 0;
  }, [currentSegmentIndex]);

  // ── Visual note performance map (mutated in place; consumed fresh by
  // NoteHighway on every currentTime-driven render) ──
  const notePerformanceRef = useRef<CptmNotePerformance>(new Map());
  const lastVisualSampleTimeRef = useRef(0);

  // Reset when the note source changes (new song).
  useEffect(() => {
    notePerformanceRef.current = new Map();
  }, [notesSource]);

  /**
   * High-rate visual tick sampler (no scoring side effects): records
   * hit AND miss samples for the active note, taken from the current
   * companion's cached pitch.
   */
  const sampleVisualTicks = useCallback((time: number) => {
    const now = performance.now();
    if (now - lastVisualSampleTimeRef.current < VISUAL_SAMPLE_INTERVAL_MS) return;
    lastVisualSampleTimeRef.current = now;

    const activeNote = findActiveNoteFast(time);
    if (!activeNote) return;
    // Notes carry an optional runtime id; fall back to the startTime key
    // (same key format NoteBlock uses to look samples up).
    const noteId = (activeNote as Note).id || `note-${activeNote.startTime}`;

    const player = playersRef.current[currentPlayerIndexLiveRef.current];
    const cachedPitch = player ? companionPitchCacheRef.current.get(player.id) : undefined;
    const sungPitch = cachedPitch?.note ?? null;
    const hasPitch = sungPitch !== null && cachedPitch != null && cachedPitch.frequency != null;

    let accuracy = 0;
    let hit = false;
    if (hasPitch && sungPitch !== null) {
      const tick = evaluateTick(sungPitch, activeNote.pitch, difficulty);
      accuracy = tick.accuracy;
      hit = tick.isHit;
    }

    const playerColor = player?.color;

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
  }, [notesSource, difficulty, playersRef, companionPitchCacheRef, findActiveNoteFast]);

  // Read currentTime from a ref inside the callback to avoid recreating
  // the RAF loop ~40 times/sec (currentTime changes every frame).
  const currentTimeRef = useRef(currentTime);
  currentTimeRef.current = currentTime;

  // ── Per-player song budget ──
  // 2,000 points is the TOTAL each player can earn for the whole song
  // (NOT per segment): the budget is split evenly over the segments
  // assigned to the CURRENT player. A player with an extra segment thus
  // earns smaller per-segment points — everyone tops out at 2,000, so an
  // extra segment never decides the winner (fairness fix: the previous
  // per-segment 2,000 gave extra-segment players up to 2,000 more
  // potential than everyone else).
  const playerSegmentCount = useMemo(() => {
    const player = playersRef.current[currentPlayerIndex];
    if (!player) return 1;
    let count = segments.filter(s => s.playerId === player.id).length;
    // Defensive takeover guard (CPTM is deterministic, but if the current
    // segment ever belongs to another player, it counts as an EXTRA
    // partial segment for the current singer — same rule as PTM).
    const seg = segments[currentSegmentIndex];
    if (seg && seg.playerId !== player.id) count += 1;
    return Math.max(1, count);
  }, [segments, currentSegmentIndex, currentPlayerIndex, playersRef]);

  const segmentMaxPoints = PARTY_MAX_POINTS_PER_PLAYER / playerSegmentCount;

  // Compute scoring metadata from the CURRENT PLAYER's segment notes only,
  // scaled to their per-segment share of the 2,000-point song budget.
  //
  // Party tick grid: evaluations run on a FIXED 250 ms grid
  // (SCORING_THROTTLE_MS), so the point pool is normalized over the same
  // grid. The previous BPM-beat normalization made the earnable maximum
  // tempo-dependent — at 120 BPM a perfect segment only paid ~half of its
  // budget (8 evals/s vs 16 beat-ticks/s). Every segment now pays its full
  // budget share for perfect singing, independent of tempo and note
  // density (fairness between players).
  const scoringMeta = useMemo((): ScoringMetadata | null => {
    const segment = segments[currentSegmentIndex];
    if (!segment || allNotes.length === 0) return null;
    const segmentNotes = getNotesInRange(allNotes, segment.startTime, segment.endTime);
    if (segmentNotes.length === 0) return null;
    return calculateScoringMetadata(segmentNotes, SCORING_THROTTLE_MS, 'medium', segmentMaxPoints);
  }, [segments, currentSegmentIndex, allNotes, segmentMaxPoints]);
  // R116: live-value ref — keeps scoreCurrentPlayer's identity stable across
  // segment/player switches (see the ref block at the top of this hook).
  scoringMetaLiveRef.current = scoringMeta;

  const scoreCurrentPlayer = useCallback(() => {
    const time = currentTimeRef.current;

    // R116: live refs — keeps this callback's identity stable across player
    // switches (no scoring-rAF restart at the handoff frame).
    const idx = currentPlayerIndexLiveRef.current;
    const player = playersRef.current[idx];
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
    };

    if (shouldSkipPitch(pitchResult, difficulty)) return;

    const activeNote = findActiveNoteFast(time);
    if (!activeNote) return;

    // Backwards clock jump (media seek) — reset so the throttle never
    // blocks evaluation after the jump.
    if (time < lastEvalTimeRef.current) lastEvalTimeRef.current = 0;
    if (time - lastEvalTimeRef.current < SCORING_THROTTLE_MS) return;
    lastEvalTimeRef.current = time;

    const note = pitchResult.note;
    if (note == null) return;
    const tick = evaluateAndScoreTick(note, activeNote, difficulty, scoringMetaLiveRef.current);
    const p = playersRef.current[idx];

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
  }, [notesSource, difficulty, forceRender, playersRef, companionPitchCacheRef, findActiveNoteFast]);

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
