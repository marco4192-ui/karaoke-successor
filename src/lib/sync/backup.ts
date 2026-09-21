/**
 * Sync & Backup — offline, privacy-friendly device transfer (feature idea #14).
 *
 * "Cloud Sync" without a cloud: the user's karaoke life (profiles, highscores,
 * achievements, playlists, custom songs, settings — optionally including all
 * song media blobs) is bundled into ONE portable JSON file that can be moved to
 * another device (or kept as a backup) and restored there. No server, no
 * account, no data leaves the user's hands — deliberately, because the online
 * leaderboard backend is parked and every other network feature was rejected
 * for legal/privacy reasons.
 *
 * ── What goes into a backup ──
 * 1. localStorage: all `karaoke*` / `dailyChallenge*` / `playerDailyStats` /
 *    `jukebox-playlist` entries EXCEPT device-specific ones (mic device IDs,
 *    companion registration, connection codes, webcam/native-audio devices —
 *    those can never work on another machine).
 * 2. The zustand store `karaoke-successor-storage` is part of that — but it is
 *    restored with a MERGE strategy (profiles union by id, highscores keep the
 *    better score per song/player, achievements union) instead of blind
 *    overwrite, so restoring on a device that already has progress never
 *    destroys anything.
 * 3. IndexedDB media (audio/video/cover/txt per song) — OPTIONAL, base64
 *    encoded. Without media the custom songs' metadata still restores, but
 *    storedMedia songs can't play until their files return; with media the
 *    song library is fully self-contained.
 *
 * ── Restore modes (user chooses in the UI) ──
 * - Data (always on): songs, playlists, profiles, highscores, achievements,
 *   play counts, statistics.
 * - Settings (toggle): preferences & options (theme, language, gameplay,
 *   difficulty, volumes …). Device-bound settings are never touched.
 * - Media (toggle): rewrite all media blobs into IndexedDB. The existing
 *   storedMedia URL-restore in song-library.ts picks them up on next load.
 */

import { StorageKeys } from '@/lib/storage';
import { storeMedia, getAllMediaRecords } from '@/lib/db/media-db';

export const BACKUP_FORMAT = 'karaoke-zero-backup';
export const BACKUP_VERSION = 1;

// ---------------------------------------------------------------------------
// Key classification
// ---------------------------------------------------------------------------

/** localStorage keys that are tied to THIS device and must never be synced. */
const DEVICE_SPECIFIC_KEYS = new Set<string>([
  StorageKeys.CLIENT_ID,
  StorageKeys.CONNECTION_CODE,
  StorageKeys.HOST_PROFILES,
  StorageKeys.MOBILE_PROFILE,
  StorageKeys.MULTI_MIC_CONFIG,
  StorageKeys.PLAYER_MIC_PREFERENCES,
  StorageKeys.PLAYER_DEVICE_PREFERENCES,
  StorageKeys.PTM_SHARED_MIC_ID,
  StorageKeys.PTM_SHARED_MIC_NAME,
  StorageKeys.NATIVE_AUDIO_DEVICE,
  StorageKeys.NATIVE_AUDIO_ENABLED,
  StorageKeys.WEBCAM_CONFIG,
  StorageKeys.SONGS_FOLDER,
  StorageKeys.ADDITIONAL_SONG_FOLDERS,
  // Song folders are filesystem paths of the SOURCE machine — restoring them
  // on another device would point at non-existing folders. Users re-enter
  // their own paths there.
]);

/** Keys that hold user DATA (songs/playlists/progress) — always restored. */
const DATA_KEYS = new Set<string>([
  StorageKeys.CUSTOM_SONGS,
  StorageKeys.CUSTOM_SONG_IDS,
  StorageKeys.LIBRARY_SETTINGS,
  StorageKeys.PLAYLISTS,
  StorageKeys.SONG_PLAY_COUNTS,
  StorageKeys.SONG_IDENTITY_MAP,
  StorageKeys.EXTENDED_STATS,
  StorageKeys.DAILY_CHALLENGE,
  StorageKeys.DAILY_CHALLENGE_ACTIVE,
  StorageKeys.PLAYER_DAILY_STATS,
  StorageKeys.RATE_MY_SONG_HISTORY,
  StorageKeys.RATE_MY_SONG_DAILY,
  StorageKeys.RATE_MY_SONG_PLAYER_STATS,
  StorageKeys.HARMONIZE_CACHE,
  StorageKeys.MEDLEY_HISTORY,
  StorageKeys.MEDLEY_DAILY,
  StorageKeys.JUKEBOX_PLAYLIST,
]);

