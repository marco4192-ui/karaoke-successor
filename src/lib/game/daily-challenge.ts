// Daily Challenge Leaderboard System
// Global rankings, XP system, and streak rewards

import { getRankForXP } from './player-progression';

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
  type: 'score' | 'accuracy' | 'combo' | 'songs' | 'perfect_notes';
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
}

export interface DailyBadge {
  id: string;
  name: string;
  icon: string;
  description: string;
  unlockedAt: number;
}

// XP rewards
export const XP_REWARDS = {
  CHALLENGE_COMPLETE: 100,
  STREAK_BONUS_BASE: 10, // +10 per streak day
  TOP_3_BONUS: [50, 30, 20], // 1st, 2nd, 3rd
  TOP_10_BONUS: 10,
  PERFECT_CHALLENGE: 50, // 100% accuracy on accuracy challenge
  STREAK_MILESTONES: {
    7: { xp: 200, badge: 'Week Warrior' },
    14: { xp: 500, badge: 'Fortnight Fighter' },
    30: { xp: 1000, badge: 'Monthly Master' },
    60: { xp: 2500, badge: 'Bi-Monthly Boss' },
    100: { xp: 5000, badge: 'Century Champion' },
    365: { xp: 50000, badge: 'Yearly Legend' },
  },
} as const;

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
};

// Storage keys
const DAILY_CHALLENGE_KEY = 'dailyChallenge';
const DAILY_LEADERBOARD_KEY = 'dailyChallengeLeaderboard';
const PLAYER_DAILY_STATS_KEY = 'playerDailyStats';

/** Returns today's date as a locale-independent ISO string (YYYY-MM-DD). */
function todayISO(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

// Generate daily challenge based on date seed
export function getDailyChallenge(): DailyChallengeData {
  const today = todayISO();
  const seed = today.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
  const types: Array<'score' | 'accuracy' | 'combo' | 'songs' | 'perfect_notes'> = 
    ['score', 'accuracy', 'combo', 'songs', 'perfect_notes'];
  const type = types[seed % types.length];
  const targets = { score: 80000, accuracy: 85, combo: 50, songs: 3, perfect_notes: 20 };
  
  // Try to load existing leaderboard
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(`${DAILY_LEADERBOARD_KEY}_${today}`);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        // Fall through to create new
      }
    }
  }
  
  return {
    date: today,
    type,
    target: targets[type],
    seed,
    entries: [],
    totalParticipants: 0,
  };
}

// Save leaderboard
function saveDailyChallenge(data: DailyChallengeData): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(`${DAILY_LEADERBOARD_KEY}_${data.date}`, JSON.stringify(data));
}

// Get player's daily stats
export function getPlayerDailyStats(): PlayerDailyStats {
  if (typeof window === 'undefined') {
    return {
      currentStreak: 0,
      longestStreak: 0,
      totalCompleted: 0,
      totalXP: 0,
      lastCompletedDate: null,
      badges: [],
      weeklyProgress: [0, 0, 0, 0, 0, 0, 0],
    };
  }

  const stored = localStorage.getItem(PLAYER_DAILY_STATS_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      // Fall through to defaults
    }
  }

  return {
    currentStreak: 0,
    longestStreak: 0,
    totalCompleted: 0,
    totalXP: 0,
    lastCompletedDate: null,
    badges: [],
    weeklyProgress: [0, 0, 0, 0, 0, 0, 0],
  };
}

// Save player's daily stats
function savePlayerDailyStats(stats: PlayerDailyStats): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(PLAYER_DAILY_STATS_KEY, JSON.stringify(stats));
}

// Submit a challenge result
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
  const challenge = getDailyChallenge();
  let stats = getPlayerDailyStats();
  const today = todayISO();
  let xpEarned = XP_REWARDS.CHALLENGE_COMPLETE;
  const newBadges: DailyBadge[] = [];

  // Check if already completed today
  const existingEntry = challenge.entries.find(e => e.playerId === player.id);
  if (existingEntry) {
    // Update if better score
    if (result.score > existingEntry.score) {
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
  const sortMetric = (entry: DailyChallengeEntry): number => {
    switch (challenge.type) {
      case 'accuracy': return entry.accuracy;
      case 'combo': return entry.combo;
      case 'perfect_notes': return entry.perfectNotesCount;
      default: return entry.score;
    }
  };
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

    // Check for top 3 and champion badges
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

    // Update weekly progress
    const dayOfWeek = new Date().getDay();
    stats.weeklyProgress[dayOfWeek] = 1;

    stats.totalXP += xpEarned;
  }

  // Save data
  saveDailyChallenge(challenge);
  savePlayerDailyStats(stats);

  // Sync completion flag so isChallengeCompletedToday() returns true
  // (isChallengeCompletedToday reads from DAILY_CHALLENGE_KEY, not the leaderboard)
  if (typeof window !== 'undefined') {
    localStorage.setItem(DAILY_CHALLENGE_KEY, JSON.stringify({
      date: today,
      completed: true,
      streak: stats.currentStreak,
    }));
  }

  return { challenge, stats, xpEarned, newBadges, rank: playerRank };
}

// Check if challenge is completed
export function isChallengeCompletedToday(): boolean {
  if (typeof window === 'undefined') return false;
  
  const stored = localStorage.getItem(DAILY_CHALLENGE_KEY);
  if (stored) {
    try {
      const data = JSON.parse(stored);
      return data.date === todayISO() && data.completed;
    } catch {
      return false;
    }
  }
  return false;
}

// Get XP level info — delegates to the unified rank system from player-progression.ts.
// This ensures the daily challenge display shows the same rank/title as the
// player's profile progression screen.
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

// Get formatted time until reset
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
