'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PassTheMicPlayer } from './use-pass-the-mic-setup';

interface PassTheMicPlayerQueueProps {
  players: PassTheMicPlayer[];
  currentPlayerIndex: number;
}

export function PassTheMicPlayerQueue({ players, currentPlayerIndex }: PassTheMicPlayerQueueProps) {
  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader>
        <CardTitle className="text-lg">Player Order</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-3">
          {players.map((player, index) => (
            <div 
              key={player.id}
              className={`p-3 rounded-lg transition-all ${
                index === currentPlayerIndex 
                  ? 'bg-gradient-to-br from-cyan-500/30 to-blue-500/30 border-2 border-cyan-500 scale-110' 
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
