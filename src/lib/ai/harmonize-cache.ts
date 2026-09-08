/**
 * Persistent harmonize-suggestion cache (R2).
 *
 * Caches per-song AI/factual harmonization results keyed by a hash over the
 * LLM-relevant inputs (title, artist, current genre, current language, year).
 * Re-running the batch with unchanged songs is then a pure cache hit — no
 * AI quota, no external lookups, instant results.
 *
 * Storage: localStorage via the central storage wrapper. Entries older than
 * CACHE_TTL_MS are evicted lazily on read; the store is pruned to
 * MAX_ENTRIES on write (oldest-first).
 */

import { StorageKeys, getJson, setItem, removeItem } from '@/lib/storage';

// ── Types ────────────────────────────────────────────────────────────────

/** What we persist per song — the merged final suggestion (may be all-null). */
export interface HarmonizeCacheEntry {
  /** Epoch ms when the entry was written. */
  ts: number;
  suggestedGenre: string | null;
  suggestedLanguage: string | null;
  suggestedYear: number | null;
  genreConfidence: number;
  languageConfidence: number;
  yearConfidence: number;
  genreReason: string;
  languageReason: string;
  yearReason: string;
  /** Where the genre suggestion originated — shown as a badge in the UI. */
  source: 'ai' | 'deezer' | 'musicbrainz';
}

interface HarmonizeCacheShape {
  [hash: string]: HarmonizeCacheEntry;
}

// ── Config ───────────────────────────────────────────────────────────────

/** 30 days — genre/language facts for a song don't change. */
export const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
/** Bound memory/storage — karaoke libraries are large but not infinite. */
const MAX_ENTRIES = 3000;

// ── Hashing ──────────────────────────────────────────────────────────────

/**
 * FNV-1a 32-bit hash — compact, deterministic, good enough for cache keys.
 * Input is normalized (case/punctuation-insensitive) so tiny metadata
 * spelling variations still hit the same entry.
 */
function fnv1a(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

/** Normalize a string for hashing: lowercase, strip punctuation/whitespace. */
function normKeyPart(raw: string | null | undefined): string {
  if (!raw) return '';
  return raw.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '');
}

export function harmonizeCacheKey(song: {
  title: string;
  artist: string;
  genre?: string | null;
  language?: string | null;
  year?: number | null;
}): string {
  return fnv1a(
    `${normKeyPart(song.title)}|${normKeyPart(song.artist)}|${normKeyPart(song.genre)}|${normKeyPart(song.language)}|${song.year ?? ''}`,
  );
}

// ── Read / write ─────────────────────────────────────────────────────────

function readStore(): HarmonizeCacheShape {
  return getJson<HarmonizeCacheShape>(StorageKeys.HARMONIZE_CACHE, {});
}

/** Write the store, pruning expired + oversized entries. */
function writeStore(store: HarmonizeCacheShape): void {
  const now = Date.now();

  // 1. Evict expired entries
  for (const key of Object.keys(store)) {
    if (now - store[key].ts > CACHE_TTL_MS) delete store[key];
  }

  // 2. Hard cap: drop the oldest entries beyond MAX_ENTRIES
  const keys = Object.keys(store);
  if (keys.length > MAX_ENTRIES) {
    const sorted = keys.sort((a, b) => store[a].ts - store[b].ts);
    for (let i = 0; i < sorted.length - MAX_ENTRIES; i++) delete store[sorted[i]];
  }

  setItem(StorageKeys.HARMONIZE_CACHE, JSON.stringify(store));
}

/**
 * Fetch a cached suggestion for a song.
 * Returns undefined on miss or expired entry.
 */
export function getCachedHarmonize(song: {
  title: string;
  artist: string;
  genre?: string | null;
  language?: string | null;
  year?: number | null;
}): HarmonizeCacheEntry | undefined {
  const store = readStore();
  const entry = store[harmonizeCacheKey(song)];
  if (!entry) return undefined;
  if (Date.now() - entry.ts > CACHE_TTL_MS) return undefined;
  return entry;
}

/** Store a suggestion for a song (upsert). */
export function setCachedHarmonize(
  song: {
    title: string;
    artist: string;
    genre?: string | null;
    language?: string | null;
    year?: number | null;
  },
  entry: Omit<HarmonizeCacheEntry, 'ts'>,
): void {
  try {
    const store = readStore();
    store[harmonizeCacheKey(song)] = { ...entry, ts: Date.now() };
    writeStore(store);
  } catch {
    // Storage full / unavailable — caching is best-effort, never fatal.
  }
}

/** Clear the whole cache (used after mass-apply to force fresh runs). */
export function clearHarmonizeCache(): void {
  removeItem(StorageKeys.HARMONIZE_CACHE);
}

/** Approximate entry count (for UI/debug). */
export function harmonizeCacheSize(): number {
  return Object.keys(readStore()).length;
}
