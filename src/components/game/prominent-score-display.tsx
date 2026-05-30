'use client';

import React from 'react';
import { Player } from '@/types/game';
import { MAX_POINTS_PER_SONG } from '@/lib/game/scoring';
import { useTranslation } from '@/lib/i18n/translations';

interface ProminentScoreDisplayProps {
  player: Player | undefined;
  showCombo?: boolean;
}

/**
 * Prominent score display for single-player mode.
 * - Left header: player avatar + name
 * - Top center: large real-time score out of max, combo counter
 */
export const ProminentScoreDisplay = React.memo(function ProminentScoreDisplay({ player, showCombo }: ProminentScoreDisplayProps) {
  const { t } = useTranslation();
  const score = player?.score || 0;
  const combo = player?.combo || 0;
  const name = player?.name || t('prominentScore.player1');
  const avatar = player?.avatar;
  const color = player?.color || '#00e5ff';

  return (
    <>
      {/* Player Info — below header, left-aligned */}
      <div className="fixed top-14 left-4 z-40 flex items-center gap-2.5 pointer-events-none">
        {/* Avatar */}
        {avatar ? (
          <img
            src={avatar}
            alt={name}
            className="w-9 h-9 rounded-full object-cover border-2"
            style={{ borderColor: color }}
          />
        ) : (
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold border-2 text-sm"
            style={{ backgroundColor: color, borderColor: color }}
          >
            {name.charAt(0).toUpperCase()}
          </div>
        )}
        {/* Name */}
        <span
          className="text-xs font-bold truncate max-w-[100px]"
          style={{ color }}
        >
          {name}
        </span>
      </div>

      {/* Total Score Display — top center, below header */}
      <div className="fixed top-14 left-1/2 -translate-x-1/2 z-40 pointer-events-none">
        <div
          className="backdrop-blur-md px-8 py-4 rounded-2xl border-2 shadow-xl"
          style={{ backgroundColor: 'rgba(10, 0, 20, 0.7)', borderColor: 'rgba(0, 229, 255, 0.3)', boxShadow: '0 0 40px rgba(0, 229, 255, 0.15), 0 0 80px rgba(0, 229, 255, 0.05)' }}
        >
          <div className="flex flex-col items-center gap-1">
            {/* Main Score */}
            <div className="flex items-baseline gap-3">
              <span
                className="text-5xl font-black"
                style={{
                  color: '#00e5ff',
                  textShadow: '0 0 10px rgba(0, 229, 255, 0.8), 0 0 20px rgba(0, 229, 255, 0.5), 0 0 40px rgba(0, 229, 255, 0.3)',
                }}
              >
                {score.toLocaleString()}
              </span>
              <span className="text-white/40 text-sm">/ {MAX_POINTS_PER_SONG.toLocaleString()}</span>
            </div>

            {/* Combo */}
            {showCombo !== false && combo >= 1 && (
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg" style={{ color: '#ff2d95', textShadow: '0 0 10px rgba(255, 45, 149, 0.6)' }}>
                  {combo}x
                </span>
                <span className="text-white/60 text-sm">{t('prominentScore.combo')}</span>
                {combo >= 5 && (
                  <span className="font-semibold text-xs" style={{ color: '#39ff14' }}>
                    (+{Math.round(Math.min(0.5, combo * 0.02) * 100)}%)
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Combo indicator with glow effect — positioned below score card */}
      {showCombo !== false && combo >= 5 && (
        <div className="fixed top-40 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
          <div
            className="text-2xl font-black animate-pulse"
            style={{
              color: combo >= 20 ? '#ffd60a' :
                     combo >= 10 ? '#ff2d95' : '#00e5ff',
              textShadow: '0 0 20px currentColor, 0 0 40px currentColor, 0 0 60px currentColor',
            }}
          >
            {t('prominentScore.comboMultiplied').replace('{n}', String(combo))}
          </div>
        </div>
      )}
    </>
  );
});
