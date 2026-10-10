/**
 * Shared AI harmonization pipeline (R2 + R3 + R6).
 *
 * One entry point used by BOTH harmonize UIs (batch dialog in the editor
 * screen + the per-song sidebar card):
 *
 *   1. Cache check (R2)     — persistent per-song result cache, no quota.
 *   2. Factual lookup (R6)  — iTunes (R47 primary)/MusicBrainz/Deezer
 *                             genre/year facts (free, keyless).
 *   3. LLM fallback         — /api/harmonize for language detection and
 *                             genre normalization, WITH the factual hints
 *                             attached so the AI doesn't guess blindly.
 *   4. Chunking (R3)        — batches of ANY size are processed in chunks
 *                             (50 per LLM call, 12 per lookup call) with
 *                             progress reporting — no silent truncation.
 *
 * Factual results only fill EMPTY fields; conflicting existing values are
 * left to the LLM normalization pass (with the fact as a hint).
 *
 * R59 "Verify" mode (options.verify): the pipeline runs the SAME source
 * chain, but for the OPPOSITE question — are the EXISTING values correct?
 *  - lookupFacts queries every song (the API's skip gate opens via
 *    verify:true) and returns the source values for present fields too
 *  - the client COMPARES: source genre (canonical, incl. the user's custom
 *    taxonomy) vs. current genre, source year vs. current year — every
 *    mismatch becomes a regular suggestion row with the source as evidence
 *  - the LLM verifies languages (no database carries them) and cross-checks
 *    genres the databases had no verdict for (mode:'verify' prompt)
 *  - verified-OK songs are cached like no-change results → instant re-runs
 *
 * R62 verified semantics: a verify run marks a song VERIFIED (✓ badge in
 * the editor library) when it analyzed the song and found NOTHING to
 * correct — fields without a source verdict count as unobjectionable
 * instead of blocking the badge. The R60 "every field positively
 * confirmed" rule made 100% verification unreachable: any song whose
 * year no database could confirm never got the badge, no matter how often
 * the user re-ran the check.
 */

import { getCachedHarmonize, setCachedHarmonize, HarmonizeCacheEntry } from '@/lib/ai/harmonize-cache';
import { normalizeLanguageMixed, canonicalizeGenre } from '@/lib/parsers/meta-normalizer';
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
  /** Songs the AI could not analyze (incomplete/failed LLM response even
   *  after one retry). They are NOT cached — a later run retries them. */
  notAnalyzed: number;
}

export interface HarmonizeResult {
  success: boolean;
  suggestions: HarmonizeSuggestion[];
  stats: HarmonizeStats;
  /** R60 (verify mode): songs whose EXISTING values were fully checked
   *  (a verdict was available for every present field of the run's field
   *  config) and had NO discrepancy. The studio marks these with
   *  Song.metadataVerifiedAt (✓ badge + unverified filter). Songs with
   *  suggestions, unanalyzed songs (missing LLM verdict) and post-abort
   *  songs are never in here. Always empty in fill mode. */
  verifiedOkIds: string[];
  error?: string;
}

interface HarmonizeOptions {
  onProgress?: (progress: HarmonizeProgress) => void;
  signal?: AbortSignal;
  /** R59 "Verify": check EXISTING genre/language/year values against the
   *  factual sources (and the LLM for language) instead of filling missing
   *  ones. Mismatches become regular suggestions (same UI + apply path). */
  verify?: boolean;
  /** Field toggles for verify runs (studio Fields row) — only existing
   *  values of ACTIVE fields are compared. Default: all three. */
  verifyFields?: { genre: boolean; language: boolean; year: boolean };
}

// ── AI availability probe (prevents doomed LLM calls) ──────────────────

/** On machines without .z-ai-config (e.g. the packaged desktop app) every
 * /api/harmonize call fails with 503 — spamming the console and wasting
 * round-trips. We probe /api/ai-status once per run and skip the LLM phase
 * entirely when the AI service is unavailable. Factual lookups still run
 * (MusicBrainz/Deezer are free and keyless). */
