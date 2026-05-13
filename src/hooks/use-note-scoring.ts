'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { DIFFICULTY_SETTINGS, Difficulty, Note, LyricLine } from '@/types/game';
import {
  evaluateTick,
  calculateTickPoints,
  NoteProgress,
  ScoringMetadata,
} from '@/lib/game/scoring';
import { Player } from '@/types/game';
import type { ChallengeModifier } from '@/lib/game/player-progression';

// Score event type for visual feedback
interface ScoreEvent {
  displayType: 'Perfect' | 'Great' | 'Good' | 'Okay' | 'Miss';
  points: number;
  time: number;
  player?: 'P1' | 'P2';
}

// Note performance sample for visual display modes
interface NotePerformanceSample {
  time: number;
  accuracy: number;
  hit: boolean;
}

// Player state for additional players (P2, P3, P4) not in the main store
interface PlayerScoringState {
  score: number;
  combo: number;
  maxCombo: number;
  notesHit: number;
  notesMissed: number;
  perfectNotesCount: number;
  goldenNotesHit: number;
}

// Timing data structure (subset used by scoring)
interface TimingDataForScoring {
  allNotes: Array<Note & { lineIndex: number; line: LyricLine }>;
  p1Notes?: Array<Note & { lineIndex: number; line: LyricLine }>;
  p2Notes?: Array<Note & { lineIndex: number; line: LyricLine }>;

  scoringMetadata?: ScoringMetadata;
  p1ScoringMetadata?: ScoringMetadata;
  p2ScoringMetadata?: ScoringMetadata;

  beatDuration: number;
}

// Hook options
interface UseNoteScoringOptions {
  song: {
    id: string;
    lyrics: LyricLine[];
  } | null;
  difficulty: Difficulty;
  players: Player[];
  timingData: TimingDataForScoring | null;
  isDuetMode: boolean;
  beatDuration: number;  // Kept for interface compat; actual value from timingData
  updatePlayer: (_playerId: string, _updates: Partial<Player>) => void;
  // Challenge modifiers (e.g. perfect_only, golden_only from challenge modes)
  challengeModifiers?: ChallengeModifier[];
  // Optional callbacks for visual effects
  onPerfectHit?: (_x: number, _y: number) => void;
  onGoldenNote?: (_x: number, _y: number) => void;
  onComboMilestone?: (_combo: number, _x: number, _y: number) => void;
}

// Hook return type
interface UseNoteScoringReturn {
  // Score events for visual feedback (combined P1+P2 events)
  scoreEvents: ScoreEvent[];

  // Note performance for visual display modes
  notePerformance: Map<string, NotePerformanceSample[]>;
  // P2 note performance (separate map so P1 hits don't show on P2's highway)
  p2NotePerformance: Map<string, NotePerformanceSample[]>;
  // P1 perfect notes count (all ticks hit) — updated via ref for 60fps accuracy
  p1PerfectNotesCount: number;
  // P2 state (for duet mode)
  p2State: PlayerScoringState;

  // Detected pitch for P2
  p2DetectedPitch: number | null;

  setP2DetectedPitch: (_pitch: number | null) => void;
  // Functions
  checkNoteHits: (
    _currentTime: number,
    pitch: { frequency: number | null; note: number | null; clarity: number; volume: number; isSinging?: boolean }
  ) => void;
  checkP2NoteHits: (
    _currentTime: number,
    pitch: { frequency: number | null; note: number | null; clarity: number; volume: number; isSinging?: boolean }
  ) => void;

  resetScoring: () => void;
}

// Maximum number of performance samples stored per note.
// Prevents unbounded memory growth during long songs while retaining
// enough data for visual feedback modes (heat-map / accuracy graph).
const MAX_SAMPLES_PER_NOTE = 100;
const DEFAULT_PLAYER_SCORING_STATE: PlayerScoringState = {
  score: 0,
  combo: 0,
  maxCombo: 0,
  notesHit: 0,
  notesMissed: 0,
  perfectNotesCount: 0,
  goldenNotesHit: 0,
};

// ---------------------------------------------------------------------------
// Shared scoring pass — pure function that iterates notes, evaluates ticks,
// applies challenge modifiers, tracks combo, and computes deltas.
// Used by both P1 (checkNoteHits) and P2+ (checkPlayerNoteHits).
// ---------------------------------------------------------------------------

