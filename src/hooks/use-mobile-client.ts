'use client';

import { useCallback, useRef, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { useGameStore } from '@/lib/game/store';
import type { Song, GameMode } from '@/types/game';

import { useMobilePitchPolling } from '@/hooks/use-mobile-pitch-polling';
import { useCompanionSync } from '@/hooks/use-companion-sync';
import { useSongLibrarySync } from '@/hooks/use-song-library-sync';

interface UseMobileClientOptions {
  song: Song | null;
  isPlaying: boolean;
  currentTime: number;
  gameMode?: GameMode;
}

/**
 * Main mobile client hook — facade that composes focused sub-hooks.
 *
 * Now uses Socket.IO for real-time game state push to Companions.
 * Falls back to HTTP POST if Socket.IO is not connected.
 *
 * Sub-hooks:
 * - useMobilePitchPolling — pitch data polling (deduped)
 * - useCompanionSync — companion profiles & queue management
 * - useSongLibrarySync — song library & host profile sync
 */
export function useMobileClient({
  song,
  isPlaying,
  currentTime,
  gameMode,
}: UseMobileClientOptions): {
  mobilePitch: import('@/hooks/use-mobile-pitch-polling').MobilePitchData | null;
  hasMobileClient: boolean;
  sendGameState: () => Promise<void>;
  sendAdState: (_isAdPlaying: boolean) => Promise<void>;
  companionProfiles: import('@/hooks/use-companion-sync').CompanionProfile[];
  syncCompanionProfiles: () => Promise<void>;
  companionQueue: import('@/hooks/use-companion-sync').CompanionQueueItem[];
  syncSongLibrary: () => Promise<void>;
  pushDifficulty: (_difficulty: 'easy' | 'medium' | 'hard') => void;
  pushPauseState: (_isPaused: boolean, _pauseInitiator: string | null) => void;
  pushDialog: (_dialog: string | null, _dialogData?: Record<string, unknown>) => void;
  pushPartyLeave: (_show: boolean) => void;
  pushPtmPhase: (_phase: string, _introData?: Record<string, unknown>) => void;
} {
  // ── Sub-hooks ──
  const { mobilePitch, hasMobileClient } = useMobilePitchPolling(song);
  const {
    companionProfiles,
    syncCompanionProfiles,
    companionQueue,
  } = useCompanionSync();
  const profiles = useGameStore((state) => state.profiles);
  const { syncSongLibrary } = useSongLibrarySync(profiles);

  // ── Socket.IO host connection ──
  const socketRef = useRef<Socket | null>(null);
  const socketConnectedRef = useRef(false);

  useEffect(() => {
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
      socketConnectedRef.current = true;
      socket.emit('host:register');
    });

    socket.on('disconnect', () => {
      socketConnectedRef.current = false;
    });

    socket.on('connect_error', (err) => {
      console.debug('[Socket.IO Host] Connection error:', err.message);
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
      socketConnectedRef.current = false;
    };
  }, []);

  // ── Game state sending ──
  const currentTimeRef = useRef(currentTime);
  const isPlayingRef = useRef(isPlaying);
  const gameModeRef = useRef(gameMode);
  const lastSentRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  useEffect(() => {
    currentTimeRef.current = currentTime;
    isPlayingRef.current = isPlaying;
    gameModeRef.current = gameMode;
  }, [currentTime, isPlaying, gameMode]);

  const sendGameState = useCallback(async () => {
    if (!song) return;

    const now = Date.now();
    if (now - lastSentRef.current < 500) return; // Max 2 Hz throttle
    lastSentRef.current = now;

    const payload = {
      currentSong: { id: song.id, title: song.title, artist: song.artist },
      isPlaying: isPlayingRef.current,
      currentTime: currentTimeRef.current,
      gameMode: gameModeRef.current || 'standard',
    };

    // Prefer Socket.IO push (instant, no HTTP overhead)
    if (socketRef.current?.connected) {
      socketRef.current.emit('host:gamestate', { gameState: payload });
      return;
    }

    // Fallback: HTTP POST
    try {
      await fetch('/api/mobile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'gamestate',
          payload,
        }),
        signal: abortControllerRef.current?.signal,
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      console.debug('[useMobileClient]: sendGameState failed', error);
    }
  }, [song]);

  // Send game state periodically (throttled) — but only as HTTP fallback
  // Socket.IO sends are event-driven, so this interval is mainly for
  // keeping the HTTP mutableState in sync on the server side.
  useEffect(() => {
    if (!song) return;
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const sendViaHttp = async () => {
      const payload = {
        currentSong: { id: song.id, title: song.title, artist: song.artist },
        isPlaying: isPlayingRef.current,
        currentTime: currentTimeRef.current,
        gameMode: gameModeRef.current || 'standard',
      };

      // Always keep server-side mutableState in sync via HTTP
      // (needed for companions that might not have Socket.IO yet)
      try {
        await fetch('/api/mobile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'gamestate', payload }),
          signal: controller.signal,
        });
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
      }
    };

    sendViaHttp(); // immediate first send
    const interval = setInterval(sendViaHttp, 2000); // 2s interval for HTTP sync (reduced from 500ms)
    return () => {
      clearInterval(interval);
      controller.abort();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [song]);

  // ── Ad state sending ──
  const sendAdState = useCallback(async (isAdPlaying: boolean) => {
    try {
      await fetch('/api/mobile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'setAdPlaying',
          payload: { isAdPlaying },
        }),
        signal: abortControllerRef.current?.signal,
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      console.debug('[useMobileClient]: sendAdState failed', error);
    }
  }, []);

  // ── Socket.IO Push Methods (must be defined before useEffects that reference them) ──

  /** Push difficulty change to all Companions via Socket.IO */
  const pushDifficulty = useCallback((difficulty: 'easy' | 'medium' | 'hard') => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('host:difficulty', { difficulty });
    }
    // Also update server-side mutableState via HTTP
    fetch('/api/mobile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'gamestate', payload: { difficulty } }),
    }).catch(() => {});
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

  // ── Listen for difficulty changes from settings screen and push via Socket.IO ──
  useEffect(() => {
    const handleSettingsChange = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.difficulty) {
        pushDifficulty(detail.difficulty as 'easy' | 'medium' | 'hard');
      }
    };
    window.addEventListener('settingsChange', handleSettingsChange);
    return () => window.removeEventListener('settingsChange', handleSettingsChange);
  }, [pushDifficulty]);

  // ── Listen for pause/play changes and push via Socket.IO ──
  useEffect(() => {
    const handlePauseChange = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.isPaused !== undefined) {
        pushPauseState(detail.isPaused, detail.pauseInitiator || null);
      }
    };
    window.addEventListener('pause-state-change', handlePauseChange);
    return () => window.removeEventListener('pause-state-change', handlePauseChange);
  }, [pushPauseState]);

  // ── Listen for dialog changes and push via Socket.IO ──
  useEffect(() => {
    const handleDialogChange = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      pushDialog(detail?.dialog ?? null, detail?.dialogData);
    };
    window.addEventListener('desktop-dialog-change', handleDialogChange);
    return () => window.removeEventListener('desktop-dialog-change', handleDialogChange);
  }, [pushDialog]);

  // ── Listen for party-leave changes and push via Socket.IO ──
  useEffect(() => {
    const handlePartyLeave = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      pushPartyLeave(detail?.show ?? false);
    };
    window.addEventListener('party-leave-change', handlePartyLeave);
    return () => window.removeEventListener('party-leave-change', handlePartyLeave);
  }, [pushPartyLeave]);

  // ── Listen for PTM phase changes and push via Socket.IO ──
  useEffect(() => {
    const handlePtmPhase = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      pushPtmPhase(detail?.phase ?? '', detail?.introData);
    };
    window.addEventListener('ptm-phase-changed', handlePtmPhase);
    return () => window.removeEventListener('ptm-phase-changed', handlePtmPhase);
  }, [pushPtmPhase]);

  return {
    mobilePitch,
    hasMobileClient,
    sendGameState,
    sendAdState,
    companionProfiles,
    syncCompanionProfiles,
    companionQueue,
    syncSongLibrary,
    pushDifficulty,
    pushPauseState,
    pushDialog,
    pushPartyLeave,
    pushPtmPhase,
  };
}
