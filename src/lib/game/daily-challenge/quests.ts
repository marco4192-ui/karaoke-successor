// Daily Challenge — (#5) quest system: definitions, progress, claiming rewards
//
// Part of the daily-challenge module (see ./index.ts).

import { getJson, setJson } from '@/lib/storage';
import { getMondayISO, todayISO } from './date-utils';
import {
  QUEST_PROGRESS_KEY,
  QUEST_STATS_KEY,
  questProgressKey,
  questStatsKey,
} from './storage-keys';
import { getPlayerDailyStats, savePlayerDailyStats } from './stats';
import type {
  DailyBadge,
  PlayerQuestStats,
  QuestDefinition,
  QuestProgress,
  StoredQuestStats,
} from './types';

/** (#5) Available daily quests. */
export const DAILY_QUESTS: QuestDefinition[] = [
  {
    id: 'daily-double',
    name: 'Daily Double',
    nameKey: 'dailyChallenge.quests.dailyDouble.name',
    description: 'Complete 2 daily challenges today',
    descriptionKey: 'dailyChallenge.quests.dailyDouble.description',
    icon: '🎯',
    target: 2,
    reward: { xp: 150 },
    checkProgress: 'dailyCompleted',
  },
  {
    id: 'perfect-10',
    name: 'Perfect Ten',
    nameKey: 'dailyChallenge.quests.perfectTen.name',
    description: 'Hit 10 perfect notes total',
    descriptionKey: 'dailyChallenge.quests.perfectTen.description',
    icon: '💎',
    target: 10,
    reward: { xp: 200 },
    checkProgress: 'perfectNotesTotal',
  },
  {
    id: 'challenge-explorer',
    name: 'Challenge Explorer',
    nameKey: 'dailyChallenge.quests.challengeExplorer.name',
    description: 'Play 5 different challenge modes',
    descriptionKey: 'dailyChallenge.quests.challengeExplorer.description',
    icon: '🗺️',
    target: 5,
    reward: { xp: 300, badgeId: 'explorer' },
    checkProgress: 'challengeModesPlayed',
  },
  {
    id: 'songbird',
    name: 'Songbird',
    nameKey: 'dailyChallenge.quests.songbird.name',
    description: 'Complete 10 songs total',
    descriptionKey: 'dailyChallenge.quests.songbird.description',
    icon: '🐦',
    target: 10,
    reward: { xp: 250, badgeId: 'songbird' },
    checkProgress: 'totalSongsCompleted',
  },
  {
    id: 'weekly-warrior',
    name: 'Weekly Warrior',
    nameKey: 'dailyChallenge.quests.weeklyWarrior.name',
    description: 'Complete 3 weekly challenges',
    descriptionKey: 'dailyChallenge.quests.weeklyWarrior.description',
    icon: '⚔️',
    target: 3,
    reward: { xp: 500, badgeId: 'weekly-warrior' },
    checkProgress: 'weeklyCompleted',
  },
];

// ---------------------------------------------------------------------------
// (#5) Quest System
// ---------------------------------------------------------------------------

const DEFAULT_QUEST_STATS: StoredQuestStats = {
  dailyCompleted: 0,
  weeklyCompleted: 0,
  challengeModesPlayed: 0,
  perfectNotesTotal: 0,
  totalSongsCompleted: 0,
  _lastDailyReset: null,
  _lastWeeklyReset: null,
};

/**
 * Get the player's current quest stats, applying daily/weekly resets as needed.
 *
 * - `dailyCompleted` resets at the start of each new day.
 * - `weeklyCompleted` resets at the start of each new week (Monday).
 */
export function getPlayerQuestStats(playerId?: string): PlayerQuestStats {
  const today = todayISO();
  const weekStart = getMondayISO(new Date());

  let stored = getJson<StoredQuestStats | null>(questStatsKey(playerId), null);
  if (!stored && playerId) {
    // Read-only fallback to the legacy shared quest stats (pre per-player tracking)
    stored = getJson<StoredQuestStats | null>(QUEST_STATS_KEY, null);
  }
  const stats = { ...DEFAULT_QUEST_STATS, ...(stored ?? {}) } as StoredQuestStats;

  let dirty = false;

  // Daily reset for dailyCompleted
  if (stats._lastDailyReset !== today) {
    stats.dailyCompleted = 0;
    stats._lastDailyReset = today;
    dirty = true;
  }

  // Weekly reset for weeklyCompleted
  if (stats._lastWeeklyReset !== weekStart) {
    stats.weeklyCompleted = 0;
    stats._lastWeeklyReset = weekStart;
    dirty = true;
  }

  // Only persist when a reset actually occurred
  if (dirty) setJson(questStatsKey(playerId), stats);

  // Return clean PlayerQuestStats (strip internal fields)
  const { _lastDailyReset: _, _lastWeeklyReset: __, ...clean } = stats;
  return clean;
}

