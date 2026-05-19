/**
 * Rate my Song — Player Statistics & Rank System
 *
 * Persistent player stats in localStorage and rank calculation
 * based on performances and average rating.
 */

import { StorageKeys, getJson, setJson } from '@/lib/storage';
import { getTodayString } from './rate-my-song-ranking-core';
import { checkRateMySongAchievements } from './rate-my-song-achievements';

// ── Storage ──

const STORAGE_KEY_PLAYER_STATS = StorageKeys.RATE_MY_SONG_PLAYER_STATS;

// ── Player Stats ──

export interface RateMySongPlayerStats {
  playerId: string;
  playerName: string;
  playerColor: string;
  totalPerformances: number;
  totalRatingSum: number;
  bestRating: number;
  bestSongTitle: string;
  worstRating: number;
  totalAudienceRatings: number;
  genresPerformed: Record<string, number>; // genre -> count
  achievements: string[]; // achievement IDs earned
  lastPerformanceDate: string; // YYYY-MM-DD
}

function createDefaultStats(playerId: string, playerName: string, playerColor: string): RateMySongPlayerStats {
  return {
    playerId,
    playerName,
    playerColor,
    totalPerformances: 0,
    totalRatingSum: 0,
    bestRating: 0,
    bestSongTitle: '',
    worstRating: 10,
    totalAudienceRatings: 0,
    genresPerformed: {},
    achievements: [],
    lastPerformanceDate: '',
  };
}

function loadAllPlayerStats(): RateMySongPlayerStats[] {
  return getJson<RateMySongPlayerStats[]>(STORAGE_KEY_PLAYER_STATS, []);
}

function saveAllPlayerStats(stats: RateMySongPlayerStats[]) {
  setJson(STORAGE_KEY_PLAYER_STATS, stats);
}

/** Get stats for a specific player (creates defaults if not found) */
export function getRateMySongPlayerStats(playerId: string): RateMySongPlayerStats {
  const allStats = loadAllPlayerStats();
  const existing = allStats.find(s => s.playerId === playerId);
  if (existing) return existing;
  // Return a temporary default (not saved until first update)
  return createDefaultStats(playerId, '', '#888888');
}

/**
 * Update player stats after a performance.
 * Also checks and awards new achievements.
 * Returns the updated stats.
 */
export function updateRateMySongPlayerStats(
  playerId: string,
  playerName: string,
  playerColor: string,
  rating: number,
  songTitle: string,
  songGenre: string,
): RateMySongPlayerStats {
  const allStats = loadAllPlayerStats();
  let stats = allStats.find(s => s.playerId === playerId);

  if (!stats) {
    stats = createDefaultStats(playerId, playerName, playerColor);
    allStats.push(stats);
  }

  // Update name and color (may have changed)
  stats.playerName = playerName;
  stats.playerColor = playerColor;

  // Increment performances
  stats.totalPerformances += 1;

  // Accumulate rating sum
  stats.totalRatingSum += rating;

  // Track best / worst
  if (rating > stats.bestRating) {
    stats.bestRating = rating;
    stats.bestSongTitle = songTitle;
  }
  if (rating < stats.worstRating) {
    stats.worstRating = rating;
  }

  // Genre tracking
  if (songGenre) {
    const normalizedGenre = songGenre.trim().toLowerCase();
    stats.genresPerformed[normalizedGenre] = (stats.genresPerformed[normalizedGenre] || 0) + 1;
  }

  // Last performance date
  stats.lastPerformanceDate = getTodayString();

  // Check achievements
  const newAchievements = checkRateMySongAchievements(stats);
  for (const ach of newAchievements) {
    if (!stats.achievements.includes(ach)) {
      stats.achievements.push(ach);
    }
  }

  saveAllPlayerStats(allStats);
  return stats;
}

