'use client';

import React, { useCallback } from 'react';
import type { GameState, MobileView } from '../mobile-types';
import { useTranslation } from '@/lib/i18n/translations';

// ===================== Props =====================

interface HostProfile {
  id: string;
  name: string;
  avatar?: string;
  color: string;
  connectionCode: string;
  isActive?: boolean;
}

interface MirrorProfileLiteProps {
  gameState: GameState;
  onNavigate: (v: MobileView) => void;
  /** Host-Profile mit isActive-Status */
  availableProfiles: HostProfile[];
  /** Sendet einen Command an den Desktop */
  onSendDesktopCommand: (command: string) => void;
}

// ===================== Hilfsfunktionen =====================

function haptic() {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(10);
  }
}

// ===================== Component =====================

export const MirrorProfileLite = React.memo<MirrorProfileLiteProps>(
  function MirrorProfileLite({ availableProfiles, onSendDesktopCommand }) {
    const { t } = useTranslation();

    const handleToggle = useCallback(
      (profileId: string, currentActive: boolean) => {
        haptic();
        // Sende toggle-Command an den Desktop
        onSendDesktopCommand(`profile_toggle:${profileId}:${currentActive ? '0' : '1'}`);
      },
      [onSendDesktopCommand],
    );

    if (availableProfiles.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center gap-4 px-4 py-16">
          <div className="flex flex-col items-center gap-3 rounded-xl bg-white/5 border border-white/10 p-8">
            <span className="text-4xl">{'👤'}</span>
            <h2 className="text-lg font-semibold text-white">
              {t('characterScreen.title') || 'Profile'}
            </h2>
            <p className="text-sm text-white/40">
              Keine Profile auf dem Desktop vorhanden
            </p>
          </div>
        </div>
      );
    }

    const activeCount = availableProfiles.filter(p => p.isActive !== false).length;

    return (
      <div className="flex flex-col gap-4 px-4 pb-8">
        {/* Header */}
        <div className="flex flex-col items-center gap-2 py-4">
          <span className="text-3xl">{'👤'}</span>
          <h2 className="text-lg font-semibold text-white">
            {t('characterScreen.title') || 'Profile'}
          </h2>
          <p className="text-xs text-white/40 text-center">
            {activeCount} von {availableProfiles.length} aktiv
          </p>
        </div>

        {/* Profile-Liste */}
        <div className="flex flex-col gap-2">
          {availableProfiles.map((profile) => {
            const isActive = profile.isActive !== false;
            return (
              <div
                key={profile.id}
                className={
                  'flex items-center gap-3 rounded-xl p-3 border transition-colors ' +
                  (isActive
                    ? 'bg-white/10 border-white/20'
                    : 'bg-white/[0.03] border-white/[0.06]')
                }
              >
                {/* Avatar */}
                <div
                  className={
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ' +
                    (isActive ? '' : 'opacity-40')
                  }
                  style={{ backgroundColor: profile.color }}
                >
                  {profile.avatar
                    ? <img src={profile.avatar} alt={profile.name} className="h-full w-full rounded-full object-cover" />
                    : profile.name[0]
                  }
                </div>

                {/* Name & Status */}
                <div className="min-w-0 flex-1">
                  <p className={
                    'truncate text-sm font-medium ' +
                    (isActive ? 'text-white' : 'text-white/40')
                  }>
                    {profile.name}
                  </p>
                  <p className={
                    'text-[11px] ' +
                    (isActive ? 'text-green-400/70' : 'text-white/20')
                  }>
                    {isActive ? 'Aktiv' : 'Inaktiv'}
                  </p>
                </div>

                {/* Toggle Switch */}
                <button
                  onClick={() => handleToggle(profile.id, isActive)}
                  className={
                    'relative w-12 h-7 rounded-full transition-colors shrink-0 ' +
                    (isActive ? 'bg-cyan-500' : 'bg-white/20')
                  }
                  role="switch"
                  aria-checked={isActive}
                >
                  <span
                    className={
                      'absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-all ' +
                      (isActive ? 'left-6' : 'left-1')
                    }
                  />
                </button>
              </div>
            );
          })}
        </div>

        {/* Hinweis */}
        <p className="text-center text-[11px] text-white/25 px-4">
          Aenderungen werden sofort auf dem Desktop uebernommen
        </p>
      </div>
    );
  },
);
