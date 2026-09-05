'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import type { GameState } from '@/components/screens/mobile/mobile-types';

/**
 * Socket.IO hook for the Desktop (host) side.
 *
 * Connects to the Socket.IO server and provides methods to:
 * - Push game state changes to all Companions
 * - Push difficulty changes to all Companions
 * - Push pause/dialog state to all Companions
 * - Receive commands from Companions (instead of polling getcommands)
 * - Receive pitch data from Companions (instead of polling getpitch)
 */
export function useSocketIOHost() {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [companionCount, setCompanionCount] = useState(0);

  // Command callback ref (set by useRemoteControl)
  const onCommandRef = useRef<((cmd: unknown) => void) | null>(null);
  // Pitch callback ref (set by useMobilePitchPolling)
  const onPitchRef = useRef<((data: unknown) => void) | null>(null);
  // Companion connected/disconnected callback
  const onCompanionChangeRef = useRef<((data: { clientId: string; clientName?: string; companionCount: number }) => void) | null>(null);

  // Connect on mount
  useEffect(() => {
    // Determine Socket.IO server URL (same origin by default)
    const socketUrl = typeof window !== 'undefined' ? window.location.origin : '';
    
    const socket = io(socketUrl, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
    });

    socket.on('connect', () => {
      console.log('[Socket.IO Host] Connected:', socket.id);
      setIsConnected(true);
      // Register as host
      socket.emit('host:register');
    });

    socket.on('disconnect', (reason) => {
      console.log('[Socket.IO Host] Disconnected:', reason);
      setIsConnected(false);
    });

    socket.on('host:registered', (data: { companionCount: number }) => {
      setCompanionCount(data.companionCount);
    });

    // Receive commands from Companions
    socket.on('command', (cmd: unknown) => {
      if (onCommandRef.current) {
        onCommandRef.current(cmd);
      }
    });

    // Receive pitch data from Companions
    socket.on('pitch', (data: unknown) => {
      if (onPitchRef.current) {
        onPitchRef.current(data);
      }
    });

    // Companion connected/disconnected notifications
    socket.on('companion:connected', (data: { clientId: string; clientName?: string; companionCount: number }) => {
      setCompanionCount(data.companionCount);
      if (onCompanionChangeRef.current) {
        onCompanionChangeRef.current(data);
      }
    });

    socket.on('companion:disconnected', (data: { companionCount: number }) => {
      setCompanionCount(data.companionCount);
    });

    socket.on('connect_error', (err) => {
      console.debug('[Socket.IO Host] Connection error:', err.message);
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  // ─── Push Methods ───

  /** Push game state to all Companions */
  const pushGameState = useCallback((gameState: Record<string, unknown>) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('host:gamestate', { gameState });
    }
  }, []);

  /** Push difficulty change to all Companions */
  const pushDifficulty = useCallback((difficulty: 'easy' | 'medium' | 'hard') => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('host:difficulty', { difficulty });
    }
  }, []);

  /** Push pause state to all Companions */
  const pushPauseState = useCallback((isPaused: boolean, pauseInitiator: string | null) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('host:pause-state', { isPaused, pauseInitiator });
    }
  }, []);

  /** Push dialog/overlay state to all Companions */
  const pushDialog = useCallback((dialog: string | null, dialogData?: Record<string, unknown>) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('host:dialog', { dialog, dialogData });
    }
  }, []);

  /** Push party-leave overlay to all Companions */
  const pushPartyLeave = useCallback((show: boolean) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('host:party-leave', { show });
    }
  }, []);

  /** Push PTM/party-mode phase change to all Companions */
  const pushPtmPhase = useCallback((phase: string, introData?: Record<string, unknown>) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('host:ptm-phase', { phase, introData });
    }
  }, []);

  // ─── Callback Setters ───

  /** Set callback for receiving commands from Companions */
  const setOnCommand = useCallback((cb: ((cmd: unknown) => void) | null) => {
    onCommandRef.current = cb;
  }, []);

  /** Set callback for receiving pitch data from Companions */
  const setOnPitch = useCallback((cb: ((data: unknown) => void) | null) => {
    onPitchRef.current = cb;
  }, []);

  /** Set callback for companion connection changes */
  const setOnCompanionChange = useCallback((cb: ((data: { clientId: string; clientName?: string; companionCount: number }) => void) | null) => {
    onCompanionChangeRef.current = cb;
  }, []);

  return {
    isConnected,
    companionCount,
    pushGameState,
    pushDifficulty,
    pushPauseState,
    pushDialog,
    pushPartyLeave,
    pushPtmPhase,
    setOnCommand,
    setOnPitch,
    setOnCompanionChange,
  };
}
