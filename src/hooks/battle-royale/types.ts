/**
 * Shared public types for the Battle Royale game hook (use-battle-royale-game).
 */
import type {
  getBattleRoyaleStats,
  BattleRoyaleGame,
  BattleRoyalePlayer,
  TieBreakState,
} from '@/lib/game/battle-royale';
import type { Song, Note, LyricLine, PitchDetectionResult } from '@/types/game';
import type { PitchStats } from '@/lib/game/note-utils';
import type { BrNotePerformanceSample } from './note-performance';

export interface UseBattleRoyaleGameParams {
  game: BattleRoyaleGame;
  songs: Song[];
  onUpdateGame: (_game: BattleRoyaleGame) => void;
}

export interface UseBattleRoyaleGameReturn {
  stats: ReturnType<typeof getBattleRoyaleStats>;
  sortedPlayers: BattleRoyalePlayer[];
  activePlayers: BattleRoyalePlayer[];
  currentSong: Song | null;
  currentTime: number;
  roundTimeLeft: number;
  snippetTimeLeft: number | null; // #1 Medley: time left in current snippet
  currentSnippetIndex: number; // #1 Medley
  totalSnippets: number; // #1 Medley
  audioRef: React.RefObject<HTMLAudioElement | null>;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  /** Base audio volume (master volume × per-song loudness gain) that ALL BR fades run toward/from. */
  baseVolumeRef: React.MutableRefObject<number>;
  handleRoundEnd: () => void;
  handleStartRound: () => void;
  handleVoteSubmit: (_playerId: string, _songIndex: number) => void;
  handleStartRoundAfterVote: () => void;
  handleGrandFinaleIntroComplete: () => void;
  setCurrentTime: (_time: number) => void;
  /** R19 tie-break showdown (active while tied players battle the 10s
   *  extension) — drives the amber ⚔️ HUD + frame. */
  tieBreak: TieBreakState | null;
  pitchStats: PitchStats | null;
  visibleNotes: Array<Note & { lineIndex: number; line: LyricLine }>;
  playerPitchMap: Map<string, PitchDetectionResult | null>; // Per-player pitch data
  multiPitchErrors: Map<string, string>; // Per-player pitch errors
  /** Per-player note performance samples (ghost notes): playerId → noteKey → samples. */
  brNotePerformance: Map<string, Map<string, BrNotePerformanceSample[]>>;
  songProgress: number; // 0-100
  countdown: number;
  eliminationPhase: null | 'eliminating' | 'survivor-flash';
  /** Seconds until the next mid-round elimination (full-song rhythm rounds
   *  only; null when no rhythm elimination is scheduled). Drives the HUD
   *  badge so the configured interval is VISIBLE while playing. During a
   *  tie-break showdown it counts down the SHOWDOWN deadline instead. */
  nextEliminationIn: number | null;
  /** Latest mid-round elimination notice ({name} + id) for the non-blocking
   *  HUD banner; auto-clears after a few seconds. byCoinFlip = the showdown
   *  ended in a coin flip (R19). */
  midRoundEliminationNotice: { id: string; name: string; byCoinFlip?: boolean } | null;
}
