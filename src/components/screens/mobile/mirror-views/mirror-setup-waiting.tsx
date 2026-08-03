'use client';

import React from 'react';
import type { GameState, MobileView } from '../mobile-types';
import { useTranslation } from '@/lib/i18n/translations';

// ===================== Props =====================

interface MirrorSetupWaitingProps {
  gameState: GameState;
  clientId: string | null;
  profileName: string;
  onNavigate: (v: MobileView) => void;
}

// ===================== Component =====================

export const MirrorSetupWaiting = React.memo<MirrorSetupWaitingProps>(
  function MirrorSetupWaiting({ profileName }) {
    const { t } = useTranslation();

    return (
      <div className="flex flex-col items-center justify-center gap-6 px-4 py-16">
        <div className="flex flex-col items-center gap-4 rounded-xl bg-white/5 border border-white/10 p-10">
          {/* Spinner */}
          <div className="relative h-10 w-10">
            <div className="absolute inset-0 rounded-full border-2 border-white/10" />
            <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-cyan-400" />
          </div>

          {/* Message */}
          <div className="flex flex-col items-center gap-2">
            <h2 className="text-lg font-semibold text-white">
              {t('mobile.mirrorSetupWaiting') || 'Setting Up...'}
            </h2>
            <p className="max-w-[250px] text-center text-sm text-white/40">
              {t('mobile.mirrorSetupWaitingDesc') ||
                'The desktop is configuring the next game. Please wait.'}
            </p>
          </div>

          {/* Profile indicator */}
          {profileName && (
            <div className="mt-2 flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5">
              <span className="h-2 w-2 rounded-full bg-green-400" />
              <span className="text-xs text-white/60">{profileName}</span>
            </div>
          )}
        </div>
      </div>
    );
  },
);
