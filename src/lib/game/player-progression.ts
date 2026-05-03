// Player Progression System
// XP, Levels, Ranks, Titles, and Extended Statistics

import type { GameMode } from '@/types/game';

// ===================== NAMED CONSTANTS =====================

// --- Accuracy thresholds ---
/** Accuracy percentage required for "perfect" rating.
 *  Uses 99.5 (not 100) because tick-based scoring with floating-point
 *  arithmetic makes exact 100.0% practically impossible. */
const PERFECT_ACCURACY = 99.5;
/** Accuracy percentage required for "excellent" rating */
const EXCELLENT_ACCURACY = 95;

// --- Combo thresholds ---
/** Combo count that awards the first combo milestone XP */
const COMBO_MILESTONE_1 = 50;
/** Combo count that awards the second combo milestone XP */
const COMBO_MILESTONE_2 = 100;
/** Combo count that awards the third combo milestone XP */
const COMBO_MILESTONE_3 = 200;

// --- Level XP requirements (per level within tier) ---
/** XP required per level for levels 1 through TIER_1_MAX-1 */
const XP_PER_LEVEL_TIER_1 = 500;
/** XP required per level for levels TIER_1_MAX through TIER_2_MAX-1 */
const XP_PER_LEVEL_TIER_2 = 1000;
/** XP required per level for levels TIER_2_MAX through TIER_3_MAX-1 */
const XP_PER_LEVEL_TIER_3 = 2000;
/** XP required per level for levels TIER_3_MAX through TIER_4_MAX-1 */
const XP_PER_LEVEL_TIER_4 = 4000;
/** XP required per level for levels TIER_4_MAX and above */
const XP_PER_LEVEL_TIER_5 = 8000;

// --- Level tier boundaries (exclusive upper bound for the lower tier) ---
const LEVEL_TIER_1_MAX = 10;
const LEVEL_TIER_2_MAX = 25;
const LEVEL_TIER_3_MAX = 50;
const LEVEL_TIER_4_MAX = 100;

// --- Title unlock thresholds ---
/** Level required to unlock "Rising Star" title */
const TITLE_RISING_STAR_LEVEL = 5;
/** Level required to unlock "Veteran" title */
const TITLE_VETERAN_LEVEL = 25;
/** Level required to unlock "Elite" title */
const TITLE_ELITE_LEVEL = 50;
/** Level required to unlock "Master" title */
const TITLE_MASTER_LEVEL = 100;

/** Total golden notes to unlock "Golden Voice" title */
const TITLE_GOLDEN_VOICE_NOTES = 100;
/** Max combo to unlock "Combo Master" title */
const TITLE_COMBO_MASTER_COMBO = 100;
/** Songs completed to unlock "Dedicated Singer" title */
const TITLE_DEDICATED_SINGER_SONGS = 100;
/** Songs completed to unlock "Karaoke Addict" title */
const TITLE_KARAOKE_ADDICT_SONGS = 500;
/** Songs completed to unlock "Lifetime Achiever" title */
const TITLE_LIFETIME_ACHIEVER_SONGS = 1000;

// --- Miscellaneous ---
/** Maximum number of recent games stored in history */
const MAX_RECENT_GAMES = 20;

// ===================== RANKS & TITLES =====================

interface Rank {
  id: string;
  name: string;
  icon: string;
  minXP: number;
  maxXP: number;
  color: string;
  titles: string[]; // Unlockable titles at this rank
}

interface Title {
  id: string;
  name: string;
  icon: string;
  description: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';
  unlockCondition: string;
  category: 'achievement' | 'skill' | 'dedication' | 'special' | 'challenge';
}

