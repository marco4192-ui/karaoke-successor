import type { Song, QueueItem } from '@/types/game';

/** Queue item received from the companion/mobile API. */
export interface CompanionQueueItem {
  id: string;
  songId: string;
  songTitle: string;
  songArtist: string;
  addedBy: string;
  addedAt: number;
  companionCode: string;
  status: 'pending' | 'playing' | 'completed';
  playerId?: string;
  playerName?: string;
  partnerId?: string;
  partnerName?: string;
  gameMode?: 'single' | 'duel' | 'duet';
  /** R39/P4+P5: Gesangs-Geräte — Companion-App vs. Desktop-Mikrofon. */
  playerMicSource?: 'companion' | 'microphone';
  partnerMicSource?: 'companion' | 'microphone';
  playerMicName?: string;
  partnerMicName?: string;
  /** R39/P7: Entry mirrors the desktop's LOCAL queue (syncdesktopqueue) —
   *  filtered out by desktop consumers (already in zustand), rendered by
   *  the companion queue view. */
  isDesktop?: boolean;
}

/** A local or companion queue item merged into a single list for display. */
export type UnifiedQueueItem = QueueItem & {
  isFromCompanion: boolean;
  status: 'pending' | 'playing' | 'completed';
};

export interface QueueScreenProps {
  onPlayFromQueue?: (
    _song: Song,
    gameMode: 'single' | 'duel' | 'duet',
    players: { id: string; name: string }[],
  ) => void;
  /** When true, automatically starts playing the first queue item (Ctrl-Q) */
  autoPlayNext?: boolean;
}
