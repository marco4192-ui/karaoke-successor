'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BattleRoyalePlayer } from '@/lib/game/battle-royale';

interface WinnerViewProps {
  winner: NonNullable<import('@/lib/game/battle-royale').BattleRoyaleGame['winner']>;
  sortedPlayers: BattleRoyalePlayer[];
  onEndGame: () => void;
}

export function WinnerView({ winner, sortedPlayers, onEndGame }: WinnerViewProps) {
  return (
    <div className="max-w-5xl mx-auto text-center">
      <div className="bg-gradient-to-r from-amber-500/30 to-yellow-500/30 border-2 border-amber-500 rounded-xl p-12">
        <div className="text-8xl mb-6 animate-bounce">👑</div>
        <h1 className="text-4xl font-bold text-amber-400 mb-4">WINNER!</h1>
        <div className="flex items-center justify-center gap-4 mb-6">
          {winner.avatar ? (
            <img src={winner.avatar} alt={winner.name} className="w-24 h-24 rounded-full object-cover border-4 border-amber-500" />
          ) : (
            <div 
              className="w-24 h-24 rounded-full flex items-center justify-center text-white text-3xl font-bold border-4 border-amber-500"
              style={{ backgroundColor: winner.color }}
            >
              {winner.name.charAt(0).toUpperCase()}
            </div>
          )}
          <span className="text-5xl font-bold">{winner.name}</span>
          <Badge className={`${winner.playerType === 'microphone' ? 'bg-red-500/20 text-red-400' : 'bg-purple-500/20 text-purple-400'} text-lg px-3 py-1`}>
            {winner.playerType === 'microphone' ? '🎤 Mic' : '📱 Companion'}
          </Badge>
        </div>
        <div className="text-xl text-white/60 mb-8">
          Final Score: <span className="text-amber-400 font-bold">{winner.score.toLocaleString()}</span>
        </div>
        <Button
          onClick={onEndGame}
          className="bg-gradient-to-r from-amber-500 to-yellow-500 px-8 py-4 text-xl"
        >
          🏠 Return to Menu
        </Button>
      </div>

      {/* Elimination Order */}
      <div className="mt-8">
        <h2 className="text-xl font-bold mb-4">Elimination Order</h2>
        <ScrollArea className="h-64">
          <div className="flex justify-center gap-3 flex-wrap">
            {sortedPlayers.reverse().map((player, index) => (
              <div 
                key={player.id}
                className={`p-3 rounded-lg ${player.id === winner?.id ? 'bg-amber-500/20 border border-amber-500' : 'bg-white/5'}`}
              >
                <div className="text-sm text-white/40 mb-1">#{sortedPlayers.length - index}</div>
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
                  <span>{player.name}</span>
                  <span className="text-lg">
                    {player.playerType === 'microphone' ? '🎤' : '📱'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