const RANKS: Rank[] = [
  { id: 'beginner', name: 'Beginner', icon: '🎵', minXP: 0, maxXP: 499, color: '#9CA3AF', titles: ['Newcomer'] },
  { id: 'novice', name: 'Novice', icon: '🎤', minXP: 500, maxXP: 1499, color: '#6B7280', titles: ['Rising Star'] },
  { id: 'apprentice', name: 'Apprentice', icon: '🌟', minXP: 1500, maxXP: 2999, color: '#22C55E', titles: ['Melody Maker'] },
  { id: 'singer', name: 'Singer', icon: '💫', minXP: 3000, maxXP: 4999, color: '#14B8A6', titles: ['Voice in Training'] },
  { id: 'performer', name: 'Performer', icon: '✨', minXP: 5000, maxXP: 7999, color: '#3B82F6', titles: ['Stage Presence'] },
  { id: 'artist', name: 'Artist', icon: '🎭', minXP: 8000, maxXP: 11999, color: '#8B5CF6', titles: ['Artistic Soul'] },
  { id: 'star', name: 'Star', icon: '⭐', minXP: 12000, maxXP: 17999, color: '#EC4899', titles: ['Shining Star'] },
  { id: 'superstar', name: 'Superstar', icon: '🌟', minXP: 18000, maxXP: 24999, color: '#F59E0B', titles: ['Crowd Favorite'] },
  { id: 'legend', name: 'Legend', icon: '👑', minXP: 25000, maxXP: 49999, color: '#EF4444', titles: ['Legendary Voice'] },
  { id: 'icon', name: 'Icon', icon: '💎', minXP: 50000, maxXP: 99999, color: '#F97316', titles: ['Musical Icon'] },
  { id: 'mythic', name: 'Mythic', icon: '🔮', minXP: 100000, maxXP: 199999, color: '#A855F7', titles: ['Mythic Singer'] },
  { id: 'divine', name: 'Divine', icon: '🌟', minXP: 200000, maxXP: Infinity, color: '#FFD700', titles: ['Divine Voice'] },
];

const TITLES: Title[] = [
  // Skill-based titles
  { id: 'perfect-pitch', name: 'Perfect Pitch', icon: '🎯', description: 'Achieve 100% accuracy on a song', rarity: 'legendary', unlockCondition: 'Get 100% accuracy', category: 'skill' },
  { id: 'golden-voice', name: 'Golden Voice', icon: '✨', description: 'Hit 100 golden notes', rarity: 'epic', unlockCondition: 'Hit 100 golden notes', category: 'skill' },
  { id: 'combo-master', name: 'Combo Master', icon: '⚡', description: 'Achieve a 100x combo', rarity: 'rare', unlockCondition: 'Get 100x combo', category: 'skill' },
  { id: 'pitch-perfect', name: 'Pitch Perfect', icon: '🎼', description: 'Hit 50 perfect notes in a row', rarity: 'rare', unlockCondition: '50 consecutive perfect notes', category: 'skill' },
  
  // Dedication titles
  { id: 'dedicated-singer', name: 'Dedicated Singer', icon: '🎤', description: 'Complete 100 songs', rarity: 'uncommon', unlockCondition: 'Complete 100 songs', category: 'dedication' },
  { id: 'karaoke-addict', name: 'Karaoke Addict', icon: '🎵', description: 'Complete 500 songs', rarity: 'rare', unlockCondition: 'Complete 500 songs', category: 'dedication' },
  { id: 'lifetime-achiever', name: 'Lifetime Achiever', icon: '🏆', description: 'Complete 1000 songs', rarity: 'legendary', unlockCondition: 'Complete 1000 songs', category: 'dedication' },
  { id: 'weekly-warrior', name: 'Weekly Warrior', icon: '📅', description: '7-day daily challenge streak', rarity: 'uncommon', unlockCondition: '7-day streak', category: 'dedication' },
  { id: 'monthly-master', name: 'Monthly Master', icon: '🗓️', description: '30-day daily challenge streak', rarity: 'epic', unlockCondition: '30-day streak', category: 'dedication' },
  { id: 'yearly-legend', name: 'Yearly Legend', icon: '⭐', description: '365-day daily challenge streak', rarity: 'mythic', unlockCondition: '365-day streak', category: 'dedication' },
  
  // Achievement titles
  { id: 'first-steps', name: 'First Steps', icon: '👣', description: 'Complete your first song', rarity: 'common', unlockCondition: 'Complete first song', category: 'achievement' },
  { id: 'rising-star', name: 'Rising Star', icon: '🌟', description: 'Reach level 5', rarity: 'uncommon', unlockCondition: 'Reach level 5', category: 'achievement' },
  { id: 'veteran', name: 'Veteran', icon: '🎖️', description: 'Reach level 25', rarity: 'rare', unlockCondition: 'Reach level 25', category: 'achievement' },
  { id: 'elite', name: 'Elite', icon: '🏅', description: 'Reach level 50', rarity: 'epic', unlockCondition: 'Reach level 50', category: 'achievement' },
  { id: 'master', name: 'Master', icon: '👑', description: 'Reach level 100', rarity: 'legendary', unlockCondition: 'Reach level 100', category: 'achievement' },
  
  // Challenge titles
  { id: 'challenge-champion', name: 'Challenge Champion', icon: '🏆', description: 'Win 10 daily challenges', rarity: 'epic', unlockCondition: 'Win 10 daily challenges', category: 'challenge' },
  { id: 'top-10-regular', name: 'Top 10 Regular', icon: '📊', description: 'Finish top 10 fifty times', rarity: 'rare', unlockCondition: 'Top 10 fifty times', category: 'challenge' },
  { id: 'challenger', name: 'Challenger', icon: '⚔️', description: 'Complete 50 challenges', rarity: 'uncommon', unlockCondition: 'Complete 50 challenges', category: 'challenge' },
  
  // Special titles
  { id: 'night-owl', name: 'Night Owl', icon: '🦉', description: 'Sing 50 songs between midnight and 4am', rarity: 'rare', unlockCondition: 'Sing late at night', category: 'special' },
  { id: 'early-bird', name: 'Early Bird', icon: '🐦', description: 'Sing 50 songs between 5am and 8am', rarity: 'rare', unlockCondition: 'Sing early morning', category: 'special' },
  { id: 'marathon-runner', name: 'Marathon Runner', icon: '🏃', description: 'Sing for 5 hours total', rarity: 'epic', unlockCondition: '5 hours total sing time', category: 'special' },
  { id: 'iron-lungs', name: 'Iron Lungs', icon: '💪', description: 'Sing for 24 hours total', rarity: 'legendary', unlockCondition: '24 hours total sing time', category: 'special' },
  { id: 'genre-hopper', name: 'Genre Hopper', icon: '🎭', description: 'Sing songs from 10 different genres', rarity: 'rare', unlockCondition: '10 different genres', category: 'special' },
  { id: 'duet-expert', name: 'Duet Expert', icon: '👥', description: 'Complete 50 duets', rarity: 'rare', unlockCondition: 'Complete 50 duets', category: 'special' },
];

