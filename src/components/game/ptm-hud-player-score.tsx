'use client';

import type { PtmPlayer } from '@/components/game/ptm-types';
import { useTranslation } from '@/lib/i18n/translations';

interface PtmHudPlayerScoreProps {
  players: PtmPlayer[];
  currentPlayer: PtmPlayer | undefined;
}

export function PtmHudPlayerScore({ players, currentPlayer }: PtmHudPlayerScoreProps) {
  const { t } = useTranslation();
  const teamScore = players.reduce((sum, p) => sum + p.score, 0);

  return (
    <div className="absolute top-0 left-1/2 -translate-x-1/2 z-20 flex items-start gap-2 pt-2">
      {/* Active player — "Jetzt singt" */}
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
        <div className="text-[10px] text-white/50 uppercase tracking-wider">{t('passTheMic.nowSinging')}</div>
        <div className="text-base font-bold truncate" style={{ color: currentPlayer?.color }}>
          {currentPlayer?.name}
        </div>
        <div className="text-2xl font-bold text-cyan-400 mt-1" style={{ textShadow: '0 0 12px rgba(34,211,238,0.4)' }}>
          {currentPlayer?.score.toLocaleString()}
        </div>
        {currentPlayer && currentPlayer.combo > 0 && (
          <div className="text-xs text-amber-400 font-medium">🔥 {currentPlayer.combo}x Combo</div>
        )}
      </div>

      {/* Team total score — right next to "Jetzt singt" */}
      <div className="bg-black/50 backdrop-blur-sm rounded-lg px-3 py-1.5 border border-white/10 text-center w-32">
        <div className="text-[10px] text-white/40 uppercase tracking-wider">{t('passTheMic.teamScore')}</div>
        <div className="text-lg font-bold text-cyan-400">
          {teamScore.toLocaleString()}
        </div>
      </div>
    </div>
  );
}
