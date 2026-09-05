'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { StorageKeys, setItem, removeItem, getString } from '@/lib/storage';
import type { MobileProfile, GameState } from '@/components/screens/mobile/mobile-types';

interface UseMobileConnectionCallbacks {
  onProfileLoaded: (_profile: MobileProfile) => void;
  onProfileFieldsLoaded: (_name: string, _color: string, _avatar: string | null) => void;
  onGameStateUpdate: (_gameState: GameState) => void;
  onError: (_error: string) => void;
  onSongEnd: () => void;
}

interface RawGameState {
  currentSong?: GameState['currentSong'];
  isPlaying?: boolean;
  songEnded?: boolean;
  queueLength?: number;
  isAdPlaying?: boolean;
  gameMode?: string | null;
  singalongTurn?: GameState['singalongTurn'];
  cptmTurn?: GameState['cptmTurn'];
  tournamentMatchId?: string | null;
  companionScores?: GameState['companionScores'];
  currentScreen?: string;
  partyGameMode?: string | null;
  votingSongs?: GameState['votingSongs'];
  partyLibrarySong?: GameState['partyLibrarySong'];
  isPartyModeActive?: boolean;
  desktopDialog?: GameState['desktopDialog'];
  pauseInitiator?: string | null;
  ptmPhase?: GameState['ptmPhase'];
  ptmIntroData?: GameState['ptmIntroData'];
  viralSongIds?: string[];
  difficulty?: 'easy' | 'medium' | 'hard';
}

function parseGameState(raw: RawGameState): GameState {
  return {
    currentSong: raw.currentSong ?? null,
    isPlaying: raw.isPlaying ?? false,
    songEnded: raw.songEnded ?? false,
    queueLength: raw.queueLength ?? 0,
    isAdPlaying: raw.isAdPlaying ?? false,
    gameMode: (raw.gameMode as GameState['gameMode']) ?? null,
    singalongTurn: raw.singalongTurn ?? null,
    cptmTurn: raw.cptmTurn ?? null,
    tournamentMatchId: raw.tournamentMatchId ?? null,
    companionScores: raw.companionScores ?? null,
    currentScreen: raw.currentScreen,
    partyGameMode: raw.partyGameMode ?? null,
    votingSongs: raw.votingSongs,
    partyLibrarySong: raw.partyLibrarySong ?? null,
    isPartyModeActive: raw.isPartyModeActive,
    desktopDialog: raw.desktopDialog ?? null,
    pauseInitiator: raw.pauseInitiator ?? null,
    ptmPhase: raw.ptmPhase ?? null,
    ptmIntroData: raw.ptmIntroData ?? null,
    viralSongIds: raw.viralSongIds ?? [],
    difficulty: raw.difficulty ?? 'medium',
  };
}

const INITIAL_GAME_STATE: GameState = {
  currentSong: null,
  isPlaying: false,
  songEnded: false,
  queueLength: 0,
  isAdPlaying: false,
  gameMode: null,
  singalongTurn: null,
  cptmTurn: null,
  tournamentMatchId: null,
  companionScores: null,
  currentScreen: undefined,
  partyGameMode: null,
  ptmPhase: null,
  ptmIntroData: null,
  viralSongIds: [],
  difficulty: 'medium',
};

