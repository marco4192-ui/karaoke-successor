// Daily Challenge — (#4) weekly challenge system
//
// 100 weekly types, 5 slots per week, 5 difficulty levels, Monday reset.
// Part of the daily-challenge module (see ./index.ts).

import { getJson, setJson } from '@/lib/storage';
import { WEEKLY_TYPE_LIST } from '../challenge-pools';
import type { DailyDifficulty, WeeklyTypeDefinition } from '../challenge-pools';
import { DAILY_BADGES } from './badges';
import { getISOWeek, hashString, timestampToISO, todayISO } from './date-utils';
import { getDailyDifficultyMultiplier } from './evaluation';
import { checkWeeklyGates, extractWeeklyMetric } from './gates';
import { updateQuestProgress } from './quests';
import {
  DAILY_DIFFICULTIES,
  WEEKLY_SLOTS_PER_WEEK,
  WEEKLY_SLOT_XP,
  getWeeklyType,
} from './registry';
import { currentWeekKey, weeklyStorageKey, WEEKLY_SLOT_PROGRESS_KEY } from './storage-keys';
import { getPlayerDailyStats, savePlayerDailyStats } from './stats';
import type {
  DailyBadge,
  DailyResultMetrics,
  PlayerWeeklySlotProgress,
  WeeklyChallengeData,
} from './types';

/** Which badge tier the player has reached this week ('none' when no slot is completed). */
export function getWeeklyBadgeTierThisWeek(playerId?: string): 'none' | 'bronze' | 'silver' | 'gold' {
  const count = getPlayerWeeklySlotProgress(playerId).completedSlots.length;
  if (count >= 5) return 'gold';
  if (count >= 3) return 'silver';
  if (count >= 1) return 'bronze';
  return 'none';
}

/** Save weekly challenge data to localStorage. */
function saveWeeklyChallenge(data: WeeklyChallengeData): void {
  setJson(weeklyStorageKey(data.weekNumber, data.year), data);
}

/**
 * The 5 weekly challenge slots for the current week. Types are picked
 * deterministically from the week hash across all 100 registered weekly
 * types (distinct within the week).
 */
export function getWeeklySlots(): Array<{ slot: number; type: string }> {
  const now = new Date();
  const weekNumber = getISOWeek(now);
  const year = now.getFullYear();
  const seed = `${year}-${weekNumber}`;
  const picked: string[] = [];
  let salt = 0;
  while (picked.length < WEEKLY_SLOTS_PER_WEEK) {
    const type = WEEKLY_TYPE_LIST[hashString(`${seed}:${salt}`) % WEEKLY_TYPE_LIST.length].id;
    if (!picked.includes(type)) picked.push(type);
    salt++;
  }
  return picked.map((type, slot) => ({ slot, type }));
}

/**
 * Get (or generate) the current weekly challenge data. The five slot types
 * are stored so they stay stable within the week.
 */
export function getWeeklyChallenge(): WeeklyChallengeData {
  const now = new Date();
  const weekNumber = getISOWeek(now);
  const year = now.getFullYear();
  const storageKey = weeklyStorageKey(weekNumber, year);

  const stored = getJson<WeeklyChallengeData | null>(storageKey, null);
  if (stored && stored.weekNumber === weekNumber && stored.year === year && Array.isArray(stored.slots) && stored.slots.length > 0) {
    return stored;
  }

  const challenge: WeeklyChallengeData = {
    weekNumber,
    year,
    slots: getWeeklySlots(),
    entries: [],
  };
  saveWeeklyChallenge(challenge);
  return challenge;
}

/**
 * Display helper: the weekly slot's type + target scaled for level/difficulty.
 * 'best' types return the best-single-song target, 'sum' types the weekly total.
 */
export function getWeeklyChallengeForSlot(
  slot: number,
  level?: number,
  difficulty: DailyDifficulty = 'normal',
): { slot: number; type: string; target: number; def: WeeklyTypeDefinition } {
  const slots = getWeeklyChallenge().slots;
  const entry = slots[Math.min(Math.max(0, slot), slots.length - 1)];
  const def = getWeeklyType(entry.type);
  const base = def.targets[difficulty] ?? def.targets.normal;
  let target = base;
  if (level !== undefined && level > 1 && def.aggregation === 'best' && def.direction === 'max') {
    const scale = 1 + Math.min(0.25, level * 0.0025);
    target = Math.round(base * scale);
    if (def.cap !== undefined) target = Math.min(def.cap, target);
  }
  return { slot: entry.slot, type: entry.type, target, def };
}

