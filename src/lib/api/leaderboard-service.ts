/**
 * Online Leaderboard Service v2
 * Copyright-safe: uses song hash fingerprints, no song metadata sent.
 */

import type {
  OnlineProfile, OnlineScoreEntry, BatchScoresResponse,
  SubmitScorePayload, SubmitScoreResult, GlobalLeaderboardEntry,
  LeaderboardGameType,
} from '@/lib/leaderboard/types';
import { generateSongHash, type FingerprintInput, type RawNote } from '@/lib/leaderboard/song-fingerprint';
import type { PlayerProfile, Song, Difficulty, GameMode } from '@/types/game';

const API_BASE = process.env.NEXT_PUBLIC_LEADERBOARD_URL || 'https://hosting236176.ae88b.netcup.net/leaderboard-api';

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

/** Extract raw notes from a Song for fingerprinting */
function extractRawNotes(song: Song): RawNote[] {
  // The song object has parsed notes with startTime/duration in ms.
  // We need to convert back to beats for the fingerprint.
  // However, we can use a simplified approach: use the note data directly.
  // The Ultrastar parser stores notes in the song's parsed structure.
  return (song.notes || []).map(n => ({
    type: n.isGolden ? '*' : n.isBonus ? 'F' : ':',
    startBeat: Math.round(n.startTime / (60000 / (song.bpm * 4 || 120))),
    duration: Math.round(n.duration / (60000 / (song.bpm * 4 || 120))),
    pitch: n.pitch - 48, // Convert back from MIDI to relative pitch
    lyric: '',
  }));
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

/** Register or update a profile on the server */
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
    }),
  });
}

/** Update profile privacy/settings */
async function updateProfileSettings(profile: PlayerProfile): Promise<OnlineProfile> {
  return request<OnlineProfile>(`/profiles/${profile.id}`, {
    method: 'PUT',
    body: JSON.stringify({
      display_name: profile.name,
      color: profile.color,
      country_code: profile.country || null,
      show_on_board: profile.privacy?.showOnLeaderboard ? 1 : 0,
      show_country: profile.privacy?.showCountry ? 1 : 0,
    }),
  });
}

/** Submit a score for a song */
async function submitScore(params: {
  profile: PlayerProfile;
  song: Song;
  gameMode: GameMode;
  score: number;
  maxScore: number;
  accuracy: number;
  maxCombo: number;
  difficulty: Difficulty;
  rating: string;
  notesHit: number;
  notesMissed: number;
}): Promise<SubmitScoreResult> {
  const { profile, song, gameMode, score, maxScore, accuracy, maxCombo, difficulty, rating, notesHit, notesMissed } = params;

  const songHash = generateSongHash({
    artist: song.artist,
    title: song.title,
    gameType: toGameType(gameMode),
    notes: extractRawNotes(song),
  });

  // Ensure profile is registered first
  await registerProfile(profile).catch(() => {/* ignore if already exists */});

  return request<SubmitScoreResult>('/scores', {
    method: 'POST',
    body: JSON.stringify({
      profile_uid: profile.id,
      song_hash: songHash,
      game_type: toGameType(gameMode),
      score,
      max_score: maxScore,
      accuracy,
      max_combo: maxCombo,
      difficulty: toApiDifficulty(difficulty),
      rating,
      notes_hit: notesHit,
      notes_missed: notesMissed,
    }),
  });
}

/** Batch-fetch leaderboard scores for multiple song hashes */
async function fetchBatchScores(
  songHashes: string[],
  gameType: LeaderboardGameType = 's',
  limit = 5000
): Promise<BatchScoresResponse> {
  if (songHashes.length === 0) return {};
  const hashesParam = songHashes.slice(0, 200).join(',');
  const result = await request<{ scores: BatchScoresResponse }>(
    `/scores/batch?hashes=${encodeURIComponent(hashesParam)}&game_type=${gameType}&limit=${limit}`
  );
  return result.scores;
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

export const leaderboardService = {
  testConnection,
  registerProfile,
  updateProfileSettings,
  submitScore,
  fetchBatchScores,
  fetchSongLeaderboard,
  fetchGlobalLeaderboard,
  // Expose fingerprint for UI use (e.g. computing hashes for library songs)
  generateSongHash,
};

// Re-export fingerprint for convenience
export { generateSongHash, generateSongHashes } from '@/lib/leaderboard/song-fingerprint';
