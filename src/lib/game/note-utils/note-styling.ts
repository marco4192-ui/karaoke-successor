/**
 * Low-performance lane styling helpers (background gradient + active glow).
 *
 * R13: moved byte-identically from src/lib/game/note-utils.tsx.
 */
import { getNoteColorProfile } from '@/lib/game/note-color-profiles';

/**
 * Calculate note background classes based on note type and color profile
 */
export function getNoteBackgroundClasses(isGolden: boolean, isBonus: boolean, isRap: boolean = false): string {
  if (isGolden) {
    return 'bg-gradient-to-r from-yellow-400 to-orange-500';
  }
  if (isRap) {
    return 'bg-gradient-to-r from-emerald-400 to-green-500';
  }
  if (isBonus) {
    return 'bg-gradient-to-r from-pink-500 to-purple-500';
  }
  // R20-3: Note-Colors setting removed — the low-perf lane uses the fixed
  // default ('neon') look.
  return getNoteColorProfile(null).lowPerfGradient;
}

/**
 * Calculate note box shadow based on active state and type
 */
export function getNoteBoxShadow(isActive: boolean, isGolden: boolean): string {
  if (!isActive) return 'none';
  if (isGolden) {
    return '0 0 30px rgba(251, 191, 36, 0.7)';
  }
  // R20-3: Note-Colors setting removed — fixed default look.
  return getNoteColorProfile(null).lowPerfActiveGlow;
}
