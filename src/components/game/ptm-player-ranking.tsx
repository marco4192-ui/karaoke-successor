'use client';

import type { PtmPlayer } from '@/components/game/ptm-types';

interface PtmPlayerRankingProps {
  players: PtmPlayer[];
  currentPlayerIndex: number;
}

export function PtmPlayerRanking({ players, currentPlayerIndex }: PtmPlayerRankingProps) {
  const ranked = [...players]
    .map((p, i) => ({ ...p, originalIndex: i }))
    .sort((a, b) => b.score - a.score);

  return (
    <div className="absolute left-4 top-1/2 -translate-y-1/2 z-20">
      <div className="flex flex-col gap-1.5">
        {ranked.map((player, rank) => {
          const isActive = player.originalIndex === currentPlayerIndex;
          return (
            <div
              key={player.id}
              className={`flex items-center gap-2 px-2.5 py-2 rounded-lg transition-all ${
                isActive
                  ? 'bg-white/15 border border-white/20 scale-105'
                  : 'bg-black/40 border border-white/5'
              }`}
              style={isActive ? { borderColor: `${player.color}50` } : {}}
            >
              {/* Rank number */}
              <span className={`text-[10px] font-bold w-4 text-center ${
                rank === 0 ? 'text-yellow-400' : 'text-white/30'
              }`}>
                {rank + 1}
              </span>
              {/* Avatar */}
              {player.avatar ? (
                <img
                  src={player.avatar}
                  alt={player.name}
                  className={`w-7 h-7 rounded-full object-cover ${isActive ? 'border-2' : 'border border-white/20'}`}
                  style={isActive ? { borderColor: player.color } : {}}
                />
              ) : (
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white ${isActive ? 'border-2' : 'border border-white/20'}`}
                  style={{ backgroundColor: `${player.color}80`, borderColor: isActive ? player.color : undefined }}
                >
                  {player.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex flex-col min-w-0">
                <span className={`text-xs font-medium truncate max-w-[80px] ${isActive ? 'text-white' : 'text-white/50'}`}>
                  {player.name}
                </span>
                <span className={`text-[10px] ${isActive ? 'text-cyan-400 font-semibold' : 'text-white/25'}`}>
                  {player.score.toLocaleString()} pts
                </span>
              </div>
              {/* Combo for active player */}
              {isActive && player.combo > 1 && (
                <span className="text-[10px] text-amber-400 font-medium ml-auto">
                  {player.combo}x
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
