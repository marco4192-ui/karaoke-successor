/**
 * Types and constants shared between the scoring hook and its pure-function helpers.
 */

import type { Note, LyricLine } from '@/types/game';
import type { NoteProgress, ScoringMetadata } from '@/lib/game/scoring';
import type { ChallengeModifier } from '@/lib/game/player-progression';
import type { Player, Difficulty } from '@/types/game';

// ---------------------------------------------------------------------------
// Score events & visual feedback
// ---------------------------------------------------------------------------

/** Score event type for visual feedback */
export interface ScoreEvent {
  displayType: 'Perfect' | 'Great' | 'Good' | 'Okay' | 'Miss';
  points: number;
  time: number;
  player?: 'P1' | 'P2';
  /** Whether this event represents a blind karaoke bonus award */
  isBlindBonus?: boolean;
}

/** Note performance sample for visual display modes */
export interface NotePerformanceSample {
  time: number;
  accuracy: number;
  hit: boolean;
}

// ---------------------------------------------------------------------------
// Player scoring state
// ---------------------------------------------------------------------------

/** Player state for additional players (P2, P3, P4) not in the main store */
export interface PlayerScoringState {
  score: number;
  combo: number;
  maxCombo: number;
  notesHit: number;
  notesMissed: number;
  perfectNotesCount: number;
  goldenNotesHit: number;
  /** Accumulated blind karaoke bonus points */
  blindBonusPoints: number;
}

// ---------------------------------------------------------------------------
// Timing data used by scoring
// ---------------------------------------------------------------------------

/** Timing data structure (subset used by scoring) */
export interface TimingDataForScoring {
  allNotes: Array<Note & { lineIndex: number; line: LyricLine }>;
  p1Notes?: Array<Note & { lineIndex: number; line: LyricLine }>;
  p2Notes?: Array<Note & { lineIndex: number; line: LyricLine }>;

  scoringMetadata?: ScoringMetadata;
  p1ScoringMetadata?: ScoringMetadata;
  p2ScoringMetadata?: ScoringMetadata;

  beatDuration: number;
}

// ---------------------------------------------------------------------------
// Scoring pass result (pure-function output)
// ---------------------------------------------------------------------------

/** Result returned by runScoringPass() */
export interface ScoringPassResult {
  scoreDelta: number;
  comboUpdate: number | undefined;
  maxComboUpdate: number | undefined;
  notesHitDelta: number;
  notesMissedDelta: number;
  perfectNotesDelta: number;
  goldenNotesDelta: number;
  hasUpdates: boolean;
  pendingEvents: ScoreEvent[];
  /** Accumulated blind karaoke bonus points this pass */
  blindBonusDelta: number;
  /** P1 visual tracking: the active note's ID and last tick result for performance samples */
  activeNoteId: string | undefined;
  activeNoteIsGolden: boolean;
  lastTickAccuracy: number;
  lastTickHit: boolean;
}

// ---------------------------------------------------------------------------
// Hook options & return type
// ---------------------------------------------------------------------------

/** Options accepted by useNoteScoring() */
export interface UseNoteScoringOptions {
  song: {
    id: string;
    lyrics: LyricLine[];
  } | null;
  difficulty: Difficulty;
  players: Player[];
  timingData: TimingDataForScoring | null;
  isDuetMode: boolean;
  beatDuration: number; // Kept for interface compat; actual value from timingData
  /** Whether the current game section is a blind karaoke section */
  isBlindSection?: boolean;
  updatePlayer: (_playerId: string, _updates: Partial<Player>) => void;
  /** Challenge modifiers (e.g. perfect_only, golden_only from challenge modes) */
  challengeModifiers?: ChallengeModifier[];
  /** Optional callbacks for visual effects */
  onPerfectHit?: (_x: number, _y: number) => void;
  onGoldenNote?: (_x: number, _y: number) => void;
  onComboMilestone?: (_combo: number, _x: number, _y: number) => void;
}

/** Return type of useNoteScoring() */
export interface UseNoteScoringReturn {
  /** Score events for visual feedback (combined P1+P2 events) */
  scoreEvents: ScoreEvent[];

  /** Note performance for visual display modes */
  notePerformance: Map<string, NotePerformanceSample[]>;
  /** P2 note performance (separate map so P1 hits don't show on P2's highway) */
  p2NotePerformance: Map<string, NotePerformanceSample[]>;
  /** P1 perfect notes count (all ticks hit) — updated via ref for 60fps accuracy */
  p1PerfectNotesCount: number;
  /** P2 state (for duet mode) */
  p2State: PlayerScoringState;

  /** Detected pitch for P2 */
  p2DetectedPitch: number | null;

  setP2DetectedPitch: (_pitch: number | null) => void;
  /** Functions */
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

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Maximum number of performance samples stored per note.
 *  Prevents unbounded memory growth during long songs while retaining
 *  enough data for visual feedback modes (heat-map / accuracy graph). */
export const MAX_SAMPLES_PER_NOTE = 100;

export const DEFAULT_PLAYER_SCORING_STATE: PlayerScoringState = {
  score: 0,
  combo: 0,
  maxCombo: 0,
  notesHit: 0,
  notesMissed: 0,
  perfectNotesCount: 0,
  goldenNotesHit: 0,
  blindBonusPoints: 0,
};