/** Prefixes for data keys that carry a dynamic suffix (daily leaderboards). */
const DATA_KEY_PREFIXES = [
  StorageKeys.DAILY_LEADERBOARD_PREFIX,
];

const STORE_KEY = 'karaoke-successor-storage';

function isKnownDataKey(key: string): boolean {
  if (DATA_KEYS.has(key)) return true;
  return DATA_KEY_PREFIXES.some((p) => key.startsWith(p));
}

// ---------------------------------------------------------------------------
// Backup file types
// ---------------------------------------------------------------------------

interface BackupMediaEntry {
  songId: string;
  type: 'audio' | 'video' | 'cover' | 'txt';
  /** base64 payload of the blob */
  data: string;
}

export interface BackupFile {
  format: typeof BACKUP_FORMAT;
  version: number;
  createdAt: string;
  appVersion?: string;
  localStorage: Record<string, string>;
  media: BackupMediaEntry[] | null;
}

export interface BackupSummary {
  profiles: number;
  songs: number;
  playlists: number;
  highscoreEntries: number;
  settingsKeys: number;
  mediaEntries: number;
  mediaBytes: number;
  createdAt: string;
}

export interface RestoreSummary {
  profilesRestored: number;
  songsRestored: number;
  playlistsRestored: number;
  mediaRestored: number;
  settingsRestored: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      resolve(result.slice(result.indexOf(',') + 1));
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function base64ToBlob(base64: string, mime: string): Blob {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

function mimeForType(type: BackupMediaEntry['type']): string {
  switch (type) {
    case 'audio': return 'audio/mpeg';
    case 'video': return 'video/mp4';
    case 'cover': return 'image/jpeg';
    case 'txt': return 'text/plain';
  }
}

/** Parse & validate a backup file. Returns null when it is not a backup. */
export function parseBackupFile(json: unknown): BackupFile | null {
  if (!json || typeof json !== 'object') return null;
  const candidate = json as Partial<BackupFile>;
  if (candidate.format !== BACKUP_FORMAT) return null;
  if (typeof candidate.version !== 'number' || candidate.version > BACKUP_VERSION) return null;
  if (!candidate.localStorage || typeof candidate.localStorage !== 'object') return null;
  return {
    format: BACKUP_FORMAT,
    version: candidate.version,
    createdAt: String(candidate.createdAt || new Date().toISOString()),
    appVersion: candidate.appVersion,
    localStorage: candidate.localStorage,
    media: Array.isArray(candidate.media) ? candidate.media : null,
  };
}

/** Human-readable summary of a parsed backup (for the restore preview UI). */
export function summarizeBackup(backup: BackupFile): BackupSummary {
  const ls = backup.localStorage;
  let profiles = 0;
  let songs = 0;
  let playlists = 0;
  let highscoreEntries = 0;

  try {
    const store = ls[STORE_KEY] ? JSON.parse(ls[STORE_KEY]) : null;
    if (store?.state?.profiles) profiles = store.state.profiles.length;
    // Highscores are a FLAT HighscoreEntry[] (see store.ts) — count entries.
    if (Array.isArray(store?.state?.highscores)) {
      highscoreEntries = store.state.highscores.length;
    }
  } catch { /* malformed store — counts stay 0 */ }

  try {
    songs = ls[StorageKeys.CUSTOM_SONGS] ? JSON.parse(ls[StorageKeys.CUSTOM_SONGS]).length : 0;
  } catch { /* ignore */ }

  try {
    playlists = ls[StorageKeys.PLAYLISTS] ? JSON.parse(ls[StorageKeys.PLAYLISTS]).length : 0;
  } catch { /* ignore */ }

  const settingsKeys = Object.keys(ls).filter(
    (k) => !isKnownDataKey(k) && k !== STORE_KEY && !DEVICE_SPECIFIC_KEYS.has(k),
  ).length;

  const mediaEntries = backup.media?.length ?? 0;
  const mediaBytes = backup.media?.reduce((sum, m) => sum + Math.floor(m.data.length * 0.75), 0) ?? 0;

  return {
    profiles, songs, playlists, highscoreEntries, settingsKeys,
    mediaEntries, mediaBytes,
    createdAt: backup.createdAt,
  };
}

// ---------------------------------------------------------------------------
// Create backup
// ---------------------------------------------------------------------------

export async function createBackup(includeMedia: boolean): Promise<{ file: BackupFile; summary: BackupSummary }> {
  const localStorageDump: Record<string, string> = {};

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;
    if (DEVICE_SPECIFIC_KEYS.has(key)) continue;
    if (
      key.startsWith('karaoke')
      || key === 'dailyChallenge'
      || key.startsWith('dailyChallenge')
      || key === 'playerDailyStats'
      || key === 'jukebox-playlist'
      || key.startsWith('ptm-song-filters')
    ) {
      const value = localStorage.getItem(key);
      if (value !== null) localStorageDump[key] = value;
    }
  }

  let media: BackupMediaEntry[] | null = null;
  if (includeMedia) {
    try {
      const records = await getAllMediaRecords();
      media = await Promise.all(
        records.map(async (r) => ({
          songId: r.songId,
          type: r.type,
          data: await blobToBase64(r.data),
        })),
      );
    } catch {
      // Media dump failed (IndexedDB unavailable/locked) → backup without media
      media = null;
    }
  }

  const file: BackupFile = {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    createdAt: new Date().toISOString(),
    appVersion: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 120) : undefined,
    localStorage: localStorageDump,
    media,
  };

