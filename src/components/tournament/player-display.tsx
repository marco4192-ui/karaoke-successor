'use client';

import { TournamentPlayer } from '@/lib/game/tournament';

interface PlayerDisplayProps {
  player: TournamentPlayer | null;
  small?: boolean;
}

export function PlayerDisplay({ player, small = false }: PlayerDisplayProps) {
  if (!player) {
    return (
      <div className={`flex items-center gap-2 ${small ? 'text-sm' : ''}`}>
        <div className={`${small ? 'w-8 h-8' : 'w-10 h-10'} rounded-full bg-white/10`} />
        <span className="text-white/30">TBD</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${small ? 'text-sm' : ''}`}>
      {player.avatar ? (
        <img 
          src={player.avatar} 
          alt={player.name} 
          className={`${small ? 'w-8 h-8' : 'w-10 h-10'} rounded-full object-cover`}
        />
      ) : (
        <div 
          className={`${small ? 'w-8 h-8' : 'w-10 h-10'} rounded-full flex items-center justify-center text-white font-bold`}
          style={{ backgroundColor: player.color }}
        >
          {player.name.charAt(0).toUpperCase()}
        </div>
      )}
      <span className="font-medium truncate">{player.name}</span>
    </div>
  );
}
