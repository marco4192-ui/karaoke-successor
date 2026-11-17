/**
 * Shared factual harmonization pipeline (R2 + R6, R66 AI removal).
 *
 * One entry point used by the Metadata Studio (fill + verify modes):
 *
 *   1. Cache check (R2)     — persistent per-song result cache, no lookups.
 *   2. Factual lookup (R6)  — iTunes (primary)/MusicBrainz/Deezer
 *                             genre/year facts (free, keyless).
 *
 * R66: the former LLM phase (language detection + genre normalization via
 * /api/harmonize) was REMOVED together with the AI service — the pipeline
 * is 100% factual now:
 *  - fill mode:   empty genre/year fields are filled from database facts
 *  - verify mode: existing genre/year values are COMPARED against the
 *                 databases; every mismatch becomes a correction suggestion
 *                 with the source as evidence. Languages have no database
 *                 source and are no longer auto-checked (they count as
 *                 unobjectionable — R62 semantics).
 *
 * R59 "Verify" mode (options.verify): the pipeline queries every song
 * (the API's skip gate opens via verify:true) and returns the source values
 * for present fields too — the client COMPARES them against the current
 * tags. verified-OK songs are cached like no-change results → instant
 * re-runs.
 *
 * R62 verified semantics: a verify run marks a song VERIFIED (✓ badge in
 * the editor library) when it analyzed the song and found NOTHING to
 * correct — fields without a source verdict count as unobjectionable
 * instead of blocking the badge.
 */

import { getCachedHarmonize, setCachedHarmonize, HarmonizeCacheEntry } from '@/lib/editor/harmonize-cache';
import { canonicalizeGenre } from '@/lib/parsers/meta-normalizer';
import { customTaxonomy } from '@/lib/game/custom-taxonomy';

// ── Types ────────────────────────────────────────────────────────────────

export interface HarmonizeSong {
  id: string;
  title: string;
  artist: string;
  genre: string | null;
  language: string | null;
  year: number | null;
}

export type HarmonizeSource = 'ai' | 'deezer' | 'musicbrainz' | 'itunes';

/** Display label per factual source (R47: iTunes joined the chain). */
const SOURCE_LABELS: Record<Exclude<HarmonizeSource, 'ai'>, string> = {
  itunes: 'iTunes',
  deezer: 'Deezer',
  musicbrainz: 'MusicBrainz',
};

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
  /** True when this row was served from the local cache (⚡, no lookups). */
  fromCache?: boolean;
}

export interface HarmonizeProgress {
  phase: 'cache' | 'lookup' | 'done';
  /** Processed songs (phase-relative). */
  done: number;
  total: number;
}

export interface HarmonizeStats {
  total: number;
  fromCache: number;
  factualHits: number;
  noChange: number;
  aborted: boolean;
}

export interface HarmonizeResult {
  success: boolean;
  suggestions: HarmonizeSuggestion[];
  stats: HarmonizeStats;
  /** R60 (verify mode): songs whose EXISTING values were checked and had
   *  NO discrepancy. The studio marks these with Song.metadataVerifiedAt
   *  (✓ badge + unverified filter). Songs with suggestions are never in
   *  here. Always empty in fill mode. */
  verifiedOkIds: string[];
  error?: string;
}

interface HarmonizeOptions {
  onProgress?: (progress: HarmonizeProgress) => void;
  signal?: AbortSignal;
  /** R59 "Verify": check EXISTING genre/year values against the factual
   *  sources instead of filling missing ones. Mismatches become regular
   *  suggestions (same UI + apply path). */
  verify?: boolean;
  /** Field toggles for verify runs (studio Fields row) — only existing
   *  values of ACTIVE fields are compared. Default: all three. */
  verifyFields?: { genre: boolean; language: boolean; year: boolean };
}

// ── Chunk sizes ──────────────────────────────────────────────────────────

/** /api/music-lookup caps at 15 songs per call (MusicBrainz throttling). */
const LOOKUP_CHUNK_SIZE = 12;

// ── R60: verify-cache validity ────────────────────────────────────────────

/**
 * Whether a cache entry may serve a VERIFY run for this song. Only entries
 * written by a verify run count (they carry verifiedFields), and they must
 * cover every field that is REQUESTED in this run and PRESENT on the song.
 * R66: languages have no source anymore — a languageChecked=false entry is
 * fully valid (nothing can ever re-check languages); only genre/year
 * coverage gates the cache read.
 *
 * R62: entries must also carry the CURRENT verify semantics
 * (verifySemantics===2). Pre-R62 entries were written by the strict
 * "every present field positively confirmed by a source" logic — their
 * verifiedOk=false verdicts (e.g. a year no database could confirm) made
 * 100% verification unreachable, and serving them would keep blocking the
 * ✓ badge after the semantics change. Re-check them instead.
 */
