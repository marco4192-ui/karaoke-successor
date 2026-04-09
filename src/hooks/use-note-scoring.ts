'use client';

import { useCallback, useRef, useState } from 'react';
import { DIFFICULTY_SETTINGS, Difficulty, Note, LyricLine } from '@/types/game';
import {
  evaluateTick,
  calculateTickPoints,
  calculateNoteCompletionBonus,
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
  p3Notes?: Array<Note & { lineIndex: number; line: LyricLine }>;
  p4Notes?: Array<Note & { lineIndex: number; line: LyricLine }>;
  scoringMetadata?: ScoringMetadata;
  p1ScoringMetadata?: ScoringMetadata;
  p2ScoringMetadata?: ScoringMetadata;
  p3ScoringMetadata?: ScoringMetadata;
  p4ScoringMetadata?: ScoringMetadata;
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
  p3ScoreEvents: ScoreEvent[];
  p4ScoreEvents: ScoreEvent[];
  // Note performance for visual display modes
  notePerformance: Map<string, NotePerformanceSample[]>;
  // P2-P4 states (for duet/party modes)
  p2State: PlayerScoringState;
  p3State: PlayerScoringState;
  p4State: PlayerScoringState;
  // Detected pitches for P2-P4
  p2DetectedPitch: number | null;
  p3DetectedPitch: number | null;
  p4DetectedPitch: number | null;
  setP2DetectedPitch: (pitch: number | null) => void;
  setP3DetectedPitch: (pitch: number | null) => void;
  setP4DetectedPitch: (pitch: number | null) => void;
  // Functions
  checkNoteHits: (
    currentTime: number,
    pitch: { frequency: number | null; note: number | null; clarity: number; volume: number; isSinging?: boolean }
  ) => void;
  checkP2NoteHits: (
    currentTime: number,
    pitch: { frequency: number | null; note: number | null; clarity: number; volume: number; isSinging?: boolean }
  ) => void;
  checkP3NoteHits: (
    currentTime: number,
    pitch: { frequency: number | null; note: number | null; clarity: number; volume: number; isSinging?: boolean }
  ) => void;
  checkP4NoteHits: (
    currentTime: number,
    pitch: { frequency: number | null; note: number | null; clarity: number; volume: number; isSinging?: boolean }
  ) => void;
  resetScoring: () => void;
}

