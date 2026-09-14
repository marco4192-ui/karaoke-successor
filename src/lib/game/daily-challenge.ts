// Daily Challenge Leaderboard System
// Global rankings, XP system, streak rewards, weekly challenges, and quests
//
// TODO: This file is ~1280 lines. Consider splitting into modules:
//   - daily-challenge-types.ts   (interfaces, constants, badge/quest definitions)
//   - daily-challenge-core.ts    (daily challenge + co-op submission, best results)
//   - weekly-challenge.ts       (weekly challenge system)
//   - quest-system.ts           (quest progress, claiming rewards)
//   - date-utils.ts             (todayISO, yesterdayISO, hashString, getISOWeek, etc.)

import { getRankForXP } from './player-progression';
import { PERFECT_ACCURACY } from './progression-levels';
import { StorageKeys, getItem, getJson, setJson, setItem } from '@/lib/storage';
import type { Language } from '@/lib/i18n/locales';
import { t } from '@/lib/i18n/translations';
import {
  DAILY_TYPE_LIST,
  WEEKLY_TYPE_LIST,
  matchesDailyCategory,
  type DailySongContext,
  type DailyDifficulty,
  type DailyTypeDefinition,
  type WeeklyTypeDefinition,
} from './challenge-pools';

// Re-export the pool types so existing importers keep working.
export type {
  DailyTypeDefinition,
  WeeklyTypeDefinition,
  DailyCategory,
  DailyCategoryField,
  DailySongContext,
  DailyDifficulty,
} from './challenge-pools';

// ---------------------------------------------------------------------------
// Interfaces — Daily Challenge
// ---------------------------------------------------------------------------

interface DailyChallengeEntry {
  playerId: string;
  playerName: string;
  playerAvatar?: string;
  playerColor: string;
  score: number;
  accuracy: number;
  combo: number;
  perfectNotesCount: number;
  /** Extended metrics for the wider daily type pool (optional — old entries default to 0). */
  goldenNotesCount?: number;
  notesHit?: number;
  notesMissed?: number;
  tickAccuracy?: number;
  /** Difficulty the player selected for this attempt. */
  difficulty?: string;
  /** How many of today's 5 daily slots this player has completed. */
  slotsCompletedToday?: number;
  /** Today's daily badge tier for this player (bronze/silver/gold). */
  dailyBadge?: 'bronze' | 'silver' | 'gold';
  completedAt: number;
  rank: number;
}

interface DailyChallengeData {
  date: string;
  type: DailyChallengeType;
  target: number;
  /** Difficulty the target was scaled for (display copies only — storage keeps the normal base). */
  difficulty?: DailyDifficulty;
  seed: number;
  entries: DailyChallengeEntry[];
  totalParticipants: number;
}

interface PlayerDailyStats {
  currentStreak: number;
  longestStreak: number;
  totalCompleted: number;
  totalXP: number;
  lastCompletedDate: string | null;
  badges: DailyBadge[];
  weeklyProgress: number[]; // 7 days of completion
  lastWeekStart: string | null; // ISO date of Monday of current week, for weekly reset
  /** Cumulative number of weekly challenges completed (per player, for achievements). */
  weeklyCompletedTotal?: number;
}

/** Per-player progress on today's 5 daily challenge slots. */
export interface PlayerDailySlotProgress {
  date: string;
  /** slot indices (0–4) completed today at ANY difficulty */
  completedSlots: number[];
  /** per-slot union of met difficulties across all attempts today */
  metBySlot: Record<string, DailyDifficulty[]>;
}

/** Per-player progress on this week's 5 weekly challenge slots. */
export interface PlayerWeeklySlotProgress {
  /** week key: `${year}-W${weekNumber}` */
  weekKey: string;
  completedSlots: number[];
  /** per-slot union of met difficulties across the week */
  metBySlot: Record<string, DailyDifficulty[]>;
}

interface DailyBadge {
  id: string;
  name: string;
  nameKey: string;
  icon: string;
  description: string;
  descriptionKey: string;
  unlockedAt: number;
}

// ---------------------------------------------------------------------------
// Interfaces — Player Best Result (#1)
// ---------------------------------------------------------------------------

/** Tracks the best result a player has achieved for today's daily challenge. */
export interface PlayerBestResult {
  playerId: string;
  score: number;
  accuracy: number;
  combo: number;
  perfectNotes: number;
  /** Extended metrics for the wider daily type pool. */
  goldenNotes?: number;
  notesHit?: number;
  notesMissed?: number;
  tickAccuracy?: number;
  completedAt: number;
  targetMet: boolean; // whether the challenge target was achieved (at any difficulty)
  /** Difficulty selected for this best attempt. */
  difficulty?: DailyDifficulty;
  /** All difficulty levels whose target was met today (union across all attempts). */
  metDifficulties?: DailyDifficulty[];
  /** Which daily slot this best attempt was achieved on. */
  slot?: number;
}

// ---------------------------------------------------------------------------
// Interfaces — Weekly Challenge (#4)
// ---------------------------------------------------------------------------

/** A single entry in the weekly challenge leaderboard. */
interface WeeklyChallengeEntry {
  playerId: string;
  playerName: string;
  playerAvatar?: string;
  playerColor: string;
  /** which weekly slot (0–4) this submission counts towards */
  slot: number;
  /** raw metric value of this submission (aggregated per type) */
  metric: number;
  /** difficulty selected for this submission */
  difficulty?: DailyDifficulty;
  completedAt: number;
}

/** Weekly challenge data — resets every Monday. Five slots, unlocked in sequence. */
export interface WeeklyChallengeData {
  weekNumber: number;
  year: number;
  /** the five weekly challenge types for this week (slot → type id) */
  slots: Array<{ slot: number; type: string }>;
  entries: WeeklyChallengeEntry[];
}

// ---------------------------------------------------------------------------
// Interfaces — Quest System (#5)
// ---------------------------------------------------------------------------

/** Static definition of a quest/mission. */
export interface QuestDefinition {
  id: string;
  name: string;
  nameKey: string;
  description: string;
  descriptionKey: string;
  icon: string;
  target: number;
  reward: { xp: number; badgeId?: string };
  checkProgress: string; // identifier for what to check (keyof PlayerQuestStats)
}

/** Runtime progress for a single quest. */
export interface QuestProgress {
  questId: string;
  currentProgress: number;
  completed: boolean;
  claimedAt?: number;
}

/** Cumulative stats that drive quest progress. */
export interface PlayerQuestStats {
  dailyCompleted: number;       // daily challenges completed today
  weeklyCompleted: number;      // weekly challenges completed this week
  challengeModesPlayed: number; // challenge modes played total
  perfectNotesTotal: number;    // total perfect notes across all games
  totalSongsCompleted: number;  // total songs completed
}

