// ===================== MOBILE CLIENT TYPES =====================

// Re-export shared types from canonical API definitions
export type { MobileProfile, GameResults } from '@/app/api/mobile/mobile-types';

export type MobileView =
  // Mirror view — auto-switch based on desktop screen
  | 'mirror'
  // Companion-own views (no desktop equivalent)
  | 'songs'
  | 'mic'
  | 'profile';

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
  | 'song-voting'
  | 'ptm-intro'
  | 'medley-intro'
  | 'battle-intro'
  | 'competitive-intro'
  | 'rate-my-song-intro'
  | 'profile';  // character/profile management

/** Maps desktop Screen → MirrorScreenId */
export function screenToMirrorId(desktopScreen: string | undefined): MirrorScreenId {
  if (!desktopScreen) return 'home';

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
    'party-setup': 'party-setup',
    profile: 'profile',
    import: 'library',
    mobile: 'home',
    editor: 'home',
    online: 'home',
    'song-voting': 'song-voting',
  };

  if (desktopScreen in directMap) return directMap[desktopScreen];

  // Generic game screens
  if (desktopScreen.endsWith('-game')) return 'game';
  if (desktopScreen === 'game') return 'game';

  // All other screens → home
  return 'home';
}

export interface MobileSong {
  id: string;
  title: string;
  artist: string;
  duration: number;
  genre?: string;
  language?: string;
  coverImage?: string;
  isDuet?: boolean;
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
  playerId?: string;
  playerName?: string;
  partnerId?: string;
  partnerName?: string;
  gameMode?: 'single' | 'duel' | 'duet';
  difficulty?: 'easy' | 'medium' | 'hard';
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
  // Party setup: which game mode is being configured
  partyGameMode?: string | null;
  // Party voting: songs available for voting
  votingSongs?: Array<{ id: string; title: string; artist: string; duration: number; coverImage?: string }>;
  // Party setup: library-selected song awaiting confirmation on companion
  partyLibrarySong?: { id: string; title: string; artist: string } | null;
  // Whether party mode is active on the desktop (for showing Leave Party button)
  isPartyModeActive?: boolean;
  // Desktop leave/pause dialog state (synced 1:1 with desktop)
  desktopDialog?: 'party-leave' | 'song-pause' | 'song-end-early' | null;
  // Who initiated the pause (for overlay display)
  pauseInitiator?: string | null;
  // PTM/CPTM game phase: 'intro' when showing the ready screen, 'playing' when singing
  ptmPhase?: 'intro' | 'countdown' | 'playing' | 'transitioning' | 'song-results' | 'series-results' | null;
  // PTM intro data for companion mirror of the ready screen
  ptmIntroData?: {
    songTitle?: string;
    songArtist?: string;
    startPlayerName?: string;
    startPlayerAvatar?: string;
    startPlayerColor?: string;
    playerCount?: number;
    isMedley?: boolean;
    medleySnippetCount?: number;
    roundNumber?: number;
    sharedMicName?: string;
    mediaLoaded?: boolean;
    partyGameMode?: string;
  } | null;
  // Viral-hit song IDs synced from desktop (for library filter)
  viralSongIds?: string[];
  // Global difficulty setting from desktop (for companion library)
  difficulty?: 'easy' | 'medium' | 'hard';
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
