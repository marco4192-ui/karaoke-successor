'use client';

import React, { useCallback } from 'react';
import type { GameState, MobileView } from '../mobile-types';
import { useTranslation } from '@/lib/i18n/translations';

// ===================== Props =====================

interface MirrorSetupWaitingProps {
  gameState: GameState;
  clientId: string | null;
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

export function MirrorSetupWaiting({ profileName, onSendDesktopCommand }: MirrorSetupWaitingProps) {
    const { t } = useTranslation();

    const handleStart = useCallback(() => {
      haptic();
      onSendDesktopCommand('party_start');
    }, [onSendDesktopCommand]);

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
              {t('mobile.mirrorSetupWaiting')}
            </h2>
            <p className="max-w-[250px] text-center text-sm text-white/40">
              {t('mobile.mirrorSetupWaitingDesc')}
            </p>
          </div>

          {/* Profile indicator */}
          {profileName ? (
            <div className="mt-2 flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5">
              <span className="h-2 w-2 rounded-full bg-green-400" />
              <span className="text-xs text-white/60">{profileName}</span>
            </div>
          ) : null}

          {/* Start-Button fuer Party-Mode */}
          <button
            type="button"
            onClick={handleStart}
            className="mt-4 w-full rounded-xl px-6 py-3.5 text-sm font-bold bg-gradient-to-r from-cyan-500 to-blue-500 text-white active:scale-95 transition-all shadow-lg"
          >
            {'\u25B6'} {t('unifiedSetup.startGame') || 'Spiel starten'}
          </button>
        </div>
      </div>
    );
}MirrorSetupWaiting.displayName = 'MirrorSetupWaiting';