// ===================== CHALLENGE MODES =====================

interface ChallengeMode {
  id: string;
  name: string;
  description: string;
  icon: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'extreme';
  modifiers: ChallengeModifier[];
  xpReward: number;
  timeLimit?: number; // seconds
  requirements?: ChallengeRequirement[];
}

interface ChallengeModifier {
  type: 'no_lyrics' | 'no_pitch_guide' | 'double_speed' | 'half_speed' | 'pitch_shift' | 'blind' | 'missing_words' | 'golden_only' | 'perfect_only';
  value?: number;
  description: string;
}

interface ChallengeRequirement {
  type: 'min_level' | 'min_songs' | 'achievement' | 'rank';
  value: number | string;
}

export const CHALLENGE_MODES: ChallengeMode[] = [
  {
    id: 'blind-audition',
    name: 'Blind Audition',
    description: 'Sing without seeing the lyrics - memory test!',
    icon: '🙈',
    difficulty: 'medium',
    modifiers: [{ type: 'no_lyrics', description: 'Lyrics are hidden' }],
    xpReward: 200,
  },
  {
    id: 'no-guide',
    name: 'Free Flight',
    description: 'No pitch guide - sing by ear!',
    icon: '✈️',
    difficulty: 'hard',
    modifiers: [{ type: 'no_pitch_guide', description: 'Pitch guide is hidden' }],
    xpReward: 300,
  },
  {
    id: 'speed-demon',
    name: 'Speed Demon',
    description: '1.5x speed - think fast!',
    icon: '⚡',
    difficulty: 'hard',
    modifiers: [{ type: 'double_speed', value: 1.5, description: 'Song plays at 1.5x speed' }],
    xpReward: 350,
    timeLimit: 180,
  },
  {
    id: 'perfectionist',
    name: 'Perfectionist',
    description: 'Only perfect notes count!',
    icon: '💎',
    difficulty: 'extreme',
    modifiers: [{ type: 'perfect_only', description: 'Only perfect hits give points' }],
    xpReward: 500,
    requirements: [{ type: 'min_level', value: 10 }],
  },
  {
    id: 'golden-hunter',
    name: 'Golden Hunter',
    description: 'Only golden notes give points - catch them all!',
    icon: '🌟',
    difficulty: 'hard',
    modifiers: [{ type: 'golden_only', description: 'Only golden notes count' }],
    xpReward: 400,
  },
  {
    id: 'memory-lane',
    name: 'Memory Lane',
    description: 'Missing words challenge - fill in the blanks!',
    icon: '🧩',
    difficulty: 'medium',
    modifiers: [{ type: 'missing_words', value: 20, description: '20% of words are hidden' }],
    xpReward: 250,
  },
  {
    id: 'pitch-shift',
    name: 'Pitch Shift',
    description: 'Song is transposed - adapt your voice!',
    icon: '🎚️',
    difficulty: 'hard',
    modifiers: [{ type: 'pitch_shift', value: 3, description: 'Pitch shifted by 3 semitones' }],
    xpReward: 300,
  },
  {
    id: 'ultimate',
    name: 'Ultimate Challenge',
    description: 'All modifiers combined - for the brave!',
    icon: '🔥',
    difficulty: 'extreme',
    modifiers: [
      { type: 'no_lyrics', description: 'No lyrics' },
      { type: 'no_pitch_guide', description: 'No pitch guide' },
      { type: 'double_speed', value: 1.25, description: '1.25x speed' },
    ],
    xpReward: 1000,
    requirements: [{ type: 'min_level', value: 25 }],
  },
];

