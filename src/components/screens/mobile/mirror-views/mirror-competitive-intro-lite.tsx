'use client';

import React, { useCallback } from 'react';
import type { GameState, MobileView } from '../mobile-types';
import { useTranslation } from '@/lib/i18n/translations';

// ===================== Props =====================

interface MirrorCompetitiveIntroLiteProps {
  gameState: GameState;
  profileName: string;
  onNavigate: (v: MobileView) => void;
  onSendDesktopCommand: (command: string) => void;
}

// ===================== Hilfsfunktionen =====================

function haptic() {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(10);
  }
}

// ===================== Component =====================

export function MirrorCompetitiveIntroLite({ gameState, onSendDesktopCommand }: MirrorCompetitiveIntroLiteProps) {
  const { t } = useTranslation();

  const intro = gameState.ptmIntroData;
  const isBlind = gameState.currentScreen === 'blind-game';

  const handleStart = useCallback(() => {
    haptic();
    onSendDesktopCommand('party_start');
  }, [onSendDesktopCommand]);

  return (
    <div className="flex flex-col items-center justify-center gap-6 px-4 py-12">
      {/* Icon */}
      <div className="text-5xl">{isBlind ? '🙈' : '📝'}</div>

      {/* Title */}
      <h2 className="text-xl font-bold text-white text-center">
        {isBlind
          ? (t('blind.title') || 'Blind')
          : (t('missingWords.title') || 'Missing Words')}
      </h2>

      {/* Song info */}
      <div className="flex flex-col items-center gap-2 rounded-xl bg-white/5 border border-white/10 px-6 py-4 w-full max-w-sm">
        {intro?.songTitle ? (
          <>
            <p className="text-base font-semibold text-white truncate max-w-full">{intro.songTitle}</p>
            {intro.songArtist && (
              <p className="text-sm text-white/40 truncate max-w-full">{intro.songArtist}</p>
            )}
          </>
        ) : null}
        {intro?.playerCount ? (
          <p className="text-sm text-white/70">{intro.playerCount} Spieler</p>
        ) : null}
      </div>

      {/* Start Button */}
      <button
        type="button"
        onClick={handleStart}
        className={
          'mt-2 w-full max-w-sm rounded-xl px-8 py-4 text-base font-bold ' +
          'bg-gradient-to-r from-amber-500 to-yellow-500 text-white ' +
          'active:scale-[0.97] transition-all shadow-lg'
        }
      >
        ▶ {t('competitive.start') || 'Start'}
      </button>
    </div>
  );
}

MirrorCompetitiveIntroLite.displayName = 'MirrorCompetitiveIntroLite';
