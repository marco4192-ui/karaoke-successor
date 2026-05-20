/**
 * Rate my Song — Achievements
 *
 * Achievement definitions and checking logic.
 * Uses `import type` for `RateMySongPlayerStats` to avoid circular runtime dependency.
 */

import type { RateMySongPlayerStats } from './rate-my-song-stats';

// ── Types ──

export interface Achievement {
  id: string;
  icon: string;
  nameEn: string;
  nameDe: string;
  descriptionEn: string;
  descriptionDe: string;
  condition: (stats: RateMySongPlayerStats) => boolean;
}

// ── Definitions ──

export const RATE_MY_SONG_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_performance',
    icon: '🎤',
    nameEn: 'First Performance',
    nameDe: 'Erster Auftritt',
    descriptionEn: 'Complete 1 performance',
    descriptionDe: 'Schließe 1 Auftritt ab',
    condition: (s) => s.totalPerformances >= 1,
  },
  {
    id: 'golden_voice',
    icon: '🌟',
    nameEn: 'Golden Voice',
    nameDe: 'Goldene Stimme',
    descriptionEn: 'Get a rating >= 9.0',
    descriptionDe: 'Erhalte eine Bewertung >= 9.0',
    condition: (s) => s.bestRating >= 9.0,
  },
  {
    id: 'crowd_favorite',
    icon: '❤️',
    nameEn: 'Crowd Favorite',
    nameDe: 'Publikumsliebling',
    descriptionEn: 'Get rated by 10+ different audience members total',
    descriptionDe: 'Werde von insgesamt 10+ verschiedenen Publikumsmitgliedern bewertet',
    condition: (s) => s.totalAudienceRatings >= 10,
  },
  {
    id: 'versatile',
    icon: '🎭',
    nameEn: 'All-Rounder',
    nameDe: 'Allrounder',
    descriptionEn: 'Perform in 5+ different genres',
    descriptionDe: 'Trage in 5+ verschiedenen Genres auf',
    condition: (s) => Object.keys(s.genresPerformed).length >= 5,
  },
  {
    id: 'perfectionist',
    icon: '💎',
    nameEn: 'Perfectionist',
    nameDe: 'Perfektionist',
    descriptionEn: 'Get a rating >= 9.5',
    descriptionDe: 'Erhalte eine Bewertung >= 9.5',
    condition: (s) => s.bestRating >= 9.5,
  },
  {
    id: 'stage_animal',
    icon: '🔥',
    nameEn: 'Stage Animal',
    nameDe: 'Bühnentier',
    descriptionEn: '20+ performances',
    descriptionDe: '20+ Auftritte',
    condition: (s) => s.totalPerformances >= 20,
  },
  {
    id: 'centurion',
    icon: '💯',
    nameEn: 'Centurion',
    nameDe: 'Hundertfüßler',
    descriptionEn: '100+ total audience ratings received',
    descriptionDe: 'Erhalte 100+ Publikumsbewertungen insgesamt',
    condition: (s) => s.totalAudienceRatings >= 100,
  },
  {
    id: 'comeback_kid',
    icon: '🔄',
    nameEn: 'Comeback Kid',
    nameDe: 'Comeback Kid',
    descriptionEn: 'Rating improves by 3+ points from worst to best',
    descriptionDe: 'Bewertung verbessert sich um 3+ Punkte vom Schlechtesten zum Besten',
    condition: (s) => (s.bestRating - s.worstRating) >= 3 && s.totalPerformances >= 2,
  },
];

// ── Helpers ──

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
