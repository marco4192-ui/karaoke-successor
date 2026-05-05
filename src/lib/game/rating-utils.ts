/**
 * Shared rating definitions and utilities used across score cards, shorts creator,
 * results screen, and game-loop.  Provides both hex values (for Canvas rendering) and
 * Tailwind gradient classes (for HTML/CSS rendering).
 */

export type Rating = 'perfect' | 'excellent' | 'good' | 'okay' | 'poor';

/** Map accuracy percentage to a rating label. Thresholds match PERFECT_ACCURACY
 *  (99.5%) and the tiered boundaries used in scoring and results. */
export function accuracyToRating(accuracy: number): Rating {
  if (accuracy >= 95) return 'perfect';
  if (accuracy >= 85) return 'excellent';
  if (accuracy >= 70) return 'good';
  if (accuracy >= 50) return 'okay';
  return 'poor';
}

/** Hex color per rating level — consumed by Canvas-based components. */
export const RATING_HEX_COLORS: Record<string, string> = {
  perfect: '#ffd700',
  excellent: '#00ff88',
  good: '#00d9ff',
  okay: '#a0a0a0',
  poor: '#ff4444',
};

/** Tailwind gradient class per rating level — consumed by HTML/Tailwind components. */
export const RATING_TAILWIND_CLASSES: Record<string, string> = {
  perfect: 'from-yellow-400 to-orange-500',
  excellent: 'from-green-400 to-cyan-500',
  good: 'from-blue-400 to-purple-500',
  okay: 'from-gray-400 to-gray-500',
  poor: 'from-red-400 to-red-600',
};