/**
 * Map challenge mode IDs to the corresponding built-in GameMode strings.
 * Only challenges whose modifiers already have a full game implementation
 * are mapped here. Challenges without a mapping will play in 'standard' mode
 * (the XP bonus is still awarded via calculateSongXP).
 *
 * TODO: Implement game-loop support for the following modifiers:
 *   - no_pitch_guide: hide pitch guide visualization during play
 *   - double_speed / half_speed: audio time-stretch (requires Web Audio API)
 *   - pitch_shift: audio transposition by N semitones
 *   - golden_only: only golden notes count for scoring
 *   - perfect_only: only "perfect" rated hits count for scoring
 */
export const CHALLENGE_GAME_MODE_MAP: Record<string, GameMode> = {
  'blind-audition': 'blind',
  'memory-lane': 'missing-words',
};

/**
 * Check whether a player meets the requirements for a given challenge mode.
 * Returns null if the challenge is available, or a human-readable reason string
 * if a requirement is not met.
 */
export function getChallengeRequirementStatus(
  challengeId: string,
  playerLevel: number,
  songsCompleted: number,
  unlockedTitles: string[]
): string | null {
  const mode = CHALLENGE_MODES.find(m => m.id === challengeId);
  if (!mode || !mode.requirements) return null;

  for (const req of mode.requirements) {
    switch (req.type) {
      case 'min_level':
        if (playerLevel < (req.value as number)) {
          return `Requires level ${req.value} (you are level ${playerLevel})`;
        }
        break;
      case 'min_songs':
        if (songsCompleted < (req.value as number)) {
          return `Requires ${req.value} songs completed (you have ${songsCompleted})`;
        }
        break;
      case 'achievement':
        if (!unlockedTitles.includes(req.value as string)) {
          return `Requires achievement: ${req.value}`;
        }
        break;
      case 'rank':
        // Rank requirement — compare via getRankForXP
        break;
    }
  }
  return null;
}

// ===================== EXTENDED PLAYER STATISTICS =====================

interface ExtendedPlayerStats {
  // Core stats
  totalXP: number;
  currentLevel: number;
  currentRank: Rank;
  selectedTitle: string | null;
  unlockedTitles: string[];
  
  // Session stats
  sessionsToday: number;
  lastSessionDate: string | null;
 totalSessions: number;
  songsCompleted: number; // Actual songs played to completion (not just sessions)
  totalPlayTime: number; // seconds
  longestSession: number; // seconds
  averageSessionLength: number; // seconds
  
