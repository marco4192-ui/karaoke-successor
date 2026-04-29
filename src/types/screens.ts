// Canonical Screen type for the main app router
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
  | 'pass-the-mic'
  | 'pass-the-mic-game'
  | 'companion-singalong'
  | 'companion-singalong-game'
  | 'medley'
  | 'medley-game'
  | 'editor'
  | 'online'
  | 'party-setup'
  | 'song-voting'
  | 'missing-words'
  | 'missing-words-game'
  | 'blind'
  | 'blind-game'
  | 'rate-my-song'
  | 'rate-my-song-game'
  | 'rate-my-song-rating'
  | 'rate-my-song-results';

// Screens where the navbar should be hidden (immersive / fullscreen experiences)
export const IMMERSIVE_SCREENS: Set<Screen> = new Set([
  'editor',
  'game',
  'tournament-game',
  'pass-the-mic-game',
  'battle-royale-game',
  'companion-singalong-game',
  'medley-game',
  'missing-words-game',
  'blind-game',
]);

// Note shape style for theming — canonical definition in note-utils.tsx
export type { NoteShapeStyle } from '@/lib/game/note-utils';

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
