/**
 * Shared AI harmonization pipeline (R2 + R3 + R6).
 *
 * One entry point used by BOTH harmonize UIs (batch dialog in the editor
 * screen + the per-song sidebar card):
 *
 *   1. Cache check (R2)     — persistent per-song result cache, no quota.
 *   2. Factual lookup (R6)  — MusicBrainz/Deezer genre/year facts (free).
 *   3. LLM fallback         — /api/harmonize for language detection and
 *                             genre normalization, WITH the factual hints
 *                             attached so the AI doesn't guess blindly.
 *   4. Chunking (R3)        — batches of ANY size are processed in chunks
 *                             (50 per LLM call, 12 per lookup call) with
 *                             progress reporting — no silent truncation.
 *
 * Factual results only fill EMPTY fields; conflicting existing values are
 * left to the LLM normalization pass (with the fact as a hint).
 */

import { getCachedHarmonize, setCachedHarmonize, HarmonizeCacheEntry } from '@/lib/ai/harmonize-cache';
import { normalizeLanguageMixed, canonicalizeGenre } from '@/lib/parsers/meta-normalizer';
import { GENRES, LANGUAGES } from '@/lib/constants';

// ── Types ────────────────────────────────────────────────────────────────

export interface HarmonizeSong {
  id: string;
  title: string;
  artist: string;
  genre: string | null;
  language: string | null;
  year: number | null;
}

export type HarmonizeSource = 'ai' | 'deezer' | 'musicbrainz';

export interface HarmonizeSuggestion {
  songId: string;
  title: string;
  artist: string;
  currentGenre: string | null;
  currentLanguage: string | null;
  currentYear: number | null;
  suggestedGenre: string | null;
  suggestedLanguage: string | null;
  suggestedYear: number | null;
  genreConfidence: number;
  languageConfidence: number;
  yearConfidence: number;
  genreReason: string;
  languageReason: string;
  yearReason: string;
  /** Where the genre suggestion came from — badge in the UI. */
  source: HarmonizeSource;
  /** True when this row was served from the local cache (⚡, no quota used). */
  fromCache?: boolean;
}

export interface HarmonizeProgress {
  phase: 'cache' | 'lookup' | 'ai' | 'done';
  /** Processed songs (phase-relative). */
  done: number;
  total: number;
}

export interface HarmonizeStats {
  total: number;
  fromCache: number;
  factualHits: number;
  aiCalls: number;
  aiErrors: number;
  noChange: number;
  aborted: boolean;
}

export interface HarmonizeResult {
  success: boolean;
  suggestions: HarmonizeSuggestion[];
  stats: HarmonizeStats;
  error?: string;
}

interface HarmonizeOptions {
  onProgress?: (progress: HarmonizeProgress) => void;
  signal?: AbortSignal;
}

// ── Chunk sizes ──────────────────────────────────────────────────────────

/** /api/harmonize caps at 50 songs per call. */
const LLM_CHUNK_SIZE = 50;
/** /api/music-lookup caps at 15 songs per call (MusicBrainz throttling). */
const LOOKUP_CHUNK_SIZE = 12;

// ── Canonicality helpers (client-side LLM skip rules) ────────────────────

function isCanonicalGenre(genre: string | null): boolean {
  if (!genre) return false;
  return GENRES.includes(genre as (typeof GENRES)[number]);
}

function isCanonicalLanguage(language: string | null): boolean {
  if (!language) return false;
  if (LANGUAGES.includes(language as (typeof LANGUAGES)[number])) return true;
  // Mixed-language values ("German/English") are canonical when every part is
  const parts = language.split('/');
  return parts.length > 1 && parts.every(p =>
    LANGUAGES.includes(p.trim() as (typeof LANGUAGES)[number]),
  );
}

/**
 * A song needs the LLM when the factual lookup can't fully resolve it:
 *  - language missing or not canonical (LLM detects/normalizes languages)
 *  - genre missing and no factual genre found
 *  - genre present but non-canonical (LLM normalizes sub-genres)
 * Songs the LLM would answer "null — already fine" for are skipped → quota.
 */
function needsLlm(song: HarmonizeSong, factualGenre: string | null): boolean {
  if (!isCanonicalLanguage(song.language)) return true;
  if (!song.genre && !factualGenre) return true;
  if (song.genre && !isCanonicalGenre(song.genre)) return true;
  return false;
}

// ── Factual lookup (R6) ──────────────────────────────────────────────────

interface FactualHit {
  genre?: string;
  genreConfidence?: number;
  year?: number;
  yearConfidence?: number;
  source: 'deezer' | 'musicbrainz';
  matchedTitle?: string;
  matchedArtist?: string;
}