  // Performance stats
  averageScore: number;
  averageAccuracy: number;
  highestScore: number;
  lowestScore: number;
  totalPerfectNotes: number;
  totalGoldenNotesHit: number;
  
  // Streak stats
  currentDailyStreak: number;
  longestDailyStreak: number;
  currentPlayStreak: number; // consecutive days played
  longestPlayStreak: number;
  
  // Challenge stats
  challengesCompleted: number;
  
  // Genre mastery
  genrePlayCount: Record<string, number>;
  genreBestScores: Record<string, number>;
  favoriteGenre: string | null;
  
  // Difficulty stats
  difficultyStats: {
    easy: { played: number; bestScore: number; avgAccuracy: number };
    medium: { played: number; bestScore: number; avgAccuracy: number };
    hard: { played: number; bestScore: number; avgAccuracy: number };
  };
  
  // Milestones
  milestones: {
    firstSong: number | null;
    firstPerfect: number | null;
    firstGolden: number | null;
    hundredSongs: number | null;
    thousandSongs: number | null;
    levelTen: number | null;
    levelTwentyFive: number | null;
    levelFifty: number | null;
    levelHundred: number | null;
  };
  
  // Recent activity
  recentGames: Array<{
    songId: string;
    songTitle: string;
    score: number;
    accuracy: number;
    mode: string;
    date: number;
  }>;
}

// ===================== GAME RESULT INPUT =====================

/** Input data from a completed game, used to update player stats */
interface PlayerGameResult {
  songId: string;
  songTitle: string;
  genre?: string;
  score: number;
  accuracy: number;
  maxCombo: number;
  perfectNotes: number;
  goldenNotes: number;
  difficulty: 'easy' | 'medium' | 'hard';
  mode: string;
  duration: number;
}

// ===================== XP CALCULATIONS =====================

const XP_SOURCES = {
  // Song completion
  SONG_COMPLETE: 50,
  SONG_PERFECT: 150, // PERFECT_ACCURACY accuracy bonus
  SONG_EXCELLENT: 75, // EXCELLENT_ACCURACY+ accuracy bonus
  
  // Performance
  PERFECT_NOTE: 2,
  GOLDEN_NOTE: 10,
  COMBO_MILESTONE_50: 25,
  COMBO_MILESTONE_100: 50,
  COMBO_MILESTONE_200: 100,
};

export function calculateSongXP(
  score: number,
  accuracy: number,
  maxCombo: number,
  perfectNotes: number,
  goldenNotes: number,
  challengeMode?: string
): number {
  let xp = XP_SOURCES.SONG_COMPLETE;
  
  // Accuracy bonus
  if (accuracy >= PERFECT_ACCURACY) {
    xp += XP_SOURCES.SONG_PERFECT;
  } else if (accuracy >= EXCELLENT_ACCURACY) {
    xp += XP_SOURCES.SONG_EXCELLENT;
  }
  
  // Perfect notes
  xp += perfectNotes * XP_SOURCES.PERFECT_NOTE;
  
  // Golden notes
  xp += goldenNotes * XP_SOURCES.GOLDEN_NOTE;
  
  // Combo milestones
  if (maxCombo >= COMBO_MILESTONE_3) {
    xp += XP_SOURCES.COMBO_MILESTONE_200;
  } else if (maxCombo >= COMBO_MILESTONE_2) {
    xp += XP_SOURCES.COMBO_MILESTONE_100;
  } else if (maxCombo >= COMBO_MILESTONE_1) {
    xp += XP_SOURCES.COMBO_MILESTONE_50;
  }
  
  // Challenge mode bonus
  if (challengeMode) {
    const mode = CHALLENGE_MODES.find(m => m.id === challengeMode);
    if (mode) {
      xp += mode.xpReward;
    }
  }
  
  return Math.round(xp);
}

export function getRankForXP(xp: number): Rank {
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (xp >= RANKS[i].minXP) {
      return RANKS[i];
    }
  }
  return RANKS[0];
}

