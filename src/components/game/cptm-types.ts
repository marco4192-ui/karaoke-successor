/**
 * Companion Pass-the-Mic (CPtM) — Shared Types
 *
 * Like Pass-the-Mic but every player sings through their own Companion App.
 * Segments are score-based (equal points per segment). Player switching is
 * signaled via the Companion App (blink + "Your Turn"), NOT on the main screen.
 */

import { Difficulty } from '@/types/game';

export interface CptmPlayer {
  id: string;
  name: string;
  avatar?: string;
  color: string;
  score: number;
  notesHit: number;
  notesMissed: number;
  combo: number;
  maxCombo: number;
  segmentsSung: number;
}

export interface CptmSegment {
  startTime: number;
  endTime: number;
  playerId: string | null;
}

export interface CptmSettings {
  difficulty: Difficulty;
  segmentDuration?: number;
}

export const DEFAULT_CPTM_SETTINGS: CptmSettings = {
  difficulty: 'medium',
  segmentDuration: 30,
};

export type GamePhase = 'intro' | 'countdown' | 'playing' | 'song-results' | 'series-results';

/** Per-player result for a single CPtM round (song). */
export interface CptmRoundResult {
  songTitle: string;
  songArtist: string;
  playedAt: number;
  playerScores: Record<string, { score: number; notesHit: number; notesMissed: number; maxCombo: number; segmentsSung: number }>;
}
