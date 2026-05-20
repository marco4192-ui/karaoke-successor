'use client';

import React from 'react';
import { useTranslation } from '@/lib/i18n/translations';
import type { UserStats } from '@/lib/mobile-achievements';
import {
  ACHIEVEMENTS,
  getUnlockedAchievements,
} from '@/lib/mobile-achievements';

interface MobileAchievementsProps {
  stats: UserStats;
}

export function MobileAchievements({ stats }: MobileAchievementsProps) {
  const { t } = useTranslation();

  const unlockedIds = new Set(getUnlockedAchievements(stats).map((a) => a.id));
  const unlockedCount = unlockedIds.size;
  const totalCount = ACHIEVEMENTS.length;

  return (
    <div className="mt-6">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg">🏆</span>
        <h3 className="font-bold text-sm">{t('mobileAchievements.title')}</h3>
      </div>
      <p className="text-xs text-white/50 mb-4">
        {unlockedCount} / {totalCount} {t('mobileAchievements.unlocked')}
      </p>

      {/* Progress bar for overall completion */}
      <div className="w-full bg-white/10 rounded-full h-1.5 mb-4">
        <div
          className="bg-gradient-to-r from-cyan-500 to-purple-500 h-1.5 rounded-full transition-all duration-500"
          style={{ width: `${(unlockedCount / totalCount) * 100}%` }}
        />
      </div>

      {/* Achievement grid — 3 columns */}
      <div className="grid grid-cols-3 gap-2">
        {ACHIEVEMENTS.map((achievement) => {
          const isUnlocked = unlockedIds.has(achievement.id);
          const progressVal = achievement.progress(stats);

          return (
            <div
              key={achievement.id}
              className={`relative rounded-xl p-3 text-center transition-all ${
                isUnlocked
                  ? 'bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-500/30'
                  : 'bg-white/5 border border-white/10'
              }`}
            >
              {/* Icon */}
              <div
                className={`text-2xl mb-1 ${isUnlocked ? '' : 'grayscale opacity-40'}`}
              >
                {achievement.icon}
              </div>

              {/* Title */}
              <p
                className={`text-[10px] font-semibold leading-tight mb-0.5 ${
                  isUnlocked ? 'text-white' : 'text-white/40'
                }`}
              >
                {achievement.title}
              </p>

              {/* Description */}
              <p className="text-[9px] text-white/30 leading-tight mb-1.5 hidden">
                {achievement.description}
              </p>

              {/* Progress bar (only for partially complete achievements) */}
              {!isUnlocked && progressVal > 0 && (
                <div className="w-full bg-white/10 rounded-full h-0.5 mt-1">
                  <div
                    className="bg-cyan-500/60 h-0.5 rounded-full transition-all"
                    style={{ width: `${Math.max(progressVal * 100, 2)}%` }}
                  />
                </div>
              )}

              {/* Lock overlay for locked achievements */}
              {!isUnlocked && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-30">
                  <span className="text-sm">🔒</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
