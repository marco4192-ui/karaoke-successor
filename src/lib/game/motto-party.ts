/**
 * Motto-Party store — themed party mode (user request R24: „Motto-Party").
 *
 * A Motto-Party configures the WHOLE game around one motto (e.g. an
 * „80er Jahre" party):
 *  - an individual NAME shown everywhere instead of the filter UI
 *  - MULTIPLE free-text search fields (artist/title, fuzzy-matched) combined
 *    with cumulative (AND) or independent (OR) logic
 *  - optional genre / language / release-year / era filters (AND-combined
 *    on top of the search-field matches)
 *
 * When ENABLED:
 *  - every Song-Filter UI in the game is hidden and replaced by a single
 *    „Motto-Party: <name>" banner (party setup desktop + companion mirror)
 *  - every song pool in the game (random picks, vote suggestions, medley
 *    snippets, Battle Royale rounds, tournament songs, PTM next song,
 *    companion song list) is restricted to the motto-matching songs —
 *    implemented as a single source of truth inside filterSongs()
 *    (song-library.ts), so no call site needs to know about the motto.
 *
 * Storage: localStorage (per device, like every other app setting).
 * Reactivity: module singleton with subscribe()/getSnapshotVersion() —
 * useMottoParty() (useSyncExternalStore) re-renders every consumer the
 * moment the config changes.
 */

import { StorageKeys, getJsonOptional, setJson } from '@/lib/storage';
import { fuzzyMatch } from '@/lib/fuzzy-search';
import { splitGenres, normalizeGenreName, normalizeLanguage } from '@/lib/parsers/meta-normalizer';
import { splitLanguageParts, LANGUAGE_FILTER_OTHERS, MIN_SONGS_FOR_OWN_LANGUAGE_ENTRY } from '@/lib/game/language-filter';
import { songMatchesEra } from '@/lib/game/era-filter';

// ===================== TYPES =====================

/** One free-text search field (artist/title, fuzzy-matched). */
export interface MottoSearchField {
  id: string;
  term: string;
}

/** Activatable filters — 'all' means inactive (mirrors the party setup). */
export interface MottoPartyFilters {
  genre: string;
  language: string;
  releaseYear: string;
  era: string;
}

/** How multiple search fields combine. */
export type MottoSearchLogic = 'and' | 'or';

export interface MottoPartyConfig {
  /** Master switch — when true, the motto replaces all filter/search UI. */
  enabled: boolean;
  /** The motto name, e.g. „80er Jahre" — shown in the Motto-Party banner. */
  name: string;
  /** Search-field logic: 'and' = cumulative, 'or' = independent. */
  logic: MottoSearchLogic;
  /** Multiple free-text search fields (artist/title, fuzzy). */
  searchFields: MottoSearchField[];
  /** Optional filters, AND-combined with the search-field matches. */
  filters: MottoPartyFilters;
}

// ===================== VALIDATION LIMITS =====================

/** Maximum motto name length (characters, trimmed). */
export const MOTTO_MAX_NAME_LENGTH = 60;
/** Maximum length of a single search term (characters, trimmed). */
export const MOTTO_MAX_TERM_LENGTH = 60;
/** Maximum number of search fields. */
export const MOTTO_MAX_SEARCH_FIELDS = 10;

export interface AddTermResult {
  ok: boolean;
  /** Validation failed (empty / too long / too many fields / duplicate). */
  error?: 'empty' | 'too-long' | 'limit-reached' | 'duplicate';
}

// ===================== SANITIZATION =====================

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

let idCounter = 0;

/** Collision-free ID for a search field (timestamp + counter + random). */
function newFieldId(): string {
  idCounter = (idCounter + 1) % 100000;
  return `motto-${Date.now().toString(36)}-${idCounter}-${Math.random().toString(36).slice(2, 8)}`;
}

export const DEFAULT_MOTTO_CONFIG: MottoPartyConfig = {
  enabled: false,
  name: '',
  logic: 'or',
  searchFields: [],
  filters: { genre: 'all', language: 'all', releaseYear: 'all', era: 'all' },
};

function sanitizeFilterValue(raw: unknown): string {
  // Filter values are either 'all' or a plain non-empty string (genre name,
  // language, 4-digit year, decade start year). Cap the length defensively.
  if (typeof raw !== 'string') return 'all';
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > 60) return 'all';
  return trimmed;
}

/** Read, sanitize and shape a persisted config. Unknown/corrupt fields fall
 *  back to their defaults — a broken localStorage entry can never crash the
 *  app or brick the song filtering. */
