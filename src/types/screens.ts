// Screen types for the main app router
export type Screen = 
  | 'home' 
  | 'library' 
  | 'game' 
  | 'party' 
  | 'character' 
  | 'queue' 
  | 'mobile' 
  | 'results' 
  | 'highscores' 
  | 'import' 
  | 'settings' 
  | 'jukebox' 
  | 'achievements' 
  | 'dailyChallenge' 
  | 'tournament' 
  | 'tournament-game' 
  | 'battle-royale' 
  | 'battle-royale-game' 
  | 'editor' 
  | 'online'
  | 'companion-singalong'
  | 'companion-singalong-game'
  | 'medley';

// Note shape style for theming
export type NoteShapeStyle = 'rounded' | 'sharp' | 'pill' | 'diamond';

// Note progress tracking for duration-based scoring
export interface NoteProgress {
  noteId: string;
  totalTicks: number;
  ticksHit: number;
  ticksEvaluated: number;
  isGolden: boolean;
  lastEvaluatedTime: number;
  isComplete: boolean;
  wasPerfect: boolean; // All ticks hit
}

// Scoring metadata
export interface ScoringMetadata {
  totalNoteTicks: number;
  goldenNoteTicks: number;
  normalNoteTicks: number;
  perfectScoreBase: number;
  pointsPerTick: number;
}

// Song start options
export interface StartOptions {
  difficulty: 'easy' | 'medium' | 'hard';
  mode: 'single' | 'duel' | 'duet' | string;
  players: string[];
  partyMode?: string;
  songSelectionMode?: 'random' | 'poll' | 'medley';
  songGenre?: string;
  songLanguage?: string;
  pollSongs?: import('@/types/game').Song[];
  pollVotes?: Record<string, string[]>;
  pollWinner?: import('@/types/game').Song;
  medleyGenre?: string;
  medleyLanguage?: string;
}

// Library settings
export interface LibrarySettings {
  sortBy: 'title' | 'artist' | 'difficulty' | 'rating' | 'dateAdded';
  sortOrder: 'asc' | 'desc';
  filterDifficulty: 'easy' | 'medium' | 'hard' | 'all';
  filterGenre: string;
  filterLanguage: string;
  filterDuet: boolean;
}

// Navigation button props
export interface NavButtonProps {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}
