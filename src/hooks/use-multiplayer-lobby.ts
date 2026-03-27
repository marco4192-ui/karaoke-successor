'use client';

import { useState, useEffect } from 'react';
import {
  ExtendedPlayerProfile,
  MultiplayerRoom,
} from '@/lib/db/user-db';
import { getRoomService } from '@/lib/multiplayer/room-service';
import { useWebSocket } from '@/hooks/use-websocket';
import { GameMode, Song } from '@/types/game';
import { logger } from '@/lib/logger';

interface UseMultiplayerLobbyOptions {
  activeProfile?: ExtendedPlayerProfile | null;
  onStartGame?: (room: MultiplayerRoom) => void;
}

export function useMultiplayerLobby({ activeProfile, onStartGame }: UseMultiplayerLobbyOptions) {
  // State
  const [currentRoom, setCurrentRoom] = useState<MultiplayerRoom | null>(null);
  const [joinCode, setJoinCode] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [showSongPicker, setShowSongPicker] = useState(false);
  const [selectedGameMode, setSelectedGameMode] = useState<GameMode>('standard');

  // WebSocket connection (for future online play)
  const { isConnected, connect, disconnect, joinRoom: wsJoinRoom, createRoom: wsCreateRoom } = useWebSocket({
    autoConnect: false,
  });

  // Room service for local play
  const roomService = getRoomService();

  // Local player info
  const playerId = activeProfile?.id || `guest-${Date.now()}`;
  const playerName = activeProfile?.name || 'Guest';
  const playerAvatar = activeProfile?.avatar;

  // Create a new room
  const handleCreateRoom = async () => {
    setIsCreating(true);
    setError(null);

    try {
      const room = await roomService.createRoom(playerId, playerName, {
        maxPlayers: 8,
        gameMode: selectedGameMode,
      });

      setCurrentRoom(room);
      logger.debug('[Lobby]', 'Created room:', room.code);
    } catch (err) {
      logger.error('[Lobby]', 'Failed to create room:', err);
      setError('Failed to create room. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  // Join an existing room
  const handleJoinRoom = async () => {
    if (!joinCode.trim()) return;

    setIsJoining(true);
    setError(null);

    try {
      const room = await roomService.joinRoom(
        joinCode.trim().toUpperCase(),
        playerId,
        playerName,
        playerAvatar
      );

      if (room) {
        setCurrentRoom(room);
        logger.debug('[Lobby]', 'Joined room:', room.code);
      } else {
        setError('Room not found or expired. Please check the code and try again.');
      }
    } catch (err) {
      logger.error('[Lobby]', 'Failed to join room:', err);
      setError('Failed to join room. Please try again.');
    } finally {
      setIsJoining(false);
    }
  };

  // Leave current room
  const handleLeaveRoom = async () => {
    if (currentRoom) {
      await roomService.leaveRoom(playerId);
      setCurrentRoom(null);
      setJoinCode('');
      setSelectedSong(null);
    }
  };

  // Toggle ready status
  const handleToggleReady = async () => {
    if (currentRoom) {
      const isCurrentlyReady = currentRoom.players.find((p) => p.id === playerId)?.isReady;
      await roomService.setPlayerReady(playerId, !isCurrentlyReady);

      const updatedRoom = await roomService.refreshRoom();
      if (updatedRoom) {
        setCurrentRoom(updatedRoom);
      }
    }
  };

  // Start the game (host only)
  const handleStartGame = async () => {
    if (currentRoom && currentRoom.hostId === playerId) {
      if (!selectedSong) {
        setShowSongPicker(true);
        return;
      }

      await roomService.startGame(selectedSong.id, selectedSong.title);

      if (onStartGame) {
        onStartGame(currentRoom);
      }
    }
  };

  // Select a song
  const handleSelectSong = (song: Song) => {
    setSelectedSong(song);
    setShowSongPicker(false);
  };

  // Refresh room periodically
  useEffect(() => {
    if (currentRoom) {
      const interval = setInterval(async () => {
        const updatedRoom = await roomService.refreshRoom();
        if (updatedRoom) {
          setCurrentRoom(updatedRoom);
        }
      }, 2000);

      return () => clearInterval(interval);
    }
  }, [currentRoom]);

  // Check for room code in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomCode = params.get('room');
    if (roomCode && !currentRoom) {
      setJoinCode(roomCode);
    }
  }, []);

  // Derived values
  const isHost = currentRoom?.hostId === playerId;
  const isReady = currentRoom?.players.find((p) => p.id === playerId)?.isReady;
  const allReady = currentRoom?.players.every(
    (p) => p.isReady || p.id === currentRoom.hostId
  );
  const canStart = isHost && allReady && selectedSong;

  return {
    // State
    currentRoom,
    joinCode,
    setJoinCode,
    isCreating,
    isJoining,
    error,
    selectedSong,
    showSongPicker,
    setShowSongPicker,
    selectedGameMode,
    setSelectedGameMode,

    // Player info
    playerId,
    playerName,

    // Derived values
    isHost,
    isReady,
    allReady,
    canStart,

    // Actions
    handleCreateRoom,
    handleJoinRoom,
    handleLeaveRoom,
    handleToggleReady,
    handleStartGame,
    handleSelectSong,
  };
}
