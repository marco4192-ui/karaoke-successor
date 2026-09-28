// Daily Challenge — localStorage keys & key builders
//
// Part of the daily-challenge module (see ./index.ts). Shared by the slot,
// stats, best-result, weekly and quest modules.

import { StorageKeys } from '@/lib/storage';
import { getISOWeek } from './date-utils';

// ---------------------------------------------------------------------------
// Storage keys
// ---------------------------------------------------------------------------

export const DAILY_CHALLENGE_KEY = StorageKeys.DAILY_CHALLENGE;
export const DAILY_LEADERBOARD_KEY = StorageKeys.DAILY_LEADERBOARD_PREFIX;
export const PLAYER_DAILY_STATS_KEY = StorageKeys.PLAYER_DAILY_STATS;
/** Flag: legacy shared daily stats have been migrated to a profile. */
export const PLAYER_DAILY_STATS_MIGRATED_KEY = 'karaoke_player_daily_stats_migrated';

/** (#1) localStorage key for per-player best results. */
export const PLAYER_BEST_RESULTS_KEY = 'karaoke_daily_best_results';

/** (#4) localStorage key prefix for weekly challenge data. */
export const WEEKLY_CHALLENGE_KEY_PREFIX = 'karaoke_weekly_challenge_';

/** localStorage key prefix for per-player daily slot progress. */
export const DAILY_SLOT_PROGRESS_KEY = 'karaoke_daily_slot_progress_';

/** localStorage key prefix for per-player weekly slot progress. */
export const WEEKLY_SLOT_PROGRESS_KEY = 'karaoke_weekly_slot_progress_';

/** (#5) localStorage key for quest progress map. */
export const QUEST_PROGRESS_KEY = 'karaoke_quest_progress';

/** (#5) localStorage key for cumulative player quest stats. */
export const QUEST_STATS_KEY = 'karaoke_quest_stats';

// ---------------------------------------------------------------------------
// Key builders (per-profile keys)
// ---------------------------------------------------------------------------

/** Storage key for a player's daily stats (per-profile since the profile renovation). */
export function playerDailyStatsKey(playerId?: string): string {
  return playerId ? `${PLAYER_DAILY_STATS_KEY}_${playerId}` : PLAYER_DAILY_STATS_KEY;
}

/** Storage key for a player's quest stats/progress (per-profile). */
export function questStatsKey(playerId?: string): string {
  return playerId ? `${QUEST_STATS_KEY}_${playerId}` : QUEST_STATS_KEY;
}

export function questProgressKey(playerId?: string): string {
  return playerId ? `${QUEST_PROGRESS_KEY}_${playerId}` : QUEST_PROGRESS_KEY;
}

/** Storage key for the current week's weekly challenge data. */
export function weeklyStorageKey(weekNumber: number, year: number): string {
  return `${WEEKLY_CHALLENGE_KEY_PREFIX}${weekNumber}_${year}`;
}

/** The current ISO week key used for per-player weekly progress. */
export function currentWeekKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-W${getISOWeek(now)}`;
}