/** Internal storage shape — extends PlayerQuestStats with reset-tracking fields. */
interface StoredQuestStats extends PlayerQuestStats {
  _lastDailyReset?: string | null;
  _lastWeeklyReset?: string | null;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** XP rewards for various challenge accomplishments. */
export const XP_REWARDS = {
  CHALLENGE_COMPLETE: 100,
  STREAK_BONUS_BASE: 10, // +10 per streak day
  TOP_3_BONUS: [50, 30, 20], // 1st, 2nd, 3rd
  TOP_10_BONUS: 10,
  PERFECT_CHALLENGE: 50, // 100% accuracy on accuracy challenge
  /** (#3) XP subtracted when a streak breaks (min 0 XP earned). */
  STREAK_BREAK_PENALTY: 25,
  STREAK_MILESTONES: {
    7: { xp: 200, badge: 'Week Warrior', badgeKey: 'dailyChallenge.streakMilestones.weekWarrior' },
    14: { xp: 500, badge: 'Fortnight Fighter', badgeKey: 'dailyChallenge.streakMilestones.fortnightFighter' },
    30: { xp: 1000, badge: 'Monthly Master', badgeKey: 'dailyChallenge.streakMilestones.monthlyMaster' },
    60: { xp: 2500, badge: 'Bi-Monthly Boss', badgeKey: 'dailyChallenge.streakMilestones.biMonthlyBoss' },
    100: { xp: 5000, badge: 'Century Champion', badgeKey: 'dailyChallenge.streakMilestones.centuryChampion' },
    365: { xp: 50000, badge: 'Yearly Legend', badgeKey: 'dailyChallenge.streakMilestones.yearlyLegend' },
  },
} as const;

/** (#4) XP awarded when the weekly challenge target is met. */
export const WEEKLY_XP_REWARD = 250;

// ---------------------------------------------------------------------------
// Daily Challenge — difficulty levels & type registry
// ---------------------------------------------------------------------------

// NOTE: DailyDifficulty now lives in challenge-pools.ts and is re-exported above.

/** result metric a daily/weekly type is evaluated against */
export type DailyMetricKey =
  | 'score'
  | 'accuracy'
  | 'tickAccuracy'
  | 'maxCombo'
  | 'perfectNotesCount'
  | 'goldenNotesCount'
  | 'notesHit'
  | 'notesMissed'
  | 'category_match'
  | 'songsCompleted';

/** additional side condition a daily/weekly type requires besides the scaled target */
export interface DailyGate {
  metricKey: DailyMetricKey;
  op: '>=' | '<=';
  value: number;
}

/** The 200 daily challenge variants now live in challenge-pools.ts. */
// (DAILY_TYPE_LIST is imported from ./challenge-pools)

/** all valid daily challenge type ids */
export type DailyChallengeType = string;

/** ordered list of all daily type ids (used for the per-day hash selection) */
export const DAILY_TYPE_IDS: readonly string[] = DAILY_TYPE_LIST.map(d => d.id);

/** lookup registry for daily type definitions */
export const DAILY_TYPES: Readonly<Record<string, DailyTypeDefinition>> =
  Object.fromEntries(DAILY_TYPE_LIST.map(d => [d.id, d]));

/** lookup registry for the weekly type definitions (100 variants). */
export const WEEKLY_TYPES: Readonly<Record<string, WeeklyTypeDefinition>> =
  Object.fromEntries(WEEKLY_TYPE_LIST.map(d => [d.id, d]));

/** Returns the definition of a weekly type (falls back to the first entry for unknown ids). */
export function getWeeklyType(type: string): WeeklyTypeDefinition {
  return WEEKLY_TYPES[type] ?? WEEKLY_TYPE_LIST[0];
}

/** Returns the definition of a daily type (falls back to 'score' for unknown/legacy ids). */
export function getDailyType(type: string): DailyTypeDefinition {
  return (DAILY_TYPES as Record<string, DailyTypeDefinition | undefined>)[type] ?? DAILY_TYPES.score;
}

/** metrics accepted by daily/weekly submissions (superset of the classic four) */
export interface DailyResultMetrics {
  score: number;
  accuracy: number;
  tickAccuracy?: number;
  combo: number; // max combo
  perfectNotesCount?: number;
  goldenNotesCount?: number;
  notesHit?: number;
  notesMissed?: number;
  /** whether the sung song matched the challenge's category requirement (0/1) */
  categoryMatch?: number;
  /** song metadata context for category evaluation */
  song?: DailySongContext;
  /** current app language (for 'atypical language' challenges) */
  appLanguage?: string;
}

/** Extract the challenge-relevant metric from a result. */
export function extractDailyMetric(type: string, m: DailyResultMetrics): number {
  return metricByKey(getDailyType(type).metricKey, m);
}

/** Read a single metric off a result by its key (tick accuracy falls back to note accuracy). */
function metricByKey(key: DailyMetricKey, m: DailyResultMetrics): number {
  switch (key) {
    case 'score': return m.score;
    case 'accuracy': return m.accuracy;
    case 'tickAccuracy': return m.tickAccuracy ?? m.accuracy;
    case 'maxCombo': return m.combo;
    case 'perfectNotesCount': return m.perfectNotesCount ?? 0;
    case 'goldenNotesCount': return m.goldenNotesCount ?? 0;
    case 'notesHit': return m.notesHit ?? 0;
    case 'notesMissed': return m.notesMissed ?? 0;
    case 'category_match': return m.categoryMatch ?? (m.song ? 0 : 0);
    case 'songsCompleted': return 1;
  }
}

/** Check the (difficulty-independent) gate + category conditions of a daily type. */
export function checkDailyGates(type: string, m: DailyResultMetrics): boolean {
  const def = getDailyType(type);
  // Category requirement: the sung song's metadata must match.
  if (def.category) {
    const matched = m.categoryMatch !== undefined
      ? m.categoryMatch >= 1
      : matchesDailyCategory(def.category, m.song, m.appLanguage);
    if (!matched) return false;
  }
  const gates = def.gates;
  if (!gates) return true;
  return gates.every(g => {
    const value = metricByKey(g.metricKey, m);
    return g.op === '>=' ? value >= g.value : value <= g.value;
  });
}

/** Check gates for a weekly type (same semantics as daily gates). */
export function checkWeeklyGates(type: string, m: DailyResultMetrics): boolean {
  const def = getWeeklyType(type);
  if (def.category) {
    const matched = m.categoryMatch !== undefined
      ? m.categoryMatch >= 1
      : matchesDailyCategory(def.category, m.song, m.appLanguage);
    if (!matched) return false;
  }
  const gates = def.gates;
  if (!gates) return true;
  return gates.every(g => {
    const value = metricByKey(g.metricKey, m);
    return g.op === '>=' ? value >= g.value : value <= g.value;
  });
}

/** Extract the challenge-relevant metric for a weekly type. */
export function extractWeeklyMetric(type: string, m: DailyResultMetrics): number {
  const def = getWeeklyType(type);
  if (def.metricKey === 'category_match') {
    if (m.categoryMatch !== undefined) return m.categoryMatch;
    return def.category ? (matchesDailyCategory(def.category, m.song, m.appLanguage) ? 1 : 0) : 0;
  }
  return metricByKey(def.metricKey, m);
}

/**
 * Compute the effective target for a daily type at a given difficulty,
 * including the slight level scaling (max +25 % at level 100).
 * 'min' types (missed notes) tighten with level instead of loosening.
 */
export function getDailyTargetFor(type: string, difficulty: DailyDifficulty, level?: number): number {
  const def = getDailyType(type);
  const base = def.targets[difficulty] ?? def.targets.normal;
  if (level === undefined || level <= 1) return base;
  const scale = 1 + Math.min(0.25, level * 0.0025);
  if (def.direction === 'min') {
    return Math.max(1, Math.round(base / scale));
  }
  const scaled = Math.round(base * scale);
  return def.cap !== undefined ? Math.min(def.cap, scaled) : scaled;
}

/** Outcome of a daily attempt against all difficulty levels. */
export interface DailyAttemptEvaluation {
  metric: number;
  gatesPass: boolean;
  /** difficulties whose target this attempt met (empty when gates failed) */
  met: DailyDifficulty[];
}

/** Evaluate an attempt against a daily type: metric, gates, and met difficulties. */
export function evaluateDailyAttempt(type: string, m: DailyResultMetrics, level?: number): DailyAttemptEvaluation {
  const def = getDailyType(type);
  const metric = extractDailyMetric(type, m);
  const gatesPass = checkDailyGates(type, m);
  const met: DailyDifficulty[] = [];
  if (gatesPass && Number.isFinite(metric)) {
    for (const d of DAILY_DIFFICULTIES) {
      const target = getDailyTargetFor(type, d.id, level);
      if (def.direction === 'min' ? metric <= target : metric >= target) {
        met.push(d.id);
      }
    }
  }
  return { metric, gatesPass, met };
}

/** XP multiplier of a difficulty level (unknown → 1). */
export function getDailyDifficultyMultiplier(difficulty?: string): number {
  return DAILY_DIFFICULTIES.find(d => d.id === difficulty)?.xpMultiplier ?? 1;
}

/** selectable difficulty levels for daily AND weekly challenges (shared). */
export const DAILY_DIFFICULTIES: ReadonlyArray<{
  id: DailyDifficulty;
  icon: string;
  labelKey: string;
  /** XP multiplier applied to the base challenge-complete reward */
  xpMultiplier: number;
}> = [
  { id: 'easy', icon: '🟢', labelKey: 'dailyChallengeScreen.difficultyEasy', xpMultiplier: 0.5 },
  { id: 'normal', icon: '🟡', labelKey: 'dailyChallengeScreen.difficultyNormal', xpMultiplier: 1 },
  { id: 'hard', icon: '🟠', labelKey: 'dailyChallengeScreen.difficultyHard', xpMultiplier: 1.5 },
  { id: 'very_hard', icon: '🔴', labelKey: 'dailyChallengeScreen.difficultyVeryHard', xpMultiplier: 2.25 },
  { id: 'insane', icon: '💀', labelKey: 'dailyChallengeScreen.difficultyInsane', xpMultiplier: 3 },
];

/** Difficulty levels for the weekly challenge — same five tiers as the daily. */
export const WEEKLY_DIFFICULTIES = DAILY_DIFFICULTIES;

/** Number of daily challenge slots per day (bronze 1 / silver 3 / gold 5). */
export const DAILY_SLOTS_PER_DAY = 5;

/** Number of weekly challenge slots per week (bronze 1 / silver 3 / gold 5). */
export const WEEKLY_SLOTS_PER_WEEK = 5;

/** Badge tier thresholds shared by daily and weekly slots. */
export const SLOT_BADGE_TIERS = [
  { tier: 'bronze', slots: 1 },
  { tier: 'silver', slots: 3 },
  { tier: 'gold', slots: 5 },
] as const;

/** Bonus XP for completing daily slots 2–5 (index 0 = slot 2, …). Scaled by difficulty. */
export const DAILY_SLOT_XP_BONUS = [125, 150, 175, 200] as const;

/** XP for completing weekly slots 1–5. Scaled by difficulty. */
export const WEEKLY_SLOT_XP = [250, 300, 350, 400, 500] as const;

/** Interpolate a challenge pattern text: replaces {n} with the formatted target
 *  plus any static params ({genre}, {m}, …). */
export function interpolateChallengeText(
  text: string,
  params: Record<string, string> | undefined,
  target: number,
  metricKey: string,
): string {
  const isPercent = metricKey === 'accuracy' || metricKey === 'tickAccuracy';
  const formatted = isPercent
    ? `${Number.isInteger(target) ? target : target.toFixed(1)}%`
    : target.toLocaleString();
  let out = text.replace(/\{n\}/g, formatted);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      out = out.replaceAll(`{${key}}`, value);
    }
  }
  return out;
}

