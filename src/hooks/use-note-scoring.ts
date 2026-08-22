'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { DIFFICULTY_SETTINGS, Note, LyricLine, Player, PitchDetectionResult } from '@/types/game';
import { NoteProgress, ScoringMetadata, ComboScoringState, createComboScoringState, evaluateTick } from '@/lib/game/scoring';
import { runScoringPass, BlindScoringState } from '@/lib/game/run-scoring-pass';
import {
  MAX_SAMPLES_PER_NOTE,
  DEFAULT_PLAYER_SCORING_STATE,
  ScoreEvent,
  NotePerformanceSample,
  PlayerScoringState,
  TimingDataForScoring,
  UseNoteScoringOptions,
  UseNoteScoringReturn,
} from '@/lib/game/scoring-types';
import type { ChallengeModifier } from '@/lib/game/player-progression';

/**
 * Custom hook for note scoring and hit detection
 * Handles duration-based scoring for single player, duet mode, and 4-player party mode
 */
export function useNoteScoring(options: UseNoteScoringOptions): UseNoteScoringReturn {
  const {
    song,
    difficulty,
    players,
    timingData,
    isDuetMode,
    // beatDuration is unused — actual value read from timingData.beatDuration
    isBlindSection = false,
    updatePlayer,
    challengeModifiers = [],
    onPerfectHit,
    onGoldenNote,
    onComboMilestone
  } = options;

  // Pre-compute challenge modifier flags for fast lookups during scoring ticks
  const hasPerfectOnly = challengeModifiers.some(m => m.type === 'perfect_only');
  const hasGoldenOnly = challengeModifiers.some(m => m.type === 'golden_only');

  // Score events state
  const [scoreEvents, setScoreEvents] = useState<ScoreEvent[]>([]);


  // Note performance tracking for visual display modes (P1)
  // CRITICAL: Reuse the SAME Map reference across state updates.
  // new Map() defeats React.memo on NoteBlock by creating a new object reference.
  const notePerformanceRef = useRef<Map<string, NotePerformanceSample[]>>(new Map());
  const [notePerformance, setNotePerformance] = useState<Map<string, NotePerformanceSample[]>>(new Map());
  const lastNotePerfSyncRef = useRef(0);

  // P2 note performance tracking — same pattern as P1
  const p2NotePerformanceRef = useRef<Map<string, NotePerformanceSample[]>>(new Map());
  const [p2NotePerformance, setP2NotePerformance] = useState<Map<string, NotePerformanceSample[]>>(new Map());
  const lastP2NotePerfSyncRef = useRef(0);

  // Additional player states (P2, P3, P4) - P1 uses the main store
  const [p2State, setP2State] = useState<PlayerScoringState>({ ...DEFAULT_PLAYER_SCORING_STATE });



  // P1 combo scoring state (note-based combo + progress bar)
  const p1ComboStateRef = useRef<ComboScoringState>(createComboScoringState());
  // P1 perfect notes count
  const p1PerfectNotesCountRef = useRef(0);
  const [p1PerfectNotesCount, setP1PerfectNotesCount] = useState(0);

  // P2 combo scoring state
  const p2ComboStateRef = useRef<ComboScoringState>(createComboScoringState());

  // Blind karaoke tracking refs (P1)
  const p1BlindStreakRef = useRef(0);
  const p1BlindLastWasMissRef = useRef(false);
  // Blind karaoke tracking refs (P2)
  const p2BlindStreakRef = useRef(0);
  const p2BlindLastWasMissRef = useRef(false);

  // Ref for isBlindSection to avoid stale closure in requestAnimationFrame
  const isBlindSectionRef = useRef(isBlindSection);
  useEffect(() => { isBlindSectionRef.current = isBlindSection; }, [isBlindSection]);

  // Detected pitches for P2-P4
  const [p2DetectedPitch, setP2DetectedPitch] = useState<number | null>(null);


  // Refs for note progress tracking (one map per player)
  const noteProgressRef = useRef<Map<string, NoteProgress>>(new Map());
  const p2NoteProgressRef = useRef<Map<string, NoteProgress>>(new Map());

  // Track last processed note index to avoid O(n) scan from start every frame
  const lastProcessedNoteRef = useRef(0);
  // Track last processed note index for P2 (checkPlayerNoteHits)
  const lastProcessedNoteP2Ref = useRef(0);

  // Ref to always have the latest players array — prevents stale closure issues
  // when checkNoteHits is called from requestAnimationFrame
  const playersRef = useRef(players);
  useEffect(() => { playersRef.current = players; }, [players]);

  // ── Visual-only high-rate tick sampling for Singstar-style display ──
  // This runs every frame from the game loop (unlike beat-based scoring)
  // and records BOTH hits and misses for smooth real-time note filling.
  // Samples are throttled to ~50ms intervals to match typical visual tick
  // granularity without excessive memory use.
  const lastVisualSampleTimeRef = useRef(0);
  // Vibrato filter: track the last sung pitch to suppress tiny fluctuations
  // (typical vibrato is ±0.5-1 semitone at 5-8 Hz). We ignore deviations
  // smaller than VIBRATO_THRESHOLD from the last *accepted* sample.
  const lastVisualSungPitchRef = useRef<number | null>(null);
  const VISUAL_SAMPLE_INTERVAL = 50; // ms between visual samples
  const VIBRATO_THRESHOLD = 0.5; // semitones — suppress smaller deviations

  // Timing data ref for visual sampling (avoids stale closure)
  const timingDataRef = useRef(timingData);
  useEffect(() => { timingDataRef.current = timingData; }, [timingData]);

  /**
   * High-rate visual tick sampler for Singstar-style note filling.
   * Called EVERY frame from the game loop — even when no pitch is detected.
   * Records a miss sample for the active note so the display shows gaps.
   *
   * This is SEPARATE from scoring (which uses beat-based ticks).
   * Only writes to notePerformanceRef — no score/combo/state changes.
   */
  const sampleVisualTicks = useCallback(
    (currentTime: number, pitch: PitchDetectionResult | null) => {
      const now = performance.now();
      if (now - lastVisualSampleTimeRef.current < VISUAL_SAMPLE_INTERVAL) return;
      lastVisualSampleTimeRef.current = now;

      const td = timingDataRef.current;
      if (!td) return;

      const notesToCheck = isDuetMode && td.p1Notes ? td.p1Notes : td.allNotes;
      if (!notesToCheck || notesToCheck.length === 0) return;

      // Find the currently active note (note that contains currentTime)
      const startIdx = Math.max(0, lastProcessedNoteRef.current - 1);
      let activeNote: (typeof notesToCheck)[0] | null = null;
      let activeNoteId: string | null = null;

      for (let i = startIdx; i < notesToCheck.length; i++) {
        const note = notesToCheck[i];
        const noteEnd = note.startTime + note.duration;
        if (currentTime >= note.startTime && currentTime <= noteEnd) {
          activeNote = note;
          activeNoteId = note.id || `note-${note.startTime}`;
          break;
        }
        if (note.startTime > currentTime) break; // Notes are sorted by startTime
      }

      if (!activeNote || !activeNoteId) return;

      // Determine sung pitch and evaluate
      const sungPitch = pitch?.note ?? null;
      const hasPitch = sungPitch !== null && pitch !== null && pitch.frequency !== null;

      let accuracy = 0;
      let hit = false;

      if (hasPitch) {
        // Vibrato filter: if the sung pitch is very close to the last accepted
        // pitch (within VIBRATO_THRESHOLD semitones), reuse the last result.
        // This prevents rapid hit/miss flickering during vibrato.
        if (lastVisualSungPitchRef.current !== null) {
          const vibratoDelta = Math.abs(sungPitch - lastVisualSungPitchRef.current);
          // Use octave-wrapped difference (same pitch class = 0 diff)
          let wrappedDelta = vibratoDelta % 12;
          if (wrappedDelta > 6) wrappedDelta = 12 - wrappedDelta;
          if (wrappedDelta < VIBRATO_THRESHOLD) {
            // Vibrato — skip this sample entirely to avoid jitter
            return;
          }
        }
        lastVisualSungPitchRef.current = sungPitch;

        const tick = evaluateTick(sungPitch, activeNote.pitch, difficulty);
        accuracy = tick.accuracy;
        hit = tick.isHit;
      } else {
        // No pitch detected — record as miss with null sungPitch
        lastVisualSungPitchRef.current = null;
      }

      // Record sample
      const perfRef = notePerformanceRef.current;
      let samples = perfRef.get(activeNoteId);
      if (!samples) {
        samples = [];
        perfRef.set(activeNoteId, samples);
      }
      samples.push({ time: currentTime, accuracy, hit, sungPitch });
      if (samples.length > MAX_SAMPLES_PER_NOTE) {
        samples = samples.slice(-MAX_SAMPLES_PER_NOTE);
        perfRef.set(activeNoteId, samples);
      }

      // Throttled state sync (same 16ms throttle as scoring)
      if (now - lastNotePerfSyncRef.current >= 16) {
        lastNotePerfSyncRef.current = now;
        setNotePerformance(notePerformanceRef.current);
      }
    },
    [difficulty, isDuetMode, setNotePerformance]
  );

  // P2 visual tick sampler (duet mode)
  const sampleP2VisualTicks = useCallback(
    (currentTime: number, pitch: PitchDetectionResult | null) => {
      if (!isDuetMode) return;

      const now = performance.now();
      if (now - lastP2NotePerfSyncRef.current < VISUAL_SAMPLE_INTERVAL) return;
      // We reuse a simple time-based throttle for P2 visual samples
      // (lastP2NotePerfSyncRef is normally for state sync, but serves double duty here)

      const td = timingDataRef.current;
      if (!td || !td.p2Notes || td.p2Notes.length === 0) return;

      // Find active P2 note
      let activeNote: (typeof td.p2Notes)[0] | null = null;
      let activeNoteId: string | null = null;
      for (let i = 0; i < td.p2Notes.length; i++) {
        const note = td.p2Notes[i];
        const noteEnd = note.startTime + note.duration;
        if (currentTime >= note.startTime && currentTime <= noteEnd) {
          activeNote = note;
          activeNoteId = note.id || `p2-note-${note.startTime}`;
          break;
        }
        if (note.startTime > currentTime) break;
      }

      if (!activeNote || !activeNoteId) return;

      const sungPitch = pitch?.note ?? null;
      const hasPitch = sungPitch !== null && pitch !== null && pitch.frequency !== null;

      let accuracy = 0;
      let hit = false;
      if (hasPitch) {
        const tick = evaluateTick(sungPitch, activeNote.pitch, difficulty);
        accuracy = tick.accuracy;
        hit = tick.isHit;
      }

      const perfRef = p2NotePerformanceRef.current;
      let samples = perfRef.get(activeNoteId);
      if (!samples) {
        samples = [];
        perfRef.set(activeNoteId, samples);
      }
      samples.push({ time: currentTime, accuracy, hit, sungPitch });
      if (samples.length > MAX_SAMPLES_PER_NOTE) {
        samples = samples.slice(-MAX_SAMPLES_PER_NOTE);
        perfRef.set(activeNoteId, samples);
      }

      const syncNow = performance.now();
      if (syncNow - lastP2NotePerfSyncRef.current >= 16) {
        lastP2NotePerfSyncRef.current = syncNow;
        setP2NotePerformance(p2NotePerformanceRef.current);
      }
    },
    [difficulty, isDuetMode, setP2NotePerformance]
  );

  // Reset scoring state
  const resetScoring = useCallback(() => {
    setScoreEvents([]);
    setNotePerformance(new Map());
    notePerformanceRef.current = new Map();
    lastNotePerfSyncRef.current = 0;
    setP2NotePerformance(new Map());
    p2NotePerformanceRef.current = new Map();
    lastP2NotePerfSyncRef.current = 0;
    setP2State({ ...DEFAULT_PLAYER_SCORING_STATE });
    p1ComboStateRef.current = createComboScoringState();
    p1PerfectNotesCountRef.current = 0;
    setP1PerfectNotesCount(0);
    setP2DetectedPitch(null);
    noteProgressRef.current.clear();
    p2NoteProgressRef.current.clear();
    lastProcessedNoteRef.current = 0;
    lastProcessedNoteP2Ref.current = 0;
    p2ComboStateRef.current = createComboScoringState();
    // Reset blind tracking
    p1BlindStreakRef.current = 0;
    p1BlindLastWasMissRef.current = false;
    p2BlindStreakRef.current = 0;
    p2BlindLastWasMissRef.current = false;
    // Reset visual sampling
    lastVisualSampleTimeRef.current = 0;
    lastVisualSungPitchRef.current = null;
  }, []);

  // Generic function to check note hits for any player (P2, P3, P4)
  // Delegates to runScoringPass() for the core scoring loop, then flushes
  // accumulated deltas via setPlayerState.
  const checkPlayerNoteHits = useCallback(
    (
      currentTime: number,
      pitch: { frequency: number | null; note: number | null; clarity: number; volume: number; isSinging?: boolean },
      _playerIndex: number,
      notesToCheck: Array<Note & { lineIndex: number; line: LyricLine }> | undefined,
      scoringMeta: ScoringMetadata | undefined,
      noteProgressMap: React.MutableRefObject<Map<string, NoteProgress>>,
      setPlayerState: React.Dispatch<React.SetStateAction<PlayerScoringState>>,
      setScoreEventsState: React.Dispatch<React.SetStateAction<ScoreEvent[]>>,
      noteIdPrefix: string,
      blindState: BlindScoringState | undefined,
    ) => {
      const difficultySettings = DIFFICULTY_SETTINGS[difficulty];
      if (!song || !pitch.frequency || pitch.note === null || pitch.volume < difficultySettings.volumeThreshold) return;
      // Vocal detection (isSinging) removed from scoring gate — see P1
      // checkNoteHits comment for rationale.
      if (!notesToCheck || notesToCheck.length === 0 || !scoringMeta) return;

      const beatDurationMs = timingData?.beatDuration || 500;
      const comboState = _playerIndex === 1 ? p2ComboStateRef.current : p1ComboStateRef.current;
      const searchStartRef = _playerIndex === 1 ? lastProcessedNoteP2Ref : lastProcessedNoteRef;

      const result = runScoringPass(
        currentTime, pitch.note!, notesToCheck, scoringMeta, beatDurationMs, difficulty,
        noteProgressMap.current, searchStartRef, noteIdPrefix,
        hasPerfectOnly, hasGoldenOnly, comboState, blindState,
      );

      // Record performance samples for visual display modes (same pattern as P1)
      if (result.activeNoteId) {
        const perfRef = _playerIndex === 1 ? p2NotePerformanceRef : notePerformanceRef;
        let samples = perfRef.current.get(result.activeNoteId);
        if (!samples) {
          samples = [];
          perfRef.current.set(result.activeNoteId, samples);
        }
        samples.push({ time: currentTime, accuracy: result.lastTickAccuracy, hit: result.lastTickHit, sungPitch: result.lastTickSungPitch });
        if (samples.length > MAX_SAMPLES_PER_NOTE) {
          samples = samples.slice(-MAX_SAMPLES_PER_NOTE);
          perfRef.current.set(result.activeNoteId, samples);
        }

        // Throttled state sync: flush to React state at ~60Hz (16ms) for smooth
        // note coloring. DO-NOT-CHANGE: Lower values cause visible stuttering.
        const now = performance.now();
        if (_playerIndex === 1) {
          if (now - lastP2NotePerfSyncRef.current >= 16) {
            lastP2NotePerfSyncRef.current = now;
            setP2NotePerformance(p2NotePerformanceRef.current);
          }
        } else {
          if (now - lastNotePerfSyncRef.current >= 16) {
            lastNotePerfSyncRef.current = now;
            setNotePerformance(notePerformanceRef.current);
          }
        }
      }

      // Flush: single setPlayerState call with all accumulated deltas
      if (result.hasUpdates) {
        setPlayerState(prev => {
          const next = { ...prev };
          if (result.scoreDelta !== 0) next.score = prev.score + result.scoreDelta;
          if (result.comboUpdate !== undefined) next.combo = result.comboUpdate;
          if (result.maxComboUpdate !== undefined) next.maxCombo = Math.max(prev.maxCombo, result.maxComboUpdate);
          if (result.notesHitDelta > 0) next.notesHit = prev.notesHit + result.notesHitDelta;
          if (result.notesMissedDelta > 0) next.notesMissed = prev.notesMissed + result.notesMissedDelta;
          if (result.perfectNotesDelta > 0) next.perfectNotesCount = prev.perfectNotesCount + result.perfectNotesDelta;
          if (result.goldenNotesDelta > 0) next.goldenNotesHit = (prev.goldenNotesHit || 0) + result.goldenNotesDelta;
          if (result.blindBonusDelta > 0) next.blindBonusPoints = (prev.blindBonusPoints || 0) + result.blindBonusDelta;
          return next;
        });

        // Flush score events in a single batch
        if (result.pendingEvents.length > 0) {
          setScoreEventsState(prev => [
            ...prev.slice(-10),
            ...result.pendingEvents.slice(-10).map(e => ({ ...e, player: _playerIndex === 1 ? 'P2' as const : 'P1' as const })),
          ]);
        }
      }
    },
    [song, difficulty, timingData, hasPerfectOnly, hasGoldenOnly]
  );

  // Check if P1 hits notes - using duration-based scoring
  // Delegates to runScoringPass() for the core scoring loop, then adds
  // P1-specific side effects: performance tracking, visual callbacks,
  // duet score events, accuracy calculation, and perfectNotesCount sync.
  const checkNoteHits = useCallback(
    (currentTime: number, pitch: { frequency: number | null; note: number | null; clarity: number; volume: number; isSinging?: boolean }) => {
      const difficultySettings = DIFFICULTY_SETTINGS[difficulty];
      if (!song || !pitch.frequency || pitch.note === null || pitch.volume < difficultySettings.volumeThreshold) return;
      // Vocal detection (isSinging) removed from scoring gate — the
      // VocalDetector misclassified sustained karaoke notes (low pitch
      // variance, low onset rate) as "humming", blocking ticks and
      // destroying combos.  Pitch tolerance + volume threshold already
      // filter noise; humming on-pitch is valid karaoke play.

      // Use playersRef to avoid stale closure — always get the latest player state
      const activePlayer = playersRef.current[0];
      if (!activePlayer) return;

      // In duet/party mode, only check P1 notes
      const notesToCheck = isDuetMode && timingData?.p1Notes ? timingData.p1Notes : timingData?.allNotes;
      if (!notesToCheck || notesToCheck.length === 0) return;

      const scoringMeta = isDuetMode ? timingData?.p1ScoringMetadata : timingData?.scoringMetadata;
      if (!scoringMeta) return;

      const beatDurationMs = timingData?.beatDuration || 500;

      // Build blind state for P1 if in blind karaoke mode
      const blindState: BlindScoringState | undefined = isBlindSectionRef.current
        ? {
            isBlindSection: isBlindSectionRef.current,
            blindStreakRef: p1BlindStreakRef,
            blindLastWasMissRef: p1BlindLastWasMissRef,
          }
        : undefined;

      const result = runScoringPass(
        currentTime, pitch.note!, notesToCheck, scoringMeta, beatDurationMs, difficulty,
        noteProgressRef.current, lastProcessedNoteRef, 'note',
        hasPerfectOnly, hasGoldenOnly, p1ComboStateRef.current, blindState,
      );

      // P1-specific: record note performance samples for visual display modes
      // (heat-map, accuracy graph). Uses active note info from the scoring pass.
      if (result.activeNoteId) {
        const perfRef = notePerformanceRef.current;
        let samples = perfRef.get(result.activeNoteId);
        if (!samples) {
          samples = [];
          perfRef.set(result.activeNoteId, samples);
        }
        samples.push({ time: currentTime, accuracy: result.lastTickAccuracy, hit: result.lastTickHit, sungPitch: result.lastTickSungPitch });
        if (samples.length > MAX_SAMPLES_PER_NOTE) {
          samples = samples.slice(-MAX_SAMPLES_PER_NOTE);
          perfRef.set(result.activeNoteId, samples);
        }

        // Throttled state sync: flush to React state at ~60Hz (16ms) for smooth
        // note coloring. DO-NOT-CHANGE: Lower values (e.g., 33ms/30Hz) cause visible
        // stuttering of note highlight feedback even when the game loop runs at 60fps.
        // CRITICAL: Reuse the SAME Map reference and increment a version counter.
        // This prevents React.memo on NoteBlock from detecting a new prop reference.
        const now = performance.now();
        if (now - lastNotePerfSyncRef.current >= 16) {
          lastNotePerfSyncRef.current = now;
          // Set the same ref object — shallow equality passes
          setNotePerformance(notePerformanceRef.current);
        }
      }

      // P1-specific: fire visual effect callbacks
      if (result.pendingEvents.length > 0 && typeof window !== 'undefined') {
        const particleX = window.innerWidth * 0.25;
        const particleY = window.innerHeight * 0.4;
        const lastEvent = result.pendingEvents[result.pendingEvents.length - 1];

        if (lastEvent.displayType === 'Perfect' && onPerfectHit) {
          onPerfectHit(particleX, particleY);
        }

        if (result.activeNoteIsGolden && onGoldenNote) {
          onGoldenNote(particleX, particleY);
        }

        const newCombo = result.comboUpdate ?? 0;
        if (newCombo > 0 && newCombo % 10 === 0 && onComboMilestone) {
          onComboMilestone(newCombo, window.innerWidth / 2, window.innerHeight / 2);
        }
      }

      // Flush: single updatePlayer call with all accumulated deltas
      if (result.hasUpdates) {
        const updates: Partial<Player> = {};
        if (result.scoreDelta !== 0) updates.score = activePlayer.score + result.scoreDelta;
        if (result.comboUpdate !== undefined) updates.combo = result.comboUpdate;
        if (result.maxComboUpdate !== undefined) updates.maxCombo = result.maxComboUpdate;
        if (result.notesHitDelta > 0) updates.notesHit = activePlayer.notesHit + result.notesHitDelta;
        if (result.notesMissedDelta > 0) updates.notesMissed = activePlayer.notesMissed + result.notesMissedDelta;
        if (result.goldenNotesDelta > 0) updates.goldenNotesHit = (activePlayer.goldenNotesHit || 0) + result.goldenNotesDelta;
        if (result.blindBonusDelta > 0) updates.blindBonusPoints = (activePlayer.blindBonusPoints || 0) + result.blindBonusDelta;
        // Update live accuracy whenever hit/miss counts change
        if (result.notesHitDelta > 0 || result.notesMissedDelta > 0) {
          const totalNotes = (activePlayer.notesHit + result.notesHitDelta) + (activePlayer.notesMissed + result.notesMissedDelta);
          updates.accuracy = totalNotes > 0
            ? Math.round(((activePlayer.notesHit + result.notesHitDelta) / totalNotes) * 1000) / 10
            : 0;
        }
        updatePlayer(activePlayer.id, updates);

        // Sync perfectNotesCount to state so useGameLoop's ref picks it up at next render.
        if (result.perfectNotesDelta > 0) {
          p1PerfectNotesCountRef.current += result.perfectNotesDelta;
          setP1PerfectNotesCount(p1PerfectNotesCountRef.current);
        }

        // P1 score events (tag with P1)
        if (result.pendingEvents.length > 0) {
          setScoreEvents(prev => [
            ...prev.slice(-10),
            ...result.pendingEvents.slice(-10).map(e => ({ ...e, player: 'P1' as const })),
          ]);
        }
      }
    },
    [song, difficulty, updatePlayer, timingData, isDuetMode, onPerfectHit, onGoldenNote, onComboMilestone, hasPerfectOnly, hasGoldenOnly]
  );

  // Check P2 notes (duet/party mode)
  const checkP2NoteHits = useCallback(
    (currentTime: number, pitch: { frequency: number | null; note: number | null; clarity: number; volume: number; isSinging?: boolean }) => {
      if (!isDuetMode) return;

      // Build blind state for P2
      const blindState: BlindScoringState | undefined = isBlindSectionRef.current
        ? {
            isBlindSection: isBlindSectionRef.current,
            blindStreakRef: p2BlindStreakRef,
            blindLastWasMissRef: p2BlindLastWasMissRef,
          }
        : undefined;

      checkPlayerNoteHits(
        currentTime,
        pitch,
        1,
        timingData?.p2Notes,
        timingData?.p2ScoringMetadata,
        p2NoteProgressRef,
        setP2State,
        setScoreEvents,
        'p2-note',
        blindState,
      );
    },
    [isDuetMode, timingData, checkPlayerNoteHits]
  );



  return {
    scoreEvents,
    notePerformance,
    p2NotePerformance,
    p2State,
    p2DetectedPitch,
    p1PerfectNotesCount,
    setP2DetectedPitch,
    checkNoteHits,
    checkP2NoteHits,
    sampleVisualTicks,
    sampleP2VisualTicks,
    resetScoring,
  };
}
