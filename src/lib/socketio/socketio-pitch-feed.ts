'use client';

/**
 * Desktop-side Socket.IO pitch feed (singleton).
 *
 * Owns ONE dedicated Socket.IO connection that subscribes to live companion
 * pitch pushes via 'host:pitch-subscribe'. It deliberately NEVER registers as
 * the command host ('host:register') so it can never steal command routing
 * from use-remote-control / use-global-remote-control.
 *
 * Data flow:
 *   Phone (YIN @ ~30 Hz) ──companion:pitch──► Socket.IO server
 *        └─ writes latestPitchData (same store the HTTP batch writes to —
 *           HTTP-polling consumers keep working as automatic fallback)
 *   Server ──pitch──► this feed ──► subscribers (game modes)
 *
 * Consumers subscribe via subscribePitchFeed() and treat the HTTP polling
 * they already have as a watchdog fallback: skip fetching while socket
 * frames arrive fresh (< 400 ms).
 */

import { io, Socket } from 'socket.io-client';

// ─── Types ───

/** One pitch frame as pushed by a companion phone (same shape the HTTP
 *  batch_pitch handler stores in latestPitchData). */
export interface SocketPitchFrame {
  frequency: number | null;
  note: number | null;
  clarity: number;
  volume: number;
  timestamp: number;
  isSinging?: boolean;
  singingConfidence?: number;
}

/** Push event delivered to subscribers — mirrors the getpitch HTTP entry
 *  shape { clientId, code, data, profile } for easy consumer adaptation. */
export interface SocketPitchEvent {
  clientId: string;
  code: string;
  data: SocketPitchFrame;
  profile: { id: string; name: string; color: string; avatar?: string; createdAt?: number } | null;
}

type PitchFeedListener = (event: SocketPitchEvent) => void;

interface PitchFeedState {
  socket: Socket;
  listeners: Set<PitchFeedListener>;
  /** Latest event per clientId (for freshness checks / catch-up reads). */
  latest: Map<string, SocketPitchEvent>;
}

// globalThis guard: in Next.js dev mode the module can be evaluated through
// separate module graphs — the singleton must stay unique (same pattern as
// socketio-events.ts / mobile-state.ts).
const globalWithFeed = globalThis as typeof globalThis & {
  __karaokePitchFeed?: PitchFeedState;
};

/** Create (or return) the singleton feed. The socket connects lazily on the
 *  first subscribePitchFeed() call and stays alive for the app's lifetime. */
function getPitchFeed(): PitchFeedState {
  if (globalWithFeed.__karaokePitchFeed) return globalWithFeed.__karaokePitchFeed;

  const socket = io(typeof window !== 'undefined' ? window.location.origin : '', {
    path: '/socket.io',
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 10000,
  });

  const feed: PitchFeedState = {
    socket,
    listeners: new Set<PitchFeedListener>(),
    latest: new Map<string, SocketPitchEvent>(),
  };

  socket.on('connect', () => {
    // (Re-)subscribe to pitch pushes. After a reconnect the server has a new
    // socket instance without our subscription, so this must run every time.
    socket.emit('host:pitch-subscribe');
  });

  socket.on('pitch', (event: SocketPitchEvent) => {
    if (!event || typeof event.clientId !== 'string' || !event.data) return;
    feed.latest.set(event.clientId, event);
    for (const listener of feed.listeners) {
      try {
        listener(event);
      } catch {
        // A broken listener must never take down the feed or other listeners.
      }
    }
  });

  globalWithFeed.__karaokePitchFeed = feed;
  return feed;
}

// ─── Public API ───

/** Subscribe to live companion pitch pushes. Returns an unsubscribe function. */
export function subscribePitchFeed(listener: PitchFeedListener): () => void {
  const feed = getPitchFeed();
  feed.listeners.add(listener);
  return () => {
    feed.listeners.delete(listener);
  };
}

/** Latest pushed event for a clientId (null if none arrived yet). */
export function getLatestSocketPitch(clientId: string): SocketPitchEvent | null {
  return globalWithFeed.__karaokePitchFeed?.latest.get(clientId) ?? null;
}

/** Whether the pitch feed socket is currently connected. */
export function isPitchFeedConnected(): boolean {
  return globalWithFeed.__karaokePitchFeed?.socket.connected ?? false;
}
