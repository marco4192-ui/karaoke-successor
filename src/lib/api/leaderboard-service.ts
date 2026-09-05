/**
 * Online Leaderboard Service v2
 * Copyright-safe: uses song hash fingerprints, no song metadata sent.
 * Now includes v2 fingerprint support and anti-cheat proof generation.
 */

import type {
  OnlineProfile, OnlineScoreEntry,
  SubmitScorePayload, SubmitScoreResult, GlobalLeaderboardEntry,
  LeaderboardGameType, ScoreProofPackage,
  ProfileSyncDownload, ProfileSyncUpload,
} from '@/lib/leaderboard/types';
import {
  generateSongHash, generateSongHashV2, songNotesFromSong,
} from '@/lib/leaderboard/song-fingerprint';
import type { ScoringMetadata } from '@/lib/game/scoring';
import type { PlayerProfile, Song, Difficulty, GameMode, HighscoreEntry } from '@/types/game';

export const API_BASE = process.env.NEXT_PUBLIC_LEADERBOARD_URL || 'https://hosting236176.ae88b.netcup.net/leaderboard-api';

// ── Internal helpers ────────────────────────────────────

async function request<T>(endpoint: string, init: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);

  try {
    const res = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.NEXT_PUBLIC_LEADERBOARD_API_KEY || '',
        ...(init.headers as Record<string, string>),
      },
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({ message: `HTTP ${res.status}` }));
      throw new Error(body.message || `HTTP ${res.status}`);
    }
    return res.json();
  } finally {
    clearTimeout(timer);
  }
}

/** Map GameMode to leaderboard game type */
function toGameType(mode: GameMode): LeaderboardGameType {
  if (mode === 'duet') return 'd';
  return 's'; // single, duel, competitive, etc.
}

/** Map difficulty for API */
function toApiDifficulty(d: Difficulty): 'easy' | 'normal' | 'hard' {
  return d === 'easy' ? 'easy' : d === 'hard' ? 'hard' : 'normal';
}

// ── Public API ──────────────────────────────────────────

/** Test if the API is reachable */
async function testConnection(): Promise<boolean> {
  try {
    const r = await request<{ name: string }>('/');
    return !!r.name;
  } catch {
    return false;
  }
}

/** Register or update a profile on the server. The response carries the
 *  authoritative sync_code (generated server-side on first registration). */
async function registerProfile(profile: PlayerProfile): Promise<OnlineProfile> {
  return request<OnlineProfile>('/profiles', {
    method: 'POST',
    body: JSON.stringify({
      profile_uid: profile.id,
      display_name: profile.name,
      color: profile.color,
      country_code: profile.country || null,
      show_on_board: profile.privacy?.showOnLeaderboard ? 1 : 0,
      show_country: profile.privacy?.showCountry ? 1 : 0,
      sync_code: profile.syncCode || undefined,
    }),
  });
}

