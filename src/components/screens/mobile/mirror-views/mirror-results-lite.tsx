'use client';

import React from 'react';
import type { GameResults, MobileView } from '../mobile-types';
import { useTranslation } from '@/lib/i18n/translations';

// ===================== Props =====================

interface MirrorResultsLiteProps {
  gameResults: GameResults | null;
  onNavigate: (v: MobileView) => void;
}

// ===================== Component =====================

export const MirrorResultsLite = React.memo<MirrorResultsLiteProps>(
  function MirrorResultsLite({ gameResults }) {
    const { t } = useTranslation();

    if (!gameResults) {
      return (
        <div className="flex flex-col items-center justify-center gap-4 px-4 py-16">
          <div className="flex flex-col items-center gap-3 rounded-xl bg-white/5 border border-white/10 p-8">
            <span className="text-4xl">📊</span>
            <h2 className="text-lg font-semibold text-white">
              {t('mobile.mirrorResults') || 'Results'}
            </h2>
            <p className="text-sm text-white/40">
              {t('mobile.mirrorNoResults') || 'No results yet. Play a song first!'}
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-4 px-4 pb-8">
        {/* Song info */}
        <div className="flex flex-col items-center gap-2 rounded-xl bg-white/5 border border-white/10 p-6">
          <p className="text-xs font-medium uppercase tracking-wider text-white/40">
            {t('mobile.mirrorLastPlayed') || 'Last Played'}
          </p>
          <p className="text-lg font-bold text-white">{gameResults.songTitle}</p>
          <p className="text-sm text-white/60">{gameResults.songArtist}</p>
        </div>

        {/* Score */}
        <div className="flex flex-col items-center gap-2 rounded-xl bg-gradient-to-br from-cyan-500/15 to-purple-500/15 border border-cyan-400/20 p-6">
          <p className="text-4xl font-bold tabular-nums text-white">
            {gameResults.score.toLocaleString()}
          </p>
          <p className="text-sm text-white/60">
            {t('mobile.mirrorPoints') || 'points'}
          </p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2">
          <div className="flex flex-col items-center gap-1 rounded-xl bg-white/5 border border-white/10 p-3">
            <span className="text-lg font-semibold text-white">
              {Math.round(gameResults.accuracy * 100)}%
            </span>
            <span className="text-[10px] text-white/40">
              {t('mobile.mirrorAccuracy') || 'Accuracy'}
            </span>
          </div>
          <div className="flex flex-col items-center gap-1 rounded-xl bg-white/5 border border-white/10 p-3">
            <span className="text-lg font-semibold text-white">
              {gameResults.maxCombo}x
            </span>
            <span className="text-[10px] text-white/40">
              {t('mobile.mirrorMaxCombo') || 'Max Combo'}
            </span>
          </div>
          <div className="flex flex-col items-center gap-1 rounded-xl bg-white/5 border border-white/10 p-3">
            <span className="text-lg font-semibold text-yellow-400">
              {gameResults.rating}
            </span>
            <span className="text-[10px] text-white/40">
              {t('mobile.mirrorRating') || 'Rating'}
            </span>
          </div>
        </div>
      </div>
    );
  },
);
