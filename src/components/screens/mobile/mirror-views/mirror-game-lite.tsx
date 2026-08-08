'use client';

import React, { useCallback } from 'react';
import type { GameState, MobileView } from '../mobile-types';
import { useTranslation } from '@/lib/i18n/translations';

// ===================== Props =====================

interface MirrorGameLiteProps {
  gameState: GameState;
  clientId: string | null;
  profileName: string;
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

export const MirrorGameLite = React.memo<MirrorGameLiteProps>(
  function MirrorGameLite({ gameState, onSendDesktopCommand }) {
    const { t } = useTranslation();

    const handleCmd = useCallback(
      (cmd: string) => {
        haptic();
        onSendDesktopCommand(cmd);
      },
      [onSendDesktopCommand],
    );

    // Wenn kein Song aktiv, nur Platzhalter
    if (!gameState.currentSong) {
      return (
        <div className="flex items-center justify-center px-4 pt-8">
          <p className="text-sm text-white/40">{t('mobile.mirrorNoSong')}</p>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-3 px-4 pb-8 pt-2">
        {/* Wiedergabesteuerung */}
        <div className="flex gap-2">
          <button
            onClick={() => handleCmd('restart')}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl p-3 bg-white/5 border border-white/10 active:scale-95 transition-transform"
          >
            <span className="text-base">⏮</span>
            <span className="text-xs font-medium text-white/70">{t('mobile.mirrorRestart') || 'Restart'}</span>
          </button>
          <button
            onClick={() => handleCmd(gameState.isPlaying ? 'pause' : 'play')}
            className={
              'flex-1 flex items-center justify-center gap-2 rounded-xl p-3 active:scale-95 transition-transform ' +
              (gameState.isPlaying
                ? 'bg-yellow-500/15 border border-yellow-400/30 text-yellow-400'
                : 'bg-green-500/15 border border-green-400/30 text-green-400')
            }
          >
            <span className="text-base">{gameState.isPlaying ? '⏸' : '▶'}</span>
            <span className="text-xs font-medium">{gameState.isPlaying ? (t('mobile.mirrorPause') || 'Pause') : (t('mobile.mirrorPlay') || 'Play')}</span>
          </button>
          <button
            onClick={() => handleCmd('skip')}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl p-3 bg-white/5 border border-white/10 active:scale-95 transition-transform"
          >
            <span className="text-base">⏭</span>
            <span className="text-xs font-medium text-white/70">{t('mobile.mirrorSkip') || 'Skip'}</span>
          </button>
        </div>

        {/* Lautstärkeregelung */}
        <div className="flex gap-2">
          <button
            onClick={() => handleCmd('volume_down')}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl p-3 bg-white/5 border border-white/10 active:scale-95 transition-transform"
          >
            <span className="text-base">🔉</span>
            <span className="text-xs font-medium text-white/70">Vol -</span>
          </button>
          <button
            onClick={() => handleCmd('volume_up')}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl p-3 bg-white/5 border border-white/10 active:scale-95 transition-transform"
          >
            <span className="text-base">🔊</span>
            <span className="text-xs font-medium text-white/70">Vol +</span>
          </button>
        </div>

        {/* Live-Punkte-Rangliste */}
        {gameState.companionScores && gameState.companionScores.length > 0 && (
          <div className="flex flex-col gap-2 rounded-xl bg-white/5 border border-white/10 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-white/40">
              {t('mobile.mirrorLiveScores')}
            </p>
            {gameState.companionScores.map((entry) => (
              <div key={entry.profileId} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: entry.color }} />
                  <span className="text-sm text-white/80">{entry.name}</span>
                </div>
                <span className="text-sm font-semibold tabular-nums text-white">
                  {entry.score.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Navigation */}
        <div className="grid grid-cols-2 gap-2.5">
          <button
            onClick={() => handleCmd('home')}
            className="flex items-center justify-center gap-2 rounded-xl p-3 bg-white/5 border border-white/10 active:scale-95 transition-transform"
          >
            <span className="text-base">🏠</span>
            <span className="text-xs font-medium text-white/70">{t('mobile.mirrorHome') || 'Home'}</span>
          </button>
          <button
            onClick={() => handleCmd('fullscreen')}
            className="flex items-center justify-center gap-2 rounded-xl p-3 bg-white/5 border border-white/10 active:scale-95 transition-transform"
          >
            <span className="text-base">🖥</span>
            <span className="text-xs font-medium text-white/70">{t('mobile.mirrorFullscreen') || 'Fullscreen'}</span>
          </button>
        </div>
      </div>
    );
  },
);
