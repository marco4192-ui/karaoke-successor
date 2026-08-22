'use client';

import React, { useCallback } from 'react';
import type { GameResults, MobileView } from '../mobile-types';
import { useTranslation } from '@/lib/i18n/translations';

// ===================== Props =====================

interface MirrorResultsLiteProps {
  gameResults: GameResults | null;
  onNavigate: (v: MobileView) => void;
  /** Sendet einen Navigations-/Aktions-Command an den Desktop */
  onSendDesktopCommand: (command: string) => void;
}

// ===================== Hilfsfunktionen =====================

function haptic() {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(10);
  }
}

// ===================== Component =====================

export const MirrorResultsLite = React.memo<MirrorResultsLiteProps>(
  function MirrorResultsLite({ gameResults, onSendDesktopCommand }) {
    const { t } = useTranslation();

    const handleCommand = useCallback(
      (cmd: string) => {
        haptic();
        onSendDesktopCommand(cmd);
      },
      [onSendDesktopCommand],
    );

    if (!gameResults) {
      return (
        <div className="flex flex-col items-center justify-center gap-4 px-4 py-16">
          <div className="flex flex-col items-center gap-3 rounded-xl bg-white/5 border border-white/10 p-8">
            <span className="text-4xl">📊</span>
            <h2 className="text-lg font-semibold text-white">
              {t('mobile.mirrorResults')}
            </h2>
            <p className="text-sm text-white/40">
              {t('mobile.mirrorNoResults')}
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
            {t('mobile.mirrorLastPlayed')}
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
            {t('mobile.mirrorPoints')}
          </p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2">
          <div className="flex flex-col items-center gap-1 rounded-xl bg-white/5 border border-white/10 p-3">
            <span className="text-lg font-semibold text-white">
              {Math.round(gameResults.accuracy * 100)}%
            </span>
            <span className="text-[10px] text-white/40">
              {t('mobile.mirrorAccuracy')}
            </span>
          </div>
          <div className="flex flex-col items-center gap-1 rounded-xl bg-white/5 border border-white/10 p-3">
            <span className="text-lg font-semibold text-white">
              {gameResults.maxCombo}x
            </span>
            <span className="text-[10px] text-white/40">
              {t('mobile.mirrorMaxCombo')}
            </span>
          </div>
          <div className="flex flex-col items-center gap-1 rounded-xl bg-white/5 border border-white/10 p-3">
            <span className="text-lg font-semibold text-yellow-400">
              {gameResults.rating}
            </span>
            <span className="text-[10px] text-white/40">
              {t('mobile.mirrorRating')}
            </span>
          </div>
        </div>

        {/* ── Action Buttons ── */}
        <div className="flex flex-col gap-2 mt-2">
          {/* Highscores (Trophy) */}
          <button
            onClick={() => handleCommand('scores')}
            className={
              'w-full flex items-center justify-center gap-2 rounded-xl p-4 ' +
              'bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 ' +
              'font-semibold active:scale-[0.97] transition-transform'
            }
          >
            <span>🏆</span>
            <span className="text-sm">{t('resultsScreen.scores')}</span>
          </button>

          {/* Play Again */}
          <button
            onClick={() => handleCommand('play_again')}
            className={
              'w-full flex items-center justify-center gap-2 rounded-xl p-4 ' +
              'bg-gradient-to-r from-cyan-500/25 to-purple-500/25 border border-cyan-400/30 text-white ' +
              'font-semibold active:scale-[0.97] transition-transform'
            }
          >
            <span>🔄</span>
            <span className="text-sm">{t('results.playAgain')}</span>
          </button>

          {/* Back to Home */}
          <button
            onClick={() => handleCommand('home')}
            className={
              'w-full flex items-center justify-center gap-2 rounded-xl p-4 ' +
              'bg-white/5 border border-white/20 text-white/80 ' +
              'font-medium active:scale-[0.97] transition-transform'
            }
          >
            <span>🏠</span>
            <span className="text-sm">{t('results.backToHome')}</span>
          </button>
        </div>
      </div>
    );
  },
);
