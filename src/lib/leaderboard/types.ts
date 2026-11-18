/**
 * Online Leaderboard — Shared Types
 */

// ── Re-export proof types for convenience ──────────────────
import type { ScoreProofPackage, NoteProofEntry } from './anti-cheat-proof';
import type { ScoringMetaForProof } from './song-fingerprint';
export type { ScoreProofPackage, NoteProofEntry, ScoringMetaForProof };

// ── Game type for leaderboard purposes ────────────────────
export type LeaderboardGameType = 's' | 'd';
// s = single, duel (1v1 competitive)
// d = duet (vs-mode, each singer gets partial song)

// ── R72: global board time windows + alternative sorts ─────
/** 'all' = all-time (cached profile stats), 'month'/'week' = calendar
 *  windows aggregated from the server-side play log (server timezone). */
export type LeaderboardWindow = 'all' | 'month' | 'week';
/** score = points (default) | best = single best score | accuracy = Ø
 *  accuracy | plays = songs played (all-time) / rounds played (windows). */
export type LeaderboardSort = 'score' | 'best' | 'accuracy' | 'plays';

// ── Profile (server-side representation) ──────────────────
export interface OnlineProfile {
  profile_uid: string;
  display_name: string;
  color: string;
  country_code: string | null;
  show_on_board: 1 | 0;
  show_country: 1 | 0;
  /** Ownership token — only present in responses that presented it (register/update) */
  sync_code?: string;
  total_score: number;
  best_score: number;
  songs_played: number;
  games_played: number;
  avg_accuracy: number;
  /** R72: Battle-Royale-Siege (all-time online counter) */
  br_wins?: number;
  created_at: string;
  updated_at: string;
}

// ── Score entry (as returned from server) ─────────────────
export interface OnlineScoreEntry {
  rank: number;
  profile_uid: string;
  display_name: string;
  color: string;
  country_code: string | null;
  song_hash: string;
  score: number;
  max_score: number;
  accuracy: number;
  max_combo: number;
  difficulty: 'easy' | 'normal' | 'hard';
  rating: 'perfect' | 'excellent' | 'great' | 'good' | 'okay' | 'fair' | 'rough' | 'poor';
  played_at: string;
  /** Whether this score passed anti-cheat verification on the server */
  verified: boolean;
  /** Fingerprint version used when this score was submitted */
  fingerprint_version: 'v1' | 'v2' | null;
  /** R72: soft anti-cheat flags — non-empty = statistical outlier, the UI
   *  badges the entry with a warning marker (never a rejection). */
  ac_flags?: string[] | null;
}

// ── Batch response: song_hash → OnlineScoreEntry[] ─────────
export type BatchScoresResponse = Record<string, OnlineScoreEntry[]>;

// ── Submit score request payload ──────────────────────────
export interface SubmitScorePayload {
  profile_uid: string;
  /** Ownership token of the profile — required by the server */
  sync_code: string;
  song_hash: string;
  game_type: LeaderboardGameType;
  score: number;
  max_score: number;
  accuracy: number;
  max_combo: number;
  difficulty: 'easy' | 'normal' | 'hard';
  rating: 'perfect' | 'excellent' | 'great' | 'good' | 'okay' | 'fair' | 'rough' | 'poor';
  notes_hit: number;
  notes_missed: number;
  /** Anti-cheat proof package — optional for backwards compatibility, but strongly encouraged */
  proof?: ScoreProofPackage;
  /** v2 song hash (if v2 fingerprint was used). Server stores both v1 and v2 for lookup. */
  song_hash_v2?: string;
  /** R72: replay nonce (32 hex chars). Generated per WIRE CALL by the
   *  service — never persisted in the outbox (a retry needs a fresh one). */
  nonce?: string;
}

// ── Submit score response ─────────────────────────────────
export interface SubmitScoreResult {
  ok: boolean;
  rank: number;
  is_new_best: boolean;
  /** If false, the score was rejected by anti-cheat checks */
  verified?: boolean;
  /** Human-readable verification status */
  verification_note?: string;
}

