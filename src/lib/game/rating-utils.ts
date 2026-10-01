/**
 * Shared rating definitions and utilities used across score cards, shorts creator,
 * results screen, and game-loop.  Provides both hex values (for Canvas rendering) and
 * Tailwind gradient classes (for HTML/CSS rendering).
 */

import { PERFECT_ACCURACY, EXCELLENT_ACCURACY } from './progression-levels';

/**
 * R42: Rating scale widened from 5 to 8 levels.  Motivation (user feedback):
 * with ~33% of the points a singer used to receive "poor" — demotivating.
 * The new scale differentiates the low/mid range much more finely so that
 * even a rough performance gets an encouraging label:
 *
 *   perfect    ≥ 99.5%   (PERFECT_ACCURACY)
 *   excellent  ≥ 95%     (EXCELLENT_ACCURACY)
 *   great      ≥ 88%
 *   good       ≥ 78%
 *   okay       ≥ 65%
 *   fair       ≥ 50%
 *   rough      ≥ 32%   ← ~33% of points now lands HERE, not "poor"
 *   poor       <  32%
 */
export type Rating = 'perfect' | 'excellent' | 'great' | 'good' | 'okay' | 'fair' | 'rough' | 'poor';

/** All rating levels ordered from best to worst — for scale legends/UI. */
export const RATING_LEVELS: readonly Rating[] = [
  'perfect', 'excellent', 'great', 'good', 'okay', 'fair', 'rough', 'poor',
];

/** Map accuracy percentage to a rating label. Thresholds align with PERFECT_ACCURACY
 *  (99.5%) and EXCELLENT_ACCURACY (95%) in progression-levels.ts for consistent
 *  display across results screen, score cards, and XP bonus tiers. */
export function accuracyToRating(accuracy: number): Rating {
  if (accuracy >= PERFECT_ACCURACY) return 'perfect';
  if (accuracy >= EXCELLENT_ACCURACY) return 'excellent';
  if (accuracy >= 88) return 'great';
  if (accuracy >= 78) return 'good';
  if (accuracy >= 65) return 'okay';
  if (accuracy >= 50) return 'fair';
  if (accuracy >= 32) return 'rough';
  return 'poor';
}

/** Hex color per rating level — consumed by Canvas-based components. */
export const RATING_HEX_COLORS: Record<string, string> = {
  perfect: '#ffd700',
  excellent: '#00ff88',
  great: '#34d399',
  good: '#00d9ff',
  okay: '#a3a3a3',
  fair: '#fbbf24',
  rough: '#fb923c',
  poor: '#ff4444',
};

/** Tailwind gradient class per rating level — consumed by HTML/Tailwind components. */
export const RATING_TAILWIND_CLASSES: Record<string, string> = {
  perfect: 'from-yellow-400 to-orange-500',
  excellent: 'from-green-400 to-cyan-500',
  great: 'from-emerald-400 to-green-500',
  good: 'from-cyan-400 to-sky-500',
  okay: 'from-gray-400 to-gray-500',
  fair: 'from-amber-400 to-yellow-500',
  rough: 'from-orange-400 to-amber-600',
  poor: 'from-red-400 to-red-600',
};

/**
 * Translated label for a rating. Falls back to the raw rating key when the
 * translation is missing (t returns the key itself) — callers can pass their
 * own t(); the canonical key is `scoreVisualization.<rating>`.
 */
export function ratingLabelKey(rating: string): string {
  return `scoreVisualization.${rating}`;
}
