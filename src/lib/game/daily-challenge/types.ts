// Daily Challenge — shared types & interfaces
//
// Part of the daily-challenge module (see ./index.ts). Pure types only —
// no runtime code so every submodule can depend on it without cycles.

import type {
  DailySongContext,
  DailyDifficulty,
} from '../challenge-pools';

// Re-export the pool types so existing importers keep working.
export type {
  DailyTypeDefinition,
  WeeklyTypeDefinition,
  DailyCategory,
  DailyCategoryField,
  DailySongContext,
  DailyDifficulty,
} from '../challenge-pools';

// ---------------------------------------------------------------------------
// Interfaces — Daily Challenge
// ---------------------------------------------------------------------------

export interface DailyChallengeEntry {
  playerId: string;
  playerName: string;
  playerAvatar?: string;
  playerColor: string;
  score: number;
  accuracy: number;
  combo: number;
  perfectNotesCount: number;
  /** Extended metrics for the wider daily type pool (optional — old entries default to 0). */
  goldenNotesCount?: number;
  notesHit?: number;
  notesMissed?: number;
  tickAccuracy?: number;
  /** Difficulty the player selected for this attempt. */
  difficulty?: string;
  /** How many of today's 5 daily slots this player has completed. */
  slotsCompletedToday?: number;
  /** Today's daily badge tier for this player (bronze/silver/gold). */
  dailyBadge?: 'bronze' | 'silver' | 'gold';
  completedAt: number;
  rank: number;
}

export interface DailyChallengeData {
  date: string;
  type: DailyChallengeType;
  target: number;
  /** Difficulty the target was scaled for (display copies only — storage keeps the normal base). */
  difficulty?: DailyDifficulty;
  seed: number;
  entries: DailyChallengeEntry[];
  totalParticipants: number;
}

export interface PlayerDailyStats {
  currentStreak: number;
  longestStreak: number;
  totalCompleted: number;
  totalXP: number;
  lastCompletedDate: string | null;
  badges: DailyBadge[];
  weeklyProgress: number[]; // 7 days of completion
  lastWeekStart: string | null; // ISO date of Monday of current week, for weekly reset
  /** Cumulative number of weekly challenges completed (per player, for achievements). */
  weeklyCompletedTotal?: number;
}

/** Per-player progress on today's 5 daily challenge slots. */
export interface PlayerDailySlotProgress {
  date: string;
  /** slot indices (0–4) completed today at ANY difficulty */
  completedSlots: number[];
  /** per-slot union of met difficulties across all attempts today */
  metBySlot: Record<string, DailyDifficulty[]>;
}

/** Per-player progress on this week's 5 weekly challenge slots. */
export interface PlayerWeeklySlotProgress {
  /** week key: `${year}-W${weekNumber}` */
  weekKey: string;
  completedSlots: number[];
  /** per-slot union of met difficulties across the week */
  metBySlot: Record<string, DailyDifficulty[]>;
}

export interface DailyBadge {
  id: string;
  name: string;
  nameKey: string;
  icon: string;
  description: string;
  descriptionKey: string;
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
  /** Extended metrics for the wider daily type pool. */
  goldenNotes?: number;
  notesHit?: number;
  notesMissed?: number;
  tickAccuracy?: number;
  completedAt: number;
  targetMet: boolean; // whether the challenge target was achieved (at any difficulty)
  /** Difficulty selected for this best attempt. */
  difficulty?: DailyDifficulty;
  /** All difficulty levels whose target was met today (union across all attempts). */
  metDifficulties?: DailyDifficulty[];
  /** Which daily slot this best attempt was achieved on. */
  slot?: number;
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
  /** which weekly slot (0–4) this submission counts towards */
  slot: number;
  /** raw metric value of this submission (aggregated per type) */
  metric: number;
  /** difficulty selected for this submission */
  difficulty?: DailyDifficulty;
  completedAt: number;
}

/** Weekly challenge data — resets every Monday. Five slots, unlocked in sequence. */
export interface WeeklyChallengeData {
  weekNumber: number;
  year: number;
  /** the five weekly challenge types for this week (slot → type id) */
  slots: Array<{ slot: number; type: string }>;
  entries: WeeklyChallengeEntry[];
}

// ---------------------------------------------------------------------------
// Interfaces — Quest System (#5)
// ---------------------------------------------------------------------------

/** Static definition of a quest/mission. */
export interface QuestDefinition {
  id: string;
  name: string;
  nameKey: string;
  description: string;
  descriptionKey: string;
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
export interface StoredQuestStats extends PlayerQuestStats {
  _lastDailyReset?: string | null;
  _lastWeeklyReset?: string | null;
}

// ---------------------------------------------------------------------------
// Metric / evaluation types
// ---------------------------------------------------------------------------

/** result metric a daily/weekly type is evaluated against */
export type DailyMetricKey =
  | 'score'
  | 'accuracy'
  | 'tickAccuracy'
  | 'maxCombo'
  | 'perfectNotesCount'
  | 'goldenNotesCount'
  | 'notesHit'
  | 'notesMissed'
  | 'category_match'
  | 'songsCompleted';

/** additional side condition a daily/weekly type requires besides the scaled target */
export interface DailyGate {
  metricKey: DailyMetricKey;
  op: '>=' | '<=';
  value: number;
}

/** all valid daily challenge type ids */
export type DailyChallengeType = string;

/** metrics accepted by daily/weekly submissions (superset of the classic four) */
export interface DailyResultMetrics {
  score: number;
  accuracy: number;
  tickAccuracy?: number;
  combo: number; // max combo
  perfectNotesCount?: number;
  goldenNotesCount?: number;
  notesHit?: number;
  notesMissed?: number;
  /** whether the sung song matched the challenge's category requirement (0/1) */
  categoryMatch?: number;
  /** song metadata context for category evaluation */
  song?: DailySongContext;
  /** current app language (for 'atypical language' challenges) */
  appLanguage?: string;
}

/** Outcome of a daily attempt against all difficulty levels. */
export interface DailyAttemptEvaluation {
  metric: number;
  gatesPass: boolean;
  /** difficulties whose target this attempt met (empty when gates failed) */
  met: DailyDifficulty[];
}
