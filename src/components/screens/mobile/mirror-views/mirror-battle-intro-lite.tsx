'use client';

import React, { useCallback } from 'react';
import type { GameState, MobileView } from '../mobile-types';
import { useTranslation } from '@/lib/i18n/translations';

// ===================== Props =====================

interface MirrorBattleIntroLiteProps {
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

export function MirrorBattleIntroLite({ gameState, onSendDesktopCommand }: MirrorBattleIntroLiteProps) {
  const { t } = useTranslation();

  const intro = gameState.ptmIntroData;

  const handleStart = useCallback(() => {
    haptic();
    onSendDesktopCommand('party_start');
  }, [onSendDesktopCommand]);

  return (
    <div className="flex flex-col items-center justify-center gap-6 px-4 py-12">
      {/* Icon */}
      <div className="text-5xl">⚔️</div>

      {/* Title */}
      <h2 className="text-xl font-bold text-white text-center">
        {t('battleRoyale.title') || 'Battle Royale'}
      </h2>

      {/* Player info */}
      <div className="flex flex-col items-center gap-2 rounded-xl bg-white/5 border border-white/10 px-6 py-4 w-full max-w-sm">
        {intro?.playerCount ? (
          <p className="text-sm text-white/70">{intro.playerCount} Spieler</p>
        ) : null}
        {intro?.startPlayerName ? (
          <div
            className="flex items-center gap-3 rounded-lg border-2 px-4 py-3 w-full"
            style={{
              borderColor: `${intro.startPlayerColor || '#EF4444'}60`,
              background: `linear-gradient(135deg, ${intro.startPlayerColor || '#EF4444'}15, ${intro.startPlayerColor || '#EF4444'}05)`,
            }}
          >
            {intro.startPlayerAvatar ? (
              <img src={intro.startPlayerAvatar} alt={intro.startPlayerName} className="w-10 h-10 rounded-full object-cover" />
            ) : (
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold text-white"
                style={{ backgroundColor: intro.startPlayerColor || '#EF4444' }}
              >
                {intro.startPlayerName[0]?.toUpperCase() || '?'}
              </div>
            )}
            <p className="text-base font-bold text-white">{intro.startPlayerName}</p>
          </div>
        ) : null}
      </div>

      {/* Start Button */}
      <button
        type="button"
        onClick={handleStart}
        className={
          'mt-2 w-full max-w-sm rounded-xl px-8 py-4 text-base font-bold ' +
          'bg-gradient-to-r from-red-500 to-orange-500 text-white ' +
          'active:scale-[0.97] transition-all shadow-lg'
        }
      >
        ▶ {t('battleRoyale.startRound') || 'Runde starten'}
      </button>
    </div>
  );
}

MirrorBattleIntroLite.displayName = 'MirrorBattleIntroLite';
