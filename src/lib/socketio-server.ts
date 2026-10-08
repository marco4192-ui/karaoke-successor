/**
 * Socket.IO server setup for real-time Companion communication.
 *
 * This module attaches Socket.IO to an existing HTTP server and handles
 * all real-time events between Desktop (host) and Companion clients.
 *
 * Architecture:
 *   - Desktop pushes game state → this broadcasts to all Companion sockets
 *   - Companion sends commands → this emits to the Desktop socket
 *   - Companion sends pitch → this stores in shared state for Desktop to read
 *   - Difficulty changes are pushed instantly (no polling)
 *
 * The Socket.IO server shares the same HTTP server as Next.js (port 3000),
 * using the path /socket.io/ for WebSocket upgrades.
 */
import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { mobileEvents, EVENTS, type CompanionCommandEvent } from './socketio-events';
import { mutableState, mobileClients, connectionCodes, latestPitchData, registerClient, getUniqueConnectionCode } from '@/app/api/mobile/mobile-state';

// ─── Types ───
interface HostSocket extends Socket {
  _isHost?: boolean;
}

interface CompanionSocket extends Socket {
  _isHost?: boolean;
  _clientId?: string;
  _clientName?: string;
}

// ─── Socket.IO Server Instance ───
let io: SocketIOServer | null = null;

/** Connected Desktop host sockets.
 *
 * R33/P1 FIX: The desktop app opens MULTIPLE Socket.IO connections that all
 * emit 'host:register' — useGlobalRemoteControl (navigation commands) and
 * useMobileClient (state pushes) are BOTH always mounted in karaoke-app, and
 * useRemoteControl (game commands) joins while a game runs. With a single
 * `hostSocket` variable (last-wins), commands were routed to whichever socket
 * registered last — useMobileClient's socket does NOT listen for 'command',
 * so companion commands silently vanished (the "inverted remote control"
 * bug). Tracking ALL host sockets and broadcasting commands to every one of
 * them makes routing robust regardless of registration order. */
const hostSockets = new Set<HostSocket>();

/** Backwards-compatible single-host accessor (any connected host). */
function getAnyHostSocket(): HostSocket | null {
  for (const s of hostSockets) return s;
  return null;
}

/** Desktop sockets subscribed to live pitch pushes (the Socket.IO pitch feed).
 *  Deliberately separate from the host sockets: pitch streaming must never
 *  interfere with command routing, which stays bound to the registered
 *  hostSockets. The pitch-feed sockets register via 'host:pitch-subscribe'
 *  and do NOT emit 'host:register'. */
const pitchFeedSockets = new Set<Socket>();

/** Map of companion clientId → socket for direct messaging */
const companionSockets = new Map<string, CompanionSocket>();

/**
 * R35: Ensure the HTTP client record exists for a socket-registered companion.
 *
 * ROOT CAUSE (user report "Companion verbunden, aber nicht erkannt"): the
 * server purges mobile clients after 5 minutes without activity
 * (cleanupInactiveClients). While a phone is in standby the OS suspends JS
 * timers AND the WebSocket — no heartbeats arrive, so the client record is
 * purged (profile claim included). When the phone wakes, Socket.IO
 * auto-reconnects and re-registers with the OLD clientId — but until now the
 * register/heartbeat handlers silently ignored the missing client record:
 * the phone looked connected (live socket, UI fine) while the server had NO
 * client → the desktop's clients list showed nothing → "keine Verbindung,
 * obwohl sie bestand".
 *
 * This helper recreates the record (fresh connection code, no profile — the
 * phone re-claims its profile via the 'companion:client-restored' event) so
 * the device is visible again. Returns true when the record was recreated.
 */
function ensureCompanionClient(clientId: string, clientName?: string): boolean {
  const existing = mobileClients.get(clientId);
  if (existing) {
    existing.lastActivity = Date.now();
    return false;
  }
  const connectionCode = getUniqueConnectionCode();
  const recreated = {
    id: clientId,
    connectionCode,
    type: 'microphone' as const,
    name: clientName || 'Mobile Device',
    connected: Date.now(),
    lastActivity: Date.now(),
    pitchData: null,
    profile: null,
    queueCount: 0,
    hasRemoteControl: false,
  };
  // registerClient enforces the MAX_CLIENTS limit; on overflow the phone
  // stays invisible — same as a fresh connect being rejected.
  registerClient(clientId, recreated);
  connectionCodes.set(connectionCode, clientId);
  // eslint-disable-next-line no-console
  console.log(`[Socket.IO] R35: client record recreated for ${clientId} (was purged by inactivity cleanup)`);
  return true;
}

