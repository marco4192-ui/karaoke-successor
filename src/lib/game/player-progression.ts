// Player Progression System — Barrel
// Re-exports from split modules for backward-compatible imports.
// See: progression-levels.ts, progression-achievements.ts, progression-stats.ts

export {
  // Level calculations & XP thresholds
  PERFECT_ACCURACY,
  EXCELLENT_ACCURACY,
  COMBO_MILESTONE_1,
  COMBO_MILESTONE_2,
  COMBO_MILESTONE_3,
  XP_PER_LEVEL_TIER_1,
  XP_PER_LEVEL_TIER_2,
  XP_PER_LEVEL_TIER_3,
  XP_PER_LEVEL_TIER_4,
  XP_PER_LEVEL_TIER_5,
  LEVEL_TIER_1_MAX,
  LEVEL_TIER_2_MAX,
  LEVEL_TIER_3_MAX,
  LEVEL_TIER_4_MAX,
  // Ranks
  type Rank,
  RANKS,
  // Challenge definitions
  type ChallengeModifier,
  type ChallengeMode,
  CHALLENGE_MODES,
  CHALLENGE_GAME_MODE_MAP,
  // Challenge Mixer
  type CustomChallengeConfig,
  createCustomChallenge,
  AVAILABLE_MODIFIERS,
  // XP functions
  calculateSongXP,
  getRankForXP,
  getLevelForXP,
} from './progression-levels';

export {
  // Title thresholds
  TITLE_RISING_STAR_LEVEL,
  TITLE_VETERAN_LEVEL,
  TITLE_ELITE_LEVEL,
  TITLE_MASTER_LEVEL,
  TITLE_GOLDEN_VOICE_NOTES,
  TITLE_COMBO_MASTER_COMBO,
  TITLE_DEDICATED_SINGER_SONGS,
  TITLE_KARAOKE_ADDICT_SONGS,
  TITLE_LIFETIME_ACHIEVER_SONGS,
  // Challenge requirement checking
  getChallengeRequirementStatus,
} from './progression-achievements';

export {
  // Player statistics
  type ExtendedPlayerStats,
  // Persistence
  getExtendedStats,
  saveExtendedStats,
  // Game update
  updateStatsAfterGame,
} from './progression-stats';
