// Performance Analytics System
import { GameResult, Difficulty, GameMode, Song } from '@/types/game';

export interface PerformanceStats {
  totalGames: number;
  totalSongsCompleted: number;
  totalScore: number;
  totalNotesHit: number;
  totalNotesMissed: number;
  totalPlayTime: number; // ms
  averageAccuracy: number;
  bestScore: number;
  bestCombo: number;
  perfectGames: number; // Games with 100% accuracy
  goldenNotesHit: number;
  starPowerActivations: number;
  
  // Per difficulty stats
  byDifficulty: {
    easy: DifficultyStats;
    medium: DifficultyStats;
    hard: DifficultyStats;
  };
  
  // Per mode stats
  byMode: {
    standard: ModeStats;
    'pass-the-mic': ModeStats;
    medley: ModeStats;
    'missing-words': ModeStats;
    duel: ModeStats;
    blind: ModeStats;
  };
  
  // Recent performances
  recentGames: GameResult[];
  
  // Improvement tracking
  improvement: {
    weeklyChange: number; // Percentage change in average score
    streakDays: number; // Consecutive days played
    bestStreak: number;
  };
  
  // Song-specific stats
  favoriteSong?: string;
  mostPlayedSong?: string;
  bestPerformingSong?: string;
}

export interface DifficultyStats {
  gamesPlayed: number;
  averageScore: number;
  averageAccuracy: number;
  bestScore: number;
}

export interface ModeStats {
  gamesPlayed: number;
  averageScore: number;
  wins: number; // For competitive modes
  losses: number;
}

export function createEmptyPerformanceStats(): PerformanceStats {
  return {
    totalGames: 0,
    totalSongsCompleted: 0,
    totalScore: 0,
    totalNotesHit: 0,
    totalNotesMissed: 0,
    totalPlayTime: 0,
    averageAccuracy: 0,
    bestScore: 0,
    bestCombo: 0,
    perfectGames: 0,
    goldenNotesHit: 0,
    starPowerActivations: 0,
    byDifficulty: {
      easy: createEmptyDifficultyStats(),
      medium: createEmptyDifficultyStats(),
      hard: createEmptyDifficultyStats(),
    },
    byMode: {
      standard: createEmptyModeStats(),
      'pass-the-mic': createEmptyModeStats(),
      medley: createEmptyModeStats(),
      'missing-words': createEmptyModeStats(),
      duel: createEmptyModeStats(),
      blind: createEmptyModeStats(),
    },
    recentGames: [],
    improvement: {
      weeklyChange: 0,
      streakDays: 0,
      bestStreak: 0,
    },
  };
}

function createEmptyDifficultyStats(): DifficultyStats {
  return {
    gamesPlayed: 0,
    averageScore: 0,
    averageAccuracy: 0,
    bestScore: 0,
  };
}

function createEmptyModeStats(): ModeStats {
  return {
    gamesPlayed: 0,
    averageScore: 0,
    wins: 0,
    losses: 0,
  };
}

