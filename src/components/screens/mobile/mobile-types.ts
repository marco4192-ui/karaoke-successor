// ===================== MOBILE CLIENT TYPES =====================

export type MobileView = 'home' | 'profile' | 'songs' | 'queue' | 'mic' | 'results' | 'jukebox' | 'remote';

export interface MobileProfile {
  id: string;
  name: string;
  avatar?: string;
  color: string;
  createdAt: number;
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

export interface GameResults {
  songId: string;
  songTitle: string;
  songArtist: string;
  score: number;
  accuracy: number;
  maxCombo: number;
  rating: string;
  playedAt: number;
}

export interface QueueItem {
  id: string;
  songId: string;
  songTitle: string;
  songArtist: string;
  addedBy: string;
  status: string;
  companionCode?: string;
  partnerId?: string;
  partnerName?: string;
  gameMode?: 'single' | 'duel' | 'duet';
}

export interface JukeboxWishlistItem {
  songId: string;
  songTitle: string;
  songArtist: string;
  addedBy: string;
}

export interface SingalongTurn {
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
  singalongTurn: SingalongTurn | null;
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
