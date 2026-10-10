/**
 * Medley Contest — Scoring engine (R7 extraction).
 *
 * Owns the tick-based 10,000-point scoring (per player), the scoring-event
 * buffer for UI popups, and the per-note visual performance samples for the
 * NoteHighway (unified HUD + per-player strips), including the vibrato snap
 * and dropout-bridge filters.  The per-snippet reset effect clears all of
 * this whenever the snippet index changes.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { shouldSkipPitch, createMedleyTickScoringState, evaluateMedleyTick, type MedleyTickScoringState } from '@/lib/game/party-scoring';
import { calculateScoringMetadata, evaluateTick, type TickNoteKind, type ScoringMetadata } from '@/lib/game/scoring';
import type { Note, PitchDetectionResult } from '@/types/game';
import { isFreestyleNote } from '@/types/game';
import type { MedleyPlayer, MedleySong, MedleySettings, MedleyScoringEvent } from '../medley-types';
import { getDynamicDifficulty } from '../medley-scoring';
import type { MedleyNotePerfSample } from './medley-hook-types';
import type { UseMedleyAudioReturn } from './use-medley-audio';
import type { UseMedleyTeamBonusesReturn } from './use-medley-team-bonuses';

// ===================== PARAMS =====================

export interface UseMedleyScoringParams {
  playersRef: React.MutableRefObject<MedleyPlayer[]>;
  currentSnippet: MedleySong | null;
  currentSnippetIdx: number;
  medleySongs: MedleySong[];
  settings: MedleySettings;
  audio: UseMedleyAudioReturn;
  teamBonuses: UseMedleyTeamBonusesReturn;
}

// ===================== RETURN =====================

export interface UseMedleyScoringReturn {
  // Feature #5: Scoring events for UI feedback
  lastScoringEvents: MedleyScoringEvent[];
  setLastScoringEvents: React.Dispatch<React.SetStateAction<MedleyScoringEvent[]>>;
  scoringEventsRef: React.MutableRefObject<MedleyScoringEvent[]>;
  /** Throttle timestamp for the ~100ms scoring-event UI sync. */
  lastScoringUiUpdateRef: React.MutableRefObject<number>;

  // Unified HUD: per-note performance samples
  notePerformance: Map<string, MedleyNotePerfSample[]>;
  setNotePerformance: React.Dispatch<React.SetStateAction<Map<string, MedleyNotePerfSample[]>>>;
  notePerformanceRef: React.MutableRefObject<Map<string, MedleyNotePerfSample[]>>;

  // Multi-player strips (Fix 6): per-player performance samples
  notePerformanceByPlayer: Map<string, Map<string, MedleyNotePerfSample[]>>;
  setNotePerformanceByPlayer: React.Dispatch<React.SetStateAction<Map<string, Map<string, MedleyNotePerfSample[]>>>>;
  notePerformanceByPlayerRef: React.MutableRefObject<Map<string, Map<string, MedleyNotePerfSample[]>>>;

  // Tick-based scoring state (10,000 total points)
  medleyTickScoringStatesRef: React.MutableRefObject<Map<string, MedleyTickScoringState>>;
  snippetScoringMetaRef: React.MutableRefObject<ScoringMetadata | null>;
  lastSnippetIdxForMetaRef: React.MutableRefObject<number>;

  // Callbacks
  finalizeSnippetScores: (_activeIds: string[]) => void;
  scorePlayer: (playerId: string, pitch: PitchDetectionResult | null, absTime: number) => void;
}

// ===================== HOOK =====================

