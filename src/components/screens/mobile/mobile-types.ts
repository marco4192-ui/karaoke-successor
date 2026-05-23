// ===================== MOBILE CLIENT TYPES =====================

// Re-export shared types from canonical API definitions
export type { MobileProfile, GameResults } from '@/app/api/mobile/mobile-types';

export type MobileView = 'home' | 'profile' | 'songs' | 'queue' | 'mic' | 'results' | 'jukebox' | 'remote';

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
  gameMode: 'standard' | 'pass-the-mic' | 'companion-singalong' | 'companion-pass-the-mic' | 'medley' | 'missing-words' | 'duel' | 'blind' | 'tournament' | 'battle-royale' | 'duet' | 'online' | 'rate-my-song' | null;
  singalongTurn: SingalongTurn | null;
  cptmTurn: SingalongTurn | null;
  // #10 Tournament match ID for spectator voting
  tournamentMatchId: string | null;
  // Live leaderboard: companion player scores during singalong
  companionScores: CompanionScoreEntry[] | null;
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