// Badge definitions
export const DAILY_BADGES: Record<string, Omit<DailyBadge, 'unlockedAt'>> = {
  'first-challenge': {
    id: 'first-challenge',
    name: 'First Steps',
    nameKey: 'dailyChallenge.badges.firstChallenge.name',
    icon: '🌟',
    description: 'Complete your first daily challenge',
    descriptionKey: 'dailyChallenge.badges.firstChallenge.description',
  },
  'week-warrior': {
    id: 'week-warrior',
    name: 'Week Warrior',
    nameKey: 'dailyChallenge.badges.weekWarrior.name',
    icon: '🏆',
    description: 'Maintain a 7-day streak',
    descriptionKey: 'dailyChallenge.badges.weekWarrior.description',
  },
  'fortnight-fighter': {
    id: 'fortnight-fighter',
    name: 'Fortnight Fighter',
    nameKey: 'dailyChallenge.badges.fortnightFighter.name',
    icon: '⚔️',
    description: 'Maintain a 14-day streak',
    descriptionKey: 'dailyChallenge.badges.fortnightFighter.description',
  },
  'monthly-master': {
    id: 'monthly-master',
    name: 'Monthly Master',
    nameKey: 'dailyChallenge.badges.monthlyMaster.name',
    icon: '👑',
    description: 'Maintain a 30-day streak',
    descriptionKey: 'dailyChallenge.badges.monthlyMaster.description',
  },
  'top-3': {
    id: 'top-3',
    name: 'Podium Finish',
    nameKey: 'dailyChallenge.badges.podiumFinish.name',
    icon: '🥇',
    description: 'Finish in top 3 of a daily challenge',
    descriptionKey: 'dailyChallenge.badges.podiumFinish.description',
  },
  'champion': {
    id: 'champion',
    name: 'Daily Champion',
    nameKey: 'dailyChallenge.badges.dailyChampion.name',
    icon: '🏅',
    description: 'Win a daily challenge',
    descriptionKey: 'dailyChallenge.badges.dailyChampion.description',
  },
  'dedicated': {
    id: 'dedicated',
    name: 'Dedicated Singer',
    nameKey: 'dailyChallenge.badges.dedicatedSinger.name',
    icon: '🎤',
    description: 'Complete 30 daily challenges',
    descriptionKey: 'dailyChallenge.badges.dedicatedSinger.description',
  },
  'legendary': {
    id: 'legendary',
    name: 'Legendary Status',
    nameKey: 'dailyChallenge.badges.legendaryStatus.name',
    icon: '⭐',
    description: 'Reach 10,000 total XP',
    descriptionKey: 'dailyChallenge.badges.legendaryStatus.description',
  },
  'century-champion': {
    id: 'century-champion',
    name: 'Century Champion',
    nameKey: 'dailyChallenge.badges.centuryChampion.name',
    icon: '💎',
    description: 'Maintain a 100-day streak',
    descriptionKey: 'dailyChallenge.badges.centuryChampion.description',
  },
  'yearly-legend': {
    id: 'yearly-legend',
    name: 'Yearly Legend',
    nameKey: 'dailyChallenge.badges.yearlyLegend.name',
    icon: '🌟',
    description: 'Maintain a 365-day streak',
    descriptionKey: 'dailyChallenge.badges.yearlyLegend.description',
  },
  'daily-bronze': {
    id: 'daily-bronze',
    name: 'Daily Bronze',
    nameKey: 'dailyChallenge.badges.dailyBronze.name',
    icon: '🥉',
    description: 'Complete 1 daily challenge in one day',
    descriptionKey: 'dailyChallenge.badges.dailyBronze.description',
  },
  'daily-silver': {
    id: 'daily-silver',
    name: 'Daily Silver',
    nameKey: 'dailyChallenge.badges.dailySilver.name',
    icon: '🥈',
    description: 'Complete 3 daily challenges in one day',
    descriptionKey: 'dailyChallenge.badges.dailySilver.description',
  },
  'daily-gold': {
    id: 'daily-gold',
    name: 'Daily Gold',
    nameKey: 'dailyChallenge.badges.dailyGold.name',
    icon: '🥇',
    description: 'Complete all 5 daily challenges in one day',
    descriptionKey: 'dailyChallenge.badges.dailyGold.description',
  },
  'weekly-bronze': {
    id: 'weekly-bronze',
    name: 'Weekly Bronze',
    nameKey: 'dailyChallenge.badges.weeklyBronze.name',
    icon: '🎗️',
    description: 'Complete 1 weekly challenge in one week',
    descriptionKey: 'dailyChallenge.badges.weeklyBronze.description',
  },
  'weekly-silver': {
    id: 'weekly-silver',
    name: 'Weekly Silver',
    nameKey: 'dailyChallenge.badges.weeklySilver.name',
    icon: '🏅',
    description: 'Complete 3 weekly challenges in one week',
    descriptionKey: 'dailyChallenge.badges.weeklySilver.description',
  },
  'weekly-gold': {
    id: 'weekly-gold',
    name: 'Weekly Gold',
    nameKey: 'dailyChallenge.badges.weeklyGold.name',
    icon: '🏆',
    description: 'Complete all 5 weekly challenges in one week',
    descriptionKey: 'dailyChallenge.badges.weeklyGold.description',
  },
};

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

