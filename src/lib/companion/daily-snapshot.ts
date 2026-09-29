import {
  getDailySlots,
  getWeeklySlots,
  getPlayerDailySlotProgress,
  getPlayerWeeklySlotProgress,
  getPlayerDailyStats,
  getDailyTargetFor,
  getWeeklyType,
  DAILY_TYPES,
  XP_REWARDS,
  WEEKLY_XP_REWARD,
} from '@/lib/game/daily-challenge';
import type { PlayerProfile } from '@/types/game';

/**
 * R33/P12: Builds the Daily-Challenge snapshot map (profileId → snapshot) the
 * desktop pushes via POST type:'dailystate'. The companion Daily mirror shows
 * the logged-in player's own slots/weekly/streak/badges with this data —
 * structurally identical to the desktop Daily screen (5 tabs).
 *
 * Browser-only (reads localStorage through the daily-challenge lib) — called
 * from karaoke-app effects, never during SSR.
 */

export interface DailySlotSnapshot {
  slot: number;
  type: string;
  icon: string;
  target: number;
  xp: number;
  completed: boolean;
  difficultiesMet: string[];
}

export interface DailyProfileSnapshot {
  date: string;
  slots: DailySlotSnapshot[];
  weekly: {
    weekKey: string;
    slots: DailySlotSnapshot[];
  };
  streak: number;
  totalCompleted: number;
  badges: Array<{ id: string; icon: string; nameKey: string; descriptionKey?: string; unlockedAt: number }>;
}

/** Slot icon lookup — uses the real type definition icons. */
function iconForType(type: string, weekly = false): string {
  try {
    if (weekly) return getWeeklyType(type).icon;
    return DAILY_TYPES[type]?.icon ?? '🎯';
  } catch {
    return '🎯';
  }
}

export function buildDailySnapshotForProfile(profile: PlayerProfile): DailyProfileSnapshot {
  const dailySlots = getDailySlots();
  const dailyProgress = getPlayerDailySlotProgress(profile.id);
  const weeklySlots = getWeeklySlots();
  const weeklyProgress = getPlayerWeeklySlotProgress(profile.id);
  const stats = getPlayerDailyStats(profile.id);

  const slots: DailySlotSnapshot[] = dailySlots.slice(0, 3).map(({ slot, type }) => {
    const met = dailyProgress.metBySlot?.[String(slot)] ?? [];
    return {
      slot,
      type,
      icon: iconForType(type),
      target: getDailyTargetFor(type, 'normal', profile.level),
      xp: XP_REWARDS.CHALLENGE_COMPLETE,
      completed: dailyProgress.completedSlots?.includes(slot) ?? false,
      difficultiesMet: [...met],
    };
  });

  const weeklySnapshot: DailyProfileSnapshot['weekly'] = {
    weekKey: weeklyProgress.weekKey ?? '',
    slots: weeklySlots.map(({ slot, type }) => {
      const met = weeklyProgress.metBySlot?.[String(slot)] ?? [];
      let target = 0;
      try {
        target = getWeeklyType(type).targets.normal ?? 0;
      } catch { /* unknown type */ }
      return {
        slot,
        type,
        icon: iconForType(type, true),
        target,
        xp: WEEKLY_XP_REWARD,
        completed: weeklyProgress.completedSlots?.includes(slot) ?? false,
        difficultiesMet: [...met],
      };
    }),
  };

  return {
    date: dailyProgress.date ?? new Date().toISOString().slice(0, 10),
    slots,
    weekly: weeklySnapshot,
    streak: stats.currentStreak ?? 0,
    totalCompleted: stats.totalCompleted ?? 0,
    badges: (stats.badges ?? []).map(b => ({
      id: b.id,
      icon: b.icon,
      nameKey: b.nameKey,
      unlockedAt: b.unlockedAt,
    })),
  };
}

/** Snapshot map for the given profiles (capped to keep the payload small). */
export function buildDailySnapshots(profiles: PlayerProfile[]): Record<string, DailyProfileSnapshot> {
  const result: Record<string, DailyProfileSnapshot> = {};
  for (const profile of profiles.slice(0, 12)) {
    try {
      result[profile.id] = buildDailySnapshotForProfile(profile);
    } catch { /* skip broken profile */ }
  }
  return result;
}
