// WebSocket Hook for Multiplayer Communication
// Handles connection, room management, and real-time updates

import { useEffect, useRef, useState, useCallback } from 'react';
import { MultiplayerRoom } from '@/lib/db/user-db';
import { logger } from '@/lib/logger';

// WebSocket message types
export type WSMessageType =
  | 'room-created'
  | 'room-joined'
  | 'room-updated'
  | 'player-joined'
  | 'player-left'
  | 'player-ready'
  | 'game-starting'
  | 'game-started'
  | 'game-ended'
  | 'score-update'
  | 'chat-message'
  | 'error'
  | 'ping'
  | 'pong';

export interface WSMessage {
  type: WSMessageType;
  payload: unknown;
  timestamp: number;
}

export interface WSOptions {
  url?: string;
  autoConnect?: boolean;
  reconnectAttempts?: number;
  reconnectInterval?: number;
}

export interface WSError {
  code: string;
  message: string;
}

interface UseWebSocketReturn {
  isConnected: boolean;
  isConnecting: boolean;
  error: WSError | null;
  lastMessage: WSMessage | null;
  sendMessage: (type: WSMessageType, payload: unknown) => void;
  connect: () => void;
  disconnect: () => void;
  // Room methods
  createRoom: (hostId: string, hostName: string) => Promise<MultiplayerRoom>;
  joinRoom: (code: string, playerId: string, playerName: string) => Promise<MultiplayerRoom>;
  leaveRoom: (playerId: string) => void;
  setReady: (playerId: string, isReady: boolean) => void;
  startGame: (songId: string, songTitle: string) => void;
  updateScore: (playerId: string, score: number) => void;
}

