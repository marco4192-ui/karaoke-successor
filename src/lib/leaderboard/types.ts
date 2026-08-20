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
  /** Whether this score passed anti-cheat verification on the server */
  verified: boolean;
  /** Fingerprint version used when this score was submitted */
  fingerprint_version: 'v1' | 'v2' | null;
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
  /** Anti-cheat proof package — optional for backwards compatibility, but strongly encouraged */
  proof?: ScoreProofPackage;
  /** v2 song hash (if v2 fingerprint was used). Server stores both v1 and v2 for lookup. */
  song_hash_v2?: string;
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
}

// ── API error ─────────────────────────────────────────────
export interface ApiError {
  error: boolean;
  message: string;
  /** If a score was rejected due to anti-cheat, this contains the reason code */
  anti_cheat_reason?: string;
}
