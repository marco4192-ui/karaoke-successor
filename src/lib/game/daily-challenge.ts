// Daily Challenge Leaderboard System
// Global rankings, XP system, streak rewards, weekly challenges, and quests

import { getRankForXP } from './player-progression';
import { StorageKeys, getItem, getJson, setJson, setItem } from '@/lib/storage';

// ---------------------------------------------------------------------------
// Interfaces — Daily Challenge
// ---------------------------------------------------------------------------

interface DailyChallengeEntry {
  playerId: string;
  playerName: string;
  playerAvatar?: string;
  playerColor: string;
  score: number;
  accuracy: number;
  combo: number;
  perfectNotesCount: number;
  completedAt: number;
  rank: number;
}

interface DailyChallengeData {
  date: string;
  type: 'score' | 'accuracy' | 'combo' | 'perfect_notes';
  target: number;
  seed: number;
  entries: DailyChallengeEntry[];
  totalParticipants: number;
}

interface PlayerDailyStats {
  currentStreak: number;
  longestStreak: number;
  totalCompleted: number;
  totalXP: number;
  lastCompletedDate: string | null;
  badges: DailyBadge[];
  weeklyProgress: number[]; // 7 days of completion
  lastWeekStart: string | null; // ISO date of Monday of current week, for weekly reset
}

interface DailyBadge {
  id: string;
  name: string;
  icon: string;
  description: string;
  unlockedAt: number;
}

// ---------------------------------------------------------------------------
// Interfaces — Player Best Result (#1)
// ---------------------------------------------------------------------------

/** Tracks the best result a player has achieved for today's daily challenge. */
export interface PlayerBestResult {
  playerId: string;
  score: number;
  accuracy: number;
  combo: number;
  perfectNotes: number;
  completedAt: number;
  targetMet: boolean; // whether the challenge target was achieved
}

// ---------------------------------------------------------------------------
// Interfaces — Weekly Challenge (#4)
// ---------------------------------------------------------------------------

/** A single entry in the weekly challenge leaderboard. */
export interface WeeklyChallengeEntry {
  playerId: string;
  playerName: string;
  playerAvatar?: string;
  playerColor: string;
  metric: number; // the challenge-relevant metric value
  completedAt: number;
}

/** Weekly challenge data — resets every Monday. */
export interface WeeklyChallengeData {
  weekNumber: number;
  year: number;
  type: 'score' | 'accuracy' | 'combo' | 'songs_completed';
  target: number;
  description: string;
  entries: WeeklyChallengeEntry[];
}

// ---------------------------------------------------------------------------
// Interfaces — Quest System (#5)
// ---------------------------------------------------------------------------

/** Static definition of a quest/mission. */
export interface QuestDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  target: number;
  reward: { xp: number; badgeId?: string };
  checkProgress: string; // identifier for what to check (keyof PlayerQuestStats)
}

/** Runtime progress for a single quest. */
export interface QuestProgress {
  questId: string;
  currentProgress: number;
  completed: boolean;
  claimedAt?: number;
}

/** Cumulative stats that drive quest progress. */
export interface PlayerQuestStats {
  dailyCompleted: number;       // daily challenges completed today
  weeklyCompleted: number;      // weekly challenges completed this week
  challengeModesPlayed: number; // challenge modes played total
  perfectNotesTotal: number;    // total perfect notes across all games
  totalSongsCompleted: number;  // total songs completed
}

