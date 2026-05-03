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
  'rate-my-song-game',
]);

// Note: NoteProgress, ScoringMetadata, StartOptions, and LibrarySettings have been
// removed from this file. Their canonical definitions live in:
// - NoteProgress / ScoringMetadata → @/lib/game/scoring.ts
// - StartOptions / LibrarySettings → @/components/screens/library/types.ts
