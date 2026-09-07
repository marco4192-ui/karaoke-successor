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

// NOTE: Next.js dev mode (and standalone builds) load route handlers and the
// custom server (server.ts → socketio-server) through SEPARATE module graphs.
// A plain `new EventEmitter()` here would create one instance per graph, and
// events emitted from API routes would never reach the Socket.IO server.
// Storing the instance on globalThis guarantees a single shared bus.
const globalWithBus = globalThis as typeof globalThis & { __karaokeMobileEvents?: EventEmitter };

export const mobileEvents: EventEmitter = globalWithBus.__karaokeMobileEvents ?? new EventEmitter();
globalWithBus.__karaokeMobileEvents = mobileEvents;

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

/** Emitted when a Companion sends a remote control command via HTTP POST
 *  (remote_command) — the Socket.IO server forwards it to the desktop host
 *  so the command arrives instantly even when the desktop relies on its
 *  WebSocket connection (it stops HTTP-polling getcommands while connected). */
export interface RemoteCommandEvent {
  command: CompanionCommandEvent['command'];
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
  REMOTE_COMMAND: 'remote-command',
} as const;
