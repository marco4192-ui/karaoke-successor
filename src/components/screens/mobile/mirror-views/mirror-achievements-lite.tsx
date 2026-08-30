'use client';

import React, { useState, useCallback } from 'react';
import type { GameState, MobileView } from '../mobile-types';
import { useTranslation } from '@/lib/i18n/translations';

// ===================== Props =====================

interface MirrorAchievementsLiteProps {
  gameState: GameState;
  onNavigate: (v: MobileView) => void;
  onSendDesktopCommand: (screen: string) => void;
}

// ===================== Filter-Definitionen =====================

type StatusFilter = 'all' | 'unlocked' | 'locked';

type CategoryFilter = 'all' | 'performance' | 'progression' | 'social' | 'special';

const STATUS_FILTERS: { id: StatusFilter; labelKey: string; fallback: string; activeColor: string }[] = [
  { id: 'all',      labelKey: 'achievementsScreen.all',       fallback: 'All',      activeColor: 'bg-cyan-500/25 border-cyan-400/40 text-cyan-400' },
  { id: 'unlocked', labelKey: 'achievements.unlocked',     fallback: 'Unlocked',  activeColor: 'bg-green-500/25 border-green-400/40 text-green-400' },
  { id: 'locked',   labelKey: 'achievementsScreen.locked',   fallback: 'Locked',   activeColor: 'bg-red-500/25 border-red-400/40 text-red-400' },
];

const CATEGORY_FILTERS: { id: CategoryFilter; labelKey: string; fallback: string }[] = [
  { id: 'all',         labelKey: 'achievementsScreen.all',                       fallback: 'All' },
  { id: 'performance', labelKey: 'achievementsScreen.categories.performance',     fallback: 'Performance' },
  { id: 'progression', labelKey: 'achievementsScreen.categories.progression',     fallback: 'Progression' },
  { id: 'social',      labelKey: 'achievementsScreen.categories.social',          fallback: 'Social' },
  { id: 'special',     labelKey: 'achievementsScreen.categories.special',         fallback: 'Special' },
];

// ===================== Hilfsfunktionen =====================

function haptic() {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(10);
  }
}

// ===================== Component =====================

export const MirrorAchievementsLite = React.memo<MirrorAchievementsLiteProps>(
  function MirrorAchievementsLite({ onSendDesktopCommand }) {
    const { t } = useTranslation();
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');

    const handleStatus = useCallback(
      (f: StatusFilter) => {
        haptic();
        setStatusFilter(f);
      },
      [],
    );

    const handleCategory = useCallback(
      (c: CategoryFilter) => {
        haptic();
        setCategoryFilter(c);
      },
      [],
    );

    return (
      <div className="flex flex-col gap-3 px-4 pb-8">
        {/* Header */}
        <div className="flex items-center gap-2 py-2">
          <span className="text-2xl">🏅</span>
          <h2 className="text-lg font-semibold text-white">
            {t('mobile.mirrorAchievements')}
          </h2>
        </div>

        {/* Status Filters: All / Unlocked / Locked */}
        <div className="flex gap-2">
          {STATUS_FILTERS.map((f) => {
            const isActive = statusFilter === f.id;
            const label = t(f.labelKey) === f.labelKey ? f.fallback : t(f.labelKey);
            return (
              <button
                key={f.id}
                onClick={() => handleStatus(f.id)}
                className={
                  'flex-1 rounded-lg px-3 py-2.5 text-sm font-semibold text-center active:scale-95 transition-transform ' +
                  (isActive
                    ? f.activeColor
                    : 'bg-white/5 border border-white/10 text-white/50')
                }
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Category Filters */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {CATEGORY_FILTERS.map((c) => {
            const isActive = categoryFilter === c.id;
            const label = t(c.labelKey) === c.labelKey ? c.fallback : t(c.labelKey);
            return (
              <button
                key={c.id}
                onClick={() => handleCategory(c.id)}
                className={
                  'shrink-0 rounded-lg px-3 py-2 text-xs font-semibold active:scale-95 transition-transform ' +
                  (isActive
                    ? 'bg-purple-500/25 border border-purple-400/30 text-purple-400'
                    : 'bg-white/5 border border-white/10 text-white/40')
                }
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Open on Desktop */}
        <button
          onClick={() => { haptic(); onSendDesktopCommand('achievements'); }}
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
  },
);
MirrorAchievementsLite.displayName = 'MirrorAchievementsLite';
