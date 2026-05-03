'use client';

import { useCallback, useRef, useState } from 'react';
import { DIFFICULTY_SETTINGS, Difficulty, Note, LyricLine } from '@/types/game';
import {
  evaluateTick,
  calculateTickPoints,
  NoteProgress,
  ScoringMetadata,
} from '@/lib/game/scoring';
import { Player } from '@/types/game';

// Score event type for visual feedback
interface ScoreEvent {
  type: string;
  displayType: 'Perfect' | 'Great' | 'Good' | 'Okay' | 'Miss';
  points: number;
  time: number;
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
export interface UseNoteScoringOptions {
  song: {
    id: string;
    lyrics: LyricLine[];
  } | null;
  difficulty: Difficulty;
  players: Player[];
  timingData: TimingDataForScoring | null;
  isDuetMode: boolean;
  beatDuration: number;  // Kept for interface compat; actual value from timingData
  updatePlayer: (playerId: string, updates: Partial<Player>) => void;
  // Optional callbacks for visual effects
  onPerfectHit?: (x: number, y: number) => void;
  onGoldenNote?: (x: number, y: number) => void;
  onComboMilestone?: (combo: number, x: number, y: number) => void;
}

// Hook return type
export interface UseNoteScoringReturn {
  // Score events for visual feedback
  scoreEvents: ScoreEvent[];
  p1ScoreEvents: ScoreEvent[];
  p2ScoreEvents: ScoreEvent[];
  
  // Note performance for visual display modes
  notePerformance: Map<string, NotePerformanceSample[]>;
  // P1 perfect notes count (all ticks hit) — updated via ref for 60fps accuracy
  p1PerfectNotesCount: number;
  // P2 state (for duet mode)
  p2State: PlayerScoringState;
  
  // Detected pitch for P2
  p2DetectedPitch: number | null;
  
  setP2DetectedPitch: (pitch: number | null) => void;
  // Functions
  checkNoteHits: (
    currentTime: number,
    pitch: { frequency: number | null; note: number | null; clarity: number; volume: number; isSinging?: boolean }
  ) => void;
  checkP2NoteHits: (
    currentTime: number,
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
};

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
    onPerfectHit,
    onGoldenNote,
    onComboMilestone
  } = options;

  // Score events state
  const [scoreEvents, setScoreEvents] = useState<ScoreEvent[]>([]);
  const [p1ScoreEvents, setP1ScoreEvents] = useState<ScoreEvent[]>([]);
  const [p2ScoreEvents, setP2ScoreEvents] = useState<ScoreEvent[]>([]);


  // Note performance tracking for visual display modes
  // Ref-based for 60fps writes; synced to state at ~10Hz to reduce GC pressure
  const [notePerformance, setNotePerformance] = useState<Map<string, NotePerformanceSample[]>>(new Map());
  const notePerformanceRef = useRef<Map<string, NotePerformanceSample[]>>(new Map());
  const lastNotePerfSyncRef = useRef(0);

  // Additional player states (P2, P3, P4) - P1 uses the main store
  const [p2State, setP2State] = useState<PlayerScoringState>({ ...DEFAULT_PLAYER_SCORING_STATE });

  
  // Refs for P2-P4 states to avoid stale closures in checkPlayerNoteHits
  const p2StateRef = useRef(p2State);
  p2StateRef.current = p2State;

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
  playersRef.current = players;

