'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BattleRoyaleGame, BattleRoyalePlayer, getBattleRoyaleStats } from '@/lib/game/battle-royale';

interface RoundSetupViewProps {
  game: BattleRoyaleGame;
  stats: ReturnType<typeof getBattleRoyaleStats>;
  activePlayers: BattleRoyalePlayer[];
  onStartRound: () => void;
  onBack?: () => void;
}

export function RoundSetupView({ game, stats, activePlayers, onStartRound, onBack }: RoundSetupViewProps) {
  return (
    <div className="max-w-5xl mx-auto text-center">
      {onBack && (
        <div className="text-left mb-4">
          <Button variant="ghost" onClick={onBack} className="text-white/60">
            ← Back
          </Button>
        </div>
      )}
      <h1 className="text-3xl font-bold mb-2">Round {game.currentRound + 1}</h1>
      <p className="text-white/60 mb-6">
        {stats.activeMicPlayers} 🎤 Mic + {stats.activeCompanionPlayers} 📱 Companion = {activePlayers.length} players
      </p>
      
      {/* Player Grid - Split by Type */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Mic Players */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <span>🎤</span> Local Microphone ({stats.activeMicPlayers})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {game.players.filter(p => p.playerType === 'microphone').map(player => (
                <div 
                  key={player.id}
                  className={`p-3 rounded-xl transition-all ${
                    player.eliminated 
                      ? 'grayscale opacity-30 scale-75' 
                      : 'bg-gradient-to-br from-red-500/20 to-pink-500/20'
                  }`}
                >
                  {player.avatar ? (
                    <img src={player.avatar} alt={player.name} className="w-12 h-12 rounded-full object-cover mx-auto mb-2" />
                  ) : (
                    <div 
                      className="w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-bold mx-auto mb-2"
                      style={{ backgroundColor: player.eliminated ? '#666' : player.color }}
                    >
                      {player.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="font-bold text-sm">{player.name}</div>
                  {player.eliminated ? (
                    <div className="text-xs text-red-400">Eliminated R{player.eliminationRound}</div>
                  ) : (
                    <div className="text-xs text-white/60">{player.score.toLocaleString()} pts</div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Companion Players */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <span>📱</span> Companion App ({stats.activeCompanionPlayers})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-48">
              <div className="grid grid-cols-2 gap-2">
                {game.players.filter(p => p.playerType === 'companion').map(player => (
                  <div 
                    key={player.id}
                    className={`p-2 rounded-lg transition-all ${
                      player.eliminated 
                        ? 'grayscale opacity-30 scale-90' 
                        : 'bg-gradient-to-br from-purple-500/20 to-indigo-500/20'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {player.avatar ? (
                        <img src={player.avatar} alt={player.name} className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <div 
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                          style={{ backgroundColor: player.eliminated ? '#666' : player.color }}
                        >
                          {player.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{player.name}</div>
                        {player.eliminated ? (
                          <div className="text-xs text-red-400">Out</div>
                        ) : (
                          <div className="text-xs text-white/40">{player.score.toLocaleString()}</div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      <Button
        onClick={onStartRound}
        className="px-12 py-6 text-xl bg-gradient-to-r from-red-500 to-pink-500"
      >
        🎤 Start Round {game.currentRound + 1}
      </Button>
    </div>
  );
}