export function sanitizeMottoConfig(raw: unknown): MottoPartyConfig {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_MOTTO_CONFIG, filters: { ...DEFAULT_MOTTO_CONFIG.filters }, searchFields: [] };
  const r = raw as Partial<MottoPartyConfig> & { filters?: Partial<MottoPartyFilters> };

  const name = typeof r.name === 'string'
    ? r.name.trim().replace(/\s+/g, ' ').slice(0, MOTTO_MAX_NAME_LENGTH)
    : '';

  const seenTerms = new Set<string>();
  const searchFields: MottoSearchField[] = [];
  if (Array.isArray(r.searchFields)) {
    for (const field of r.searchFields) {
      if (!field || typeof field !== 'object') continue;
      const term = typeof field.term === 'string'
        ? field.term.trim().replace(/\s+/g, ' ').slice(0, MOTTO_MAX_TERM_LENGTH)
        : '';
      if (!term) continue;
      if (searchFields.length >= MOTTO_MAX_SEARCH_FIELDS) break;
      const lower = term.toLowerCase();
      if (seenTerms.has(lower)) continue; // drop persisted duplicates
      seenTerms.add(lower);
      const id = typeof field.id === 'string' && field.id ? field.id : newFieldId();
      searchFields.push({ id, term });
    }
  }

  const rawFilters: Partial<MottoPartyFilters> = r.filters ?? {};
  const filters: MottoPartyFilters = {
    genre: sanitizeFilterValue(rawFilters.genre),
    language: sanitizeFilterValue(rawFilters.language),
    releaseYear: sanitizeFilterValue(rawFilters.releaseYear),
    era: sanitizeFilterValue(rawFilters.era),
  };

  return {
    enabled: r.enabled === true,
    name,
    logic: r.logic === 'and' ? 'and' : 'or',
    searchFields,
    filters,
  };
}

// ===================== STORE =====================

class MottoPartyStore {
  private config: MottoPartyConfig = isBrowser()
    ? sanitizeMottoConfig(getJsonOptional(StorageKeys.MOTTO_PARTY))
    : { ...DEFAULT_MOTTO_CONFIG, filters: { ...DEFAULT_MOTTO_CONFIG.filters }, searchFields: [] };
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

  private persist(): void {
    setJson(StorageKeys.MOTTO_PARTY, this.config);
  }

  // ── Reads ──

  /** Deep copy of the current config (callers can mutate freely). */
  getConfig(): MottoPartyConfig {
    return {
      enabled: this.config.enabled,
      name: this.config.name,
      logic: this.config.logic,
      searchFields: this.config.searchFields.map(f => ({ ...f })),
      filters: { ...this.config.filters },
    };
  }

  isEnabled(): boolean {
    return this.config.enabled;
  }

  // ── Writes (each persists + emits immediately) ──

  setEnabled(enabled: boolean): void {
    if (this.config.enabled === enabled) return;
    this.config = { ...this.config, enabled };
    this.persist();
    this.emit();
  }

  setName(name: string): void {
    const clean = name.replace(/\s+/g, ' ').slice(0, MOTTO_MAX_NAME_LENGTH);
    if (this.config.name === clean) return;
    this.config = { ...this.config, name: clean };
    this.persist();
    this.emit();
  }

  setLogic(logic: MottoSearchLogic): void {
    if (this.config.logic === logic) return;
    this.config = { ...this.config, logic };
    this.persist();
    this.emit();
  }

  /**
   * Add a search field. Validates: non-empty after trim, max term length,
   * duplicate check against existing fields (case-insensitive — "abba" vs
   * "ABBA" is the same term), max field count.
   */
  addSearchField(term: string): AddTermResult {
    const clean = term.trim().replace(/\s+/g, ' ');
    if (!clean) return { ok: false, error: 'empty' };
    if (clean.length > MOTTO_MAX_TERM_LENGTH) return { ok: false, error: 'too-long' };
    if (this.config.searchFields.length >= MOTTO_MAX_SEARCH_FIELDS) return { ok: false, error: 'limit-reached' };
    const lower = clean.toLowerCase();
    if (this.config.searchFields.some(f => f.term.toLowerCase() === lower)) return { ok: false, error: 'duplicate' };

    this.config = {
      ...this.config,
      searchFields: [...this.config.searchFields, { id: newFieldId(), term: clean }],
    };
    this.persist();
    this.emit();
    return { ok: true };
  }

  /** Live-update a search field's term (no dedupe while typing — only on add). */
  updateSearchField(id: string, term: string): void {
    const clean = term.slice(0, MOTTO_MAX_TERM_LENGTH);
    const index = this.config.searchFields.findIndex(f => f.id === id);
    if (index === -1 || this.config.searchFields[index].term === clean) return;
    const searchFields = [...this.config.searchFields];
    searchFields[index] = { ...searchFields[index], term: clean };
    this.config = { ...this.config, searchFields };
    this.persist();
    this.emit();
  }

  removeSearchField(id: string): void {
    if (!this.config.searchFields.some(f => f.id === id)) return;
    this.config = {
      ...this.config,
      searchFields: this.config.searchFields.filter(f => f.id !== id),
    };
    this.persist();
    this.emit();
  }

  /** Set one filter value ('all' = inactive). */
  setFilter(key: keyof MottoPartyFilters, value: string): void {
    const clean = sanitizeFilterValue(value);
    if (this.config.filters[key] === clean) return;
    this.config = {
      ...this.config,
      filters: { ...this.config.filters, [key]: clean },
    };
    this.persist();
    this.emit();
  }

