/**
 * Rate my Song — Achievements
 *
 * Achievement definitions and checking logic.
 * Uses `import type` for `RateMySongPlayerStats` to avoid circular runtime dependency.
 */

import type { Language } from '@/lib/i18n/locales';
import { t } from '@/lib/i18n/translations';
import type { RateMySongPlayerStats } from './rate-my-song-stats';

// ── Types ──

export interface Achievement {
  id: string;
  icon: string;
  name: string;
  nameKey: string;
  description: string;
  descriptionKey: string;
  condition: (stats: RateMySongPlayerStats) => boolean;
}

// ── Definitions ──

export const RATE_MY_SONG_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_performance',
    icon: '🎤',
    name: 'First Performance',
    nameKey: 'rateMySong.achievements.firstPerformance.name',
    description: 'Complete 1 performance',
    descriptionKey: 'rateMySong.achievements.firstPerformance.description',
    condition: (s) => s.totalPerformances >= 1,
  },
  {
    id: 'golden_voice',
    icon: '🌟',
    name: 'Golden Voice',
    nameKey: 'rateMySong.achievements.goldenVoice.name',
    description: 'Get a rating >= 9.0',
    descriptionKey: 'rateMySong.achievements.goldenVoice.description',
    condition: (s) => s.bestRating >= 9.0,
  },
  {
    id: 'crowd_favorite',
    icon: '❤️',
    name: 'Crowd Favorite',
    nameKey: 'rateMySong.achievements.crowdFavorite.name',
    description: 'Get rated by 10+ different audience members total',
    descriptionKey: 'rateMySong.achievements.crowdFavorite.description',
    condition: (s) => s.totalAudienceRatings >= 10,
  },
  {
    id: 'versatile',
    icon: '🎭',
    name: 'All-Rounder',
    nameKey: 'rateMySong.achievements.allRounder.name',
    description: 'Perform in 5+ different genres',
    descriptionKey: 'rateMySong.achievements.allRounder.description',
    condition: (s) => Object.keys(s.genresPerformed).length >= 5,
  },
  {
    id: 'perfectionist',
    icon: '💎',
    name: 'Perfectionist',
    nameKey: 'rateMySong.achievements.perfectionist.name',
    description: 'Get a rating >= 9.5',
    descriptionKey: 'rateMySong.achievements.perfectionist.description',
    condition: (s) => s.bestRating >= 9.5,
  },
  {
    id: 'stage_animal',
    icon: '🔥',
    name: 'Stage Animal',
    nameKey: 'rateMySong.achievements.stageAnimal.name',
    description: '20+ performances',
    descriptionKey: 'rateMySong.achievements.stageAnimal.description',
    condition: (s) => s.totalPerformances >= 20,
  },
  {
    id: 'centurion',
    icon: '💯',
    name: 'Centurion',
    nameKey: 'rateMySong.achievements.centurion.name',
    description: '100+ total audience ratings received',
    descriptionKey: 'rateMySong.achievements.centurion.description',
    condition: (s) => s.totalAudienceRatings >= 100,
  },
  {
    id: 'comeback_kid',
    icon: '🔄',
    name: 'Comeback Kid',
    nameKey: 'rateMySong.achievements.comebackKid.name',
    description: 'Rating improves by 3+ points from worst to best',
    descriptionKey: 'rateMySong.achievements.comebackKid.description',
    condition: (s) => (s.bestRating - s.worstRating) >= 3 && s.totalPerformances >= 2,
  },
];

// ── Helpers ──

/** Get a localized copy of a Rate My Song achievement. */
export function getLocalizedRateMySongAchievement(
  ach: Achievement,
  language?: Language,
): { name: string; description: string } {
  return {
    name: t(ach.nameKey, language),
    description: t(ach.descriptionKey, language),
  };
}

/** Check which achievements a player has earned. Returns IDs of newly earned achievements. */
export function checkRateMySongAchievements(stats: RateMySongPlayerStats): string[] {
  const newAchs: string[] = [];
  for (const ach of RATE_MY_SONG_ACHIEVEMENTS) {
    if (ach.condition(stats) && !stats.achievements.includes(ach.id)) {
      newAchs.push(ach.id);
    }
  }
  return newAchs;
}

/** Get achievement definition by ID */
export function getAchievementById(id: string): Achievement | undefined {
  return RATE_MY_SONG_ACHIEVEMENTS.find(a => a.id === id);
}