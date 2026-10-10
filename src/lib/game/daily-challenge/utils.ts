// Daily Challenge — utility functions (completion checks, XP level, reset timer)
//
// Part of the daily-challenge module (see ./index.ts).

import { getItem } from '@/lib/storage';
import { getRankForXP } from '../player-progression';
import { getPlayerBestResult } from './best-results';
import { todayISO } from './date-utils';
import { DAILY_DIFFICULTIES } from './registry';
import { getPlayerDailySlotProgress } from './slots';
import { DAILY_CHALLENGE_KEY } from './storage-keys';
import type { DailyDifficulty } from '../challenge-pools';

// ---------------------------------------------------------------------------
// Utility functions
// ---------------------------------------------------------------------------

/** Check if the daily challenge has been completed today (per player when a playerId is given). */
export function isChallengeCompletedToday(playerId?: string, difficulty?: DailyDifficulty): boolean {
  if (playerId) {
    // Slot-aware: any daily slot completed today (at the given difficulty when provided)
    const progress = getPlayerDailySlotProgress(playerId);
    if (progress.completedSlots.length > 0) {
      if (!difficulty) return true;
      return Object.values(progress.metBySlot).some(m => m.includes(difficulty));
    }
    // Legacy fallback: today's best result
    const best = getPlayerBestResult(playerId);
    if (best) {
      if (difficulty) return best.metDifficulties?.includes(difficulty) ?? false;
      return (best.metDifficulties?.length ?? 0) > 0 || best.targetMet;
    }
  }
  // Legacy shared flag (also the fallback for pre-per-player data)
  const stored = getItem(DAILY_CHALLENGE_KEY);
  if (stored) {
    try {
      const data = JSON.parse(stored);
      return data.date === todayISO() && data.completed;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.debug('[daily-challenge]: failed to parse challenge completion data', error);
      return false;
    }
  }
  return false;
}

/** All difficulty levels the player has met today across ALL slots (for the ✓ chips in the UI). */
export function getCompletedDifficultiesToday(playerId?: string): DailyDifficulty[] {
  if (!playerId) return [];
  const progress = getPlayerDailySlotProgress(playerId);
  const fromSlots = Object.values(progress.metBySlot).flat();
  if (fromSlots.length > 0) {
    return Array.from(new Set(fromSlots)).filter(d => DAILY_DIFFICULTIES.some(x => x.id === d));
  }
  // Legacy fallback: today's best result
  const best = getPlayerBestResult(playerId);
  if (!best || !best.metDifficulties) {
    // Legacy entries: a stored targetMet counts as 'normal' met
    return best?.targetMet ? ['normal'] : [];
  }
  return best.metDifficulties.filter(d => DAILY_DIFFICULTIES.some(x => x.id === d));
}

/** All difficulty levels met for a SPECIFIC daily slot today (empty when not met). */
export function getSlotMetDifficulties(playerId: string | undefined, slot: number): DailyDifficulty[] {
  if (!playerId) return [];
  const progress = getPlayerDailySlotProgress(playerId);
  return (progress.metBySlot[String(slot)] ?? []).filter(d => DAILY_DIFFICULTIES.some(x => x.id === d));
}

/**
 * Get XP level info — delegates to the unified rank system from player-progression.ts.
 * This ensures the daily challenge display shows the same rank/title as the
 * player's profile progression screen.
 */
export function getXPLevel(xp: number): { level: number; title: string; progress: number; nextLevel: number } {
  const rank = getRankForXP(xp);
  const rankXP = rank.maxXP - rank.minXP;
  const progress = rankXP === Infinity
    ? 100
    : Math.min(100, Math.max(0, ((xp - rank.minXP) / rankXP) * 100));

  return {
    level: xp,            // Raw XP — kept for backward compatibility (not displayed in UI)
    title: rank.name,
    progress,
    nextLevel: rank.maxXP === Infinity ? xp : rank.maxXP,
  };
}

/** Get formatted time until the daily challenge resets (midnight). */
export function getTimeUntilReset(): { hours: number; minutes: number; seconds: number } {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  const diff = Math.max(0, tomorrow.getTime() - now.getTime());

  return {
    hours: Math.floor(diff / (1000 * 60 * 60)),
    minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((diff % (1000 * 60)) / 1000),
  };
}
