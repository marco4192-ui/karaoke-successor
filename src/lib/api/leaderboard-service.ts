/**
 * Online Leaderboard Service v2
 * Copyright-safe: uses song hash fingerprints, no song metadata sent.
 * Now includes v2 fingerprint support and anti-cheat proof generation.
 */

import type {
  OnlineProfile, OnlineScoreEntry,
  SubmitScorePayload, SubmitScoreResult, GlobalLeaderboardEntry,
  GlobalLeaderboardResponse, LeaderboardWindow, LeaderboardSort,
  LeaderboardGameType, ScoreProofPackage,
  ProfileSyncDownload, ProfileSyncUpload,
  SubmitDailyResultPayload, OnlineDailyEntry,
  NoteProofEntry, ScoringMetaForProof,
  CrownsResponse, OnlinePlayEntry,
  BatchScoresResponse,
} from '@/lib/leaderboard/types';
import {
  generateSongHash, generateSongHashV2, songNotesFromSong,
} from '@/lib/leaderboard/song-fingerprint';
import { generateProofPackage } from '@/lib/leaderboard/anti-cheat-proof';
import { enqueueScore, OfflineQueuedError } from '@/lib/leaderboard/outbox';
import type { ScoringMetadata } from '@/lib/game/scoring';
import type { PlayerProfile, Song, Difficulty, GameMode, HighscoreEntry } from '@/types/game';

export const API_BASE = process.env.NEXT_PUBLIC_LEADERBOARD_URL || 'https://hosting236176.ae88b.netcup.net/leaderboard-api';

// ── Internal helpers ────────────────────────────────────

/** R72/A: fresh replay nonce (32 hex chars from crypto randomness). One
 *  per WIRE CALL — generated in submitScorePayload so live
 *  uploads, outbox retries and consent-delayed uploads can never reuse a
 *  consumed nonce (the server answers 409 on duplicates). */
function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

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

/** Map difficulty for API ('easy' | 'normal' | 'hard' — the internal
 *  'medium' becomes 'normal'). Exported: the anti-cheat proof MUST hash the
 *  same API form the payload carries, or the server-side integrity check
 *  can never match (R67 root-cause fix). */
export function toApiDifficulty(d: Difficulty): 'easy' | 'normal' | 'hard' {
  return d === 'easy' ? 'easy' : d === 'hard' ? 'hard' : 'normal';
}

// ── Public API ──────────────────────────────────────────

/** Detailed connection test result (R9: the About-tab button shows WHY a
 *  connection failed instead of a bare true/false). */
export interface ConnectionTestResult {
  ok: boolean;
  /** Server name reported by the API root (on success). */
  serverName?: string;
  /** API version reported by the root endpoint. */
  version?: string;
  /** Human-readable failure reason (network error, timeout, HTTP status…). */
  message?: string;
}

/** Test if the API is reachable — detailed variant with diagnostics. */
async function testConnectionDetailed(): Promise<ConnectionTestResult> {
  try {
    const r = await request<{ name?: string; version?: string }>('/');
    if (r && typeof r.name === 'string' && r.name.length > 0) {
      return { ok: true, serverName: r.name, version: r.version };
    }
    return { ok: false, message: `Unexpected response: ${JSON.stringify(r).slice(0, 120)}` };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return { ok: false, message: reason };
  }
}

/** Test if the API is reachable (boolean wrapper for legacy callers). */
async function testConnection(): Promise<boolean> {
  try {
    const r = await request<{ name: string }>('/');
    return !!r.name;
  } catch {
    return false;
  }
}

/** Register or update a profile on the server. The response carries the
 *  authoritative sync_code (generated server-side on first registration).
 *  The server-side profile_uid is the LOCAL id on the first device and
 *  syncUid on every device that imported the profile via sync/login —
 *  without this, downloaded profiles would register a duplicate row and
 *  collide on the sync_code (R67 fix). */
async function registerProfile(profile: PlayerProfile): Promise<OnlineProfile> {
  return request<OnlineProfile>('/profiles', {
    method: 'POST',
    body: JSON.stringify({
      profile_uid: profile.syncUid || profile.id,
      display_name: profile.name,
      color: profile.color,
      country_code: profile.country || null,
      show_on_board: profile.privacy?.showOnLeaderboard ? 1 : 0,
      show_country: profile.privacy?.showCountry ? 1 : 0,
      sync_code: profile.syncCode || undefined,
    }),
  });
}

