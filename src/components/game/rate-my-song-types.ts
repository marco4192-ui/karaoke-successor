/**
 * Rate my Song — types, interfaces, and shared constants
 */

import type { PlayerProfile } from '@/types/game';
import type { RateMySongChallenge } from '@/lib/game/rate-my-song-ranking';

// ===================== TYPES =====================

export type RateMySongPlayMode = 'single' | 'duel' | 'duet';
export type RateMySongDuration = 'short' | 'normal';

export interface RateMySongSettings {
  playMode: RateMySongPlayMode;
  duration: RateMySongDuration;
  songId: string;
  seriesRounds?: 1 | 3 | 5 | 7;
  categoriesEnabled?: boolean;
  challengesEnabled?: boolean;
  bettingEnabled?: boolean;
  anonymousRating?: boolean;
}

export interface RateMySongRating {
  playerId: string;
  playerName: string;
  playerColor: string;
  rating: number;
  categories?: {
    voice: number;
    stage: number;
    rhythm: number;
    entertainment: number;
  };
  challengeMastered?: boolean;
  betPoints?: number;
}

export interface RateMySongResult {
  songTitle: string;
  songArtist: string;
  ratings: RateMySongRating[];
  averageRating: number;
}

// ===================== PROPS INTERFACES =====================

export interface RateMySongSetupScreenProps {
  profiles: PlayerProfile[];
  onStart: (_settings: RateMySongSettings, _playerIds: string[]) => void;
  onBack: () => void;
}

export interface RateMySongRatingScreenProps {
  songTitle: string;
  songArtist: string;
  singingPlayers: Array<{ id: string; name: string; color: string }>;
  allProfiles: PlayerProfile[];
  categoriesEnabled?: boolean;
  anonymousRating?: boolean;
  challengesEnabled?: boolean;
  currentChallenge?: RateMySongChallenge | null;
  onSubmit: (_ratings: RateMySongRating[]) => void;
  onBack: () => void;
}

export interface RateMySongResultsScreenProps {
  result: RateMySongResult;
  songId?: string;
  songGenre?: string;
  categoriesEnabled?: boolean;
  challengesEnabled?: boolean;
  seriesRound?: number;
  seriesTotalRounds?: number;
  onPlayAgain: () => void;
  onEnd: () => void;
}

export interface RateMySongSeriesResultsScreenProps {
  seriesHistory: RateMySongRating[][];
  onEnd: () => void;
}

// ===================== SHARED CONSTANTS =====================

// Category weights
export const CATEGORY_WEIGHTS = { voice: 0.3, stage: 0.2, rhythm: 0.25, entertainment: 0.25 } as const;
export const CATEGORY_KEYS = ['voice', 'stage', 'rhythm', 'entertainment'] as const;
export type CategoryKey = (typeof CATEGORY_KEYS)[number];

export function calcWeightedTotal(categories: { voice: number; stage: number; rhythm: number; entertainment: number }): number {
  return (
    categories.voice * CATEGORY_WEIGHTS.voice +
    categories.stage * CATEGORY_WEIGHTS.stage +
    categories.rhythm * CATEGORY_WEIGHTS.rhythm +
    categories.entertainment * CATEGORY_WEIGHTS.entertainment
  );
}
