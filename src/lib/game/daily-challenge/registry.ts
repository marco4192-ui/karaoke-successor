// Daily Challenge — data registries & constants
//
// Part of the daily-challenge module (see ./index.ts).
// The 200 daily / 100 weekly challenge VARIANTS live in ../challenge-pools.ts;
// this module builds the lookup registries on top of those pools.

import {
  DAILY_TYPE_LIST,
  WEEKLY_TYPE_LIST,
  type DailyDifficulty,
  type DailyTypeDefinition,
  type WeeklyTypeDefinition,
} from '../challenge-pools';

// NOTE: DailyDifficulty now lives in challenge-pools.ts and is re-exported
// from ./types.

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

/** The 200 daily challenge variants now live in challenge-pools.ts. */
// (DAILY_TYPE_LIST is imported from ../challenge-pools)

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
