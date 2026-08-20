/**
 * Online Leaderboard — Shared Types
 */

// ── Game type for leaderboard purposes ────────────────────
export type LeaderboardGameType = 's' | 'd';
// s = single, duel (1v1 competitive)
// d = duet (vs-mode, each singer gets partial song)

// ── Profile (server-side representation) ──────────────────
export interface OnlineProfile {
  profile_uid: string;
  display_name: string;
  color: string;
  country_code: string | null;
  show_on_board: 1 | 0;
  show_country: 1 | 0;
  total_score: number;
  best_score: number;
  songs_played: number;
  games_played: number;
  avg_accuracy: number;
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
  rating: 'perfect' | 'excellent' | 'good' | 'okay' | 'poor';
  played_at: string;
}

// ── Batch response: song_hash → OnlineScoreEntry[] ─────────
export type BatchScoresResponse = Record<string, OnlineScoreEntry[]>;

// ── Submit score request payload ──────────────────────────
export interface SubmitScorePayload {
  profile_uid: string;
  song_hash: string;
  game_type: LeaderboardGameType;
  score: number;
  max_score: number;
  accuracy: number;
  max_combo: number;
  difficulty: 'easy' | 'normal' | 'hard';
  rating: 'perfect' | 'excellent' | 'good' | 'okay' | 'poor';
  notes_hit: number;
  notes_missed: number;
}

// ── Submit score response ─────────────────────────────────
export interface SubmitScoreResult {
  ok: boolean;
  rank: number;
  is_new_best: boolean;
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
}

// ── API error ─────────────────────────────────────────────
export interface ApiError {
  error: boolean;
  message: string;
}