export function updatePerformanceStats(
  stats: PerformanceStats,
  result: GameResult,
  difficulty: Difficulty,
  gameMode: GameMode
): PerformanceStats {
  const playerResult = result.players[0];
  if (!playerResult) return stats;

  const newTotalGames = stats.totalGames + 1;
  const newTotalScore = stats.totalScore + playerResult.score;
  const newTotalNotesHit = stats.totalNotesHit + playerResult.notesHit;
  const newTotalNotesMissed = stats.totalNotesMissed + playerResult.notesMissed;
  const newTotalPlayTime = stats.totalPlayTime + result.duration;
  
  // Calculate new average accuracy
  const totalNotes = newTotalNotesHit + newTotalNotesMissed;
  const newAverageAccuracy = totalNotes > 0 
    ? (newTotalNotesHit / totalNotes) * 100 
    : 0;

  // Update difficulty stats
  const diffStats = stats.byDifficulty[difficulty];
  const newDiffGames = diffStats.gamesPlayed + 1;
  const newDiffStats: DifficultyStats = {
    gamesPlayed: newDiffGames,
    averageScore: (diffStats.averageScore * diffStats.gamesPlayed + playerResult.score) / newDiffGames,
    averageAccuracy: (diffStats.averageAccuracy * diffStats.gamesPlayed + playerResult.accuracy) / newDiffGames,
    bestScore: Math.max(diffStats.bestScore, playerResult.score),
  };

  // Update mode stats
  const modeStats = stats.byMode[gameMode];
  const newModeGames = modeStats.gamesPlayed + 1;
  const newModeStats: ModeStats = {
    gamesPlayed: newModeGames,
    averageScore: (modeStats.averageScore * modeStats.gamesPlayed + playerResult.score) / newModeGames,
    wins: modeStats.wins + (playerResult.accuracy > 50 ? 1 : 0),
    losses: modeStats.losses + (playerResult.accuracy <= 50 ? 1 : 0),
  };

  // Update recent games (keep last 20)
  const newRecentGames = [result, ...stats.recentGames].slice(0, 20);

  return {
    ...stats,
    totalGames: newTotalGames,
    totalSongsCompleted: stats.totalSongsCompleted + 1,
    totalScore: newTotalScore,
    totalNotesHit: newTotalNotesHit,
    totalNotesMissed: newTotalNotesMissed,
    totalPlayTime: newTotalPlayTime,
    averageAccuracy: newAverageAccuracy,
    bestScore: Math.max(stats.bestScore, playerResult.score),
    bestCombo: Math.max(stats.bestCombo, playerResult.maxCombo),
    perfectGames: stats.perfectGames + (playerResult.accuracy === 100 ? 1 : 0),
    byDifficulty: {
      ...stats.byDifficulty,
      [difficulty]: newDiffStats,
    },
    byMode: {
      ...stats.byMode,
      [gameMode]: newModeStats,
    },
    recentGames: newRecentGames,
  };
}

// Calculate performance rating (0-100)
export function calculatePerformanceRating(stats: PerformanceStats): number {
  const scoreFactor = Math.min(stats.totalScore / 1000000, 1) * 30;
  const accuracyFactor = (stats.averageAccuracy / 100) * 30;
  const gamesFactor = Math.min(stats.totalGames / 100, 1) * 20;
  const comboFactor = Math.min(stats.bestCombo / 100, 1) * 15;
  const perfectFactor = (stats.perfectGames / Math.max(stats.totalGames, 1)) * 5;
  
  return Math.round(scoreFactor + accuracyFactor + gamesFactor + comboFactor + perfectFactor);
}

// Get performance trend (last 7 games)
export function getPerformanceTrend(recentGames: GameResult[]): 'improving' | 'declining' | 'stable' {
  if (recentGames.length < 4) return 'stable';
  
  const recent = recentGames.slice(0, 4);
  const older = recentGames.slice(4, 8);
  
  if (older.length === 0) return 'stable';
  
  const recentAvg = recent.reduce((sum, g) => sum + (g.players[0]?.score || 0), 0) / recent.length;
  const olderAvg = older.reduce((sum, g) => sum + (g.players[0]?.score || 0), 0) / older.length;
  
  const change = (recentAvg - olderAvg) / olderAvg * 100;
  
  if (change > 10) return 'improving';
  if (change < -10) return 'declining';
  return 'stable';
}

// Format play time
export function formatPlayTime(ms: number): string {
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

// Performance grade
export function getPerformanceGrade(stats: PerformanceStats): string {
  const rating = calculatePerformanceRating(stats);
  
  if (rating >= 95) return 'S+';
  if (rating >= 90) return 'S';
  if (rating >= 85) return 'A+';
  if (rating >= 80) return 'A';
  if (rating >= 75) return 'B+';
  if (rating >= 70) return 'B';
  if (rating >= 65) return 'C+';
  if (rating >= 60) return 'C';
  if (rating >= 50) return 'D';
  return 'F';
}
