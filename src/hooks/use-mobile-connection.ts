'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import type { MobileProfile, GameState } from '@/components/screens/mobile/mobile-types';

interface UseMobileConnectionCallbacks {
  onProfileLoaded: (profile: MobileProfile) => void;
  onProfileFieldsLoaded: (name: string, color: string, avatar: string | null) => void;
  onGameStateUpdate: (gameState: GameState) => void;
  onError: (error: string) => void;
  onSongEnd: () => void;
}

function parseGameState(raw: any): GameState {
  return {
    currentSong: raw.currentSong,
    isPlaying: raw.isPlaying,
    songEnded: raw.songEnded || false,
    queueLength: raw.queueLength || 0,
    isAdPlaying: raw.isAdPlaying || false,
  };
}

export function useMobileConnection(callbacks: UseMobileConnectionCallbacks) {
  // Store callbacks in refs so connect() stays stable across renders
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  const [clientId, setClientId] = useState<string | null>(null);
  const [connectionCode, setConnectionCode] = useState<string>('');
  const [isConnected, setIsConnected] = useState(false);
  const [gameState, setGameState] = useState<GameState>({ 
    currentSong: null, isPlaying: false, songEnded: false, queueLength: 0, isAdPlaying: false 
  });

  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isConnectingRef = useRef(false); // True while a connect attempt is in progress
  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;

  // Internal reconnect function — bypasses the isConnecting guard.
  // Used by visibilitychange handler to force reconnect after wake from sleep.
  const reconnectInternal = useCallback(async (isWakeUp = false) => {
    if (isConnectingRef.current) return; // Don't double-connect
    isConnectingRef.current = true;

    try {
      // Strategy 1: Reconnect via saved connection code
      const savedCode = localStorage.getItem('karaoke-connection-code');
      if (savedCode) {
        try {
          const r = await fetch(`/api/mobile?action=reconnect&code=${savedCode}`);
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
              const parsed = parseGameState(d.gameState);
              setGameState(parsed);
              callbacksRef.current.onGameStateUpdate(parsed);
            }
            console.log(`[MobileClient] Reconnected via code${isWakeUp ? ' (wake-up)' : ''}:`, savedCode);
            isConnectingRef.current = false;
            return;
          }
        } catch { /* fall through */ }
      }

      // Strategy 2: Fresh connect (server does IP-based zombie detection)
      const response = await fetch('/api/mobile?action=connect');
      const data = await response.json();
      if (data.success) {
        const newClientId = data.clientId;
        const newCode = data.connectionCode;
        setClientId(newClientId);
        setConnectionCode(newCode);
        setIsConnected(true);
        localStorage.setItem('karaoke-connection-code', newCode);

        if (data.gameState) {
          const parsed = parseGameState(data.gameState);
          setGameState(parsed);
          callbacksRef.current.onGameStateUpdate(parsed);
        }

        if (data.ipReconnected && data.profile) {
          callbacksRef.current.onProfileLoaded(data.profile);
          callbacksRef.current.onProfileFieldsLoaded(data.profile.name, data.profile.color, data.profile.avatar || null);
          console.log('[MobileClient] IP-based reconnect, profile:', data.profile.name);
        } else if (!data.ipReconnected) {
          // Auto-restore profile from localStorage
          const savedProfile = localStorage.getItem('karaoke-mobile-profile');
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
            } catch { /* ignore */ }
          }
        }
        console.log(`[MobileClient] Connected${isWakeUp ? ' (wake-up)' : ''}:`, newCode);
      } else {
        callbacksRef.current.onError('Failed to connect to server');
      }
    } catch {
      callbacksRef.current.onError('Connection failed - is the server running?');
    } finally {
      isConnectingRef.current = false;
    }
  }, []);

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
        localStorage.setItem('karaoke-connection-code', data.connectionCode);
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

  // Auto-connect on mount
  useEffect(() => {
    queueMicrotask(() => connect());
  }, [connect]);

  // Heartbeat + connection health check
  useEffect(() => {
    if (!isConnected || !clientId) return;

    let missedHeartbeats = 0;
    const MAX_MISSED = 2;

    const sendHeartbeat = async () => {
      try {
        const r = await fetch('/api/mobile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'heartbeat', clientId }),
        });
        if (r.ok) {
          missedHeartbeats = 0; // Reset on success
        } else {
          missedHeartbeats++;
        }
      } catch {
        missedHeartbeats++;
      }

      // If too many missed heartbeats, try reconnecting
      if (missedHeartbeats >= MAX_MISSED) {
        console.log('[MobileClient] Heartbeat failed', missedHeartbeats, 'times, reconnecting...');
        setIsConnected(false);
        reconnectInternal(true).catch(() => {});
      }
    };

    // Send heartbeat every 15 seconds (more frequent for faster failure detection)
    heartbeatIntervalRef.current = setInterval(sendHeartbeat, 15000);

    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
    };
  }, [isConnected, clientId, reconnectInternal]);

  // Visibility change: reconnect when phone wakes from sleep
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && clientId) {
        console.log('[MobileClient] Phone woke up, sending heartbeat...');
        // Send an immediate heartbeat to verify connection is still alive
        fetch('/api/mobile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'heartbeat', clientId }),
        }).then((r) => {
          if (!r.ok) {
            console.log('[MobileClient] Heartbeat failed after wake, reconnecting...');
            setIsConnected(false);
            reconnectInternal(true).catch(() => {});
          }
        }).catch(() => {
          console.log('[MobileClient] Heartbeat error after wake, reconnecting...');
          setIsConnected(false);
          reconnectInternal(true).catch(() => {});
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [clientId, reconnectInternal]);

  // Sync game state periodically and detect song end
  useEffect(() => {
    if (!isConnected) return;
    
    const syncInterval = setInterval(async () => {
      try {
        const response = await fetch('/api/mobile?action=gamestate');
        const data = await response.json();
        if (data.success && data.gameState) {
          const prevSongEnded = gameStateRef.current.songEnded;
          const newSongEnded = data.gameState.songEnded || false;
          
          const parsed = parseGameState(data.gameState);
          setGameState(parsed);
          callbacksRef.current.onGameStateUpdate(parsed);
          
          if (newSongEnded && !prevSongEnded) {
            callbacksRef.current.onSongEnd();
          }
        }
      } catch {
        // Ignore sync errors
      }
    }, 1000);
    
    return () => clearInterval(syncInterval);
  }, [isConnected]);

  return {
    clientId,
    connectionCode,
    isConnected,
    gameState,
    connect,
    syncProfile,
    cleanup,
  };
}
