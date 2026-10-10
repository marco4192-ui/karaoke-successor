// R1 equivalence check: every runtime export of the former single-file
// daily-challenge.ts must still be exported by the new barrel module.
// Run: bun run tmp-analysis/check-dc-exports.ts
import * as DC from '../src/lib/game/daily-challenge';

const REQUIRED = [
  'XP_REWARDS', 'WEEKLY_XP_REWARD', 'DAILY_TYPE_IDS', 'DAILY_TYPES', 'WEEKLY_TYPES',
  'getWeeklyType', 'getDailyType', 'DAILY_DIFFICULTIES', 'WEEKLY_DIFFICULTIES',
  'DAILY_SLOTS_PER_DAY', 'WEEKLY_SLOTS_PER_WEEK', 'SLOT_BADGE_TIERS', 'DAILY_SLOT_XP_BONUS',
  'WEEKLY_SLOT_XP', 'interpolateChallengeText', 'DAILY_BADGES', 'DAILY_QUESTS',
  'getLocalizedDailyBadge', 'getLocalizedDailyQuest', 'getLocalizedStreakMilestone',
  'getDailySlots', 'getPlayerDailySlotProgress', 'isDailySlotUnlocked', 'getActiveDailySlot',
  'getDailyBadgeTierToday', 'getWeeklyBadgeTierThisWeek', 'getDailyChallengeForSlot',
  'getDailyChallenge', 'getTargetForLevel', 'getPlayerDailyStats', 'getPlayerBestResult',
  'savePlayerBestResult', 'submitChallengeResult', 'getBestResultMetric',
  'submitCoopChallengeResult', 'getWeeklySlots', 'getWeeklyChallenge', 'getWeeklyChallengeForSlot',
  'getPlayerWeeklySlotProgress', 'isWeeklySlotUnlocked', 'getActiveWeeklySlot',
  'submitWeeklyChallengeResult', 'isWeeklyChallengeCompletedToday', 'getTimeUntilWeeklyReset',
  'getPlayerQuestStats', 'getQuestProgress', 'updateQuestProgress', 'claimQuestReward',
  'getActiveQuests', 'isChallengeCompletedToday', 'getCompletedDifficultiesToday',
  'getSlotMetDifficulties', 'getXPLevel', 'getTimeUntilReset',
];

const missing = REQUIRED.filter(name => (DC as Record<string, unknown>)[name] === undefined);
if (missing.length > 0) {
  console.error('MISSING EXPORTS:', missing.join(', '));
  process.exit(1);
}

// Spot-check the registries loaded from challenge-pools
if (DC.DAILY_TYPE_IDS.length !== 200 || DC.WEEKLY_TYPES === undefined || DC.DAILY_TYPES.score === undefined) {
  console.error('Sanity check failed');
  process.exit(1);
}
console.log(`OK: all ${REQUIRED.length} runtime exports present via barrel. DAILY_TYPE_IDS.length=${DC.DAILY_TYPE_IDS.length}, DAILY_TYPES keys=${Object.keys(DC.DAILY_TYPES).length}, WEEKLY_TYPES keys=${Object.keys(DC.WEEKLY_TYPES).length}, DAILY_QUESTS=${DC.DAILY_QUESTS.length}, DAILY_BADGES=${Object.keys(DC.DAILY_BADGES).length}, DIFFICULTIES=${DC.DAILY_DIFFICULTIES.length}`);