let aiAvailableCache: { value: boolean; checkedAt: number } | null = null;
const AI_STATUS_TTL_MS = 60_000;

async function isAiAvailable(): Promise<boolean> {
  if (aiAvailableCache && Date.now() - aiAvailableCache.checkedAt < AI_STATUS_TTL_MS) {
    return aiAvailableCache.value;
  }
  try {
    const res = await fetch('/api/ai-status');
    const data = await res.json();
    aiAvailableCache = { value: data.available === true, checkedAt: Date.now() };
  } catch {
    // Probe failed (offline?) — assume unavailable, don't waste LLM calls.
    aiAvailableCache = { value: false, checkedAt: Date.now() };
  }
  return aiAvailableCache.value;
}

// ── Chunk sizes ──────────────────────────────────────────────────────────

/** 12 songs per LLM call (route caps at 15). The old 50-per-call chunk made
 * the LLM return incomplete JSON arrays (often only ~5 entries) — those songs
 * were then wrongly treated as "no change". Small chunks keep responses
 * complete; missing entries are retried once by callLlm. */
const LLM_CHUNK_SIZE = 12;
/** /api/music-lookup caps at 15 songs per call (MusicBrainz throttling). */
const LOOKUP_CHUNK_SIZE = 12;

// ── Canonicality helpers (client-side LLM skip rules) ────────────────────

// NOTE (R20 "Genres & Languages"): the canonical vocabulary is the built-in
// list PLUS the user's custom entries — a song tagged with a custom genre
// ("Jazz"…) or custom language is already canonical and does not burn an
// LLM call.

function isCanonicalGenre(genre: string | null): boolean {
  if (!genre) return false;
  return customTaxonomy.getAllGenres().includes(genre);
}

function isCanonicalLanguage(language: string | null): boolean {
  if (!language) return false;
  const all = customTaxonomy.getAllLanguages();
  if (all.includes(language)) return true;
  // Mixed-language values ("German/English") are canonical when every part is
  const parts = language.split('/');
  return parts.length > 1 && parts.every(p => all.includes(p.trim()));
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

/** R59: verify-mode LLM gate — different logic than fill mode:
 *  - language: the LLM is the ONLY language source, so every existing
 *    language gets checked (canonicality is NOT a skip reason — a canonical
 *    but wrong value like "Pop" on a metal song is exactly the target)
 *  - genre: only when the databases returned NO verdict (nothing to
 *    contradict or confirm) — keeps the quota impact bounded
 *  - year: never the LLM's business (factual only) */
function verifyNeedsLlm(
  song: HarmonizeSong,
  fact: FactualHit | undefined,
  vf: { genre: boolean; language: boolean; year: boolean },
): boolean {
  if (vf.language && song.language) return true;
  if (vf.genre && song.genre && !fact?.genre) return true;
  return false;
}

// ── R60: verify-cache validity ────────────────────────────────────────────

/**
 * Whether a cache entry may serve a VERIFY run for this song. Only entries
 * written by a verify run count (they carry verifiedFields), and they must
 * cover every field that is REQUESTED in this run and PRESENT on the song —
 * a narrower earlier run (or a fill run, which checks nothing) must not
 * answer this run's question. Fixes the latent R59 gap where a fill-cached
 * song was served as "no change" in verify mode without ever being checked.
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
  if (verifyFields.language && song.language && !entry.verifiedFields.language) return false;
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
  /** False when the LLM dropped this entry — NOT a "no change" verdict. */
  analyzed?: boolean;
}

/** One LLM call for a small chunk. Returns ONLY the songs the model actually
 *  answered for (analyzed=true entries); dropped entries are absent.
 *  Custom genres/languages (R20) travel WITH the request so the server-side
 *  prompt and post-normalization honor the user's vocabulary. R59: in verify
 *  mode the request carries mode:'verify' so the prompt asks for a
 *  correctness check instead of gap filling. */
