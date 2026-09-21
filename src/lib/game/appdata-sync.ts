/**
 * AppData persistence for player data (R14, user request 5).
 *
 * Problem: profiles + highscores lived ONLY in the WebView's localStorage.
 * A Tauri app update / reinstall can wipe the WebView profile → all players
 * and highscores were gone. Users had to make manual backups.
 *
 * Solution: in the Tauri build, mirror the player data (profiles,
 * activeProfileId, highscores) into the SQLite database that already lives in
 * the OS app-data directory (`%APPDATA%/<bundle-id>/karaoke.db` — see
 * src-tauri/src/db/mod.rs). The DB survives reinstalls and updates, exactly
 * like other desktop programs store their data.
 *
 * Strategy — "write-through cache with reinstall recovery":
 *  - App start: load the blob from AppData and MERGE it into the store
 *    (union by id; the more-progressed version wins). A wiped localStorage
 *    is healed from AppData; an empty AppData is seeded from localStorage.
 *  - Store changes: debounced write-through of the whole blob (atomic
 *    INSERT OR REPLACE — no partial states, no stale rows).
 *  - Browser (non-Tauri): everything is a no-op, localStorage stays the
 *    only storage.
 */

import type { PlayerProfile, HighscoreEntry } from '@/types/game';

/** app_settings key for the player-data blob. Versioned for future format changes. */
const APPDATA_KEY = 'player-data-v1';

/** Debounce for write-through saves (ms). */
const SAVE_DEBOUNCE_MS = 1500;

interface PlayerDataBlob {
  version: 1;
  savedAt: number;
  profiles: PlayerProfile[];
  activeProfileId: string | null;
  highscores: HighscoreEntry[];
}

/**
 * Minimal store surface this module needs — structurally compatible with the
 * zustand store hook (avoids depending on its large inferred type).
 */
interface PlayerDataStoreApi {
  getState: () => {
    profiles?: PlayerProfile[];
    highscores?: HighscoreEntry[];
    activeProfileId?: string | null;
  };
  setState: (partial: {
    profiles?: PlayerProfile[];
    highscores?: HighscoreEntry[];
    activeProfileId?: string | null;
  }) => void;
  subscribe: (listener: (state: {
    profiles?: PlayerProfile[];
    highscores?: HighscoreEntry[];
    activeProfileId?: string | null;
  }, prevState: {
    profiles?: PlayerProfile[];
    highscores?: HighscoreEntry[];
    activeProfileId?: string | null;
  }) => void) => () => void;
}

/** True when running inside the Tauri desktop app. */
function isTauri(): boolean {
  return typeof window !== 'undefined' && ('__TAURI_INTERNALS__' in window || '__TAURI__' in window);
}

/** Invoke a Tauri db command (returns null when not in Tauri or on error). */
async function dbInvoke<T>(command: string, args?: Record<string, unknown>): Promise<T | null> {
  if (!isTauri()) return null;
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    return (await invoke(command, args)) as T;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(`[AppDataSync] ${command} failed:`, err);
    return null;
  }
}

/** Progress score for a profile — used to pick the "more progressed" copy on merge. */
function profileProgress(p: PlayerProfile): number {
  return (p.totalScore || 0) + (p.gamesPlayed || 0) * 1000 + (p.xp || 0) + (p.songsCompleted || 0) * 10;
}

/** Parse + validate a blob read from AppData (foreign/corrupt data is dropped). */
function parseBlob(raw: string | null | undefined): PlayerDataBlob | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<PlayerDataBlob>;
    if (parsed.version !== 1) return null;
    return {
      version: 1,
      savedAt: typeof parsed.savedAt === 'number' ? parsed.savedAt : 0,
      profiles: Array.isArray(parsed.profiles) ? parsed.profiles.filter((p): p is PlayerProfile => !!p && typeof p.id === 'string' && typeof p.name === 'string') : [],
      activeProfileId: typeof parsed.activeProfileId === 'string' ? parsed.activeProfileId : null,
      highscores: Array.isArray(parsed.highscores) ? parsed.highscores.filter((h): h is HighscoreEntry => !!h && typeof h.id === 'string' && typeof h.score === 'number') : [],
    };
  } catch {
    return null;
  }
}