/** The player's current weekly slot progress (resets on a new week). */
export function getPlayerWeeklySlotProgress(playerId?: string): PlayerWeeklySlotProgress {
  const key = playerId ? `${WEEKLY_SLOT_PROGRESS_KEY}${playerId}` : WEEKLY_SLOT_PROGRESS_KEY;
  const stored = getJson<PlayerWeeklySlotProgress | null>(key, null);
  const weekKey = currentWeekKey();
  if (stored && stored.weekKey === weekKey) return stored;
  return { weekKey, completedSlots: [], metBySlot: {} };
}

/** Persist the player's weekly slot progress. */
function savePlayerWeeklySlotProgress(progress: PlayerWeeklySlotProgress, playerId?: string): void {
  const key = playerId ? `${WEEKLY_SLOT_PROGRESS_KEY}${playerId}` : WEEKLY_SLOT_PROGRESS_KEY;
  setJson(key, progress);
}

/** Whether a weekly slot is unlocked (slot 0 always, others need the previous one). */
export function isWeeklySlotUnlocked(slot: number, playerId?: string): boolean {
  if (slot <= 0) return true;
  const progress = getPlayerWeeklySlotProgress(playerId);
  return progress.completedSlots.includes(slot - 1);
}

/** The first unlocked-but-uncompleted weekly slot (null when all 5 are done). */
export function getActiveWeeklySlot(playerId?: string): number | null {
  const progress = getPlayerWeeklySlotProgress(playerId);
  for (let slot = 0; slot < WEEKLY_SLOTS_PER_WEEK; slot++) {
    if (!progress.completedSlots.includes(slot)) return slot;
  }
  return null;
}

/** Compute a player's aggregated metric for a weekly slot from all their entries. */
function weeklyAggregatedMetric(
  data: WeeklyChallengeData,
  playerId: string,
  slot: number,
  type: string,
): number {
  const def = getWeeklyType(type);
  const playerEntries = data.entries.filter(e => e.playerId === playerId && e.slot === slot);
  if (playerEntries.length === 0) return 0;
  if (def.aggregation === 'sum') {
    return playerEntries.reduce((sum, e) => sum + e.metric, 0);
  }
  // best — direction-aware
  return def.direction === 'min'
    ? Math.min(...playerEntries.map(e => e.metric))
    : Math.max(...playerEntries.map(e => e.metric));
}

/**
 * Submit a result to the weekly challenge system.
 *
 * The submission is evaluated against ALL unlocked-but-uncompleted weekly
 * slots: 'best' types update when the single-song metric improves, 'sum'
 * types accumulate. A slot completes when its aggregated metric reaches the
 * target at the selected difficulty.
 */