// ===================== LOCALIZATION HELPERS =====================

/** Get a localized daily badge. */
export function getLocalizedDailyBadge(badge: Omit<DailyBadge, 'unlockedAt'>, language?: Language): { name: string; description: string } {
  return {
    name: t(badge.nameKey, language),
    description: t(badge.descriptionKey, language),
  };
}

/** Get a localized daily quest. */
export function getLocalizedDailyQuest(quest: QuestDefinition, language?: Language): { name: string; description: string } {
  return {
    name: t(quest.nameKey, language),
    description: t(quest.descriptionKey, language),
  };
}

/** Get a localized streak milestone badge name. */
export function getLocalizedStreakMilestone(streakDays: number, language?: Language): string {
  const milestone = (XP_REWARDS.STREAK_MILESTONES as Record<number, { xp: number; badge: string; badgeKey?: string }>)[streakDays];
  if (!milestone) return '';
  return milestone.badgeKey ? t(milestone.badgeKey, language) : milestone.badge;
}

// ---------------------------------------------------------------------------
// Storage keys
// ---------------------------------------------------------------------------

const DAILY_CHALLENGE_KEY = StorageKeys.DAILY_CHALLENGE;
const DAILY_LEADERBOARD_KEY = StorageKeys.DAILY_LEADERBOARD_PREFIX;
const PLAYER_DAILY_STATS_KEY = StorageKeys.PLAYER_DAILY_STATS;
/** Flag: legacy shared daily stats have been migrated to a profile. */
const PLAYER_DAILY_STATS_MIGRATED_KEY = 'karaoke_player_daily_stats_migrated';

/** (#1) localStorage key for per-player best results. */
const PLAYER_BEST_RESULTS_KEY = 'karaoke_daily_best_results';

/** (#4) localStorage key prefix for weekly challenge data. */
const WEEKLY_CHALLENGE_KEY_PREFIX = 'karaoke_weekly_challenge_';

/** localStorage key prefix for per-player daily slot progress. */
const DAILY_SLOT_PROGRESS_KEY = 'karaoke_daily_slot_progress_';

/** localStorage key prefix for per-player weekly slot progress. */
const WEEKLY_SLOT_PROGRESS_KEY = 'karaoke_weekly_slot_progress_';

/** (#5) localStorage key for quest progress map. */
const QUEST_PROGRESS_KEY = 'karaoke_quest_progress';

