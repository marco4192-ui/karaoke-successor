'use client';

import type { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from '@/lib/i18n/translations';
import { DAILY_DIFFICULTIES, type DailyDifficulty } from '@/lib/game/daily-challenge';
import { difficultyChipClass, tierChipClass, TIER_ICONS, TIER_LABEL_KEYS } from './daily-helpers';

/** Shared difficulty selector card of the daily and weekly tabs — independent
 *  of the global game difficulty. Switching updates targets, descriptions and
 *  XP of ALL slots instantly. The daily variant shows per-difficulty
 *  completion checkmarks (metDifficulties), the weekly variant uses its own
 *  tier icon set and a footer hint line (weeklyCountsAutomatically). */
export function DifficultySelectorCard({ variant, selected, onSelect, completedCount, metDifficulties, footer }: {
  variant: 'daily' | 'weekly';
  selected: DailyDifficulty;
  onSelect: (difficulty: DailyDifficulty) => void;
  /** Number of slots completed today (daily) / this week (weekly) */
  completedCount: number;
  /** Daily only: difficulties already completed today (checkmarks) */
  metDifficulties?: DailyDifficulty[];
  /** Weekly only: bottom hint line */
  footer?: ReactNode;
}) {
  const { t } = useTranslation();
  const labelKey = variant === 'daily'
    ? 'dailyChallengeScreen.difficultyLabel'
    : 'dailyChallengeScreen.weeklyDifficultyLabel';
  const tierProgressKey = variant === 'daily'
    ? 'dailyChallengeScreen.tierProgressToday'
    : 'dailyChallengeScreen.tierProgressWeek';

  return (
    <Card className="bg-white/5 border-white/10">
      <CardContent className="pt-4 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <label className="text-sm text-white/60">{t(labelKey)}</label>
          {/* Badge tier progress (today / this week) */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/40">{t(tierProgressKey)}</span>
            {(['bronze', 'silver', 'gold'] as const).map((tier) => {
              const thresholds = { bronze: 1, silver: 3, gold: 5 } as const;
              const reached = completedCount >= thresholds[tier];
              return (
                <span key={tier} className={tierChipClass(tier, reached)} title={`${t(TIER_LABEL_KEYS[tier])} — ${thresholds[tier]}`}>
                  <span aria-hidden>{variant === 'daily' ? TIER_ICONS[tier] : tier === 'bronze' ? '🎗️' : tier === 'silver' ? '🏅' : '🏆'}</span>
                  <span>{thresholds[tier]}</span>
                  {reached && <span className="text-green-400 font-bold">✓</span>}
                </span>
              );
            })}
            <Badge variant="outline" className="border-cyan-500 text-cyan-400">
              {completedCount}/5
            </Badge>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap" role="group" aria-label={t(labelKey)}>
          {DAILY_DIFFICULTIES.map((d) => {
            const done = variant === 'daily' && !!metDifficulties?.includes(d.id);
            const active = selected === d.id;
            return (
              <button
                key={d.id}
                onClick={() => onSelect(d.id)}
                aria-pressed={active}
                title={done ? t('dailyChallengeScreen.difficultyDoneHint') : `${t(d.labelKey)} — ×${d.xpMultiplier} XP`}
                className={difficultyChipClass(d.id, active)}
              >
                <span aria-hidden>{d.icon}</span>
                <span>{t(d.labelKey)}</span>
                {done && <span className="text-green-400 font-bold" aria-label={t('dailyChallengeScreen.difficultyDoneHint')}>✓</span>}
              </button>
            );
          })}
        </div>
        {footer}
      </CardContent>
    </Card>
  );
}