// Default player scoring state
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
  const [p3ScoreEvents, setP3ScoreEvents] = useState<ScoreEvent[]>([]);
  const [p4ScoreEvents, setP4ScoreEvents] = useState<ScoreEvent[]>([]);

  // Note performance tracking for visual display modes
  const [notePerformance, setNotePerformance] = useState<Map<string, NotePerformanceSample[]>>(new Map());

  // Additional player states (P2, P3, P4) - P1 uses the main store
  const [p2State, setP2State] = useState<PlayerScoringState>({ ...DEFAULT_PLAYER_SCORING_STATE });
  const [p3State, setP3State] = useState<PlayerScoringState>({ ...DEFAULT_PLAYER_SCORING_STATE });
  const [p4State, setP4State] = useState<PlayerScoringState>({ ...DEFAULT_PLAYER_SCORING_STATE });
  
  // Refs for P2-P4 states to avoid stale closures in checkPlayerNoteHits
  const p2StateRef = useRef(p2State);
  p2StateRef.current = p2State;
  const p3StateRef = useRef(p3State);
  p3StateRef.current = p3State;
  const p4StateRef = useRef(p4State);
  p4StateRef.current = p4State;
  
  // Detected pitches for P2-P4
  const [p2DetectedPitch, setP2DetectedPitch] = useState<number | null>(null);
  const [p3DetectedPitch, setP3DetectedPitch] = useState<number | null>(null);
  const [p4DetectedPitch, setP4DetectedPitch] = useState<number | null>(null);

  // Refs for note progress tracking (one map per player)
  const noteProgressRef = useRef<Map<string, NoteProgress>>(new Map());
  const p2NoteProgressRef = useRef<Map<string, NoteProgress>>(new Map());
  const p3NoteProgressRef = useRef<Map<string, NoteProgress>>(new Map());
  const p4NoteProgressRef = useRef<Map<string, NoteProgress>>(new Map());

  // Ref to always have the latest players array — prevents stale closure issues
  // when checkNoteHits is called from requestAnimationFrame
  const playersRef = useRef(players);
  playersRef.current = players;

  // Reset scoring state
  const resetScoring = useCallback(() => {
    setScoreEvents([]);
    setP1ScoreEvents([]);
    setP2ScoreEvents([]);
    setP3ScoreEvents([]);
    setP4ScoreEvents([]);
    setNotePerformance(new Map());
    setP2State({ ...DEFAULT_PLAYER_SCORING_STATE });
    setP3State({ ...DEFAULT_PLAYER_SCORING_STATE });
    setP4State({ ...DEFAULT_PLAYER_SCORING_STATE });
    setP2DetectedPitch(null);
    setP3DetectedPitch(null);
    setP4DetectedPitch(null);
    noteProgressRef.current.clear();
    p2NoteProgressRef.current.clear();
    p3NoteProgressRef.current.clear();
    p4NoteProgressRef.current.clear();
  }, []);

  // Generic function to check note hits for any player
  // Uses stateRef to always get the latest player state (avoids stale closure)
  const checkPlayerNoteHits = useCallback(
    (
      currentTime: number,
      pitch: { frequency: number | null; note: number | null; clarity: number; volume: number; isSinging?: boolean },
      playerIndex: number,
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

              const tickPoints = calculateTickPoints(tickResult.accuracy, note.isGolden, scoringMeta.pointsPerTick, difficulty);
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
              const bonusPoints = calculateNoteCompletionBonus(noteProgress, scoringMeta.pointsPerTick);

              if (bonusPoints > 0) {
                setPlayerState(prev => ({
                  ...prev,
                  score: prev.score + Math.floor(bonusPoints),
                }));

                setScoreEventsState(prev => [
                  ...prev.slice(-10),
                  {
                    type: 'perfect',
                    displayType: 'Perfect',
                    points: Math.floor(bonusPoints),
                    time: currentTime,
                  },
                ]);
              }
            }
          }
        }
      }
    },
    [song, difficulty, timingData]
  );

  // Check if P1 hits notes - using duration-based scoring
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

            setNotePerformance(prev => {
              const newMap = new Map(prev);
              const samples = newMap.get(noteId) || [];
              newMap.set(noteId, [...samples, { time: currentTime, accuracy: tickResult.accuracy, hit: tickResult.isHit }]);
              return newMap;
            });

            if (tickResult.isHit) {
              noteProgress.ticksHit++;

              const tickPoints = calculateTickPoints(tickResult.accuracy, note.isGolden, scoringMeta.pointsPerTick, difficulty);
              const finalPoints = Math.max(1, Math.round(tickPoints));

              if (finalPoints > 0) {
                const newCombo = activePlayer.combo + 1;
                const isPerfect = tickResult.accuracy > 0.95;

                updatePlayer(activePlayer.id, {
                  score: activePlayer.score + finalPoints,
                  combo: newCombo,
                  maxCombo: Math.max(activePlayer.maxCombo, newCombo),
                });

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
              updatePlayer(activePlayer.id, { combo: 0 });

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
              updatePlayer(activePlayer.id, { notesHit: activePlayer.notesHit + 1 });
            } else {
              updatePlayer(activePlayer.id, { notesMissed: activePlayer.notesMissed + 1 });
            }

            if (noteProgress.ticksHit >= noteProgress.totalTicks) {
              noteProgress.wasPerfect = true;
              const bonusPoints = calculateNoteCompletionBonus(noteProgress, scoringMeta.pointsPerTick);

              if (bonusPoints > 0) {
                updatePlayer(activePlayer.id, { score: activePlayer.score + Math.floor(bonusPoints) });

                setScoreEvents(prev => [
                  ...prev.slice(-10),
                  { type: 'perfect', displayType: 'Perfect', points: Math.floor(bonusPoints), time: currentTime },
                ]);
              }
            }
          }
        }
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

  // Check P3 notes (party mode only)
  const checkP3NoteHits = useCallback(
    (currentTime: number, pitch: { frequency: number | null; note: number | null; clarity: number; volume: number; isSinging?: boolean }) => {
      if (!isPartyMode) return;
      checkPlayerNoteHits(
        currentTime,
        pitch,
        2,
        timingData?.p3Notes,
        timingData?.p3ScoringMetadata,
        p3NoteProgressRef,
        p3StateRef,
        setP3State,
        setP3ScoreEvents,
        'p3-note'
      );
    },
    [isPartyMode, timingData, checkPlayerNoteHits]
  );

  // Check P4 notes (party mode only)
  const checkP4NoteHits = useCallback(
    (currentTime: number, pitch: { frequency: number | null; note: number | null; clarity: number; volume: number; isSinging?: boolean }) => {
      if (!isPartyMode) return;
      checkPlayerNoteHits(
        currentTime,
        pitch,
        3,
        timingData?.p4Notes,
        timingData?.p4ScoringMetadata,
        p4NoteProgressRef,
        p4StateRef,
        setP4State,
        setP4ScoreEvents,
        'p4-note'
      );
    },
    [isPartyMode, timingData, checkPlayerNoteHits]
  );

  return {
    scoreEvents,
    p1ScoreEvents,
    p2ScoreEvents,
    p3ScoreEvents,
    p4ScoreEvents,
    notePerformance,
    p2State,
    p3State,
    p4State,
    p2DetectedPitch,
    p3DetectedPitch,
    p4DetectedPitch,
    setP2DetectedPitch,
    setP3DetectedPitch,
    setP4DetectedPitch,
    checkNoteHits,
    checkP2NoteHits,
    checkP3NoteHits,
    checkP4NoteHits,
    resetScoring,
  };
}
