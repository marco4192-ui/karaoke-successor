/**
 * DEAD CODE (Code Review #5, 2026-04-17)
 *
 * This file is not imported by any other file in the project.
 *
 * Possible function: Full multiplayer lobby screen with room creation/joining,
 * QR code sharing, player management, and game mode selection. Supports both
 * online multiplayer (via WebSocket) and local party mode.
 *
 * Currently, online multiplayer uses online-multiplayer-screen.tsx and
 * online-lobby.tsx. The lobby component uses the room-service.ts and
 * useWebSocket hook for real-time communication.
 *
 * This component (~674 lines) is a comprehensive lobby implementation that
 * includes features like room code display/copy, player readiness toggles,
 * game settings configuration, and chat. It's a more feature-complete version
 * than what's currently in online-lobby.tsx.
 *
 * Consider: This could replace or merge with online-lobby.tsx for a more
 * complete multiplayer lobby experience. The QR code sharing feature is
 * particularly useful for quick room joining.
 */

// Multiplayer Lobby Screen - Room creation and joining with room codes
// Supports: Create room, Join by code, QR code sharing, Local party mode

'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  getUserDatabase, 
  ExtendedPlayerProfile, 
  MultiplayerRoom,
  generateRoomCode 
} from '@/lib/db/user-db';
import { getRoomService, RoomPlayer } from '@/lib/multiplayer/room-service';
import { useWebSocket } from '@/hooks/use-websocket';
import { PLAYER_COLORS, GameMode, Song } from '@/types/game';

// Icons
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

function LinkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
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

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function QRIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
    </svg>
  );
}

function CrownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7zm3 14h14v2H5v-2z" />
    </svg>
  );
}

function ReadyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <polyline points="16 10 11 15 8 12" />
    </svg>
  );
}

// Props
interface MultiplayerLobbyScreenProps {
  activeProfile?: ExtendedPlayerProfile | null;
  onStartGame?: (room: MultiplayerRoom) => void;
  onBack?: () => void;
  songs?: Song[];
}

