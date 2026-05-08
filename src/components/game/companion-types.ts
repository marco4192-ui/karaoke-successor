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
}

export const DEFAULT_SETTINGS: CompanionSingAlongSettings = {
  difficulty: 'medium',
};

export type GamePhase = 'intro' | 'countdown' | 'playing' | 'switching' | 'song-results' | 'series-results';

/** Generate a random interval between 20 and 45 seconds (in ms) */
export function randomTurnDuration(): number {
  return (20 + Math.random() * 25) * 1000; // 20,000 – 45,000 ms
}
