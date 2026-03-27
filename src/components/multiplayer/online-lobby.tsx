'use client';

import { Socket } from 'socket.io-client';
import { Song } from '@/lib/game/song-library';
import {
  useOnlineLobby,
  MenuView,
  CreateRoomView,
  JoinRoomView,
  FindingMatchView,
  RoomInfoCard,
  SongSelectionCard,
  CurrentSongCard,
  PlayersListCard,
  CountdownOverlay,
  OnlineRoom,
} from '@/components/online-lobby';

// ===================== MAIN COMPONENT =====================
interface OnlineLobbyProps {
  onStartGame: (room: OnlineRoom, socket: Socket, song: Song) => void;
  onBack: () => void;
}

export function OnlineLobby({ onStartGame, onBack }: OnlineLobbyProps) {
  const {
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
    setView,
    setRoomCode,
    setGameMode,
    setSongSearch,
    handleCreateRoom,
    handleJoinRoom,
    handleQuickMatch,
    handleCancelMatchmaking,
    handleLeaveRoom,
    handleSetReady,
    handleSelectSong,
    handleStartGame,
    copyRoomCode,
  } = useOnlineLobby(onStartGame);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <button onClick={onBack} className="text-white/60 hover:text-white mb-4 flex items-center gap-2">
          ← Back to Party
        </button>
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
          🌐 Online Multiplayer
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
        <MenuView
          gameMode={gameMode}
          onSetGameMode={setGameMode}
          onQuickMatch={handleQuickMatch}
          onCreateRoom={() => setView('create')}
          onJoinRoom={() => setView('join')}
        />
      )}
      
      {/* CREATE ROOM VIEW */}
      {view === 'create' && (
        <CreateRoomView
          gameMode={gameMode}
          isConnected={isConnected}
          onSetGameMode={setGameMode}
          onCancel={() => setView('menu')}
          onCreate={handleCreateRoom}
        />
      )}
      
      {/* JOIN ROOM VIEW */}
      {view === 'join' && (
        <JoinRoomView
          roomCode={roomCode}
          isConnected={isConnected}
          onSetRoomCode={setRoomCode}
          onCancel={() => setView('menu')}
          onJoin={handleJoinRoom}
        />
      )}
      
      {/* FINDING MATCH VIEW */}
      {view === 'finding' && (
        <FindingMatchView
          queueSize={queueSize}
          opponentFound={opponentFound}
          onCancel={handleCancelMatchmaking}
        />
      )}
      
      {/* ROOM VIEW */}
      {view === 'room' && room && (
        <div className="space-y-6">
          <RoomInfoCard room={room} onCopyCode={copyRoomCode} />
          
          {/* Song Selection (Host Only) */}
          {isHost && (
            <SongSelectionCard
              songSearch={songSearch}
              selectedSong={selectedSong}
              filteredSongs={filteredSongs}
              onSetSongSearch={setSongSearch}
              onSelectSong={handleSelectSong}
            />
          )}
          
          {/* Current Song (Non-Host) */}
          {!isHost && room.song && (
            <CurrentSongCard song={room.song} />
          )}
          
          {/* Players List */}
          <PlayersListCard
            players={room.players}
            maxPlayers={room.maxPlayers}
            playerId={playerId}
          />
          
          {/* Countdown Overlay */}
          {room.status === 'countdown' && (
            <CountdownOverlay countdown={room.countdown} />
          )}
          
          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleLeaveRoom}
              className="flex-1 py-3 px-4 rounded-lg border border-white/20 text-white/80 hover:bg-white/5"
            >
              Leave Room
            </button>
            
            {!isHost && (
              <button
                onClick={() => handleSetReady(!currentPlayer?.isReady)}
                className={`flex-1 py-3 px-4 rounded-lg font-medium ${
                  currentPlayer?.isReady 
                    ? 'bg-green-500 text-white' 
                    : 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white'
                }`}
              >
                {currentPlayer?.isReady ? '✓ Ready!' : 'Set Ready'}
              </button>
            )}
            
            {isHost && (
              <button
                onClick={handleStartGame}
                className={`flex-1 py-3 px-4 rounded-lg font-medium ${
                  canStart 
                    ? 'bg-gradient-to-r from-green-500 to-teal-500 text-white' 
                    : 'bg-white/10 text-white/40 cursor-not-allowed'
                }`}
                disabled={!canStart}
              >
                {room.players.length < 2 
                  ? 'Need 2+ players' 
                  : !selectedSong 
                    ? 'Select a song' 
                    : !allReady 
                      ? 'Waiting for ready...' 
                      : 'Start Game'}
              </button>
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

export type { OnlineRoom, OnlinePlayer } from '@/components/online-lobby';
