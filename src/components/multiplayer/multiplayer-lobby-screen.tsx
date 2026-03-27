// Multiplayer Lobby Screen - Room creation and joining with room codes
// Supports: Create room, Join by code, QR code sharing, Local party mode

'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ExtendedPlayerProfile, MultiplayerRoom } from '@/lib/db/user-db';
import { GameMode, Song } from '@/types/game';

// Import extracted components and hook
import {
  UsersIcon,
  LinkIcon,
  PlayIcon,
  ReadyIcon,
  InfoIcon,
} from './lobby-icons';
import { LobbyPlayerCard } from './lobby-player-card';
import { RoomCodeDisplay } from './room-code-display';
import { SongPickerDialog } from './song-picker-dialog';
import { useMultiplayerLobby } from '@/hooks/use-multiplayer-lobby';

// Props
interface MultiplayerLobbyScreenProps {
  activeProfile?: ExtendedPlayerProfile | null;
  onStartGame?: (room: MultiplayerRoom) => void;
  onBack?: () => void;
  songs?: Song[];
}

export function MultiplayerLobbyScreen({
  activeProfile,
  onStartGame,
  onBack,
  songs = [],
}: MultiplayerLobbyScreenProps) {
  const {
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
    playerId,
    isHost,
    isReady,
    allReady,
    canStart,
    handleCreateRoom,
    handleJoinRoom,
    handleLeaveRoom,
    handleToggleReady,
    handleStartGame,
    handleSelectSong,
  } = useMultiplayerLobby({ activeProfile, onStartGame });

  // If in a room, show lobby
  if (currentRoom) {
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

        {/* Room Info */}
        <RoomCodeDisplay roomCode={currentRoom.code} />

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
              {currentRoom.players.map((player) => (
                <LobbyPlayerCard
                  key={player.id}
                  player={player}
                  currentUserId={playerId}
                  hostId={currentRoom.hostId}
                  roomStatus={currentRoom.status}
                />
              ))}
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
                      <img
                        src={selectedSong.coverImage}
                        alt={selectedSong.title}
                        className="w-12 h-12 rounded object-cover"
                      />
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
                  {(['standard', 'duet', 'battle'] as GameMode[]).map((mode) => (
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
        <SongPickerDialog
          open={showSongPicker}
          onOpenChange={setShowSongPicker}
          songs={songs}
          selectedSong={selectedSong}
          onSelectSong={handleSelectSong}
        />
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
          <CardContent className="py-3 text-center text-red-300">{error}</CardContent>
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
              <InfoIcon className="w-5 h-5" />
            </div>
            <div className="text-sm text-white/70">
              <p className="font-medium text-white mb-1">Local Party Mode</p>
              <p>
                Room codes work on the same network without internet connection. Share the code or
                QR code with friends to start playing together!
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