/** Get progress for a specific quest. */
export function getQuestProgress(questId: string, playerId?: string): QuestProgress {
  let all = getJson<Record<string, QuestProgress>>(questProgressKey(playerId), {});
  if (playerId && Object.keys(all).length === 0) {
    // Read-only fallback to the legacy shared quest progress
    all = getJson<Record<string, QuestProgress>>(QUEST_PROGRESS_KEY, {});
  }
  return all[questId] ?? { questId, currentProgress: 0, completed: false };
}

/**
 * Update progress for all quests that track a given field.
 *
 * Call this whenever a relevant event occurs:
 * - `'dailyCompleted'` — after completing a daily challenge
 * - `'weeklyCompleted'` — after completing a weekly challenge
 * - `'challengeModesPlayed'` — after playing a challenge mode
 * - `'perfectNotesTotal'` — after hitting a perfect note
 * - `'totalSongsCompleted'` — after completing any song
 */
export function updateQuestProgress(checkField: keyof PlayerQuestStats, amount: number, playerId?: string): void {
  const questStats = getPlayerQuestStats(playerId);
  const newValue = questStats[checkField] + amount;

  // Use questStats directly — avoid a redundant second read that could race with a daily/weekly reset
  const today = todayISO();
  const weekStart = getMondayISO(new Date());
  const stored: StoredQuestStats = { ...DEFAULT_QUEST_STATS, ...questStats, _lastDailyReset: today, _lastWeeklyReset: weekStart };
  stored[checkField] = newValue;
  setJson(questStatsKey(playerId), stored);

  // Update progress for any quests tracking this field
  let allProgress = getJson<Record<string, QuestProgress>>(questProgressKey(playerId), {});
  if (playerId && Object.keys(allProgress).length === 0) {
    allProgress = getJson<Record<string, QuestProgress>>(QUEST_PROGRESS_KEY, {});
  }
  let progressDirty = false;

  for (const quest of DAILY_QUESTS) {
    if (quest.checkProgress === checkField) {
      const existing = allProgress[quest.id] ?? { questId: quest.id, currentProgress: 0, completed: false };
      if (existing.completed) continue; // already completed — don't overwrite

      allProgress[quest.id] = {
        ...existing,
        currentProgress: Math.min(newValue, quest.target),
        completed: newValue >= quest.target,
      };
      progressDirty = true;
    }
  }

  // Only write quest progress if something actually changed
  if (progressDirty) setJson(questProgressKey(playerId), allProgress);
}

/**
 * Claim the reward for a completed quest.
 * Returns `{ xp, badge? }` if successfully claimed, or throws if not eligible.
 */
export function claimQuestReward(questId: string, playerId?: string): { xp: number; badge?: DailyBadge } {
  const quest = DAILY_QUESTS.find(q => q.id === questId);
  if (!quest) throw new Error(`Unknown quest: ${questId}`);

  const progress = getQuestProgress(questId, playerId);
  if (!progress.completed) throw new Error('Quest not yet completed');
  if (progress.claimedAt) throw new Error('Reward already claimed');

  // Mark as claimed
  let allProgress = getJson<Record<string, QuestProgress>>(questProgressKey(playerId), {});
  if (playerId && Object.keys(allProgress).length === 0) {
    allProgress = getJson<Record<string, QuestProgress>>(QUEST_PROGRESS_KEY, {});
  }
  allProgress[questId] = { ...progress, claimedAt: Date.now() };
  setJson(questProgressKey(playerId), allProgress);

  // Award XP to player stats
  const stats = getPlayerDailyStats(playerId);
  stats.totalXP += quest.reward.xp;
  savePlayerDailyStats(stats, playerId);

  // Optionally create a badge
  let badge: DailyBadge | undefined;
  if (quest.reward.badgeId) {
    badge = {
      id: quest.reward.badgeId,
      name: quest.name,
      nameKey: quest.nameKey,
      icon: quest.icon,
      description: `Completed quest: ${quest.name}`,
      descriptionKey: quest.descriptionKey,
      unlockedAt: Date.now(),
    };

    if (!stats.badges.some(b => b.id === badge!.id)) {
      stats.badges.push(badge);
      savePlayerDailyStats(stats, playerId);
    }
  }

  return { xp: quest.reward.xp, badge };
}

/**
 * Returns all active (defined) quests with their current progress.
 * Useful for rendering a quest list in the UI.
 */
export function getActiveQuests(playerId?: string): Array<QuestDefinition & QuestProgress> {
  const questStats = getPlayerQuestStats(playerId);

  return DAILY_QUESTS.map(quest => {
    const progress = getQuestProgress(quest.id, playerId);
    // Use the live stat value for currentProgress (not the snapshotted one)
    const liveValue = questStats[quest.checkProgress as keyof PlayerQuestStats];
    const currentProgress = Math.min(liveValue, quest.target);
    const completed = liveValue >= quest.target;

    return {
      ...quest,
      questId: quest.id,
      currentProgress,
      completed: progress.claimedAt ? true : completed,
      claimedAt: progress.claimedAt,
    };
  });
}
