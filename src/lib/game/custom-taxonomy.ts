/**
 * Custom taxonomy store — user-defined GENRE and LANGUAGE entries
 * (user request R20: "Genre & Sprache" Settingseintrag).
 *
 * Extends the built-in canonical lists (src/lib/constants.ts GENRES/LANGUAGES)
 * with user-created entries that:
 *  - appear in every genre/language dropdown (editor, new-song dialog,
 *    Metadata Studio manual correction)
 *  - are treated as CANONICAL by the harmonization pipeline
 *    (meta-normalizer canonicalizeGenre/normalizeLanguage, harmonize-client
 *    isCanonicalGenre/isCanonicalLanguage and the /api/harmonize prompt)
 *  - can be listed and deleted in the Settings → "Genres & Languages" tab
 *
 * Storage: localStorage (per device, like every other app setting).
 * SSR-safe: on the server (API routes) the custom lists are simply empty —
 * routes that need them receive the entries per request instead
 * (see /api/harmonize body.customGenres/customLanguages).
 *
 * Reactivity: module singleton with subscribe()/getSnapshot() so components
 * can useSyncExternalStore and re-render when entries change — the same
 * pattern as the RuleHarmonizer job.
 */

import { GENRES, LANGUAGES } from '@/lib/constants';
import { StorageKeys, getJsonOptional, setJson } from '@/lib/storage';

/** Maximum number of custom entries per list (protects the LLM prompt size). */
export const MAX_CUSTOM_ENTRIES = 50;
/** Maximum length of a single custom entry (characters, trimmed). */
export const MAX_ENTRY_LENGTH = 40;

export interface AddEntryResult {
  ok: boolean;
  /** Already exists (case-insensitive) in builtin or custom entries. */
  duplicate?: boolean;
  /** Validation failed (empty / too long / too many entries). */
  error?: 'empty' | 'too-long' | 'limit-reached';
}

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

/** Read, sanitize and dedupe the persisted list. Corrupted entries are dropped. */
function readList(key: string): string[] {
  if (!isBrowser()) return [];
  const stored = getJsonOptional<string[]>(key);
  if (!Array.isArray(stored)) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const entry of stored) {
    if (typeof entry !== 'string') continue;
    const trimmed = entry.trim();
    if (!trimmed) continue;
    const keyLower = trimmed.toLowerCase();
    if (seen.has(keyLower)) continue;
    seen.add(keyLower);
    result.push(trimmed);
  }
  return result;
}

class CustomTaxonomyStore {
  private genres: string[] = isBrowser() ? readList(StorageKeys.CUSTOM_GENRES) : [];
  private languages: string[] = isBrowser() ? readList(StorageKeys.CUSTOM_LANGUAGES) : [];
  private listeners = new Set<() => void>();

  /** Bumped on every mutation — useSyncExternalStore snapshot identity. */
  private version = 0;