export function getLevelForXP(xp: number): { level: number; currentXP: number; nextLevelXP: number; progress: number } {
  // Level formula: Each level requires progressively more XP
  // Level  1-9:  XP_PER_LEVEL_TIER_1 each
  // Level 10-24: XP_PER_LEVEL_TIER_2 each
  // Level 25-49: XP_PER_LEVEL_TIER_3 each
  // Level 50-99: XP_PER_LEVEL_TIER_4 each
  // Level 100+:  XP_PER_LEVEL_TIER_5 each
  
  // Guard: NaN would cause infinite loop (NaN < anything is always false)
  if (typeof xp !== 'number' || isNaN(xp) || xp < 0) xp = 0;
  
  let level = 1;
  let xpRequired = 0;
  
  let iterations = 0;
  while (iterations++ < 1000) {
    let nextRequired: number;
    if (level < LEVEL_TIER_1_MAX) {
      nextRequired = XP_PER_LEVEL_TIER_1;
    } else if (level < LEVEL_TIER_2_MAX) {
      nextRequired = XP_PER_LEVEL_TIER_2;
    } else if (level < LEVEL_TIER_3_MAX) {
      nextRequired = XP_PER_LEVEL_TIER_3;
    } else if (level < LEVEL_TIER_4_MAX) {
      nextRequired = XP_PER_LEVEL_TIER_4;
    } else {
      nextRequired = XP_PER_LEVEL_TIER_5;
    }
    
    if (xp < xpRequired + nextRequired) {
      const currentLevelXP = xp - xpRequired;
      const progress = (currentLevelXP / nextRequired) * 100;
      return {
        level,
        currentXP: xp,
        nextLevelXP: xpRequired + nextRequired,
        progress: Math.min(100, Math.max(0, progress)),
      };
    }
    
    xpRequired += nextRequired;
    level++;
  }
  // Safety fallback: if we exceeded max iterations, return a reasonable default
  return { level, currentXP: xp, nextLevelXP: xpRequired + XP_PER_LEVEL_TIER_5, progress: 100 };
}

// ===================== STORAGE =====================

const EXTENDED_STATS_KEY = 'karaoke_extended_stats';

export function getExtendedStats(): ExtendedPlayerStats {
  if (typeof window === 'undefined') {
    return getDefaultStats();
  }
  
  const stored = localStorage.getItem(EXTENDED_STATS_KEY);
  if (stored) {
    try {
      return { ...getDefaultStats(), ...JSON.parse(stored) };
    } catch {
      return getDefaultStats();
    }
  }
  
  return getDefaultStats();
}

export function saveExtendedStats(stats: ExtendedPlayerStats): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(EXTENDED_STATS_KEY, JSON.stringify(stats));
  } catch {
    // localStorage may be full or unavailable — silently ignore
  }
}

function getDefaultStats(): ExtendedPlayerStats {
  return {
    totalXP: 0,
    currentLevel: 1,
    currentRank: RANKS[0],
    selectedTitle: null,
    unlockedTitles: [],
    sessionsToday: 0,
    lastSessionDate: null,
    totalSessions: 0,
    songsCompleted: 0,
  averageScore: 0,
    averageAccuracy: 0,
    highestScore: 0,
    lowestScore: 0,
    totalPerfectNotes: 0,
    totalGoldenNotesHit: 0,
    totalPlayTime: 0,
    longestSession: 0,
    averageSessionLength: 0,
    currentDailyStreak: 0,
    longestDailyStreak: 0,
    currentPlayStreak: 0,
    longestPlayStreak: 0,
    challengesCompleted: 0,
    genrePlayCount: {},
    genreBestScores: {},
    favoriteGenre: null,
    difficultyStats: {
      easy: { played: 0, bestScore: 0, avgAccuracy: 0 },
      medium: { played: 0, bestScore: 0, avgAccuracy: 0 },
      hard: { played: 0, bestScore: 0, avgAccuracy: 0 },
    },
    milestones: {
      firstSong: null,
      firstPerfect: null,
      firstGolden: null,
      hundredSongs: null,
      thousandSongs: null,
      levelTen: null,
      levelTwentyFive: null,
      levelFifty: null,
      levelHundred: null,
    },
    recentGames: [],
  };
}

// ===================== updateStatsAfterGame HELPERS =====================

