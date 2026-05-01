import { Difficulty } from '@/types/game';

// Re-export types from pass-the-mic-screen for backward compatibility
export type { PassTheMicPlayer, PassTheMicSegment } from '@/components/game/pass-the-mic-screen';

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
};