  getSnapshotVersion(): number {
    return this.version;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  private emit(): void {
    this.version++;
    for (const l of this.listeners) l();
  }

  // ── Reads ──

  getCustomGenres(): string[] {
    return [...this.genres];
  }

  getCustomLanguages(): string[] {
    return [...this.languages];
  }

  /** Builtin + custom genres — the full dropdown/harmonization vocabulary. */
  getAllGenres(): string[] {
    return [...GENRES, ...this.genres];
  }

  /** Builtin + custom languages — the full dropdown/harmonization vocabulary. */
  getAllLanguages(): string[] {
    return [...LANGUAGES, ...this.languages];
  }

  isCustomGenre(genre: string): boolean {
    return this.genres.some(g => g.toLowerCase() === genre.trim().toLowerCase());
  }

  isCustomLanguage(language: string): boolean {
    return this.languages.some(l => l.toLowerCase() === language.trim().toLowerCase());
  }

  // ── Writes ──

  /**
   * Add a custom genre. Validates: non-empty after trim, max length,
   * duplicate check against builtin GENRES AND existing customs
   * (case-insensitive — "jazz" vs "Jazz" is the same category).
   */
  addCustomGenre(name: string): AddEntryResult {
    return this.addEntry(name, 'genre');
  }

  addCustomLanguage(name: string): AddEntryResult {
    return this.addEntry(name, 'language');
  }

  private addEntry(name: string, kind: 'genre' | 'language'): AddEntryResult {
    const trimmed = name.trim().replace(/\s+/g, ' ');
    if (!trimmed) return { ok: false, error: 'empty' };
    if (trimmed.length > MAX_ENTRY_LENGTH) return { ok: false, error: 'too-long' };

    const list = kind === 'genre' ? this.genres : this.languages;
    if (list.length >= MAX_CUSTOM_ENTRIES) return { ok: false, error: 'limit-reached' };

    const builtin = kind === 'genre' ? GENRES : LANGUAGES;
    const lower = trimmed.toLowerCase();
    if (builtin.some(b => b.toLowerCase() === lower)) return { ok: false, duplicate: true };
    if (list.some(e => e.toLowerCase() === lower)) return { ok: false, duplicate: true };

    if (kind === 'genre') {
      this.genres = [...this.genres, trimmed];
      setJson(StorageKeys.CUSTOM_GENRES, this.genres);
    } else {
      this.languages = [...this.languages, trimmed];
      setJson(StorageKeys.CUSTOM_LANGUAGES, this.languages);
    }
    this.emit();
    return { ok: true };
  }

  /**
   * Remove a custom entry (exact, case-insensitive match). Built-in entries
   * cannot be removed — removeEntry is a no-op for them.
   * NOTE: songs that carry the value keep it — deleting only removes the
   * entry from the vocabulary (dropdowns/harmonization), it does not rewrite
   * song metadata.
   */
  removeCustomGenre(name: string): boolean {
    const before = this.genres.length;
    this.genres = this.genres.filter(g => g.toLowerCase() !== name.trim().toLowerCase());
    if (this.genres.length === before) return false;
    setJson(StorageKeys.CUSTOM_GENRES, this.genres);
    this.emit();
    return true;
  }

  removeCustomLanguage(name: string): boolean {
    const before = this.languages.length;
    this.languages = this.languages.filter(l => l.toLowerCase() !== name.trim().toLowerCase());
    if (this.languages.length === before) return false;
    setJson(StorageKeys.CUSTOM_LANGUAGES, this.languages);
    this.emit();
    return true;
  }

  /**
   * AppData restore (R50 point 5): merge persisted lists into the store.
   * Union by case-insensitive name — existing (in-session) entries win,
   * AppData entries fill what local is missing (reinstall recovery).
   */
  hydrateFromAppData(genres: unknown, languages: unknown): void {
    const mergeList = (current: string[], incoming: unknown): string[] => {
      if (!Array.isArray(incoming)) return current;
      const seen = new Set(current.map(e => e.toLowerCase()));
      const result = [...current];
      for (const entry of incoming) {
        if (typeof entry !== 'string') continue;
        const trimmed = entry.trim().replace(/\s+/g, ' ');
        if (!trimmed || trimmed.length > MAX_ENTRY_LENGTH) continue;
        const lower = trimmed.toLowerCase();
        if (seen.has(lower)) continue;
        // Must not collide with the built-ins either
        if (GENRES.some(g => g.toLowerCase() === lower)) continue;
        if (LANGUAGES.some(l => l.toLowerCase() === lower)) continue;
        seen.add(lower);
        result.push(trimmed);
      }
      return result.slice(0, MAX_CUSTOM_ENTRIES);
    };

    this.genres = mergeList(this.genres, genres);
    this.languages = mergeList(this.languages, languages);
    setJson(StorageKeys.CUSTOM_GENRES, this.genres);
    setJson(StorageKeys.CUSTOM_LANGUAGES, this.languages);
    this.emit();
  }
}

/** Module singleton — survives component unmounts, shared across the app. */
export const customTaxonomy = new CustomTaxonomyStore();

// ── Server-side helper for API routes ───────────────────────────────────

/**
 * Sanitize a custom-entry array received in a request body: keep only
 * non-empty strings, trim, cap length/count. Used by /api/harmonize and
 * /api/song-identify so a malicious/oversized body can't blow up the prompt.
 */
export function sanitizeCustomEntries(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const entry of raw) {
    if (typeof entry !== 'string') continue;
    const trimmed = entry.trim().replace(/\s+/g, ' ');
    if (!trimmed || trimmed.length > MAX_ENTRY_LENGTH) continue;
    const lower = trimmed.toLowerCase();
    if (seen.has(lower)) continue;
    seen.add(lower);
    result.push(trimmed);
    if (result.length >= MAX_CUSTOM_ENTRIES) break;
  }
  return result;
}
