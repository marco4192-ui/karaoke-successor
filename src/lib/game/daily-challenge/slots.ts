// Daily Challenge — slot system & today's challenge data
//
// 5 slots per day, sequential unlock, deterministic per-day type selection.
// Part of the daily-challenge module (see ./index.ts).

import { getJson, getItem, setJson } from '@/lib/storage';
import type { DailyDifficulty } from '../challenge-pools';
import { getDailyTargetFor } from './evaluation';
import { hashString, todayISO } from './date-utils';
import {
  DAILY_LEADERBOARD_KEY,
  DAILY_SLOT_PROGRESS_KEY,
} from './storage-keys';
import {
  DAILY_SLOTS_PER_DAY,
  DAILY_TYPES,
  DAILY_TYPE_IDS,
  getDailyType,
} from './registry';
import type {
  DailyChallengeData,
  DailyChallengeType,
  PlayerDailySlotProgress,
} from './types';

// ---------------------------------------------------------------------------
// Daily Challenge — core
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Daily Challenge — slot system (5 slots per day, sequential unlock)
// ---------------------------------------------------------------------------

/**
 * The 5 daily challenge slots for today. Types are picked deterministically
 * from the date hash across all 200 registered types (distinct per day).
 * If a legacy stored leaderboard for today already has a type, slot 0 adopts
 * it so old data stays consistent.
 */
export function getDailySlots(): Array<{ slot: number; type: string }> {
  const today = todayISO();
  const picked: string[] = [];

  // Legacy compatibility: a stored leaderboard for today keeps its type in slot 0.
  const stored = getItem(`${DAILY_LEADERBOARD_KEY}_${today}`);
  if (stored) {
    try {
      const parsed = JSON.parse(stored) as DailyChallengeData;
      if (parsed?.type && DAILY_TYPES[parsed.type]) picked.push(parsed.type);
    } catch { /* ignore corrupt data */ }
  }

  let salt = 0;
  while (picked.length < DAILY_SLOTS_PER_DAY) {
    const type = DAILY_TYPE_IDS[hashString(`${today}:${salt}`) % DAILY_TYPE_IDS.length];
    if (!picked.includes(type)) picked.push(type);
    salt++;
  }

  return picked.map((type, slot) => ({ slot, type }));
}

/** The player's current daily slot progress (resets on a new day). */
export function getPlayerDailySlotProgress(playerId?: string): PlayerDailySlotProgress {
  const key = playerId ? `${DAILY_SLOT_PROGRESS_KEY}${playerId}` : DAILY_SLOT_PROGRESS_KEY;
  const stored = getJson<PlayerDailySlotProgress | null>(key, null);
  const today = todayISO();
  if (stored && stored.date === today) return stored;
  return { date: today, completedSlots: [], metBySlot: {} };
}

/** Persist the player's daily slot progress. */
export function savePlayerDailySlotProgress(progress: PlayerDailySlotProgress, playerId?: string): void {
  const key = playerId ? `${DAILY_SLOT_PROGRESS_KEY}${playerId}` : DAILY_SLOT_PROGRESS_KEY;
  setJson(key, progress);
}

/** Whether a daily slot is unlocked for the player (slot 0 always, others need the previous one). */
export function isDailySlotUnlocked(slot: number, playerId?: string): boolean {
  if (slot <= 0) return true;
  const progress = getPlayerDailySlotProgress(playerId);
  return progress.completedSlots.includes(slot - 1);
}

/** The first unlocked-but-uncompleted daily slot for the player (null when all 5 are done). */
export function getActiveDailySlot(playerId?: string): number | null {
  const progress = getPlayerDailySlotProgress(playerId);
  for (let slot = 0; slot < DAILY_SLOTS_PER_DAY; slot++) {
    if (!progress.completedSlots.includes(slot)) return slot;
  }
  return null;
}

/** Which badge tier the player has reached today ('none' when no slot is completed). */
export function getDailyBadgeTierToday(playerId?: string): 'none' | 'bronze' | 'silver' | 'gold' {
  const count = getPlayerDailySlotProgress(playerId).completedSlots.length;
  if (count >= 5) return 'gold';
  if (count >= 3) return 'silver';
  if (count >= 1) return 'bronze';
  return 'none';
}

/**
 * Generate (or load) the daily challenge leaderboard data — slot-aware.
 * `slot` selects which of the 5 daily slots to evaluate; `level`/`difficulty`
 * scale the returned target for display.
 */
export function getDailyChallengeForSlot(
  slot: number,
  level?: number,
  difficulty: DailyDifficulty = 'normal',
): DailyChallengeData {
  const today = todayISO();
  const slots = getDailySlots();
  const type = slots[Math.min(Math.max(0, slot), slots.length - 1)]?.type ?? 'score';

  // Load (or create) the shared leaderboard for today — `type` is slot 0's type
  const stored = getItem(`${DAILY_LEADERBOARD_KEY}_${today}`);
  let challenge: DailyChallengeData;
  if (stored) {
    try {
      challenge = JSON.parse(stored);
    } catch {
      challenge = createEmptyDailyChallenge(today, getDailySlots()[0].type);
    }
  } else {
    challenge = createEmptyDailyChallenge(today, getDailySlots()[0].type);
  }

  // Return the requested slot's view with scaled target
  return {
    ...challenge,
    type,
    difficulty,
    target: getDailyTargetFor(type, difficulty, level),
  };
}

/**
 * Legacy wrapper: returns slot 0's challenge (used by older UIs and the
 * best-result helpers). Prefer {@link getDailyChallengeForSlot}.
 */
export function getDailyChallenge(level?: number, difficulty: DailyDifficulty = 'normal'): DailyChallengeData {
  return getDailyChallengeForSlot(0, level, difficulty);
}

/** Fresh (empty) daily challenge payload for a date/type. */
function createEmptyDailyChallenge(date: string, type: DailyChallengeType): DailyChallengeData {
  return {
    date,
    type,
    target: getDailyType(type).targets.normal,
    seed: hashString(date),
    entries: [],
    totalParticipants: 0,
  };
}

/** (#2) Scale a base challenge target up slightly with player level (max +25 % at level 100). */
export function getTargetForLevel(baseTarget: number, level: number): number {
  const scale = 1 + Math.min(0.25, level * 0.0025);
  return Math.round(baseTarget * scale);
}

/** Save the daily challenge leaderboard to localStorage. */
export function saveDailyChallenge(data: DailyChallengeData): void {
  setJson(`${DAILY_LEADERBOARD_KEY}_${data.date}`, data);
}