// TODO: Wire into results processing to enable crowd_favorite/centurion achievements
/** Add audience rating count to a player's stats (called per audience vote) */
export function addAudienceRatingToStats(playerId: string, count: number = 1): void {
  const allStats = loadAllPlayerStats();
  const stats = allStats.find(s => s.playerId === playerId);
  if (stats) {
    stats.totalAudienceRatings += count;
    saveAllPlayerStats(allStats);
  }
}

// ══════════════════════════════════════════════════════════════════════════
// RANK SYSTEM
// ══════════════════════════════════════════════════════════════════════════

export type RateMySongRank = 'Newcomer' | 'OpenMic' | 'Regular' | 'Star' | 'Superstar' | 'Legend';

export interface RankResult {
  rank: RateMySongRank;
  nextRank: RateMySongRank | null;
  progress: number; // 0–1 progress toward next rank
}

interface RankThreshold {
  rank: RateMySongRank;
  minPerformances: number;
  minAvgRating: number;
}

const RANK_THRESHOLDS: RankThreshold[] = [
  { rank: 'Newcomer',  minPerformances: 0,  minAvgRating: 0 },
  { rank: 'OpenMic',   minPerformances: 3,  minAvgRating: 5.0 },
  { rank: 'Regular',   minPerformances: 8,  minAvgRating: 5.5 },
  { rank: 'Star',      minPerformances: 15, minAvgRating: 7.0 },
  { rank: 'Superstar', minPerformances: 25, minAvgRating: 8.0 },
  { rank: 'Legend',    minPerformances: 40, minAvgRating: 9.0 },
];

/**
 * Calculate a player's rank based on total performances and average rating.
 * Ranks require meeting BOTH the minimum performances AND average rating thresholds,
 * except for Newcomer (default) and OpenMic (requires performances OR avg rating).
 */
export function getPlayerRank(stats: RateMySongPlayerStats): RankResult {
  const avg = stats.totalPerformances > 0 ? stats.totalRatingSum / stats.totalPerformances : 0;
  const perfs = stats.totalPerformances;

  let currentRankIdx = 0;

  for (let i = RANK_THRESHOLDS.length - 1; i >= 0; i--) {
    const t = RANK_THRESHOLDS[i];
    if (i === 0) {
      // Newcomer — always true
      currentRankIdx = 0;
      break;
    }
    const prev = RANK_THRESHOLDS[i - 1];
    if (i === 1) {
      // OpenMic: 3+ performances OR avg >= 5.0
      if (perfs >= t.minPerformances || avg >= t.minAvgRating) {
        currentRankIdx = i;
        break;
      }
    } else {
      // All other ranks: both conditions must be met
      if (perfs >= t.minPerformances && avg >= t.minAvgRating) {
        currentRankIdx = i;
        break;
      }
    }
  }

  const currentRank = RANK_THRESHOLDS[currentRankIdx].rank;
  const nextThreshold = RANK_THRESHOLDS[currentRankIdx + 1] ?? null;

  if (!nextThreshold) {
    return { rank: currentRank, nextRank: null, progress: 1 };
  }

  // Calculate progress toward next rank
  // Progress is based on whichever metric (performances or avg) is further behind
  const prev = RANK_THRESHOLDS[currentRankIdx];

  let perfProgress: number;
  if (prev.minPerformances === nextThreshold.minPerformances) {
    perfProgress = 1;
  } else {
    perfProgress = Math.min(1, Math.max(0,
      (perfs - prev.minPerformances) / (nextThreshold.minPerformances - prev.minPerformances)
    ));
  }

  let ratingProgress: number;
  if (prev.minAvgRating === nextThreshold.minAvgRating) {
    ratingProgress = 1;
  } else {
    ratingProgress = Math.min(1, Math.max(0,
      (avg - prev.minAvgRating) / (nextThreshold.minAvgRating - prev.minAvgRating)
    ));
  }

  // Use the minimum of both (need both to qualify)
  const progress = Math.min(perfProgress, ratingProgress);

  return {
    rank: currentRank,
    nextRank: nextThreshold.rank,
    progress,
  };
}
