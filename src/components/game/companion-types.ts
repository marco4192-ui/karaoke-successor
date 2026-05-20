/**
 * Companion Sing-A-Long — Shared Types
 */

import type { Difficulty } from '@/types/game';

export interface CompanionPlayer {
  id: string;
  name: string;
  avatar?: string;
  color: string;
  score: number;
  notesHit: number;
  notesMissed: number;
  combo: number;
  maxCombo: number;
  turnCount: number;
}

export interface CompanionRoundResult {
  songTitle: string;
  songArtist: string;
  playedAt: number;
  playerScores: Record<string, { score: number; notesHit: number; notesMissed: number; maxCombo: number }>;
}

export interface CompanionSingAlongSettings {
  difficulty: Difficulty;
  minTurnDuration?: number;
  maxTurnDuration?: number;
  blinkWarning?: number;
}

export const DEFAULT_SETTINGS: CompanionSingAlongSettings = {
  difficulty: 'medium',
  minTurnDuration: 15,
  maxTurnDuration: 45,
  blinkWarning: 3,
};

export type GamePhase = 'intro' | 'countdown' | 'playing' | 'switching' | 'song-results' | 'series-results';

/** Generate a random interval between min and max turn durations (in ms) */
export function randomTurnDuration(settings?: { minTurnDuration?: number; maxTurnDuration?: number }): number {
  const min = (settings?.minTurnDuration ?? DEFAULT_SETTINGS.minTurnDuration ?? 15) * 1000;
  const max = (settings?.maxTurnDuration ?? DEFAULT_SETTINGS.maxTurnDuration ?? 45) * 1000;
  return min + Math.random() * (max - min);
}