  // Reset scoring state
  const resetScoring = useCallback(() => {
    setScoreEvents([]);
    setP1ScoreEvents([]);
    setP2ScoreEvents([]);
    setNotePerformance(new Map());
    notePerformanceRef.current = new Map();
    lastNotePerfSyncRef.current = 0;
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

  // Generic function to check note hits for any player
  // Uses ref-based combo tracking and batched state updates (same pattern as P1's checkNoteHits)
  // to prevent stale-state race conditions when multiple ticks fire in the same frame.
  const checkPlayerNoteHits = useCallback(
    (
      currentTime: number,
      pitch: { frequency: number | null; note: number | null; clarity: number; volume: number; isSinging?: boolean },
      _playerIndex: number,
      notesToCheck: Array<Note & { lineIndex: number; line: LyricLine }> | undefined,
      scoringMeta: ScoringMetadata | undefined,
      noteProgressMap: React.MutableRefObject<Map<string, NoteProgress>>,
      stateRef: React.MutableRefObject<PlayerScoringState>,
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

      // Select the correct combo refs based on player index
      const comboRef = _playerIndex === 1 ? p2ComboRef : p1ComboRef;
      const maxComboRef = _playerIndex === 1 ? p2MaxComboRef : p1MaxComboRef;

      // Batch accumulator — all state deltas collected here, flushed once at end
      let scoreDelta = 0;
      let comboUpdate: number | undefined;
      let maxComboUpdate: number | undefined;
      let notesHitDelta = 0;
      let notesMissedDelta = 0;
      let perfectNotesDelta = 0;
      let hasPlayerUpdates = false;
      const pendingEvents: ScoreEvent[] = [];

      // Start from last processed index for O(1) forward progression
      // Reset to 0 if time went backward (e.g. seek)
      const searchStartRef = _playerIndex === 1 ? lastProcessedNoteP2Ref : lastProcessedNoteRef;
      if (searchStartRef.current > 0 && notesToCheck.length > 0 &&
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
          let noteProgress = noteProgressMap.current.get(noteId);

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
            };
            noteProgressMap.current.set(noteId, noteProgress);
          }

          const timeSinceLastEval = currentTime - noteProgress.lastEvaluatedTime;
          const tickInterval = beatDurationMs;

          if (timeSinceLastEval >= tickInterval * 0.5) {
            const tickResult = evaluateTick(pitch.note!, note.pitch, difficulty);

            noteProgress.ticksEvaluated++;
            noteProgress.lastEvaluatedTime = currentTime;

            if (tickResult.isHit) {
              noteProgress.ticksHit++;

              const tickPoints = calculateTickPoints(tickResult.accuracy, note.isGolden, scoringMeta.pointsPerTick);
              const finalPoints = Math.max(1, Math.round(tickPoints));

              if (finalPoints > 0) {
                const newCombo = comboRef.current + 1;

                scoreDelta += finalPoints;
                comboUpdate = newCombo;
                maxComboUpdate = Math.max(maxComboRef.current, newCombo);
                comboRef.current = newCombo;
                maxComboRef.current = maxComboUpdate;
                hasPlayerUpdates = true;

                pendingEvents.push({
                  type: tickResult.accuracy > 0.95 ? 'perfect' : 'good',
                  displayType: tickResult.displayType,
                  points: finalPoints,
                  time: currentTime,
                });
              }
            } else {
              comboUpdate = 0;
              comboRef.current = 0;
              hasPlayerUpdates = true;

              pendingEvents.push({
                type: 'miss',
                displayType: 'Miss',
                points: 0,
                time: currentTime,
              });
            }
          }

          break;
        }

        // Check if we just passed a note
        if (currentTime > noteEnd) {
          const progress = noteProgressMap.current.get(noteId);

          if (progress && !progress.isComplete) {
            progress.isComplete = true;

            if (progress.ticksHit > 0) {
              notesHitDelta++;
            } else {
              notesMissedDelta++;
            }
            hasPlayerUpdates = true;

            if (progress.ticksHit >= progress.totalTicks) {
              progress.wasPerfect = true;
              perfectNotesDelta++;
            }
          }
        }
      }

      // Flush: single setPlayerState call with all accumulated deltas
      if (hasPlayerUpdates) {
        setPlayerState(prev => {
          const next = { ...prev };
          if (scoreDelta !== 0) next.score = prev.score + scoreDelta;
          if (comboUpdate !== undefined) next.combo = comboUpdate;
          if (maxComboUpdate !== undefined) next.maxCombo = Math.max(prev.maxCombo, maxComboUpdate);
          if (notesHitDelta > 0) next.notesHit = prev.notesHit + notesHitDelta;
          if (notesMissedDelta > 0) next.notesMissed = prev.notesMissed + notesMissedDelta;
          if (perfectNotesDelta > 0) next.perfectNotesCount = prev.perfectNotesCount + perfectNotesDelta;
          return next;
        });

        // Flush score events in a single batch
        if (pendingEvents.length > 0) {
          setScoreEventsState(prev => [
            ...prev.slice(-10),
            ...pendingEvents.slice(-10),
          ]);
        }
      }
    },
    [song, difficulty, timingData]
  );

  // Check if P1 hits notes - using duration-based scoring
  // Uses batched updatePlayer: accumulates all state deltas locally and flushes
  // a single updatePlayer call at the end, preventing stale-state race conditions
  // when multiple notes complete in the same frame.
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

      // Batch accumulator — all P1 state deltas collected here, flushed once at end
      let scoreDelta = 0;
      let comboUpdate: number | undefined;
      let maxComboUpdate: number | undefined;
      let notesHitDelta = 0;
      let notesMissedDelta = 0;
      let perfectNotesInc = 0;
      let hasPlayerUpdates = false;

      // Start from last processed index for O(1) forward progression
      // Reset to 0 if time went backward (e.g. seek)
      if (lastProcessedNoteRef.current > 0 && notesToCheck.length > 0 &&
          notesToCheck[lastProcessedNoteRef.current].startTime > currentTime) {
        lastProcessedNoteRef.current = 0;
      }
      for (let ni = lastProcessedNoteRef.current; ni < notesToCheck.length; ni++) {
        const note = notesToCheck[ni];
        const noteEnd = note.startTime + note.duration;
        const noteId = note.id || `note-${note.startTime}`;

        if (currentTime >= note.startTime && currentTime <= noteEnd) {
          lastProcessedNoteRef.current = ni;
          let noteProgress = noteProgressRef.current.get(noteId);

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
            };
            noteProgressRef.current.set(noteId, noteProgress);
          }

          const timeSinceLastEval = currentTime - noteProgress.lastEvaluatedTime;
          const tickInterval = beatDurationMs;

          if (timeSinceLastEval >= tickInterval * 0.5) {
            const tickResult = evaluateTick(pitch.note!, note.pitch, difficulty);

            noteProgress.ticksEvaluated++;
            noteProgress.lastEvaluatedTime = currentTime;

            // Write to ref — mutate in-place to avoid array spread allocation on every tick
            const perfRef = notePerformanceRef.current;
            let samples = perfRef.get(noteId);
            if (!samples) {
              samples = [];
              perfRef.set(noteId, samples);
            }
            samples.push({ time: currentTime, accuracy: tickResult.accuracy, hit: tickResult.isHit });
            if (samples.length > MAX_SAMPLES_PER_NOTE) {
              samples.splice(0, samples.length - MAX_SAMPLES_PER_NOTE);
            }

            // Throttled state sync: flush to React state at ~10Hz
            const now = performance.now();
            if (now - lastNotePerfSyncRef.current >= 100) {
              lastNotePerfSyncRef.current = now;
              setNotePerformance(new Map(perfRef));
            }

            if (tickResult.isHit) {
              noteProgress.ticksHit++;

              const tickPoints = calculateTickPoints(tickResult.accuracy, note.isGolden, scoringMeta.pointsPerTick);
              const finalPoints = Math.max(1, Math.round(tickPoints));

              if (finalPoints > 0) {
                const newCombo = p1ComboRef.current + 1;
                const isPerfect = tickResult.accuracy > 0.95;

                scoreDelta += finalPoints;
                comboUpdate = newCombo;
                maxComboUpdate = Math.max(p1MaxComboRef.current, newCombo);
                p1ComboRef.current = newCombo;
                p1MaxComboRef.current = maxComboUpdate;
                hasPlayerUpdates = true;

                setScoreEvents(prev => [
                  ...prev.slice(-10),
                  {
                    type: tickResult.accuracy > 0.95 ? 'perfect' : 'good',
                    displayType: tickResult.displayType,
                    points: finalPoints,
                    time: currentTime,
                  },
                ]);

                if (typeof window !== 'undefined') {
                  const particleX = window.innerWidth * 0.25;
                  const particleY = window.innerHeight * 0.4;

                  if (isPerfect && onPerfectHit) {
                    onPerfectHit(particleX, particleY);
                  }

                  if (note.isGolden && onGoldenNote) {
                    onGoldenNote(particleX, particleY);
                  }

                  if (newCombo > 0 && newCombo % 10 === 0 && onComboMilestone) {
                    onComboMilestone(newCombo, window.innerWidth / 2, window.innerHeight / 2);
                  }
                }

                if (isDuetMode) {
                  setP1ScoreEvents(prev => [
                    ...prev.slice(-10),
                    {
                      type: tickResult.accuracy > 0.95 ? 'perfect' : 'good',
                      displayType: tickResult.displayType,
                      points: finalPoints,
                      time: currentTime,
                    },
                  ]);
                }
              }
            } else {
              comboUpdate = 0;
              p1ComboRef.current = 0;
              hasPlayerUpdates = true;

              setScoreEvents(prev => [
                ...prev.slice(-10),
                { type: 'miss', displayType: 'Miss', points: 0, time: currentTime },
              ]);

              if (isDuetMode) {
                setP1ScoreEvents(prev => [
                  ...prev.slice(-10),
                  { type: 'miss', displayType: 'Miss', points: 0, time: currentTime },
                ]);
              }
            }
          }

          break;
        }

        if (currentTime > noteEnd) {
          const noteProgress = noteProgressRef.current.get(noteId);

          if (noteProgress && !noteProgress.isComplete) {
            noteProgress.isComplete = true;

            if (noteProgress.ticksHit > 0) {
              notesHitDelta++;
            } else {
              notesMissedDelta++;
            }
            hasPlayerUpdates = true;

            if (noteProgress.ticksHit >= noteProgress.totalTicks) {
              noteProgress.wasPerfect = true;
              p1PerfectNotesCountRef.current++;
              perfectNotesInc++;
            }
          }
        }
      }

      // Flush: single updatePlayer call with all accumulated deltas
      if (hasPlayerUpdates) {
        const updates: Partial<Player> = {};
        if (scoreDelta !== 0) updates.score = activePlayer.score + scoreDelta;
        if (comboUpdate !== undefined) updates.combo = comboUpdate;
        if (maxComboUpdate !== undefined) updates.maxCombo = maxComboUpdate;
        if (notesHitDelta > 0) updates.notesHit = activePlayer.notesHit + notesHitDelta;
        if (notesMissedDelta > 0) updates.notesMissed = activePlayer.notesMissed + notesMissedDelta;
        // Update live accuracy whenever hit/miss counts change
        if (notesHitDelta > 0 || notesMissedDelta > 0) {
          const totalNotes = (activePlayer.notesHit + notesHitDelta) + (activePlayer.notesMissed + notesMissedDelta);
          updates.accuracy = totalNotes > 0
            ? Math.round(((activePlayer.notesHit + notesHitDelta) / totalNotes) * 1000) / 10
            : 0;
        }
        updatePlayer(activePlayer.id, updates);

        // Sync perfectNotesCount to state so useGameLoop's ref picks it up at next render.
        // This only fires on note-complete (rare), not every tick, so it's cheap.
        if (perfectNotesInc > 0) {
          setP1PerfectNotesCount(p1PerfectNotesCountRef.current);
        }
      }
    },
    [song, difficulty, updatePlayer, timingData, isDuetMode, onPerfectHit, onGoldenNote, onComboMilestone]
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
        p2StateRef,
        setP2State,
        setP2ScoreEvents,
        'p2-note'
      );
    },
    [isDuetMode, timingData, checkPlayerNoteHits]
  );



  return {
    scoreEvents,
    p1ScoreEvents,
    p2ScoreEvents,
    notePerformance,
    p2State,
    p2DetectedPitch,
    p1PerfectNotesCount,
    setP2DetectedPitch,
    checkNoteHits,
    checkP2NoteHits,
    resetScoring,
  };
}
