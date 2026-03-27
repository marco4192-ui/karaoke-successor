import { useState, useEffect, useCallback, useRef } from 'react';
import { useGameStore } from '@/lib/game/store';
import { getAllSongs, Song } from '@/lib/game/song-library';
import { io, Socket } from 'socket.io-client';
import { OnlineRoom, OnlinePlayer, LobbyView } from './types';

export function useOnlineLobby(
  onStartGame: (room: OnlineRoom, socket: Socket, song: Song) => void
) {
  const { profiles, activeProfileId } = useGameStore();
  const [isConnected, setIsConnected] = useState(false);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [view, setView] = useState<LobbyView>('menu');
  const [room, setRoom] = useState<OnlineRoom | null>(null);
  const [roomCode, setRoomCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [gameMode, setGameMode] = useState<'duel' | 'battle-royale'>('duel');
  const [queueSize, setQueueSize] = useState(0);
  const [opponentFound, setOpponentFound] = useState<{ name: string } | null>(null);
  const [songSearch, setSongSearch] = useState('');
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  
  const socketRef = useRef<Socket | null>(null);
  
  const activeProfile = profiles.find(p => p.id === activeProfileId);
  const playerName = activeProfile?.name || 'Player';
  
  // Load songs
  const songs = getAllSongs();
  
  // Filter songs by search
  const filteredSongs = songs.filter(song => 
    song.title.toLowerCase().includes(songSearch.toLowerCase()) ||
    song.artist.toLowerCase().includes(songSearch.toLowerCase())
  );
  
  // Connect to WebSocket server
  useEffect(() => {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3003';
    const newSocket = io(wsUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
    
    socketRef.current = newSocket;
    
    newSocket.on('connect', () => {
      setIsConnected(true);
      setPlayerId(newSocket.id ?? null);
      newSocket.emit('register', { name: playerName });
    });
    
    newSocket.on('disconnect', () => {
      setIsConnected(false);
      setPlayerId(null);
    });
    
    newSocket.on('error', (data: { message: string }) => {
      setError(data.message);
    });
    
    newSocket.on('room-created', (data: OnlineRoom) => {
      setRoom(data);
      setView('room');
    });
    
    newSocket.on('room-joined', (data: OnlineRoom) => {
      setRoom(data);
      setView('room');
    });
    
    newSocket.on('room-update', (data: OnlineRoom) => {
      setRoom(data);
      
      if (data.song && socketRef.current) {
        const songFromRoom = songs.find(s => s.id === data.song?.id);
        if (songFromRoom) {
          setSelectedSong(songFromRoom);
        }
      }
      
      // Handle game state changes
      if (data.status === 'playing' && data.song && socketRef.current) {
        const songToPlay = songs.find(s => s.id === data.song!.id);
        if (songToPlay) {
          onStartGame(data, socketRef.current, songToPlay);
        }
      }
    });
    
    newSocket.on('left-room', () => {
      setRoom(null);
      setSelectedSong(null);
      setView('menu');
    });
    
    newSocket.on('finding-match', (data: { queueSize: number }) => {
      setQueueSize(data.queueSize);
    });
    
    newSocket.on('match-found', (data: { roomId: string; opponent: string }) => {
      setOpponentFound({ name: data.opponent });
      setTimeout(() => {
        setOpponentFound(null);
        setView('room');
      }, 2000);
    });
    
    newSocket.on('countdown', (data: { countdown: number }) => {
      setRoom(prev => prev ? { ...prev, countdown: data.countdown, status: 'countdown' } : null);
    });
    
    newSocket.on('game-started', () => {
      if (room && socketRef.current && selectedSong) {
        onStartGame(room, socketRef.current, selectedSong);
      }
    });
    
    return () => {
      newSocket.disconnect();
      socketRef.current = null;
    };
  }, [playerName, room, selectedSong, songs, onStartGame]);
  
  // Actions
  const handleCreateRoom = useCallback(() => {
    if (!socketRef.current || !isConnected) return;
    socketRef.current.emit('create-room', {
      playerName,
      avatar: activeProfile?.avatar,
      gameMode,
      maxPlayers: gameMode === 'duel' ? 2 : 8
    });
  }, [isConnected, playerName, activeProfile, gameMode]);
  
  const handleJoinRoom = useCallback(() => {
    if (!socketRef.current || !isConnected || !roomCode.trim()) return;
    socketRef.current.emit('join-room', {
      code: roomCode.toUpperCase(),
      playerName,
      avatar: activeProfile?.avatar
    });
  }, [isConnected, roomCode, playerName, activeProfile]);
  
  const handleQuickMatch = useCallback(() => {
    if (!socketRef.current || !isConnected) return;
    setView('finding');
    socketRef.current.emit('find-match', {
      playerName,
      mode: gameMode
    });
  }, [isConnected, playerName, gameMode]);
  
  const handleCancelMatchmaking = useCallback(() => {
    if (!socketRef.current) return;
    socketRef.current.emit('cancel-matchmaking');
    setView('menu');
  }, []);
  
  const handleLeaveRoom = useCallback(() => {
    if (!socketRef.current) return;
    socketRef.current.emit('leave-room');
    setRoom(null);
    setSelectedSong(null);
    setView('menu');
  }, []);
  
  const handleSetReady = useCallback((ready: boolean) => {
    if (!socketRef.current) return;
    socketRef.current.emit('set-ready', { ready });
  }, []);
  
  const handleSelectSong = useCallback((song: Song) => {
    if (!socketRef.current || !room) return;
    setSelectedSong(song);
    socketRef.current.emit('select-song', {
      song: {
        id: song.id,
        title: song.title,
        artist: song.artist,
        duration: song.duration
      }
    });
  }, [room]);
  
  const handleStartGame = useCallback(() => {
    if (!socketRef.current || !room || !selectedSong) return;
    socketRef.current.emit('start-game');
  }, [room, selectedSong]);
  
  const copyRoomCode = useCallback(() => {
    if (room?.code) {
      navigator.clipboard.writeText(room.code);
    }
  }, [room]);
  
  // Computed values
  const currentPlayer = room?.players.find(p => p.id === playerId);
  const isHost = currentPlayer?.isHost || false;
  const allReady = room?.players.every(p => p.isReady || p.isHost) && (room?.players.length || 0) >= 2;
  const canStart = isHost && allReady && selectedSong !== null;

  return {
    // State
    isConnected,
    playerId,
    view,
    room,
    roomCode,
    error,
    gameMode,
    queueSize,
    opponentFound,
    songSearch,
    selectedSong,
    filteredSongs,
    currentPlayer,
    isHost,
    allReady,
    canStart,
    
    // Setters
    setView,
    setRoomCode,
    setGameMode,
    setSongSearch,
    setError,
    
    // Actions
    handleCreateRoom,
    handleJoinRoom,
    handleQuickMatch,
    handleCancelMatchmaking,
    handleLeaveRoom,
    handleSetReady,
    handleSelectSong,
    handleStartGame,
    copyRoomCode,
  };
}