// Generate QR code URL
function generateQRCode(data: string, size: number = 200): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}`;
}

export function MultiplayerLobbyScreen({
  activeProfile,
  onStartGame,
  onBack,
  songs = [],
}: MultiplayerLobbyScreenProps) {
  // State
  const [currentRoom, setCurrentRoom] = useState<MultiplayerRoom | null>(null);
  const [joinCode, setJoinCode] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
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

  // Copy room code to clipboard
  const copyRoomCode = async () => {
    if (currentRoom) {
      await navigator.clipboard.writeText(currentRoom.code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  // Copy room link to clipboard
  const copyRoomLink = async () => {
    if (currentRoom) {
      const link = `${window.location.origin}?room=${currentRoom.code}`;
      await navigator.clipboard.writeText(link);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  // Create a new room
  const handleCreateRoom = async () => {
    setIsCreating(true);
    setError(null);

    try {
      // Use local room service (no WebSocket required for local play)
      const room = await roomService.createRoom(playerId, playerName, {
        maxPlayers: 8,
        gameMode: selectedGameMode,
      });

      setCurrentRoom(room);
      console.log('[Lobby] Created room:', room.code);
    } catch (err) {
      console.error('[Lobby] Failed to create room:', err);
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
      // Use local room service
      const room = await roomService.joinRoom(
        joinCode.trim().toUpperCase(),
        playerId,
        playerName,
        playerAvatar
      );

      if (room) {
        setCurrentRoom(room);
        console.log('[Lobby] Joined room:', room.code);
      } else {
        setError('Room not found or expired. Please check the code and try again.');
      }
    } catch (err) {
      console.error('[Lobby] Failed to join room:', err);
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
      const isCurrentlyReady = currentRoom.players.find(p => p.id === playerId)?.isReady;
      await roomService.setPlayerReady(playerId, !isCurrentlyReady);
      
      // Refresh room
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

  // Render player card
  const renderPlayerCard = (player: RoomPlayer) => {
    const isMe = player.id === playerId;
    const isPlayerHost = player.id === currentRoom?.hostId;

    return (
      <div 
        key={player.id}
        className={`flex items-center gap-3 p-3 rounded-lg ${
          isMe ? 'bg-cyan-500/20 border border-cyan-500/30' : 'bg-white/5'
        }`}
      >
        {/* Avatar */}
        <div 
          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold overflow-hidden"
          style={{ backgroundColor: player.color || PLAYER_COLORS[0] }}
        >
          {player.avatar ? (
            <img src={player.avatar} alt={player.name} className="w-full h-full object-cover" />
          ) : (
            player.name[0].toUpperCase()
          )}
        </div>

        {/* Name */}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">{player.name}</span>
            {isPlayerHost && (
              <CrownIcon className="w-4 h-4 text-yellow-500" />
            )}
            {isMe && (
              <Badge variant="outline" className="text-xs border-cyan-500/50 text-cyan-400">
                You
              </Badge>
            )}
          </div>
        </div>

        {/* Ready Status */}
        {currentRoom?.status === 'waiting' && (
          <div className={`flex items-center gap-1 ${
            player.isReady ? 'text-green-400' : 'text-white/40'
          }`}>
            {player.isReady ? (
              <>
                <ReadyIcon className="w-4 h-4" />
                <span className="text-sm">Ready</span>
              </>
            ) : (
              <span className="text-sm">Waiting...</span>
            )}
          </div>
        )}
      </div>
    );
  };

  // If in a room, show lobby
  if (currentRoom) {
    const isHost = currentRoom.hostId === playerId;
    const isReady = currentRoom.players.find(p => p.id === playerId)?.isReady;
    const allReady = currentRoom.players.every(p => p.isReady || p.id === currentRoom.hostId);
    const canStart = isHost && allReady && selectedSong;

    return (
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold">Game Lobby</h2>
            <p className="text-white/60 mt-1">Waiting for players to join...</p>
          </div>
          <Button variant="outline" onClick={handleLeaveRoom} className="border-white/20">
            Leave Room
          </Button>
        </div>

        {/* Room Info Card */}
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Room Code */}
              <div>
                <label className="text-sm text-white/60 mb-2 block">Room Code</label>
                <div className="flex items-center gap-3">
                  <div className="text-4xl font-mono font-bold tracking-widest">
                    {currentRoom.code.slice(0, 3)} {currentRoom.code.slice(3)}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={copyRoomCode}
                    className="text-white/60 hover:text-white"
                  >
                    {copiedCode ? <CheckIcon className="w-5 h-5 text-green-400" /> : <CopyIcon className="w-5 h-5" />}
                  </Button>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyRoomLink}
                    className="border-white/20 text-sm"
                  >
                    {copiedLink ? <CheckIcon className="w-4 h-4 mr-1 text-green-400" /> : <LinkIcon className="w-4 h-4 mr-1" />}
                    Copy Link
                  </Button>
                </div>
              </div>

              {/* QR Code */}
              <div className="flex justify-center">
                <div className="bg-white p-3 rounded-lg">
                  <img 
                    src={generateQRCode(`${window.location.origin}?room=${currentRoom.code}`)} 
                    alt="Room QR Code" 
                    className="w-32 h-32"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Players */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UsersIcon className="w-5 h-5" />
              Players ({currentRoom.players.length}/{currentRoom.maxPlayers})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {currentRoom.players.map(renderPlayerCard)}
            </div>
          </CardContent>
        </Card>

        {/* Game Settings (Host only) */}
        {isHost && (
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle>Game Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Song Selection */}
              <div>
                <label className="text-sm text-white/60 mb-2 block">Song</label>
                {selectedSong ? (
                  <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                    {selectedSong.coverImage && (
                      <img src={selectedSong.coverImage} alt={selectedSong.title} className="w-12 h-12 rounded object-cover" />
                    )}
                    <div className="flex-1">
                      <div className="font-medium">{selectedSong.title}</div>
                      <div className="text-sm text-white/60">{selectedSong.artist}</div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setShowSongPicker(true)}>
                      Change
                    </Button>
                  </div>
                ) : (
                  <Button 
                    variant="outline" 
                    onClick={() => setShowSongPicker(true)}
                    className="w-full border-dashed border-white/20"
                  >
                    Select a Song
                  </Button>
                )}
              </div>

              {/* Game Mode */}
              <div>
                <label className="text-sm text-white/60 mb-2 block">Game Mode</label>
                <div className="flex gap-2 flex-wrap">
                  {(['standard', 'duet', 'battle'] as GameMode[]).map(mode => (
                    <Button
                      key={mode}
                      variant={selectedGameMode === mode ? 'default' : 'outline'}
                      onClick={() => setSelectedGameMode(mode)}
                      className={selectedGameMode === mode ? 'bg-cyan-500' : 'border-white/20'}
                    >
                      {mode.charAt(0).toUpperCase() + mode.slice(1)}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex justify-center gap-4">
          {isHost ? (
            <Button
              size="lg"
              onClick={handleStartGame}
              disabled={!canStart}
              className="bg-gradient-to-r from-green-500 to-emerald-500 px-12"
            >
              <PlayIcon className="w-5 h-5 mr-2" /> Start Game
            </Button>
          ) : (
            <Button
              size="lg"
              onClick={handleToggleReady}
              className={`${isReady ? 'bg-green-500' : 'bg-cyan-500'} px-12`}
            >
              {isReady ? (
                <>
                  <ReadyIcon className="w-5 h-5 mr-2" /> Ready!
                </>
              ) : (
                'Ready Up'
              )}
            </Button>
          )}
        </div>

        {/* Waiting Message */}
        {!isHost && !allReady && (
          <p className="text-center text-white/60">
            Waiting for the host to start the game...
          </p>
        )}

        {/* Song Picker Dialog */}
        <Dialog open={showSongPicker} onOpenChange={setShowSongPicker}>
          <DialogContent className="bg-gray-900 border-white/20 max-w-2xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>Select a Song</DialogTitle>
            </DialogHeader>
            <ScrollArea className="h-[400px] pr-4">
              <div className="grid gap-2">
                {songs.length === 0 ? (
                  <div className="text-center py-8 text-white/60">
                    No songs available. Add songs to your library first.
                  </div>
                ) : (
                  songs.map(song => (
                    <button
                      key={song.id}
                      onClick={() => handleSelectSong(song)}
                      className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                        selectedSong?.id === song.id 
                          ? 'bg-cyan-500/20 border border-cyan-500/50' 
                          : 'bg-white/5 hover:bg-white/10 border border-transparent'
                      }`}
                    >
                      {song.coverImage && (
                        <img src={song.coverImage} alt={song.title} className="w-12 h-12 rounded object-cover" />
                      )}
                      <div className="flex-1 text-left">
                        <div className="font-medium">{song.title}</div>
                        <div className="text-sm text-white/60">{song.artist}</div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Default: Show create/join options
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center py-8">
        <h2 className="text-3xl font-bold mb-2">Multiplayer</h2>
        <p className="text-white/60">Create a room or join with a code</p>
      </div>

      {/* Error */}
      {error && (
        <Card className="bg-red-500/20 border-red-500/30">
          <CardContent className="py-3 text-center text-red-300">
            {error}
          </CardContent>
        </Card>
      )}

      {/* Create / Join Cards */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Create Room */}
        <Card className="bg-white/5 border-white/10 hover:border-cyan-500/50 transition-all">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center">
                <UsersIcon className="w-5 h-5" />
              </div>
              Create Room
            </CardTitle>
            <CardDescription>
              Start a new game room and invite friends with the room code
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={handleCreateRoom}
              disabled={isCreating}
              className="w-full bg-gradient-to-r from-cyan-500 to-purple-500"
            >
              {isCreating ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
              ) : (
                <>
                  <PlayIcon className="w-4 h-4 mr-2" /> Create New Room
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Join Room */}
        <Card className="bg-white/5 border-white/10 hover:border-purple-500/50 transition-all">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <LinkIcon className="w-5 h-5" />
              </div>
              Join Room
            </CardTitle>
            <CardDescription>
              Enter a 6-character room code to join an existing game
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="Enter code (e.g., ABC123)"
              className="bg-white/5 border-white/20 font-mono text-center text-xl tracking-widest"
              maxLength={6}
            />
            <Button 
              onClick={handleJoinRoom}
              disabled={isJoining || joinCode.length !== 6}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500"
            >
              {isJoining ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
              ) : (
                <>
                  <LinkIcon className="w-4 h-4 mr-2" /> Join Room
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Local Party Mode Info */}
      <Card className="bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border-cyan-500/30">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <div className="text-cyan-400 mt-0.5">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
            </div>
            <div className="text-sm text-white/70">
              <p className="font-medium text-white mb-1">Local Party Mode</p>
              <p>
                Room codes work on the same network without internet connection. 
                Share the code or QR code with friends to start playing together!
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Back Button */}
      {onBack && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={onBack} className="border-white/20">
            Back to Menu
          </Button>
        </div>
      )}
    </div>
  );
}

export default MultiplayerLobbyScreen;
