import { Difficulty } from '@/types/game';

// Backward-compatible aliases — some consumers still reference the old names.
/** @deprecated Use PtmPlayer instead */
export type PassTheMicPlayer = PtmPlayer;
/** @deprecated Use PtmSegment instead */
export type PassTheMicSegment = PtmSegment;

export interface PtmPlayer {
  id: string;
  name: string;
  avatar?: string;
  color: string;
  score: number;
  notesHit: number;
  notesMissed: number;
  combo: number;
  maxCombo: number;
  isActive: boolean;
  segmentsSung: number;
  micId?: string;
}

export interface PtmSegment {
  startTime: number;
  endTime: number;
  playerId: string | null;
}

export interface PassTheMicSettings {
  segmentDuration: number;
  difficulty: Difficulty;
  micId: string;
  micName: string;
  randomSwitches?: boolean;
  sharedMicId?: string | null;
  sharedMicName?: string | null;
}

export type GamePhase = 'intro' | 'countdown' | 'playing' | 'transitioning' | 'song-results' | 'series-results';

export const DEFAULT_SETTINGS: PassTheMicSettings = {
  segmentDuration: 30,
  difficulty: 'medium',
  micId: 'default',
  micName: 'Standard',
  randomSwitches: true,
};
