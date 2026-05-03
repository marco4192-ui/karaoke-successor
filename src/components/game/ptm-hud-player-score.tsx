'use client';

import type { PtmPlayer } from '@/components/game/ptm-types';

interface PtmHudPlayerScoreProps {
  players: PtmPlayer[];
  currentPlayer: PtmPlayer | undefined;
}

export function PtmHudPlayerScore({ players, currentPlayer }: PtmHudPlayerScoreProps) {
  return (
    <div className="absolute top-4 left-4 z-20">
      {/* Team total score (small, center-left) */}
      <div className="bg-black/50 backdrop-blur-sm rounded-lg px-3 py-1.5 border border-white/10 mb-2 text-center w-32">
        <div className="text-[10px] text-white/40 uppercase tracking-wider">Team-Score</div>
        <div className="text-lg font-bold text-cyan-400">
          {players.reduce((sum, p) => sum + p.score, 0).toLocaleString()}
        </div>
      </div>

      {/* Active player score (larger, left side) */}
      <div className="bg-black/50 backdrop-blur-sm rounded-lg px-4 py-3 border border-white/10 w-40">
        {currentPlayer?.avatar ? (
          <img
            src={currentPlayer.avatar}
            alt={currentPlayer.name}
            className="w-12 h-12 rounded-full object-cover border-2 mb-2"
            style={{ borderColor: currentPlayer.color }}
          />
        ) : (
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold border-2 text-xl mb-2"
            style={{ backgroundColor: currentPlayer?.color, borderColor: currentPlayer?.color }}
          >
            {currentPlayer?.name?.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="text-[10px] text-white/50 uppercase tracking-wider">Jetzt singt</div>
        <div className="text-base font-bold truncate" style={{ color: currentPlayer?.color }}>
          {currentPlayer?.name}
        </div>
        <div className="text-2xl font-bold text-cyan-400 mt-1">
          {currentPlayer?.score.toLocaleString()}
        </div>
        {currentPlayer && currentPlayer.combo > 0 && (
          <div className="text-xs text-amber-400 font-medium">🔥 {currentPlayer.combo}x Combo</div>
        )}
      </div>
    </div>
  );
}