/**
 * Initialize Socket.IO on the given HTTP server.
 * Called once from server.ts during startup.
 */
export function initSocketIO(httpServer: HTTPServer): SocketIOServer {
  if (io) return io; // Already initialized

  io = new SocketIOServer(httpServer, {
    path: '/socket.io',
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    // Use WebSocket only (no HTTP long-polling fallback — we have the REST API for that)
    transports: ['websocket', 'polling'],
  });

  // ─── Connection Handler ───
  io.on('connection', (socket: Socket) => {
    // eslint-disable-next-line no-console
    console.log(`[Socket.IO] Client connected: ${socket.id}`);

    // ─── Host (Desktop) Events ───
    socket.on('host:register', () => {
      // Desktop registers itself as a host (there may be several sockets
      // from the same desktop page — see the R33 note on hostSockets).
      (socket as HostSocket)._isHost = true;
      hostSockets.add(socket as HostSocket);
      // R44: log wording clarified — several host sockets are NORMAL (the
      // desktop app intentionally opens one channel per responsibility:
      // navigation commands, state pushes, game commands). They are NOT
      // players and NOT multiple app instances.
      // eslint-disable-next-line no-console
      console.log(`[Socket.IO] Desktop host channel #${hostSockets.size} (${socket.id}) — internal app channel, not a player`);

      // Send current game state to host on registration
      socket.emit('host:registered', {
        companionCount: companionSockets.size,
        gameState: mutableState.gameState,
      });
    });

    socket.on('host:gamestate', (data: { gameState: Record<string, unknown> }) => {
      // Desktop pushes new game state → broadcast to ALL companions
      if (!(socket as HostSocket)._isHost) return; // Only host can push

      // Update mutable state on server side
      mutableState.gameState = { ...mutableState.gameState, ...data.gameState };

      // Push to all companions instantly
      io!.to('companions').emit('gamestate', {
        gameState: {
          ...mutableState.gameState,
          queueLength: mutableState.songQueue.filter(q => q.status === 'pending').length,
        },
      });
    });

    socket.on('host:difficulty', (data: { difficulty: 'easy' | 'medium' | 'hard' }) => {
      // Desktop pushes difficulty change → broadcast to all companions
      if (!(socket as HostSocket)._isHost) return;

      // Update in mutable state
      (mutableState.gameState as unknown as Record<string, unknown>).difficulty = data.difficulty;

      // Push to all companions
      io!.to('companions').emit('difficulty', { difficulty: data.difficulty });
      // eslint-disable-next-line no-console
      console.log(`[Socket.IO] Difficulty pushed: ${data.difficulty}`);
    });

    socket.on('host:pause-state', (data: { isPaused: boolean; pauseInitiator: string | null }) => {
      // Desktop pushes pause state change
      if (!(socket as HostSocket)._isHost) return;

      (mutableState.gameState as unknown as Record<string, unknown>).isPlaying = !data.isPaused;
      (mutableState.gameState as unknown as Record<string, unknown>).pauseInitiator = data.pauseInitiator;

      io!.to('companions').emit('pause-state', data);
    });

    socket.on('host:dialog', (data: { dialog: string | null; dialogData?: Record<string, unknown> }) => {
      // Desktop pushes dialog/overlay state to companions
      if (!(socket as HostSocket)._isHost) return;

      (mutableState.gameState as unknown as Record<string, unknown>).desktopDialog = data.dialog;

      io!.to('companions').emit('desktop-dialog', data);
    });

    socket.on('host:party-leave', (data: { show: boolean }) => {
      // Desktop pushes party-leave overlay to companions
      if (!(socket as HostSocket)._isHost) return;

      io!.to('companions').emit('party-leave', data);
    });

    socket.on('host:ptm-phase', (data: { phase: string; introData?: Record<string, unknown> }) => {
      // Desktop pushes PTM/party-mode phase changes
      if (!(socket as HostSocket)._isHost) return;

      (mutableState.gameState as unknown as Record<string, unknown>).ptmPhase = data.phase;
      if (data.introData) {
        (mutableState.gameState as unknown as Record<string, unknown>).ptmIntroData = data.introData;
      }

      io!.to('companions').emit('ptm-phase', data);
    });

    // ─── Companion Events ───
    socket.on('companion:register', (data: { clientId: string; clientName?: string }) => {
      // Companion registers with its clientId (from HTTP connect)
      (socket as CompanionSocket)._isHost = false;
      (socket as CompanionSocket)._clientId = data.clientId;
      (socket as CompanionSocket)._clientName = data.clientName || 'Companion';

      socket.join('companions');
      companionSockets.set(data.clientId, socket as CompanionSocket);

      // R35: the client record may have been purged while the phone was in
      // standby (5-min inactivity cleanup). Recreate it so the desktop's
      // clients list shows the device again, then tell the phone to re-claim
      // its profile (the purge dropped the claim together with the record).
      const restored = ensureCompanionClient(data.clientId, data.clientName);
      if (restored) {
        socket.emit('companion:client-restored', { clientId: data.clientId });
      }

      // Send current game state immediately on registration
      socket.emit('gamestate', {
        gameState: {
          ...mutableState.gameState,
          queueLength: mutableState.songQueue.filter(q => q.status === 'pending').length,
        },
      });

      // Notify all host sockets of the new companion
      for (const host of hostSockets) {
        host.emit('companion:connected', {
          clientId: data.clientId,
          clientName: data.clientName,
          companionCount: companionSockets.size,
        });
      }

      // eslint-disable-next-line no-console
      console.log(`[Socket.IO] Companion registered: ${data.clientId} (${data.clientName})`);
    });

    socket.on('companion:command', (data: CompanionCommandEvent['command']) => {
      // Companion sends a remote control command → forward to Desktop host
      const companionSocket = socket as CompanionSocket;
      const command = {
        ...data,
        fromClientId: companionSocket._clientId || 'unknown',
        fromClientName: companionSocket._clientName || 'Companion',
        timestamp: data.timestamp || Date.now(),
      };

      // Also store in mutableState for backward compatibility (HTTP polling fallback)
      mutableState.remoteControlState.pendingCommands.push(command as typeof mutableState.remoteControlState.pendingCommands[number]);

      // Push to ALL Desktop host sockets instantly via WebSocket. When at
      // least one host is connected, the command is considered delivered —
      // clear it from the pending queue so it is not replayed by the HTTP
      // fallback polling later (double navigation).
      if (hostSockets.size > 0) {
        for (const host of hostSockets) {
          host.emit('command', command);
        }
        mutableState.remoteControlState.pendingCommands =
          mutableState.remoteControlState.pendingCommands.filter(
            (c) => c.timestamp !== command.timestamp || c.fromClientId !== command.fromClientId,
          );
      }

      // eslint-disable-next-line no-console
      console.log(`[Socket.IO] Command from companion: ${command.type} (${command.fromClientName})`);
    });

    socket.on('host:pitch-subscribe', () => {
      // Desktop wants live pitch pushes (Socket.IO pitch feed).
      // NOTE: this socket must NOT emit 'host:register' — command routing
      // stays exclusive to the registered host socket.
      pitchFeedSockets.add(socket);
      socket.emit('host:pitch-subscribed', { companionCount: companionSockets.size });
      // eslint-disable-next-line no-console
      console.log(`[Socket.IO] Pitch feed channel (${socket.id}) — live pitch stream, not a player`);
    });

    socket.on('companion:pitch', (data: {
      frequency: number | null;
      note?: number | null;
      clarity: number;
      volume: number;
      timestamp?: number;
    }) => {
      // Companion sends pitch data → store in shared state
      const companionSocket = socket as CompanionSocket;
      const clientId = companionSocket._clientId;
      if (!clientId) return;

      // Validate pitch data (same rules as the HTTP batch_pitch handler —
      // frequency is null when the phone detects no pitch, e.g. silence)
      const frequency = (typeof data.frequency === 'number' && Number.isFinite(data.frequency))
        ? Math.max(20, Math.min(2000, data.frequency))
        : null;
      const note = (typeof data.note === 'number' && Number.isFinite(data.note)) ? data.note : null;
      const clarity = Math.max(0, Math.min(1, data.clarity || 0));
      const volume = Math.max(0, Math.min(1, data.volume || 0));

      const frame = {
        frequency,
        note,
        clarity,
        volume,
        timestamp: typeof data.timestamp === 'number' ? data.timestamp : Date.now(),
      };

      // Same store the HTTP batch_pitch handler writes to — every
      // HTTP-polling consumer keeps working without any migration.
      latestPitchData.set(clientId, frame);

      // Parity with the HTTP handler: keep the client record fresh so the
      // /clients list (hasPitch indicator) reflects streaming phones.
      const client = mobileClients.get(clientId);
      if (client) {
        client.lastActivity = Date.now();
        client.pitchData = frame;
        mobileClients.set(clientId, client);
      }

      // Push to every subscribed desktop socket instantly (no polling!)
      if (pitchFeedSockets.size > 0) {
        // R60 — PERF-FIX: NUR noch ein SLIM-Profil ({id, name, color}) pro
        // Frame. Zuvor wurde das VOLLE client.profile inkl. Avatar-Data-URL
        // (bis zu ~100 KB) mitgeschickt — bei 30 Hz × N Handys serialisierte
        // der Server Megabytes pro Sekunde (Duell mit 2 Companions stockte
        // hörbar, bis zu 4 Handys wären ~12 MB/s). Consumer matchen ausschließlich
        // über profile.id / clientId — Name/Farbe nur für Anzeigen.
        const slimProfile = client?.profile
          ? {
              id: client.profile.id,
              name: client.profile.name,
              color: client.profile.color,
            }
          : null;
        const push = {
          clientId,
          code: client?.connectionCode || '',
          data: frame,
          profile: slimProfile,
        };
        for (const feedSocket of pitchFeedSockets) {
          feedSocket.emit('pitch', push);
        }
      }
    });

    socket.on('companion:heartbeat', () => {
      // Companion heartbeat via WebSocket
      const companionSocket = socket as CompanionSocket;
      const clientId = companionSocket._clientId;
      if (!clientId) return;

      // R35: keep the activity timestamp fresh for existing records.
      // Deliberately NO recreation here: a purge only happens when the socket
      // was dead/suspended (no heartbeats → 5-min inactivity), so the phone
      // ALWAYS re-registers via 'companion:register' when it wakes — that
      // handler recreates the record. Recreating from heartbeats would only
      // fire in races with STALE sockets (phone already reconnected under a
      // new id) and leave phantom unassigned records behind.
      const client = mobileClients.get(clientId);
      if (client) {
        client.lastActivity = Date.now();
      }
    });

    // ─── Disconnect ───
    socket.on('disconnect', (reason) => {
      // Pitch feed sockets can disconnect independently of the host socket
      pitchFeedSockets.delete(socket);
      if ((socket as HostSocket)._isHost) {
        // eslint-disable-next-line no-console
        console.log(`[Socket.IO] Desktop host disconnected: ${socket.id} (${reason})`);
        hostSockets.delete(socket as HostSocket);
      } else {
        const companionSocket = socket as CompanionSocket;
        const clientId = companionSocket._clientId;
        if (clientId) {
          companionSockets.delete(clientId);
          // Notify all host sockets
          for (const host of hostSockets) {
            host.emit('companion:disconnected', {
              clientId,
              companionCount: companionSockets.size,
            });
          }
        }
        // eslint-disable-next-line no-console
        console.log(`[Socket.IO] Client disconnected: ${socket.id} (${reason})`);
      }
    });
  });

  // ─── Subscribe to events from API routes ───
  // When Desktop POSTs gamestate via HTTP, also push via Socket.IO
  mobileEvents.on(EVENTS.GAMESTATE_UPDATE, (data: { gameState: Record<string, unknown> }) => {
    io!.to('companions').emit('gamestate', {
      gameState: {
        ...data.gameState,
        queueLength: mutableState.songQueue.filter(q => q.status === 'pending').length,
      },
    });
  });

  mobileEvents.on(EVENTS.DIFFICULTY_UPDATE, (data: { difficulty: 'easy' | 'medium' | 'hard' }) => {
    io!.to('companions').emit('difficulty', data);
  });

  // R33/P16+: Desktop pushed a CHANGED settings snapshot (dedicated push-on-
  // change POST — no more 2s gamestate embedding). Forward to every connected
  // companion so open Settings mirrors update instantly. Companions that
  // (re)connect later PULL it via GET action=settingssnapshot instead.
  mobileEvents.on(EVENTS.SETTINGS_SNAPSHOT, (data: { snapshot: Record<string, unknown> }) => {
    io!.to('companions').emit('settings-snapshot', data);
  });

  // Desktop pushes live Battle-Royale singing feedback (per-player
  // pitch/hit/miss monitor, ~2 Hz) → straight through to the companions.
  // Ephemeral data — nothing is persisted in mutableState.
  mobileEvents.on(EVENTS.BR_SINGING_UPDATE, (data: { players: unknown[]; serverTime: number }) => {
    io!.to('companions').emit('br-singing', data);
  });

  mobileEvents.on(EVENTS.DESKTOP_DIALOG, (data: { dialog: string | null; dialogData?: Record<string, unknown> }) => {
    io!.to('companions').emit('desktop-dialog', data);
  });

  mobileEvents.on(EVENTS.PARTY_LEAVE, (data: { show: boolean }) => {
    io!.to('companions').emit('party-leave', data);
  });

  mobileEvents.on(EVENTS.PAUSE_STATE, (data: { isPaused: boolean; pauseInitiator: string | null }) => {
    io!.to('companions').emit('pause-state', data);
  });

  // R34: A companion's profile was assigned/cleared server-side (party setup
  // assign panel, settings, name-dedup rebind). Push it to THAT phone only —
  // it adopts the profile instantly and sings as the right player.
  mobileEvents.on(EVENTS.PROFILE_ASSIGNED, (data: { clientId: string; profile: Record<string, unknown> | null }) => {
    const socket = companionSockets.get(data.clientId);
    if (socket) {
      socket.emit('companion:profile-assigned', { profile: data.profile });
    }
  });

  // HTTP-POSTed remote commands (e.g. mirror-view start buttons) → desktop host.
  // The desktop only polls `getcommands` while its WebSocket is DOWN; when the
  // socket is up, this forward is the only way HTTP commands reach it.
  mobileEvents.on(EVENTS.REMOTE_COMMAND, (data: { command: { type: string; data?: unknown; timestamp: number; fromClientId: string; fromClientName: string } }) => {
    // R33/P1: deliver to ALL connected host sockets (see hostSockets note).
    // With at least one live host the command is delivered — clear it from
    // the pending queue so the HTTP fallback doesn't replay it.
    if (hostSockets.size > 0) {
      for (const host of hostSockets) {
        host.emit('command', data.command);
      }
      mutableState.remoteControlState.pendingCommands =
        mutableState.remoteControlState.pendingCommands.filter(
          (c) => !(c.type === data.command.type && c.timestamp === data.command.timestamp && c.fromClientId === data.command.fromClientId),
        );
    }
  });

  // eslint-disable-next-line no-console
  console.log('[Socket.IO] Server initialized on path /socket.io');
  return io;
}