/** (#5) localStorage key for cumulative player quest stats. */
const QUEST_STATS_KEY = 'karaoke_quest_stats';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Returns yesterday's date as a locale-independent ISO string (YYYY-MM-DD). */
function yesterdayISO(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Advance the player's streak based on their last completion date.
 * Returns the streak bonus XP to add on top of the base XP.
 * Mutates `stats.currentStreak`, `stats.longestStreak`, and `stats.lastCompletedDate`.
 */
function advanceStreak(stats: PlayerDailyStats, _baseXP: number): { xpAdjustment: number; streakBonusXP: number } {
  if (stats.lastCompletedDate === yesterdayISO()) {
    stats.currentStreak++;
  } else {
    let penalty = 0;
    if (stats.currentStreak > 0 && stats.lastCompletedDate !== null) {
      penalty = XP_REWARDS.STREAK_BREAK_PENALTY;
    }
    stats.currentStreak = 1;
    return { xpAdjustment: -penalty, streakBonusXP: XP_REWARDS.STREAK_BONUS_BASE };
  }
  if (stats.currentStreak > stats.longestStreak) {
    stats.longestStreak = stats.currentStreak;
  }
  return { xpAdjustment: 0, streakBonusXP: XP_REWARDS.STREAK_BONUS_BASE * stats.currentStreak };
}

/** Returns today's date as a locale-independent ISO string (YYYY-MM-DD). */
function todayISO(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/** Returns the ISO date string (YYYY-MM-DD) for a given timestamp. */
function timestampToISO(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Simple DJB2 hash — provides much better distribution than ASCII sum for % N. */
function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
  }
  return (hash >>> 0); // unsigned 32-bit — prevents Infinity/NaN on long strings
}

/** (#4) Returns the ISO 8601 week number for a given date. */
function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

/** (#4) Returns the Monday-starting ISO week index (0=Mon … 6=Sun) for a date. */
function getMondayIndex(date: Date): number {
  const dow = date.getDay();
  return dow === 0 ? 6 : dow - 1;
}

/** Returns the ISO string of the Monday on or before `date`. */
function getMondayISO(date: Date): string {
  const d = new Date(date);
  const dow = d.getDay();
  const offset = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

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
function savePlayerDailySlotProgress(progress: PlayerDailySlotProgress, playerId?: string): void {
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

/** Which badge tier the player has reached this week ('none' when no slot is completed). */
export function getWeeklyBadgeTierThisWeek(playerId?: string): 'none' | 'bronze' | 'silver' | 'gold' {
  const count = getPlayerWeeklySlotProgress(playerId).completedSlots.length;
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
function saveDailyChallenge(data: DailyChallengeData): void {
  setJson(`${DAILY_LEADERBOARD_KEY}_${data.date}`, data);
}

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

/** Storage key for a player's daily stats (per-profile since the profile renovation). */
function playerDailyStatsKey(playerId?: string): string {
  return playerId ? `${PLAYER_DAILY_STATS_KEY}_${playerId}` : PLAYER_DAILY_STATS_KEY;
}

/** Storage key for a player's quest stats/progress (per-profile). */
function questStatsKey(playerId?: string): string {
  return playerId ? `${QUEST_STATS_KEY}_${playerId}` : QUEST_STATS_KEY;
}

function questProgressKey(playerId?: string): string {
  return playerId ? `${QUEST_PROGRESS_KEY}_${playerId}` : QUEST_PROGRESS_KEY;
}

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

function savePlayerDailyStats(stats: PlayerDailyStats, playerId?: string): void {
  setJson(playerDailyStatsKey(playerId), stats);
}

// ---------------------------------------------------------------------------
// (#1) Per-Player Best Results Tracking
// ---------------------------------------------------------------------------

/**
 * Retrieve the stored best result for a player on today's daily challenge.
 * Returns `null` if the player has no result for today or the stored date differs.
 */
export function getPlayerBestResult(playerId: string): PlayerBestResult | null {
  const today = todayISO();
  const all = getJson<Record<string, PlayerBestResult & { date: string }>>(PLAYER_BEST_RESULTS_KEY, {});
  const entry = all[playerId];
  if (!entry || entry.date !== today) return null;
  const { date: _date, ...best } = entry;
  return best;
}

/**
 * Save (or update) the best result for a player on today's daily challenge.
 * If the player already has a better result for today, the stored value is kept.
 */
export function savePlayerBestResult(playerId: string, result: PlayerBestResult): void {
  const today = todayISO();
  const all = getJson<Record<string, PlayerBestResult & { date: string }>>(PLAYER_BEST_RESULTS_KEY, {});
  all[playerId] = { ...result, date: today };
  setJson(PLAYER_BEST_RESULTS_KEY, all);
}

// ---------------------------------------------------------------------------
// Submit a challenge result (single-player) — slot-aware
// ---------------------------------------------------------------------------

/**
 * Submit a single-player challenge result for a daily slot.
 *
 * `options.slot` selects which of the 5 daily slots this attempt counts for
 * (defaults to the player's active = first open slot).
 *
 * Side-effects:
 * - Updates the daily leaderboard (slots completed today + badge tier)
 * - Records slot progress; awards slot XP on first completion per slot
 * - Streak/first-completion logic runs on the first slot completed today
 * - Awards badges (including daily bronze/silver/gold tier badges)
 * - Saves the player's best result for today including met difficulties
 */
export function submitChallengeResult(
  player: {
    id: string;
    name: string;
    avatar?: string;
    color: string;
  },
  result: DailyResultMetrics,
  options?: { difficulty?: DailyDifficulty; level?: number; slot?: number },
): {
  challenge: DailyChallengeData;
  slot: number;
  slotType: string;
  stats: PlayerDailyStats;
  xpEarned: number;
  newBadges: DailyBadge[];
  rank: number;
  targetMet: boolean;
  metDifficulties: DailyDifficulty[];
  slotCompleted: boolean;
} {
  const difficulty: DailyDifficulty = options?.difficulty ?? 'normal';
  const level = options?.level;
  const slots = getDailySlots();
  const slot = Math.min(Math.max(0, options?.slot ?? getActiveDailySlot(player.id) ?? 0), slots.length - 1);
  const slotType = slots[slot].type;
  const typeDef = getDailyType(slotType);

  // Always load with base target (no scaling) for leaderboard consistency
  const challenge = getDailyChallenge();
  const stats = getPlayerDailyStats(player.id);
  const slotProgress = getPlayerDailySlotProgress(player.id);
  const today = todayISO();
  const difficultyMultiplier = getDailyDifficultyMultiplier(difficulty);
  let xpEarned = 0;
  const newBadges: DailyBadge[] = [];

  // Evaluate the attempt against the slot's challenge type
  const evaluation = evaluateDailyAttempt(slotType, result, level);
  const targetMet = evaluation.met.includes(difficulty);

  // ── Leaderboard entry update ──
  const entrySortMetric = (entry: DailyChallengeEntry): number =>
    extractDailyMetric(challenge.type, entryToMetrics(entry));
  const existingEntry = challenge.entries.find(e => e.playerId === player.id);
  if (existingEntry) {
    const better = typeDef.direction === 'min'
      ? evaluation.metric < extractDailyMetric(slotType, entryToMetrics(existingEntry))
      : evaluation.metric > extractDailyMetric(slotType, entryToMetrics(existingEntry));
    if (better) {
      existingEntry.score = result.score;
      existingEntry.accuracy = result.accuracy;
      existingEntry.combo = result.combo;
      existingEntry.perfectNotesCount = result.perfectNotesCount ?? 0;
      existingEntry.goldenNotesCount = result.goldenNotesCount ?? 0;
      existingEntry.notesHit = result.notesHit ?? 0;
      existingEntry.notesMissed = result.notesMissed ?? 0;
      existingEntry.tickAccuracy = result.tickAccuracy;
      existingEntry.difficulty = difficulty;
      existingEntry.completedAt = Date.now();
    }
  } else {
    challenge.entries.push({
      playerId: player.id,
      playerName: player.name,
      playerAvatar: player.avatar,
      playerColor: player.color,
      score: result.score,
      accuracy: result.accuracy,
      combo: result.combo,
      perfectNotesCount: result.perfectNotesCount ?? 0,
      goldenNotesCount: result.goldenNotesCount ?? 0,
      notesHit: result.notesHit ?? 0,
      notesMissed: result.notesMissed ?? 0,
      tickAccuracy: result.tickAccuracy,
      difficulty,
      completedAt: Date.now(),
      rank: 0,
    });
    challenge.totalParticipants++;
  }

  // ── Slot progress + XP ──
  const alreadyCompleted = slotProgress.completedSlots.includes(slot);
  const slotCompleted = targetMet && !alreadyCompleted;
  if (slotCompleted) {
    slotProgress.completedSlots.push(slot);
  }
  // Merge met difficulties per slot (union across attempts)
  const prevMet = slotProgress.metBySlot[String(slot)] ?? [];
  slotProgress.metBySlot[String(slot)] = Array.from(new Set([...prevMet, ...evaluation.met]));

  if (slotCompleted) {
    // Slot XP: slot 0 keeps the classic reward incl. streak/rank bonuses;
    // slots 1–4 award the escalating slot bonus (× difficulty multiplier).
    if (slot === 0) {
      xpEarned = Math.round(XP_REWARDS.CHALLENGE_COMPLETE * difficultyMultiplier);
    } else {
      xpEarned = Math.round(DAILY_SLOT_XP_BONUS[Math.min(slot - 1, DAILY_SLOT_XP_BONUS.length - 1)] * difficultyMultiplier);
    }
  }

  // Rank (computed after entry sort below — placeholder for badge checks)
  // Sort: slots completed today desc, then slot-0 metric (direction-aware)
  const entrySlots = (e: DailyChallengeEntry): number => e.slotsCompletedToday ?? 0;
  challenge.entries.sort((a, b) => {
    const slotDiff = entrySlots(b) - entrySlots(a);
    if (slotDiff !== 0) return slotDiff;
    const diff = typeDef.direction === 'min'
      ? entrySortMetric(a) - entrySortMetric(b)
      : entrySortMetric(b) - entrySortMetric(a);
    if (diff !== 0) return diff;
    return a.playerId.localeCompare(b.playerId);
  });
  challenge.entries.forEach((entry, index) => { entry.rank = index + 1; });
  const playerRank = challenge.entries.find(e => e.playerId === player.id)?.rank || 0;

  // Streak + first completion logic: runs when this is the player's FIRST
  // completed slot today (regardless of which slot it is).
  if (slotCompleted && stats.lastCompletedDate !== today) {
    const streak = advanceStreak(stats, xpEarned);
    xpEarned = Math.max(0, xpEarned + streak.xpAdjustment + streak.streakBonusXP);
    stats.lastCompletedDate = today;
    stats.totalCompleted++;

    // Top 3 bonus
    if (playerRank <= 3 && playerRank >= 1) {
      xpEarned += XP_REWARDS.TOP_3_BONUS[playerRank - 1];
    } else if (playerRank <= 10) {
      xpEarned += XP_REWARDS.TOP_10_BONUS;
    }

    // Update weekly progress — reset at week boundary
    const now = new Date();
    const weekStartISO = getMondayISO(now);
    if (stats.lastWeekStart !== weekStartISO) {
      stats.weeklyProgress = [0, 0, 0, 0, 0, 0, 0];
      stats.lastWeekStart = weekStartISO;
    }
    stats.weeklyProgress[getMondayIndex(now)] = 1;

    updateQuestProgress('dailyCompleted', 1, player.id);
  } else if (slotCompleted) {
    // Additional slot on the same day — still counts as a completed daily
    stats.totalCompleted++;
  }

  // Perfect challenge bonus: 100% accuracy on an accuracy-metric challenge.
  if (slotCompleted && typeDef.metricKey === 'accuracy' && evaluation.gatesPass && result.accuracy >= PERFECT_ACCURACY) {
    xpEarned += XP_REWARDS.PERFECT_CHALLENGE;
  }

  // Streak milestones (checked whenever a slot completes and the streak grew)
  if (slotCompleted) {
    const milestone = XP_REWARDS.STREAK_MILESTONES[stats.currentStreak as keyof typeof XP_REWARDS.STREAK_MILESTONES];
    if (milestone) {
      xpEarned += milestone.xp;
      const badgeId = milestone.badge.toLowerCase().replace(/ /g, '-');
      if (!stats.badges.some(b => b.id === badgeId)) {
        const newBadge: DailyBadge = {
          id: badgeId,
          name: milestone.badge,
          nameKey: milestone.badgeKey ?? `dailyChallenge.streakMilestones.${badgeId}`,
          icon: stats.currentStreak >= 365 ? '🌟' : stats.currentStreak >= 100 ? '💎' : '🏆',
          description: `Maintained a ${stats.currentStreak}-day streak`,
          descriptionKey: `dailyChallenge.streakMilestones.${badgeId}.description`,
          unlockedAt: Date.now(),
        };
        stats.badges.push(newBadge);
        newBadges.push(newBadge);
      }
    }

    // First challenge badge
    if (stats.totalCompleted === 1 && !stats.badges.some(b => b.id === 'first-challenge')) {
      const badge: DailyBadge = { ...DAILY_BADGES['first-challenge'], unlockedAt: Date.now() };
      stats.badges.push(badge);
      newBadges.push(badge);
    }
    // 30 completions badge
    if (stats.totalCompleted >= 30 && !stats.badges.some(b => b.id === 'dedicated')) {
      const badge: DailyBadge = { ...DAILY_BADGES['dedicated'], unlockedAt: Date.now() };
      stats.badges.push(badge);
      newBadges.push(badge);
    }

    // Daily tier badges: bronze (1), silver (3), gold (5 slots today)
    const tier = getDailyBadgeTierToday(player.id);
    const tierBadgeId = tier === 'gold' ? 'daily-gold' : tier === 'silver' ? 'daily-silver' : tier === 'bronze' ? 'daily-bronze' : null;
    if (tierBadgeId && !stats.badges.some(b => b.id === tierBadgeId)) {
      const badge: DailyBadge = { ...DAILY_BADGES[tierBadgeId], unlockedAt: Date.now() };
      stats.badges.push(badge);
      newBadges.push(badge);
    }
  }

  // Legendary badge (checked on every qualifying submission)
  if (stats.totalXP + xpEarned >= 10000 && !stats.badges.some(b => b.id === 'legendary')) {
    const badge: DailyBadge = { ...DAILY_BADGES['legendary'], unlockedAt: Date.now() };
    stats.badges.push(badge);
    newBadges.push(badge);
  }

  // Rank-based badges: checked on EVERY submission
  if (playerRank === 1 && !stats.badges.some(b => b.id === 'champion')) {
    const badge: DailyBadge = { ...DAILY_BADGES['champion'], unlockedAt: Date.now() };
    stats.badges.push(badge);
    newBadges.push(badge);
  }
  if (playerRank <= 3 && !stats.badges.some(b => b.id === 'top-3')) {
    const badge: DailyBadge = { ...DAILY_BADGES['top-3'], unlockedAt: Date.now() };
    stats.badges.push(badge);
    newBadges.push(badge);
  }

  // Persist slot progress on the entry + stats
  const playerEntry = challenge.entries.find(e => e.playerId === player.id);
  if (playerEntry) {
    playerEntry.slotsCompletedToday = slotProgress.completedSlots.length;
    const tier = getDailyBadgeTierToday(player.id);
    playerEntry.dailyBadge = tier === 'none' ? undefined : tier;
  }

  stats.totalXP += xpEarned;
  saveDailyChallenge(challenge);
  savePlayerDailyStats(stats, player.id);
  savePlayerDailySlotProgress(slotProgress, player.id);

  // Legacy shared completion flag
  setJson(DAILY_CHALLENGE_KEY, {
    date: today,
    completed: Object.values(slotProgress.metBySlot).some(m => m.length > 0),
    streak: stats.currentStreak,
  });

  // Best result for today (kept for the best-attempt box; tagged with the slot)
  const existingBest = getPlayerBestResult(player.id);
  const mergedMet = Array.from(new Set([
    ...(existingBest?.metDifficulties ?? []),
    ...evaluation.met,
  ]));
  const betterBest = !existingBest || (() => {
    const prev = getBestMetric(existingBest, slotType);
    return typeDef.direction === 'min' ? evaluation.metric < prev : evaluation.metric > prev;
  })();
  if (betterBest) {
    savePlayerBestResult(player.id, {
      playerId: player.id,
      score: result.score,
      accuracy: result.accuracy,
      combo: result.combo,
      perfectNotes: result.perfectNotesCount ?? 0,
      goldenNotes: result.goldenNotesCount ?? 0,
      notesHit: result.notesHit ?? 0,
      notesMissed: result.notesMissed ?? 0,
      tickAccuracy: result.tickAccuracy,
      completedAt: Date.now(),
      targetMet: mergedMet.length > 0,
      difficulty,
      metDifficulties: mergedMet,
      slot,
    });
  } else if (mergedMet.length > (existingBest?.metDifficulties?.length ?? 0)) {
    savePlayerBestResult(player.id, {
      ...(existingBest as PlayerBestResult),
      targetMet: true,
      metDifficulties: mergedMet,
    });
  }

  return { challenge, slot, slotType, stats, xpEarned, newBadges, rank: playerRank, targetMet, metDifficulties: mergedMet, slotCompleted };
}

// ---------------------------------------------------------------------------
// (#1) Best-result metric helper
// ---------------------------------------------------------------------------

/** Extract the challenge-type metric from a PlayerBestResult for comparison. */
function getBestMetric(best: PlayerBestResult, type: DailyChallengeData['type']): number {
  switch (getDailyType(type).metricKey) {
    case 'accuracy': return best.accuracy;
    case 'tickAccuracy': return best.tickAccuracy ?? best.accuracy;
    case 'maxCombo': return best.combo;
    case 'perfectNotesCount': return best.perfectNotes;
    case 'goldenNotesCount': return best.goldenNotes ?? 0;
    case 'notesHit': return best.notesHit ?? 0;
    case 'notesMissed': return best.notesMissed ?? 0;
    default: return best.score;
  }
}

/** Public variant of {@link getBestMetric} for UI rendering (best-attempt box). */
export function getBestResultMetric(best: PlayerBestResult, type: string): number {
  return getBestMetric(best, type as DailyChallengeType);
}

/** Adapt a leaderboard entry to the DailyResultMetrics shape (old entries default to 0). */
function entryToMetrics(entry: DailyChallengeEntry): DailyResultMetrics {
  return {
    score: entry.score,
    accuracy: entry.accuracy,
    tickAccuracy: entry.tickAccuracy,
    combo: entry.combo,
    perfectNotesCount: entry.perfectNotesCount,
    goldenNotesCount: entry.goldenNotesCount,
    notesHit: entry.notesHit,
    notesMissed: entry.notesMissed,
  };
}

// ---------------------------------------------------------------------------
// (#6) Co-op Challenge Submission — slot-aware
// ---------------------------------------------------------------------------

/**
 * Submit a co-op (2-player) challenge result for a daily slot.
 *
 * The co-op result uses the AVERAGE of both players' metrics.
 * XP is awarded to both players; slot progress is recorded for both.
 */
export function submitCoopChallengeResult(
  players: Array<{ id: string; name: string; avatar?: string; color: string }>,
  results: Array<DailyResultMetrics>,
  options?: { difficulty?: DailyDifficulty; level?: number; slot?: number },
): { challenge: DailyChallengeData; xpEarned: number; newBadges: DailyBadge[]; targetMet: boolean; metDifficulties: DailyDifficulty[]; slotCompleted: boolean } {
  if (players.length < 2 || results.length < 2) {
    throw new Error('Co-op requires at least 2 players and 2 results');
  }

  const difficulty: DailyDifficulty = options?.difficulty ?? 'normal';
  const level = options?.level;
  const slots = getDailySlots();
  const slot = Math.min(Math.max(0, options?.slot ?? 0), slots.length - 1);
  const slotType = slots[slot].type;
  const typeDef = getDailyType(slotType);
  const challenge = getDailyChallenge();
  const today = todayISO();
  const newBadges: DailyBadge[] = [];
  const difficultyMultiplier = getDailyDifficultyMultiplier(difficulty);

  // Average all players' metrics
  const avgScore = results.reduce((s, r) => s + r.score, 0) / results.length;
  const avgAccuracy = results.reduce((s, r) => s + r.accuracy, 0) / results.length;
  const avgCombo = results.reduce((s, r) => s + r.combo, 0) / results.length;
  const avgPerfectNotes = results.reduce((s, r) => s + (r.perfectNotesCount ?? 0), 0) / results.length;
  const avgGoldenNotes = results.reduce((s, r) => s + (r.goldenNotesCount ?? 0), 0) / results.length;
  const avgNotesHit = results.reduce((s, r) => s + (r.notesHit ?? 0), 0) / results.length;
  const avgNotesMissed = results.reduce((s, r) => s + (r.notesMissed ?? 0), 0) / results.length;
  const avgTickAccuracy = results.some(r => r.tickAccuracy !== undefined)
    ? results.reduce((s, r) => s + (r.tickAccuracy ?? r.accuracy), 0) / results.length
    : undefined;
  const coopSong = results[0].song;
  const appLanguage = results[0].appLanguage;
  const categoryMatch = results[0].categoryMatch;

  const avgMetrics: DailyResultMetrics = {
    score: avgScore,
    accuracy: avgAccuracy,
    tickAccuracy: avgTickAccuracy,
    combo: avgCombo,
    perfectNotesCount: avgPerfectNotes,
    goldenNotesCount: avgGoldenNotes,
    notesHit: avgNotesHit,
    notesMissed: avgNotesMissed,
    song: coopSong,
    appLanguage,
    categoryMatch,
  };

  // Evaluate the averaged attempt
  const evaluation = evaluateDailyAttempt(slotType, avgMetrics, level);
  const targetMet = evaluation.met.includes(difficulty);

  // Add/update entries for each player
  for (let i = 0; i < players.length; i++) {
    const p = players[i];
    const existing = challenge.entries.find(e => e.playerId === p.id);
    if (existing) {
      const better = typeDef.direction === 'min'
        ? evaluation.metric < extractDailyMetric(slotType, entryToMetrics(existing))
        : evaluation.metric > extractDailyMetric(slotType, entryToMetrics(existing));
      if (better) {
        existing.score = avgScore;
        existing.accuracy = avgAccuracy;
        existing.combo = avgCombo;
        existing.perfectNotesCount = avgPerfectNotes;
        existing.goldenNotesCount = avgGoldenNotes;
        existing.notesHit = avgNotesHit;
        existing.notesMissed = avgNotesMissed;
        existing.tickAccuracy = avgTickAccuracy;
        existing.difficulty = difficulty;
        existing.completedAt = Date.now();
      }
    } else {
      challenge.entries.push({
        playerId: p.id,
        playerName: p.name,
        playerAvatar: p.avatar,
        playerColor: p.color,
        score: avgScore,
        accuracy: avgAccuracy,
        combo: avgCombo,
        perfectNotesCount: avgPerfectNotes,
        goldenNotesCount: avgGoldenNotes,
        notesHit: avgNotesHit,
        notesMissed: avgNotesMissed,
        tickAccuracy: avgTickAccuracy,
        difficulty,
        completedAt: Date.now(),
        rank: 0,
      });
      challenge.totalParticipants++;
    }
  }

  // Sort entries (slots today desc, then metric)
  challenge.entries.sort((a, b) => {
    const slotDiff = (b.slotsCompletedToday ?? 0) - (a.slotsCompletedToday ?? 0);
    if (slotDiff !== 0) return slotDiff;
    const mA = extractDailyMetric(challenge.type, entryToMetrics(a));
    const mB = extractDailyMetric(challenge.type, entryToMetrics(b));
    const diff = typeDef.direction === 'min' ? mA - mB : mB - mA;
    if (diff !== 0) return diff;
    return a.playerId.localeCompare(b.playerId);
  });
  challenge.entries.forEach((entry, index) => { entry.rank = index + 1; });
  const bestRank = Math.min(
    ...players.map(p => challenge.entries.find(e => e.playerId === p.id)?.rank ?? Infinity),
  );

  let xpEarned = 0;
  let anySlotCompleted = false;

  for (const p of players) {
    const stats = getPlayerDailyStats(p.id);
    const slotProgress = getPlayerDailySlotProgress(p.id);
    const alreadyCompleted = slotProgress.completedSlots.includes(slot);
    const slotCompleted = targetMet && !alreadyCompleted;
    if (slotCompleted) {
      slotProgress.completedSlots.push(slot);
      anySlotCompleted = true;
    }
    const prevMet = slotProgress.metBySlot[String(slot)] ?? [];
    slotProgress.metBySlot[String(slot)] = Array.from(new Set([...prevMet, ...evaluation.met]));

    if (bestRank === 1 && !stats.badges.some(b => b.id === 'champion')) {
      const badge: DailyBadge = { ...DAILY_BADGES['champion'], unlockedAt: Date.now() };
      stats.badges.push(badge);
      if (p === players[0]) newBadges.push(badge);
    }
    if (bestRank <= 3 && !stats.badges.some(b => b.id === 'top-3')) {
      const badge: DailyBadge = { ...DAILY_BADGES['top-3'], unlockedAt: Date.now() };
      stats.badges.push(badge);
      if (p === players[0]) newBadges.push(badge);
    }

    let playerXP = 0;
    if (slotCompleted) {
      playerXP = slot === 0
        ? Math.round(XP_REWARDS.CHALLENGE_COMPLETE * difficultyMultiplier)
        : Math.round(DAILY_SLOT_XP_BONUS[Math.min(slot - 1, DAILY_SLOT_XP_BONUS.length - 1)] * difficultyMultiplier);

      if (stats.lastCompletedDate !== today) {
        const streak = advanceStreak(stats, playerXP);
        playerXP = Math.max(0, playerXP + streak.xpAdjustment + streak.streakBonusXP);
        stats.lastCompletedDate = today;

        const coopNow = new Date();
        const coopWeekStartISO = getMondayISO(coopNow);
        if (stats.lastWeekStart !== coopWeekStartISO) {
          stats.weeklyProgress = [0, 0, 0, 0, 0, 0, 0];
          stats.lastWeekStart = coopWeekStartISO;
        }
        stats.weeklyProgress[getMondayIndex(coopNow)] = 1;

        updateQuestProgress('dailyCompleted', 1, p.id);
      }
      stats.totalCompleted++;

      // Daily tier badges
      const tier = slotProgress.completedSlots.length >= 5 ? 'gold'
        : slotProgress.completedSlots.length >= 3 ? 'silver'
        : slotProgress.completedSlots.length >= 1 ? 'bronze' : 'none';
      const tierBadgeId = tier === 'gold' ? 'daily-gold' : tier === 'silver' ? 'daily-silver' : tier === 'bronze' ? 'daily-bronze' : null;
      if (tierBadgeId && !stats.badges.some(b => b.id === tierBadgeId)) {
        const badge: DailyBadge = { ...DAILY_BADGES[tierBadgeId], unlockedAt: Date.now() };
        stats.badges.push(badge);
        if (p === players[0]) newBadges.push(badge);
      }
    }

    stats.totalXP += playerXP;
    if (p === players[0]) xpEarned = playerXP;

    const playerEntry = challenge.entries.find(e => e.playerId === p.id);
    if (playerEntry) {
      playerEntry.slotsCompletedToday = slotProgress.completedSlots.length;
      const tier = slotProgress.completedSlots.length >= 5 ? 'gold'
        : slotProgress.completedSlots.length >= 3 ? 'silver'
        : slotProgress.completedSlots.length >= 1 ? 'bronze' : 'none';
      playerEntry.dailyBadge = tier === 'none' ? undefined : tier;
    }

    savePlayerDailyStats(stats, p.id);
    savePlayerDailySlotProgress(slotProgress, p.id);

    // Best result per player
    const existingBest = getPlayerBestResult(p.id);
    const mergedMet = Array.from(new Set([
      ...(existingBest?.metDifficulties ?? []),
      ...evaluation.met,
    ]));
    const better = !existingBest || (() => {
      const prev = getBestMetric(existingBest, slotType);
      return typeDef.direction === 'min' ? evaluation.metric < prev : evaluation.metric > prev;
    })();
    if (better) {
      savePlayerBestResult(p.id, {
        playerId: p.id,
        score: avgScore,
        accuracy: avgAccuracy,
        combo: avgCombo,
        perfectNotes: avgPerfectNotes,
        goldenNotes: avgGoldenNotes,
        notesHit: avgNotesHit,
        notesMissed: avgNotesMissed,
        tickAccuracy: avgTickAccuracy,
        completedAt: Date.now(),
        targetMet: mergedMet.length > 0,
        difficulty,
        metDifficulties: mergedMet,
        slot,
      });
    } else if (mergedMet.length > (existingBest?.metDifficulties?.length ?? 0)) {
      savePlayerBestResult(p.id, {
        ...(existingBest as PlayerBestResult),
        targetMet: true,
        metDifficulties: mergedMet,
      });
    }
  }

  if (targetMet && xpEarned === 0) xpEarned = Math.round(XP_REWARDS.CHALLENGE_COMPLETE * difficultyMultiplier);

  saveDailyChallenge(challenge);

  if (evaluation.met.length > 0) {
    setJson(DAILY_CHALLENGE_KEY, {
      date: today,
      completed: true,
      streak: getPlayerDailyStats(players[0].id).currentStreak,
    });
  }

  return { challenge, xpEarned, newBadges, targetMet, metDifficulties: evaluation.met, slotCompleted: anySlotCompleted };
}

// ---------------------------------------------------------------------------
// (#4) Weekly Challenge System — 100 types, 5 slots, 5 difficulty levels
// ---------------------------------------------------------------------------

/** Storage key for the current week's weekly challenge data. */
function weeklyStorageKey(weekNumber: number, year: number): string {
  return `${WEEKLY_CHALLENGE_KEY_PREFIX}${weekNumber}_${year}`;
}

/** The current ISO week key used for per-player weekly progress. */
function currentWeekKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-W${getISOWeek(now)}`;
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
