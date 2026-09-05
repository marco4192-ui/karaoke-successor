/**
 * Shared EventEmitter for Socket.IO integration.
 *
 * The Next.js API routes (POST handlers) emit events here when game state
 * changes. The Socket.IO server (started in server.ts) subscribes to these
 * events and pushes them to connected Companion clients in real time.
 *
 * This module bridges the gap between the Next.js request/response world
 * and the persistent Socket.IO connection world — both live in the same
 * Node.js process and share this EventEmitter.
 */
import { EventEmitter } from 'events';

export const mobileEvents = new EventEmitter();

// Increase max listeners — with 50 companions each potentially subscribing,
// the default limit of 10 would trigger warnings.
mobileEvents.setMaxListeners(100);

// ─── Event Types ───

/** Emitted when Desktop POSTs a new game state to /api/mobile */
export interface GamestateUpdateEvent {
  gameState: Record<string, unknown>;
}

/** Emitted when Desktop pushes a difficulty change */
export interface DifficultyUpdateEvent {
  difficulty: 'easy' | 'medium' | 'hard';
}

/** Emitted when a Companion sends a remote control command via WebSocket */
export interface CompanionCommandEvent {
  command: {
    type: string;
    data?: unknown;
    timestamp: number;
    fromClientId: string;
    fromClientName: string;
  };
}

/** Emitted when a Companion sends pitch data via WebSocket */
export interface CompanionPitchEvent {
  clientId: string;
  pitch: {
    frequency: number;
    clarity: number;
    volume: number;
    timestamp: number;
  };
}

/** Emitted when Desktop wants to push a dialog/overlay state to Companions */
export interface DesktopDialogEvent {
  dialog: string | null;
  data?: Record<string, unknown>;
}

// ─── Event Names ───
export const EVENTS = {
  GAMESTATE_UPDATE: 'gamestate-update',
  DIFFICULTY_UPDATE: 'difficulty-update',
  COMPANION_COMMAND: 'companion-command',
  COMPANION_PITCH: 'companion-pitch',
  DESKTOP_DIALOG: 'desktop-dialog',
  PARTY_LEAVE: 'party-leave',
  PAUSE_STATE: 'pause-state',
} as const;
