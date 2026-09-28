// Daily Challenge Leaderboard System — barrel re-export.
// Global rankings, XP system, streak rewards, weekly challenges, and quests
//
// The implementation now lives in ./daily-challenge/ (types, registry, gates,
// evaluation, slots, weekly, quests, …) — this file keeps the import path
// '@/lib/game/daily-challenge' (and relative './daily-challenge') stable for
// all existing importers.
export * from './daily-challenge/index';