async function lookupFacts(
  songs: HarmonizeSong[],
  options: HarmonizeOptions,
): Promise<Map<string, FactualHit>> {
  const hits = new Map<string, FactualHit>();

  // Only songs with missing genre or year are worth a lookup
  const candidates = songs.filter(s => !s.genre || !s.year);
  if (candidates.length === 0) return hits;

  const chunks: HarmonizeSong[][] = [];
  for (let i = 0; i < candidates.length; i += LOOKUP_CHUNK_SIZE) {
    chunks.push(candidates.slice(i, i + LOOKUP_CHUNK_SIZE));
  }

  let done = 0;
  for (const chunk of chunks) {
    if (options.signal?.aborted) break;
    try {
      const res = await fetch('/api/music-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          songs: chunk.map(s => ({
            id: s.id, title: s.title, artist: s.artist,
            genre: s.genre, year: s.year,
          })),
        }),
        signal: options.signal,
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.results)) {
        for (const r of data.results) {
          if (r.songId && (r.genre || r.year)) {
            hits.set(r.songId, {
              genre: r.genre,
              genreConfidence: r.genreConfidence,
              year: r.year,
              yearConfidence: r.yearConfidence,
              source: r.source,
              matchedTitle: r.matchedTitle,
              matchedArtist: r.matchedArtist,
            });
          }
        }
      }
    } catch {
      // Network abort or route failure — factual lookup is best-effort;
      // the LLM still covers everything as before.
      if (options.signal?.aborted) break;
    }
    done += chunk.length;
    options.onProgress?.({ phase: 'lookup', done, total: candidates.length });
  }

  return hits;
}

// ── LLM harmonize (with factual hints) ───────────────────────────────────

interface LlmSuggestion {
  songId: string;
  suggestedGenre: string | null;
  suggestedLanguage: string | null;
  genreConfidence: number;
  languageConfidence: number;
  genreReason: string;
  languageReason: string;
}

async function callLlm(
  songs: Array<HarmonizeSong & { hintGenre?: string; hintSource?: string; hintYear?: number }>,
  options: HarmonizeOptions,
): Promise<{ map: Map<string, LlmSuggestion>; errors: number }> {
  const map = new Map<string, LlmSuggestion>();

  const chunks: Array<typeof songs> = [];
  for (let i = 0; i < songs.length; i += LLM_CHUNK_SIZE) {
    chunks.push(songs.slice(i, i + LLM_CHUNK_SIZE));
  }

  let errors = 0;
  let done = 0;

  for (const chunk of chunks) {
    if (options.signal?.aborted) break;
    try {
      const res = await fetch('/api/harmonize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          songs: chunk.map(s => ({
            id: s.id, title: s.title, artist: s.artist,
            genre: s.genre, language: s.language,
            hintGenre: s.hintGenre ?? undefined,
            hintSource: s.hintSource ?? undefined,
            hintYear: s.hintYear ?? undefined,
          })),
        }),
        signal: options.signal,
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.suggestions)) {
        for (const s of data.suggestions as LlmSuggestion[]) {
          map.set(s.songId, s);
        }
      } else {
        errors++;
      }
    } catch {
      if (options.signal?.aborted) break;
      errors++;
    }
    done += chunk.length;
    options.onProgress?.({ phase: 'ai', done, total: songs.length });
  }

  return { map, errors };
}

// ── Cache entry → suggestion row ─────────────────────────────────────────

function cacheEntryToRow(
  song: HarmonizeSong,
  entry: HarmonizeCacheEntry,
): HarmonizeSuggestion {
  return {
    songId: song.id,
    title: song.title,
    artist: song.artist,
    currentGenre: song.genre,
    currentLanguage: song.language,
    currentYear: song.year,
    // Re-canonicalize cached values (user item 12): entries cached before
    // the canonical vocabulary may carry sub-genres or language additions.
    suggestedGenre: entry.suggestedGenre ? canonicalizeGenre(entry.suggestedGenre) : entry.suggestedGenre,
    suggestedLanguage: entry.suggestedLanguage ? normalizeLanguageMixed(entry.suggestedLanguage) : entry.suggestedLanguage,
    suggestedYear: entry.suggestedYear,
    genreConfidence: entry.genreConfidence,
    languageConfidence: entry.languageConfidence,
    yearConfidence: entry.yearConfidence,
    genreReason: entry.genreReason,
    languageReason: entry.languageReason,
    yearReason: entry.yearReason,
    source: entry.source,
    fromCache: true,
  };
}

// ── Main entry point ─────────────────────────────────────────────────────

