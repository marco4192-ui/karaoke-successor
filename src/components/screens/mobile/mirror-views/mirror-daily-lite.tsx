'use client';

import React, { useState, useCallback } from 'react';
import type { GameState, MobileView } from '../mobile-types';
import { useTranslation } from '@/lib/i18n/translations';

// ===================== Props =====================

interface MirrorDailyLiteProps {
  gameState: GameState;
  onNavigate: (v: MobileView) => void;
  onSendDesktopCommand: (screen: string) => void;
}

// ===================== Tabs =====================

type DailyTab = 'challenge' | 'weekly' | 'modes' | 'leaderboard' | 'badges';

const DAILY_TABS: { id: DailyTab; icon: string; labelKey: string; fallback: string }[] = [
  { id: 'challenge',   icon: '🎯', labelKey: 'dailyChallengeScreen.challenges',       fallback: 'Challenge' },
  { id: 'weekly',     icon: '📅', labelKey: 'dailyChallengeScreen.weeklyChallenge',   fallback: 'Weekly' },
  { id: 'modes',      icon: '🎮', labelKey: 'dailyChallengeScreen.challengeModes',    fallback: 'Modes' },
  { id: 'leaderboard',icon: '📊', labelKey: 'dailyChallengeScreen.leaderboard',       fallback: 'Ranks' },
  { id: 'badges',     icon: '🏅', labelKey: 'dailyChallengeScreen.badges',            fallback: 'Badges' },
];

// ===================== Hilfsfunktionen =====================

function haptic() {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(10);
  }
}

// ===================== Component =====================

export function MirrorDailyLite({ onSendDesktopCommand }: MirrorDailyLiteProps) {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<DailyTab>('challenge');
    const [gameMode, setGameMode] = useState<'single' | 'duel' | 'coop'>('single');

    const handleTab = useCallback(
      (tab: DailyTab) => {
        haptic();
        setActiveTab(tab);
        onSendDesktopCommand('dailyChallenge');
      },
      [onSendDesktopCommand],
    );

    const handleGameMode = useCallback(
      (mode: 'single' | 'duel' | 'coop') => {
        haptic();
        setGameMode(mode);
      },
      [],
    );

    return (
      <div className="flex flex-col gap-3 px-4 pb-8">
        {/* Header */}
        <div className="flex items-center gap-2 py-2">
          <span className="text-2xl">📅</span>
          <h2 className="text-lg font-semibold text-white">
            {t('mobile.mirrorDailyChallenge')}
          </h2>
        </div>

        {/* Tab Bar */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {DAILY_TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            const label = t(tab.labelKey) === tab.labelKey ? tab.fallback : t(tab.labelKey);
            return (
              <button
                key={tab.id}
                onClick={() => handleTab(tab.id)}
                className={
                  'shrink-0 flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold active:scale-95 transition-transform ' +
                  (isActive
                    ? 'bg-gradient-to-r from-cyan-500/25 to-purple-500/25 border border-cyan-400/30 text-cyan-400'
                    : 'bg-white/5 border border-white/10 text-white/50')
                }
              >
                <span className="text-sm leading-none">{tab.icon}</span>
                {label}
              </button>
            );
          })}
        </div>

        {/* Game Mode Selector (nur im Challenge-Tab) */}
        {activeTab === 'challenge' && (
          <div className="flex gap-2">
            {(['single', 'duel', 'coop'] as const).map((mode) => {
              const isActive = gameMode === mode;
              const labels: Record<string, string> = {
                single: t('dailyChallengeScreen.single') || 'Single',
                duel: t('dailyChallengeScreen.duel') || 'Duel',
                coop: t('dailyChallengeScreen.coop') || 'Co-op',
              };
              return (
                <button
                  key={mode}
                  onClick={() => handleGameMode(mode)}
                  className={
                    'flex-1 rounded-lg px-3 py-2 text-sm font-medium text-center active:scale-95 transition-transform ' +
                    (isActive
                      ? 'bg-purple-500/25 border border-purple-400/30 text-purple-400'
                      : 'bg-white/5 border border-white/10 text-white/40')
                  }
                >
                  {labels[mode]}
                </button>
              );
            })}
          </div>
        )}

        {/* Open on Desktop */}
        <button
          onClick={() => { haptic(); onSendDesktopCommand('dailyChallenge'); }}
          className={
            'w-full rounded-lg p-3 text-center text-sm font-semibold ' +
            'bg-cyan-500/15 border border-cyan-400/30 text-cyan-400 ' +
            'active:scale-[0.97] transition-transform'
          }
        >
          {t('mobile.mirrorOpenOnDesktop')}
        </button>
      </div>
    );
}MirrorDailyLite.displayName = 'MirrorDailyLite';
