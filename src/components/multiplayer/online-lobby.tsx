'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useGameStore } from '@/lib/game/store';
import { getAllSongs } from '@/lib/game/song-library';
import { Song } from '@/types/game';
import { io, Socket } from 'socket.io-client';

// ===================== TYPES =====================
interface OnlinePlayer {
  id: string;
  name: string;
  avatar?: string;
  color: string;
  isReady: boolean;
  isHost: boolean;
  score: number;
  combo: number;
  accuracy: number;
}

interface OnlineRoom {
  id: string;
  code: string;
  hostId: string;
  players: OnlinePlayer[];
  status: 'waiting' | 'countdown' | 'playing' | 'ended';
  song: {
    id: string;
    title: string;
    artist: string;
    duration: number;
  } | null;
  countdown: number;
  gameMode: 'duel' | 'battle-royale' | 'tournament';
  maxPlayers: number;
}

interface OnlineLobbyProps {
  onStartGame: (room: OnlineRoom, socket: Socket, song: Song) => void;
  onBack: () => void;
}

// ===================== ICONS =====================
function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function WifiIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M5 12.55a11 11 0 0 1 14.08 0" />
      <path d="M1.42 9a16 16 0 0 1 21.16 0" />
      <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
      <line x1="12" y1="20" x2="12.01" y2="20" />
    </svg>
  );
}

function CopyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function MusicIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