export function useMedleyScoring({
  playersRef,
  currentSnippet,
  currentSnippetIdx,
  medleySongs,
  settings,
  audio,
  teamBonuses,
}: UseMedleyScoringParams): UseMedleyScoringReturn {
  // ── Feature #5: Scoring events for UI feedback ──
  const [lastScoringEvents, setLastScoringEvents] = useState<MedleyScoringEvent[]>([]);
  const scoringEventsRef = useRef<MedleyScoringEvent[]>([]);

  // ── Unified HUD: per-note performance samples for the NoteHighway ──
  const notePerformanceRef = useRef<Map<string, MedleyNotePerfSample[]>>(new Map());
  const [notePerformance, setNotePerformance] = useState<Map<string, MedleyNotePerfSample[]>>(new Map());
  // Throttle UI update for scoring events to ~100ms
  const lastScoringUiUpdateRef = useRef(0);

  // ── Multi-player strips (Fix 6): per-player performance samples ──
  // playerId → noteKey → samples (same samples as notePerformanceRef, just
  // also bucketed per player so each strip renders one single color).
  const notePerformanceByPlayerRef = useRef<Map<string, Map<string, MedleyNotePerfSample[]>>>(new Map());
  const [notePerformanceByPlayer, setNotePerformanceByPlayer] = useState<Map<string, Map<string, MedleyNotePerfSample[]>>>(new Map());

  // Per-player tick-based scoring state for Medley (10,000 total points)
  const medleyTickScoringStatesRef = useRef<Map<string, MedleyTickScoringState>>(new Map());

  // Tick-based scoring metadata for current snippet (10,000 max points)
  // Lazily computed on first scorePlayer call per snippet.
  const snippetScoringMetaRef = useRef<ScoringMetadata | null>(null);
  const lastSnippetIdxForMetaRef = useRef<number>(-1);

  // Reset tick scoring states when snippet changes
  useEffect(() => {
    medleyTickScoringStatesRef.current.clear();
    for (const p of playersRef.current) {
      medleyTickScoringStatesRef.current.set(p.id, createMedleyTickScoringState());
    }
    snippetScoringMetaRef.current = null;
    // Vibrato filter references the previous snippet's pitch context — reset
    lastVisualSungPitchRef.current = new Map();
    // Dropout-bridge timestamps are snippet-relative too (absTime restarts)
    lastVisualValidAtRef.current = new Map();
    // Also clear the per-note performance samples: each snippet has its own
    // notes (keys may repeat across snippets via the `note-{startTime}`
    // fallback), so stale fills/wrong-note marks must not bleed into the
    // next snippet's freshly pre-colored note stream. The game loop re-syncs
    // the UI state from this ref on its next tick (~50ms).
    notePerformanceRef.current.clear();
    notePerformanceByPlayerRef.current.clear();
  }, [currentSnippetIdx]);

  // ── Finalize is no longer needed with tick-based scoring (points are awarded per tick). ──
  // Kept as a no-op for backward compat with callers.
  const finalizeSnippetScores = useCallback((_activeIds: string[]) => {
    // Tick-based scoring awards points immediately — nothing to finalize at snippet end.
  }, []);

  // ── Visual sample vibrato filter (per player) ──
  // Same approach as the normal game / PTM: samples that only jitter around
  // the last accepted pitch (±0.5 semitones, typical vibrato) are SNAPPED to
  // it but still RECORDED — steady singing renders as a continuous fill
  // instead of regular every-other-tick gaps.
  const lastVisualSungPitchRef = useRef<Map<string, number | null>>(new Map());
  const VIBRATO_THRESHOLD_SEMITONES = 0.5;

  // ROUND 2 (user report: regular gaps in long steady notes): timestamp of
  // each player's last VALID detection (non-null + above the volume gate).
  // The multi-pitch pipeline stores every 60 Hz detector frame INCLUDING
  // note:null dropouts (noise gate / volume gate / no-YIN frames) — unlike
  // the normal game, whose ~40 fps state sync overwrites single-frame
  // dropouts before sampling. Bridging dropouts for 150 ms reproduces that
  // low-pass behaviour: steady tones keep painting hit samples (continuous
  // fill), real silence (>150 ms) correctly renders miss samples. Also
  // covers companion players on the 100 ms HTTP polling fallback.
  const lastVisualValidAtRef = useRef<Map<string, number>>(new Map());
  const VISUAL_DROPOUT_BRIDGE_MS = 150;

  // Long sustained notes (medley snippets often hold 10s+ tones) need more
  // than 100 samples at 50 ms cadence — the old cap made the head of every
  // note >5 s render as empty (= Miss) segments. 400 covers 20 s.
  const MAX_NOTE_PERF_SAMPLES = 400;

  /** Note kind for visual tick evaluation — freestyle/rap ignore pitch. */
  const visualKind = (note: Note): TickNoteKind => {
    if (note.isRap) return 'rap';
    if (isFreestyleNote(note)) return 'freestyle';
    return 'normal';
  };

  // ── Score a single player based on THEIR pitch result (tick-based: 10,000 total points) ──
  const scorePlayer = useCallback((
    playerId: string,
    pitch: PitchDetectionResult | null,
    absTime: number,
  ) => {
    // Skip eliminated players
    const player = playersRef.current.find(p => p.id === playerId);
    if (player?.isEliminated) return;
    if (!currentSnippet) return;

    // Use dynamic difficulty for pitch filtering when available
    const effectiveDiff = settings.dynamicDifficulty
      ? getDynamicDifficulty(currentSnippetIdx, medleySongs.length)
      : settings.difficulty;

    const pIdx = playersRef.current.findIndex(p => p.id === playerId);
    if (pIdx === -1) return;
    const p = playersRef.current[pIdx];

    // Find the note the singline is currently passing — used BOTH for the
    // point evaluation and the visual fill samples below.
    const activeNoteForPerf = audio.snippetNotes.find(
      n => absTime >= n.startTime && absTime < n.startTime + n.duration,
    );

    // ── ROUND 2: visual fill samples FIRST, on EVERY call, decoupled from
    // the scoring gates below. The old order (!pitch / shouldSkipPitch /
    // pitch.note == null early-returns BEFORE sampling) meant every detector
    // dropout left a 50 ms HOLE in the note fill — and the renderer paints
    // empty segments as Miss, so steady tones showed regular “Aussetzer”
    // (user report). Now: bridge short dropouts (≤150 ms, see
    // lastVisualValidAtRef) with the last accepted pitch; record explicit
    // miss samples only for real silence. The POINT evaluation below keeps
    // its original gating unchanged.
    if (activeNoteForPerf) {
      const perfNoteId = activeNoteForPerf.id || `note-${activeNoteForPerf.startTime}`;

      // Resolve the visual pitch: fresh detection if valid, else the held
      // pitch while inside the bridge window, else null (miss).
      // ROUND 3 (user report: Aussetzer STILL in medley, never in single
      // player): single player's sampleVisualTicks and PTM's visual sampler
      // accept ANY frame the detector reported a pitch for
      // (note != null && frequency != null) — they apply NO volume gate to
      // the VISUAL fill. shouldSkipPitch's volumeThreshold gate here dropped
      // quiet-but-valid frames (soft singing / mic distance), which the
      // renderer painted as miss segments → the reported regular gaps.
      // Volume gating now applies to the POINT path ONLY — exactly like
      // single player (checkNoteHits gates points, sampleVisualTicks doesn't).
      const pitchIsValid = !!pitch && pitch.note != null && pitch.frequency != null;
      let sungPitch: number | null;
      if (pitchIsValid && pitch?.note != null) {
        sungPitch = pitch.note;
        // Vibrato snap per player (see lastVisualSungPitchRef above)
        const lastAccepted = lastVisualSungPitchRef.current.get(playerId) ?? null;
        if (lastAccepted !== null) {
          let wrapped = Math.abs(pitch.note - lastAccepted) % 12;
          if (wrapped > 6) wrapped = 12 - wrapped;
          if (wrapped < VIBRATO_THRESHOLD_SEMITONES) {
            sungPitch = lastAccepted;
          } else {
            lastVisualSungPitchRef.current.set(playerId, pitch.note);
          }
        } else {
          lastVisualSungPitchRef.current.set(playerId, pitch.note);
        }
        lastVisualValidAtRef.current.set(playerId, absTime);
      } else {
        const lastValidAt = lastVisualValidAtRef.current.get(playerId) ?? -Infinity;
        const held = lastVisualSungPitchRef.current.get(playerId) ?? null;
        sungPitch = held !== null && absTime - lastValidAt <= VISUAL_DROPOUT_BRIDGE_MS
          ? held
          : null;
      }

      // Evaluate — freestyle/rap notes ignore pitch, null records a miss
      // (same semantics as the normal game's sampleVisualTicks).
      let accuracy = 0;
      let isHit = false;
      if (sungPitch !== null) {
        const visualTick = evaluateTick(sungPitch, activeNoteForPerf.pitch, effectiveDiff, visualKind(activeNoteForPerf));
        accuracy = visualTick.accuracy;
        isHit = visualTick.isHit;
      }

      let perfSamples = notePerformanceRef.current.get(perfNoteId);
      if (!perfSamples) {
        perfSamples = [];
        notePerformanceRef.current.set(perfNoteId, perfSamples);
      }
      perfSamples.push({ time: absTime, accuracy, hit: isHit, sungPitch, playerColor: p.color });
      if (perfSamples.length > MAX_NOTE_PERF_SAMPLES) {
        notePerformanceRef.current.set(perfNoteId, perfSamples.slice(-MAX_NOTE_PERF_SAMPLES));
      }

      // Multi-player strips (Fix 6): the same sample, bucketed into the
      // singer's own map so their strip renders hits/misses in their color.
      let playerPerfMap = notePerformanceByPlayerRef.current.get(playerId);
      if (!playerPerfMap) {
        playerPerfMap = new Map();
        notePerformanceByPlayerRef.current.set(playerId, playerPerfMap);
      }
      let playerSamples = playerPerfMap.get(perfNoteId);
      if (!playerSamples) {
        playerSamples = [];
        playerPerfMap.set(perfNoteId, playerSamples);
      }
      playerSamples.push({ time: absTime, accuracy, hit: isHit, sungPitch, playerColor: p.color });
      if (playerSamples.length > MAX_NOTE_PERF_SAMPLES) {
        playerPerfMap.set(perfNoteId, playerSamples.slice(-MAX_NOTE_PERF_SAMPLES));
      }
    }

    // ── Scoring gates (POINTS only — the visual samples above already ran) ──
    if (!pitch) return;
    if (shouldSkipPitch(pitch, effectiveDiff)) return;
    if (pitch.note == null) return;

    // Get or create per-player tick scoring state
    let tickState = medleyTickScoringStatesRef.current.get(playerId);
    if (!tickState) {
      tickState = createMedleyTickScoringState();
      medleyTickScoringStatesRef.current.set(playerId, tickState);
    }

    // Lazy-compute scoring metadata for this snippet (only once per snippet
    // change) — MUST happen before the point evaluation below so the first
    // scored tick of a snippet already sees valid pointsPerTick.
    if (lastSnippetIdxForMetaRef.current !== currentSnippetIdx && audio.snippetNotes.length > 0) {
      const metaBeat = audio.beatDurationRef.current || 500;
      const notesForMeta = audio.snippetNotes.map(n => ({
        duration: n.duration,
        isGolden: n.isGolden ?? false,
      }));
      // Fix 8: the 10,000-point tick budget spans the WHOLE game (all
      // snippets), NOT per snippet — 5 snippets previously allowed ~40k
      // points. Each snippet gets 10000 / snippetCount; the golden 2×
      // multiplier inside calculateScoringMetadata is kept as is.
      const perSnippetBudget = medleySongs.length > 0
        ? Math.round(10000 / medleySongs.length)
        : 10000;
      snippetScoringMetaRef.current = calculateScoringMetadata(notesForMeta, metaBeat, 'medium', perSnippetBudget);
      lastSnippetIdxForMetaRef.current = currentSnippetIdx;
    }

    // ── Beat-throttled POINT evaluation (the 10,000-point budget assumes
    // exactly one scored tick per beat — see calculateScoringMetadata).
    const beatDuration = audio.beatDurationRef.current || 500;
    const result = evaluateMedleyTick(
      pitch.note, absTime, audio.snippetNotes, effectiveDiff, beatDuration, tickState, snippetScoringMetaRef.current,
    );

    // ── Throttled tick: points/combo/miss were NOT evaluated — treat as
    // no-op (the visual sample above already covered the display).
    if (result.throttled) {
      playersRef.current[pIdx] = { ...p };
      return;
    }

    if (result.points > 0) {
      let points = result.points;
      if (teamBonuses.comebackActiveTeamIdRef.current !== null && p.team === teamBonuses.comebackActiveTeamIdRef.current) {
        points = Math.round(points * 1.5);
      }
      p.score += points;
      p.combo++;
      if (p.combo > p.maxCombo) p.maxCombo = p.combo;

      // Count a note as "hit" when ticks are hit (using ticksHit as proxy)
      p.notesHit = tickState.ticksHit;

      scoringEventsRef.current.push({
        playerId,
        points,
        hit: true,
        golden: false,
        timestamp: Date.now(),
      });
    } else if (result.hit) {
      // Tick evaluated but no points (shouldn't happen with valid scoringMeta, but handle gracefully)
      p.combo++;
      if (p.combo > p.maxCombo) p.maxCombo = p.combo;
    } else {
      p.combo = 0;
      p.notesMissed++;

      scoringEventsRef.current.push({
        playerId,
        points: -10,
        hit: false,
        golden: false,
        timestamp: Date.now(),
      });
    }

    playersRef.current[pIdx] = { ...p };
  }, [audio.snippetNotes, audio.beatDurationRef, currentSnippet, settings.difficulty, settings.dynamicDifficulty, currentSnippetIdx, medleySongs.length, teamBonuses.comebackActiveTeamIdRef]);

  return {
    lastScoringEvents,
    setLastScoringEvents,
    scoringEventsRef,
    lastScoringUiUpdateRef,
    notePerformance,
    setNotePerformance,
    notePerformanceRef,
    notePerformanceByPlayer,
    setNotePerformanceByPlayer,
    notePerformanceByPlayerRef,
    medleyTickScoringStatesRef,
    snippetScoringMetaRef,
    lastSnippetIdxForMetaRef,
    finalizeSnippetScores,
    scorePlayer,
  };
}