/** Recalculate XP, level, rank, and record level-up milestones */
function updateLevelProgression(
  stats: ExtendedPlayerStats,
  xpEarned: number,
  now: number
): { leveledUp: boolean; newLevel: number } {
  const oldLevel = getLevelForXP(stats.totalXP).level;
  stats.totalXP += xpEarned;
  const newLevel = getLevelForXP(stats.totalXP).level;

  if (newLevel > oldLevel) {
    stats.currentLevel = newLevel;

    if (newLevel >= LEVEL_TIER_1_MAX && !stats.milestones.levelTen) {
      stats.milestones.levelTen = now;
    }
    if (newLevel >= LEVEL_TIER_2_MAX && !stats.milestones.levelTwentyFive) {
      stats.milestones.levelTwentyFive = now;
    }
    if (newLevel >= LEVEL_TIER_3_MAX && !stats.milestones.levelFifty) {
      stats.milestones.levelFifty = now;
    }
    if (newLevel >= LEVEL_TIER_4_MAX && !stats.milestones.levelHundred) {
      stats.milestones.levelHundred = now;
    }
  }

  stats.currentRank = getRankForXP(stats.totalXP);
  return { leveledUp: newLevel > oldLevel, newLevel };
}

/** Track session counts and dates */
function updateSessionStats(stats: ExtendedPlayerStats, today: string): void {
  if (stats.lastSessionDate !== today) {
    stats.sessionsToday = 1;
    stats.lastSessionDate = today;
  } else {
    stats.sessionsToday++;
  }
  stats.totalSessions++;
}

/** Update running averages and extrema for score, accuracy, and notes */
function updatePerformanceStats(stats: ExtendedPlayerStats, game: PlayerGameResult, totalGames: number): void {
  stats.averageScore = ((stats.averageScore * (totalGames - 1)) + game.score) / totalGames;
  stats.averageAccuracy = ((stats.averageAccuracy * (totalGames - 1)) + game.accuracy) / totalGames;
  stats.highestScore = Math.max(stats.highestScore, game.score);
  // lowestScore starts at 0 (default). Treat 0 as "not yet set" so the first
  // game's score becomes the initial lowest.  This avoids lowestScore being
  // permanently stuck at 0.
  stats.lowestScore = stats.lowestScore === 0 ? game.score : Math.min(stats.lowestScore, game.score);
  stats.totalPerfectNotes += game.perfectNotes;
  stats.totalGoldenNotesHit += game.goldenNotes;
}

/** Update cumulative play time and session length records */
function updateTimeStats(stats: ExtendedPlayerStats, game: PlayerGameResult): void {
  stats.totalPlayTime += game.duration;
  stats.longestSession = Math.max(stats.longestSession, game.duration);
  stats.averageSessionLength = stats.totalPlayTime / stats.totalSessions;
}

/** Track genre play counts, best scores, and favorite genre */
function updateGenreStats(stats: ExtendedPlayerStats, game: PlayerGameResult): void {
  if (!game.genre) return;
  stats.genrePlayCount[game.genre] = (stats.genrePlayCount[game.genre] || 0) + 1;
  stats.genreBestScores[game.genre] = Math.max(stats.genreBestScores[game.genre] || 0, game.score);
  const genreEntries = Object.entries(stats.genrePlayCount);
  if (genreEntries.length > 0) {
    stats.favoriteGenre = genreEntries.sort((a, b) => b[1] - a[1])[0][0];
  }
}

/** Track per-difficulty play counts, best scores, and average accuracy */
function updateDifficultyStats(stats: ExtendedPlayerStats, game: PlayerGameResult): void {
  const diff = stats.difficultyStats[game.difficulty];
  diff.played++;
  diff.bestScore = Math.max(diff.bestScore, game.score);
  diff.avgAccuracy = ((diff.avgAccuracy * (diff.played - 1)) + game.accuracy) / diff.played;
}

/** Record one-time milestone timestamps */
function checkMilestones(stats: ExtendedPlayerStats, game: PlayerGameResult, now: number): void {
  if (!stats.milestones.firstSong) stats.milestones.firstSong = now;
  if (game.accuracy >= PERFECT_ACCURACY && !stats.milestones.firstPerfect) stats.milestones.firstPerfect = now;
  if (game.goldenNotes > 0 && !stats.milestones.firstGolden) stats.milestones.firstGolden = now;
}

