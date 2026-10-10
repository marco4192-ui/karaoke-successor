// Daily Challenge — localization helpers
//
// Part of the daily-challenge module (see ./index.ts).

import type { Language } from '@/lib/i18n/locales';
import { t } from '@/lib/i18n/translations';
import { XP_REWARDS } from './registry';
import type { DailyBadge, QuestDefinition } from './types';

// ===================== LOCALIZATION HELPERS =====================

/** Get a localized daily badge. */
export function getLocalizedDailyBadge(badge: Omit<DailyBadge, 'unlockedAt'>, language?: Language): { name: string; description: string } {
  return {
    name: t(badge.nameKey, language),
    description: t(badge.descriptionKey, language),
  };
}

/** Get a localized daily quest. */
export function getLocalizedDailyQuest(quest: QuestDefinition, language?: Language): { name: string; description: string } {
  return {
    name: t(quest.nameKey, language),
    description: t(quest.descriptionKey, language),
  };
}

/** Get a localized streak milestone badge name. */
export function getLocalizedStreakMilestone(streakDays: number, language?: Language): string {
  const milestone = (XP_REWARDS.STREAK_MILESTONES as Record<number, { xp: number; badge: string; badgeKey?: string }>)[streakDays];
  if (!milestone) return '';
  return milestone.badgeKey ? t(milestone.badgeKey, language) : milestone.badge;
}
