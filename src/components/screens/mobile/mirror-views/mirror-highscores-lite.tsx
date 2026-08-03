'use client';

import React from 'react';
import type { GameState, MobileView } from '../mobile-types';
import { useTranslation } from '@/lib/i18n/translations';

// ===================== Props =====================

interface MirrorHighscoresLiteProps {
  gameState: GameState;
  onNavigate: (v: MobileView) => void;
}

// ===================== Component =====================

export const MirrorHighscoresLite = React.memo<MirrorHighscoresLiteProps>(
  function MirrorHighscoresLite() {
    const { t } = useTranslation();

    return (
      <div className="flex flex-col items-center justify-center gap-4 px-4 py-16">
        <div className="flex flex-col items-center gap-3 rounded-xl bg-white/5 border border-white/10 p-8">
          <span className="text-4xl">🏆</span>
          <h2 className="text-lg font-semibold text-white">
            {t('mobile.mirrorHighscores') || 'Highscores'}
          </h2>
          <p className="text-sm text-white/40">
            {t('mobile.mirrorComingSoon') || 'Highscores will be available here soon.'}
          </p>
        </div>
      </div>
    );
  },
);
