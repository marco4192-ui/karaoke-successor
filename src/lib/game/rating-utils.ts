/**
 * Shared rating definitions and utilities used across score cards, shorts creator,
 * results screen, and game-loop.  Provides both hex values (for Canvas rendering) and
 * Tailwind gradient classes (for HTML/CSS rendering).
 */

import { PERFECT_ACCURACY, EXCELLENT_ACCURACY } from './progression-levels';

export type Rating = 'perfect' | 'excellent' | 'good' | 'okay' | 'poor';

/** Map accuracy percentage to a rating label. Thresholds align with PERFECT_ACCURACY
 *  (99.5%) and EXCELLENT_ACCURACY (95%) in progression-levels.ts for consistent
 *  display across results screen, score cards, and XP bonus tiers. */
export function accuracyToRating(accuracy: number): Rating {
  if (accuracy >= PERFECT_ACCURACY) return 'perfect';
  if (accuracy >= EXCELLENT_ACCURACY) return 'excellent';
  if (accuracy >= 85) return 'good';
  if (accuracy >= 70) return 'okay';
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

/** Tailwind gradient class per rating level — consumed by HTML/Tailwind components.
 *  Uses Karaoke Eleven synthwave neon palette:
 *  Gold #ffd60a, Cyan #00e5ff, Purple #bf5af2, Pink #ff2d95 */
export const RATING_TAILWIND_CLASSES: Record<string, string> = {
  perfect: 'from-[#ffd60a] to-[#ff9500]',
  excellent: 'from-[#00e5ff] to-[#39ff14]',
  good: 'from-[#bf5af2] to-[#00e5ff]',
  okay: 'from-[#8e8e93] to-[#636366]',
  poor: 'from-[#ff2d95] to-[#ff453a]',
};
