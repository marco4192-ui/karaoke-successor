/**
 * Hook for managing mobile client connection to the main app
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { apiClient } from '@/lib/api-client';

export interface MobileGameState {
  currentSong: { title: string; artist: string } | null;
  isPlaying: boolean;
  songEnded: boolean;
  queueLength: number;
  isAdPlaying: boolean;
}

export interface UseMobileConnectionOptions {
  onGameEnd?: () => void;
}

export interface UseMobileConnectionReturn {
  clientId: string | null;
  connectionCode: string;
  isConnected: boolean;
  error: string | null;
  gameState: MobileGameState;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
}

export function useMobileConnection(
  options: UseMobileConnectionOptions = {}
): UseMobileConnectionReturn {
  const { onGameEnd } = options;

  const [clientId, setClientId] = useState<string | null>(null);
  const [connectionCode, setConnectionCode] = useState<string>('');
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gameState, setGameState] = useState<MobileGameState>({
    currentSong: null,
    isPlaying: false,
    songEnded: false,
    queueLength: 0,
    isAdPlaying: false,
  });

  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const gameStateIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Connect to the server
  const connect = useCallback(async () => {
    try {
      const savedConnectionCode = localStorage.getItem('karaoke-connection-code');

      if (savedConnectionCode) {
        const reconnectData = await apiClient.mobileReconnect(savedConnectionCode);

        if (reconnectData.success) {
          setClientId(reconnectData.clientId as string);
          setConnectionCode(savedConnectionCode);
          setIsConnected(true);
          if (reconnectData.gameState) {
            const gs = reconnectData.gameState as MobileGameState;
            setGameState({
              currentSong: gs.currentSong,
              isPlaying: gs.isPlaying,
              songEnded: gs.songEnded || false,
              queueLength: gs.queueLength || 0,
              isAdPlaying: gs.isAdPlaying || false,
            });
          }
          return;
        }
      }

      // Fresh connection
      const data = await apiClient.mobileConnect();
      if (data.success) {
        const newClientId = data.clientId as string;
        const newConnectionCode = data.connectionCode as string;
        setClientId(newClientId);
        setConnectionCode(newConnectionCode);
        setIsConnected(true);
        localStorage.setItem('karaoke-connection-code', newConnectionCode);

        if (data.gameState) {
          const gs = data.gameState as MobileGameState;
          setGameState({
            currentSong: gs.currentSong,
            isPlaying: gs.isPlaying,
            songEnded: gs.songEnded || false,
            queueLength: gs.queueLength || 0,
            isAdPlaying: gs.isAdPlaying || false,
          });
        }
      } else {
        setError('Failed to connect to server');
      }
    } catch {
      setError('Connection failed - is the server running?');
    }
  }, []);

  // Disconnect from server
  const disconnect = useCallback(async () => {
    if (clientId) {
      try {
        await apiClient.mobileDisconnect(clientId);
      } catch {
        // Ignore disconnect errors
      }
    }
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }
    if (gameStateIntervalRef.current) {
      clearInterval(gameStateIntervalRef.current);
    }
    setClientId(null);
    setIsConnected(false);
    setConnectionCode('');
  }, [clientId]);

  // Heartbeat to keep connection alive
  useEffect(() => {
    if (!isConnected || !clientId) return;

    const sendHeartbeat = async () => {
      try {
        await apiClient.mobileHeartbeat(clientId);
      } catch {
        // Ignore heartbeat errors
      }
    };

    heartbeatIntervalRef.current = setInterval(sendHeartbeat, 30000);

    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
    };
  }, [isConnected, clientId]);

  // Sync game state periodically
  useEffect(() => {
    if (!isConnected) return;

    const syncGameState = async () => {
      try {
        const data = await apiClient.mobileGetGameState();
        if (data.success && data.gameState) {
          const gs = data.gameState as MobileGameState;
          const prevSongEnded = gameState.songEnded;
          const newSongEnded = gs.songEnded || false;

          setGameState({
            currentSong: gs.currentSong,
            isPlaying: gs.isPlaying,
            songEnded: newSongEnded,
            queueLength: gs.queueLength || 0,
            isAdPlaying: gs.isAdPlaying || false,
          });

          // Trigger callback when song ends
          if (newSongEnded && !prevSongEnded && onGameEnd) {
            onGameEnd();
          }
        }
      } catch {
        // Ignore sync errors
      }
    };

    gameStateIntervalRef.current = setInterval(syncGameState, 1000);

    return () => {
      if (gameStateIntervalRef.current) {
        clearInterval(gameStateIntervalRef.current);
      }
    };
  }, [isConnected, gameState.songEnded, onGameEnd]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (clientId) {
        apiClient.mobileDisconnect(clientId).catch(() => {});
      }
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      if (gameStateIntervalRef.current) {
        clearInterval(gameStateIntervalRef.current);
      }
    };
  }, [clientId]);

  // Auto-connect on mount
  useEffect(() => {
    queueMicrotask(() => connect());
  }, [connect]);

  return {
    clientId,
    connectionCode,
    isConnected,
    error,
    gameState,
    connect,
    disconnect,
  };
}