export function submitWeeklyChallengeResult(
  player: {
    id: string;
    name: string;
    avatar?: string;
    color: string;
  },
  result: DailyResultMetrics,
  options?: { difficulty?: DailyDifficulty; level?: number },
): { challenge: WeeklyChallengeData; xpEarned: number; completedSlots: number[]; newBadges: DailyBadge[] } {
  const difficulty: DailyDifficulty = options?.difficulty ?? 'normal';
  const level = options?.level;
  const challenge = getWeeklyChallenge();
  const progress = getPlayerWeeklySlotProgress(player.id);
  const stats = getPlayerDailyStats(player.id);
  const difficultyMultiplier = getDailyDifficultyMultiplier(difficulty);
  const newBadges: DailyBadge[] = [];
  let xpEarned = 0;
  const completedSlots: number[] = [];

  for (const slotEntry of challenge.slots) {
    const slot = slotEntry.slot;
    if (progress.completedSlots.includes(slot)) continue;
    if (slot > 0 && !progress.completedSlots.includes(slot - 1)) continue; // still locked

    const def = getWeeklyType(slotEntry.type);

    // Gates + category must pass for this submission to count for the slot
    const gatesPass = checkWeeklyGates(slotEntry.type, result);
    if (!gatesPass) continue;

    const metric = extractWeeklyMetric(slotEntry.type, result);
    if (!Number.isFinite(metric) || metric <= 0) continue;

    // Record the submission
    challenge.entries.push({
      playerId: player.id,
      playerName: player.name,
      playerAvatar: player.avatar,
      playerColor: player.color,
      slot,
      metric,
      difficulty,
      completedAt: Date.now(),
    });

    // Evaluate against all difficulties (union across the week)
    const aggregated = weeklyAggregatedMetric(challenge, player.id, slot, slotEntry.type);
    const met: DailyDifficulty[] = [];
    for (const d of DAILY_DIFFICULTIES) {
      let target = def.targets[d.id] ?? def.targets.normal;
      if (level !== undefined && level > 1 && def.aggregation === 'best' && def.direction === 'max') {
        const scale = 1 + Math.min(0.25, level * 0.0025);
        target = Math.round(target * scale);
        if (def.cap !== undefined) target = Math.min(def.cap, target);
      }
      if (def.direction === 'min' ? aggregated <= target : aggregated >= target) {
        met.push(d.id);
      }
    }
    const prevMet = progress.metBySlot[String(slot)] ?? [];
    progress.metBySlot[String(slot)] = Array.from(new Set([...prevMet, ...met]));

    // Slot completion at the selected difficulty
    if (met.includes(difficulty)) {
      progress.completedSlots.push(slot);
      completedSlots.push(slot);
      xpEarned += Math.round(WEEKLY_SLOT_XP[Math.min(slot, WEEKLY_SLOT_XP.length - 1)] * difficultyMultiplier);
      stats.weeklyCompletedTotal = (stats.weeklyCompletedTotal ?? 0) + 1;

      updateQuestProgress('weeklyCompleted', 1, player.id);

      // Weekly tier badges: bronze (1), silver (3), gold (5 slots this week)
      const tier = progress.completedSlots.length >= 5 ? 'gold'
        : progress.completedSlots.length >= 3 ? 'silver'
        : progress.completedSlots.length >= 1 ? 'bronze' : 'none';
      const tierBadgeId = tier === 'gold' ? 'weekly-gold' : tier === 'silver' ? 'weekly-silver' : tier === 'bronze' ? 'weekly-bronze' : null;
      if (tierBadgeId && !stats.badges.some(b => b.id === tierBadgeId)) {
        const badge: DailyBadge = { ...DAILY_BADGES[tierBadgeId], unlockedAt: Date.now() };
        stats.badges.push(badge);
        newBadges.push(badge);
      }
    }
  }

  stats.totalXP += xpEarned;
  savePlayerDailyStats(stats, player.id);
  savePlayerWeeklySlotProgress(progress, player.id);
  saveWeeklyChallenge(challenge);

  return { challenge, xpEarned, completedSlots, newBadges };
}

/**
 * Check whether the given player has already submitted a qualifying result
 * to this week's weekly challenge today.
 */
export function isWeeklyChallengeCompletedToday(playerId: string): boolean {
  const today = todayISO();
  const now = new Date();
  const weekNumber = getISOWeek(now);
  const year = now.getFullYear();

  const stored = getJson<WeeklyChallengeData | null>(weeklyStorageKey(weekNumber, year), null);
  if (!stored) return false;

  return stored.entries.some(
    e => e.playerId === playerId && timestampToISO(e.completedAt) === today,
  );
}

/** Returns the time remaining until the weekly challenge resets (next Monday 00:00). */
export function getTimeUntilWeeklyReset(): { days: number; hours: number } {
  const now = new Date();
  const dow = now.getDay();
  // Days until next Monday (0=Sun → 1 day; 1=Mon → 7 days; etc.)
  const daysUntilMonday = dow === 0 ? 1 : (8 - dow);

  const nextMonday = new Date(now);
  nextMonday.setDate(now.getDate() + daysUntilMonday);
  nextMonday.setHours(0, 0, 0, 0);

  const diff = Math.max(0, nextMonday.getTime() - now.getTime());
  const totalHours = diff / (1000 * 60 * 60);

  return {
    days: Math.floor(totalHours / 24),
    hours: Math.floor(totalHours % 24),
  };
}