/** Add completed game to recent games list, trimming to the cap */
function updateRecentGames(stats: ExtendedPlayerStats, game: PlayerGameResult, now: number): void {
  stats.recentGames.unshift({
    songId: game.songId,
    songTitle: game.songTitle,
    score: game.score,
    accuracy: game.accuracy,
    mode: game.mode,
    date: now,
  });
  stats.recentGames = stats.recentGames.slice(0, MAX_RECENT_GAMES);
}

/** Check and award title unlocks based on game performance; auto-select first title */
function checkTitleUnlocks(
  stats: ExtendedPlayerStats,
  game: PlayerGameResult,
  newLevel: number,
  totalSongs: number
): string[] {
  const newlyUnlocked: string[] = [];

  function maybeUnlock(titleId: string, condition: boolean): void {
    if (condition && !stats.unlockedTitles.includes(titleId)) {
      stats.unlockedTitles.push(titleId);
      newlyUnlocked.push(titleId);
    }
  }

  maybeUnlock('perfect-pitch', game.accuracy >= PERFECT_ACCURACY);
  maybeUnlock('golden-voice', stats.totalGoldenNotesHit >= TITLE_GOLDEN_VOICE_NOTES);
  maybeUnlock('combo-master', game.maxCombo >= TITLE_COMBO_MASTER_COMBO);
  maybeUnlock('dedicated-singer', totalSongs >= TITLE_DEDICATED_SINGER_SONGS);
  maybeUnlock('karaoke-addict', totalSongs >= TITLE_KARAOKE_ADDICT_SONGS);
  maybeUnlock('lifetime-achiever', totalSongs >= TITLE_LIFETIME_ACHIEVER_SONGS);
  maybeUnlock('rising-star', newLevel >= TITLE_RISING_STAR_LEVEL);
  maybeUnlock('veteran', newLevel >= TITLE_VETERAN_LEVEL);
  maybeUnlock('elite', newLevel >= TITLE_ELITE_LEVEL);
  maybeUnlock('master', newLevel >= TITLE_MASTER_LEVEL);

  // Auto-select first title if none selected
  if (!stats.selectedTitle && stats.unlockedTitles.length > 0) {
    stats.selectedTitle = stats.unlockedTitles[0];
  }

  return newlyUnlocked;
}

// ===================== UPDATE STATS AFTER GAME =====================

/** Main coordinator: updates all player stats after a completed game */
export function updateStatsAfterGame(
  stats: ExtendedPlayerStats,
  gameData: PlayerGameResult
): { stats: ExtendedPlayerStats; xpEarned: number; newTitles: string[]; leveledUp: boolean } {
  const now = Date.now();
  const today = new Date().toDateString();

  // 1. Calculate XP earned from this game
  const xpEarned = calculateSongXP(
    gameData.score,
    gameData.accuracy,
    gameData.maxCombo,
    gameData.perfectNotes,
    gameData.goldenNotes,
  );

  // 2. Update level progression (XP, level, rank, level milestones)
  const { leveledUp, newLevel } = updateLevelProgression(stats, xpEarned, now);

  // 3. Update session tracking
  updateSessionStats(stats, today);

  // 3b. Increment songs completed (actual played-to-completion songs)
  stats.songsCompleted++;

  // 4. Update performance stats (running averages based on completed songs, not sessions)
  updatePerformanceStats(stats, gameData, stats.songsCompleted);

  // 5. Update time stats
  updateTimeStats(stats, gameData);

  // 6. Update genre stats
  updateGenreStats(stats, gameData);

  // 7. Update difficulty stats
  updateDifficultyStats(stats, gameData);

  // 8. Check one-time milestones
  checkMilestones(stats, gameData, now);

  // 9. Record in recent games
  updateRecentGames(stats, gameData, now);

  // 10. Check title unlocks (use actual songs completed, not sessions)
  const newTitles = checkTitleUnlocks(stats, gameData, newLevel, stats.songsCompleted);

  return { stats, xpEarned, newTitles, leveledUp };
}