/** Internal storage shape — extends PlayerQuestStats with reset-tracking fields. */
interface StoredQuestStats extends PlayerQuestStats {
  _lastDailyReset?: string | null;
  _lastWeeklyReset?: string | null;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** XP rewards for various challenge accomplishments. */
export const XP_REWARDS = {
  CHALLENGE_COMPLETE: 100,
  STREAK_BONUS_BASE: 10, // +10 per streak day
  TOP_3_BONUS: [50, 30, 20], // 1st, 2nd, 3rd
  TOP_10_BONUS: 10,
  PERFECT_CHALLENGE: 50, // 100% accuracy on accuracy challenge
  /** (#3) XP subtracted when a streak breaks (min 0 XP earned). */
  STREAK_BREAK_PENALTY: 25,
  STREAK_MILESTONES: {
    7: { xp: 200, badge: 'Week Warrior' },
    14: { xp: 500, badge: 'Fortnight Fighter' },
    30: { xp: 1000, badge: 'Monthly Master' },
    60: { xp: 2500, badge: 'Bi-Monthly Boss' },
    100: { xp: 5000, badge: 'Century Champion' },
    365: { xp: 50000, badge: 'Yearly Legend' },
  },
} as const;

/** (#4) XP awarded when the weekly challenge target is met. */
export const WEEKLY_XP_REWARD = 250;

// Badge definitions
export const DAILY_BADGES: Record<string, Omit<DailyBadge, 'unlockedAt'>> = {
  'first-challenge': {
    id: 'first-challenge',
    name: 'First Steps',
    icon: '🌟',
    description: 'Complete your first daily challenge',
  },
  'week-warrior': {
    id: 'week-warrior',
    name: 'Week Warrior',
    icon: '🏆',
    description: 'Maintain a 7-day streak',
  },
  'fortnight-fighter': {
    id: 'fortnight-fighter',
    name: 'Fortnight Fighter',
    icon: '⚔️',
    description: 'Maintain a 14-day streak',
  },
  'monthly-master': {
    id: 'monthly-master',
    name: 'Monthly Master',
    icon: '👑',
    description: 'Maintain a 30-day streak',
  },
  'top-3': {
    id: 'top-3',
    name: 'Podium Finish',
    icon: '🥇',
    description: 'Finish in top 3 of a daily challenge',
  },
  'champion': {
    id: 'champion',
    name: 'Daily Champion',
    icon: '🏅',
    description: 'Win a daily challenge',
  },
  'dedicated': {
    id: 'dedicated',
    name: 'Dedicated Singer',
    icon: '🎤',
    description: 'Complete 30 daily challenges',
  },
  'legendary': {
    id: 'legendary',
    name: 'Legendary Status',
    icon: '⭐',
    description: 'Reach 10,000 total XP',
  },
  'century-champion': {
    id: 'century-champion',
    name: 'Century Champion',
    icon: '💎',
    description: 'Maintain a 100-day streak',
  },
  'yearly-legend': {
    id: 'yearly-legend',
    name: 'Yearly Legend',
    icon: '🌟',
    description: 'Maintain a 365-day streak',
  },
};

/** (#5) Available daily quests. */
export const DAILY_QUESTS: QuestDefinition[] = [
  {
    id: 'daily-double',
    name: 'Daily Double',
    description: 'Complete 2 daily challenges today',
    icon: '🎯',
    target: 2,
    reward: { xp: 150 },
    checkProgress: 'dailyCompleted',
  },
  {
    id: 'perfect-10',
    name: 'Perfect Ten',
    description: 'Hit 10 perfect notes total',
    icon: '💎',
    target: 10,
    reward: { xp: 200 },
    checkProgress: 'perfectNotesTotal',
  },
  {
    id: 'challenge-explorer',
    name: 'Challenge Explorer',
    description: 'Play 5 different challenge modes',
    icon: '🗺️',
    target: 5,
    reward: { xp: 300, badgeId: 'explorer' },
    checkProgress: 'challengeModesPlayed',
  },
  {
    id: 'songbird',
    name: 'Songbird',
    description: 'Complete 10 songs total',
    icon: '🐦',
    target: 10,
    reward: { xp: 250, badgeId: 'songbird' },
    checkProgress: 'totalSongsCompleted',
  },
  {
    id: 'weekly-warrior',
    name: 'Weekly Warrior',
    description: 'Complete 3 weekly challenges',
    icon: '⚔️',
    target: 3,
    reward: { xp: 500, badgeId: 'weekly-warrior' },
    checkProgress: 'weeklyCompleted',
  },
];

// ---------------------------------------------------------------------------
// Storage keys
// ---------------------------------------------------------------------------

const DAILY_CHALLENGE_KEY = StorageKeys.DAILY_CHALLENGE;
const DAILY_LEADERBOARD_KEY = StorageKeys.DAILY_LEADERBOARD_PREFIX;
const PLAYER_DAILY_STATS_KEY = StorageKeys.PLAYER_DAILY_STATS;

/** (#1) localStorage key for per-player best results. */
const PLAYER_BEST_RESULTS_KEY = 'karaoke_daily_best_results';

/** (#4) localStorage key prefix for weekly challenge data. */
const WEEKLY_CHALLENGE_KEY_PREFIX = 'karaoke_weekly_challenge_';

/** (#5) localStorage key for quest progress map. */
const QUEST_PROGRESS_KEY = 'karaoke_quest_progress';

/** (#5) localStorage key for cumulative player quest stats. */
const QUEST_STATS_KEY = 'karaoke_quest_stats';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Returns today's date as a locale-independent ISO string (YYYY-MM-DD). */
function todayISO(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/** Returns the ISO date string (YYYY-MM-DD) for a given timestamp. */
function timestampToISO(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Simple DJB2 hash — provides much better distribution than ASCII sum for % N. */
function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
  }
  return (hash >>> 0); // unsigned 32-bit — prevents Infinity/NaN on long strings
}

/** (#4) Returns the ISO 8601 week number for a given date. */
function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

/** (#4) Returns the Monday-starting ISO week index (0=Mon … 6=Sun) for a date. */
function getMondayIndex(date: Date): number {
  const dow = date.getDay();
  return dow === 0 ? 6 : dow - 1;
}

/** Returns the ISO string of the Monday on or before `date`. */
function getMondayISO(date: Date): string {
  const d = new Date(date);
  const dow = d.getDay();
  const offset = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// Daily Challenge — core
// ---------------------------------------------------------------------------

/** Base targets (before level scaling). */
const DAILY_BASE_TARGETS = { score: 8000, accuracy: 85, combo: 50, perfect_notes: 20 };

/**
 * Generate (or load) the daily challenge.
 * When `level` is provided the returned target is scaled via {@link getTargetForLevel}.
 * The stored leaderboard always uses the base (unscaled) target.
 */
export function getDailyChallenge(level?: number): DailyChallengeData {
  const today = todayISO();
  const types: Array<'score' | 'accuracy' | 'combo' | 'perfect_notes'> =
    ['score', 'accuracy', 'combo', 'perfect_notes'];
  const type = types[hashString(today) % types.length];

  // Try to load existing leaderboard
  const stored = getItem(`${DAILY_LEADERBOARD_KEY}_${today}`);
  let challenge: DailyChallengeData;
  if (stored) {
    try {
      challenge = JSON.parse(stored);
    } catch {
      challenge = {
        date: today,
        type,
        target: DAILY_BASE_TARGETS[type],
        seed: hashString(today),
        entries: [],
        totalParticipants: 0,
      };
    }
  } else {
    challenge = {
      date: today,
      type,
      target: DAILY_BASE_TARGETS[type],
      seed: hashString(today),
      entries: [],
      totalParticipants: 0,
    };
  }

  // Apply level scaling to the returned copy only
  if (level !== undefined) {
    return {
      ...challenge,
      target: getTargetForLevel(challenge.target, level),
    };
  }

  return challenge;
}

/** (#2) Scale a base challenge target up slightly with player level (max +25 % at level 100). */
export function getTargetForLevel(baseTarget: number, level: number): number {
  const scale = 1 + Math.min(0.25, level * 0.0025);
  return Math.round(baseTarget * scale);
}

/** Save the daily challenge leaderboard to localStorage. */
function saveDailyChallenge(data: DailyChallengeData): void {
  setJson(`${DAILY_LEADERBOARD_KEY}_${data.date}`, data);
}

// ---------------------------------------------------------------------------
// Player daily stats
// ---------------------------------------------------------------------------

const DEFAULT_PLAYER_DAILY_STATS: PlayerDailyStats = {
  currentStreak: 0,
  longestStreak: 0,
  totalCompleted: 0,
  totalXP: 0,
  lastCompletedDate: null,
  badges: [],
  weeklyProgress: [0, 0, 0, 0, 0, 0, 0],
  lastWeekStart: null,
};

export function getPlayerDailyStats(): PlayerDailyStats {
  return getJson<PlayerDailyStats>(PLAYER_DAILY_STATS_KEY, DEFAULT_PLAYER_DAILY_STATS);
}

function savePlayerDailyStats(stats: PlayerDailyStats): void {
  setJson(PLAYER_DAILY_STATS_KEY, stats);
}

// ---------------------------------------------------------------------------
// (#1) Per-Player Best Results Tracking
// ---------------------------------------------------------------------------

/**
 * Retrieve the stored best result for a player on today's daily challenge.
 * Returns `null` if the player has no result for today or the stored date differs.
 */
export function getPlayerBestResult(playerId: string): PlayerBestResult | null {
  const today = todayISO();
  const all = getJson<Record<string, PlayerBestResult & { date: string }>>(PLAYER_BEST_RESULTS_KEY, {});
  const entry = all[playerId];
  if (!entry || entry.date !== today) return null;
  const { date: _date, ...best } = entry;
  return best;
}

/**
 * Save (or update) the best result for a player on today's daily challenge.
 * If the player already has a better result for today, the stored value is kept.
 */
export function savePlayerBestResult(playerId: string, result: PlayerBestResult): void {
  const today = todayISO();
  const all = getJson<Record<string, PlayerBestResult & { date: string }>>(PLAYER_BEST_RESULTS_KEY, {});
  all[playerId] = { ...result, date: today };
  setJson(PLAYER_BEST_RESULTS_KEY, all);
}

// ---------------------------------------------------------------------------
// Submit a challenge result (single-player)
// ---------------------------------------------------------------------------

/**
 * Submit a single-player challenge result.
 *
 * Side-effects:
 * - Updates the daily leaderboard
 * - Recalculates streak & XP (including streak-break penalty)
 * - Awards badges
 * - Saves the player's best result for today (#1)
 */
export function submitChallengeResult(
  player: {
    id: string;
    name: string;
    avatar?: string;
    color: string;
  },
  result: {
    score: number;
    accuracy: number;
    combo: number;
    perfectNotesCount?: number;
  }
): {
  challenge: DailyChallengeData;
  stats: PlayerDailyStats;
  xpEarned: number;
  newBadges: DailyBadge[];
  rank: number;
} {
  // Always load with base target (no level scaling) for leaderboard consistency
  const challenge = getDailyChallenge();
  const stats = getPlayerDailyStats();
  const today = todayISO();
  let xpEarned: number = XP_REWARDS.CHALLENGE_COMPLETE;
  const newBadges: DailyBadge[] = [];

  // Determine the metric for comparison based on challenge type
  const sortMetric = (entry: DailyChallengeEntry): number => {
    switch (challenge.type) {
      case 'accuracy': return entry.accuracy;
      case 'combo': return entry.combo;
      case 'perfect_notes': return entry.perfectNotesCount;
      default: return entry.score;
    }
  };
  const resultMetric = (): number => {
    switch (challenge.type) {
      case 'accuracy': return result.accuracy;
      case 'combo': return result.combo;
      case 'perfect_notes': return result.perfectNotesCount ?? 0;
      default: return result.score;
    }
  };

  // Check if already completed today
  const existingEntry = challenge.entries.find(e => e.playerId === player.id);
  if (existingEntry) {
    // Update if the challenge-type-specific metric improved
    if (resultMetric() > sortMetric(existingEntry)) {
      existingEntry.score = result.score;
      existingEntry.accuracy = result.accuracy;
      existingEntry.combo = result.combo;
      existingEntry.perfectNotesCount = result.perfectNotesCount ?? 0;
      existingEntry.completedAt = Date.now();
    }
  } else {
    // Add new entry
    challenge.entries.push({
      playerId: player.id,
      playerName: player.name,
      playerAvatar: player.avatar,
      playerColor: player.color,
      score: result.score,
      accuracy: result.accuracy,
      combo: result.combo,
      perfectNotesCount: result.perfectNotesCount ?? 0,
      completedAt: Date.now(),
      rank: 0,
    });
    challenge.totalParticipants++;
  }

  // Sort by the challenge type's metric descending, then by playerId for deterministic tiebreaker
  challenge.entries.sort((a, b) => {
    const diff = sortMetric(b) - sortMetric(a);
    if (diff !== 0) return diff;
    return a.playerId.localeCompare(b.playerId);
  });
  challenge.entries.forEach((entry, index) => {
    entry.rank = index + 1;
  });

  const playerRank = challenge.entries.find(e => e.playerId === player.id)?.rank || 0;

  // Calculate XP bonuses
  if (stats.lastCompletedDate !== today) {
    // First completion today
    stats.totalCompleted++;

    // Streak calculation
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayISO = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

    if (stats.lastCompletedDate === yesterdayISO) {
      stats.currentStreak++;
    } else {
      // (#3) Streak break penalty — subtract 25 XP if the player had an active streak
      if (stats.currentStreak > 0 && stats.lastCompletedDate !== null) {
        xpEarned = Math.max(0, xpEarned - XP_REWARDS.STREAK_BREAK_PENALTY);
      }
      stats.currentStreak = 1;
    }

    if (stats.currentStreak > stats.longestStreak) {
      stats.longestStreak = stats.currentStreak;
    }

    stats.lastCompletedDate = today;

    // Streak bonus
    xpEarned += XP_REWARDS.STREAK_BONUS_BASE * stats.currentStreak;

    // Top 3 bonus
    if (playerRank <= 3 && playerRank >= 1) {
      xpEarned += XP_REWARDS.TOP_3_BONUS[playerRank - 1];
    } else if (playerRank <= 10) {
      xpEarned += XP_REWARDS.TOP_10_BONUS;
    }

    // Check for streak milestones
    const milestone = XP_REWARDS.STREAK_MILESTONES[stats.currentStreak as keyof typeof XP_REWARDS.STREAK_MILESTONES];
    if (milestone) {
      xpEarned += milestone.xp;
      const badgeId = milestone.badge.toLowerCase().replace(/ /g, '-');
      if (!stats.badges.some(b => b.id === badgeId)) {
        const newBadge: DailyBadge = {
          id: badgeId,
          name: milestone.badge,
          icon: stats.currentStreak >= 365 ? '🌟' : stats.currentStreak >= 100 ? '💎' : '🏆',
          description: `Maintained a ${stats.currentStreak}-day streak`,
          unlockedAt: Date.now(),
        };
        stats.badges.push(newBadge);
        newBadges.push(newBadge);
      }
    }

    // Check for first challenge badge
    if (stats.totalCompleted === 1 && !stats.badges.some(b => b.id === 'first-challenge')) {
      const badge: DailyBadge = {
        ...DAILY_BADGES['first-challenge'],
        unlockedAt: Date.now(),
      };
      stats.badges.push(badge);
      newBadges.push(badge);
    }

    // Check for 30 completions badge
    if (stats.totalCompleted === 30 && !stats.badges.some(b => b.id === 'dedicated')) {
      const badge: DailyBadge = {
        ...DAILY_BADGES['dedicated'],
        unlockedAt: Date.now(),
      };
      stats.badges.push(badge);
      newBadges.push(badge);
    }

    // Check for legendary badge
    if (stats.totalXP + xpEarned >= 10000 && !stats.badges.some(b => b.id === 'legendary')) {
      const badge: DailyBadge = {
        ...DAILY_BADGES['legendary'],
        unlockedAt: Date.now(),
      };
      stats.badges.push(badge);
      newBadges.push(badge);
    }

    // Perfect challenge bonus: 100% accuracy on an accuracy challenge
    // Use >= 99.5 to account for floating-point arithmetic (e.g. 99.999999999)
    if (challenge.type === 'accuracy' && result.accuracy >= 99.5) {
      xpEarned += XP_REWARDS.PERFECT_CHALLENGE;
    }

    // Update weekly progress — reset at week boundary
    const now = new Date();
    const weekStartISO = getMondayISO(now);

    if (stats.lastWeekStart !== weekStartISO) {
      stats.weeklyProgress = [0, 0, 0, 0, 0, 0, 0];
      stats.lastWeekStart = weekStartISO;
    }
    // Convert JS day (0=Sun) to Monday-based index (0=Mon, 6=Sun)
    const weekIndex = getMondayIndex(now);
    stats.weeklyProgress[weekIndex] = 1;

    stats.totalXP += xpEarned;

    // (#5) Update quest stats for daily challenge completion
    updateQuestProgress('dailyCompleted', 1);

  } else {
    // Same-day replay — no XP/streak, but still check rank-based badges
    // in case the player improved their score and moved into top 3 or #1
  }

  // Rank-based badges: checked on EVERY submission (not just first completion)
  // so a same-day score improvement that moves the player into #1 or top 3
  // still awards the corresponding badge.
  if (playerRank === 1 && !stats.badges.some(b => b.id === 'champion')) {
    const badge: DailyBadge = {
      ...DAILY_BADGES['champion'],
      unlockedAt: Date.now(),
    };
    stats.badges.push(badge);
    newBadges.push(badge);
  }
  if (playerRank <= 3 && !stats.badges.some(b => b.id === 'top-3')) {
    const badge: DailyBadge = {
      ...DAILY_BADGES['top-3'],
      unlockedAt: Date.now(),
    };
    stats.badges.push(badge);
    newBadges.push(badge);
  }

  // Save data
  saveDailyChallenge(challenge);
  savePlayerDailyStats(stats);

  // Sync completion flag so isChallengeCompletedToday() returns true
  // (isChallengeCompletedToday reads from DAILY_CHALLENGE_KEY, not the leaderboard)
  setJson(DAILY_CHALLENGE_KEY, {
    date: today,
    completed: true,
    streak: stats.currentStreak,
  });

  // (#1) Save best result for this player today
  const currentMetric = resultMetric();
  const targetMet = currentMetric >= challenge.target;
  const existingBest = getPlayerBestResult(player.id);
  if (!existingBest || currentMetric > getBestMetric(existingBest, challenge.type)) {
    savePlayerBestResult(player.id, {
      playerId: player.id,
      score: result.score,
      accuracy: result.accuracy,
      combo: result.combo,
      perfectNotes: result.perfectNotesCount ?? 0,
      completedAt: Date.now(),
      targetMet,
    });
  }

  return { challenge, stats, xpEarned, newBadges, rank: playerRank };
}

// ---------------------------------------------------------------------------
// (#1) Best-result metric helper
// ---------------------------------------------------------------------------

/** Extract the challenge-type metric from a PlayerBestResult for comparison. */
function getBestMetric(best: PlayerBestResult, type: DailyChallengeData['type']): number {
  switch (type) {
    case 'accuracy': return best.accuracy;
    case 'combo': return best.combo;
    case 'perfect_notes': return best.perfectNotes;
    default: return best.score;
  }
}

// ---------------------------------------------------------------------------
// (#6) Co-op Challenge Submission
// ---------------------------------------------------------------------------

/**
 * Submit a co-op (2-player) challenge result.
 *
 * The co-op result uses the AVERAGE of both players' metrics.
 * XP is awarded to both players (added to the shared global stats once).
 * Daily completion is only awarded if the AVERAGE meets the target.
 */
export function submitCoopChallengeResult(
  players: Array<{ id: string; name: string; avatar?: string; color: string }>,
  results: Array<{ score: number; accuracy: number; combo: number; perfectNotesCount?: number }>,
): { challenge: DailyChallengeData; xpEarned: number; newBadges: DailyBadge[] } {
  if (players.length < 2 || results.length < 2) {
    throw new Error('Co-op requires at least 2 players and 2 results');
  }

  const challenge = getDailyChallenge();
  const stats = getPlayerDailyStats();
  const today = todayISO();
  const newBadges: DailyBadge[] = [];

  // Average all players' metrics
  const avgScore = results.reduce((s, r) => s + r.score, 0) / results.length;
  const avgAccuracy = results.reduce((s, r) => s + r.accuracy, 0) / results.length;
  const avgCombo = results.reduce((s, r) => s + r.combo, 0) / results.length;
  const avgPerfectNotes = results.reduce((s, r) => s + (r.perfectNotesCount ?? 0), 0) / results.length;

  // Determine challenge-type metric from the average
  const sortMetric = (entry: DailyChallengeEntry): number => {
    switch (challenge.type) {
      case 'accuracy': return entry.accuracy;
      case 'combo': return entry.combo;
      case 'perfect_notes': return entry.perfectNotesCount;
      default: return entry.score;
    }
  };
  const avgMetric = (): number => {
    switch (challenge.type) {
      case 'accuracy': return avgAccuracy;
      case 'combo': return avgCombo;
      case 'perfect_notes': return avgPerfectNotes;
      default: return avgScore;
    }
  };

  // Add entries for each player with averaged metrics
  for (let i = 0; i < players.length; i++) {
    const p = players[i];
    const existing = challenge.entries.find(e => e.playerId === p.id);

    if (existing) {
      if (avgMetric() > sortMetric(existing)) {
        existing.score = avgScore;
        existing.accuracy = avgAccuracy;
        existing.combo = avgCombo;
        existing.perfectNotesCount = avgPerfectNotes;
        existing.completedAt = Date.now();
      }
    } else {
      challenge.entries.push({
        playerId: p.id,
        playerName: p.name,
        playerAvatar: p.avatar,
        playerColor: p.color,
        score: avgScore,
        accuracy: avgAccuracy,
        combo: avgCombo,
        perfectNotesCount: avgPerfectNotes,
        completedAt: Date.now(),
        rank: 0,
      });
      challenge.totalParticipants++;
    }
  }

  // Sort and rank
  challenge.entries.sort((a, b) => {
    const diff = sortMetric(b) - sortMetric(a);
    if (diff !== 0) return diff;
    return a.playerId.localeCompare(b.playerId);
  });
  challenge.entries.forEach((entry, index) => {
    entry.rank = index + 1;
  });

  // Check if the best rank among co-op players earns badges
  const bestRank = Math.min(
    ...players.map(p => challenge.entries.find(e => e.playerId === p.id)?.rank ?? Infinity),
  );

  if (bestRank === 1 && !stats.badges.some(b => b.id === 'champion')) {
    const badge: DailyBadge = { ...DAILY_BADGES['champion'], unlockedAt: Date.now() };
    stats.badges.push(badge);
    newBadges.push(badge);
  }
  if (bestRank <= 3 && !stats.badges.some(b => b.id === 'top-3')) {
    const badge: DailyBadge = { ...DAILY_BADGES['top-3'], unlockedAt: Date.now() };
    stats.badges.push(badge);
    newBadges.push(badge);
  }

  // Award XP if average meets the challenge target
  let xpEarned = 0;
  const targetMet = avgMetric() >= challenge.target;
  if (targetMet) {
    xpEarned = XP_REWARDS.CHALLENGE_COMPLETE;
    stats.totalXP += xpEarned;
    stats.lastCompletedDate = today;
    stats.totalCompleted++;
  }

  saveDailyChallenge(challenge);
  savePlayerDailyStats(stats);

  // Mark challenge completed if target met
  if (targetMet) {
    setJson(DAILY_CHALLENGE_KEY, {
      date: today,
      completed: true,
      streak: stats.currentStreak,
    });
  }

  return { challenge, xpEarned, newBadges };
}

// ---------------------------------------------------------------------------
// (#4) Weekly Challenge System
// ---------------------------------------------------------------------------

/** Base targets for weekly challenges (before level scaling). */
const WEEKLY_BASE_TARGETS: Record<WeeklyChallengeData['type'], number> = {
  score: 7500,
  accuracy: 90,
  combo: 75,
  songs_completed: 3,
};

/** Human-readable descriptions for each weekly challenge type. */
const WEEKLY_DESCRIPTIONS: Record<WeeklyChallengeData['type'], string> = {
  score: 'Score {target} points in a single song',
  accuracy: 'Achieve {target}% accuracy in a single song',
  combo: 'Hit a {target}-note combo in a single song',
  songs_completed: 'Complete {target} songs this week',
};

/** Save weekly challenge data to localStorage. */
function saveWeeklyChallenge(data: WeeklyChallengeData): void {
  setJson(`${WEEKLY_CHALLENGE_KEY_PREFIX}${data.weekNumber}_${data.year}`, data);
}

/**
 * Get (or generate) the current weekly challenge.
 * When `level` is provided the returned target is scaled via {@link getTargetForLevel}.
 * The stored challenge always uses the base target.
 */
export function getWeeklyChallenge(level?: number): WeeklyChallengeData {
  const now = new Date();
  const weekNumber = getISOWeek(now);
  const year = now.getFullYear();
  const storageKey = `${WEEKLY_CHALLENGE_KEY_PREFIX}${weekNumber}_${year}`;

  const stored = getJson<WeeklyChallengeData | null>(storageKey, null);
  if (stored && stored.weekNumber === weekNumber && stored.year === year) {
    if (level !== undefined) {
      return {
        ...stored,
        target: getTargetForLevel(stored.target, level),
      };
    }
    return stored;
  }

  // Generate a new weekly challenge seeded by ISO week
  const seed = `${year}-${weekNumber}`;
  const types: Array<WeeklyChallengeData['type']> =
    ['score', 'accuracy', 'combo', 'songs_completed'];
  const type = types[hashString(seed) % types.length];
  const baseTarget = WEEKLY_BASE_TARGETS[type];

  const challenge: WeeklyChallengeData = {
    weekNumber,
    year,
    type,
    target: baseTarget,
    description: WEEKLY_DESCRIPTIONS[type].replace('{target}', String(baseTarget)),
    entries: [],
  };

  saveWeeklyChallenge(challenge);

  if (level !== undefined) {
    return {
      ...challenge,
      target: getTargetForLevel(challenge.target, level),
    };
  }
  return challenge;
}

/**
 * Submit a result to the weekly challenge.
 *
 * The `challengeType` determines which metric is extracted from `result`.
 * XP is only awarded when the metric meets the weekly challenge's base target
 * and the player has not already qualified this week.
 *
 * For `songs_completed`, submissions are cumulative — each call counts as one
 * additional song completed this week.
 */
export function submitWeeklyChallengeResult(
  player: {
    id: string;
    name: string;
    avatar?: string;
    color: string;
  },
  result: {
    score: number;
    accuracy: number;
    combo: number;
    perfectNotesCount?: number;
  },
  challengeType: WeeklyChallengeData['type'],
): { challenge: WeeklyChallengeData; xpEarned: number } {
  // Load with base target (no level scaling) for consistent comparisons
  const challenge = getWeeklyChallenge();
  let xpEarned = 0;

  // Only process if the submitted type matches the weekly challenge type
  if (challengeType !== challenge.type) {
    return { challenge, xpEarned: 0 };
  }

  // Player's existing entries this week
  const playerEntries = challenge.entries.filter(e => e.playerId === player.id);
  const alreadyQualified = playerEntries.some(e => e.metric >= challenge.target);

  // Calculate metric
  let metric: number;
  switch (challengeType) {
    case 'score':
      metric = result.score;
      break;
    case 'accuracy':
      metric = result.accuracy;
      break;
    case 'combo':
      metric = result.combo;
      break;
    case 'songs_completed':
      // Cumulative: count existing entries + 1
      metric = playerEntries.length + 1;
      break;
  }

  // Add entry
  challenge.entries.push({
    playerId: player.id,
    playerName: player.name,
    playerAvatar: player.avatar,
    playerColor: player.color,
    metric,
    completedAt: Date.now(),
  });

  // Award XP if target is met for the first time
  if (!alreadyQualified && metric >= challenge.target) {
    xpEarned = WEEKLY_XP_REWARD;
    const stats = getPlayerDailyStats();
    stats.totalXP += xpEarned;
    savePlayerDailyStats(stats);

    // (#5) Update quest stats for weekly challenge completion
    updateQuestProgress('weeklyCompleted', 1);
  }

  saveWeeklyChallenge(challenge);
  return { challenge, xpEarned };
}

/**
 * Check whether the given player has already submitted a qualifying result
 * to this week's weekly challenge today.
 */
export function isWeeklyChallengeCompletedToday(playerId: string): boolean {
  const today = todayISO();
  const now = new Date();
  const weekNumber = getISOWeek(now);
  const year = now.getFullYear();
  const storageKey = `${WEEKLY_CHALLENGE_KEY_PREFIX}${weekNumber}_${year}`;

  const stored = getJson<WeeklyChallengeData | null>(storageKey, null);
  if (!stored) return false;

  return stored.entries.some(
    e => e.playerId === playerId && timestampToISO(e.completedAt) === today,
  );
}

/** Returns the time remaining until the weekly challenge resets (next Monday 00:00). */
export function getTimeUntilWeeklyReset(): { days: number; hours: number } {
  const now = new Date();
  const dow = now.getDay();
  // Days until next Monday (0=Sun → 1 day; 1=Mon → 7 days; etc.)
  const daysUntilMonday = dow === 0 ? 1 : (8 - dow);

  const nextMonday = new Date(now);
  nextMonday.setDate(now.getDate() + daysUntilMonday);
  nextMonday.setHours(0, 0, 0, 0);

  const diff = Math.max(0, nextMonday.getTime() - now.getTime());
  const totalHours = diff / (1000 * 60 * 60);

  return {
    days: Math.floor(totalHours / 24),
    hours: Math.floor(totalHours % 24),
  };
}

// ---------------------------------------------------------------------------
// (#5) Quest System
// ---------------------------------------------------------------------------

const DEFAULT_QUEST_STATS: StoredQuestStats = {
  dailyCompleted: 0,
  weeklyCompleted: 0,
  challengeModesPlayed: 0,
  perfectNotesTotal: 0,
  totalSongsCompleted: 0,
  _lastDailyReset: null,
  _lastWeeklyReset: null,
};

/**
 * Get the player's current quest stats, applying daily/weekly resets as needed.
 *
 * - `dailyCompleted` resets at the start of each new day.
 * - `weeklyCompleted` resets at the start of each new week (Monday).
 */
export function getPlayerQuestStats(): PlayerQuestStats {
  const today = todayISO();
  const weekStart = getMondayISO(new Date());

  const stored = getJson<StoredQuestStats>(QUEST_STATS_KEY, DEFAULT_QUEST_STATS);
  const stats = { ...stored };

  // Daily reset for dailyCompleted
  if (stats._lastDailyReset !== today) {
    stats.dailyCompleted = 0;
    stats._lastDailyReset = today;
  }

  // Weekly reset for weeklyCompleted
  if (stats._lastWeeklyReset !== weekStart) {
    stats.weeklyCompleted = 0;
    stats._lastWeeklyReset = weekStart;
  }

  setJson(QUEST_STATS_KEY, stats);

  // Return clean PlayerQuestStats (strip internal fields)
  const { _lastDailyReset: _, _lastWeeklyReset: __, ...clean } = stats;
  return clean;
}

/** Get progress for a specific quest. */
export function getQuestProgress(questId: string): QuestProgress {
  const all = getJson<Record<string, QuestProgress>>(QUEST_PROGRESS_KEY, {});
  return all[questId] ?? { questId, currentProgress: 0, completed: false };
}

/**
 * Update progress for all quests that track a given field.
 *
 * Call this whenever a relevant event occurs:
 * - `'dailyCompleted'` — after completing a daily challenge
 * - `'weeklyCompleted'` — after completing a weekly challenge
 * - `'challengeModesPlayed'` — after playing a challenge mode
 * - `'perfectNotesTotal'` — after hitting a perfect note
 * - `'totalSongsCompleted'` — after completing any song
 */
export function updateQuestProgress(checkField: keyof PlayerQuestStats, amount: number): void {
  const questStats = getPlayerQuestStats();
  const newValue = questStats[checkField] + amount;

  // Persist the updated field back to storage
  const stored = getJson<StoredQuestStats>(QUEST_STATS_KEY, DEFAULT_QUEST_STATS);
  stored[checkField] = newValue;
  setJson(QUEST_STATS_KEY, stored);

  // Update progress for any quests tracking this field
  const allProgress = getJson<Record<string, QuestProgress>>(QUEST_PROGRESS_KEY, {});

  for (const quest of DAILY_QUESTS) {
    if (quest.checkProgress === checkField) {
      const existing = allProgress[quest.id] ?? { questId: quest.id, currentProgress: 0, completed: false };
      if (existing.completed) continue; // already completed — don't overwrite

      const updated: QuestProgress = {
        ...existing,
        currentProgress: Math.min(newValue, quest.target),
        completed: newValue >= quest.target,
      };
      allProgress[quest.id] = updated;
    }
  }

  setJson(QUEST_PROGRESS_KEY, allProgress);
}

/**
 * Claim the reward for a completed quest.
 * Returns `{ xp, badge? }` if successfully claimed, or throws if not eligible.
 */
export function claimQuestReward(questId: string): { xp: number; badge?: DailyBadge } {
  const quest = DAILY_QUESTS.find(q => q.id === questId);
  if (!quest) throw new Error(`Unknown quest: ${questId}`);

  const progress = getQuestProgress(questId);
  if (!progress.completed) throw new Error('Quest not yet completed');
  if (progress.claimedAt) throw new Error('Reward already claimed');

  // Mark as claimed
  const allProgress = getJson<Record<string, QuestProgress>>(QUEST_PROGRESS_KEY, {});
  allProgress[questId] = { ...progress, claimedAt: Date.now() };
  setJson(QUEST_PROGRESS_KEY, allProgress);

  // Award XP to player stats
  const stats = getPlayerDailyStats();
  stats.totalXP += quest.reward.xp;
  savePlayerDailyStats(stats);

  // Optionally create a badge
  let badge: DailyBadge | undefined;
  if (quest.reward.badgeId) {
    badge = {
      id: quest.reward.badgeId,
      name: quest.name,
      icon: quest.icon,
      description: `Completed quest: ${quest.name}`,
      unlockedAt: Date.now(),
    };

    if (!stats.badges.some(b => b.id === badge!.id)) {
      stats.badges.push(badge);
      savePlayerDailyStats(stats);
    }
  }

  return { xp: quest.reward.xp, badge };
}

/**
 * Returns all active (defined) quests with their current progress.
 * Useful for rendering a quest list in the UI.
 */
export function getActiveQuests(): Array<QuestDefinition & QuestProgress> {
  const questStats = getPlayerQuestStats();

  return DAILY_QUESTS.map(quest => {
    const progress = getQuestProgress(quest.id);
    // Use the live stat value for currentProgress (not the snapshotted one)
    const liveValue = questStats[quest.checkProgress as keyof PlayerQuestStats];
    const currentProgress = Math.min(liveValue, quest.target);
    const completed = liveValue >= quest.target;

    return {
      ...quest,
      questId: quest.id,
      currentProgress,
      completed: progress.claimedAt ? true : completed,
      claimedAt: progress.claimedAt,
    };
  });
}

// ---------------------------------------------------------------------------
// Utility functions
// ---------------------------------------------------------------------------

/** Check if the daily challenge has been completed today. */
export function isChallengeCompletedToday(): boolean {
  const stored = getItem(DAILY_CHALLENGE_KEY);
  if (stored) {
    try {
      const data = JSON.parse(stored);
      return data.date === todayISO() && data.completed;
    } catch (error) {
      console.debug('[daily-challenge]: failed to parse challenge completion data', error);
      return false;
    }
  }
  return false;
}

/**
 * Get XP level info — delegates to the unified rank system from player-progression.ts.
 * This ensures the daily challenge display shows the same rank/title as the
 * player's profile progression screen.
 */
export function getXPLevel(xp: number): { level: number; title: string; progress: number; nextLevel: number } {
  const rank = getRankForXP(xp);
  const rankXP = rank.maxXP - rank.minXP;
  const progress = rankXP === Infinity
    ? 100
    : Math.min(100, Math.max(0, ((xp - rank.minXP) / rankXP) * 100));

  return {
    level: xp,            // Raw XP — kept for backward compatibility (not displayed in UI)
    title: rank.name,
    progress,
    nextLevel: rank.maxXP === Infinity ? xp : rank.maxXP,
  };
}

/** Get formatted time until the daily challenge resets (midnight). */
export function getTimeUntilReset(): { hours: number; minutes: number; seconds: number } {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  const diff = Math.max(0, tomorrow.getTime() - now.getTime());

  return {
    hours: Math.floor(diff / (1000 * 60 * 60)),
    minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((diff % (1000 * 60)) / 1000),
  };
}
