// ===================== MOBILE CLIENT TYPES =====================

// Re-export shared types from canonical API definitions
export type { MobileProfile, GameResults } from '@/app/api/mobile/mobile-types';

export type MobileView =
  // Mirror views — auto-switch based on desktop screen
  | 'mirror'
  // Companion-own views (no desktop equivalent)
  | 'songs'
  | 'mic'
  | 'profile'
  // Legacy views still accessible from within mirror views
  | 'queue'
  | 'results'
  | 'jukebox';

/**
 * Maps a desktop Screen name to the mobile mirror behaviour.
 * Returns the mobile view identifier (used within the mirror view)
 * or null if the mirror should show a fallback (home). */
export type MirrorScreenId =
  | 'home'
  | 'library'
  | 'queue'
  | 'game'
  | 'settings'
  | 'highscores'
  | 'achievements'
  | 'dailyChallenge'
  | 'party'
  | 'jukebox'
  | 'results'
  | 'party-setup'
  | 'setup-waiting';  // tournament, medley, blind, etc. setup screens

/** Maps desktop Screen → MirrorScreenId */
export function screenToMirrorId(desktopScreen: string | undefined): MirrorScreenId {
  if (!desktopScreen) return 'home';

  // Immersive game screens
  if (desktopScreen.endsWith('-game')) return 'game';
  if (desktopScreen === 'game') return 'game';

  // Direct 1:1 mappings
  const directMap: Record<string, MirrorScreenId> = {
    home: 'home',
    library: 'library',
    queue: 'queue',
    settings: 'settings',
    highscores: 'highscores',
    achievements: 'achievements',
    dailyChallenge: 'dailyChallenge',
    jukebox: 'jukebox',
    results: 'results',
    party: 'party',
    'party-setup': 'party',
    profile: 'home',          // profile has no mobile mirror
    import: 'library',       // import redirects to library
    mobile: 'home',          // mobile management screen → home
    editor: 'home',          // editor has no mobile equivalent
    online: 'home',          // online → home for now
    'song-voting': 'home',
  };

  if (desktopScreen in directMap) return directMap[desktopScreen];

  // All other setup screens (tournament, medley, blind, battle-royale, etc.)
  return 'setup-waiting';
}

export interface MobileSong {
  id: string;
  title: string;
  artist: string;
  duration: number;
  genre?: string;
  language?: string;
  coverImage?: string;
}

type QueueItemStatus = 'pending' | 'playing' | 'completed';

export interface QueueItem {
  id: string;
  songId: string;
  songTitle: string;
  songArtist: string;
  addedBy: string;
  status: QueueItemStatus;
  companionCode?: string;
  partnerId?: string;
  partnerName?: string;
  gameMode?: 'single' | 'duel' | 'duet';
  difficulty?: 'easy' | 'normal' | 'hard';
  playerMicSource?: 'companion' | 'microphone';
  partnerMicSource?: 'companion' | 'microphone';
  duetPartsSwapped?: boolean;
}

export interface JukeboxWishlistItem {
  id: string;
  songId: string;
  songTitle: string;
  songArtist: string;
  addedBy: string;
  addedAt?: number;
  companionCode?: string;
  coverImage?: string;
  duration?: number;
}

export interface CompanionScoreEntry {
  profileId: string;
  name: string;
  avatar?: string;
  color: string;
  score: number;
}

interface SingalongTurn {
  profileId: string | null;
  nextProfileId: string | null;
  countdown: number | null; // 3, 2, 1 when switching, null when actively singing
  isActive: boolean;
}

export interface GameState {
  currentSong: { title: string; artist: string } | null;
  isPlaying: boolean;
  songEnded: boolean;
  queueLength: number;
  isAdPlaying: boolean;
  gameMode: string | null;
  singalongTurn: SingalongTurn | null;
  cptmTurn: SingalongTurn | null;
  // #10 Tournament match ID for spectator voting
  tournamentMatchId: string | null;
  // Live leaderboard: companion player scores during singalong
  companionScores: CompanionScoreEntry[] | null;
  // Current screen name from the desktop app
  currentScreen?: string;
}

export interface PitchData {
  frequency: number | null;
  note: number | null;
  volume: number;
}

export type GameMode = 'single' | 'duel' | 'duet';

export const PROFILE_COLORS = [
  '#06B6D4', '#8B5CF6', '#EC4899', '#F59E0B',
  '#10B981', '#EF4444', '#3B82F6', '#F97316',
] as const;