// ── Global leaderboard entry ──────────────────────────────
export interface GlobalLeaderboardEntry {
  rank: number;
  profile_uid: string;
  display_name: string;
  color: string;
  country_code: string | null;
  total_score: number;
  best_score: number;
  songs_played: number;
  games_played: number;
  avg_accuracy: number;
  /** R72: Battle-Royale-Siege (all-time counter, informational on window boards) */
  br_wins?: number;
}

/** R72: full GET /leaderboard/global response — window/sort echo, total
 *  player count and the caller's own rank + percentile (when uid passed). */
export interface GlobalLeaderboardResponse {
  window: LeaderboardWindow;
  sort: LeaderboardSort;
  total_players: number;
  leaderboard: GlobalLeaderboardEntry[];
  you: {
    rank: number;
    total: number;
    /** "Top X %" — rank / total × 100, one decimal */
    percentile_top: number | null;
  } | null;
}

// ── R72/C: song #1 ("crowns") ─────────────────────────────
export interface CrownsResponse {
  profile_uid: string;
  display_name: string;
  /** Number of song boards (per game type) where the profile holds #1 */
  crowns: number;
  songs: Array<{
    song_hash: string;
    game_type: LeaderboardGameType;
    score: number;
    played_at: string;
  }>;
}

// ── R72/C: recent online rounds (play log) ────────────────
export interface OnlinePlayEntry {
  song_hash: string;
  game_type: LeaderboardGameType;
  score: number;
  accuracy: number;
  difficulty: 'easy' | 'normal' | 'hard';
  created_at: string;
}

// ── R72/D: Battle-Royale result ──────────────────────────
export interface SubmitBrResultResult {
  ok: boolean;
  /** false = loss (accepted, never counted) or win blocked by the 120 s
   *  min-interval (double submit / spam) */
  counted?: boolean;
  /** The profile's current online BR win count */
  br_wins?: number;
}

// ── Profile sync (cross-device backup) ────────────────────
import type { PlayerProfile, HighscoreEntry } from '@/types/game';

/** Payload stored on the server by uploadProfile() */
export interface ProfileSyncUpload {
  sync_code: string;
  profile: PlayerProfile;
  highscores: Record<string, HighscoreEntry[]> | null;
}

/** What GET /profiles/sync/{code} returns */
export interface ProfileSyncDownload {
  profile_uid: string;
  profile: PlayerProfile;
  highscores: Record<string, HighscoreEntry[]> | null;
  updated_at: string;
}

// ── Daily challenge (online board) ───────────────────────
/**
 * Daily challenge variant. The 4 legacy ids plus the 18 newer types of the
 * expanded daily pool — the server stores this as VARCHAR and validates
 * against its own allow-list.
 */
export type DailyChallengeType = string;

/** Daily difficulty level selected for the attempt */
export type DailyDifficultyLevel = 'easy' | 'normal' | 'hard' | 'very_hard' | 'insane';

/** Payload for POST /daily — submit a daily challenge result */
export interface SubmitDailyResultPayload {
  profile_uid: string;
  /** Ownership token of the profile — required by the server */
  sync_code: string;
  /** Challenge date (YYYY-MM-DD, local time of the client) */
  challenge_date: string;
  challenge_type: DailyChallengeType;
  /** The challenge-relevant metric (higher = better for max types, lower = better for min types) */
  metric_value: number;
  /** XP earned locally for this challenge (informational) */
  xp_earned: number;
  /** Difficulty the player selected for this attempt */
  difficulty?: DailyDifficultyLevel;
}

/** One entry of the online daily leaderboard (GET /daily?date=…) */
export interface OnlineDailyEntry {
  rank: number;
  profile_uid: string;
  display_name: string;
  color: string;
  country_code: string | null;
  challenge_type: DailyChallengeType;
  metric_value: number;
  /** Difficulty of the attempt that produced this entry (informational) */
  difficulty?: DailyDifficultyLevel;
  created_at: string;
}

// ── API error ─────────────────────────────────────────────
export interface ApiError {
  error: boolean;
  message: string;
  /** If a score was rejected due to anti-cheat, this contains the reason code */
  anti_cheat_reason?: string;
}
