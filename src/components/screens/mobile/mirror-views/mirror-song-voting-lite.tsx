'use client';

import React, { useCallback } from 'react';
import type { GameState, MobileView } from '../mobile-types';
import { useTranslation } from '@/lib/i18n/translations';

// ===================== Props =====================

interface MirrorSongVotingLiteProps {
  gameState: GameState;
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

export const MirrorSongVotingLite = React.memo<MirrorSongVotingLiteProps>(
  function MirrorSongVotingLite({ onSendDesktopCommand }) {
    const { t } = useTranslation();

    const handleClose = useCallback(() => {
      haptic();
      onSendDesktopCommand('party-setup');
    }, [onSendDesktopCommand]);

    return (
      <div className="flex flex-col gap-4 px-4 pb-8">
        {/* Header */}
        <div className="flex items-center gap-2 py-2">
          <span className="text-2xl">{'\u{1F3B5}'}</span>
          <h2 className="text-lg font-semibold text-white">{t('mobile.mirrorSongVoting') || 'Song-Abstimmung'}</h2>
        </div>

        {/* Hinweis */}
        <div className="rounded-xl bg-white/5 border border-white/10 p-6">
          <div className="flex flex-col items-center gap-3">
            <span className="text-4xl">{'\u{1F4F1}'}</span>
            <p className="text-sm font-medium text-white/80 text-center">{t('mobile.mirrorSongVotingHint') || 'Stimme auf dem Desktop ab'}</p>
            <p className="text-xs text-white/40 text-center">{t('mobile.mirrorSongVotingDesc') || 'Die Song-Auswahl findet auf dem Desktop-Bildschirm statt.'}</p>
          </div>
        </div>

        {/* Zurueck zum Setup */}
        <button
          onClick={handleClose}
          className="w-full rounded-lg p-3 text-center text-sm font-medium bg-white/10 border border-white/20 text-white/70 active:scale-[0.98] transition-transform"
        >
          {'\u2190'} {t('mobile.mirrorBackToSetup') || 'Zurueck zum Setup'}
        </button>
      </div>
    );
  },
);