const DEFAULT_OPTIONS: WSOptions = {
  url: typeof window !== 'undefined' 
    ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`
    : '',
  autoConnect: false,
  reconnectAttempts: 5,
  reconnectInterval: 3000,
};

export function useWebSocket(options: WSOptions = {}): UseWebSocketReturn {
  const finalOptions = { ...DEFAULT_OPTIONS, ...options };
  
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<WSError | null>(null);
  const [lastMessage, setLastMessage] = useState<WSMessage | null>(null);
  
  // Use refs for all mutable state that doesn't affect render
  const stateRef = useRef({
    socket: null as WebSocket | null,
    reconnectCount: 0,
    isConnecting: false,
    pingInterval: null as NodeJS.Timeout | null,
    messageQueue: [] as Array<{ type: WSMessageType; payload: unknown }>,
    listeners: new Map<string, Set<(payload: unknown) => void>>(),
  });

  // Stop ping interval
  const stopPingInterval = useCallback(() => {
    if (stateRef.current.pingInterval) {
      clearInterval(stateRef.current.pingInterval);
      stateRef.current.pingInterval = null;
    }
  }, []);

  // Send message function
  const sendMessage = useCallback((type: WSMessageType, payload: unknown) => {
    const state = stateRef.current;
    const message = JSON.stringify({ type, payload, timestamp: Date.now() });
    
    if (state.socket?.readyState === WebSocket.OPEN) {
      state.socket.send(message);
    } else {
      // Queue message for when connected
      state.messageQueue.push({ type, payload });
      logger.debug('[WebSocket]', 'Queued message:', type);
    }
  }, []);

  // Disconnect function
  const disconnect = useCallback(() => {
    const state = stateRef.current;
    stopPingInterval();
    if (state.socket) {
      state.socket.close(1000, 'User disconnected');
      state.socket = null;
    }
    setIsConnected(false);
    setIsConnecting(false);
    state.isConnecting = false;
  }, [stopPingInterval]);

  // Connect function
  const connect = useCallback(() => {
    const state = stateRef.current;
    
    if (state.socket?.readyState === WebSocket.OPEN || state.isConnecting) {
      return;
    }

    if (!finalOptions.url) {
      logger.warn('[WebSocket]', 'No URL provided');
      return;
    }

    setIsConnecting(true);
    state.isConnecting = true;
    setError(null);

    try {
      const wsUrl = finalOptions.url;
      logger.info('[WebSocket]', 'Connecting to:', wsUrl);
      
      state.socket = new WebSocket(wsUrl);

      state.socket.onopen = () => {
        logger.info('[WebSocket]', 'Connected');
        setIsConnected(true);
        setIsConnecting(false);
        state.isConnecting = false;
        setError(null);
        state.reconnectCount = 0;

        // Send queued messages
        while (state.messageQueue.length > 0) {
          const msg = state.messageQueue.shift();
          if (msg && state.socket?.readyState === WebSocket.OPEN) {
            state.socket.send(JSON.stringify({
              type: msg.type,
              payload: msg.payload,
              timestamp: Date.now(),
            }));
          }
        }

        // Start ping interval
        stopPingInterval();
        state.pingInterval = setInterval(() => {
          if (state.socket?.readyState === WebSocket.OPEN) {
            state.socket.send(JSON.stringify({
              type: 'ping',
              payload: { timestamp: Date.now() },
              timestamp: Date.now(),
            }));
          }
        }, 30000);
      };

      state.socket.onmessage = (event) => {
        try {
          const message: WSMessage = JSON.parse(event.data);
          setLastMessage(message);
          
          // Emit to specific listeners
          const listeners = state.listeners.get(message.type);
          if (listeners) {
            listeners.forEach(callback => callback(message.payload));
          }
          
          // Emit to 'all' listeners
          const allListeners = state.listeners.get('*');
          if (allListeners) {
            allListeners.forEach(callback => callback(message));
          }
        } catch (err) {
          logger.error('[WebSocket]', 'Failed to parse message:', err);
        }
      };

      state.socket.onerror = () => {
        logger.error('[WebSocket]', 'Error');
        setError({
          code: 'CONNECTION_ERROR',
          message: 'Failed to connect to server',
        });
        setIsConnecting(false);
        state.isConnecting = false;
      };

      state.socket.onclose = () => {
        logger.info('[WebSocket]', 'Disconnected');
        setIsConnected(false);
        setIsConnecting(false);
        state.isConnecting = false;
        stopPingInterval();

        // Show error - user can manually reconnect
        setError({
          code: 'CONNECTION_LOST',
          message: 'Connection lost. Click Connect to retry.',
        });
      };
    } catch (err) {
      logger.error('[WebSocket]', 'Failed to create connection:', err);
      setIsConnecting(false);
      state.isConnecting = false;
      setError({
        code: 'CONNECTION_FAILED',
        message: 'Failed to establish WebSocket connection',
      });
    }
  }, [finalOptions.url, finalOptions.reconnectAttempts, finalOptions.reconnectInterval, stopPingInterval]);

  // Auto-connect
  useEffect(() => {
    if (finalOptions.autoConnect) {
      // Defer connection to avoid setState during render
      const timer = setTimeout(() => {
        connect();
      }, 0);
      return () => {
        clearTimeout(timer);
        disconnect();
      };
    }
    return () => {
      disconnect();
    };
  }, [finalOptions.autoConnect, connect, disconnect]);

  // Room methods
  const createRoom = useCallback(async (hostId: string, hostName: string): Promise<MultiplayerRoom> => {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Create room timeout'));
      }, 10000);

      const handleResponse = (payload: unknown) => {
        clearTimeout(timeout);
        const room = payload as MultiplayerRoom;
        if (room) {
          resolve(room);
        } else {
          reject(new Error('Failed to create room'));
        }
      };

      const state = stateRef.current;
      const existingListeners = state.listeners.get('room-created') || new Set();
      existingListeners.add(handleResponse);
      state.listeners.set('room-created', existingListeners);

      sendMessage('room-created', { hostId, hostName });
    });
  }, [sendMessage]);

  const joinRoom = useCallback(async (code: string, playerId: string, playerName: string): Promise<MultiplayerRoom> => {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Join room timeout'));
      }, 10000);

      const handleResponse = (payload: unknown) => {
        clearTimeout(timeout);
        const room = payload as MultiplayerRoom;
        if (room) {
          resolve(room);
        } else {
          reject(new Error('Room not found'));
        }
      };

      const handleError = () => {
        clearTimeout(timeout);
        reject(new Error('Failed to join room'));
      };

      const state = stateRef.current;
      let joinListeners = state.listeners.get('room-joined') || new Set();
      joinListeners.add(handleResponse);
      state.listeners.set('room-joined', joinListeners);

      let errorListeners = state.listeners.get('error') || new Set();
      errorListeners.add(handleError);
      state.listeners.set('error', errorListeners);

      sendMessage('room-joined', { code: code.toUpperCase(), playerId, playerName });
    });
  }, [sendMessage]);

  const leaveRoom = useCallback((playerId: string) => {
    sendMessage('player-left', { playerId });
  }, [sendMessage]);

  const setReady = useCallback((playerId: string, isReady: boolean) => {
    sendMessage('player-ready', { playerId, isReady });
  }, [sendMessage]);

  const startGame = useCallback((songId: string, songTitle: string) => {
    sendMessage('game-starting', { songId, songTitle });
  }, [sendMessage]);

  const updateScore = useCallback((playerId: string, score: number) => {
    sendMessage('score-update', { playerId, score });
  }, [sendMessage]);

  return {
    isConnected,
    isConnecting,
    error,
    lastMessage,
    sendMessage,
    connect,
    disconnect,
    createRoom,
    joinRoom,
    leaveRoom,
    setReady,
    startGame,
    updateScore,
  };
}

// Hook for listening to specific message types
export function useWebSocketListener(
  messageType: WSMessageType | '*',
  callback: (payload: unknown) => void,
  deps: React.DependencyList = []
) {
  const callbackRef = useRef(callback);
  
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    // This would need to be integrated with a global WebSocket context
    // For now, it's a placeholder for the pattern
    const handler = (payload: unknown) => callbackRef.current(payload);
    // Placeholder for actual listener registration
    return () => {
      // Cleanup
    };
  }, [messageType, ...deps]);
}
