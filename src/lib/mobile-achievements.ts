// Mobile Companion Achievements — track and display user milestones

import { getJson, setJson, getItem, setItem, StorageKeys } from '@/lib/storage';
import type { Language } from '@/lib/i18n/locales';
import { t } from '@/lib/i18n/translations';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UserStats {
  songsSung: number;
  perfectScores: number; // accuracy >= 95%
  duelsWon: number;
  totalScore: number;
  longestStreak: number; // consecutive days
  songsQueued: number;
  differentGenres: number;
  lastPlayDate: string; // ISO date string for streak tracking
  genres: string[]; // unique genres sung
}

export interface Achievement {
  id: string;
  title: string;
  titleKey: string;
  description: string;
  descriptionKey: string;
  icon: string; // emoji
  condition: (stats: UserStats) => boolean;
  /** Returns 0–1 indicating progress towards this achievement */
  progress: (stats: UserStats) => number;
}

interface GameResults {
  songId: string;
  songTitle: string;
  songArtist: string;
  score: number;
  accuracy: number;
  maxCombo: number;
  rating: string;
  playedAt: number;
  genre?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATS_STORAGE_KEY = StorageKeys.MOBILE_USER_STATS;

const DEFAULT_STATS: UserStats = {
  songsSung: 0,
  perfectScores: 0,
  duelsWon: 0,
  totalScore: 0,
  longestStreak: 0,
  songsQueued: 0,
  differentGenres: 0,
  lastPlayDate: '',
  genres: [],
};

// ---------------------------------------------------------------------------
// Achievement Definitions
// ---------------------------------------------------------------------------

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_song',
    title: 'First Steps',
    titleKey: 'mobile.achievements.firstSong.title',
    description: 'Sing your first song',
    descriptionKey: 'mobile.achievements.firstSong.description',
    icon: '🎤',
    condition: (s) => s.songsSung >= 1,
    progress: (s) => Math.min(s.songsSung / 1, 1),
  },
  {
    id: 'ten_songs',
    title: 'Rising Star',
    titleKey: 'mobile.achievements.risingStar.title',
    description: 'Sing 10 songs',
    descriptionKey: 'mobile.achievements.risingStar.description',
    icon: '⭐',
    condition: (s) => s.songsSung >= 10,
    progress: (s) => Math.min(s.songsSung / 10, 1),
  },
  {
    id: 'fifty_songs',
    title: 'Veteran',
    titleKey: 'mobile.achievements.veteran.title',
    description: 'Sing 50 songs',
    descriptionKey: 'mobile.achievements.veteran.description',
    icon: '🏆',
    condition: (s) => s.songsSung >= 50,
    progress: (s) => Math.min(s.songsSung / 50, 1),
  },
  {
    id: 'perfect_score',
    title: 'Perfectionist',
    titleKey: 'mobile.achievements.perfectionist.title',
    description: 'Get a perfect score (95%+)',
    descriptionKey: 'mobile.achievements.perfectionist.description',
    icon: '💎',
    condition: (s) => s.perfectScores >= 1,
    progress: (s) => Math.min(s.perfectScores / 1, 1),
  },
  {
    id: 'five_perfect',
    title: 'Flawless',
    titleKey: 'mobile.achievements.flawless.title',
    description: 'Get 5 perfect scores',
    descriptionKey: 'mobile.achievements.flawless.description',
    icon: '✨',
    condition: (s) => s.perfectScores >= 5,
    progress: (s) => Math.min(s.perfectScores / 5, 1),
  },
  {
    id: 'high_score',
    title: 'Score Master',
    titleKey: 'mobile.achievements.scoreMaster.title',
    description: 'Reach 10,000 total points',
    descriptionKey: 'mobile.achievements.scoreMaster.description',
    icon: '🔥',
    condition: (s) => s.totalScore >= 10000,
    progress: (s) => Math.min(s.totalScore / 10000, 1),
  },
  {
    id: 'queue_5',
    title: 'Playlist Builder',
    titleKey: 'mobile.achievements.playlistBuilder.title',
    description: 'Queue 5 songs',
    descriptionKey: 'mobile.achievements.playlistBuilder.description',
    icon: '📋',
    condition: (s) => s.songsQueued >= 5,
    progress: (s) => Math.min(s.songsQueued / 5, 1),
  },
  {
    id: 'genre_3',
    title: 'Genre Explorer',
    titleKey: 'mobile.achievements.genreExplorer.title',
    description: 'Sing songs from 3 genres',
    descriptionKey: 'mobile.achievements.genreExplorer.description',
    icon: '🌍',
    condition: (s) => s.differentGenres >= 3,
    progress: (s) => Math.min(s.differentGenres / 3, 1),
  },
];

