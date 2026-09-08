'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';

/**
 * Socket.IO hook for the Companion (mobile) side.
 *
 * Connects to the Socket.IO server and provides:
 * - Real-time game state updates (no polling!)
 * - Real-time difficulty updates
 * - Real-time pause/dialog state updates
 * - Method to send commands to Desktop (no HTTP POST needed)
 * - Method to send pitch data to Desktop (no HTTP POST needed)
 */
export function useSocketIOCompanion(clientId: string | null) {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Callback refs for various event types
  const onGameStateRef = useRef<((gameState: Record<string, unknown>) => void) | null>(null);
  const onDifficultyRef = useRef<((difficulty: 'easy' | 'medium' | 'hard') => void) | null>(null);
  const onPauseStateRef = useRef<((data: { isPaused: boolean; pauseInitiator: string | null }) => void) | null>(null);
  const onDialogRef = useRef<((data: { dialog: string | null; dialogData?: Record<string, unknown> }) => void) | null>(null);
  const onPartyLeaveRef = useRef<((data: { show: boolean }) => void) | null>(null);
  const onPtmPhaseRef = useRef<((data: { phase: string; introData?: Record<string, unknown> }) => void) | null>(null);

  // Connect/reconnect when clientId changes
  useEffect(() => {
    if (!clientId) return;

    // Determine Socket.IO server URL (same origin by default)
    const socketUrl = typeof window !== 'undefined' ? window.location.origin : '';

    const socket = io(socketUrl, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 8000,
      timeout: 20000,
    });

    socket.on('connect', () => {
      // eslint-disable-next-line no-console
      console.log('[Socket.IO Companion] Connected:', socket.id);
      setIsConnected(true);
      // Register as companion with our clientId
      socket.emit('companion:register', { clientId });
    });

    socket.on('disconnect', (reason) => {
      // eslint-disable-next-line no-console
      console.debug('[Socket.IO Companion] Disconnected:', reason);
      setIsConnected(false);
    });

    // ─── Receive game state updates (push, no polling!) ───
    socket.on('gamestate', (data: { gameState: Record<string, unknown> }) => {
      if (onGameStateRef.current) {
        onGameStateRef.current(data.gameState);
      }
    });

    // ─── Receive difficulty updates ───
    socket.on('difficulty', (data: { difficulty: 'easy' | 'medium' | 'hard' }) => {
      if (onDifficultyRef.current) {
        onDifficultyRef.current(data.difficulty);
      }
    });

    // ─── Receive pause state updates ───
    socket.on('pause-state', (data: { isPaused: boolean; pauseInitiator: string | null }) => {
      if (onPauseStateRef.current) {
        onPauseStateRef.current(data);
      }
    });

    // ─── Receive dialog/overlay updates ───
    socket.on('desktop-dialog', (data: { dialog: string | null; dialogData?: Record<string, unknown> }) => {
      if (onDialogRef.current) {
        onDialogRef.current(data);
      }
    });

    // ─── Receive party-leave overlay ───
    socket.on('party-leave', (data: { show: boolean }) => {
      if (onPartyLeaveRef.current) {
        onPartyLeaveRef.current(data);
      }
    });

    // ─── Receive PTM/party-mode phase changes ───
    socket.on('ptm-phase', (data: { phase: string; introData?: Record<string, unknown> }) => {
      if (onPtmPhaseRef.current) {
        onPtmPhaseRef.current(data);
      }
    });

    // Rate-limited connect_error logging: log the first error, then at most
    // once every 30s (or when the message changes) — a flaky WiFi reconnect
    // loop must not spam the companion console.
    const lastErrLog = { at: 0, msg: '' };
    socket.on('connect_error', (err) => {
      const now = Date.now();
      const msg = err?.message || 'unknown';
      if (msg !== lastErrLog.msg || now - lastErrLog.at > 30000) {
        lastErrLog.at = now;
        lastErrLog.msg = msg;
        // eslint-disable-next-line no-console
        console.debug('[Socket.IO Companion] Connection error (will keep retrying silently):', msg);
      }
    });

    socketRef.current = socket;

    // Reduce page-unload WS-close noise ("Die Verbindung wurde unterbrochen,
    // während die Seite geladen wurde"): proactively disconnect before the
    // browser kills the page. Skipped when only entering the back/forward
    // cache — a manual disconnect would disable Socket.IO auto-reconnect,
    // leaving a dead socket after a bfcache restore.
    const handlePageHide = (e: PageTransitionEvent) => {
      if (!e.persisted) socket.disconnect();
    };
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      window.removeEventListener('pagehide', handlePageHide);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [clientId]);

  // ─── Send Methods ───

  /** Send a remote control command to Desktop */
  const sendCommand = useCallback((command: { type: string; data?: unknown; timestamp?: number }) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('companion:command', {
        ...command,
        timestamp: command.timestamp || Date.now(),
      });
    }
  }, []);

  /** Send pitch data to Desktop */
  const sendPitch = useCallback((pitch: { frequency: number; clarity: number; volume: number }) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('companion:pitch', pitch);
    }
  }, []);

  /** Send heartbeat to server via WebSocket */
  const sendHeartbeat = useCallback(() => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('companion:heartbeat');
    }
  }, []);

  // ─── Callback Setters ───

  const setOnGameState = useCallback((cb: ((gameState: Record<string, unknown>) => void) | null) => {
    onGameStateRef.current = cb;
  }, []);

  const setOnDifficulty = useCallback((cb: ((difficulty: 'easy' | 'medium' | 'hard') => void) | null) => {
    onDifficultyRef.current = cb;
  }, []);

  const setOnPauseState = useCallback((cb: ((data: { isPaused: boolean; pauseInitiator: string | null }) => void) | null) => {
    onPauseStateRef.current = cb;
  }, []);

  const setOnDialog = useCallback((cb: ((data: { dialog: string | null; dialogData?: Record<string, unknown> }) => void) | null) => {
    onDialogRef.current = cb;
  }, []);

  const setOnPartyLeave = useCallback((cb: ((data: { show: boolean }) => void) | null) => {
    onPartyLeaveRef.current = cb;
  }, []);

  const setOnPtmPhase = useCallback((cb: ((data: { phase: string; introData?: Record<string, unknown> }) => void) | null) => {
    onPtmPhaseRef.current = cb;
  }, []);

  return {
    isConnected,
    sendCommand,
    sendPitch,
    sendHeartbeat,
    setOnGameState,
    setOnDifficulty,
    setOnPauseState,
    setOnDialog,
    setOnPartyLeave,
    setOnPtmPhase,
  };
}
