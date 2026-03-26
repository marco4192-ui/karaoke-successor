// Player Progression System
// XP, Levels, Ranks, Titles, and Extended Statistics

import { Achievement } from '@/types/game';
import { storage, STORAGE_KEYS } from '@/lib/storage';

// ===================== RANKS & TITLES =====================

export interface Rank {
  id: string;
  name: string;
  icon: string;
  minXP: number;
  maxXP: number;
  color: string;
  titles: string[]; // Unlockable titles at this rank
}

export interface Title {
  id: string;
  name: string;
  icon: string;
  description: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';
  unlockCondition: string;
  category: 'achievement' | 'skill' | 'dedication' | 'special' | 'challenge';
}

export const RANKS: Rank[] = [
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

export const TITLES: Title[] = [
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

export interface ChallengeMode {
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

export interface ChallengeModifier {
  type: 'no_lyrics' | 'no_pitch_guide' | 'double_speed' | 'half_speed' | 'pitch_shift' | 'blind' | 'missing_words' | 'golden_only' | 'perfect_only';
  value?: number;
  description: string;
}

export interface ChallengeRequirement {
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

// Daily challenge integration
export interface DailyChallengeConfig {
  date: string;
  modeId: string;
  songId?: string;
  seed: number;
  bonusXP: number;
  globalGoal?: number;
}

// ===================== EXTENDED PLAYER STATISTICS =====================

export interface ExtendedPlayerStats {
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
  challengesWon: number;
  topThreeFinishes: number;
  topTenFinishes: number;
  perfectChallenges: number; // 100% accuracy in challenge
  
  // Genre mastery
  genrePlayCount: Record<string, number>;
  genreBestScores: Record<string, number>;
  favoriteGenre: string | null;
  
  // Difficulty stats
  difficultyStats: {
    easy: { played: number; completed: number; bestScore: number; avgAccuracy: number };
    medium: { played: number; completed: number; bestScore: number; avgAccuracy: number };
    hard: { played: number; completed: number; bestScore: number; avgAccuracy: number };
  };
  
  // Vocal range
  vocalRange: {
    lowestNote: number | null;
    highestNote: number | null;
    comfortableLow: number | null;
    comfortableHigh: number | null;
  };
  
  // Social stats
  duetsCompleted: number;
  duelsWon: number;
  duelsLost: number;
  songsShared: number;
  
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
  
  // Weekly progress (last 7 days)
  weeklyProgress: Array<{ date: string; gamesPlayed: number; xpEarned: number }>;
}

// ===================== XP CALCULATIONS =====================

export const XP_SOURCES = {
  // Song completion
  SONG_COMPLETE: 50,
  SONG_PERFECT: 150, // 100% accuracy bonus
  SONG_EXCELLENT: 75, // 95%+ accuracy bonus
  
  // Performance
  PERFECT_NOTE: 2,
  GOLDEN_NOTE: 10,
  COMBO_MILESTONE_50: 25,
  COMBO_MILESTONE_100: 50,
  COMBO_MILESTONE_200: 100,
  
  // Daily challenges
  DAILY_COMPLETE: 100,
  DAILY_TOP_3: [50, 30, 20],
  DAILY_TOP_10: 10,
  DAILY_WIN: 100,
  
  // Streaks
  DAILY_STREAK_BONUS: 10, // per day
  PLAY_STREAK_BONUS: 20, // per consecutive day
  
  // Challenge modes
  CHALLENGE_COMPLETE: 100,
  CHALLENGE_PERFECT: 200,
  
  // Social
  DUET_COMPLETE: 75,
  DUEL_WIN: 50,
  
  // Level bonuses
  LEVEL_UP: 100,
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
  if (accuracy >= 100) {
    xp += XP_SOURCES.SONG_PERFECT;
  } else if (accuracy >= 95) {
    xp += XP_SOURCES.SONG_EXCELLENT;
  }
  
  // Perfect notes
  xp += perfectNotes * XP_SOURCES.PERFECT_NOTE;
  
  // Golden notes
  xp += goldenNotes * XP_SOURCES.GOLDEN_NOTE;
  
  // Combo milestones
  if (maxCombo >= 200) {
    xp += XP_SOURCES.COMBO_MILESTONE_200;
  } else if (maxCombo >= 100) {
    xp += XP_SOURCES.COMBO_MILESTONE_100;
  } else if (maxCombo >= 50) {
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
  // Level 1-10: 500 XP each
  // Level 11-25: 1000 XP each
  // Level 26-50: 2000 XP each
  // Level 51-100: 4000 XP each
  // Level 101+: 8000 XP each
  
  let level = 1;
  let xpRequired = 0;
  
  while (true) {
    let nextRequired: number;
    if (level < 10) {
      nextRequired = 500;
    } else if (level < 25) {
      nextRequired = 1000;
    } else if (level < 50) {
      nextRequired = 2000;
    } else if (level < 100) {
      nextRequired = 4000;
    } else {
      nextRequired = 8000;
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
}

export function getTitleById(titleId: string): Title | undefined {
  return TITLES.find(t => t.id === titleId);
}

export function getRarityColor(rarity: Title['rarity']): string {
  switch (rarity) {
    case 'common': return '#9CA3AF';
    case 'uncommon': return '#22C55E';
    case 'rare': return '#3B82F6';
    case 'epic': return '#8B5CF6';
    case 'legendary': return '#F59E0B';
    case 'mythic': return '#EC4899';
  }
}

// ===================== STORAGE =====================

const EXTENDED_STATS_KEY = 'karaoke_extended_stats';

export function getExtendedStats(): ExtendedPlayerStats {
  const stored = storage.getJSON<ExtendedPlayerStats>(STORAGE_KEYS.EXTENDED_STATS);
  if (stored) {
    return { ...getDefaultStats(), ...stored };
  }
  
  return getDefaultStats();
}

export function saveExtendedStats(stats: ExtendedPlayerStats): void {
  storage.setJSON(STORAGE_KEYS.EXTENDED_STATS, stats);
}

export function getDefaultStats(): ExtendedPlayerStats {
  return {
    totalXP: 0,
    currentLevel: 1,
    currentRank: RANKS[0],
    selectedTitle: null,
    unlockedTitles: [],
    sessionsToday: 0,
    lastSessionDate: null,
    totalSessions: 0,
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
    challengesWon: 0,
    topThreeFinishes: 0,
    topTenFinishes: 0,
    perfectChallenges: 0,
    genrePlayCount: {},
    genreBestScores: {},
    favoriteGenre: null,
    difficultyStats: {
      easy: { played: 0, completed: 0, bestScore: 0, avgAccuracy: 0 },
      medium: { played: 0, completed: 0, bestScore: 0, avgAccuracy: 0 },
      hard: { played: 0, completed: 0, bestScore: 0, avgAccuracy: 0 },
    },
    vocalRange: {
      lowestNote: null,
      highestNote: null,
      comfortableLow: null,
      comfortableHigh: null,
    },
    duetsCompleted: 0,
    duelsWon: 0,
    duelsLost: 0,
    songsShared: 0,
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
    weeklyProgress: [],
  };
}

// Update stats after a game
export function updateStatsAfterGame(
  stats: ExtendedPlayerStats,
  gameData: {
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
): { stats: ExtendedPlayerStats; xpEarned: number; newTitles: string[]; leveledUp: boolean } {
  const now = Date.now();
  const today = new Date().toDateString();
  const newTitles: string[] = [];
  let leveledUp = false;
  
  // Calculate XP
  const xpEarned = calculateSongXP(
    gameData.score,
    gameData.accuracy,
    gameData.maxCombo,
    gameData.perfectNotes,
    gameData.goldenNotes
  );
  
  // Update XP and level
  const oldLevel = getLevelForXP(stats.totalXP).level;
  stats.totalXP += xpEarned;
  const newLevel = getLevelForXP(stats.totalXP).level;
  
  if (newLevel > oldLevel) {
    leveledUp = true;
    stats.currentLevel = newLevel;
    
    // Check level milestones
    if (newLevel >= 10 && !stats.milestones.levelTen) stats.milestones.levelTen = now;
    if (newLevel >= 25 && !stats.milestones.levelTwentyFive) stats.milestones.levelTwentyFive = now;
    if (newLevel >= 50 && !stats.milestones.levelFifty) stats.milestones.levelFifty = now;
    if (newLevel >= 100 && !stats.milestones.levelHundred) stats.milestones.levelHundred = now;
  }
  
  // Update rank
  stats.currentRank = getRankForXP(stats.totalXP);
  
  // Update session stats
  if (stats.lastSessionDate !== today) {
    stats.sessionsToday = 1;
    stats.lastSessionDate = today;
  } else {
    stats.sessionsToday++;
  }
  stats.totalSessions++;
  
  // Update performance stats
  const totalGames = stats.totalSessions;
  stats.averageScore = ((stats.averageScore * (totalGames - 1)) + gameData.score) / totalGames;
  stats.averageAccuracy = ((stats.averageAccuracy * (totalGames - 1)) + gameData.accuracy) / totalGames;
  stats.highestScore = Math.max(stats.highestScore, gameData.score);
  stats.lowestScore = stats.lowestScore === 0 ? gameData.score : Math.min(stats.lowestScore, gameData.score);
  stats.totalPerfectNotes += gameData.perfectNotes;
  stats.totalGoldenNotesHit += gameData.goldenNotes;
  
  // Update time stats
  stats.totalPlayTime += gameData.duration;
  stats.longestSession = Math.max(stats.longestSession, gameData.duration);
  stats.averageSessionLength = stats.totalPlayTime / stats.totalSessions;
  
  // Update genre stats
  if (gameData.genre) {
    stats.genrePlayCount[gameData.genre] = (stats.genrePlayCount[gameData.genre] || 0) + 1;
    stats.genreBestScores[gameData.genre] = Math.max(
      stats.genreBestScores[gameData.genre] || 0,
      gameData.score
    );
    
    // Find favorite genre
    const genreEntries = Object.entries(stats.genrePlayCount);
    if (genreEntries.length > 0) {
      stats.favoriteGenre = genreEntries.sort((a, b) => b[1] - a[1])[0][0];
    }
  }
  
  // Update difficulty stats
  const diff = stats.difficultyStats[gameData.difficulty];
  diff.played++;
  diff.completed++;
  diff.bestScore = Math.max(diff.bestScore, gameData.score);
  diff.avgAccuracy = ((diff.avgAccuracy * (diff.played - 1)) + gameData.accuracy) / diff.played;
  
  // Check milestones
  if (!stats.milestones.firstSong) stats.milestones.firstSong = now;
  if (gameData.accuracy === 100 && !stats.milestones.firstPerfect) stats.milestones.firstPerfect = now;
  if (gameData.goldenNotes > 0 && !stats.milestones.firstGolden) stats.milestones.firstGolden = now;
  
  // Add to recent games
  stats.recentGames.unshift({
    songId: gameData.songId,
    songTitle: gameData.songTitle,
    score: gameData.score,
    accuracy: gameData.accuracy,
    mode: gameData.mode,
    date: now,
  });
  stats.recentGames = stats.recentGames.slice(0, 20); // Keep last 20
  
  // Check for new titles
  const totalSongs = stats.totalSessions;
  
  if (gameData.accuracy === 100 && !stats.unlockedTitles.includes('perfect-pitch')) {
    stats.unlockedTitles.push('perfect-pitch');
    newTitles.push('perfect-pitch');
  }
  
  if (stats.totalGoldenNotesHit >= 100 && !stats.unlockedTitles.includes('golden-voice')) {
    stats.unlockedTitles.push('golden-voice');
    newTitles.push('golden-voice');
  }
  
  if (gameData.maxCombo >= 100 && !stats.unlockedTitles.includes('combo-master')) {
    stats.unlockedTitles.push('combo-master');
    newTitles.push('combo-master');
  }
  
  if (totalSongs >= 100 && !stats.unlockedTitles.includes('dedicated-singer')) {
    stats.unlockedTitles.push('dedicated-singer');
    newTitles.push('dedicated-singer');
  }
  
  if (totalSongs >= 500 && !stats.unlockedTitles.includes('karaoke-addict')) {
    stats.unlockedTitles.push('karaoke-addict');
    newTitles.push('karaoke-addict');
  }
  
  if (totalSongs >= 1000 && !stats.unlockedTitles.includes('lifetime-achiever')) {
    stats.unlockedTitles.push('lifetime-achiever');
    newTitles.push('lifetime-achiever');
  }
  
  if (newLevel >= 5 && !stats.unlockedTitles.includes('rising-star')) {
    stats.unlockedTitles.push('rising-star');
    newTitles.push('rising-star');
  }
  
  if (newLevel >= 25 && !stats.unlockedTitles.includes('veteran')) {
    stats.unlockedTitles.push('veteran');
    newTitles.push('veteran');
  }
  
  if (newLevel >= 50 && !stats.unlockedTitles.includes('elite')) {
    stats.unlockedTitles.push('elite');
    newTitles.push('elite');
  }
  
  if (newLevel >= 100 && !stats.unlockedTitles.includes('master')) {
    stats.unlockedTitles.push('master');
    newTitles.push('master');
  }
  
  // Auto-select first title if none selected
  if (!stats.selectedTitle && stats.unlockedTitles.length > 0) {
    stats.selectedTitle = stats.unlockedTitles[0];
  }
  
  return { stats, xpEarned, newTitles, leveledUp };
}

/**
 * Format player name with rank display options
 * @param name - Player name
 * @param xp - Player XP
 * @param options - Display options
 * @returns Formatted name string
 */
export function formatPlayerNameWithRank(
  name: string,
  xp: number,
  options?: {
    showRankInName?: boolean;
    rankDisplayStyle?: 'prefix' | 'suffix' | 'nickname' | 'none';
  }
): string {
  const { showRankInName = false, rankDisplayStyle = 'suffix' } = options || {};
  
  if (!showRankInName || rankDisplayStyle === 'none') {
    return name;
  }
  
  const rank = getRankForXP(xp);
  
  switch (rankDisplayStyle) {
    case 'prefix':
      return `${rank.icon} ${name}`;
    case 'suffix':
      return `${name} ${rank.icon}`;
    case 'nickname':
      return `${rank.icon} ${name} (${rank.name})`;
    default:
      return name;
  }
}