export function useMobileConnection(callbacks: UseMobileConnectionCallbacks) {
  // Store callbacks in refs so connect() stays stable across renders
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  const [clientId, setClientId] = useState<string | null>(null);
  const [connectionCode, setConnectionCode] = useState<string>('');
  const [isConnected, setIsConnected] = useState(false);
  const [gameState, setGameState] = useState<GameState>(INITIAL_GAME_STATE);

  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isConnectingRef = useRef(false);
  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;

  // Socket.IO connection ref
  const socketRef = useRef<Socket | null>(null);
  const socketConnectedRef = useRef(false);

  // Keep isConnectedRef in sync for use in setTimeout callbacks
  const isConnectedRef = useRef(isConnected);
  useEffect(() => { isConnectedRef.current = isConnected; }, [isConnected]);

  // clientIdRef tracks the latest clientId for use in callbacks that run
  // after the component may have re-rendered (e.g. disconnect, wake-up).
  const clientIdRef = useRef(clientId);
  clientIdRef.current = clientId;

  // ─── Process game state update (shared by Socket.IO and HTTP fallback) ───
  const processGameStateUpdate = useCallback((rawGameState: RawGameState) => {
    const prevSongEnded = gameStateRef.current.songEnded || false;

    const parsed = parseGameState(rawGameState);
    // Explicitly update ref so the next poll sees the latest state
    // immediately, without depending on React render timing.
    gameStateRef.current = parsed;
    setGameState(parsed);
    callbacksRef.current.onGameStateUpdate(parsed);

    const newSongEnded = parsed.songEnded || false;
    if (newSongEnded && !prevSongEnded) {
      callbacksRef.current.onSongEnd();
    }
  }, []);

  // ─── Socket.IO Connection (real-time, replaces polling) ───
  useEffect(() => {
    // Only connect Socket.IO after we have a clientId from HTTP
    if (!clientId || !isConnected) return;

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
      console.log('[Socket.IO Companion] Connected:', socket.id);
      socketConnectedRef.current = true;
      // Register as companion with our clientId
      socket.emit('companion:register', { clientId });
    });

    socket.on('disconnect', (reason) => {
      console.log('[Socket.IO Companion] Disconnected:', reason);
      socketConnectedRef.current = false;
    });

    // ─── Receive game state updates via WebSocket (PUSH, no polling!) ───
    socket.on('gamestate', (data: { gameState: RawGameState }) => {
      processGameStateUpdate(data.gameState);
    });

    // ─── Receive difficulty updates ───
    socket.on('difficulty', (data: { difficulty: 'easy' | 'medium' | 'hard' }) => {
      const current = gameStateRef.current;
      const updated = { ...current, difficulty: data.difficulty };
      gameStateRef.current = updated;
      setGameState(updated);
      callbacksRef.current.onGameStateUpdate(updated);
    });

    // ─── Receive pause state updates ───
    socket.on('pause-state', (data: { isPaused: boolean; pauseInitiator: string | null }) => {
      const current = gameStateRef.current;
      const updated = { ...current, isPlaying: !data.isPaused, pauseInitiator: data.pauseInitiator };
      gameStateRef.current = updated;
      setGameState(updated);
      callbacksRef.current.onGameStateUpdate(updated);
    });

    // ─── Receive dialog/overlay updates ───
    socket.on('desktop-dialog', (data: { dialog: string | null; dialogData?: Record<string, unknown> }) => {
      const current = gameStateRef.current;
      const updated = { ...current, desktopDialog: data.dialog as GameState['desktopDialog'] };
      gameStateRef.current = updated;
      setGameState(updated);
      callbacksRef.current.onGameStateUpdate(updated);
    });

    // ─── Receive party-leave overlay ───
    socket.on('party-leave', (data: { show: boolean }) => {
      // Dispatch custom event for the companion UI to react
      window.dispatchEvent(new CustomEvent('socket-party-leave', { detail: data }));
    });

    // ─── Receive PTM/party-mode phase changes ───
    socket.on('ptm-phase', (data: { phase: string; introData?: Record<string, unknown> }) => {
      const current = gameStateRef.current;
      const updated = {
        ...current,
        ptmPhase: data.phase as GameState['ptmPhase'],
        ptmIntroData: data.introData as GameState['ptmIntroData'],
      };
      gameStateRef.current = updated;
      setGameState(updated);
      callbacksRef.current.onGameStateUpdate(updated);
    });

    socket.on('connect_error', (err) => {
      console.debug('[Socket.IO Companion] Connection error:', err.message);
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
      socketConnectedRef.current = false;
    };
  }, [clientId, isConnected, processGameStateUpdate]);

  // ─── HTTP Fallback: Slow polling only when Socket.IO is NOT connected ───
  // This provides resilience if WebSocket fails or isn't available.
  // Polls every 3 seconds instead of 500ms, only as a safety net.
  useEffect(() => {
    if (!isConnected) return;

    const fallbackInterval = setInterval(async () => {
      // Skip HTTP poll if Socket.IO is connected (we get push updates)
      if (socketConnectedRef.current) return;

      try {
        const response = await fetch('/api/mobile?action=gamestate');
        const data = await response.json();
        if (data.success && data.gameState) {
          processGameStateUpdate(data.gameState);
        }
      } catch (error) {
        console.debug('[useMobileConnection]: fallback game state sync failed', error);
      }
    }, 3000); // 3s fallback — much slower than before, only when WS is down

    return () => clearInterval(fallbackInterval);
  }, [isConnected, processGameStateUpdate]);

  // ─── Send command via Socket.IO (for Companion → Desktop) ───
  const sendCommand = useCallback((command: { type: string; data?: unknown }) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('companion:command', {
        ...command,
        timestamp: Date.now(),
      });
    }
  }, []);

  // ─── Send pitch data via Socket.IO ───
  const sendPitch = useCallback((pitch: { frequency: number; clarity: number; volume: number }) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('companion:pitch', pitch);
    }
  }, []);

  // Internal reconnect function — bypasses the isConnecting guard.
  const reconnectInternal = useCallback(async (_isWakeUp = false) => {
    if (isConnectingRef.current) return;
    isConnectingRef.current = true;

    try {
      // Strategy 1: Reconnect via saved connection code
      const savedCode = getString(StorageKeys.CONNECTION_CODE);
      if (savedCode) {
        try {
          const r = await fetch(`/api/mobile?action=reconnect&code=${encodeURIComponent(savedCode)}`);
          const d = await r.json();
          if (d.success) {
            setClientId(d.clientId);
            setConnectionCode(savedCode);
            setIsConnected(true);
            if (d.profile) {
              callbacksRef.current.onProfileLoaded(d.profile);
              callbacksRef.current.onProfileFieldsLoaded(d.profile.name, d.profile.color, d.profile.avatar || null);
            }
            if (d.gameState) {
              processGameStateUpdate(d.gameState);
            }
            reconnectBackoffRef.current = 0;
            isConnectingRef.current = false;
            return;
          }
        } catch { /* fall through */ }
      }

      // Strategy 2: Fresh connect (server does IP-based zombie detection)
      const response = await fetch('/api/mobile?action=connect');
      const data = await response.json();
      if (data.success) {
        reconnectBackoffRef.current = 0;
        const newClientId = data.clientId;
        const newCode = data.connectionCode;
        setClientId(newClientId);
        setConnectionCode(newCode);
        setIsConnected(true);
        setItem(StorageKeys.CONNECTION_CODE, newCode);

        if (data.gameState) {
          processGameStateUpdate(data.gameState);
        }

        if (data.ipReconnected && data.profile) {
          callbacksRef.current.onProfileLoaded(data.profile);
          callbacksRef.current.onProfileFieldsLoaded(data.profile.name, data.profile.color, data.profile.avatar || null);
        } else if (!data.ipReconnected) {
          // Auto-restore profile from localStorage
          const savedProfile = getString(StorageKeys.MOBILE_PROFILE);
          if (savedProfile) {
            try {
              const profileToRestore = JSON.parse(savedProfile);
              callbacksRef.current.onProfileLoaded(profileToRestore);
              callbacksRef.current.onProfileFieldsLoaded(profileToRestore.name, profileToRestore.color, profileToRestore.avatar || null);
              // Sync profile to server
              await fetch('/api/mobile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'profile', clientId: newClientId, payload: profileToRestore }),
              }).catch(() => {});
            } catch (error) { console.debug('[useMobileConnection]: profile restore failed', error); }
          }
        }
      } else {
        callbacksRef.current.onError('Failed to connect to server');
      }
    } catch {
      reconnectBackoffRef.current = Math.min(reconnectBackoffRef.current * 2 + 1000, 60000);
      callbacksRef.current.onError('Connection failed - is the server running?');
    } finally {
      isConnectingRef.current = false;
    }
  }, [processGameStateUpdate]);

  // Connect — idempotent, safe to call multiple times
  const connect = useCallback(async () => {
    await reconnectInternal(false);
  }, [reconnectInternal]);

  // Sync profile to server
  const syncProfile = useCallback(async (profileData: MobileProfile) => {
    if (!clientId) return;
    try {
      const response = await fetch('/api/mobile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'profile', clientId, payload: profileData }),
      });
      const data = await response.json();
      if (data.connectionCode) {
        setConnectionCode(data.connectionCode);
        setItem(StorageKeys.CONNECTION_CODE, data.connectionCode);
      }
    } catch (error) {
      console.error('[MobileClient] Error syncing profile:', error);
    }
  }, [clientId]);

  // Cleanup heartbeat
  const cleanup = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  }, []);

  // Disconnect from server: call API, clear local state, prepare for fresh reconnect
  const disconnect = useCallback(async () => {
    const currentClientId = clientIdRef.current;
    // Stop Socket.IO
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      socketConnectedRef.current = false;
    }
    // Stop heartbeat
    cleanup();
    // Notify server
    try {
      if (currentClientId) {
        await fetch(`/api/mobile?action=disconnect&clientId=${currentClientId}`);
      }
    } catch (error) { console.debug('[useMobileConnection]: disconnect API call failed', error); }
    // Clear local state
    setClientId(null);
    setConnectionCode('');
    setIsConnected(false);
    setGameState(INITIAL_GAME_STATE);
    removeItem(StorageKeys.CONNECTION_CODE);
    removeItem(StorageKeys.CLIENT_ID);
  }, [cleanup]);

  // Auto-connect on mount
  useEffect(() => {
    queueMicrotask(() => connect());
  }, [connect]);

  // Heartbeat + connection health check
  // Uses Socket.IO heartbeat when connected, falls back to HTTP
  useEffect(() => {
    if (!isConnected || !clientId) return;

    let missedHeartbeats = 0;
    const MAX_MISSED = 2;

    const sendHeartbeat = async () => {
      // Prefer Socket.IO heartbeat
      if (socketRef.current?.connected) {
        socketRef.current.emit('companion:heartbeat');
        missedHeartbeats = 0;
        return;
      }

      // Fallback: HTTP heartbeat
      try {
        const r = await fetch('/api/mobile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'heartbeat', clientId }),
        });
        if (r.ok) {
          missedHeartbeats = 0;
        } else {
          missedHeartbeats++;
        }
      } catch {
        missedHeartbeats++;
      }

      if (missedHeartbeats >= MAX_MISSED) {
        setIsConnected(false);
        if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = setTimeout(() => {
          if (isConnectedRef.current === false) {
            reconnectInternal(true).catch(() => {});
          }
        }, reconnectBackoffRef.current);
      }
    };

    heartbeatIntervalRef.current = setInterval(sendHeartbeat, 15000);

    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    };
  }, [isConnected, clientId, reconnectInternal]);

  // Shared wake-up handler
  const wakeUpTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectBackoffRef = useRef<number>(0);

  const handleWakeUp = useCallback(() => {
    if (wakeUpTimerRef.current) return;
    wakeUpTimerRef.current = setTimeout(() => { wakeUpTimerRef.current = null; }, 2000);

    // Prefer Socket.IO reconnect
    if (socketRef.current && !socketRef.current.connected) {
      socketRef.current.connect();
      return;
    }

    // Fallback: HTTP heartbeat
    const currentClientId = clientIdRef.current;
    if (!currentClientId) return;
    fetch('/api/mobile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'heartbeat', clientId: currentClientId }),
    }).then((r) => {
      if (!r.ok) {
        setIsConnected(false);
        reconnectInternal(true).catch(() => {});
      }
    }).catch(() => {
      setIsConnected(false);
      reconnectInternal(true).catch(() => {});
    });
  }, [reconnectInternal]);

  // Visibility change: reconnect when phone wakes from sleep
  useEffect(() => {
    document.addEventListener('visibilitychange', handleWakeUp);
    return () => document.removeEventListener('visibilitychange', handleWakeUp);
  }, [handleWakeUp]);

  // pageshow: iOS Safari bfcache
  useEffect(() => {
    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted || document.visibilityState === 'visible') {
        handleWakeUp();
      }
    };
    window.addEventListener('pageshow', handlePageShow);
    return () => window.removeEventListener('pageshow', handlePageShow);
  }, [handleWakeUp]);

  // focus: fallback for browsers that don't fire visibilitychange reliably
  useEffect(() => {
    const handleFocus = () => {
      if (document.visibilityState === 'visible') {
        handleWakeUp();
      }
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [handleWakeUp]);

  // Clear wake-up timer on unmount
  useEffect(() => {
    return () => {
      if (wakeUpTimerRef.current) {
        clearTimeout(wakeUpTimerRef.current);
        wakeUpTimerRef.current = null;
      }
    };
  }, []);

  return {
    clientId,
    connectionCode,
    isConnected,
    gameState,
    connect,
    disconnect,
    syncProfile,
    cleanup,
    sendCommand,
    sendPitch,
    socketConnected: socketConnectedRef.current,
  };
}
