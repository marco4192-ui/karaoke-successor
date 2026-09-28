// Daily Challenge Leaderboard System
// Global rankings, XP system, streak rewards, weekly challenges, and quests
//
// Module map (split off from the former single daily-challenge.ts):
//   - types.ts        interfaces & type aliases (+ pool-type re-exports)
//   - date-utils.ts   todayISO, yesterdayISO, hashString, getISOWeek, etc.
//   - storage-keys.ts localStorage keys & per-profile key builders
//   - registry.ts     DAILY_TYPES/WEEKLY_TYPES lookup, difficulties, XP constants
//   - badges.ts       DAILY_BADGES definitions
//   - localization.ts localized badge/quest/streak-milestone names
//   - gates.ts        checkDailyGates/checkWeeklyGates/extract*Metric
//   - evaluation.ts   targets, evaluateDailyAttempt, difficulty multiplier
//   - stats.ts        per-player daily stats (streaks, XP, badges)
//   - slots.ts        5 daily slots + today's challenge data
//   - best-results.ts per-player best results & metric helpers
//   - quests.ts       quest definitions, progress, claiming rewards
//   - submission.ts   single-player + co-op result submission
//   - weekly.ts       weekly challenge system (100 types, 5 slots)
//   - utils.ts        completion checks, XP level, reset timers
//
// The legacy import path '@/lib/game/daily-challenge' keeps working via the
// barrel file src/lib/game/daily-challenge.ts.

export * from './types';
export * from './date-utils';
export * from './storage-keys';
export * from './registry';
export * from './badges';
export * from './localization';
export * from './gates';
export * from './evaluation';
export * from './stats';
export * from './slots';
export * from './best-results';
export * from './quests';
export * from './submission';
export * from './weekly';
export * from './utils';