interface ScoringPassResult {
  scoreDelta: number;
  comboUpdate: number | undefined;
  maxComboUpdate: number | undefined;
  notesHitDelta: number;
  notesMissedDelta: number;
  perfectNotesDelta: number;
  goldenNotesDelta: number;
  hasUpdates: boolean;
  pendingEvents: ScoreEvent[];
  // P1 visual tracking: the active note's ID and last tick result for performance samples
  activeNoteId: string | undefined;
  activeNoteIsGolden: boolean;
  lastTickAccuracy: number;
  lastTickHit: boolean;
}

function runScoringPass(
  currentTime: number,
  detectedNote: number,
  notesToCheck: Array<Note & { lineIndex: number; line: LyricLine }>,
  scoringMeta: ScoringMetadata,
  beatDurationMs: number,
  difficulty: Difficulty,
  noteProgressMap: Map<string, NoteProgress>,
  searchStartRef: React.MutableRefObject<number>,
  noteIdPrefix: string,
  hasPerfectOnly: boolean,
  hasGoldenOnly: boolean,
  comboRef: React.MutableRefObject<number>,
  maxComboRef: React.MutableRefObject<number>,
): ScoringPassResult {
  // Batch accumulator
  let scoreDelta = 0;
  let comboUpdate: number | undefined;
  let maxComboUpdate: number | undefined;
  let notesHitDelta = 0;
  let notesMissedDelta = 0;
  let perfectNotesDelta = 0;
  let goldenNotesDelta = 0;
  let hasUpdates = false;
  const pendingEvents: ScoreEvent[] = [];

  // P1 visual tracking — filled during tick evaluation inside the loop
  let activeNoteId: string | undefined;
  let activeNoteIsGolden = false;
  let lastTickAccuracy = 0;
  let lastTickHit = false;

  // Clamp index to array bounds — notesToCheck may shrink if timingData changes
  if (searchStartRef.current >= notesToCheck.length) {
    searchStartRef.current = 0;
  } else if (searchStartRef.current > 0 &&
      notesToCheck[searchStartRef.current].startTime > currentTime) {
    searchStartRef.current = 0;
  }

  for (let ni = searchStartRef.current; ni < notesToCheck.length; ni++) {
    const note = notesToCheck[ni];
    const noteEnd = note.startTime + note.duration;
    const noteId = note.id || `${noteIdPrefix}-${note.startTime}`;

    // Check if we're in the note's time window
    if (currentTime >= note.startTime && currentTime <= noteEnd) {
      searchStartRef.current = ni;
      let noteProgress = noteProgressMap.get(noteId);

      if (!noteProgress) {
        const totalTicks = Math.max(1, Math.round(note.duration / beatDurationMs));
        noteProgress = {
          noteId,
          totalTicks,
          ticksHit: 0,
          ticksEvaluated: 0,
          isGolden: note.isGolden,
          lastEvaluatedTime: currentTime,
          isComplete: false,
          wasPerfect: false,
          accumulatedPoints: 0,
        };
        noteProgressMap.set(noteId, noteProgress);
      }

      const timeSinceLastEval = currentTime - noteProgress.lastEvaluatedTime;
      const tickInterval = beatDurationMs;

      if (timeSinceLastEval >= tickInterval) {
        const tickResult = evaluateTick(detectedNote, note.pitch, difficulty);

        noteProgress.ticksEvaluated++;
        noteProgress.lastEvaluatedTime = currentTime;

        // Record active note info for P1 performance sample recording
        activeNoteId = noteId;
        activeNoteIsGolden = note.isGolden;
        lastTickAccuracy = tickResult.accuracy;
        lastTickHit = tickResult.isHit;

        if (tickResult.isHit) {
          noteProgress.ticksHit++;

          let tickPoints = calculateTickPoints(tickResult.accuracy, note.isGolden, scoringMeta.pointsPerTick);

          // Challenge modifier: perfect_only — only "Perfect" hits score
          if (hasPerfectOnly && tickResult.displayType !== 'Perfect') {
            tickPoints = 0;
          }
          // Challenge modifier: golden_only — only golden notes score
          if (hasGoldenOnly && !note.isGolden) {
            tickPoints = 0;
          }

          const finalPoints = Math.max(1, Math.round(tickPoints));

          if (finalPoints > 0) {
            const newCombo = comboRef.current + 1;

            scoreDelta += finalPoints;
            noteProgress.accumulatedPoints += finalPoints;
            comboUpdate = newCombo;
            maxComboUpdate = Math.max(maxComboRef.current, newCombo);
            comboRef.current = newCombo;
            maxComboRef.current = maxComboUpdate;
            hasUpdates = true;
          }
        } else {
          comboUpdate = 0;
          comboRef.current = 0;
          hasUpdates = true;
        }
      }

      break;
    }

    // Check if we just passed a note — emit ONE aggregated score event
    if (currentTime > noteEnd) {
      const progress = noteProgressMap.get(noteId);

      if (progress && !progress.isComplete) {
        progress.isComplete = true;

        if (progress.ticksHit > 0) {
          notesHitDelta++;
        } else {
          notesMissedDelta++;
        }
        hasUpdates = true;

        if (progress.ticksHit >= progress.totalTicks) {
          progress.wasPerfect = true;
          perfectNotesDelta++;
        }
        // Track golden notes hit (note was golden and at least one tick hit)
        if (progress.isGolden && progress.ticksHit > 0) {
          goldenNotesDelta++;
        }

        // Determine aggregated displayType based on hit ratio across all ticks
        const hitRatio = progress.ticksEvaluated > 0
          ? progress.ticksHit / progress.ticksEvaluated
          : 0;
        let aggregatedDisplayType: ScoreEvent['displayType'];
        if (hitRatio >= 1) {
          aggregatedDisplayType = 'Perfect';
        } else if (hitRatio >= 0.8) {
          aggregatedDisplayType = 'Great';
        } else if (hitRatio >= 0.5) {
          aggregatedDisplayType = 'Good';
        } else if (hitRatio > 0) {
          aggregatedDisplayType = 'Okay';
        } else {
          aggregatedDisplayType = 'Miss';
        }

        pendingEvents.push({
          displayType: aggregatedDisplayType,
          points: progress.accumulatedPoints,
          time: noteEnd,
        });
      }
    }
  }

  return {
    scoreDelta,
    comboUpdate,
    maxComboUpdate,
    notesHitDelta,
    notesMissedDelta,
    perfectNotesDelta,
    goldenNotesDelta,
    hasUpdates,
    pendingEvents,
    activeNoteId,
    activeNoteIsGolden,
    lastTickAccuracy,
    lastTickHit,
  };
}

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
  // CRITICAL: Use a version counter instead of new Map() to trigger re-renders.
  // new Map() defeats React.memo on NoteBlock by creating a new object reference.
  const notePerformanceRef = useRef<Map<string, NotePerformanceSample[]>>(new Map());
  const [notePerformance, setNotePerformance] = useState<Map<string, NotePerformanceSample[]>>(new Map());
  const notePerfVersionRef = useRef(0);
  const lastNotePerfSyncRef = useRef(0);

  // P2 note performance tracking — same pattern as P1
  const p2NotePerformanceRef = useRef<Map<string, NotePerformanceSample[]>>(new Map());
  const [p2NotePerformance, setP2NotePerformance] = useState<Map<string, NotePerformanceSample[]>>(new Map());
  const p2NotePerfVersionRef = useRef(0);
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
    notePerfVersionRef.current = 0;
    lastNotePerfSyncRef.current = 0;
    setP2NotePerformance(new Map());
    p2NotePerformanceRef.current = new Map();
    p2NotePerfVersionRef.current = 0;
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
      noteIdPrefix: string
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
        hasPerfectOnly, hasGoldenOnly, comboRef, maxComboRef,
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

        // Throttled state sync: flush to React state at ~30Hz (33ms)
        const now = performance.now();
        if (_playerIndex === 1) {
          if (now - lastP2NotePerfSyncRef.current >= 33) {
            lastP2NotePerfSyncRef.current = now;
            p2NotePerfVersionRef.current++;
            setP2NotePerformance(p2NotePerformanceRef.current);
          }
        } else {
          if (now - lastNotePerfSyncRef.current >= 33) {
            lastNotePerfSyncRef.current = now;
            notePerfVersionRef.current++;
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

      const result = runScoringPass(
        currentTime, pitch.note!, notesToCheck, scoringMeta, beatDurationMs, difficulty,
        noteProgressRef.current, lastProcessedNoteRef, 'note',
        hasPerfectOnly, hasGoldenOnly, p1ComboRef, p1MaxComboRef,
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

        // Throttled state sync: flush to React state at ~30Hz (33ms)
        // CRITICAL: Reuse the SAME Map reference and increment a version counter.
        // This prevents React.memo on NoteBlock from detecting a new prop reference.
        const now = performance.now();
        if (now - lastNotePerfSyncRef.current >= 33) {
          lastNotePerfSyncRef.current = now;
          notePerfVersionRef.current++;
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
      checkPlayerNoteHits(
        currentTime,
        pitch,
        1,
        timingData?.p2Notes,
        timingData?.p2ScoringMetadata,
        p2NoteProgressRef,
        setP2State,
        setScoreEvents,
        'p2-note'
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
