import { NextRequest } from 'next/server';
import type { MobileClient, PitchData, MobileProfile, QueueItem, RemoteControlState, MobileGameState, GameResults, SongSummary, HostProfile } from './mobile-types';

// ===================== ADMIN PIN AUTH =====================
// Configurable game PIN for protecting privileged endpoints.
// Set via POST 'setpin' action or environment variable GAME_PIN.
// If no PIN is configured, all requests are allowed (backward compatible).
let adminPin: string | null = process.env.GAME_PIN || null;

/**
 * Check if a request is authorized for privileged actions.
 * Returns true if authorized, false if not.
 * - If no PIN is configured, always returns true (backward compatible).
 * - Checks for 'pin' header or 'pin' query parameter.
 */
export function requireAuth(req: NextRequest): boolean {
  if (!adminPin) return true; // No PIN configured → allow all
  const headerPin = req.headers.get('pin');
  const queryPin = req.nextUrl.searchParams.get('pin');
  const providedPin = headerPin || queryPin;
  return providedPin === adminPin;
}

// ===================== PERSISTENT PROFILE CLEANUP =====================
// Periodically clean up persistentProfileByIp entries older than 24 hours
let persistentProfileCleanupTimer: ReturnType<typeof setInterval> | null = null;
if (typeof globalThis !== 'undefined') {
  persistentProfileCleanupTimer = setInterval(() => {
    const now = Date.now();
    const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
    for (const [ip, entry] of persistentProfileByIp) {
      if (now - entry.storedAt > TTL_MS) {
        persistentProfileByIp.delete(ip);
      }
    }
  }, 60 * 60 * 1000); // Check every hour
  // Store for HMR cleanup
  const originals = globalThis as Record<string, unknown>;
  originals.__persistentProfileCleanup = () => {
    if (persistentProfileCleanupTimer) clearInterval(persistentProfileCleanupTimer);
  };
}

// ===================== GLOBAL STATE =====================
// Shared state for mobile clients (in-memory, resets on server restart)
export const mobileClients = new Map<string, MobileClient>();
export const connectionCodes = new Map<string, string>(); // code -> clientId
export const profileToClient = new Map<string, string>(); // profileId -> clientId (for duplicate detection)

// Persistent profile by IP — survives client cleanup so profiles can be restored
// after long standby periods where the server cleaned up the client session.
// Keyed by IP, stores the last known profile for each IP address.
export const persistentProfileByIp = new Map<string, { profile: MobileProfile; storedAt: number }>(); // ip -> { profile, storedAt }

// Latest pitch data from all clients (for PC to poll)
export const latestPitchData: Map<string, PitchData> = new Map();

// Mutable state container — allows importing modules to reassign properties
export const mutableState = {
  // Game state to sync to mobile clients
  gameState: {
    currentSong: null,
    isPlaying: false,
    currentTime: 0,
    songEnded: false,
    isAdPlaying: false,
    gameMode: null,
    singalongTurn: null,
  } as MobileGameState,

  // Queue for song requests from mobile clients
  songQueue: [] as QueueItem[],

  // Jukebox wishlist
  jukeboxWishlist: [] as QueueItem[],

  // Game results for social features
  lastGameResults: null as GameResults | null,

  // Remote Control State - Only ONE client can have control at a time
  remoteControlState: {
    lockedBy: null,
    lockedByName: null,
    lockedAt: null,
    pendingCommands: [],
  } as RemoteControlState,

  // Song Library - Cached songs from main app for companion clients
  songLibrary: [] as SongSummary[],

  // Host Profiles - Characters from main app for companion to choose from
  // (Cannot use localStorage in API route - must store in server memory)
  hostProfiles: [] as HostProfile[],
};

// ===================== HELPER FUNCTIONS =====================
// Extract client IP from request headers (works with proxies and Tauri)
export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp;
  return '127.0.0.1'; // Default for Tauri/localhost
}

export function generateConnectionCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing chars
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function getUniqueConnectionCode(): string {
  let code = generateConnectionCode();
  let attempts = 0;
  while (connectionCodes.has(code) && attempts < 100) {
    code = generateConnectionCode();
    attempts++;
  }
  return code;
}

// ===================== CLIENT CLEANUP =====================
// Single source of truth for removing a client from all state stores.
// Fixes: missing profileToClient.delete, missing remoteControlState reset,
// missing songQueue purge that were inconsistent across 5 call sites.
export interface RemoveClientOptions {
  purgeQueue?: boolean;       // remove their songs from songQueue
  persistProfile?: boolean;   // save profile to persistentProfileByIp (for inactive cleanup)
}

export function removeClient(
  clientId: string,
  options: RemoveClientOptions = {}
): MobileClient | null {
  const client = mobileClients.get(clientId);
  if (!client) return null;

  // Persist profile before cleanup (for inactive timeout)
  if (options.persistProfile && client.profile && client.clientIp) {
    persistentProfileByIp.set(client.clientIp, { profile: client.profile, storedAt: Date.now() });
  }

  // Remove from all index maps
  connectionCodes.delete(client.connectionCode);
  if (client.profile) {
    profileToClient.delete(client.profile.id);
  }
  mobileClients.delete(clientId);
  latestPitchData.delete(clientId);

  // Release remote control if this client held it
  if (mutableState.remoteControlState.lockedBy === clientId) {
    mutableState.remoteControlState = { lockedBy: null, lockedByName: null, lockedAt: null, pendingCommands: [] };
  }

  // Optionally purge queue
  if (options.purgeQueue) {
    mutableState.songQueue = mutableState.songQueue.filter(q => q.companionCode !== client.connectionCode);
  }

  return client;
}

// Clean up inactive clients (older than 5 minutes without activity)
export function cleanupInactiveClients() {
  const now = Date.now();
  const timeout = 5 * 60 * 1000; // 5 minutes

  const inactiveIds: string[] = [];
  mobileClients.forEach((client, clientId) => {
    if (now - client.lastActivity > timeout) {
      inactiveIds.push(clientId);
    }
  });
  // Remove outside the forEach to avoid modifying Map during iteration
  for (const id of inactiveIds) {
    removeClient(id, { persistProfile: true, purgeQueue: true });
  }
}

// ===================== HELPER =====================
export function getQueueByCompanion(): Record<string, QueueItem[]> {
  const result: Record<string, QueueItem[]> = {};
  mutableState.songQueue.forEach(item => {
    if (!result[item.companionCode]) {
      result[item.companionCode] = [];
    }
    if (item.status !== 'completed') {
      result[item.companionCode].push(item);
    }
  });
  return result;
}

// Reset all state (used by clearall action)
export function resetAllState() {
  mobileClients.clear();
  connectionCodes.clear();
  profileToClient.clear();
  persistentProfileByIp.clear();
  latestPitchData.clear();
  mutableState.songQueue = [];
  mutableState.jukeboxWishlist = [];
  mutableState.gameState = {
    currentSong: null,
    isPlaying: false,
    currentTime: 0,
    songEnded: false,
    isAdPlaying: false,
    gameMode: null,
    singalongTurn: null,
  };
  // Reset remote control state
  mutableState.remoteControlState = {
    lockedBy: null,
    lockedByName: null,
    lockedAt: null,
    pendingCommands: [],
  };
}