// ---------------------------------------------------------------------------
// Localization helper
// ---------------------------------------------------------------------------

/** Get a localized copy of a mobile achievement. */
export function getLocalizedMobileAchievement(
  ach: Achievement,
  language?: Language,
): { title: string; description: string } {
  return {
    title: t(ach.titleKey, language),
    description: t(ach.descriptionKey, language),
  };
}

// ---------------------------------------------------------------------------
// Persistence helpers
// ---------------------------------------------------------------------------

export function loadUserStats(): UserStats {
  return getJson<UserStats>(STATS_STORAGE_KEY, { ...DEFAULT_STATS });
}

export function saveUserStats(stats: UserStats): void {
  setJson(STATS_STORAGE_KEY, stats);
}

// ---------------------------------------------------------------------------
// Update stats from a finished game
// ---------------------------------------------------------------------------

export function updateStatsFromResults(stats: UserStats, results: GameResults): UserStats {
  const updated = { ...stats, genres: [...stats.genres] };

  // Increment songs sung
  updated.songsSung += 1;

  // Check for perfect score (accuracy >= 95%)
  if (results.accuracy >= 95) {
    updated.perfectScores += 1;
  }

  // Add to total score
  updated.totalScore += results.score;

  // Track unique genres
  if (results.genre && results.genre.trim() && !updated.genres.includes(results.genre.trim())) {
    updated.genres.push(results.genre.trim());
  }
  updated.differentGenres = updated.genres.length;

  // Streak tracking
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  if (updated.lastPlayDate) {
    const last = new Date(updated.lastPlayDate + 'T00:00:00');
    const todayDate = new Date(today + 'T00:00:00');
    const diffDays = Math.round((todayDate.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 1) {
      // Consecutive day
      updated.longestStreak += 1;
    } else if (diffDays > 1) {
      // Streak broken, reset to 1 (today counts)
      updated.longestStreak = 1;
    }
    // diffDays === 0: same day, no change
  } else {
    // First ever play
    updated.longestStreak = 1;
  }
  updated.lastPlayDate = today;

  return updated;
}

// ---------------------------------------------------------------------------
// Increment songs queued
// ---------------------------------------------------------------------------

export function incrementSongsQueued(): UserStats {
  const stats = loadUserStats();
  stats.songsQueued += 1;
  saveUserStats(stats);
  return stats;
}

// ---------------------------------------------------------------------------
// Check which achievements are unlocked
// ---------------------------------------------------------------------------

export function getUnlockedAchievements(stats: UserStats): Achievement[] {
  return ACHIEVEMENTS.filter((a) => a.condition(stats));
}

// Track previously unlocked IDs so we can detect "new" unlocks
const UNLOCKED_STORAGE_KEY = StorageKeys.MOBILE_UNLOCKED_ACHIEVEMENTS;

function getPreviouslyUnlockedIds(): string[] {
  return getJson<string[]>(UNLOCKED_STORAGE_KEY, []);
}

function saveUnlockedIds(ids: string[]): void {
  setJson(UNLOCKED_STORAGE_KEY, ids);
}

/**
 * Compare current stats against previous unlocks and return any newly unlocked achievements.
 * Also persists the updated unlocked set.
 */
export function checkNewAchievements(stats: UserStats): Achievement[] {
  const previousIds = getPreviouslyUnlockedIds();
  const newlyUnlocked: Achievement[] = [];

  for (const achievement of ACHIEVEMENTS) {
    if (!previousIds.includes(achievement.id) && achievement.condition(stats)) {
      newlyUnlocked.push(achievement);
    }
  }

  if (newlyUnlocked.length > 0) {
    const allIds = [...previousIds];
    for (const a of newlyUnlocked) {
      if (!allIds.includes(a.id)) {
        allIds.push(a.id);
      }
    }
    saveUnlockedIds(allIds);
  }

  return newlyUnlocked;
}