function verifyCacheCovers(
  entry: HarmonizeCacheEntry,
  song: HarmonizeSong,
  verifyFields: { genre: boolean; language: boolean; year: boolean },
): boolean {
  if (!entry.verifiedFields) return false; // fill-mode entry — never checked anything
  if (entry.verifySemantics !== 2) return false; // pre-R62 strict verdict — re-check
  if (verifyFields.genre && song.genre && !entry.verifiedFields.genre) return false;
  if (verifyFields.year && song.year != null && !entry.verifiedFields.year) return false;
  return true;
}

// ── Factual lookup (R6) ──────────────────────────────────────────────────

interface FactualHit {
  genre?: string;
  genreConfidence?: number;
  year?: number;
  yearConfidence?: number;
  source: 'deezer' | 'musicbrainz' | 'itunes';
  matchedTitle?: string;
  matchedArtist?: string;
}

async function lookupFacts(
  songs: HarmonizeSong[],
  options: HarmonizeOptions,
): Promise<Map<string, FactualHit>> {
  const hits = new Map<string, FactualHit>();

  // Only songs with missing genre or year are worth a lookup — EXCEPT in
  // verify mode (R59): there the existing values are the subject, so every
  // song is queried and the API returns the source values for present
  // fields too (the client compares them).
  const candidates = songs.filter(s => options.verify || !s.genre || !s.year);
  if (candidates.length === 0) return hits;

  const chunks: HarmonizeSong[][] = [];
  for (let i = 0; i < candidates.length; i += LOOKUP_CHUNK_SIZE) {
    chunks.push(candidates.slice(i, i + LOOKUP_CHUNK_SIZE));
  }

  let done = 0;
  for (const chunk of chunks) {
    if (options.signal?.aborted) break;
    try {
      // R59: custom genres travel WITH the request so the server-side genre
      // mapping honors the user's vocabulary (custom "Jazz" stays "Jazz").
      const customGenres = customTaxonomy.getCustomGenres();
      const res = await fetch('/api/music-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          songs: chunk.map(s => ({
            id: s.id, title: s.title, artist: s.artist,
            genre: s.genre, year: s.year,
          })),
          ...(options.verify ? {
            verify: true,
            fields: {
              genre: options.verifyFields?.genre !== false,
              year: options.verifyFields?.year !== false,
            },
          } : {}),
          ...(customGenres.length > 0 ? { customGenres } : {}),
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
      // songs without a hit simply get no suggestion.
      if (options.signal?.aborted) break;
    }
    done += chunk.length;
    options.onProgress?.({ phase: 'lookup', done, total: candidates.length });
  }

  return hits;
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
    // the canonical vocabulary may carry sub-genres.
    suggestedGenre: entry.suggestedGenre ? canonicalizeGenre(entry.suggestedGenre) : entry.suggestedGenre,
    suggestedLanguage: entry.suggestedLanguage,
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
    noChange: 0,
    aborted: false,
  };
  const suggestions: HarmonizeSuggestion[] = [];
  // R60: per-song verified classification (verify mode only)
  const verifiedOkIds: string[] = [];

  if (inputSongs.length === 0) {
    return { success: true, suggestions, stats, verifiedOkIds };
  }

  // 1. Cache check (R2)
  const uncached: HarmonizeSong[] = [];
  for (const song of inputSongs) {
    let cached = getCachedHarmonize(song);
    // R60/R62/R66: verify runs only accept cache entries that actually
    // VERIFIED this song state under the CURRENT semantics — fill-mode
    // entries, narrower verify runs and pre-R62 strict verdicts are
    // re-checked (verifyCacheCovers), so a logic change heals existing
    // libraries on the next run.
    if (cached && options.verify && !verifyCacheCovers(cached, song, options.verifyFields ?? { genre: true, language: true, year: true })) {
      cached = undefined;
    }
    if (cached) {
      stats.fromCache++;
      const row = cacheEntryToRow(song, cached);
      if (row.suggestedGenre || row.suggestedLanguage || row.suggestedYear) {
        suggestions.push(row);
      } else {
        stats.noChange++;
        // R60: cached verify-OK verdict → eligible for the ✓ badge
        if (options.verify && cached.verifiedOk) verifiedOkIds.push(song.id);
      }
    } else {
      uncached.push(song);
    }
  }

  options.onProgress?.({ phase: 'cache', done: inputSongs.length, total: inputSongs.length });

  if (uncached.length > 0) {
    // 2. Factual lookup (R6) — MusicBrainz/Deezer/iTunes for missing
    //    genre/year; in verify mode (R59) for EVERY song (existing values
    //    included)
    const facts = await lookupFacts(uncached, options);
    stats.factualHits = facts.size;

    // 3. Merge everything per song + write cache
    const verifyFields = options.verifyFields ?? { genre: true, language: true, year: true };
    for (const song of uncached) {
      if (options.signal?.aborted) { stats.aborted = true; break; }

      const fact = facts.get(song.id);

      let suggestedGenre: string | null = null;
      let genreConfidence = 0;
      let genreReason = '';
      let source: HarmonizeSource = 'ai';
      // Language: no auto-fill/verify source anymore (R66 — the LLM was the
      // only language source). Kept for the suggestion/cache shape so old
      // cached entries keep working; always empty in NEW entries.
      const suggestedLanguage: string | null = null;
      const languageConfidence = 0;
      const languageReason = '';
      let suggestedYear: number | null = null;
      let yearConfidence = 0;
      let yearReason = '';

      if (options.verify) {
        // ── R59 VERIFY MODE: compare the EXISTING values against the
        // databases. Both sides are canonicalized with the user's custom
        // taxonomy — a custom "Jazz" matching the source's "Vocal Jazz"
        // is a MATCH, not a mismatch. Only deviations become suggestions.
        const customGenres = customTaxonomy.getCustomGenres();

        // Genre — database verdict
        if (verifyFields.genre && song.genre && fact?.genre) {
          const currentCanonical = canonicalizeGenre(song.genre, customGenres);
          const factGenre = canonicalizeGenre(fact.genre, customGenres);
          if (factGenre && factGenre !== currentCanonical) {
            suggestedGenre = factGenre;
            genreConfidence = fact.genreConfidence ?? 92;
            genreReason = fact.matchedTitle || fact.matchedArtist
              ? `${SOURCE_LABELS[fact.source] ?? 'factual'}: "${fact.matchedTitle ?? song.title}" (${fact.matchedArtist ?? song.artist}) → ${fact.genre}`
              : `${SOURCE_LABELS[fact.source] ?? 'factual'}: ${fact.genre}`;
            source = fact.source;
          }
        }
        // Language — no database source (R66: the former LLM check was
        // removed with the AI service) → nothing to compare, counts as
        // unobjectionable.
        // Year — database verdict
        if (verifyFields.year && song.year != null && fact?.year && fact.year !== song.year) {
          suggestedYear = fact.year;
          yearConfidence = fact.yearConfidence ?? 90;
          yearReason = `${SOURCE_LABELS[fact.source] ?? 'factual'}: first release ${fact.year}`;
        }
      } else {
        // ── FILL MODE: factual fills EMPTY fields. Everything goes
        // through canonicalizeGenre (user item 12) so Deezer's "Dance
        // Pop" becomes the canonical "Pop".
        if (!song.genre && fact?.genre) {
          suggestedGenre = canonicalizeGenre(fact.genre);
          genreConfidence = fact.genreConfidence ?? 92;
          genreReason = SOURCE_LABELS[fact.source] ?? 'factual';
          if (fact.matchedArtist || fact.matchedTitle) {
            genreReason += `: "${fact.matchedTitle ?? song.title}" (${fact.matchedArtist ?? song.artist})`;
          } else {
            genreReason += ': album genre';
          }
          source = fact.source;
        }

        // Language: no auto-fill source anymore (R66 — the LLM was the
        // only language source). Use rule mode or manual mode instead.

        // Year: factual only
        if (!song.year && fact?.year) {
          suggestedYear = fact.year;
          yearConfidence = fact.yearConfidence ?? 90;
          yearReason = `${SOURCE_LABELS[fact.source] ?? 'factual'}: first release`;
        }
      }

      // Only suggest changes that actually differ from current values
      const genreChanged = suggestedGenre && suggestedGenre !== song.genre;
      const yearChanged = suggestedYear && suggestedYear !== song.year;
      if (!genreChanged) { suggestedGenre = null; genreConfidence = 0; }
      if (!yearChanged) { suggestedYear = null; yearConfidence = 0; }

      // ── R60/R62: per-song verified classification (verify mode) ──
      // Which fields had a CHECKABLE verdict in this run (regardless of
      // the outcome): genre + year via database, language never (R66).
      // Inactive fields and absent values are never "checked" — nothing
      // was there to compare. This ONLY feeds the cache coverage
      // (verifyCacheCovers): a narrower earlier run must not answer a
      // broader later one.
      const genreChecked = options.verify
        ? verifyFields.genre && !!song.genre && !!fact?.genre
        : false;
      const yearChecked = options.verify
        ? verifyFields.year && song.year != null && fact?.year != null
        : false;
      // R62 SEMANTICS: a song counts as VERIFIED when the run analyzed it
      // and found NOTHING TO CORRECT. Fields WITHOUT a source verdict are
      // "unobjectionable" — the check had no complaint, the data counts
      // as correct.
      const verifiedOk = options.verify
        ? !suggestedGenre && !suggestedLanguage && !suggestedYear
        : false;
      if (verifiedOk) verifiedOkIds.push(song.id);

      // 4. Persist to the cache (R2) — including the "no change" outcome
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
        // R60: verify runs record the verdict — later verify runs may
        // serve this entry from the cache (incl. the ✓-badge eligibility).
        // R62: verifySemantics=2 marks the CURRENT (relaxed) verdict
        // semantics — see verifyCacheCovers.
        ...(options.verify ? {
          verifiedOk,
          verifiedFields: {
            genre: genreChecked,
            language: false,
            year: yearChecked,
          },
          verifySemantics: 2 as const,
        } : {}),
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

  return {
    success: true,
    suggestions,
    stats,
    verifiedOkIds,
  };
}