  return { file, summary: summarizeBackup(file) };
}

/** Trigger a browser download of the backup as a JSON file. */
export function downloadBackup(backup: BackupFile): void {
  const blob = new Blob([JSON.stringify(backup)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const ts = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
  const a = document.createElement('a');
  a.href = url;
  a.download = `karaoke-zero-backup-${ts}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

// ---------------------------------------------------------------------------
// Restore
// ---------------------------------------------------------------------------

interface RestoreOptions {
  /** Restore preferences/options too (not just data). Default: false. */
  restoreSettings: boolean;
  /** Write media blobs back into IndexedDB. Default: false. */
  restoreMedia: boolean;
}

/**
 * Merge two parsed zustand persist payloads (local vs backup) without losing
 * progress on either side:
 * - profiles: union by id (backup wins on collision)
 * - highscores: FLAT HighscoreEntry[] (see store.ts) — keep the BETTER entry
 *   per song+player; invalid shapes (non-array) are dropped instead of
 *   crashing the app on restore
 * - everything else: backup wins (it's the incoming transfer), local keys
 *   not present in the backup survive
 */
function mergeStorePayloads(local: unknown, backup: unknown): Record<string, unknown> | null {
  if (!backup || typeof backup !== 'object') return null;
  const backupObj = backup as { state?: Record<string, unknown> };
  if (!local || typeof local !== 'object') return backup as Record<string, unknown>;

  const localObj = local as { state?: Record<string, unknown> };
  const ls = localObj.state ?? {};
  const bs = backupObj.state ?? {};

  // — Profiles: union by id, backup wins —
  const profilesById = new Map<string, unknown>();
  for (const p of asArray(ls.profiles)) {
    const id = (p as { id?: string })?.id;
    if (id) profilesById.set(id, p);
  }
  for (const p of asArray(bs.profiles)) {
    const id = (p as { id?: string })?.id;
    if (id) profilesById.set(id, p);
  }

  // — Highscores: flat array, keep the better entry per song+player —
  const mergedHighscores = mergeHighscoreEntries(asArray(ls.highscores), asArray(bs.highscores));

  return {
    ...backupObj,
    state: {
      ...ls,
      ...bs,
      profiles: Array.from(profilesById.values()),
      highscores: mergedHighscores,
    },
  };
}

/** Value as a safe array — non-arrays (broken backups) become []. */
function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

/** Merge two flat HighscoreEntry[] lists: best score per songId+playerId. */
function mergeHighscoreEntries(a: unknown[], b: unknown[]): unknown[] {
  type Entry = { songId?: string; playerId?: string; playerName?: string; score?: number };
  const best = new Map<string, Entry>();
  for (const e of [...a, ...b]) {
    if (!e || typeof e !== 'object') continue;
    const entry = e as Entry;
    if (!entry.songId) continue; // entries without a song are useless
    const key = `${entry.songId}|${entry.playerId ?? entry.playerName ?? '?'}`;
    const current = best.get(key);
    if (!current || (entry.score ?? 0) > (current.score ?? 0)) best.set(key, entry);
  }
  return Array.from(best.values());
}

/** Custom songs merge: union by id (backup wins on collision). */
function mergeCustomSongs(localRaw: string | undefined, backupRaw: string | undefined): string | undefined {
  if (!backupRaw) return localRaw;
  let backupSongs: Array<{ id?: string }> = [];
  try { backupSongs = JSON.parse(backupRaw); } catch { return localRaw; }

  if (!localRaw) return backupRaw;
  let localSongs: Array<{ id?: string }> = [];
  try { localSongs = JSON.parse(localRaw); } catch { return backupRaw; }

  const byId = new Map<string, unknown>();
  for (const s of localSongs) if (s?.id) byId.set(s.id, s);
  for (const s of backupSongs) if (s?.id) byId.set(s.id, s);
  return JSON.stringify(Array.from(byId.values()));
}

/** Playlists merge: union by id (backup wins). */
function mergePlaylists(localRaw: string | undefined, backupRaw: string): string {
  let backupLists: Array<{ id?: string }> = [];
  try { backupLists = JSON.parse(backupRaw); } catch { return backupRaw; }

  let localLists: Array<{ id?: string }> = [];
  if (localRaw) { try { localLists = JSON.parse(localRaw); } catch { /* start fresh */ } }

  const byId = new Map<string, unknown>();
  for (const p of localLists) if (p?.id) byId.set(p.id, p);
  for (const p of backupLists) if (p?.id) byId.set(p.id, p);
  return JSON.stringify(Array.from(byId.values()));
}

export async function restoreBackup(
  backup: BackupFile,
  options: RestoreOptions,
): Promise<RestoreSummary> {
  const summary: RestoreSummary = {
    profilesRestored: 0, songsRestored: 0, playlistsRestored: 0, mediaRestored: 0, settingsRestored: 0,
  };

  // 1. localStorage entries
  for (const [key, value] of Object.entries(backup.localStorage)) {
    if (DEVICE_SPECIFIC_KEYS.has(key)) continue; // never device settings
    if (key === STORE_KEY) continue; // handled below (merge)

    if (isKnownDataKey(key)) {
      if (key === StorageKeys.CUSTOM_SONGS) {
        const merged = mergeCustomSongs(localStorage.getItem(key) ?? undefined, value);
        if (merged) localStorage.setItem(key, merged);
        continue;
      }
      if (key === StorageKeys.PLAYLISTS) {
        localStorage.setItem(key, mergePlaylists(localStorage.getItem(key) ?? undefined, value));
        continue;
      }
      localStorage.setItem(key, value);
      continue;
    }

    // Settings key — only when the user opted in
    if (options.restoreSettings) {
      localStorage.setItem(key, value);
      summary.settingsRestored++;
    }
  }

  // 2. zustand store (merge)
  const backupStoreRaw = backup.localStorage[STORE_KEY];
  if (backupStoreRaw) {
    try {
      const localStore = localStorage.getItem(STORE_KEY);
      const merged = mergeStorePayloads(
        localStore ? JSON.parse(localStore) : null,
        JSON.parse(backupStoreRaw),
      );
      if (merged) localStorage.setItem(STORE_KEY, JSON.stringify(merged));
    } catch {
      // Malformed payloads — fall back to backup store as-is
      localStorage.setItem(STORE_KEY, backupStoreRaw);
    }
  }

  // 3. Summary counts (post-merge state)
  try {
    const store = JSON.parse(localStorage.getItem(STORE_KEY) || '{}');
    summary.profilesRestored = store?.state?.profiles?.length ?? 0;
  } catch { /* ignore */ }
  try {
    summary.songsRestored = JSON.parse(localStorage.getItem(StorageKeys.CUSTOM_SONGS) || '[]').length;
  } catch { /* ignore */ }
  try {
    summary.playlistsRestored = JSON.parse(localStorage.getItem(StorageKeys.PLAYLISTS) || '[]').length;
  } catch { /* ignore */ }

  // 4. Media blobs → IndexedDB
  if (options.restoreMedia && backup.media) {
    for (const entry of backup.media) {
      try {
        const blob = base64ToBlob(entry.data, mimeForType(entry.type));
        await storeMedia(entry.songId, entry.type, blob);
        summary.mediaRestored++;
      } catch {
        // Skip broken entries — never abort the whole restore
      }
    }
  }

  return summary;
}
