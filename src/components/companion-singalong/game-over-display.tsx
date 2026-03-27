'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CompanionPlayer } from './use-companion-setup';

interface GameOverDisplayProps {
  players: CompanionPlayer[];
  onReturnToMenu: () => void;
}

export function GameOverDisplay({ players, onReturnToMenu }: GameOverDisplayProps) {
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

  return (
    <Card className="bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-500/30 mt-6">
      <CardContent className="py-8">
        <div className="text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold mb-4">Game Complete!</h2>
          <div className="mb-6">
            <h3 className="text-lg font-bold mb-2">Final Scores:</h3>
            <div className="flex flex-wrap justify-center gap-3">
              {sortedPlayers.map((player, index) => (
                <div key={player.id} className={`p-3 rounded-lg ${index === 0 ? 'bg-amber-500/20 border border-amber-500' : 'bg-white/5'}`}>
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
                    {index === 0 && <span className="text-amber-400">👑</span>}
                  </div>
                  <div className="text-sm text-white/60 mt-1">{player.score.toLocaleString()} pts</div>
                </div>
              ))}
            </div>
          </div>
          <Button onClick={onReturnToMenu} className="bg-gradient-to-r from-amber-500 to-yellow-500 px-8">
            Return to Menu
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
