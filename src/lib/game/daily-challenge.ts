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
  metric: number; // the challenge-relevant metric value
  completedAt: number;
}

/** Weekly challenge data — resets every Monday. */
export interface WeeklyChallengeData {
  weekNumber: number;
  year: number;
  type: 'score' | 'accuracy' | 'combo' | 'songs_completed';
  target: number;
  description: string;
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

/** selectable difficulty for the daily challenge — independent of the global game difficulty */
export type DailyDifficulty = 'easy' | 'normal' | 'hard' | 'very_hard' | 'insane';

/** result metric a daily type is evaluated against */
export type DailyMetricKey =
  | 'score'
  | 'accuracy'
  | 'tickAccuracy'
  | 'maxCombo'
  | 'perfectNotesCount'
  | 'goldenNotesCount'
  | 'notesHit'
  | 'notesMissed';

/** additional side condition a daily type requires besides the scaled target */
export interface DailyGate {
  metricKey: DailyMetricKey;
  op: '>=' | '<=';
  value: number;
}

/** static definition of one daily challenge variant */
export interface DailyTypeDefinition {
  id: string;
  icon: string;
  nameKey: string;
  /** description with `{n}` placeholder for the (difficulty- and level-scaled) target */
  descriptionKey: string;
  metricKey: DailyMetricKey;
  /** 'max' = higher is better, 'min' = lower is better (e.g. missed notes) */
  direction: 'max' | 'min';
  /** base target per difficulty (before level scaling) */
  targets: Record<DailyDifficulty, number>;
  /** upper bound after level scaling (percent metrics: 99) */
  cap?: number;
  /** difficulty-independent side conditions */
  gates?: DailyGate[];
}

/** The 22 daily challenge variants. The first four keep their legacy ids/targets. */
const DAILY_TYPE_LIST = [
  {
    id: 'score', icon: '🎵',
    nameKey: 'dailyTypes.score.name', descriptionKey: 'dailyTypes.score.description', metricKey: 'score', direction: 'max',
    targets: { easy: 5500, normal: 8000, hard: 9500, very_hard: 11000, insane: 12500 },
  },
  {
    id: 'accuracy', icon: '🎯',
    nameKey: 'dailyTypes.accuracy.name', descriptionKey: 'dailyTypes.accuracy.description', metricKey: 'accuracy', direction: 'max', cap: 99,
    targets: { easy: 75, normal: 85, hard: 90, very_hard: 93, insane: 96 },
  },
  {
    id: 'combo', icon: '⚡',
    nameKey: 'dailyTypes.combo.name', descriptionKey: 'dailyTypes.combo.description', metricKey: 'maxCombo', direction: 'max',
    targets: { easy: 30, normal: 50, hard: 75, very_hard: 100, insane: 150 },
  },
  {
    id: 'perfect_notes', icon: '💎',
    nameKey: 'dailyTypes.perfect_notes.name', descriptionKey: 'dailyTypes.perfect_notes.description', metricKey: 'perfectNotesCount', direction: 'max',
    targets: { easy: 10, normal: 20, hard: 35, very_hard: 50, insane: 75 },
  },
  {
    id: 'golden_notes', icon: '✨',
    nameKey: 'dailyTypes.golden_notes.name', descriptionKey: 'dailyTypes.golden_notes.description', metricKey: 'goldenNotesCount', direction: 'max',
    targets: { easy: 4, normal: 8, hard: 12, very_hard: 16, insane: 22 },
  },
  {
    id: 'notes_hit', icon: '🎶',
    nameKey: 'dailyTypes.notes_hit.name', descriptionKey: 'dailyTypes.notes_hit.description', metricKey: 'notesHit', direction: 'max',
    targets: { easy: 80, normal: 150, hard: 250, very_hard: 350, insane: 500 },
  },
  {
    id: 'tick_accuracy', icon: '🎚️',
    nameKey: 'dailyTypes.tick_accuracy.name', descriptionKey: 'dailyTypes.tick_accuracy.description', metricKey: 'tickAccuracy', direction: 'max', cap: 99,
    targets: { easy: 70, normal: 80, hard: 86, very_hard: 90, insane: 94 },
  },
  {
    id: 'clean_song', icon: '🧼',
    nameKey: 'dailyTypes.clean_song.name', descriptionKey: 'dailyTypes.clean_song.description', metricKey: 'notesMissed', direction: 'min',
    targets: { easy: 25, normal: 12, hard: 7, very_hard: 4, insane: 2 },
  },
  {
    id: 'comeback', icon: '🔄',
    nameKey: 'dailyTypes.comeback.name', descriptionKey: 'dailyTypes.comeback.description', metricKey: 'maxCombo', direction: 'max',
    targets: { easy: 30, normal: 40, hard: 55, very_hard: 70, insane: 90 },
    gates: [{ metricKey: 'notesMissed', op: '>=', value: 10 }],
  },
  {
    id: 'sharpshooter', icon: '🎺',
    nameKey: 'dailyTypes.sharpshooter.name', descriptionKey: 'dailyTypes.sharpshooter.description', metricKey: 'accuracy', direction: 'max', cap: 99,
    targets: { easy: 82, normal: 88, hard: 91, very_hard: 94, insane: 97 },
    gates: [{ metricKey: 'notesHit', op: '>=', value: 60 }],
  },
  {
    id: 'combo_master', icon: '🔗',
    nameKey: 'dailyTypes.combo_master.name', descriptionKey: 'dailyTypes.combo_master.description', metricKey: 'maxCombo', direction: 'max',
    targets: { easy: 40, normal: 60, hard: 85, very_hard: 110, insane: 160 },
    gates: [{ metricKey: 'accuracy', op: '>=', value: 75 }],
  },
  {
    id: 'perfect_storm', icon: '💫',
    nameKey: 'dailyTypes.perfect_storm.name', descriptionKey: 'dailyTypes.perfect_storm.description', metricKey: 'perfectNotesCount', direction: 'max',
    targets: { easy: 12, normal: 18, hard: 28, very_hard: 40, insane: 60 },
    gates: [{ metricKey: 'goldenNotesCount', op: '>=', value: 5 }],
  },
  {
    id: 'endurance', icon: '🏃',
    nameKey: 'dailyTypes.endurance.name', descriptionKey: 'dailyTypes.endurance.description', metricKey: 'notesHit', direction: 'max',
    targets: { easy: 150, normal: 250, hard: 350, very_hard: 450, insane: 600 },
    gates: [{ metricKey: 'maxCombo', op: '>=', value: 40 }],
  },
  {
    id: 'golden_groove', icon: '🌟',
    nameKey: 'dailyTypes.golden_groove.name', descriptionKey: 'dailyTypes.golden_groove.description', metricKey: 'goldenNotesCount', direction: 'max',
    targets: { easy: 6, normal: 10, hard: 14, very_hard: 18, insane: 24 },
    gates: [{ metricKey: 'accuracy', op: '>=', value: 85 }],
  },
  {
    id: 'precision', icon: '🎯',
    nameKey: 'dailyTypes.precision.name', descriptionKey: 'dailyTypes.precision.description', metricKey: 'tickAccuracy', direction: 'max', cap: 99,
    targets: { easy: 75, normal: 85, hard: 89, very_hard: 92, insane: 95 },
    gates: [{ metricKey: 'notesHit', op: '>=', value: 50 }],
  },
  {
    id: 'flawless_finale', icon: '🌈',
    nameKey: 'dailyTypes.flawless_finale.name', descriptionKey: 'dailyTypes.flawless_finale.description', metricKey: 'accuracy', direction: 'max', cap: 99,
    targets: { easy: 85, normal: 90, hard: 93, very_hard: 95, insane: 97 },
    gates: [{ metricKey: 'notesMissed', op: '<=', value: 8 }],
  },
  {
    id: 'score_sniper', icon: '🎸',
    nameKey: 'dailyTypes.score_sniper.name', descriptionKey: 'dailyTypes.score_sniper.description', metricKey: 'score', direction: 'max',
    targets: { easy: 6000, normal: 8500, hard: 10000, very_hard: 11500, insane: 13000 },
    gates: [{ metricKey: 'accuracy', op: '>=', value: 85 }],
  },
  {
    id: 'combo_race', icon: '🚀',
    nameKey: 'dailyTypes.combo_race.name', descriptionKey: 'dailyTypes.combo_race.description', metricKey: 'maxCombo', direction: 'max',
    targets: { easy: 50, normal: 70, hard: 95, very_hard: 120, insane: 170 },
    gates: [{ metricKey: 'notesHit', op: '>=', value: 100 }],
  },
  {
    id: 'perfect_pitch', icon: '🎤',
    nameKey: 'dailyTypes.perfect_pitch.name', descriptionKey: 'dailyTypes.perfect_pitch.description', metricKey: 'perfectNotesCount', direction: 'max',
    targets: { easy: 10, normal: 16, hard: 25, very_hard: 35, insane: 50 },
    gates: [{ metricKey: 'accuracy', op: '>=', value: 90 }],
  },
  {
    id: 'golden_fingers', icon: '🤌',
    nameKey: 'dailyTypes.golden_fingers.name', descriptionKey: 'dailyTypes.golden_fingers.description', metricKey: 'goldenNotesCount', direction: 'max',
    targets: { easy: 4, normal: 6, hard: 9, very_hard: 12, insane: 16 },
    gates: [{ metricKey: 'perfectNotesCount', op: '>=', value: 15 }],
  },
  {
    id: 'steady_hand', icon: '✋',
    nameKey: 'dailyTypes.steady_hand.name', descriptionKey: 'dailyTypes.steady_hand.description', metricKey: 'notesMissed', direction: 'min',
    targets: { easy: 15, normal: 8, hard: 5, very_hard: 3, insane: 1 },
    gates: [{ metricKey: 'notesHit', op: '>=', value: 80 }],
  },
  {
    id: 'titan', icon: '👑',
    nameKey: 'dailyTypes.titan.name', descriptionKey: 'dailyTypes.titan.description', metricKey: 'score', direction: 'max',
    targets: { easy: 7000, normal: 9000, hard: 10500, very_hard: 12000, insane: 14000 },
    gates: [{ metricKey: 'maxCombo', op: '>=', value: 60 }],
  },
] as const satisfies readonly DailyTypeDefinition[];

/** all valid daily challenge type ids */
export type DailyChallengeType = (typeof DAILY_TYPE_LIST)[number]['id'];

/** ordered list of all daily type ids (used for the per-day hash selection) */
export const DAILY_TYPE_IDS: readonly DailyChallengeType[] = DAILY_TYPE_LIST.map(d => d.id);

/** lookup registry for daily type definitions */
export const DAILY_TYPES: Readonly<Record<DailyChallengeType, DailyTypeDefinition>> =
  Object.fromEntries(DAILY_TYPE_LIST.map(d => [d.id, d as DailyTypeDefinition])) as
  Record<DailyChallengeType, DailyTypeDefinition>;

/** selectable difficulty levels for the daily challenge */
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

/** Returns the definition of a daily type (falls back to 'score' for unknown/legacy ids). */
export function getDailyType(type: string): DailyTypeDefinition {
  return (DAILY_TYPES as Record<string, DailyTypeDefinition | undefined>)[type] ?? DAILY_TYPES.score;
}

/** metrics accepted by daily submissions (superset of the classic four) */
export interface DailyResultMetrics {
  score: number;
  accuracy: number;
  tickAccuracy?: number;
  combo: number; // max combo
  perfectNotesCount?: number;
  goldenNotesCount?: number;
  notesHit?: number;
  notesMissed?: number;
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
  }
}

