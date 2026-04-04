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
  const { onProfileLoaded, onProfileFieldsLoaded, onGameStateUpdate, onError, onSongEnd } = callbacks;

  const [clientId, setClientId] = useState<string | null>(null);
  const [connectionCode, setConnectionCode] = useState<string>('');
  const [isConnected, setIsConnected] = useState(false);
  const [gameState, setGameState] = useState<GameState>({ 
    currentSong: null, isPlaying: false, songEnded: false, queueLength: 0, isAdPlaying: false 
  });

  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;

  // Connect to the server
  const connect = useCallback(async () => {
    try {
      // First, check if we have a saved connection code to reconnect
      const savedConnectionCode = localStorage.getItem('karaoke-connection-code');
      const savedProfile = localStorage.getItem('karaoke-mobile-profile');
      
      if (savedConnectionCode && savedProfile) {
        // Try to reconnect with existing code
        const reconnectResponse = await fetch(`/api/mobile?action=reconnect&code=${savedConnectionCode}`);
        const reconnectData = await reconnectResponse.json();
        
        if (reconnectData.success) {
          setClientId(reconnectData.clientId);
          setConnectionCode(savedConnectionCode);
          setIsConnected(true);
          if (reconnectData.profile) {
            onProfileLoaded(reconnectData.profile);
            onProfileFieldsLoaded(
              reconnectData.profile.name,
              reconnectData.profile.color,
              reconnectData.profile.avatar || null,
            );
          }
          if (reconnectData.gameState) {
            const parsed = parseGameState(reconnectData.gameState);
            setGameState(parsed);
            onGameStateUpdate(parsed);
          }
          return; // Successfully reconnected
        }
      }
      
      // Fresh connection
      const response = await fetch('/api/mobile?action=connect');
      const data = await response.json();
      if (data.success) {
        const newClientId = data.clientId;
        const newConnectionCode = data.connectionCode;
        setClientId(newClientId);
        setConnectionCode(newConnectionCode);
        setIsConnected(true);
        
        // Save connection code for reconnection
        localStorage.setItem('karaoke-connection-code', newConnectionCode);
        
        if (data.gameState) {
          const parsed = parseGameState(data.gameState);
          setGameState(parsed);
          onGameStateUpdate(parsed);
        }
        
        // Load saved profile from localStorage and sync
        if (savedProfile) {
          const parsed = JSON.parse(savedProfile);
          onProfileLoaded(parsed);
          onProfileFieldsLoaded(parsed.name, parsed.color, parsed.avatar || null);
          // Sync profile to server after connection
          try {
            const syncResponse = await fetch('/api/mobile', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'profile',
                clientId: newClientId,
                payload: parsed,
              }),
            });
            const syncData = await syncResponse.json();
            if (syncData.connectionCode) {
              setConnectionCode(syncData.connectionCode);
              localStorage.setItem('karaoke-connection-code', syncData.connectionCode);
            }
          } catch {
            // Ignore sync errors
          }
        }
      } else {
        onError('Failed to connect to server');
      }
    } catch {
      onError('Connection failed - is the server running?');
    }
  }, [onProfileLoaded, onProfileFieldsLoaded, onGameStateUpdate, onError]);

  // Sync profile to server
  const syncProfile = useCallback(async (profileData: MobileProfile) => {
    if (!clientId) return;
    try {
      console.log('[MobileClient] Syncing profile to server:', profileData.name);
      const response = await fetch('/api/mobile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'profile',
          clientId,
          payload: profileData,
        }),
      });
      const data = await response.json();
      if (data.connectionCode) {
        setConnectionCode(data.connectionCode);
        localStorage.setItem('karaoke-connection-code', data.connectionCode);
      }
      console.log('[MobileClient] Profile synced successfully');
    } catch (error) {
      console.error('[MobileClient] Error syncing profile:', error);
    }
  }, [clientId]);

  // Cleanup
  const cleanup = useCallback(() => {
    if (clientId) {
      fetch(`/api/mobile?action=disconnect&clientId=${clientId}`).catch(() => {});
    }
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }
  }, [clientId]);

  // Auto-connect on mount
  useEffect(() => {
    queueMicrotask(() => connect());
  }, [connect]);

  // Heartbeat to keep connection alive
  useEffect(() => {
    if (!isConnected || !clientId) return;
    
    const sendHeartbeat = async () => {
      try {
        await fetch('/api/mobile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'heartbeat', clientId }),
        });
      } catch {
        // Ignore heartbeat errors
      }
    };
    
    // Send heartbeat every 30 seconds
    heartbeatIntervalRef.current = setInterval(sendHeartbeat, 30000);
    
    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
    };
  }, [isConnected, clientId]);

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
          onGameStateUpdate(parsed);
          
          // Load game results when song ends
          if (newSongEnded && !prevSongEnded) {
            onSongEnd();
          }
        }
      } catch {
        // Ignore sync errors
      }
    }, 1000);
    
    return () => clearInterval(syncInterval);
  }, [isConnected, onGameStateUpdate, onSongEnd]);

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