/** Submit a score for a song.
 *
 * R69: builds the song fingerprints, the anti-cheat proof (from the given
 * per-note proof inputs — real gameplay data since R69) and the payload,
 * then submits. On failure the submission is queued in the offline outbox
 * (retried at the next game end / window focus) and an OfflineQueuedError
 * is thrown so the UI can say "queued" instead of "lost".
 * Set retryOffline:false to get the old fire-and-forget behaviour. */
async function submitScore(params: {
  profile: PlayerProfile;
  song: Song;
  gameMode: GameMode;
  score: number;
  maxScore: number;
  accuracy: number;
  maxCombo: number;
  difficulty: Difficulty;
  rating: 'perfect' | 'excellent' | 'great' | 'good' | 'okay' | 'fair' | 'rough' | 'poor';
  notesHit: number;
  notesMissed: number;
  /** Per-note proof inputs (real gameplay chain since R69). Omit for
   *  submissions without a proof (server stores them unverified). */
  proofInputs?: { scoringMeta: ScoringMetaForProof; noteResults: NoteProofEntry[] };
  /** Scoring metadata for the v2 fingerprint (optional) */
  scoringMetadata?: ScoringMetadata;
  /** Queue the submission for retry when the upload fails (default true). */
  retryOffline?: boolean;
}): Promise<SubmitScoreResult> {
  const { profile, song, gameMode, score, maxScore, accuracy, maxCombo, difficulty, rating, notesHit, notesMissed, proofInputs, scoringMetadata, retryOffline = true } = params;

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

  // R69: the proof is built HERE from the real per-note inputs — the
  // fingerprint_version matches the payload (v2 hash present → 'v2').
  let proof: ScoreProofPackage | undefined;
  if (proofInputs) {
    proof = generateProofPackage({
      scoringMeta: proofInputs.scoringMeta,
      noteResults: proofInputs.noteResults,
      score,
      accuracy,
      maxCombo,
      notesHit,
      notesMissed,
      difficulty: toApiDifficulty(difficulty),
      fingerprintVersion: v2Hash ? 'v2' : 'v1',
    });
  }

  const payload: SubmitScorePayload = {
    profile_uid: profile.syncUid || profile.id,
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

  if (proof) payload.proof = proof;
  if (v2Hash) payload.song_hash_v2 = v2Hash;

  const queueForRetry = () => {
    if (!retryOffline) return false;
    enqueueScore({
      payload: { ...payload },
      ...(proofInputs ? { proofInputs } : {}),
    });
    return true;
  };

  try {
    return await submitScorePayload(payload);
  } catch (err) {
    // The profile vanished server-side (fresh server, deleted profile):
    // re-register with our identity + code and retry a single time.
    if (/HTTP 404/.test(err instanceof Error ? err.message : '')) {
      try {
        await registerProfile(profile).catch(() => null);
        return await submitScorePayload(payload);
      } catch (retryErr) {
        if (queueForRetry()) throw new OfflineQueuedError();
        throw retryErr;
      }
    }
    if (queueForRetry()) throw new OfflineQueuedError();
    throw err;
  }
}

/**
 * Low-level score submission with a COMPLETE payload (including proof).
 * Used by submitScore and the R69 outbox flush — no fingerprint logic, no
 * re-registration, just the wire call. R72: a fresh replay nonce is added
 * per call (see generateNonce).
 */
async function submitScorePayload(payload: SubmitScorePayload): Promise<SubmitScoreResult> {
  return request<SubmitScoreResult>('/scores', {
    method: 'POST',
    body: JSON.stringify({ ...payload, nonce: generateNonce() }),
  });
}

/** Fetch leaderboard for a single song.
 *  R72/B: `difficulty` is a REAL filter ('all' default = pre-R72 behaviour). */
async function fetchSongLeaderboard(
  songHash: string,
  gameType: LeaderboardGameType = 's',
  limit = 100,
  difficulty: 'all' | 'easy' | 'normal' | 'hard' = 'all',
): Promise<OnlineScoreEntry[]> {
  // R81: keep the hash's ':' literal in the path segment — some servers
  // never decode %3A in path segments (the v3.6 server rejected the request
  // with "Invalid song_hash" for exactly this reason; v3.7 also decodes
  // server-side, this keeps mixed-version setups working).
  const hashInPath = encodeURIComponent(songHash).replace(/%3A/gi, ':');
  const result = await request<{ leaderboard: OnlineScoreEntry[] }>(
    `/leaderboard/song/${hashInPath}?game_type=${gameType}&limit=${limit}&difficulty=${difficulty}`
  );
  return result.leaderboard;
}

/** Fetch global leaderboard (entries only — legacy signature). */
async function fetchGlobalLeaderboard(
  limit = 100, offset = 0
): Promise<GlobalLeaderboardEntry[]> {
  const result = await request<{ leaderboard: GlobalLeaderboardEntry[] }>(
    `/leaderboard/global?limit=${limit}&offset=${offset}`
  );
  return result.leaderboard;
}

/** R72: full global board — time window, alternative sort, total player
 *  count and the caller's own rank + percentile (pass the profile's
 *  syncUid || id via opts.uid). */
async function fetchGlobalBoard(opts?: {
  window?: LeaderboardWindow;
  sort?: LeaderboardSort;
  uid?: string;
  limit?: number;
  offset?: number;
}): Promise<GlobalLeaderboardResponse> {
  const params = new URLSearchParams({
    limit: String(opts?.limit ?? 100),
    offset: String(opts?.offset ?? 0),
  });
  if (opts?.window) params.set('window', opts.window);
  if (opts?.sort) params.set('sort', opts.sort);
  if (opts?.uid) params.set('uid', opts.uid);
  return request<GlobalLeaderboardResponse>(`/leaderboard/global?${params.toString()}`);
}

/** R72/C: song-#1 ("crown") count for a profile (visible profiles only). */
async function fetchCrowns(uid: string): Promise<CrownsResponse> {
  return request<CrownsResponse>(`/leaderboard/crowns?uid=${encodeURIComponent(uid)}`);
}

/** R72: public profile data (no sync_code in the response) — online stats
 *  card (BR wins, cached all-time totals). */
async function fetchPublicProfile(uid: string): Promise<OnlineProfile> {
  return request<OnlineProfile>(`/profiles/${encodeURIComponent(uid)}`);
}

/** R72/C: the most recent online rounds of a profile (play log, newest
 *  first). Song hashes only — map them to local titles client-side. */
async function fetchRecentPlays(uid: string, limit = 20): Promise<OnlinePlayEntry[]> {
  const result = await request<{ plays: OnlinePlayEntry[]}>(
    `/profiles/${encodeURIComponent(uid)}/plays?limit=${limit}`
  );
  return result.plays;
}

/** R72/C: batch-fetch the boards of up to 200 song hashes at once (basis of
 *  the local rival comparison — no server-side friend system by design). */
async function fetchBatchScores(
  hashes: string[],
  gameType: LeaderboardGameType = 's',
  limit = 1000,
  /** R81: server-side difficulty filter ('all' = each player's overall best,
   *  server v3.7 dedupes per profile). */
  difficulty: 'all' | 'easy' | 'normal' | 'hard' = 'all',
): Promise<BatchScoresResponse> {
  if (hashes.length === 0) return {};
  const joined = hashes.slice(0, 200).map(h => encodeURIComponent(h)).join(',');
  const result = await request<{ scores: BatchScoresResponse }>(
    `/scores/batch?hashes=${joined}&game_type=${gameType}&limit=${limit}&difficulty=${difficulty}`
  );
  return result.scores;
}

// ── Daily challenge leaderboard (online board) ───────────

/**
 * Submit a daily challenge result to the online board.
 * Requires an online profile with a sync code; failures are
 * non-critical (the local board always works offline).
 * Returns the sync code when one had to be generated so the
 * caller can persist it on the profile.
 */
async function submitDailyResult(params: {
  profile: PlayerProfile;
  challengeDate: string;
  challengeType: SubmitDailyResultPayload['challenge_type'];
  metricValue: number;
  xpEarned: number;
  difficulty?: SubmitDailyResultPayload['difficulty'];
}): Promise<{ ok: boolean; sync_code?: string }> {
  const { profile, challengeDate, challengeType, metricValue, xpEarned, difficulty } = params;
  if (profile.storageMode === 'local') {
    return { ok: false };
  }
  let syncCode = profile.syncCode;
  if (!syncCode) {
    // Register on the fly so the daily result has a home on the server
    const registered = await registerProfile(profile).catch(() => null);
    syncCode = registered?.sync_code;
    if (!syncCode) return { ok: false };
  }
  const payload: SubmitDailyResultPayload = {
    profile_uid: profile.syncUid || profile.id,
    sync_code: syncCode,
    challenge_date: challengeDate,
    challenge_type: challengeType,
    metric_value: Math.round(metricValue * 100) / 100,
    xp_earned: xpEarned,
    difficulty,
  };
  const result = await request<{ ok: boolean }>('/daily', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return { ok: result.ok, sync_code: profile.syncCode ? undefined : syncCode };
}

/** Fetch the online daily leaderboard for a date (default: today). */
async function fetchDailyLeaderboard(date?: string): Promise<OnlineDailyEntry[]> {
  const d = date || new Date().toISOString().slice(0, 10);
  const result = await request<{ leaderboard: OnlineDailyEntry[] }>(
    `/daily?date=${encodeURIComponent(d)}&limit=100`
  );
  return result.leaderboard;
}


// ── (R81) Battle-Royale online submissions REMOVED ───────
// BR has no comparable score scale (2-player BR is easier than 25-player
// BR) and win counters are trivially fakeable — the whole feature flew out
// of the score system. The local hall of fame (battle-royale-hall-of-fame)
// keeps working untouched.

// ── Export singleton ────────────────────────────────────

/**
 * R67: Push profile changes (name, color, country, privacy flags) to the
 * server via PUT /profiles/{uid}. Requires the profile's sync_code — the
 * ownership token — so foreign profiles cannot be overwritten. Fire-and-
 * forget by design: if the profile is not registered server-side yet, the
 * 404 is swallowed and the next registration carries the current values.
 */
async function updateProfileSettings(profile: PlayerProfile): Promise<OnlineProfile> {
  if (!profile.syncCode) {
    throw new Error('Missing sync code');
  }
  return request<OnlineProfile>(`/profiles/${encodeURIComponent(profile.syncUid || profile.id)}`, {
    method: 'PUT',
    body: JSON.stringify({
      display_name: profile.name,
      color: profile.color,
      country_code: profile.country || null,
      show_on_board: profile.privacy?.showOnLeaderboard ? 1 : 0,
      show_country: profile.privacy?.showCountry ? 1 : 0,
      sync_code: profile.syncCode,
    }),
  });
}

/**
 * R67 (GDPR): Delete the online profile and everything the server stores
 * about it — scores, daily results, sync snapshot and a linked e-mail
 * account (database-level ON DELETE CASCADE). Requires the sync_code.
 * The LOCAL profile stays intact; only the online presence is removed.
 */
async function deleteProfile(profile: PlayerProfile): Promise<{ ok: boolean; deleted: string }> {
  if (!profile.syncCode) {
    throw new Error('Missing sync code');
  }
  return request<{ ok: boolean; deleted: string }>(
    `/profiles/${encodeURIComponent(profile.syncUid || profile.id)}`,
    {
      method: 'DELETE',
      body: JSON.stringify({ sync_code: profile.syncCode }),
    },
  );
}


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

// ── Online accounts (app-only login: e-mail + password) ──

/**
 * Link an e-mail + password account to a profile (register). Registers
 * the profile on the server first when it has no sync code yet, then
 * creates the account and immediately uploads a first sync snapshot so
 * the very first login on another device already finds data.
 *
 * R69: the server returns a ONE-TIME recovery code (shown to the user by
 * the caller) and — when the profile already had an account — REPLACES it
 * (the caller must hold the sync_code; that is the forgot-password rescue
 * path). Returns the sync code when one had to be generated.
 */
async function registerAccount(params: {
  profile: PlayerProfile;
  email: string;
  password: string;
}): Promise<{ ok: boolean; sync_code?: string; recovery_code?: string; error?: string }> {
  const { profile, email, password } = params;
  let syncCode = profile.syncCode;
  if (!syncCode) {
    const registered = await registerProfile(profile).catch(() => null);
    syncCode = registered?.sync_code;
    if (!syncCode) return { ok: false, error: 'Profile registration failed' };
  }
  try {
    const res = await request<{ ok: boolean; recovery_code?: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, sync_code: syncCode }),
    });
    // Upload an initial snapshot so the first login elsewhere works — also
    // on the replace path (the account credentials just changed).
    await uploadProfile({ ...profile, syncCode }, null).catch(() => null);
    return { ok: true, sync_code: profile.syncCode ? undefined : syncCode, recovery_code: res.recovery_code };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * App-only login: verify e-mail + password and download the linked
 * profile snapshot. Returns null on invalid credentials or when no
 * snapshot exists yet (the caller distinguishes via the hasSnapshot flag
 * of the thrown-free result — invalid login vs. missing snapshot are both
 * surfaced as ok:false with a reason).
 *
 * R69: the login response may carry a recovery_code — issued exactly once
 * for legacy accounts that predate recovery codes (server v3.5.0). The
 * caller MUST surface it in a save-this-code dialog.
 */
async function loginWithAccount(
  email: string,
  password: string,
): Promise<
  | { ok: true; snapshot: ProfileSyncDownload & { profile: PlayerProfile }; recoveryCode?: string }
  | { ok: false; reason: 'invalid' | 'noSnapshot' }
> {
  let login: { profile_uid: string; sync_code: string; recovery_code?: string };
  try {
    login = await request<{ profile_uid: string; sync_code: string; recovery_code?: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  } catch {
    return { ok: false, reason: 'invalid' };
  }
  const snapshot = await downloadProfileByCode(login.sync_code);
  if (!snapshot?.profile) return { ok: false, reason: 'noSnapshot' };
  // Enrich the snapshot with the login data so the imported profile is
  // immediately usable for further syncs.
  const profile: PlayerProfile = {
    ...snapshot.profile,
    syncCode: login.sync_code,
    syncUid: login.profile_uid,
    authEmail: email.trim().toLowerCase(),
  };
  return {
    ok: true,
    snapshot: { ...snapshot, profile },
    ...(login.recovery_code ? { recoveryCode: login.recovery_code } : {}),
  };
}

/**
 * R69: Reset a forgotten password with the one-time recovery code.
 * On success the server has set the new password AND rotated to a fresh
 * recovery code — the caller must show it to the user exactly once.
 */
async function recoverAccount(
  email: string,
  recoveryCode: string,
  newPassword: string,
): Promise<{ ok: boolean; recovery_code?: string; error?: string }> {
  try {
    const res = await request<{ ok: boolean; recovery_code?: string }>('/auth/recover', {
      method: 'POST',
      body: JSON.stringify({
        email,
        recovery_code: recoveryCode,
        new_password: newPassword,
      }),
    });
    return { ok: true, recovery_code: res.recovery_code };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/** Change the password of an online account (requires the current one). */
async function changeAccountPassword(
  email: string,
  currentPassword: string,
  newPassword: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    await request('/auth/password', {
      method: 'POST',
      body: JSON.stringify({
        email,
        current_password: currentPassword,
        new_password: newPassword,
      }),
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export const leaderboardService = {
  testConnection,
  testConnectionDetailed,
  registerProfile,
  submitScore,
  submitScorePayload,
  fetchSongLeaderboard,
  fetchGlobalLeaderboard,
  // R72: full global board (windows, sorts, own rank/percentile)
  fetchGlobalBoard,
  fetchCrowns,
  fetchPublicProfile,
  fetchRecentPlays,
  fetchBatchScores,
  // Daily challenge online board
  submitDailyResult,
  fetchDailyLeaderboard,
  // Backward-compatible aliases used by UI components
  getSongLeaderboard: fetchSongLeaderboard,
  getGlobalLeaderboard: fetchGlobalLeaderboard,
  // Profile sync (cross-device backup)
  uploadProfile,
  downloadProfileByCode,
  // Online accounts (app-only login + R69 recovery)
  registerAccount,
  loginWithAccount,
  changeAccountPassword,
  recoverAccount,
  // R67: profile token operations (PUT settings / GDPR delete)
  updateProfileSettings,
  deleteProfile,
};
