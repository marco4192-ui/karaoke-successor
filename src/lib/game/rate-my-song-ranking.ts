/**
 * Rate my Song — Barrel Re-exports
 *
 * Ranking, Highscore persistence, Player Stats,
 * Ranks, Achievements, AI Critic Comments, Challenge Cards & Song Suggestions
 *
 * Split into focused modules:
 *  - rate-my-song-ranking-core.ts  — Core ranking & daily highscore
 *  - rate-my-song-stats.ts         — Player statistics & rank system
 *  - rate-my-song-achievements.ts  — Achievement definitions & checking
 *  - rate-my-song-critic.ts        — AI critic comments
 *  - rate-my-song-challenges.ts    — Challenge cards
 *  - rate-my-song-suggestions.ts   — Song suggestions
 */

// Core ranking & daily highscore
export {
  addRateMySongEntry,
  getRateMySongTopN,
  addDailyRateMySongEntry,
  getDailyRateMySongTopN,
  getTodayString,
  type RateMySongEntry,
  type RateMySongDailyEntry,
} from './rate-my-song-ranking-core';

// Player statistics & rank system
export {
  getRateMySongPlayerStats,
  updateRateMySongPlayerStats,
  addAudienceRatingToStats,
  getPlayerRank,
  type RateMySongPlayerStats,
  type RateMySongRank,
  type RankResult,
} from './rate-my-song-stats';

// Achievements
export {
  RATE_MY_SONG_ACHIEVEMENTS,
  checkRateMySongAchievements,
  getAchievementById,
  type Achievement,
} from './rate-my-song-achievements';

// AI critic comments
export {
  getAICriticComment,
} from './rate-my-song-critic';

// Challenge cards
export {
  RATE_MY_SONG_CHALLENGES,
  getRandomChallenge,
  type RateMySongChallenge,
} from './rate-my-song-challenges';

// Song suggestions
export {
  getSongSuggestions,
  type SongSuggestion,
} from './rate-my-song-suggestions';