  /** Deactivate all filters ('all'). */
  resetFilters(): void {
    if (Object.values(this.config.filters).every(v => v === 'all')) return;
    this.config = { ...this.config, filters: { ...DEFAULT_MOTTO_CONFIG.filters } };
    this.persist();
    this.emit();
  }

  /** Full reset to defaults (keeps nothing). */
  reset(): void {
    this.config = { ...DEFAULT_MOTTO_CONFIG, filters: { ...DEFAULT_MOTTO_CONFIG.filters }, searchFields: [] };
    this.persist();
    this.emit();
  }
}

/** Module singleton — survives component unmounts, shared across the app. */
export const mottoParty = new MottoPartyStore();

// ===================== GENERIC MOTTO FILTER (R25) =====================

/**
 * Minimal song shape the motto filter needs — BOTH the desktop `Song` and
 * the companion `MobileSong` satisfy it structurally, so the desktop
 * library, the party pools and the companion library all run the EXACT
 * same matching logic (single source of truth, no drift between devices).
 */
export interface MottoSongSubset {
  title: string;
  artist: string;
  genre?: string;
  language?: string;
  year?: number;
}

/**
 * Filter songs by the Motto-Party config — generic over any song shape with
 * title/artist/genre/language/year (user request R24, extended to the normal
 * Library song selection in R25: Desktop + Companion).
 *
 * Semantics (identical to the R24 party pools — implemented here so the
 * companion library mirrors the desktop 1:1):
 *  1. MULTIPLE search fields (artist/title, fuzzy — same Levenshtein
 *     tolerance as the regular search) combine with
 *       logic='and' → cumulative: a song must match EVERY term
 *       logic='or'  → independent: a song must match ANY term
 *  2. Activated filters (genre/language/releaseYear/era) AND-combine on top
 *     of the search-field matches — same normalization rules as the regular
 *     filter logic (comma-separated genres, multilingual songs, era buckets,
 *     "Others" languages below the 5-song own-entry threshold).
 */
export function filterSongsByMotto<T extends MottoSongSubset>(songs: T[], motto: MottoPartyConfig): T[] {
  const terms = motto.searchFields
    .map(f => f.term.trim())
    .filter(t => t.length > 0);
  const f = motto.filters;
  const hasGenre = f.genre !== 'all';
  const hasLanguage = f.language !== 'all';
  const hasYear = f.releaseYear !== 'all';
  const hasEra = f.era !== 'all';
  if (terms.length === 0 && !hasGenre && !hasLanguage && !hasYear && !hasEra) return songs;

  // 1. Search fields (cumulative AND / independent OR)
  let pool = songs;
  if (terms.length > 0) {
    pool = pool.filter(s => {
      const matches = terms.map(term => fuzzyMatch(term, s.title) || fuzzyMatch(term, s.artist));
      return motto.logic === 'and' ? matches.every(Boolean) : matches.some(Boolean);
    });
  }

  // 2. Genre filter — comma-separated genres match per part ("Soundtrack, K-Pop")
  if (hasGenre) {
    const normalizedFilter = normalizeGenreName(f.genre).toLowerCase();
    pool = pool.filter(s => {
      if (!s.genre) return false;
      return splitGenres(s.genre).some(g => normalizeGenreName(g).toLowerCase() === normalizedFilter);
    });
  }

  // 3. Language filter — multilingual songs ("German/English") match EVERY
  //    listed language; "Others" matches languages below the 5-song threshold
  //    (computed from the same pool, like the regular filter dropdowns).
  if (hasLanguage) {
    if (f.language === LANGUAGE_FILTER_OTHERS) {
      const counts = new Map<string, number>();
      for (const s of pool) {
        if (!s.language) continue;
        for (const part of splitLanguageParts(s.language)) {
          counts.set(part, (counts.get(part) ?? 0) + 1);
        }
      }
      const big = new Set<string>();
      for (const [lang, count] of counts) {
        if (count >= MIN_SONGS_FOR_OWN_LANGUAGE_ENTRY) big.add(lang);
      }
      pool = pool.filter(s => {
        if (!s.language) return false;
        return splitLanguageParts(s.language).some(p => !big.has(p));
      });
    } else {
      const target = normalizeLanguage(f.language);
      pool = pool.filter(s => {
        if (!s.language) return false;
        return splitLanguageParts(s.language).includes(target);
      });
    }
  }

  // 4. Release-year filter (exact match)
  if (hasYear) {
    const year = parseInt(f.releaseYear, 10);
    if (!isNaN(year)) {
      pool = pool.filter(s => s.year === year);
    }
  }

  // 5. Era filter (decade bucket, e.g. '1980' matches 1980-1989)
  if (hasEra) {
    pool = pool.filter(s => songMatchesEra(s, f.era));
  }

  return pool;
}
