// Tournament Mode - Types & Interfaces
// Shared type definitions for the tournament system

export type BracketType = 'winners' | 'losers' | 'grand_finals';

export interface TournamentPlayer {
  id: string;
  name: string;
  avatar?: string;
  color: string;
  eliminated: boolean;
  seed: number;
  /** #4 Double Elimination: number of losses (0 = fresh, 1 = in losers bracket, 2 = eliminated) */
  lossCount: number;
}

export interface TournamentMatch {
  id: string;
  round: number;
  position: number;
  /** #4 Which bracket this match belongs to */
  bracketType: BracketType;
  player1: TournamentPlayer | null;
  player2: TournamentPlayer | null;
  winner: TournamentPlayer | null;
  loser: TournamentPlayer | null;
  score1: number;
  score2: number;
  completed: boolean;
  isBye: boolean; // True if player advances without playing (odd number of players)
  // Extended match statistics for tournament summaries & Hall of Fame
  accuracy1?: number;
  accuracy2?: number;
  maxCombo1?: number;
  maxCombo2?: number;
  songTitle?: string;
  songArtist?: string;
  isTiebreak?: boolean; // True if this match was decided by tiebreak rules
  /** #4 True if this is the Grand Finals reset match (GF2) */
  isReset?: boolean;
}

export interface TournamentBracket {
  id: string;
  name: string;
  players: TournamentPlayer[];
  matches: TournamentMatch[];
  currentRound: number;
  totalRounds: number; // Winners bracket rounds
  /** #4 Total rounds in the losers bracket (2*totalRounds - 2, or 0 for single elim) */
  losersTotalRounds: number;
  champion: TournamentPlayer | null;
  status: 'setup' | 'in_progress' | 'completed';
  createdAt: number;
  settings: TournamentSettings;
  /** #4 True if GF1 was won by the LB champion -> GF2 (reset) is needed */
  grandFinalsResetNeeded: boolean;
}

export interface TournamentSettings {
  maxPlayers: 2 | 4 | 8 | 16 | 32;
  songDuration: number; // in seconds (60 for short mode, full song duration otherwise)
  randomSongs: boolean;
  difficulty: 'easy' | 'medium' | 'hard';
  // #4 Double-Elimination
  tournamentType: 'single' | 'double';
  // #3 Tiebreak
  tiebreakMode: 'coinflip' | 'accuracy' | 'combo' | 'goldenmic';
  // #6 Dynamic difficulty (optional, per user request)
  dynamicDifficulty: boolean;
  // #8 Song selection mode
  songSelectionMode: 'random' | 'vote';
  // #9 Seeding
  seedingMode: 'random' | 'strength';
  // #5 Genre/Language filter
  filterGenre: string;
  filterLanguage: string;
}