export async function harmonizeSongs(
  inputSongs: HarmonizeSong[],
  options: HarmonizeOptions = {},
): Promise<HarmonizeResult> {
  const stats: HarmonizeStats = {
    total: inputSongs.length,
    fromCache: 0,
    factualHits: 0,
    aiCalls: 0,
    aiErrors: 0,
    noChange: 0,
    aborted: false,
  };
  const suggestions: HarmonizeSuggestion[] = [];

  if (inputSongs.length === 0) {
    return { success: true, suggestions, stats };
  }

  // 1. Cache check (R2)
  const uncached: HarmonizeSong[] = [];
  for (const song of inputSongs) {
    const cached = getCachedHarmonize(song);
    if (cached) {
      stats.fromCache++;
      const row = cacheEntryToRow(song, cached);
      if (row.suggestedGenre || row.suggestedLanguage || row.suggestedYear) {
        suggestions.push(row);
      } else {
        stats.noChange++;
      }
    } else {
      uncached.push(song);
    }
  }

  options.onProgress?.({ phase: 'cache', done: inputSongs.length, total: inputSongs.length });

  if (uncached.length > 0) {
    // 2. Factual lookup (R6) — MusicBrainz/Deezer for missing genre/year
    const facts = await lookupFacts(uncached, options);
    stats.factualHits = facts.size;

    // 3. LLM for the songs it's actually needed for
    const llmSongs = uncached
      .filter(s => needsLlm(s, facts.get(s.id)?.genre ?? null))
      .map(s => {
        const hit = facts.get(s.id);
        return {
          ...s,
          hintGenre: hit?.genre,
          hintSource: hit?.source,
          hintYear: hit?.year,
        };
      });

    let llmMap = new Map<string, LlmSuggestion>();
    if (llmSongs.length > 0 && !options.signal?.aborted) {
      const result = await callLlm(llmSongs, options);
      llmMap = result.map;
      stats.aiCalls = Math.ceil(llmSongs.length / LLM_CHUNK_SIZE);
      stats.aiErrors = result.errors;
    }

    // 4. Merge everything per song + write cache
    for (const song of uncached) {
      if (options.signal?.aborted) { stats.aborted = true; break; }

      const fact = facts.get(song.id);
      const llm = llmMap.get(song.id);

      // Genre: factual fills EMPTY fields; LLM normalizes/fills the rest.
      // Both go through canonicalizeGenre (user item 12) so Deezer's "Dance
      // Pop" or an LLM slip becomes the canonical "Pop".
      let suggestedGenre: string | null = null;
      let genreConfidence = 0;
      let genreReason = '';
      let source: HarmonizeSource = 'ai';

      if (!song.genre && fact?.genre) {
        suggestedGenre = canonicalizeGenre(fact.genre);
        genreConfidence = fact.genreConfidence ?? 92;
        genreReason = fact.source === 'deezer' ? 'Deezer' : 'MusicBrainz';
        if (fact.matchedArtist || fact.matchedTitle) {
          genreReason += `: "${fact.matchedTitle ?? song.title}" (${fact.matchedArtist ?? song.artist})`;
        } else {
          genreReason += ': album genre';
        }
        source = fact.source;
      } else if (llm?.suggestedGenre) {
        suggestedGenre = canonicalizeGenre(llm.suggestedGenre);
        genreConfidence = llm.genreConfidence ?? 0;
        genreReason = llm.genreReason ?? '';
        source = 'ai';
      }

      // Language: LLM domain (detection + normalization). Mixed-language
      // values keep BOTH languages ("German/English"); parenthetical
      // additions are always stripped (user item 12).
      let suggestedLanguage: string | null = null;
      let languageConfidence = 0;
      let languageReason = '';
      if (llm?.suggestedLanguage) {
        suggestedLanguage = normalizeLanguageMixed(llm.suggestedLanguage);
        languageConfidence = llm.languageConfidence ?? 0;
        languageReason = llm.languageReason ?? '';
      }

      // Year: factual only — the LLM never guesses years
      let suggestedYear: number | null = null;
      let yearConfidence = 0;
      let yearReason = '';
      if (!song.year && fact?.year) {
        suggestedYear = fact.year;
        yearConfidence = fact.yearConfidence ?? 90;
        yearReason = `${fact.source === 'deezer' ? 'Deezer' : 'MusicBrainz'}: first release`;
      }

      // Only suggest changes that actually differ from current values
      const genreChanged = suggestedGenre && suggestedGenre !== song.genre;
      const languageChanged = suggestedLanguage && suggestedLanguage !== song.language;
      const yearChanged = suggestedYear && suggestedYear !== song.year;
      if (!genreChanged) { suggestedGenre = null; genreConfidence = 0; }
      if (!languageChanged) { suggestedLanguage = null; languageConfidence = 0; }
      if (!yearChanged) { suggestedYear = null; yearConfidence = 0; }

      // 5. Persist to the cache (R2) — including the "no change" outcome
      //    so re-runs skip this song entirely.
      setCachedHarmonize(song, {
        suggestedGenre,
        suggestedLanguage,
        suggestedYear,
        genreConfidence,
        languageConfidence,
        yearConfidence,
        genreReason,
        languageReason,
        yearReason,
        source,
      });

      if (suggestedGenre || suggestedLanguage || suggestedYear) {
        suggestions.push({
          songId: song.id,
          title: song.title,
          artist: song.artist,
          currentGenre: song.genre,
          currentLanguage: song.language,
          currentYear: song.year,
          suggestedGenre,
          suggestedLanguage,
          suggestedYear,
          genreConfidence,
          languageConfidence,
          yearConfidence,
          genreReason,
          languageReason,
          yearReason,
          source,
          fromCache: false,
        });
      } else {
        stats.noChange++;
      }
    }
  }

  options.onProgress?.({ phase: 'done', done: inputSongs.length, total: inputSongs.length });

  const success = stats.aiErrors === 0 || suggestions.length > 0;
  return {
    success,
    suggestions,
    stats,
    error: stats.aiErrors > 0 && suggestions.length === 0 ? 'AI analysis failed' : undefined,
  };
}
