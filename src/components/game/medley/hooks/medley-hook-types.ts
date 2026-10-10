/**
 * Medley Contest — Hook type definitions (R7 extraction).
 *
 * Public props interface (re-exported by the medley-game-hook.ts
 * orchestrator for import-path stability), the per-note performance
 * sample type, and the hook's full return shape.  Type-level only.
 */

import type { Note, LyricLine, Song, Difficulty } from '@/types/game';
import type { useMultiPitchDetector } from '@/hooks/use-multi-pitch-detector';
import type {
  MedleyPlayer, MedleySong, MedleySettings, SnippetMatchup,
  MedleyGamePhase, MedleyRoundResult, MedleyScoringEvent,
  VoiceModifier, MedleyHighlight, TeamBonusResult,
} from '../medley-types';

// ===================== PROPS =====================

export interface MedleyGameScreenProps {
  players: MedleyPlayer[];
  songs: MedleySong[];
  settings: MedleySettings;
  matchups: SnippetMatchup[];
  /** @deprecated Pass for forward-compat; currently unused by hook */
  _seriesHistory?: MedleyRoundResult[];
  onRoundComplete: (_result: MedleyRoundResult, _updatedPlayers: MedleyPlayer[]) => void;
  onEndGame: () => void;
  /**
   * Regenerates the snippet list for the NEXT round (Fix 7): must return a
   * prepared MedleySong[] with DIFFERENT songs than the current round
   * (whenever the pool allows) and swap it into the party store / the
   * screen's `songs` state. Returning null falls back to replaying the
   * current round's songs.
   */
  onPrepareNextRoundSongs?: () => Promise<MedleySong[] | null>;
}

// ===================== RETURN TYPE =====================

/** One recorded performance sample (per note, optionally per player). */
export type MedleyNotePerfSample = { time: number; accuracy: number; hit: boolean; sungPitch?: number | null; playerColor?: string };

export interface MedleyGameState {
  // Phase
  phase: MedleyGamePhase;
  transitionCount: number;

  // Current snippet
  currentSnippet: MedleySong | null;
  currentSnippetIdx: number;
  snippetNotes: Note[];
  snippetLyrics: LyricLine[];

  // Audio
  audioRef: React.RefObject<HTMLAudioElement | null>;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  /** Separate video ref for audio fallback — NOT shared with GameBackground */
  fallbackVideoRef: React.RefObject<HTMLVideoElement | null>;
  audioUrl: string | null;
  audioError: string | null;
  /** Item 5/7: media ready flag — drives the snippet loading overlay. */
  mediaReady: boolean;
  /** Item 5: preparing the next round's snippets — drives its loading overlay. */
  isPreparingNextRound: boolean;
  currentTimeMs: number;
  isPlaying: boolean;
  /** Effective (possibly repositioned) snippet start — absolute-time consumers must use this. */
  effectiveStartMs: number;
  restoredSong: Song | null;

  // Players (display copy)
  playersDisplay: MedleyPlayer[];

  // Scoring helpers
  snippetProgress: number;
  totalProgress: number;
  currentMatchup: SnippetMatchup | null;
  currentLyricLine: LyricLine | null;

  // Feature #5: Scoring events for UI popups
  lastScoringEvents: MedleyScoringEvent[];

  // Unified HUD: per-note performance samples for the NoteHighway
  // (colored tick fills + wrong-singing ghost bars, as in other modes).
  // Medley (user item 6.1): samples also carry the singer's color and sung
  // pitch so wrong notes render per player in that player's base color.
  notePerformance: Map<string, MedleyNotePerfSample[]>;

  // Multi-player strips (Fix 6): the SAME samples keyed by player → note,
  // so each player's strip renders hits/misses in their own single color.
  notePerformanceByPlayer: Map<string, Map<string, MedleyNotePerfSample[]>>;

  // Feature #9: Dynamic difficulty
  currentDynamicDifficulty: Difficulty | null;

  // Feature #10: Elimination
  isEliminationMode: boolean;
  eliminationOrder: string[];
  activePlayerCount: number;
  totalPlayerCount: number;
  /** True when exactly 2 players remain in elimination mode (final face-off) */
  finalFaceOff: boolean;

  // Feature #15: Voice modifier
  activeModifier: VoiceModifier;
  modifierJustRevealed: boolean;

  // Feature #16: Mystery mode
  isMysteryMode: boolean;
  mysteryReveal: boolean;
  mysteryRevealSong: MedleySong | null;

  // Feature #17: Highlights
  highlights: MedleyHighlight[];

  // Feature #18: Team bonuses
  synergyTriggered: boolean;
  comebackTriggered: boolean;
  comebackTeamId: number | null;
  /** Whether comeback multiplier is active during the current snippet (set before snippet starts) */
  comebackActiveTeamId: number | null;
  /** Full team bonus result data for results screens */
  teamBonusResult: TeamBonusResult;

  // Pitch detection
  multiPitch: ReturnType<typeof useMultiPitchDetector>;

  // Team
  isTeam: boolean;

  // Display settings (from useGameSettings)
  showBackgroundVideo: boolean;
  useAnimatedBackground: boolean;

  // Actions
  handleStart: () => Promise<void>;
  /** Start the next round directly (no intro screen) — user item 6.2 / Fix 7 */
  handleNextRound: () => Promise<void>;
  handleEndEarly: () => void;
  handleRoundComplete: () => void;
  handleShowFinalResults: () => void;
  forceRender: () => void;
}
