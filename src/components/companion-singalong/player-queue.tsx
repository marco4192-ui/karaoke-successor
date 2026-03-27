'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CompanionPlayer } from './use-companion-setup';

interface PlayerQueueProps {
  players: CompanionPlayer[];
  currentPlayerIndex: number;
  nextPlayerIndex: number | null;
}

export function PlayerQueue({ players, currentPlayerIndex, nextPlayerIndex }: PlayerQueueProps) {
  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader>
        <CardTitle className="text-lg">Players ({players.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-3">
          {players.map((player, index) => (
            <div 
              key={player.id}
              className={`p-3 rounded-lg transition-all ${
                index === currentPlayerIndex 
                  ? 'bg-gradient-to-br from-emerald-500/30 to-teal-500/30 border-2 border-emerald-500 scale-110' 
                  : index === nextPlayerIndex 
                    ? 'bg-gradient-to-br from-yellow-500/30 to-orange-500/30 border-2 border-yellow-500 animate-pulse'
                    : 'bg-white/5 border border-white/10'
              }`}
            >
              <div className="flex items-center gap-2">
                {player.avatar ? (
                  <img src={player.avatar} alt={player.name} className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                    style={{ backgroundColor: player.color }}
                  >
                    {player.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="font-medium">{player.name}</span>
              </div>
              <div className="text-xs text-white/40 mt-1">{player.score.toLocaleString()} pts</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
