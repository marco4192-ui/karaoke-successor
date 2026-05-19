// Player Statistics Tracking, Persistence, and Game Update Logic

import type { Rank } from './progression-levels';
import {
  calculateSongXP,
  getLevelForXP,
  getRankForXP,
  RANKS,
  PERFECT_ACCURACY,
  LEVEL_TIER_1_MAX,
  LEVEL_TIER_2_MAX,
  LEVEL_TIER_3_MAX,
  LEVEL_TIER_4_MAX,
} from './progression-levels';
import {
  TITLE_GOLDEN_VOICE_NOTES,
  TITLE_COMBO_MASTER_COMBO,
  TITLE_DEDICATED_SINGER_SONGS,
  TITLE_KARAOKE_ADDICT_SONGS,
  TITLE_LIFETIME_ACHIEVER_SONGS,
  TITLE_RISING_STAR_LEVEL,
  TITLE_VETERAN_LEVEL,
  TITLE_ELITE_LEVEL,
  TITLE_MASTER_LEVEL,
} from './progression-achievements';
import { StorageKeys, getItem, setJson } from '@/lib/storage';

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
  challengeMode?: string;
  duration: number;
}

// ===================== MISCELLANEOUS =====================

/** Maximum number of recent games stored in history */
const MAX_RECENT_GAMES = 20;

// ===================== STORAGE =====================

export function getExtendedStats(): ExtendedPlayerStats {
  const stored = getItem(StorageKeys.EXTENDED_STATS);
  if (stored) {
    try {
      return { ...getDefaultStats(), ...JSON.parse(stored) };
    } catch (error) {
      console.debug('[player-progression]: failed to load extended stats, using defaults', error);
      return getDefaultStats();
    }
  }
  return getDefaultStats();
}

export function saveExtendedStats(stats: ExtendedPlayerStats): void {
  setJson(StorageKeys.EXTENDED_STATS, stats);
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

/** Track session counts, dates, and play streaks */
function updateSessionStats(stats: ExtendedPlayerStats, today: string): void {
  // Calculate play streak before updating lastSessionDate
  if (stats.lastSessionDate !== today) {
    // New day — check if streak continues
    const lastDate = stats.lastSessionDate ? new Date(stats.lastSessionDate) : null;
    const todayDate = new Date(today);
    const dayDiff = lastDate ? Math.round((todayDate.getTime() - lastDate.getTime()) / 86400000) : Infinity;

    if (dayDiff === 1) {
      // Consecutive day — extend streak
      stats.currentPlayStreak++;
    } else if (dayDiff > 1) {
      // Gap of 2+ days — reset streak
      stats.currentPlayStreak = 1;
    }
    // dayDiff === 0 means same day (first session), streak unchanged

    stats.longestPlayStreak = Math.max(stats.longestPlayStreak, stats.currentPlayStreak);
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
  // First game: initialize lowestScore. Subsequent games: track actual minimum.
  // totalGames is already incremented before this call, so 1 = first game.
  stats.lowestScore = totalGames === 1 ? game.score : Math.min(stats.lowestScore, game.score);
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
  // Song count milestones — checked AFTER songsCompleted is incremented
  if (stats.songsCompleted >= 100 && !stats.milestones.hundredSongs) stats.milestones.hundredSongs = now;
  if (stats.songsCompleted >= 1000 && !stats.milestones.thousandSongs) stats.milestones.thousandSongs = now;
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
  // NOTE: toDateString() is locale-dependent, but acceptable here since this is a desktop
  // app where the user's locale matches the displayed date format.
  const today = new Date().toDateString();

  // 1. Calculate XP earned from this game
  const xpEarned = calculateSongXP(
    gameData.score,
    gameData.accuracy,
    gameData.maxCombo,
    gameData.perfectNotes,
    gameData.goldenNotes,
    gameData.challengeMode,
  );

  // 2. Update level progression (XP, level, rank, level milestones)
  const { leveledUp, newLevel } = updateLevelProgression(stats, xpEarned, now);

  // 3. Update session tracking
  updateSessionStats(stats, today);

  // 3b. Increment songs completed (actual played-to-completion songs)
  stats.songsCompleted++;

  // 3c. Track challenge mode completions
  if (gameData.challengeMode) {
    stats.challengesCompleted++;
  }

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