/** Union by id; on duplicate ids the more progressed profile wins. */
function mergeProfiles(local: PlayerProfile[], remote: PlayerProfile[]): PlayerProfile[] {
  const byId = new Map<string, PlayerProfile>();
  for (const p of local) byId.set(p.id, p);
  for (const p of remote) {
    const existing = byId.get(p.id);
    if (!existing || profileProgress(p) > profileProgress(existing)) byId.set(p.id, p);
  }
  return Array.from(byId.values());
}

/** Union by id (entries have unique UUIDs; identical ids are the same run). */
function mergeHighscores<T extends { id: string }>(local: T[], remote: T[]): T[] {
  const byId = new Map<string, T>();
  for (const h of local) byId.set(h.id, h);
  for (const h of remote) if (!byId.has(h.id)) byId.set(h.id, h);
  return Array.from(byId.values());
}
/**
 * Start the AppData sync. Returns a disposer.
 *
 * Call once from the app root (karaoke-app.tsx). In the browser this is a
 * no-op that returns a noop disposer.
 */
export function startAppDataSync(store: PlayerDataStoreApi): () => void {
  if (!isTauri()) return () => { /* browser: nothing to sync */ };

  let disposed = false;
  let saveTimer: ReturnType<typeof setTimeout> | null = null;
  let booted = false;

  const buildBlob = (): PlayerDataBlob => {
    const s = store.getState();
    return {
      version: 1,
      savedAt: Date.now(),
      profiles: s.profiles ?? [],
      activeProfileId: s.activeProfileId ?? null,
      highscores: s.highscores ?? [],
    };
  };

  const saveNow = async () => {
    if (disposed) return;
    const blob = buildBlob();
    await dbInvoke('db_set_setting', { key: APPDATA_KEY, value: JSON.stringify(blob) });
  };

  const scheduleSave = () => {
    if (disposed || !booted) return; // don't write before the initial merge ran
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      saveTimer = null;
      void saveNow();
    }, SAVE_DEBOUNCE_MS);
  };

  void (async () => {
    // ── Boot: merge AppData blob into the (localStorage-)hydrated store ──
    const raw = await dbInvoke<string | null>('db_get_setting', { key: APPDATA_KEY });
    if (disposed) return;
    const blob = parseBlob(raw);

    const state = store.getState();
    const localProfiles = state.profiles ?? [];
    const localHighscores = state.highscores ?? [];

    if (blob && (blob.profiles.length > 0 || blob.highscores.length > 0)) {
      const mergedProfiles = mergeProfiles(localProfiles, blob.profiles);
      const mergedHighscores = mergeHighscores(localHighscores, blob.highscores);
      const mergedActive =
        (state.activeProfileId && mergedProfiles.some(p => p.id === state.activeProfileId))
          ? state.activeProfileId
          : (blob.activeProfileId && mergedProfiles.some(p => p.id === blob.activeProfileId))
            ? blob.activeProfileId
            : state.activeProfileId;

      const profilesChanged =
        mergedProfiles.length !== localProfiles.length ||
        mergedProfiles.some((p, i) => p !== localProfiles[i]);
      const highscoresChanged =
        mergedHighscores.length !== localHighscores.length ||
        mergedHighscores.some((h, i) => h !== localHighscores[i]);

      if (profilesChanged || highscoresChanged || mergedActive !== state.activeProfileId) {
        // eslint-disable-next-line no-console
        console.info(
          `[AppDataSync] restored from AppData: ${mergedProfiles.length} profiles · ${mergedHighscores.length} highscores`
          + ` (localStorage had ${localProfiles.length}/${localHighscores.length})`,
        );
        store.setState({
          profiles: mergedProfiles,
          highscores: mergedHighscores,
          activeProfileId: mergedActive ?? undefined,
        });
      }
    }

    // Seed / refresh AppData with the (possibly merged) current state.
    booted = true;
    await saveNow();
  })();

  // ── Write-through on every relevant store change ──
  const unsub = store.subscribe((state, prevState) => {
    if (state.profiles !== prevState.profiles || state.highscores !== prevState.highscores || state.activeProfileId !== prevState.activeProfileId) {
      scheduleSave();
    }
  });

  // ── Safety flush when the window closes ──
  const flush = () => {
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
      void saveNow();
    }
  };
  window.addEventListener('beforeunload', flush);

  return () => {
    disposed = true;
    if (saveTimer) clearTimeout(saveTimer);
    unsub();
    window.removeEventListener('beforeunload', flush);
  };
}
