'use client';

import { useMemo } from 'react';
import type { PtmPlayer } from '@/components/game/ptm-types';

interface PtmPlayerRankingProps {
  players: PtmPlayer[];
  currentPlayerIndex: number;
}

export function PtmPlayerRanking({ players, currentPlayerIndex }: PtmPlayerRankingProps) {
  const ranked = useMemo(() =>
    [...players]
      .map((p, i) => ({ ...p, originalIndex: i }))
      .sort((a, b) => b.score - a.score),
    [players],
  );

  return (
    <div className="absolute left-4 top-1/2 -translate-y-1/2 z-20">
      <div className="flex flex-col gap-1.5">
        {ranked.map((player, rank) => {
          const isActive = player.originalIndex === currentPlayerIndex;
          return (
            <div
              key={player.id}
              className={`flex items-center gap-2 px-2.5 py-2 rounded-lg transition-all border-[2px] ${
                isActive
                  ? 'bg-[#2a1a3e] border-black scale-105'
                  : 'bg-[#1a0a2e] border-black/30'
              }`}
              style={isActive ? { borderColor: `${player.color}`, boxShadow: `3px 3px 0px ${player.color}` } : {}}
            >
              {/* Rank number */}
              <span className={`text-[10px] font-bold w-4 text-center ${
                rank === 0 ? 'text-[#FDE601]' : 'text-white/30'
              }`}>
                {rank + 1}
              </span>
              {/* Avatar */}
              {player.avatar ? (
                <img
                  src={player.avatar}
                  alt={player.name}
                  className={`w-7 h-7 rounded-full object-cover border-[2px] ${isActive ? 'border-black' : 'border-black/30'}`}
                  style={isActive ? { borderColor: player.color } : {}}
                />
              ) : (
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white border-[2px] ${isActive ? 'border-black' : 'border-black/30'}`}
                  style={{ backgroundColor: `${player.color}80`, borderColor: isActive ? player.color : undefined }}
                >
                  {player.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex flex-col min-w-0">
                <span className={`text-xs font-medium truncate max-w-[80px] ${isActive ? 'text-white' : 'text-white/50'}`}>
                  {player.name ?? ''}
                </span>
                <span className={`text-[10px] ${isActive ? 'text-[#00F3B2] font-semibold' : 'text-white/25'}`}>
                  {String(player.score ?? 0).toLocaleString()} pts
                </span>
              </div>
              {/* Combo for active player */}
              {isActive && (player.combo ?? 0) > 1 && (
                <span className="text-[10px] text-[#FC6B48] font-medium ml-auto">
                  {String(player.combo)}x
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
