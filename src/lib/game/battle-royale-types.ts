// Battle Royale – shared types, interfaces, and constants

import { TournamentPlayer } from './tournament';
import type { Difficulty } from '@/types/game';
import type { NoteShapeStyle, NoteDisplayStyle } from '@/lib/game/note-utils';

// ==================== TYPES ====================

export type PlayerType = 'microphone' | 'companion';

export interface BattleRoyalePlayer extends TournamentPlayer {
  score: number;
  accuracy: number; // Running average accuracy (0.0 to 1.0)
  totalEvaluatedTicks: number; // Total ticks evaluated this round
  notesHit: number;
  notesMissed: number;
  currentCombo: number;
  maxCombo: number;
  eliminated: boolean;
  eliminationRound: number | null;
  playerType: PlayerType;
  microphoneId?: string;
  connectionCode?: string;
  lastPing?: number;
}

export interface MedleySnippet {
  songId: string;
  songName: string;
  duration: number; // seconds allocated to this snippet
}

export interface SongVoteOption {
  songId: string;
  songName: string;
  votes: number;
  votedPlayerIds: string[];
}

export interface BattleRoyaleRound {
  roundNumber: number;
  songId: string;
  songName: string;
  duration: number; // Duration of this round in seconds
  startTime: number | null;
  endTime: number | null;
  eliminatedPlayerId: string | null;
  roundType: 'full' | 'short' | 'medley' | 'grand-finale';
  // Bounty info
  bountyPlayerId: string | null;
  bountyClaimed: boolean;
  bountyClaimedById: string | null;
  // Effective difficulty at time of round
  effectiveDifficulty: Difficulty;
  // Score deltas for trend tracking (playerId -> points gained this round)
  roundScoreDeltas: Record<string, number>;
}

export interface RoundHighlight {
  roundNumber: number;
  eliminatedPlayerId: string;
  eliminatedPlayerName: string;
  topScorerId: string;
  topScorerName: string;
  topScoreDelta: number;
  bountyClaimed: boolean;
  bountyClaimedById: string | null;
}

export interface BattleRoyaleGameStats {
  highestCombo: number;
  highestComboPlayerId: string | null;
  longestSurvival: number; // in rounds
  longestSurvivalPlayerId: string | null;
  bestSingleRoundDelta: number;
  bestSingleRoundDeltaPlayerId: string | null;
  bestSingleRoundDeltaRound: number;
  totalNotesHit: number;
  totalNotesMissed: number;
  roundHighlights: RoundHighlight[];
}

export interface HallOfFameEntry {
  playerId: string;
  playerName: string;
  playerAvatar?: string;
  playerColor: string;
  playerType: PlayerType;
  wins: number;
  totalGames: number;
  bestScore: number;
  longestWinStreak: number;
  currentWinStreak: number;
  averageSurvivalRounds: number;
  lastWinDate: number;
}

export type BattleRoyaleStatus =
  | 'setup'
  | 'countdown'
  | 'voting'
  | 'playing'
  | 'elimination'
  | 'grand-finale-intro'
  | 'completed';

export interface BattleRoyaleGame {
  id: string;
  players: BattleRoyalePlayer[];
  rounds: BattleRoyaleRound[];
  currentRound: number;
  status: BattleRoyaleStatus;
  winner: BattleRoyalePlayer | null;
  settings: BattleRoyaleSettings;
  createdAt: number;
  songQueue: string[];
  connectionCode: string;
  connectedCompanions: number;

  // Song no-repeat protection (#3)
  recentlyPlayedSongIds: string[];

  // Previous round scores for trend arrows (#9)
  // Snapshot of each player's score at the START of the current round
  previousRoundScores: Record<string, number>;

  // Bounty system (#6)
  bountyPlayerId: string | null;

  // Grand Finale (#4)
  isGrandFinale: boolean;
  finalWins: Record<string, number>; // playerId -> wins in final rounds
  grandFinaleIntroShown: boolean;

  // Dynamic difficulty (#7)
  effectiveDifficulty: Difficulty;

  // Medley snippet tracking (#1)
  medleySnippetList: MedleySnippet[];
  currentSnippetIndex: number;

  // Song voting (#2)
  voteOptions: SongVoteOption[];

  // Spectator predictions (#11)
  spectatorPredictions: Record<string, string | null>; // spectatorId -> predicted eliminated player id
  correctPredictions: Record<string, number>; // spectatorId -> correct prediction count

  // Game statistics (#12)
  gameStats: BattleRoyaleGameStats;
}

export interface BattleRoyaleSettings {
  roundDuration: number;
  finalRoundDuration: number;
  randomSongs: boolean;
  medleyMode: boolean;
  medleySnippets: number;
  difficulty: Difficulty;
  // TODO: Wire eliminationAnimation setting to UI toggle
  eliminationAnimation: boolean;

  // Song selection (#2)
  songSelection: 'random' | 'vote';

  // No-repeat protection (#3)
  noRepeatProtection: boolean;
  noRepeatCount: number;

  // Grand Finale (#4)
  grandFinaleBestOf: 1 | 3 | 5;

  // Bounty system (#6)
  bountyEnabled: boolean;
  bountyMultiplier: number;

  // Dynamic difficulty (#7)
  escalatingDifficulty: boolean;

  // Shrinking timer (#8)
  shrinkingTimer: boolean;
  shrinkFactor: number; // seconds to reduce per round
  minRoundDuration: number;

  // Visual settings
  noteShapeStyle: NoteShapeStyle;
  noteDisplayStyle: NoteDisplayStyle;
  showNoteHighway: boolean;
  showVideoBackground: boolean;
  countdownDuration: number; // seconds (default 3)
}

// ==================== CONSTANTS ====================

export const MAX_LOCAL_MIC_PLAYERS = 4;
export const MAX_COMPANION_PLAYERS = 20;
export const MAX_BATTLE_ROYALE_PLAYERS = MAX_LOCAL_MIC_PLAYERS + MAX_COMPANION_PLAYERS;
export const MIN_BATTLE_ROYALE_PLAYERS = 2;

export const DEFAULT_BATTLE_ROYALE_SETTINGS: BattleRoyaleSettings = {
  roundDuration: 60,
  finalRoundDuration: 120,
  randomSongs: true,
  medleyMode: false,
  medleySnippets: 3,
  difficulty: 'medium',
  eliminationAnimation: true,

  // #2 Song voting
  songSelection: 'random',

  // #3 No-repeat protection
  noRepeatProtection: true,
  noRepeatCount: 10,

  // #4 Grand Finale
  grandFinaleBestOf: 1,

  // #6 Bounty system
  bountyEnabled: true,
  bountyMultiplier: 1.5,

  // #7 Dynamic difficulty
  escalatingDifficulty: false,

  // #8 Shrinking timer
  shrinkingTimer: false,
  shrinkFactor: 5,
  minRoundDuration: 30,

  // Visual settings
  noteShapeStyle: 'rounded' as NoteShapeStyle,
  noteDisplayStyle: 'classic' as NoteDisplayStyle,
  showNoteHighway: true,
  showVideoBackground: true,
  // DO-NOT-CHANGE: 5 seconds to give audio/video time to buffer before playing.
  // Battle Royale uses external media files (Tauri filesystem/IndexedDB) that
  // need more buffering time than in-memory assets. Reducing below 5 may
  // cause visible video delay at round start.
  countdownDuration: 5,
};

export const DIFFICULTY_ORDER: Difficulty[] = ['easy', 'medium', 'hard'];
export const ESCALATION_INTERVAL = 3; // rounds between difficulty increases
