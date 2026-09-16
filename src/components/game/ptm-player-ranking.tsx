'use client';

import { useMemo } from 'react';
import type { PtmPlayer } from '@/components/game/ptm-types';
import { PARTY_MAX_POINTS_PER_PLAYER } from '@/lib/game/party-scoring';

interface PtmPlayerRankingProps {
  players: PtmPlayer[];
  currentPlayerIndex: number;
}

export function PtmPlayerRanking({ players, currentPlayerIndex }: PtmPlayerRankingProps) {
  // DO-NOT-CHANGE: Dependency must be score-based, not the players array reference.
  // playersRef.current is a stable ref — the array reference never changes even when
  // individual player scores are updated via { ...p } spread. Using [players] as
  // the dependency causes useMemo to compute once and never re-sort, showing stale
  // scores (always 0). Deriving a score string forces re-computation when any score changes.
  const ranked = useMemo(() =>
    [...players]
      .map((p, i) => ({ ...p, originalIndex: i }))
      .sort((a, b) => b.score - a.score),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    players.map(p => p.score),
  );

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
              <div className="flex flex-col min-w-0 w-24">
                <span className={`text-xs font-medium truncate ${isActive ? 'text-white' : 'text-white/50'}`}>
                  {player.name ?? ''}
                </span>
                <span className={`text-[10px] tabular-nums ${isActive ? 'text-cyan-400 font-semibold' : 'text-white/25'}`}>
                  {String(player.score ?? 0).toLocaleString()}
                  <span className="text-white/20"> / {PARTY_MAX_POINTS_PER_PLAYER.toLocaleString()}</span>
                </span>
                {/* Budget bar — progress toward the player's 2,000-point song maximum */}
                <div
                  className="h-1 rounded-full mt-1 bg-white/10 overflow-hidden"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={PARTY_MAX_POINTS_PER_PLAYER}
                  aria-valuenow={Math.min(PARTY_MAX_POINTS_PER_PLAYER, Math.round(player.score ?? 0))}
                  aria-label={player.name}
                >
                  <div
                    className="h-full rounded-full transition-[width] duration-300 ease-out"
                    style={{
                      width: `${Math.max(0, Math.min(100, ((player.score ?? 0) / PARTY_MAX_POINTS_PER_PLAYER) * 100))}%`,
                      backgroundColor: player.color,
                    }}
                  />
                </div>
              </div>
              {/* Combo for active player */}
              {isActive && (player.combo ?? 0) > 1 && (
                <span className="text-[10px] text-amber-400 font-medium ml-auto">
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