/**
 * R52: Attach the EXISTING Socket.IO server to an additional HTTP(S) server.
 *
 * The Tauri production build runs a second listener with TLS (self-signed
 * cert, default port 3443) so phones get a SECURE context — getUserMedia
 * (companion microphone) is blocked on plain http://<LAN-IP>. engine.io
 * wraps the new server's request/upgrade listeners exactly like initSocketIO
 * does for the primary server; all connection handling stays identical.
 *
 * No-op when Socket.IO is not initialized yet (caller must init first).
 */
export function attachSocketIO(httpServer: HTTPServer): void {
  if (!io) return;
  io.attach(httpServer, {
    path: '/socket.io',
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    transports: ['websocket', 'polling'],
  });
  // eslint-disable-next-line no-console
  console.log('[Socket.IO] Attached to additional server (HTTPS listener)');
}

/**
 * Get the Socket.IO server instance (null if not initialized).
 */
export function getIO(): SocketIOServer | null {
  return io;
}

/**
 * Get a host socket (for sending directly to the Desktop).
 * R33: there may be several host sockets — returns any connected one.
 */
export function getHostSocket(): HostSocket | null {
  return getAnyHostSocket();
}

/**
 * Get count of connected companion sockets.
 */
export function getCompanionSocketCount(): number {
  return companionSockets.size;
}
