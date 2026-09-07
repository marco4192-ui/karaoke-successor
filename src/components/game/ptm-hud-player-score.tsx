'use client';

import type { PtmPlayer } from '@/components/game/ptm-types';
import { useTranslation } from '@/lib/i18n/translations';

interface PtmHudPlayerScoreProps {
  players: PtmPlayer[];
  currentPlayer: PtmPlayer | undefined;
}

/**
 * Top-center "Now Singing" card + team score chip (Pattern C).
 * Glassmorphism panel with a player-color glow so it stays readable over
 * any background; the active player's color frames the avatar.
 */
export function PtmHudPlayerScore({ players, currentPlayer }: PtmHudPlayerScoreProps) {
  const { t } = useTranslation();
  const teamScore = players.reduce((sum, p) => sum + p.score, 0);
  const accent = currentPlayer?.color ?? '#22d3ee';

  return (
    <div className="absolute top-0 left-1/2 -translate-x-1/2 z-20 flex items-start gap-2 pt-2">
      {/* Active player — "Jetzt singt" */}
      <div
        className="bg-black/55 backdrop-blur-md rounded-2xl px-4 py-3 border border-white/15 w-40 shadow-lg shadow-black/40"
        style={{ boxShadow: `0 8px 24px rgba(0,0,0,0.45), 0 0 18px ${accent}30` }}
      >
        <div className="flex items-start gap-3">
          {currentPlayer?.avatar ? (
            <img
              src={currentPlayer.avatar}
              alt={currentPlayer.name}
              className="w-12 h-12 rounded-full object-cover border-2 shrink-0"
              style={{ borderColor: accent, boxShadow: `0 0 10px ${accent}60` }}
            />
          ) : (
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold border-2 text-xl shrink-0"
              style={{ backgroundColor: currentPlayer?.color, borderColor: accent, boxShadow: `0 0 10px ${accent}60` }}
            >
              {currentPlayer?.name?.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="text-[10px] text-white/70 uppercase tracking-[0.14em] font-semibold flex items-center gap-1.5">
              <span
                className="inline-block w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse"
                aria-hidden="true"
              />
              {t('passTheMic.nowSinging')}
            </div>
            <div className="text-base font-bold truncate" style={{ color: accent }}>
              {currentPlayer?.name ?? ''}
            </div>
            <div className="text-2xl font-bold text-cyan-300 mt-0.5" style={{ textShadow: '0 0 12px rgba(34,211,238,0.5)' }}>
              {(currentPlayer?.score ?? 0).toLocaleString()}
            </div>
          </div>
        </div>
        {currentPlayer && currentPlayer.combo > 0 && (
          <div className="text-xs text-amber-400 font-medium mt-1.5">🔥 {String(currentPlayer.combo)}x Combo</div>
        )}
      </div>

      {/* Team total score — right next to "Jetzt singt" */}
      <div className="bg-black/55 backdrop-blur-md rounded-2xl px-3 py-1.5 border border-white/15 text-center w-32 shadow-lg shadow-black/40">
        <div className="text-[10px] text-white/60 uppercase tracking-[0.14em] font-semibold">{t('passTheMic.teamScore')}</div>
        <div className="text-lg font-bold text-cyan-300" style={{ textShadow: '0 0 10px rgba(34,211,238,0.4)' }}>
          {teamScore.toLocaleString()}
        </div>
      </div>
    </div>
  );
}
