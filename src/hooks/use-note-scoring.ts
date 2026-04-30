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
export interface ScoreEvent {
  type: string;
  displayType: 'Perfect' | 'Great' | 'Good' | 'Okay' | 'Miss';
  points: number;
  time: number;
}

// Note performance sample for visual display modes
export interface NotePerformanceSample {
  time: number;
  accuracy: number;
  hit: boolean;
}

// Player state for additional players (P2, P3, P4) not in the main store
export interface PlayerScoringState {
  score: number;
  combo: number;
  maxCombo: number;
  notesHit: number;
  notesMissed: number;
}

// Timing data structure (subset used by scoring)
export interface TimingDataForScoring {
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
  isPartyMode?: boolean; // 4-player mode
  beatDuration: number;
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
    isPartyMode = false,
    beatDuration, 
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

  
  // Detected pitches for P2-P4
  const [p2DetectedPitch, setP2DetectedPitch] = useState<number | null>(null);


  // Refs for note progress tracking (one map per player)
  const noteProgressRef = useRef<Map<string, NoteProgress>>(new Map());
  const p2NoteProgressRef = useRef<Map<string, NoteProgress>>(new Map());

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
    setP2DetectedPitch(null);
    noteProgressRef.current.clear();
    p2NoteProgressRef.current.clear();
    
  }, []);

  // Generic function to check note hits for any player
  // Uses stateRef to always get the latest player state (avoids stale closure)
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
      const playerState = stateRef.current; // Always read latest from ref

      for (const note of notesToCheck) {
        const noteEnd = note.startTime + note.duration;
        const noteId = note.id || `${noteIdPrefix}-${note.startTime}`;

        // Check if we're in the note's time window
        if (currentTime >= note.startTime && currentTime <= noteEnd) {
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
                const newCombo = playerState.combo + 1;

                setPlayerState(prev => ({
                  ...prev,
                  score: prev.score + finalPoints,
                  combo: newCombo,
                  maxCombo: Math.max(prev.maxCombo, newCombo),
                }));

                setScoreEventsState(prev => [
                  ...prev.slice(-10),
                  {
                    type: tickResult.accuracy > 0.95 ? 'perfect' : 'good',
                    displayType: tickResult.displayType,
                    points: finalPoints,
                    time: currentTime,
                  },
                ]);
              }
            } else {
              setPlayerState(prev => ({ ...prev, combo: 0 }));

              setScoreEventsState(prev => [
                ...prev.slice(-10),
                {
                  type: 'miss',
                  displayType: 'Miss',
                  points: 0,
                  time: currentTime,
                },
              ]);
            }
          }

          break;
        }

        // Check if we just passed a note
        if (currentTime > noteEnd) {
          const noteId = note.id || `${noteIdPrefix}-${note.startTime}`;
          const noteProgress = noteProgressMap.current.get(noteId);

          if (noteProgress && !noteProgress.isComplete) {
            noteProgress.isComplete = true;

            if (noteProgress.ticksHit > 0) {
              setPlayerState(prev => ({ ...prev, notesHit: prev.notesHit + 1 }));
            } else {
              setPlayerState(prev => ({ ...prev, notesMissed: prev.notesMissed + 1 }));
            }

            if (noteProgress.ticksHit >= noteProgress.totalTicks) {
              noteProgress.wasPerfect = true;
            }
          }
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
      const notesToCheck = (isDuetMode || isPartyMode) && timingData?.p1Notes ? timingData.p1Notes : timingData?.allNotes;
      if (!notesToCheck || notesToCheck.length === 0) return;

      const scoringMeta = (isDuetMode || isPartyMode) ? timingData?.p1ScoringMetadata : timingData?.scoringMetadata;
      if (!scoringMeta) return;

      const beatDurationMs = timingData?.beatDuration || 500;

      // Batch accumulator — all P1 state deltas collected here, flushed once at end
      let scoreDelta = 0;
      let comboUpdate: number | undefined;
      let maxComboUpdate: number | undefined;
      let notesHitDelta = 0;
      let notesMissedDelta = 0;
      let hasPlayerUpdates = false;

      for (const note of notesToCheck) {
        const noteEnd = note.startTime + note.duration;
        const noteId = note.id || `note-${note.startTime}`;

        if (currentTime >= note.startTime && currentTime <= noteEnd) {
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

            // Write to ref (no state update = no GC)
            const perfRef = notePerformanceRef.current;
            const samples = perfRef.get(noteId) || [];
            const trimmed = samples.length >= MAX_SAMPLES_PER_NOTE
              ? samples.slice(-MAX_SAMPLES_PER_NOTE + 1)
              : samples;
            perfRef.set(noteId, [...trimmed, { time: currentTime, accuracy: tickResult.accuracy, hit: tickResult.isHit }]);

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
                const newCombo = activePlayer.combo + 1;
                const isPerfect = tickResult.accuracy > 0.95;

                scoreDelta += finalPoints;
                comboUpdate = newCombo;
                maxComboUpdate = Math.max(activePlayer.maxCombo, newCombo);
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

                if (isDuetMode || isPartyMode) {
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
              hasPlayerUpdates = true;

              setScoreEvents(prev => [
                ...prev.slice(-10),
                { type: 'miss', displayType: 'Miss', points: 0, time: currentTime },
              ]);

              if (isDuetMode || isPartyMode) {
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
          const noteId = note.id || `note-${note.startTime}`;
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
        updatePlayer(activePlayer.id, updates);
      }
    },
    [song, difficulty, updatePlayer, timingData, isDuetMode, isPartyMode, beatDuration, onPerfectHit, onGoldenNote, onComboMilestone]
  );

  // Check P2 notes (duet/party mode)
  const checkP2NoteHits = useCallback(
    (currentTime: number, pitch: { frequency: number | null; note: number | null; clarity: number; volume: number; isSinging?: boolean }) => {
      if (!isDuetMode && !isPartyMode) return;
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
    [isDuetMode, isPartyMode, timingData, checkPlayerNoteHits]
  );



  return {
    scoreEvents,
    p1ScoreEvents,
    p2ScoreEvents,
    notePerformance,
    p2State,
    p2DetectedPitch,
    setP2DetectedPitch,
    checkNoteHits,
    checkP2NoteHits,
    resetScoring,
  };
}