async function callLlmChunk(
  songs: Array<HarmonizeSong & { hintGenre?: string; hintSource?: string; hintYear?: number }>,
  signal?: AbortSignal,
  verify = false,
): Promise<Map<string, LlmSuggestion>> {
  const map = new Map<string, LlmSuggestion>();
  const customGenres = customTaxonomy.getCustomGenres();
  const customLanguages = customTaxonomy.getCustomLanguages();
  try {
    const res = await fetch('/api/harmonize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        songs: songs.map(s => ({
          id: s.id, title: s.title, artist: s.artist,
          genre: s.genre, language: s.language,
          hintGenre: s.hintGenre ?? undefined,
          hintSource: s.hintSource ?? undefined,
          hintYear: s.hintYear ?? undefined,
        })),
        ...(customGenres.length > 0 ? { customGenres } : {}),
        ...(customLanguages.length > 0 ? { customLanguages } : {}),
        ...(verify ? { mode: 'verify' as const } : {}),
      }),
      signal,
    });
    const data = await res.json();
    if (data.success && Array.isArray(data.suggestions)) {
      for (const s of data.suggestions as LlmSuggestion[]) {
        if (s.songId && s.analyzed !== false) {
          map.set(s.songId, s);
        }
      }
    }
  } catch {
    // Network abort or route failure — chunk treated as unanswered
  }
  return map;
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
    const first = await callLlmChunk(chunk, options.signal, options.verify === true);

    // Retry once for entries the model dropped (incomplete JSON array)
    const missing = chunk.filter(s => !first.has(s.id));
    let combined = first;
    if (missing.length > 0 && !options.signal?.aborted) {
      const retry = await callLlmChunk(missing, options.signal, options.verify === true);
      combined = new Map([...first, ...retry]);
    }

    for (const [id, s] of combined) map.set(id, s);
    const stillMissing = chunk.filter(s => !combined.has(s.id));
    if (stillMissing.length === chunk.length) errors++; // whole chunk failed
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
    notAnalyzed: 0,
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
    // R60/R62: verify runs only accept cache entries that actually VERIFIED
    // this song state under the CURRENT semantics — fill-mode entries,
    // narrower verify runs and pre-R62 strict verdicts are re-checked
    // (verifyCacheCovers), so a logic change heals existing libraries on
    // the next run.
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
    // 2. Factual lookup (R6) — MusicBrainz/Deezer for missing genre/year;
    //    in verify mode (R59) for EVERY song (existing values included)
    const facts = await lookupFacts(uncached, options);
    stats.factualHits = facts.size;

    // 3. LLM for the songs it's actually needed for
    const verifyFields = options.verifyFields ?? { genre: true, language: true, year: true };
    const llmSongs = uncached
      .filter(s => options.verify
        ? verifyNeedsLlm(s, facts.get(s.id), verifyFields)
        : needsLlm(s, facts.get(s.id)?.genre ?? null))
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
      // Skip the whole LLM phase when the AI service is unavailable — no
      // doomed 503 requests, no console spam. Affected songs count as
      // notAnalyzed (they are NOT cached) and are retried on the next run.
      if (await isAiAvailable()) {
        const result = await callLlm(llmSongs, options);
        llmMap = result.map;
        stats.aiCalls = Math.ceil(llmSongs.length / LLM_CHUNK_SIZE);
        stats.aiErrors = result.errors;
      } else {
        stats.aiErrors = 1; // signals "AI unavailable" in the result error
      }
    }

    // 4. Merge everything per song + write cache
    for (const song of uncached) {
      if (options.signal?.aborted) { stats.aborted = true; break; }

      const fact = facts.get(song.id);
      const llm = llmMap.get(song.id);

      // ── Unanalyzed songs (AI unavailable / incomplete response) ──
      // A song that NEEDED the LLM but got no answer must NOT be cached as
      // "no change" — that would freeze it as "done" even though nothing was
      // ever analyzed (user complaint: songs treated as genre-set although
      // the AI search never ran). Skip the cache, count it, retry next run.
      // R59 verify: the LLM is the ONLY language source — a missing verdict
      // leaves the language unchecked. Fact-based genre/year suggestions
      // still flow through (why throw away solid database findings?), but
      // the song counts as not fully analyzed and is NOT cached, so the
      // language check retries on the next run instead of being silently
      // frozen out by one transient LLM failure.
      const songNeededLlm = options.verify
        ? verifyNeedsLlm(song, fact, verifyFields)
        : needsLlm(song, fact?.genre ?? null);
      const llmVerdictMissing = songNeededLlm && !llm;
      if (llmVerdictMissing && !fact && !options.verify) {
        stats.notAnalyzed++;
        continue;
      }
      if (llmVerdictMissing && options.verify) {
        stats.notAnalyzed++;
      }

      let suggestedGenre: string | null = null;
      let genreConfidence = 0;
      let genreReason = '';
      let source: HarmonizeSource = 'ai';
      let suggestedLanguage: string | null = null;
      let languageConfidence = 0;
      let languageReason = '';
      let suggestedYear: number | null = null;
      let yearConfidence = 0;
      let yearReason = '';

      if (options.verify) {
        // ── R59 VERIFY MODE: compare the EXISTING values against the
        // sources. Both sides are canonicalized with the user's custom
        // taxonomy — a custom "Jazz" matching the source's "Vocal Jazz"
        // is a MATCH, not a mismatch. Only deviations become suggestions.
        const customGenres = customTaxonomy.getCustomGenres();
        const customLanguages = customTaxonomy.getCustomLanguages();

        // Genre — database verdict (factual, wins over the LLM)
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
        // Language — LLM domain (no database carries languages)
        if (verifyFields.language && song.language && llm?.suggestedLanguage) {
          const suggested = normalizeLanguageMixed(llm.suggestedLanguage, customLanguages);
          if (suggested && suggested !== song.language) {
            suggestedLanguage = suggested;
            languageConfidence = llm.languageConfidence ?? 0;
            languageReason = llm.languageReason ?? '';
          }
        }
        // Genre — LLM cross-check, only when the databases had NO verdict
        // (a factual match/mismatch always wins over the model's opinion)
        if (verifyFields.genre && song.genre && !fact?.genre && llm?.suggestedGenre) {
          const suggested = canonicalizeGenre(llm.suggestedGenre, customGenres);
          if (suggested && suggested !== song.genre) {
            suggestedGenre = suggested;
            genreConfidence = llm.genreConfidence ?? 0;
            genreReason = llm.genreReason ?? '';
            source = 'ai';
          }
        }
        // Year — database verdict only (the LLM never handles years)
        if (verifyFields.year && song.year != null && fact?.year && fact.year !== song.year) {
          suggestedYear = fact.year;
          yearConfidence = fact.yearConfidence ?? 90;
          yearReason = `${SOURCE_LABELS[fact.source] ?? 'factual'}: first release ${fact.year}`;
        }
      } else {
        // Genre: factual fills EMPTY fields; LLM normalizes/fills the rest.
        // Both go through canonicalizeGenre (user item 12) so Deezer's "Dance
        // Pop" or an LLM slip becomes the canonical "Pop".
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
        } else if (llm?.suggestedGenre) {
          suggestedGenre = canonicalizeGenre(llm.suggestedGenre);
          genreConfidence = llm.genreConfidence ?? 0;
          genreReason = llm.genreReason ?? '';
          source = 'ai';
        }

        // Language: LLM domain (detection + normalization). Mixed-language
        // values keep BOTH languages ("German/English"); parenthetical
        // additions are always stripped (user item 12).
        if (llm?.suggestedLanguage) {
          suggestedLanguage = normalizeLanguageMixed(llm.suggestedLanguage);
          languageConfidence = llm.languageConfidence ?? 0;
          languageReason = llm.languageReason ?? '';
        }

        // Year: factual only — the LLM never guesses years
        if (!song.year && fact?.year) {
          suggestedYear = fact.year;
          yearConfidence = fact.yearConfidence ?? 90;
          yearReason = `${SOURCE_LABELS[fact.source] ?? 'factual'}: first release`;
        }
      }

      // Only suggest changes that actually differ from current values
      const genreChanged = suggestedGenre && suggestedGenre !== song.genre;
      const languageChanged = suggestedLanguage && suggestedLanguage !== song.language;
      const yearChanged = suggestedYear && suggestedYear !== song.year;
      if (!genreChanged) { suggestedGenre = null; genreConfidence = 0; }
      if (!languageChanged) { suggestedLanguage = null; languageConfidence = 0; }
      if (!yearChanged) { suggestedYear = null; yearConfidence = 0; }

      // ── R60/R62: per-song verified classification (verify mode) ──
      // Which fields had a CHECKABLE verdict in this run (regardless of the
      // outcome): genre via database or analyzed LLM, language via LLM only,
      // year via database only. Inactive fields and absent values are never
      // "checked" — nothing was there to compare. This ONLY feeds the cache
      // coverage (verifyCacheCovers): a narrower earlier run must not answer
      // a broader later one.
      const genreChecked = options.verify
        ? verifyFields.genre && !!song.genre && (!!fact?.genre || !!llm)
        : false;
      const languageChecked = options.verify
        ? verifyFields.language && !!song.language && !!llm
        : false;
      const yearChecked = options.verify
        ? verifyFields.year && song.year != null && fact?.year != null
        : false;
      // R62 SEMANTICS: a song counts as VERIFIED when the run analyzed it and
      // found NOTHING TO CORRECT. The R60 logic additionally required every
      // present field to be positively CONFIRMED by a source — which made
      // 100% verification unreachable: any song whose year no database could
      // confirm (karaoke/covers/obscure releases) never got the ✓ badge, no
      // matter how often the user re-ran the check. Fields WITHOUT a source
      // verdict are now "unobjectionable" — the check had no complaint, the
      // data counts as correct. The only hard exclusion (besides an open
      // correction suggestion) is a MISSING LLM verdict: that song was not
      // analyzed at all (AI unavailable / dropped entry) and stays
      // unverified until a successful run actually checks it.
      const verifiedOk = options.verify && !llmVerdictMissing
        ? !suggestedGenre && !suggestedLanguage && !suggestedYear
        : false;
      if (verifiedOk) verifiedOkIds.push(song.id);

      // 5. Persist to the cache (R2) — including the "no change" outcome
      //    so re-runs skip this song entirely. EXCEPT when an LLM verdict
      //    was needed but never arrived (R59 verify): a cache entry would
      //    freeze the unaudited language as "done" — leave it uncached so
      //    the next run retries the check.
      if (!llmVerdictMissing) {
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
              language: languageChecked,
              year: yearChecked,
            },
            verifySemantics: 2 as const,
          } : {}),
        });
      }

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

  const success = (stats.aiErrors === 0 && stats.notAnalyzed === 0) || suggestions.length > 0;
  return {
    success,
    suggestions,
    stats,
    verifiedOkIds,
    error: stats.aiErrors > 0 || stats.notAnalyzed > 0
      ? (suggestions.length === 0
        ? 'AI analysis failed'
        : `AI partially unavailable — ${stats.notAnalyzed} song(s) not analyzed`)
      : undefined,
  };
}

/** Reset the AI-availability cache (e.g. after the user configured the
 *  AI service — the settings screen calls this when re-testing). */
export function resetAiAvailabilityCache(): void {
  aiAvailableCache = null;
}
