'use client';

import { Badge } from '@/components/ui/badge';
import { RoomPlayer } from '@/lib/multiplayer/room-service';
import { PLAYER_COLORS } from '@/types/game';
import { CrownIcon, ReadyIcon } from './lobby-icons';

interface LobbyPlayerCardProps {
  player: RoomPlayer;
  currentUserId: string;
  hostId: string;
  roomStatus: string;
}

export function LobbyPlayerCard({
  player,
  currentUserId,
  hostId,
  roomStatus,
}: LobbyPlayerCardProps) {
  const isMe = player.id === currentUserId;
  const isPlayerHost = player.id === hostId;

  return (
    <div
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
          {isPlayerHost && <CrownIcon className="w-4 h-4 text-yellow-500" />}
          {isMe && (
            <Badge variant="outline" className="text-xs border-cyan-500/50 text-cyan-400">
              You
            </Badge>
          )}
        </div>
      </div>

      {/* Ready Status */}
      {roomStatus === 'waiting' && (
        <div
          className={`flex items-center gap-1 ${
            player.isReady ? 'text-green-400' : 'text-white/40'
          }`}
        >
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
}
