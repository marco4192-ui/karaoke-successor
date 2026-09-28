// Daily Challenge — per-player daily stats (streaks, XP, badges)
//
// Part of the daily-challenge module (see ./index.ts).

import { getJson, getItem, setItem, setJson } from '@/lib/storage';
import {
  PLAYER_DAILY_STATS_KEY,
  PLAYER_DAILY_STATS_MIGRATED_KEY,
  playerDailyStatsKey,
} from './storage-keys';
import type { PlayerDailyStats } from './types';

// ---------------------------------------------------------------------------
// Player daily stats
// ---------------------------------------------------------------------------

const DEFAULT_PLAYER_DAILY_STATS: PlayerDailyStats = {
  currentStreak: 0,
  longestStreak: 0,
  totalCompleted: 0,
  totalXP: 0,
  lastCompletedDate: null,
  badges: [],
  weeklyProgress: [0, 0, 0, 0, 0, 0, 0],
  lastWeekStart: null,
  weeklyCompletedTotal: 0,
};

export function getPlayerDailyStats(playerId?: string): PlayerDailyStats {
  const key = playerDailyStatsKey(playerId);
  const existing = getJson<PlayerDailyStats | null>(key, null);
  if (existing) return existing;

  if (playerId) {
    // Legacy migration: the first profile to read after the per-player update
    // inherits the old shared stats (streaks/badges earned before this change).
    // Everyone else starts with a clean slate.
    if (!getItem(PLAYER_DAILY_STATS_MIGRATED_KEY)) {
      const legacy = getJson<PlayerDailyStats | null>(PLAYER_DAILY_STATS_KEY, null);
      setItem(PLAYER_DAILY_STATS_MIGRATED_KEY, '1');
      if (legacy) {
        setJson(key, legacy);
        return legacy;
      }
    }
    return { ...DEFAULT_PLAYER_DAILY_STATS, badges: [] };
  }

  return getJson<PlayerDailyStats>(key, DEFAULT_PLAYER_DAILY_STATS);
}

export function savePlayerDailyStats(stats: PlayerDailyStats, playerId?: string): void {
  setJson(playerDailyStatsKey(playerId), stats);
}
