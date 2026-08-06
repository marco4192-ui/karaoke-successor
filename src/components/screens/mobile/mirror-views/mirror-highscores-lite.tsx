'use client';

import React, { useState, useCallback } from 'react';
import type { GameState, MobileView } from '../mobile-types';
import { useTranslation } from '@/lib/i18n/translations';

// ===================== Props =====================

interface MirrorHighscoresLiteProps {
  gameState: GameState;
  onNavigate: (v: MobileView) => void;
  onSendDesktopCommand: (screen: string) => void;
}

// ===================== Hilfsfunktionen =====================

function haptic() {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(10);
  }
  }

// ===================== Component =====================

export const MirrorHighscoresLite = React.memo<MirrorHighscoresLiteProps>(
  function MirrorHighscoresLite({ onSendDesktopCommand }) {
    const { t } = useTranslation();
    const [leaderboardType, setLeaderboardType] = useState<'local' | 'global'>('local');
    const [filter, setFilter] = useState<'all' | 'mine'>('all');

    const handleLeaderboardType = useCallback(
      (type: 'local' | 'global') => {
        haptic();
        setLeaderboardType(type);
      },
      [],
    );

    const handleFilter = useCallback(
      (f: 'all' | 'mine') => {
        haptic();
        setFilter(f);
      },
      [],
    );

    return (
      <div className="flex flex-col gap-3 px-4 pb-8">
        {/* Header */}
        <div className="flex items-center gap-2 py-2">
          <span className="text-2xl">🏆</span>
          <h2 className="text-lg font-semibold text-white">
            {t('mobile.mirrorHighscores')}
          </h2>
        </div>

        {/* Local / Global Toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => handleLeaderboardType('local')}
            className={
              'flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold text-center active:scale-95 transition-transform ' +
              (leaderboardType === 'local'
                ? 'bg-cyan-500/25 border border-cyan-400/40 text-cyan-400'
                : 'bg-white/5 border border-white/10 text-white/50')
            }
          >
            {t('highscoreScreen.local')}
          </button>
          <button
            onClick={() => handleLeaderboardType('global')}
            className={
              'flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold text-center active:scale-95 transition-transform ' +
              (leaderboardType === 'global'
                ? 'bg-purple-500/25 border border-purple-400/40 text-purple-400'
                : 'bg-white/5 border border-white/10 text-white/50')
            }
          >
            {t('highscoreScreen.global')}
          </button>
        </div>

        {/* Local-only: All / Mine Filter */}
        {leaderboardType === 'local' && (
          <div className="flex gap-2">
            <button
              onClick={() => handleFilter('all')}
              className={
                'flex-1 rounded-lg px-4 py-2 text-sm font-medium text-center active:scale-95 transition-transform ' +
                (filter === 'all'
                  ? 'bg-white/15 border border-white/25 text-white'
                  : 'bg-white/5 border border-white/10 text-white/40')
              }
            >
              {t('highscoreScreen.allScores')}
            </button>
            <button
              onClick={() => handleFilter('mine')}
              className={
                'flex-1 rounded-lg px-4 py-2 text-sm font-medium text-center active:scale-95 transition-transform ' +
                (filter === 'mine'
                  ? 'bg-white/15 border border-white/25 text-white'
                  : 'bg-white/5 border border-white/10 text-white/40')
              }
            >
              {t('highscoreScreen.myScores')}
            </button>
          </div>
        )}

        {/* Open on Desktop Button */}
        <button
          onClick={() => { haptic(); onSendDesktopCommand('highscores'); }}
          className={
            'w-full rounded-lg p-3 text-center text-sm font-semibold ' +
            'bg-cyan-500/15 border border-cyan-400/30 text-cyan-400 ' +
            'active:scale-[0.97] transition-transform'
          }
        >
          {t('mobile.mirrorOpenOnDesktop')}
        </button>
      </div>
    );
  },
);