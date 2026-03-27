'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CompanionPlayer } from './use-companion-setup';

type GamePhase = 'setup' | 'playing' | 'switching' | 'ended';

interface CurrentPlayerDisplayProps {
  currentPlayer: CompanionPlayer | undefined;
  players: CompanionPlayer[];
  nextPlayerIndex: number | null;
  gamePhase: GamePhase;
  isPlaying: boolean;
  countdown: number;
  switchWarning: boolean;
  onStartGame: () => void;
}

export function CurrentPlayerDisplay({
  currentPlayer,
  players,
  nextPlayerIndex,
  gamePhase,
  isPlaying,
  countdown,
  switchWarning,
  onStartGame,
}: CurrentPlayerDisplayProps) {
  return (
    <Card className={`relative overflow-hidden ${
      gamePhase === 'switching' 
        ? 'animate-pulse bg-gradient-to-br from-yellow-500/30 to-orange-500/30 border-2 border-yellow-500' 
        : switchWarning 
          ? 'animate-pulse bg-gradient-to-br from-red-500/30 to-pink-500/30 border-2 border-red-500' 
          : 'bg-white/5 border-white/10'
    } mb-4`}>
      {gamePhase === 'switching' && (
        <div className="absolute inset-0 bg-yellow-500/20 animate-pulse flex items-center justify-center">
          <div className="text-center">
            <div className="text-4xl mb-2">🔄</div>
            <div className="text-xl font-bold text-yellow-400">SWITCHING TO...</div>
            <div className="text-2xl font-bold mt-2">{players[nextPlayerIndex!]?.name}</div>
          </div>
        </div>
      )}
      <CardContent className="py-8">
        {!isPlaying && countdown > 0 ? (
          <div className="text-center">
            <div className="text-6xl font-bold text-emerald-400 animate-pulse">{countdown}</div>
            <div className="text-lg text-white/60 mt-2">Get ready!</div>
          </div>
        ) : !isPlaying && gamePhase === 'setup' ? (
          <div className="text-center">
            <div className="text-4xl mb-4">📱</div>
            <h3 className="text-xl font-bold mb-2">Everyone keep your phone nearby!</h3>
            <p className="text-white/60 mb-4">When your screen flashes, it's your turn to sing!</p>
            <Button onClick={onStartGame} className="bg-gradient-to-r from-emerald-500 to-teal-500 px-8 py-4 text-xl">
              🎤 Start!
            </Button>
          </div>
        ) : (
          <div className="text-center">
            {switchWarning && (
              <div className="mb-4 text-xl text-red-400 animate-pulse">
                ⚡ SWITCH COMING SOON! ⚡
              </div>
            )}
            
            <div className="text-sm text-white/60 mb-2">NOW SINGING</div>
            <div className="flex items-center justify-center gap-4 mb-4">
              {currentPlayer?.avatar ? (
                <img src={currentPlayer.avatar} alt={currentPlayer.name} className="w-20 h-20 rounded-full object-cover border-4 border-emerald-500" />
              ) : (
                <div 
                  className="w-20 h-20 rounded-full flex items-center justify-center text-white text-3xl font-bold border-4 border-emerald-500"
                  style={{ backgroundColor: currentPlayer?.color }}
                >
                  {currentPlayer?.name?.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="text-5xl font-bold">{currentPlayer?.name}</span>
            </div>
            <div className="text-3xl font-bold text-emerald-400">{currentPlayer?.score.toLocaleString()} pts</div>
            <div className="text-sm text-white/40 mt-2">Turn #{currentPlayer?.turnCount}</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
