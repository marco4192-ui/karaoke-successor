import { NextRequest } from 'next/server';
import { generateCode, COMPANION_CODE_CHARS } from '@/lib/utils';
import { getClientIp } from '@/lib/rate-limiter';
import type { MobileClient, PitchData, MobileProfile, QueueItem, RemoteControlState, MobileGameState, GameResults, SongSummary, HostProfile } from './mobile-types';

// ===================== ADMIN PIN AUTH =====================
// Configurable game PIN for protecting privileged endpoints.
// Set via environment variable GAME_PIN.
// If no PIN is configured, all requests are allowed (backward compatible).
const adminPin: string | null = process.env.GAME_PIN || null;

// ===================== HOST (DESKTOP) REQUEST DETECTION =====================
// The desktop app (Tauri webview / local browser) reaches this server via
// loopback, companion phones connect via LAN IP. server.ts strips any
// client-supplied 'x-karaoke-tcp-addr' header and injects the REAL TCP peer
// address, so this check cannot be spoofed from the network. Host requests
// are exempt from the PIN: GAME_PIN protects privileged endpoints from
// COMPANIONS, never from the host itself (R36 — previously every desktop
// push like assigncharacter/gamestate/sethostprofiles failed with GAME_PIN
// set, because nobody sends the pin header).
// Fail-closed: requests without the header (e.g. when running `next dev`
// directly without server.ts) are NOT treated as host.
const LOOPBACK_TCP_ADDRS = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);

export function isHostRequest(req: NextRequest): boolean {
  const tcpAddr = req.headers.get('x-karaoke-tcp-addr');
  return !!tcpAddr && LOOPBACK_TCP_ADDRS.has(tcpAddr);
}

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
  return recentCount >= MAX_PIN_FAILURES;
}

function recordFailedPinAttempt(ip: string): void {
  const attempts = failedPinAttempts.get(ip) || [];
  attempts.push(Date.now());
  failedPinAttempts.set(ip, attempts);
}

function clearFailedPinAttempts(ip: string): void {
  failedPinAttempts.delete(ip);
}

/**
 * Check if a request is authorized for privileged actions.
 * Returns true if authorized, false if not.
 * - If no PIN is configured, always returns true (backward compatible).
 * - Host requests (loopback TCP peer, see isHostRequest) are always allowed.
 * - Checks for 'pin' header or 'pin' query parameter.
 * - Includes brute-force protection: blocks IPs with >5 failures in 60s for 5 minutes.
 */
export function requireAuth(req: NextRequest): boolean {
  if (!adminPin) return true; // No PIN configured → allow all
  if (isHostRequest(req)) return true; // Host machine (desktop app) → always trusted (R36)

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


// ===================== GLOBAL STATE =====================
// Shared state for mobile clients (in-memory, resets on server restart).
//
// NOTE: Next.js dev mode (and standalone builds) load route handlers and the
// custom server (server.ts → socketio-server) through SEPARATE module graphs.
// Plain module-level state would exist once per graph — the Socket.IO server
// would push STALE state to companions while the API routes keep updating
// their own copy. Anchoring the container on globalThis guarantees ONE
// shared instance across all module graphs in the same Node.js process.

/** Mutable state container — allows importing modules to reassign properties */
function createMutableState() {
  return {
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
      companionScores: null,
      currentScreen: undefined,
      partyGameMode: null,
    } as MobileGameState,

    // Queue for song requests from mobile clients
    songQueue: [] as QueueItem[],

    // R39/P7: Desktop-locale Queue (zustand) — der Desktop spiegelt seine
    // lokale Warteschlange hierher (POST syncdesktopqueue), damit die
    // Companion-Queue die GESAMTE Warteschlange zeigt (wie die Haupt-App),
    // nicht nur die Handy-Wünsche. Desktop-Einträge tragen isDesktop: true
    // und werden von den Desktop-Konsumenten (queue-screen,
    // use-queue-next-song) herausgefiltert, um Doppel anzuzeigen zu vermeiden.
    desktopQueue: [] as Array<QueueItem & { isDesktop?: true }>,

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

    // R33/P5/P6: Desktop settings snapshot (localStorage values + webcam
    // config) pushed inside the 2s gamestate POST. Companions read it via
    // GET action=settingssnapshot so their Settings mirror shows REAL desktop
    // values instead of hardcoded defaults.
    settingsSnapshot: null as null | {
      values: Record<string, string>;
      webcam: Record<string, unknown> | null;
      defaultDifficulty?: string;
      updatedAt: number;
    },

    // R33/P13: Mini cover thumbnails (96px JPEG data-URLs) keyed by songId.
    // Uploaded by the desktop (use-song-library-sync), served to companions
    // via GET action=songcover&songId=… as image/jpeg.
    songCovers: {} as Record<string, string>,

    // R39/P2: Server-side proxy cache for REMOTE covers (http/https from the
    // song library). The desktop's canvas thumbnail generation fails for
    // CORS-tainted remote images — the server fetches them itself (Node has
    // no CORS) and serves them same-origin to the companion app. Entries:
    // raw bytes + content-type, TTL 24 h, capped at 300 songs.
    remoteCoverCache: new Map<string, { buf: Buffer; type: string; at: number }>(),

    // R33/P10: Top-100 local highscores pushed by the desktop.
    highscores: [] as Array<Record<string, unknown>>,

    // R33/P12: Daily-Challenge snapshots per profile (slots/weekly/streak/
    // badges/level) pushed by the desktop for the companion Daily mirror.
    dailyByProfile: {} as Record<string, unknown>,

    // R33/P8: Jukebox mirror state (filters, pool, shuffle, repeat, …)
    // pushed by useJukebox on every relevant change.
    jukeboxState: null as unknown as Record<string, unknown> | null,

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

    // F19: Pending duel/duet requests — stored so the partner's companion can poll
    pendingDuelRequests: [] as Array<{
      fromClientId: string;
      fromProfileName: string;
      targetClientId: string;
      songTitle: string;
      gameMode: 'duel' | 'duet';
      timestamp: number;
    }>,

    // F4: In-game chat messages between companion and host
    // challenge field: when set, this message is a song challenge with accept button
    chatMessages: [] as Array<{
      id: string;
      from: string;
      fromName: string;
      text: string;
      timestamp: number;
      isHost: boolean;
      challenge?: {
        songId: string;
        songTitle: string;
        songArtist: string;
        challengerClientId: string;
        challengerName: string;
        accepted: boolean;
        acceptedBy: string | null;
        acceptedByName: string | null;
      };
    }>,

    // Companion Playlist-Sync: Desktop speichert Playlists hier,
    // damit Companion sie lesen kann (localStorage nicht im API-Route verfuegbar)
    playlists: [] as Array<{ id: string; name: string; isSystem?: boolean }>,

    // R27: Single-writer election for 'gamestate' POSTs. Two concurrently
    // running desktop instances (e.g. app window + leftover browser tab)
    // otherwise fight over mutableState.gameState every 2 s — the companion
    // mirror view flip-flops between both screens (= cyclic remount).
    // First sender owns the feed; others get 409 while the owner is fresh
    // (posted within GAMESTATE_WRITER_TTL ms).
    gamestateWriter: {
      id: null as string | null,
      lastAt: 0,
    },
  };
}

