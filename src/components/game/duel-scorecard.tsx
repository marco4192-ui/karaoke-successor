'use client';

import React from 'react';
import { Player } from '@/types/game';
import { DuelMatch } from '@/lib/game/multiplayer';

export interface DuelScorecardProps {
  gameMode: string;
  duelMatch: DuelMatch | null;
  players: Player[];
  player2Score: number;
  player2Combo: number;
}

export function DuelScorecard({
  gameMode,
  duelMatch,
  players,
  player2Score,
  player2Combo,
}: DuelScorecardProps) {
  if (gameMode !== 'duel' || !duelMatch) return null;

  const player1 = players[0];
  const player2 = players[1];

  return (
    <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/80 to-transparent p-4">
      <div className="grid grid-cols-2 gap-4 max-w-4xl mx-auto">
        {/* Player 1 */}
        <div className="bg-white/5 rounded-xl p-3 border border-cyan-500/30">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-cyan-500 flex items-center justify-center text-sm font-bold">
              {player1?.name?.[0] || 'P1'}
            </div>
            <span className="font-medium">{player1?.name || 'Player 1'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold text-cyan-400">
              {player1?.score?.toLocaleString() || 0}
            </span>
            <span className="text-purple-400">{player1?.combo || 0}x</span>
          </div>
          <div className="mt-2 h-1 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-cyan-500 transition-all"
              style={{ width: `${player1?.accuracy || 0}%` }}
            />
          </div>
        </div>

        {/* Player 2 */}
        <div className="bg-white/5 rounded-xl p-3 border border-pink-500/30">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-pink-500 flex items-center justify-center text-sm font-bold">
              {player2?.name?.[0] || 'P2'}
            </div>
            <span className="font-medium">{player2?.name || 'Player 2'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold text-pink-400">
              {duelMatch.player2?.score?.toLocaleString() || player2Score}
            </span>
            <span className="text-purple-400">
              {duelMatch.player2?.combo || player2Combo}x
            </span>
          </div>
          <div className="mt-2 h-1 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-pink-500 transition-all"
              style={{ width: `${duelMatch.player2?.accuracy || 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* VS Badge */}
      <div className="absolute left-1/2 -translate-x-1/2 -top-4 bg-gradient-to-r from-cyan-500 to-pink-500 text-white font-bold px-4 py-1 rounded-full text-sm shadow-lg">
        VS
      </div>
    </div>
  );
}
