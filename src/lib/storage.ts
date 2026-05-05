/**
 * Centralized localStorage wrapper for the Karaoke Successor app.
 *
 * All localStorage access should go through this module to ensure:
 * - Single source of truth for storage key names (no magic strings)
 * - SSR-safe access (returns fallbacks when `window` is unavailable)
 * - Consistent error handling (try/catch on every operation)
 * - Typed JSON round-trip helpers
 */

// ---------------------------------------------------------------------------
// Storage key registry — every key used in the app lives here
// ---------------------------------------------------------------------------

export const StorageKeys = {
  // --- Song Library ---
  SONGS_FOLDER: 'karaoke-songs-folder',
  CUSTOM_SONGS: 'karaoke-successor-custom-songs',
  CUSTOM_SONG_IDS: 'karaoke-custom-song-ids',
  LIBRARY_SETTINGS: 'karaoke-library-settings',

  // --- Game Settings ---
  DEFAULT_DIFFICULTY: 'karaoke-default-difficulty',
  PREVIEW_VOLUME: 'karaoke-preview-volume',
  MIC_SENSITIVITY: 'karaoke-mic-sensitivity',
  SHOW_PITCH_GUIDE: 'karaoke-show-pitch-guide',
  BG_VIDEO: 'karaoke-bg-video',
  ANIMATED_BG: 'karaoke-animated-bg',
  NOTE_STYLE: 'karaoke-note-style',
  NOTE_SHAPE: 'karaoke-note-shape',
  PERFORMANCE_MODE: 'karaoke-performance-mode',
  REPLAY_ENABLED: 'karaoke-replay-enabled',

  // --- Lyrics / Theme ---
  LYRICS_STYLE: 'karaoke-lyrics-style',
  THEME: 'karaoke-theme',
  LANGUAGE: 'karaoke-language',

  // --- Multi-mic / Party ---
  MULTI_MIC_CONFIG: 'karaoke-multi-mic-config',
  PLAYER_MIC_PREFERENCES: 'karaoke-player-mic-preferences',
  PTM_SHARED_MIC_ID: 'karaoke-ptm-shared-mic-id',
  PTM_SHARED_MIC_NAME: 'karaoke-ptm-shared-mic-name',

  // --- Daily Challenge ---
  CHALLENGE_MODE: 'karaoke-challenge-mode',
  DAILY_CHALLENGE_ACTIVE: 'karaoke_daily_challenge_active',
  DAILY_CHALLENGE: 'dailyChallenge',
  DAILY_LEADERBOARD_PREFIX: 'dailyChallengeLeaderboard',
  PLAYER_DAILY_STATS: 'playerDailyStats',

  // --- Player Progression ---
  EXTENDED_STATS: 'karaoke_extended_stats',

  // --- Playlist ---
  PLAYLISTS: 'karaoke-playlists',
  SONG_PLAY_COUNTS: 'karaoke-song-play-counts',
  JUKEBOX_PLAYLIST: 'jukebox-playlist',

  // --- Rate My Song ---
  RATE_MY_SONG_HISTORY: 'karaoke-rate-my-song-history',
  RATE_MY_SONG_DAILY: 'karaoke-rate-my-song-daily',

  // --- Native Audio ---
  NATIVE_AUDIO_DEVICE: 'karaoke-native-audio-device',
  NATIVE_AUDIO_ENABLED: 'karaoke-native-audio-enabled',

  // --- PTM ---
  PTM_SONG_FILTERS: 'ptm-song-filters',

  // --- Webcam ---
  WEBCAM_CONFIG: 'karaoke-webcam-config',

  // --- Mobile / Companion ---
  CLIENT_ID: 'karaoke-client-id',
  MOBILE_PROFILE: 'karaoke-mobile-profile',
  CONNECTION_CODE: 'karaoke-connection-code',
  HOST_PROFILES: 'karaoke-host-profiles',
} as const;

// ---------------------------------------------------------------------------
// Core primitives (SSR-safe, error-swallowing)
// ---------------------------------------------------------------------------

const isBrowser = typeof window !== 'undefined';

/** Raw string read.  Returns `null` when unavailable or on error. */
export function getItem(key: string): string | null {
  if (!isBrowser) return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Raw string write.  No-op when unavailable or on error. */
export function setItem(key: string, value: string): void {
  if (!isBrowser) return;
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage full, privacy mode, etc. — silently ignore.
  }
}

/** Remove a key.  No-op when unavailable or on error. */
export function removeItem(key: string): void {
  if (!isBrowser) return;
  try {
    localStorage.removeItem(key);
  } catch {
    // Ignore.
  }
}

/** Clear all localStorage.  No-op when unavailable. */
export function clearAll(): void {
  if (!isBrowser) return;
  try {
    localStorage.clear();
  } catch {
    // Ignore.
  }
}

// ---------------------------------------------------------------------------
// Typed convenience helpers
// ---------------------------------------------------------------------------

/** Read a string, falling back to `fallback` when absent. */
export function getString(key: string, fallback: string = ''): string {
  return getItem(key) ?? fallback;
}

/** Read a boolean stored as `"true"` / `"false"`. */
export function getBool(key: string, fallback: boolean = true): boolean {
  const val = getItem(key);
  if (val === null) return fallback;
  return val === 'true';
}

/**
 * Read a number stored as a decimal string.
 * Returns `fallback` when absent or non-numeric.
 */
export function getNumber(key: string, fallback: number = 0): number {
  const raw = getItem(key);
  if (raw === null) return fallback;
  const n = Number(raw);
  return Number.isNaN(n) ? fallback : n;
}

/** Read a JSON value.  Returns `fallback` when absent or unparseable. */
export function getJson<T>(key: string, fallback: T): T {
  const raw = getItem(key);
  if (raw === null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/** Write a boolean as `"true"` / `"false"`. */
export function setBool(key: string, value: boolean): void {
  setItem(key, String(value));
}

/** Write a JSON-serialisable value. */
export function setJson<T>(key: string, value: T): void {
  setItem(key, JSON.stringify(value));
}
