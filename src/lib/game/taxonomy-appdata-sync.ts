/**
 * AppData persistence for the Metadaten Studio configuration (R50, points 4+5).
 *
 * Protects the user's "Genres & Sprachen" work the same way the player data
 * is protected (see appdata-sync.ts): in the Tauri build, the custom
 * taxonomy entries AND the harmonization rule overrides are mirrored into
 * the SQLite database in the OS app-data directory (`%APPDATA%/<bundle-id>/
 * karaoke.db`, key `taxonomy-rules-v1` via db_set_setting/db_get_setting).
 *
 * Why: the settings (custom genres/languages + carefully adjusted rules)
 * represent hours of curation. A Tauri app update / reinstall that wipes the
 * WebView localStorage would destroy them — exactly like it threatened the
 * profiles and highscores before R14.
 *
 * Strategy — "merge-on-boot + debounced write-through":
 *  - App start: read the AppData blob and MERGE it into the stores (union
 *    for taxonomy lists; per-key with local-wins for rules). A wiped
 *    localStorage is healed from AppData; in-session edits made before the
 *    async restore survive (they win).
 *  - Store changes: debounced write-through of the combined blob.
 *  - Browser (non-Tauri): no-op — localStorage stays the only storage.
 */

import { customTaxonomy } from '@/lib/game/custom-taxonomy';
import { metadataRules } from '@/lib/game/metadata-rules';

/** app_settings key for the taxonomy+rules blob. Versioned for format changes. */
const APPDATA_KEY = 'taxonomy-rules-v1';

/** Debounce for write-through saves (ms). */
const SAVE_DEBOUNCE_MS = 1500;

interface TaxonomyRulesBlob {
  version: 1;
  savedAt: number;
  customGenres: string[];
  customLanguages: string[];
  genreRules: Record<string, string>;
  languageRules: Record<string, string>;
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
    console.warn(`[TaxonomyAppDataSync] ${command} failed:`, err);
    return null;
  }
}

/** Parse + shallowly validate a blob read from AppData. */
function parseBlob(raw: string | null | undefined): TaxonomyRulesBlob | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<TaxonomyRulesBlob>;
    if (parsed.version !== 1) return null;
    return {
      version: 1,
      savedAt: typeof parsed.savedAt === 'number' ? parsed.savedAt : 0,
      customGenres: Array.isArray(parsed.customGenres) ? parsed.customGenres.filter((g): g is string => typeof g === 'string') : [],
      customLanguages: Array.isArray(parsed.customLanguages) ? parsed.customLanguages.filter((l): l is string => typeof l === 'string') : [],
      genreRules: parsed.genreRules && typeof parsed.genreRules === 'object' ? parsed.genreRules : {},
      languageRules: parsed.languageRules && typeof parsed.languageRules === 'object' ? parsed.languageRules : {},
    };
  } catch {
    return null;
  }
}

/**
 * Start the taxonomy + rules AppData sync. Returns a disposer.
 *
 * Call once from the app root (karaoke-app.tsx). In the browser this is a
 * no-op that returns a noop disposer.
 */
export function startTaxonomyAppDataSync(): () => void {
  if (!isTauri()) return () => { /* browser: nothing to sync */ };

  let disposed = false;
  let saveTimer: ReturnType<typeof setTimeout> | null = null;
  let booted = false;

  const buildBlob = (): TaxonomyRulesBlob => ({
    version: 1,
    savedAt: Date.now(),
    customGenres: customTaxonomy.getCustomGenres(),
    customLanguages: customTaxonomy.getCustomLanguages(),
    genreRules: metadataRules.getGenreRules(),
    languageRules: metadataRules.getLanguageRules(),
  });

  const saveNow = async () => {
    if (disposed) return;
    await dbInvoke('db_set_setting', { key: APPDATA_KEY, value: JSON.stringify(buildBlob()) });
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
    // ── Boot: merge the AppData blob into the (localStorage-)hydrated stores ──
    const raw = await dbInvoke<string | null>('db_get_setting', { key: APPDATA_KEY });
    if (disposed) return;
    const blob = parseBlob(raw);

    const hasLocalData =
      customTaxonomy.getCustomGenres().length > 0
      || customTaxonomy.getCustomLanguages().length > 0
      || Object.keys(metadataRules.getGenreRules()).length > 0
      || Object.keys(metadataRules.getLanguageRules()).length > 0;

    if (blob && (blob.customGenres.length > 0 || blob.customLanguages.length > 0
      || Object.keys(blob.genreRules).length > 0 || Object.keys(blob.languageRules).length > 0)) {
      // Merge (local in-session edits win; AppData fills the gaps). When
      // localStorage was wiped, local is empty and AppData restores fully.
      if (!hasLocalData) {
        // eslint-disable-next-line no-console
        console.info(
          `[TaxonomyAppDataSync] restored from AppData: ${blob.customGenres.length}/${blob.customLanguages.length} entries · `
          + `${Object.keys(blob.genreRules).length}/${Object.keys(blob.languageRules).length} rules`,
        );
      }
      customTaxonomy.hydrateFromAppData(blob.customGenres, blob.customLanguages);
      metadataRules.hydrateFromAppData({
        genreRules: blob.genreRules,
        languageRules: blob.languageRules,
      });
    }

    // Seed / refresh AppData with the (possibly merged) current state.
    booted = true;
    await saveNow();
  })();

  // ── Write-through on every store change (version bump = mutation) ──
  let lastTaxonomyVersion = customTaxonomy.getSnapshotVersion();
  let lastRulesVersion = metadataRules.getSnapshotVersion();
  const checkTaxonomy = () => {
    const v = customTaxonomy.getSnapshotVersion();
    if (v !== lastTaxonomyVersion) {
      lastTaxonomyVersion = v;
      scheduleSave();
    }
  };
  const checkRules = () => {
    const v = metadataRules.getSnapshotVersion();
    if (v !== lastRulesVersion) {
      lastRulesVersion = v;
      scheduleSave();
    }
  };
  const unsubTaxonomy = customTaxonomy.subscribe(checkTaxonomy);
  const unsubRules = metadataRules.subscribe(checkRules);

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
    unsubTaxonomy();
    unsubRules();
    window.removeEventListener('beforeunload', flush);
  };
}
