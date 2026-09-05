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
import { mobileEvents, EVENTS, type CompanionCommandEvent, type CompanionPitchEvent } from './socketio-events';
import { mutableState, mobileClients, latestPitchData } from '@/app/api/mobile/mobile-state';

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

/** Connected Desktop host socket (there should only be one) */
let hostSocket: HostSocket | null = null;

/** Map of companion clientId → socket for direct messaging */
const companionSockets = new Map<string, CompanionSocket>();

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
    console.log(`[Socket.IO] Client connected: ${socket.id}`);

    // ─── Host (Desktop) Events ───
    socket.on('host:register', () => {
      // Desktop registers itself as the host
      (socket as HostSocket)._isHost = true;
      hostSocket = socket;
      console.log(`[Socket.IO] Desktop host registered: ${socket.id}`);

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

      // Send current game state immediately on registration
      socket.emit('gamestate', {
        gameState: {
          ...mutableState.gameState,
          queueLength: mutableState.songQueue.filter(q => q.status === 'pending').length,
        },
      });

      // Notify host of new companion
      if (hostSocket) {
        hostSocket.emit('companion:connected', {
          clientId: data.clientId,
          clientName: data.clientName,
          companionCount: companionSockets.size,
        });
      }

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

      // Push to Desktop host instantly via WebSocket
      if (hostSocket) {
        hostSocket.emit('command', command);
      }

      console.log(`[Socket.IO] Command from companion: ${command.type} (${command.fromClientName})`);
    });

    socket.on('companion:pitch', (data: { frequency: number; clarity: number; volume: number }) => {
      // Companion sends pitch data → store in shared state
      const companionSocket = socket as CompanionSocket;
      const clientId = companionSocket._clientId;
      if (!clientId) return;

      // Validate pitch data
      const frequency = Math.max(20, Math.min(2000, data.frequency || 0));
      const clarity = Math.max(0, Math.min(1, data.clarity || 0));
      const volume = Math.max(0, Math.min(1, data.volume || 0));

      latestPitchData.set(clientId, {
        frequency,
        clarity,
        volume,
        note: 0, // Note not provided via WebSocket, computed on Desktop side
        timestamp: Date.now(),
      });

      // Push to Desktop host instantly (no more polling for pitch!)
      if (hostSocket) {
        hostSocket.emit('pitch', {
          clientId,
          code: mobileClients.get(clientId)?.connectionCode || '',
          data: { frequency, clarity, volume, timestamp: Date.now() },
          profile: mobileClients.get(clientId)?.profile || null,
        });
      }
    });

    socket.on('companion:heartbeat', () => {
      // Companion heartbeat via WebSocket
      const companionSocket = socket as CompanionSocket;
      const clientId = companionSocket._clientId;
      if (!clientId) return;

      const client = mobileClients.get(clientId);
      if (client) {
        client.lastActivity = Date.now();
      }
    });

    // ─── Disconnect ───
    socket.on('disconnect', (reason) => {
      if ((socket as HostSocket)._isHost) {
        console.log(`[Socket.IO] Desktop host disconnected: ${socket.id} (${reason})`);
        if (hostSocket === socket) hostSocket = null;
      } else {
        const companionSocket = socket as CompanionSocket;
        const clientId = companionSocket._clientId;
        if (clientId) {
          companionSockets.delete(clientId);
          // Notify host
          if (hostSocket) {
            hostSocket.emit('companion:disconnected', {
              clientId,
              companionCount: companionSockets.size,
            });
          }
        }
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

  mobileEvents.on(EVENTS.DESKTOP_DIALOG, (data: { dialog: string | null; dialogData?: Record<string, unknown> }) => {
    io!.to('companions').emit('desktop-dialog', data);
  });

  mobileEvents.on(EVENTS.PARTY_LEAVE, (data: { show: boolean }) => {
    io!.to('companions').emit('party-leave', data);
  });

  mobileEvents.on(EVENTS.PAUSE_STATE, (data: { isPaused: boolean; pauseInitiator: string | null }) => {
    io!.to('companions').emit('pause-state', data);
  });

  console.log('[Socket.IO] Server initialized on path /socket.io');
  return io;
}

/**
 * Get the Socket.IO server instance (null if not initialized).
 */
export function getIO(): SocketIOServer | null {
  return io;
}

/**
 * Get the host socket (for sending commands directly to Desktop).
 */
export function getHostSocket(): HostSocket | null {
  return hostSocket;
}

/**
 * Get count of connected companion sockets.
 */
export function getCompanionSocketCount(): number {
  return companionSockets.size;
}