/** R27: How long a gamestate writer stays "fresh" (owner) without posting.
 * The desktop sync loop posts every 2 s, so 5 s covers two missed beats. */
export const GAMESTATE_WRITER_TTL = 5000;

type MutableState = ReturnType<typeof createMutableState>;

interface MobileSharedState {
  mobileClients: Map<string, MobileClient>;
  connectionCodes: Map<string, string>;
  profileToClient: Map<string, string>;
  persistentProfileByIp: Map<string, { profile: MobileProfile; storedAt: number }>;
  latestPitchData: Map<string, PitchData>;
  mutableState: MutableState;
}

const globalWithShared = globalThis as typeof globalThis & { __karaokeMobileShared?: MobileSharedState };
const shared: MobileSharedState = globalWithShared.__karaokeMobileShared ?? {
  mobileClients: new Map<string, MobileClient>(),
  connectionCodes: new Map<string, string>(),
  profileToClient: new Map<string, string>(),
  persistentProfileByIp: new Map<string, { profile: MobileProfile; storedAt: number }>(),
  latestPitchData: new Map<string, PitchData>(),
  mutableState: createMutableState(),
};
globalWithShared.__karaokeMobileShared = shared;

export const mobileClients: Map<string, MobileClient> = shared.mobileClients;
export const connectionCodes: Map<string, string> = shared.connectionCodes; // code -> clientId
export const profileToClient: Map<string, string> = shared.profileToClient; // profileId -> clientId (for duplicate detection)

// Persistent profile by IP — survives client cleanup so profiles can be restored
// after long standby periods where the server cleaned up the client session.
// Keyed by IP, stores the last known profile for each IP address.
export const persistentProfileByIp: Map<string, { profile: MobileProfile; storedAt: number }> = shared.persistentProfileByIp;

// Latest pitch data from all clients (for PC to poll)
export const latestPitchData: Map<string, PitchData> = shared.latestPitchData;

// Shared mutable state — one instance across API routes + Socket.IO server
export const mutableState: MutableState = shared.mutableState;

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

  // Clean up stale failed PIN attempts
  const staleNow = Date.now();
  for (const [ip, attempts] of failedPinAttempts) {
    if (attempts.every(t => staleNow - t > PIN_BLOCK_DURATION_MS)) {
      failedPinAttempts.delete(ip);
    }
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
    companionScores: null,
    currentScreen: undefined,
    partyGameMode: null,
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
  // Clear pending duel requests
  mutableState.pendingDuelRequests = [];
  // Clear chat messages
  mutableState.chatMessages = [];
}