/** Check the (difficulty-independent) gate conditions of a daily type. */
export function checkDailyGates(type: string, m: DailyResultMetrics): boolean {
  const gates = getDailyType(type).gates;
  if (!gates) return true;
  return gates.every(g => {
    const value = metricByKey(g.metricKey, m);
    return g.op === '>=' ? value >= g.value : value <= g.value;
  });
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

/**
 * Generate (or load) the daily challenge.
 * The challenge type is picked deterministically from the date hash across
 * all 22 registered types — the stored entry (if any) always wins so the type
 * stays stable within a day.
 *
 * When `level`/`difficulty` are provided the returned target is scaled for that
 * player/difficulty ({@link getDailyTargetFor}). The stored leaderboard always
 * uses the base (normal, unscaled) target.
 */
export function getDailyChallenge(level?: number, difficulty: DailyDifficulty = 'normal'): DailyChallengeData {
  const today = todayISO();
  const type = DAILY_TYPE_IDS[hashString(today) % DAILY_TYPE_IDS.length];

  // Try to load existing leaderboard
  const stored = getItem(`${DAILY_LEADERBOARD_KEY}_${today}`);
  let challenge: DailyChallengeData;
  if (stored) {
    try {
      challenge = JSON.parse(stored);
    } catch {
      challenge = createEmptyDailyChallenge(today, type);
    }
  } else {
    challenge = createEmptyDailyChallenge(today, type);
  }

  // Apply difficulty + level scaling to the returned copy only
  return {
    ...challenge,
    difficulty,
    target: getDailyTargetFor(challenge.type, difficulty, level),
  };
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
// Submit a challenge result (single-player)
// ---------------------------------------------------------------------------

/**
 * Submit a single-player challenge result.
 *
 * Side-effects:
 * - Updates the daily leaderboard
 * - Recalculates streak & XP (including streak-break penalty) — only when the
 *   target is met at the selected difficulty
 * - Awards badges
 * - Saves the player's best result for today (#1) including which difficulty
 *   levels were met
 */
export function submitChallengeResult(
  player: {
    id: string;
    name: string;
    avatar?: string;
    color: string;
  },
  result: DailyResultMetrics,
  options?: { difficulty?: DailyDifficulty; level?: number },
): {
  challenge: DailyChallengeData;
  stats: PlayerDailyStats;
  xpEarned: number;
  newBadges: DailyBadge[];
  rank: number;
  targetMet: boolean;
  metDifficulties: DailyDifficulty[];
} {
  const difficulty: DailyDifficulty = options?.difficulty ?? 'normal';
  const level = options?.level;
  // Always load with base target (no scaling) for leaderboard consistency
  const challenge = getDailyChallenge();
  const typeDef = getDailyType(challenge.type);
  // Per-player stats: streaks, XP, badges and completions are attributed to
  // the profile that actually played the challenge.
  const stats = getPlayerDailyStats(player.id);
  const today = todayISO();
  const difficultyMultiplier = getDailyDifficultyMultiplier(difficulty);
  // XP starts at 0 — it is only earned when the target is met at the selected
  // difficulty AND this is the player's first qualifying completion today.
  let xpEarned = 0;
  const newBadges: DailyBadge[] = [];

  // Evaluate the attempt against the challenge type (metric + gates + difficulties)
  const evaluation = evaluateDailyAttempt(challenge.type, result, level);
  const targetMet = evaluation.met.includes(difficulty);

  // Entry metrics are direction-agnostic raw values
  const sortMetric = (entry: DailyChallengeEntry): number =>
    extractDailyMetric(challenge.type, entryToMetrics(entry));
  const resultMetric = (): number => evaluation.metric;

  // Check if already completed today
  const existingEntry = challenge.entries.find(e => e.playerId === player.id);
  if (existingEntry) {
    // Update if the challenge-type-specific metric improved
    const better = typeDef.direction === 'min'
      ? resultMetric() < sortMetric(existingEntry)
      : resultMetric() > sortMetric(existingEntry);
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
    // Add new entry
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

  // Sort by the challenge type's metric (direction-aware), then by playerId
  // for a deterministic tiebreaker
  challenge.entries.sort((a, b) => {
    const diff = typeDef.direction === 'min'
      ? sortMetric(a) - sortMetric(b)
      : sortMetric(b) - sortMetric(a);
    if (diff !== 0) return diff;
    return a.playerId.localeCompare(b.playerId);
  });
  challenge.entries.forEach((entry, index) => {
    entry.rank = index + 1;
  });

  const playerRank = challenge.entries.find(e => e.playerId === player.id)?.rank || 0;

  // XP, streak and completions are only awarded when the target is met at the
  // selected difficulty — and only on the first qualifying completion today.
  if (targetMet && stats.lastCompletedDate !== today) {
    // First completion today
    stats.totalCompleted++;
    xpEarned = Math.round(XP_REWARDS.CHALLENGE_COMPLETE * difficultyMultiplier);

    // Streak calculation (shared helper)
    const streak = advanceStreak(stats, xpEarned);
    xpEarned = Math.max(0, xpEarned + streak.xpAdjustment + streak.streakBonusXP);
    stats.lastCompletedDate = today;

    // Top 3 bonus
    if (playerRank <= 3 && playerRank >= 1) {
      xpEarned += XP_REWARDS.TOP_3_BONUS[playerRank - 1];
    } else if (playerRank <= 10) {
      xpEarned += XP_REWARDS.TOP_10_BONUS;
    }

    // Check for streak milestones
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

    // Check for first challenge badge
    if (stats.totalCompleted === 1 && !stats.badges.some(b => b.id === 'first-challenge')) {
      const badge: DailyBadge = {
        ...DAILY_BADGES['first-challenge'],
        unlockedAt: Date.now(),
      };
      stats.badges.push(badge);
      newBadges.push(badge);
    }

    // Check for 30 completions badge
    if (stats.totalCompleted === 30 && !stats.badges.some(b => b.id === 'dedicated')) {
      const badge: DailyBadge = {
        ...DAILY_BADGES['dedicated'],
        unlockedAt: Date.now(),
      };
      stats.badges.push(badge);
      newBadges.push(badge);
    }

    // Check for legendary badge
    if (stats.totalXP + xpEarned >= 10000 && !stats.badges.some(b => b.id === 'legendary')) {
      const badge: DailyBadge = {
        ...DAILY_BADGES['legendary'],
        unlockedAt: Date.now(),
      };
      stats.badges.push(badge);
      newBadges.push(badge);
    }

    // Perfect challenge bonus: 100% accuracy on an accuracy-metric challenge.
    // PERFECT_ACCURACY (99.5, not 100) accounts for floating-point arithmetic
    // where tick-based scoring can produce values like 99.999999999.
    if (typeDef.metricKey === 'accuracy' && evaluation.gatesPass && result.accuracy >= PERFECT_ACCURACY) {
      xpEarned += XP_REWARDS.PERFECT_CHALLENGE;
    }

    // Update weekly progress — reset at week boundary
    const now = new Date();
    const weekStartISO = getMondayISO(now);

    if (stats.lastWeekStart !== weekStartISO) {
      stats.weeklyProgress = [0, 0, 0, 0, 0, 0, 0];
      stats.lastWeekStart = weekStartISO;
    }
    // Convert JS day (0=Sun) to Monday-based index (0=Mon, 6=Sun)
    const weekIndex = getMondayIndex(now);
    stats.weeklyProgress[weekIndex] = 1;

    stats.totalXP += xpEarned;

    // (#5) Update quest stats for daily challenge completion
    updateQuestProgress('dailyCompleted', 1, player.id);

  } else {
    // Same-day replay or target not met — no XP/streak, but still check
    // rank-based badges in case the player improved their metric and moved
    // into top 3 or #1
  }

  // Rank-based badges: checked on EVERY submission (not just first completion)
  // so a same-day score improvement that moves the player into #1 or top 3
  // still awards the corresponding badge.
  if (playerRank === 1 && !stats.badges.some(b => b.id === 'champion')) {
    const badge: DailyBadge = {
      ...DAILY_BADGES['champion'],
      unlockedAt: Date.now(),
    };
    stats.badges.push(badge);
    newBadges.push(badge);
  }
  if (playerRank <= 3 && !stats.badges.some(b => b.id === 'top-3')) {
    const badge: DailyBadge = {
      ...DAILY_BADGES['top-3'],
      unlockedAt: Date.now(),
    };
    stats.badges.push(badge);
    newBadges.push(badge);
  }

  // Save data
  saveDailyChallenge(challenge);
  savePlayerDailyStats(stats, player.id);

  // Legacy shared completion flag — kept in sync for backward compatibility.
  // Per-player completion is derived from the best result's met difficulties.
  setJson(DAILY_CHALLENGE_KEY, {
    date: today,
    completed: evaluation.met.length > 0,
    streak: stats.currentStreak,
  });

  // (#1) Save best result for this player today — metrics update when the
  // type metric improved; met difficulties are always merged (union).
  const existingBest = getPlayerBestResult(player.id);
  const mergedMet = Array.from(new Set([
    ...(existingBest?.metDifficulties ?? []),
    ...evaluation.met,
  ]));
  const improved = !existingBest || (() => {
    const prev = getBestMetric(existingBest, challenge.type);
    return typeDef.direction === 'min' ? evaluation.metric < prev : evaluation.metric > prev;
  })();
  if (improved) {
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
    });
  } else if (mergedMet.length > (existingBest?.metDifficulties?.length ?? 0)) {
    // Metric did not improve, but new difficulties were met — persist the union
    savePlayerBestResult(player.id, {
      ...(existingBest as PlayerBestResult),
      targetMet: true,
      metDifficulties: mergedMet,
    });
  }

  return { challenge, stats, xpEarned, newBadges, rank: playerRank, targetMet, metDifficulties: mergedMet };
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
// (#6) Co-op Challenge Submission
// ---------------------------------------------------------------------------

/**
 * Submit a co-op (2-player) challenge result.
 *
 * The co-op result uses the AVERAGE of both players' metrics.
 * XP is awarded to both players (added to the shared global stats once).
 * Daily completion is only awarded if the AVERAGE meets the target at the
 * selected difficulty.
 */
export function submitCoopChallengeResult(
  players: Array<{ id: string; name: string; avatar?: string; color: string }>,
  results: Array<DailyResultMetrics>,
  options?: { difficulty?: DailyDifficulty; level?: number },
): { challenge: DailyChallengeData; xpEarned: number; newBadges: DailyBadge[]; targetMet: boolean; metDifficulties: DailyDifficulty[] } {
  if (players.length < 2 || results.length < 2) {
    throw new Error('Co-op requires at least 2 players and 2 results');
  }

  const difficulty: DailyDifficulty = options?.difficulty ?? 'normal';
  const level = options?.level;
  const challenge = getDailyChallenge();
  const typeDef = getDailyType(challenge.type);
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

  const avgMetrics: DailyResultMetrics = {
    score: avgScore,
    accuracy: avgAccuracy,
    tickAccuracy: avgTickAccuracy,
    combo: avgCombo,
    perfectNotesCount: avgPerfectNotes,
    goldenNotesCount: avgGoldenNotes,
    notesHit: avgNotesHit,
    notesMissed: avgNotesMissed,
  };

  // Evaluate the averaged attempt (metric + gates + met difficulties)
  const evaluation = evaluateDailyAttempt(challenge.type, avgMetrics, level);
  const targetMet = evaluation.met.includes(difficulty);

  // Determine challenge-type metric from the average
  const sortMetric = (entry: DailyChallengeEntry): number =>
    extractDailyMetric(challenge.type, entryToMetrics(entry));
  const avgMetric = (): number => evaluation.metric;

  // Add entries for each player with averaged metrics
  for (let i = 0; i < players.length; i++) {
    const p = players[i];
    const existing = challenge.entries.find(e => e.playerId === p.id);

    if (existing) {
      const better = typeDef.direction === 'min'
        ? avgMetric() < sortMetric(existing)
        : avgMetric() > sortMetric(existing);
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

  // Sort and rank (direction-aware)
  challenge.entries.sort((a, b) => {
    const diff = typeDef.direction === 'min'
      ? sortMetric(a) - sortMetric(b)
      : sortMetric(b) - sortMetric(a);
    if (diff !== 0) return diff;
    return a.playerId.localeCompare(b.playerId);
  });
  challenge.entries.forEach((entry, index) => {
    entry.rank = index + 1;
  });

  // Check if the best rank among co-op players earns badges — XP, streak and
  // badges are applied to EACH co-op player's own per-player stats.
  const bestRank = Math.min(
    ...players.map(p => challenge.entries.find(e => e.playerId === p.id)?.rank ?? Infinity),
  );

  // Award XP if average meets the target at the selected difficulty
  let xpEarned = 0;

  for (const p of players) {
    const stats = getPlayerDailyStats(p.id);

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

    if (targetMet && stats.lastCompletedDate !== today) {
      const playerXP = Math.round(XP_REWARDS.CHALLENGE_COMPLETE * difficultyMultiplier);
      const streak = advanceStreak(stats, playerXP);
      const earned = Math.max(0, playerXP + streak.xpAdjustment + streak.streakBonusXP);
      stats.totalXP += earned;
      stats.lastCompletedDate = today;
      stats.totalCompleted++;

      // Update weekly progress — reset at week boundary
      const coopNow = new Date();
      const coopWeekStartISO = getMondayISO(coopNow);

      if (stats.lastWeekStart !== coopWeekStartISO) {
        stats.weeklyProgress = [0, 0, 0, 0, 0, 0, 0];
        stats.lastWeekStart = coopWeekStartISO;
      }
      // Convert JS day (0=Sun) to Monday-based index (0=Mon, 6=Sun)
      const coopWeekIndex = getMondayIndex(coopNow);
      stats.weeklyProgress[coopWeekIndex] = 1;

      // (#5) Update quest stats for daily challenge completion
      updateQuestProgress('dailyCompleted', 1, p.id);

      if (p === players[0]) xpEarned = earned;
    }

    savePlayerDailyStats(stats, p.id);
  }

  if (targetMet && xpEarned === 0) xpEarned = Math.round(XP_REWARDS.CHALLENGE_COMPLETE * difficultyMultiplier);

  saveDailyChallenge(challenge);

  // (#1) Save best results for each co-op player — metrics when better,
  // met difficulties always merged (union)
  const coopMetric = avgMetric();
  for (let i = 0; i < players.length; i++) {
    const existingBest = getPlayerBestResult(players[i].id);
    const mergedMet = Array.from(new Set([
      ...(existingBest?.metDifficulties ?? []),
      ...evaluation.met,
    ]));
    const better = !existingBest || (() => {
      const prev = getBestMetric(existingBest, challenge.type);
      return typeDef.direction === 'min' ? coopMetric < prev : coopMetric > prev;
    })();
    if (better) {
      savePlayerBestResult(players[i].id, {
        playerId: players[i].id,
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
      });
    } else if (mergedMet.length > (existingBest?.metDifficulties?.length ?? 0)) {
      savePlayerBestResult(players[i].id, {
        ...(existingBest as PlayerBestResult),
        targetMet: true,
        metDifficulties: mergedMet,
      });
    }
  }

  // Mark challenge completed if any difficulty target met
  if (evaluation.met.length > 0) {
    setJson(DAILY_CHALLENGE_KEY, {
      date: today,
      completed: true,
      streak: getPlayerDailyStats(players[0].id).currentStreak,
    });
  }

  return { challenge, xpEarned, newBadges, targetMet, metDifficulties: evaluation.met };
}

// ---------------------------------------------------------------------------
// (#4) Weekly Challenge System
// ---------------------------------------------------------------------------

/** Base targets for weekly challenges (before level scaling). */
const WEEKLY_BASE_TARGETS: Record<WeeklyChallengeData['type'], number> = {
  score: 7500,
  accuracy: 90,
  combo: 75,
  songs_completed: 3,
};

/** Human-readable descriptions for each weekly challenge type. */
const WEEKLY_DESCRIPTIONS: Record<WeeklyChallengeData['type'], string> = {
  score: 'Score {target} points in a single song',
  accuracy: 'Achieve {target}% accuracy in a single song',
  combo: 'Hit a {target}-note combo in a single song',
  songs_completed: 'Complete {target} songs this week',
};

/** Save weekly challenge data to localStorage. */
function saveWeeklyChallenge(data: WeeklyChallengeData): void {
  setJson(`${WEEKLY_CHALLENGE_KEY_PREFIX}${data.weekNumber}_${data.year}`, data);
}

/**
 * Get (or generate) the current weekly challenge.
 * When `level` is provided the returned target is scaled via {@link getTargetForLevel}.
 * The stored challenge always uses the base target.
 */
export function getWeeklyChallenge(level?: number): WeeklyChallengeData {
  const now = new Date();
  const weekNumber = getISOWeek(now);
  const year = now.getFullYear();
  const storageKey = `${WEEKLY_CHALLENGE_KEY_PREFIX}${weekNumber}_${year}`;

  const stored = getJson<WeeklyChallengeData | null>(storageKey, null);
  if (stored && stored.weekNumber === weekNumber && stored.year === year) {
    if (level !== undefined) {
      return {
        ...stored,
        target: getTargetForLevel(stored.target, level),
      };
    }
    return stored;
  }

  // Generate a new weekly challenge seeded by ISO week
  const seed = `${year}-${weekNumber}`;
  const types: Array<WeeklyChallengeData['type']> =
    ['score', 'accuracy', 'combo', 'songs_completed'];
  const type = types[hashString(seed) % types.length];
  const baseTarget = WEEKLY_BASE_TARGETS[type];

  const challenge: WeeklyChallengeData = {
    weekNumber,
    year,
    type,
    target: baseTarget,
    description: WEEKLY_DESCRIPTIONS[type].replace('{target}', String(baseTarget)),
    entries: [],
  };

  saveWeeklyChallenge(challenge);

  if (level !== undefined) {
    return {
      ...challenge,
      target: getTargetForLevel(challenge.target, level),
    };
  }
  return challenge;
}

/**
 * Submit a result to the weekly challenge.
 *
 * The `challengeType` determines which metric is extracted from `result`.
 * XP is only awarded when the metric meets the weekly challenge's base target
 * and the player has not already qualified this week.
 *
 * For `songs_completed`, submissions are cumulative — each call counts as one
 * additional song completed this week.
 */
export function submitWeeklyChallengeResult(
  player: {
    id: string;
    name: string;
    avatar?: string;
    color: string;
  },
  result: {
    score: number;
    accuracy: number;
    combo: number;
    perfectNotesCount?: number;
  },
  challengeType: WeeklyChallengeData['type'],
): { challenge: WeeklyChallengeData; xpEarned: number } {
  // Load with base target (no level scaling) for consistent comparisons
  const challenge = getWeeklyChallenge();
  let xpEarned = 0;

  // Only process if the submitted type matches the weekly challenge type
  if (challengeType !== challenge.type) {
    return { challenge, xpEarned: 0 };
  }

  // Player's existing entries this week
  const playerEntries = challenge.entries.filter(e => e.playerId === player.id);
  const alreadyQualified = playerEntries.some(e => e.metric >= challenge.target);

  // Calculate metric
  let metric: number;
  switch (challengeType) {
    case 'score':
      metric = result.score;
      break;
    case 'accuracy':
      metric = result.accuracy;
      break;
    case 'combo':
      metric = result.combo;
      break;
    case 'songs_completed':
      // Cumulative: count existing entries + 1
      metric = playerEntries.length + 1;
      break;
  }

  // Add entry
  challenge.entries.push({
    playerId: player.id,
    playerName: player.name,
    playerAvatar: player.avatar,
    playerColor: player.color,
    metric,
    completedAt: Date.now(),
  });

  // Award XP if target is met for the first time
  if (!alreadyQualified && metric >= challenge.target) {
    xpEarned = WEEKLY_XP_REWARD;
    const stats = getPlayerDailyStats(player.id);
    stats.totalXP += xpEarned;
    stats.weeklyCompletedTotal = (stats.weeklyCompletedTotal ?? 0) + 1;
    savePlayerDailyStats(stats, player.id);

    // (#5) Update quest stats for weekly challenge completion
    updateQuestProgress('weeklyCompleted', 1, player.id);
  }

  saveWeeklyChallenge(challenge);
  return { challenge, xpEarned };
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
  const storageKey = `${WEEKLY_CHALLENGE_KEY_PREFIX}${weekNumber}_${year}`;

  const stored = getJson<WeeklyChallengeData | null>(storageKey, null);
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
    // Per-player completion is derived from today's best result
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

/** All difficulty levels the player has met today (for the ✓ chips in the UI). */
export function getCompletedDifficultiesToday(playerId?: string): DailyDifficulty[] {
  if (!playerId) return [];
  const best = getPlayerBestResult(playerId);
  if (!best || !best.metDifficulties) {
    // Legacy entries: a stored targetMet counts as 'normal' met
    return best?.targetMet ? ['normal'] : [];
  }
  return best.metDifficulties.filter(d => DAILY_DIFFICULTIES.some(x => x.id === d));
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