// ===================== MAIN COMPONENT =====================
export function OnlineLobby({ onStartGame, onBack }: OnlineLobbyProps) {
  const { profiles, activeProfileId } = useGameStore();
  const [isConnected, setIsConnected] = useState(false);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [view, setView] = useState<'menu' | 'create' | 'join' | 'room' | 'finding'>('menu');
  const [room, setRoom] = useState<OnlineRoom | null>(null);
  const [roomCode, setRoomCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [gameMode, setGameMode] = useState<'duel' | 'battle-royale'>('duel');
  const [queueSize, setQueueSize] = useState(0);
  const [opponentFound, setOpponentFound] = useState<{ name: string } | null>(null);
  
  // Song selection state
  const [songSearch, setSongSearch] = useState('');
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  
  // Use ref for socket to avoid re-renders and lint issues
  const socketRef = useRef<Socket | null>(null);
  
  const activeProfile = profiles.find(p => p.id === activeProfileId);
  const playerName = activeProfile?.name || 'Player';
  
  // Load songs on mount (using useMemo to avoid setState in effect)
  const songs = React.useMemo(() => getAllSongs(), []);
  
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
    
    // Store in ref
    socketRef.current = newSocket;
    
    newSocket.on('connect', () => {
      console.log('[WS] Connected to game server');
      setIsConnected(true);
      setPlayerId(newSocket.id);
      newSocket.emit('register', { name: playerName });
    });
    
    newSocket.on('disconnect', () => {
      console.log('[WS] Disconnected from game server');
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
      
      // Update selected song from room
      if (data.song && socketRef.current) {
        const songFromRoom = songs.find(s => s.id === data.song?.id);
        if (songFromRoom) {
          setSelectedSong(songFromRoom);
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
    
    // Handle game state changes
    newSocket.on('room-update', (data: OnlineRoom) => {
      if (data.status === 'playing' && data.song && socketRef.current) {
        const songToPlay = songs.find(s => s.id === data.song.id);
        if (songToPlay) {
          onStartGame(data, socketRef.current, songToPlay);
        }
      }
    });
    
    return () => {
      newSocket.disconnect();
      socketRef.current = null;
    };
  }, [playerName, room, selectedSong, songs, onStartGame]);
  
  // Create room
  const handleCreateRoom = useCallback(() => {
    if (!socketRef.current || !isConnected) return;
    socketRef.current.emit('create-room', {
      playerName,
      avatar: activeProfile?.avatar,
      gameMode,
      maxPlayers: gameMode === 'duel' ? 2 : 8
    });
  }, [isConnected, playerName, activeProfile, gameMode]);
  
  // Join room
  const handleJoinRoom = useCallback(() => {
    if (!socketRef.current || !isConnected || !roomCode.trim()) return;
    socketRef.current.emit('join-room', {
      code: roomCode.toUpperCase(),
      playerName,
      avatar: activeProfile?.avatar
    });
  }, [isConnected, roomCode, playerName, activeProfile]);
  
  // Quick match
  const handleQuickMatch = useCallback(() => {
    if (!socketRef.current || !isConnected) return;
    setView('finding');
    socketRef.current.emit('find-match', {
      playerName,
      mode: gameMode
    });
  }, [isConnected, playerName, gameMode]);
  
  // Cancel matchmaking
  const handleCancelMatchmaking = useCallback(() => {
    if (!socketRef.current) return;
    socketRef.current.emit('cancel-matchmaking');
    setView('menu');
  }, []);
  
  // Leave room
  const handleLeaveRoom = useCallback(() => {
    if (!socketRef.current) return;
    socketRef.current.emit('leave-room');
    setRoom(null);
    setSelectedSong(null);
    setView('menu');
  }, []);
  
  // Set ready
  const handleSetReady = useCallback((ready: boolean) => {
    if (!socketRef.current) return;
    socketRef.current.emit('set-ready', { ready });
  }, []);
  
  // Select song (host only)
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
  
  // Start game (host only)
  const handleStartGame = useCallback(() => {
    if (!socketRef.current || !room || !selectedSong) return;
    socketRef.current.emit('start-game');
  }, [room, selectedSong]);
  
  // Copy room code
  const copyRoomCode = useCallback(() => {
    if (room?.code) {
      navigator.clipboard.writeText(room.code);
    }
  }, [room]);
  
  // Get current player from room
  const currentPlayer = room?.players.find(p => p.id === playerId);
  const isHost = currentPlayer?.isHost || false;
  const allReady = room?.players.every(p => p.isReady || p.isHost) && (room?.players.length || 0) >= 2;
  const canStart = isHost && allReady && selectedSong !== null;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <button onClick={onBack} className="text-white/60 hover:text-white mb-4 flex items-center gap-2">
          ← Back to Party
        </button>
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
          <WifiIcon className="w-8 h-8 text-cyan-400" />
          Online Multiplayer
        </h1>
        <p className="text-white/60">Play against friends or find opponents online</p>
      </div>
      
      {/* Connection Status */}
      <div className="flex items-center gap-2 mb-6">
        <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
        <span className="text-sm text-white/60">
          {isConnected ? 'Connected to game server' : 'Connecting...'}
        </span>
      </div>
      
      {error && (
        <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3 mb-4 text-red-400">
          {error}
        </div>
      )}
      
      {/* MENU VIEW */}
      {view === 'menu' && (
        <div className="space-y-6">
          {/* Game Mode Selection */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle>Game Mode</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setGameMode('duel')}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    gameMode === 'duel'
                      ? 'border-cyan-500 bg-cyan-500/20'
                      : 'border-white/10 bg-white/5 hover:border-white/30'
                  }`}
                >
                  <div className="text-3xl mb-2">⚔️</div>
                  <div className="font-medium">Duel</div>
                  <div className="text-xs text-white/60">1v1 Battle</div>
                </button>
                <button
                  onClick={() => setGameMode('battle-royale')}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    gameMode === 'battle-royale'
                      ? 'border-purple-500 bg-purple-500/20'
                      : 'border-white/10 bg-white/5 hover:border-white/30'
                  }`}
                >
                  <div className="text-3xl mb-2">🏆</div>
                  <div className="font-medium">Battle Royale</div>
                  <div className="text-xs text-white/60">4+ Players</div>
                </button>
              </div>
            </CardContent>
          </Card>
          
          {/* Action Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card 
              className="bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border-cyan-500/30 cursor-pointer hover:from-cyan-500/30 hover:to-blue-500/30 transition-all"
              onClick={handleQuickMatch}
            >
              <CardContent className="py-6 text-center">
                <ClockIcon className="w-10 h-10 text-cyan-400 mx-auto mb-3" />
                <div className="font-bold text-lg">Quick Match</div>
                <div className="text-sm text-white/60">Find opponent automatically</div>
              </CardContent>
            </Card>
            
            <Card 
              className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-purple-500/30 cursor-pointer hover:from-purple-500/30 hover:to-pink-500/30 transition-all"
              onClick={() => setView('create')}
            >
              <CardContent className="py-6 text-center">
                <UsersIcon className="w-10 h-10 text-purple-400 mx-auto mb-3" />
                <div className="font-bold text-lg">Create Room</div>
                <div className="text-sm text-white/60">Host a private game</div>
              </CardContent>
            </Card>
            
            <Card 
              className="bg-gradient-to-br from-green-500/20 to-teal-500/20 border-green-500/30 cursor-pointer hover:from-green-500/30 hover:to-teal-500/30 transition-all"
              onClick={() => setView('join')}
            >
              <CardContent className="py-6 text-center">
                <WifiIcon className="w-10 h-10 text-green-400 mx-auto mb-3" />
                <div className="font-bold text-lg">Join Room</div>
                <div className="text-sm text-white/60">Enter room code</div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
      
      {/* CREATE ROOM VIEW */}
      {view === 'create' && (
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle>Create a Room</CardTitle>
            <CardDescription>Start a new game and invite friends</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm text-white/60 mb-2 block">Game Mode</label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={() => setGameMode('duel')}
                  className={gameMode === 'duel' ? 'bg-cyan-500' : 'bg-white/10'}
                >
                  ⚔️ Duel (1v1)
                </Button>
                <Button
                  onClick={() => setGameMode('battle-royale')}
                  className={gameMode === 'battle-royale' ? 'bg-purple-500' : 'bg-white/10'}
                >
                  🏆 Battle Royale
                </Button>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button
                onClick={() => setView('menu')}
                variant="outline"
                className="flex-1 border-white/20"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateRoom}
                className="flex-1 bg-gradient-to-r from-cyan-500 to-purple-500"
                disabled={!isConnected}
              >
                Create Room
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* JOIN ROOM VIEW */}
      {view === 'join' && (
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle>Join a Room</CardTitle>
            <CardDescription>Enter the 6-character room code</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase().slice(0, 6))}
              placeholder="ABC123"
              className="bg-white/5 border-white/10 text-white text-center text-2xl font-mono tracking-widest"
              maxLength={6}
            />
            
            <div className="flex gap-2">
              <Button
                onClick={() => setView('menu')}
                variant="outline"
                className="flex-1 border-white/20"
              >
                Cancel
              </Button>
              <Button
                onClick={handleJoinRoom}
                className="flex-1 bg-gradient-to-r from-green-500 to-teal-500"
                disabled={!isConnected || roomCode.length !== 6}
              >
                Join Room
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* FINDING MATCH VIEW */}
      {view === 'finding' && (
        <Card className="bg-white/5 border-white/10">
          <CardContent className="py-12 text-center">
            {opponentFound ? (
              <div className="space-y-4">
                <div className="text-6xl">🎉</div>
                <div className="text-2xl font-bold text-green-400">Opponent Found!</div>
                <div className="text-lg text-white/60">Playing against {opponentFound.name}</div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="animate-spin w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full mx-auto" />
                <div className="text-xl font-medium">Finding opponent...</div>
                <div className="text-white/60">
                  {queueSize > 0 
                    ? `${queueSize} player${queueSize > 1 ? 's' : ''} in queue`
                    : 'Searching for players'}
                </div>
                <Button
                  onClick={handleCancelMatchmaking}
                  variant="outline"
                  className="border-white/20 mt-4"
                >
                  Cancel
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
      
      {/* ROOM VIEW */}
      {view === 'room' && room && (
        <div className="space-y-6">
          {/* Room Info */}
          <Card className="bg-white/5 border-white/10">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge className="bg-cyan-500/20 text-cyan-400 text-lg px-3 py-1">
                    {room.code}
                  </Badge>
                  <Button
                    onClick={copyRoomCode}
                    size="sm"
                    variant="outline"
                    className="border-white/20"
                  >
                    <CopyIcon className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="border-purple-500/50 text-purple-400">
                    {room.gameMode === 'duel' ? '⚔️ Duel' : '🏆 Battle Royale'}
                  </Badge>
                  <Badge variant="outline" className="border-white/20">
                    {room.players.length}/{room.maxPlayers}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Song Selection (Host Only) */}
          {isHost && (
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MusicIcon className="w-5 h-5" />
                  Select Song
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Search */}
                <div className="relative mb-4">
                  <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                  <Input
                    value={songSearch}
                    onChange={(e) => setSongSearch(e.target.value)}
                    placeholder="Search songs..."
                    className="bg-white/5 border-white/10 pl-10"
                  />
                </div>
                
                {/* Selected Song */}
                {selectedSong && (
                  <div className="mb-4 p-3 rounded-lg bg-cyan-500/20 border border-cyan-500/30">
                    <div className="text-sm text-white/60">Selected Song:</div>
                    <div className="font-medium">{selectedSong.title}</div>
                    <div className="text-sm text-white/60">{selectedSong.artist}</div>
                  </div>
                )}
                
                {/* Song List */}
                <ScrollArea className="h-48">
                  <div className="space-y-1">
                    {filteredSongs.slice(0, 20).map((song) => (
                      <button
                        key={song.id}
                        onClick={() => handleSelectSong(song)}
                        className={`w-full text-left p-2 rounded-lg transition-all ${
                          selectedSong?.id === song.id
                            ? 'bg-cyan-500/30 border border-cyan-500/50'
                            : 'bg-white/5 hover:bg-white/10 border border-transparent'
                        }`}
                      >
                        <div className="font-medium text-sm">{song.title}</div>
                        <div className="text-xs text-white/60">{song.artist}</div>
                      </button>
                    ))}
                    {filteredSongs.length === 0 && (
                      <div className="text-center py-4 text-white/40">
                        No songs found
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
          
          {/* Current Song (Non-Host) */}
          {!isHost && room.song && (
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MusicIcon className="w-5 h-5" />
                  Current Song
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-3 rounded-lg bg-purple-500/20 border border-purple-500/30">
                  <div className="font-medium">{room.song.title}</div>
                  <div className="text-sm text-white/60">{room.song.artist}</div>
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Players List */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UsersIcon className="w-5 h-5" />
                Players
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-48">
                <div className="space-y-2">
                  {room.players.map((player) => (
                    <div
                      key={player.id}
                      className={`flex items-center gap-3 p-3 rounded-lg ${
                        player.id === playerId ? 'bg-cyan-500/20' : 'bg-white/5'
                      }`}
                    >
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center font-bold"
                        style={{ backgroundColor: player.color }}
                      >
                        {player.avatar ? (
                          <img src={player.avatar} alt={player.name} className="w-full h-full rounded-full object-cover" />
                        ) : (
                          player.name[0].toUpperCase()
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium flex items-center gap-2">
                          {player.name}
                          {player.isHost && (
                            <Badge className="bg-yellow-500/20 text-yellow-400 text-xs">Host</Badge>
                          )}
                          {player.id === playerId && (
                            <Badge className="bg-cyan-500/20 text-cyan-400 text-xs">You</Badge>
                          )}
                        </div>
                      </div>
                      <div>
                        {player.isReady ? (
                          <Badge className="bg-green-500/20 text-green-400">
                            <CheckIcon className="w-3 h-3 mr-1" /> Ready
                          </Badge>
                        ) : (
                          <Badge className="bg-white/10 text-white/60">Waiting</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {/* Empty slots */}
                  {Array.from({ length: room.maxPlayers - room.players.length }).map((_, i) => (
                    <div
                      key={`empty-${i}`}
                      className="flex items-center gap-3 p-3 rounded-lg border-2 border-dashed border-white/10 text-white/40"
                    >
                      <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
                        ?
                      </div>
                      <div>Waiting for player...</div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
          
          {/* Countdown Overlay */}
          {room.status === 'countdown' && (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
              <div className="text-center">
                <div className="text-9xl font-bold text-cyan-400 animate-pulse">
                  {room.countdown}
                </div>
                <div className="text-2xl text-white/60 mt-4">Get Ready!</div>
              </div>
            </div>
          )}
          
          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={handleLeaveRoom}
              variant="outline"
              className="flex-1 border-white/20"
            >
              Leave Room
            </Button>
            
            {!isHost && (
              <Button
                onClick={() => handleSetReady(!currentPlayer?.isReady)}
                className={`flex-1 ${currentPlayer?.isReady ? 'bg-green-500' : 'bg-gradient-to-r from-cyan-500 to-purple-500'}`}
              >
                {currentPlayer?.isReady ? '✓ Ready!' : 'Set Ready'}
              </Button>
            )}
            
            {isHost && (
              <Button
                onClick={handleStartGame}
                className="flex-1 bg-gradient-to-r from-green-500 to-teal-500"
                disabled={!canStart}
              >
                {room.players.length < 2 
                  ? 'Need 2+ players' 
                  : !selectedSong 
                    ? 'Select a song' 
                    : !allReady 
                      ? 'Waiting for ready...' 
                      : 'Start Game'}
              </Button>
            )}
          </div>
          
          {isHost && !selectedSong && room.players.length >= 2 && (
            <p className="text-center text-white/60 text-sm">
              Select a song to start the game
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export type { OnlineRoom, OnlinePlayer };
