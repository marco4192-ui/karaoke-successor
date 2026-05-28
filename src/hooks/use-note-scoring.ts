'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { DIFFICULTY_SETTINGS, Note, LyricLine, Player } from '@/types/game';
import { NoteProgress, ScoringMetadata } from '@/lib/game/scoring';
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



  // Ref for P1 combo to avoid stale closure when batched updates delay React re-render.
  // Without this, two ticks firing before a re-render both read the same old combo value.
  const p1ComboRef = useRef(0);
  const p1MaxComboRef = useRef(0);
  // P1 perfect notes count — incremented when all ticks of a note are hit.
  // Ref for 60fps reads in checkNoteHits; synced to state on note-complete flush so
  // useGameLoop's generateResults() reads the correct value at song end.
  const p1PerfectNotesCountRef = useRef(0);
  const [p1PerfectNotesCount, setP1PerfectNotesCount] = useState(0);

  // Ref for P2 combo — same pattern as P1, prevents stale closure in batched updates
  const p2ComboRef = useRef(0);
  const p2MaxComboRef = useRef(0);

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
    p1ComboRef.current = 0;
    p1MaxComboRef.current = 0;
    p1PerfectNotesCountRef.current = 0;
    setP1PerfectNotesCount(0);
    setP2DetectedPitch(null);
    noteProgressRef.current.clear();
    p2NoteProgressRef.current.clear();
    lastProcessedNoteRef.current = 0;
    lastProcessedNoteP2Ref.current = 0;
    p2ComboRef.current = 0;
    p2MaxComboRef.current = 0;
    // Reset blind tracking
    p1BlindStreakRef.current = 0;
    p1BlindLastWasMissRef.current = false;
    p2BlindStreakRef.current = 0;
    p2BlindLastWasMissRef.current = false;
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
      // Vocal detection: skip scoring if input is classified as humming/noise
      if (pitch.isSinging === false) return;
      if (!notesToCheck || notesToCheck.length === 0 || !scoringMeta) return;

      const beatDurationMs = timingData?.beatDuration || 500;
      // Player-specific refs: currently only P1 (index 0) and P2 (index 1) are supported.
      // P3/P4 would need their own combo refs — this is a latent limitation.
      const comboRef = _playerIndex === 1 ? p2ComboRef : p1ComboRef;
      const maxComboRef = _playerIndex === 1 ? p2MaxComboRef : p1MaxComboRef;
      const searchStartRef = _playerIndex === 1 ? lastProcessedNoteP2Ref : lastProcessedNoteRef;

      const result = runScoringPass(
        currentTime, pitch.note!, notesToCheck, scoringMeta, beatDurationMs, difficulty,
        noteProgressMap.current, searchStartRef, noteIdPrefix,
        hasPerfectOnly, hasGoldenOnly, comboRef, maxComboRef, blindState,
      );

      // Record performance samples for visual display modes (same pattern as P1)
      if (result.activeNoteId) {
        const perfRef = _playerIndex === 1 ? p2NotePerformanceRef : notePerformanceRef;
        let samples = perfRef.current.get(result.activeNoteId);
        if (!samples) {
          samples = [];
          perfRef.current.set(result.activeNoteId, samples);
        }
        samples.push({ time: currentTime, accuracy: result.lastTickAccuracy, hit: result.lastTickHit });
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
      // Vocal detection: skip scoring if input is classified as humming/noise
      if (pitch.isSinging === false) return;

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
        hasPerfectOnly, hasGoldenOnly, p1ComboRef, p1MaxComboRef, blindState,
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
        samples.push({ time: currentTime, accuracy: result.lastTickAccuracy, hit: result.lastTickHit });
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
    resetScoring,
  };
}