/** Submit a score for a song (with optional anti-cheat proof) */
async function submitScore(params: {
  profile: PlayerProfile;
  song: Song;
  gameMode: GameMode;
  score: number;
  maxScore: number;
  accuracy: number;
  maxCombo: number;
  difficulty: Difficulty;
  rating: 'perfect' | 'excellent' | 'good' | 'okay' | 'poor';
  notesHit: number;
  notesMissed: number;
  /** Pre-computed anti-cheat proof package */
  proof?: ScoreProofPackage;
  /** Scoring metadata for v2 fingerprint (optional) */
  scoringMetadata?: ScoringMetadata;
}): Promise<SubmitScoreResult> {
  const { profile, song, gameMode, score, maxScore, accuracy, maxCombo, difficulty, rating, notesHit, notesMissed, proof, scoringMetadata } = params;

  const rawNotes = songNotesFromSong(song);
  const gameType = toGameType(gameMode);

  // Generate v1 hash (always, for backwards compatibility)
  const v1Hash = generateSongHash({
    artist: song.artist,
    title: song.title,
    gameType,
    notes: rawNotes,
  });

  // Generate v2 hash if scoring metadata is available
  let v2Hash: string | undefined;
  if (scoringMetadata) {
    const goldenCount = rawNotes.filter(n => n.type === '*').length;
    const v2Result = generateSongHashV2({
      artist: song.artist,
      title: song.title,
      gameType,
      notes: rawNotes,
      bpm: song.bpm,
      totalNotes: scoringMetadata.totalNotes,
      goldenNoteCount: goldenCount,
      totalNoteTicks: scoringMetadata.totalNoteTicks,
      songDurationMs: song.duration,
    });
    v2Hash = v2Result.v2Hash;
  }

  // The server requires the profile's sync_code on every submission.
  // The caller is responsible for registering the profile first (and
  // persisting the code) when it doesn't have one yet.
  if (!profile.syncCode) {
    throw new Error('Profile is not registered for online submissions (missing sync code)');
  }

  const payload: SubmitScorePayload = {
    profile_uid: profile.id,
    sync_code: profile.syncCode,
    song_hash: v1Hash,
    game_type: gameType,
    score,
    max_score: maxScore,
    accuracy,
    max_combo: maxCombo,
    difficulty: toApiDifficulty(difficulty),
    rating,
    notes_hit: notesHit,
    notes_missed: notesMissed,
  };

  // Attach proof and v2 hash if available
  if (proof) payload.proof = proof;
  if (v2Hash) payload.song_hash_v2 = v2Hash;

  try {
    return await request<SubmitScoreResult>('/scores', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  } catch (err) {
    // The profile vanished server-side (fresh server, deleted profile):
    // re-register with our identity + code and retry a single time.
    if (/HTTP 404/.test(err instanceof Error ? err.message : '')) {
      await registerProfile(profile).catch(() => null);
      return request<SubmitScoreResult>('/scores', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    }
    throw err;
  }
}

/** Fetch leaderboard for a single song */
async function fetchSongLeaderboard(
  songHash: string,
  gameType: LeaderboardGameType = 's',
  limit = 100
): Promise<OnlineScoreEntry[]> {
  const result = await request<{ leaderboard: OnlineScoreEntry[] }>(
    `/leaderboard/song/${encodeURIComponent(songHash)}?game_type=${gameType}&limit=${limit}`
  );
  return result.leaderboard;
}

/** Fetch global leaderboard */
async function fetchGlobalLeaderboard(
  limit = 100, offset = 0
): Promise<GlobalLeaderboardEntry[]> {
  const result = await request<{ leaderboard: GlobalLeaderboardEntry[] }>(
    `/leaderboard/global?limit=${limit}&offset=${offset}`
  );
  return result.leaderboard;
}

// ── Export singleton ────────────────────────────────────

/**
 * Store a private cross-device backup of the profile (and optionally its
 * highscores) under the profile's sync code. Note: the backup is personal
 * data — it never appears on any public leaderboard.
 */
async function uploadProfile(
  profile: PlayerProfile,
  highscores: Record<string, HighscoreEntry[]> | null,
): Promise<{ success: boolean; error?: string }> {
  if (!profile.syncCode) {
    return { success: false, error: 'Missing sync code' };
  }
  const payload: ProfileSyncUpload = {
    sync_code: profile.syncCode,
    profile,
    highscores: highscores ?? null,
  };
  try {
    await request(`/profiles/${profile.syncUid || profile.id}/sync`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/** Fetch the profile backup behind a sync code, or null if unknown. */
async function downloadProfileByCode(code: string): Promise<ProfileSyncDownload | null> {
  try {
    return await request<ProfileSyncDownload>(
      `/profiles/sync/${encodeURIComponent(code.toUpperCase())}`
    );
  } catch {
    return null;
  }
}

export const leaderboardService = {
  testConnection,
  registerProfile,
  submitScore,
  fetchSongLeaderboard,
  fetchGlobalLeaderboard,
  // Backward-compatible aliases used by UI components
  getSongLeaderboard: fetchSongLeaderboard,
  getGlobalLeaderboard: fetchGlobalLeaderboard,
  // Profile sync (cross-device backup)
  uploadProfile,
  downloadProfileByCode,
};
