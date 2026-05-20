import { NextRequest } from 'next/server';
import { generateCode, COMPANION_CODE_CHARS } from '@/lib/utils';
import type { MobileClient, PitchData, MobileProfile, QueueItem, RemoteControlState, MobileGameState, GameResults, SongSummary, HostProfile } from './mobile-types';

// ===================== ADMIN PIN AUTH =====================
// Configurable game PIN for protecting privileged endpoints.
// Set via POST 'setpin' action or environment variable GAME_PIN.
// If no PIN is configured, all requests are allowed (backward compatible).
const adminPin: string | null = process.env.GAME_PIN || null;

// ===================== BRUTE-FORCE PIN PROTECTION =====================
// Tracks failed PIN attempts per IP with timestamps.
// If an IP has more than 5 failed attempts in 60 seconds,
// PIN auth is blocked for that IP for 5 minutes.
const MAX_PIN_FAILURES = 5;
const PIN_FAILURE_WINDOW_MS = 60 * 1000;      // 60 seconds
const PIN_BLOCK_DURATION_MS = 5 * 60 * 1000;   // 5 minutes

const failedPinAttempts: Map<string, number[]> = new Map();

function isIpBlocked(ip: string): boolean {
  const attempts = failedPinAttempts.get(ip);
  if (!attempts) return false;

  const now = Date.now();

  // Clean up old entries beyond block duration
  const active = attempts.filter(t => now - t < PIN_BLOCK_DURATION_MS);
  if (active.length === 0) {
    failedPinAttempts.delete(ip);
    return false;
  }
  if (active.length !== attempts.length) {
    failedPinAttempts.set(ip, active);
  }

  // Check if there are more than MAX_PIN_FAILURES in the rolling window
  const recentCount = active.filter(t => now - t < PIN_FAILURE_WINDOW_MS).length;
  return recentCount > MAX_PIN_FAILURES;
}

function recordFailedPinAttempt(ip: string): void {
  const attempts = failedPinAttempts.get(ip) || [];
  attempts.push(Date.now());
  failedPinAttempts.set(ip, attempts);
}

function clearFailedPinAttempts(ip: string): void {
  failedPinAttempts.delete(ip);
}

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

/**
 * Check if a request is authorized for privileged actions.
 * Returns true if authorized, false if not.
 * - If no PIN is configured, always returns true (backward compatible).
 * - Checks for 'pin' header or 'pin' query parameter.
 * - Includes brute-force protection: blocks IPs with >5 failures in 60s for 5 minutes.
 */
export function requireAuth(req: NextRequest): boolean {
  if (!adminPin) return true; // No PIN configured → allow all

  const ip = getClientIp(req);

  // Brute-force protection check
  if (isIpBlocked(ip)) return false;

  const headerPin = req.headers.get('pin');
  const queryPin = req.nextUrl.searchParams.get('pin');
  const providedPin = headerPin || queryPin;

  if (providedPin === adminPin) {
    clearFailedPinAttempts(ip);
    return true;
  }

  recordFailedPinAttempt(ip);
  return false;
}

/**
 * Check if a request is authorized for gamestate mutations.
 * Allows if: admin PIN is correct OR clientId holds the remote control lock.
 */
export function requireAuthOrRemoteHolder(req: NextRequest, clientId: string | undefined): boolean {
  if (requireAuth(req)) return true;
  if (!clientId) return false;
  return mutableState.remoteControlState.lockedBy === clientId;
}

// ===================== MAX CLIENTS =====================
export const MAX_CLIENTS = 50;

// ===================== BOUND CONSTANTS =====================
export const MAX_JUKEBOX_PER_CLIENT = 20;
export const MAX_TOURNAMENT_VOTES = 500;

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

// ===================== VOTE DEDUPLICATION REGISTRY =====================
// Tracks "clientId:matchId" pairs to prevent duplicate tournament votes
export const tournamentVoteRegistry: Set<string> = new Set();

// Also export as tournamentVoteDedup alias for compatibility
export { tournamentVoteRegistry as tournamentVoteDedup };

export function hasVoted(clientId: string, matchId: string): boolean {
  return tournamentVoteRegistry.has(`${clientId}:${matchId}`);
}

export function recordVote(clientId: string, matchId: string): void {
  tournamentVoteRegistry.add(`${clientId}:${matchId}`);
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
    cptmTurn: null,
    tournamentMatchId: null,
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

  // #10 Tournament crowd votes from companion spectators
  tournamentCrowdVotes: [] as Array<{
    clientId: string;
    profileId: string | null;
    profileName: string;
    matchId: string;
    playerSide: 1 | 2;
    timestamp: number;
  }>,
};

export function generateConnectionCode(): string {
  return generateCode(4, COMPANION_CODE_CHARS);
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

// ===================== CLIENT REGISTRATION =====================
/**
 * Register a new mobile client with connection limit enforcement.
 * Returns an error string if the limit is reached, or null on success.
 */
export function registerClient(clientId: string, client: MobileClient): string | null {
  if (mobileClients.size >= MAX_CLIENTS) {
    return `Maximum client limit (${MAX_CLIENTS}) reached. Try again later.`;
  }
  mobileClients.set(clientId, client);
  return null;
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

// Purge completed queue items older than 10 minutes to prevent memory bloat
export function purgeCompletedQueueItems(): void {
  const now = Date.now();
  const COMPLETED_TTL_MS = 10 * 60 * 1000; // 10 minutes
  mutableState.songQueue = mutableState.songQueue.filter(item => {
    if (item.status !== 'completed') return true;
    // Remove completed items that are older than the TTL (using addedAt as age reference)
    return (now - item.addedAt) < COMPLETED_TTL_MS;
  });
}

// Clean up inactive clients (older than 5 minutes without activity)
// Also purges old completed queue items and prunes tournament crowd votes.
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

  // Periodic purge of completed queue items
  purgeCompletedQueueItems();

  // Prune tournament crowd votes to keep only the last MAX_TOURNAMENT_VOTES entries
  if (mutableState.tournamentCrowdVotes.length > MAX_TOURNAMENT_VOTES) {
    mutableState.tournamentCrowdVotes = mutableState.tournamentCrowdVotes.slice(-MAX_TOURNAMENT_VOTES);
  }

  // Purge jukebox wishlist completed items older than 10 minutes
  mutableState.jukeboxWishlist = mutableState.jukeboxWishlist.filter(item => {
    if (item.status !== 'completed') return true;
    return (now - item.addedAt) < (10 * 60 * 1000);
  });
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
  tournamentVoteRegistry.clear();
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
    cptmTurn: null,
    tournamentMatchId: null,
  };
  // Reset remote control state
  mutableState.remoteControlState = {
    lockedBy: null,
    lockedByName: null,
    lockedAt: null,
    pendingCommands: [],
  };
  // Clear tournament crowd votes
  mutableState.tournamentCrowdVotes = [];
}
