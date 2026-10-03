import { NextRequest, NextResponse } from 'next/server';
import { isLocalRequest } from '@/app/api/lib/is-local-request';
import { canonicalizeGenre } from '@/lib/parsers/meta-normalizer';
import { GENRES } from '@/lib/constants';

/**
 * Factual music metadata lookup (R6, reworked R47).
 *
 * Queries public music databases for genre/year facts instead of letting the
 * LLM guess them. Source chain per song (first hit wins per field):
 *
 *  1. iTunes/Apple Music (itunes.apple.com) — R47 PRIMARY source. Plain term
 *     search (no field operators) is extremely robust against "feat."
 *     artists, parentheticals and typos — the classic failure mode that kept
 *     the old Deezer-quoted-search match rate at ~5-10%. Returns
 *     primaryGenreName + releaseDate. No auth, no geo-block. Country=DE so
 *     German artists get proper "Schlager"/"Volksmusik" genres.
 *  2. Deezer (api.deezer.com) — album genres + release date. No auth, but
 *     403 in geo-blocked networks → fast-fail for 10 minutes.
 *  3. MusicBrainz (musicbrainz.org) — genre tags + the most trustworthy
 *     original-release year (release-group "first-release-date"). Requires
 *     a descriptive User-Agent and ~1 req/s throttling.
 *
 * Every source result passes a SHARED candidate gate: the artist must be
 * compatible (normalized containment — "Queen" ⊂ "Queen & Adam Lambert")
 * and the title must score high enough after normalization (remasters,
 * "(Radio Edit)" suffixes etc. tolerated). Genres map through the
 * 700-entry GENRE_ALIASES knowledge of the rule harmonizer
 * (meta-normalizer.ts) — single source of truth for both pipelines.
 */

// ── Types ────────────────────────────────────────────────────────────────

interface LookupSong {
  id: string;
  title: string;
  artist: string;
  genre?: string | null;
  language?: string | null;
  year?: number | null;
}

interface LookupRequest {
  songs: LookupSong[];
}

export type LookupSource = 'itunes' | 'deezer' | 'musicbrainz';

export interface LookupResult {
  songId: string;
  genre?: string;
  genreConfidence?: number;
  year?: number;
  yearConfidence?: number;
  source: LookupSource;
  matchedTitle?: string;
  matchedArtist?: string;
}

interface LookupResponse {
  success: boolean;
  results?: LookupResult[];
  error?: string;
  /** Human-readable summary for debugging (never shown to the user). */
  stats?: { itunes: number; deezer: number; musicbrainz: number; failed: number; skipped: number };
}

// ── Constants ────────────────────────────────────────────────────────────

/** Hard cap per request — keeps response time bounded. */
const MAX_SONGS_PER_REQUEST = 15;

const ITUNES_SEARCH_URL = 'https://itunes.apple.com/search';
const DEEZER_SEARCH_URL = 'https://api.deezer.com/search';
const DEEZER_ALBUM_URL = 'https://api.deezer.com/album';
const MUSICBRAINZ_URL = 'https://musicbrainz.org/ws/2/recording';
const USER_AGENT = 'KaraokeZERO/1.0 (https://github.com/marco4192-ui/karaoke-successor)';

const FETCH_TIMEOUT_MS = 8000;
/** MusicBrainz asks anonymous clients for max ~1 request/second. */
const MB_THROTTLE_MS = 1100;
/** Minimum MusicBrainz search score (0-100) for a candidate to be considered.
 *  R47: lowered from 85 to 70 — the strict title/artist gate provides the
 *  real safety, high scores often reject well-matching candidates. */
const MB_MIN_SCORE = 70;

/** Source genre/year confidences (aligned with the pre-R47 values). */
const GENRE_CONFIDENCE: Record<LookupSource, number> = { itunes: 90, deezer: 92, musicbrainz: 85 };
const YEAR_CONFIDENCE: Record<LookupSource, number> = { itunes: 88, deezer: 90, musicbrainz: 88 };

/**
 * Deezer genre names (some localized French) → our canonical genres
 * (aligned with src/lib/constants.ts GENRES list). Source-specific
 * spellings; everything else goes through canonicalizeGenre (see mapGenre).
 */
const GENRE_MAP: Record<string, string> = {
  'variété française': 'Pop',
  'variete francaise': 'Pop',
  'chanson française': 'Pop',
  'alternatif': 'Rock',
  'rap/hip hop': 'Rap',
  'rap/hip-hop': 'Rap',
  'hip hop/rap': 'Rap',
  'soul & funk': 'Soul',
  'musique classique': 'Classical',
  'classique': 'Classical',
  'opéra': 'Classical',
  'raggae': 'Reggae',
  'latino': 'Latin',
  'latin music': 'Latin',
  'bossa nova': 'Latin',
  'samba': 'Latin',
  'anime': 'Soundtrack',
  'films/games': 'Soundtrack',
  'bande originale': 'Soundtrack',
  'original soundtrack': 'Soundtrack',
  'soundtracks': 'Soundtrack',
  'musique du monde': 'Folk',
  'musiques du monde': 'Folk',
  'african music': 'Folk',
  'musique africaine': 'Folk',
  'christian music': 'Soul',
  'christian & gospel': 'Soul',
  'christmas': 'Soundtrack',
  'kids/family': "Children's",
  'children music': "Children's",
  'enfants': "Children's",
};

/**
 * MusicBrainz tag names → canonical genres for statistically common tags
 * that the alias map doesn't cover with the exact same spelling.
 */
const TAG_MAP: Record<string, string> = {
  'pop rock': 'Pop',
  'dance-pop': 'Pop',
  'soft rock': 'Pop',
  'new wave': 'Pop',
  'country rock': 'Country',
  'j-pop': 'J-Pop',
  'j-rock': 'J-Pop',
  'video game music': 'Soundtrack',
  'film score': 'Soundtrack',
  'rnb': 'R&B',
  'k-pop boy group': 'K-Pop',
  'k-pop girl group': 'K-Pop',
  'musik': 'Schlager',
};

const CANONICAL_GENRE_SET = new Set<string>(GENRES);

/** Normalize a raw genre/tag string to our canonical form: explicit
 *  source-specific maps first, then the full GENRE_ALIASES knowledge of the
 *  rule harmonizer (R47: single source of truth — new aliases added there
 *  automatically improve the factual lookup too). */
function mapGenre(raw: string): string | undefined {
  const key = raw.trim().toLowerCase();
  if (!key) return undefined;
  const direct = GENRE_MAP[key] ?? TAG_MAP[key];
  if (direct) return direct;
  const canonical = canonicalizeGenre(raw, []);
  if (CANONICAL_GENRE_SET.has(canonical)) return canonical;
  return undefined;
}

// ── Shared query cleaning + candidate matching (R47) ─────────────────────

/**
 * Strip search-hostile decorations from an UltraStar title:
 * parentheticals/brackets ("(Radio Edit)", "[Live]") and trailing
 * "feat./ft./featuring …" parts. Keeps apostrophes — sources match them.
 */
function cleanTitle(raw: string): string {
  return raw
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/\s+(?:-\s+)?(?:feat|ft|featuring|with)\.?\s+.*$/i, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Strip trailing "feat./ft./featuring …" from an artist. Collaboration
 *  partners after "&" stay — they help matching ("Elton John & Dua Lipa"). */
function cleanArtist(raw: string): string {
  return raw
    .replace(/\s+(?:feat|ft|featuring)\.?\s+.*$/i, '')
    .replace(/"/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Case/diacritic/punctuation-insensitive text form for comparisons.
 *  Apostrophes are REMOVED (not spaced) so "Don't" ≡ "Dont" — UltraStar
 *  libraries are full of missing-apostrophe typos. */
function normText(s: string): string {
  return s
    .toLowerCase()
    .replace(/['\u2018\u2019´`]/g, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * Title similarity score. 2 = exact after normalization (parentheticals
 * stripped from the candidate first), 1 = prefix relation (candidate is the
 * wanted title plus a suffix like "- Remastered 2011"), 0 = no match.
 */
function scoreTitle(candidateTitle: string, wantedTitle: string): number {
  const wanted = normText(wantedTitle);
  if (!wanted) return 0;
  const bare = normText(candidateTitle.replace(/\([^)]*\)/g, ' '));
  const full = normText(candidateTitle);
  if (!bare && !full) return 0;
  if (bare === wanted || full === wanted) return 2;
  if ((bare && (bare.startsWith(wanted) || wanted.startsWith(bare))) ||
      (full && (full.startsWith(wanted) || wanted.startsWith(full)))) return 1;
  return 0;
}

/**
 * Artist compatibility gate: normalized equality or containment in either
 * direction ("Queen" ⊂ "Queen & Adam Lambert", "The Beatles" ≈ "Beatles").
 * Containment instead of overlap avoids Michael↔Janet Jackson false hits.
 */
function artistCompatible(candidateArtist: string, wantedArtist: string): boolean {
  const a = normText(candidateArtist);
  const b = normText(wantedArtist);
  if (!a || !b) return false;
  if (a === b) return true;
  const stripThe = (s: string) => s.replace(/^the /, '');
  const a2 = stripThe(a);
  const b2 = stripThe(b);
  if (a2 === b2) return true;
  return a2.includes(b2) || b2.includes(a2);
}

interface TitleCandidate {
  title: string;
  artist: string;
}

/**
 * Pick the best candidate from search results: requires a compatible artist
 * and a scoring title; prefers exact title matches WITHOUT parenthetical
 * decorations (the original release instead of "(Live 2018)" versions —
 * their release dates would corrupt the year), then any exact, then prefix.
 * Stable: earlier (relevance-ranked) candidates win ties.
 */
function pickBestCandidate<T extends TitleCandidate>(candidates: T[], song: LookupSong): T | null {
  const wantedTitle = cleanTitle(song.title);
  const wantedArtist = cleanArtist(song.artist);
  if (!wantedTitle || !wantedArtist) return null;

  const eligible = candidates.filter(c =>
    c.title && c.artist && artistCompatible(c.artist, wantedArtist) && scoreTitle(c.title, wantedTitle) > 0,
  );
  if (eligible.length === 0) return null;

  const score = (c: T): number => {
    const s = scoreTitle(c.title, wantedTitle);
    const decorated = /[[(]/.test(c.title) || /\b(live|remaster|remix|edit|version|mix)\b/i.test(c.title);
    return s * 2 + (decorated ? 0 : 1); // 5 best, 4 exact-decorated, 2/3 prefix
  };

  let best = eligible[0];
  let bestScore = score(best);
  for (const c of eligible) {
    const s = score(c);
    if (s > bestScore) { best = c; bestScore = s; }
  }
  return best;
}

/** fetch with timeout + JSON parsing. */
async function fetchJson<T>(url: string, headers?: Record<string, string>): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json', ...headers },
      cache: 'no-store',
    });
    if (!res.ok) {
      throw Object.assign(new Error(`HTTP ${res.status}`), { status: res.status });
    }
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function parseYear(raw: string | undefined): number | undefined {
  if (!raw || !/^\d{4}/.test(raw)) return undefined;
  const y = parseInt(raw.slice(0, 4), 10);
  if (y >= 1900 && y <= new Date().getFullYear() + 1) return y;
  return undefined;
}

/** Result of a single-source lookup attempt. */
interface SourceHit {
  genre?: string;
  year?: number;
  /** True when the year came from a MusicBrainz release-group — the most
   *  trustworthy original-release signal (wins over iTunes/Deezer years). */
  yearFromReleaseGroup?: boolean;
  matchedTitle?: string;
  matchedArtist?: string;
}

// ── iTunes / Apple Music (R47 primary source) ────────────────────────────

interface ItunesTrack {
  trackName?: string;
  artistName?: string;
  primaryGenreName?: string;
  releaseDate?: string;
}

interface ItunesSearchResponse { resultCount?: number; results?: ItunesTrack[] }

let itunesDownUntil = 0;
function isItunesDown(): boolean { return Date.now() < itunesDownUntil; }
function markItunesDown(): void { itunesDownUntil = Date.now() + 10 * 60 * 1000; }

async function lookupItunes(song: LookupSong): Promise<SourceHit | null> {
  if (isItunesDown()) return null;

  const artist = cleanArtist(song.artist);
  const title = cleanTitle(song.title);
  if (!artist || !title) return null;

  const term = `${artist} ${title}`;
  let search: ItunesSearchResponse;
  try {
    // country=DE: German storefront classifies Helene Fischer as "Schlager",
    // Heino as "Schlager", Rammstein as "Metal" — keeps German genres intact.
    search = await fetchJson<ItunesSearchResponse>(
      `${ITUNES_SEARCH_URL}?term=${encodeURIComponent(term)}&entity=song&limit=8&country=DE`,
    );
  } catch {
    markItunesDown(); // network-level failure — skip for 10 minutes
    return null;
  }

  const best = pickBestCandidate(
    (search.results ?? []).map(r => ({ title: r.trackName ?? '', artist: r.artistName ?? '', raw: r })),
    song,
  );
  if (!best) return null;

  const hit: SourceHit = {
    matchedTitle: best.title,
    matchedArtist: best.artist,
  };
  const genre = mapGenre(best.raw.primaryGenreName ?? '');
  if (genre) hit.genre = genre;
  const year = parseYear(best.raw.releaseDate);
  if (year) hit.year = year;
  return hit.genre || hit.year ? hit : null;
}

// ── Deezer (secondary source — album genres) ─────────────────────────────

interface DeezerSearchTrack {
  id: number;
  title: string;
  artist: { name: string };
  album: { id: number; title: string; cover_big?: string };
}

interface DeezerSearchResponse { data?: DeezerSearchTrack[] }

interface DeezerAlbumResponse {
  genres?: { data?: Array<{ name: string }> };
  release_date?: string;
}

let deezerDownUntil = 0;
function isDeezerDown(): boolean { return Date.now() < deezerDownUntil; }
function markDeezerDown(): void { deezerDownUntil = Date.now() + 10 * 60 * 1000; }

async function deezerSearch(query: string, limit: number): Promise<DeezerSearchTrack[]> {
  const search = await fetchJson<DeezerSearchResponse>(
    `${DEEZER_SEARCH_URL}?q=${encodeURIComponent(query)}&limit=${limit}`,
  );
  return search.data ?? [];
}

async function lookupDeezer(song: LookupSong): Promise<SourceHit | null> {
  if (isDeezerDown()) return null;

  const artist = cleanArtist(song.artist);
  const title = cleanTitle(song.title);
  if (!artist || !title) return null;

  // 1. Field-quoted advanced search (precise, but fails on typos/feat.)
  let candidates: DeezerSearchTrack[] = [];
  try {
    candidates = await deezerSearch(`artist:"${artist}" track:"${title}"`, 5);
  } catch {
    markDeezerDown(); // 403 geo-block or network failure
    return null;
  }

  // 2. R47: plain fallback when the quoted search found nothing usable —
  //    this alone recovers most of the old miss rate.
  if (!candidates.some(t => scoreTitle(t.title, title) > 0)) {
    try {
      const plain = await deezerSearch(`${artist} ${title}`, 10);
      candidates = plain;
    } catch {
      markDeezerDown();
      return null;
    }
  }

  const best = pickBestCandidate(
    candidates.map(t => ({ title: t.title, artist: t.artist?.name ?? '', raw: t })),
    song,
  );
  if (!best) return null;

  const hit: SourceHit = {
    matchedTitle: best.title,
    matchedArtist: best.artist,
  };

  // Album details carry the genres
  try {
    const album = await fetchJson<DeezerAlbumResponse>(`${DEEZER_ALBUM_URL}/${best.raw.album.id}`);
    // R47: try ALL album genres — compilations list "Pop" first but some
    // albums only tag a specific second genre.
    for (const g of album.genres?.data ?? []) {
      const genre = g.name ? mapGenre(g.name) : undefined;
      if (genre) { hit.genre = genre; break; }
    }
    const year = parseYear(album.release_date);
    if (year) hit.year = year;
  } catch {
    // Album fetch failed — keep the partial hit (match info only)
  }

  return hit.genre || hit.year ? hit : null;
}

// ── MusicBrainz (last source — genre tags + authoritative year) ──────────

interface MbTag { name: string; count: number }
interface MbRecording {
  id: string;
  title: string;
  score?: number;
  'artist-credit'?: Array<{ name: string }>;
  tags?: MbTag[];
  genres?: MbTag[];
  'first-release-date'?: string;
}

interface MbRecordingSearchResponse { recordings?: MbRecording[] }

interface MbReleaseGroup {
  id: string;
  title: string;
  score?: number;
  'primary-type'?: string;
  'first-release-date'?: string;
  'artist-credit'?: Array<{ name: string }>;
  genres?: MbTag[];
}

interface MbReleaseGroupSearchResponse { 'release-groups'?: MbReleaseGroup[] }

let lastMbCall = 0;

/** Shared MusicBrainz throttle (~1 req/s, anonymous usage policy). */
async function mbFetch<T>(url: string, retries = 1): Promise<T | null> {
  const wait = lastMbCall + MB_THROTTLE_MS - Date.now();
  if (wait > 0) await sleep(wait);
  lastMbCall = Date.now();
  try {
    return await fetchJson<T>(url, { 'User-Agent': USER_AGENT });
  } catch (e) {
    // MusicBrainz signals rate limiting with 503 — the documented recovery
    // is to wait and retry once.
    const status = (e as { status?: number }).status;
    if (retries > 0 && status === 503) {
      await sleep(2000);
      return mbFetch<T>(url, retries - 1);
    }
    return null;
  }
}

async function lookupMusicBrainz(song: LookupSong, needYear: boolean, needGenre: boolean): Promise<SourceHit | null> {
  const artist = cleanArtist(song.artist);
  const title = cleanTitle(song.title);
  if (!artist || !title) return null;

  const hit: SourceHit = {};

  // 1. Recording search — genre tags + candidate years
  if (needGenre || needYear) {
    const query = `recording:"${title.replace(/"/g, '')}" AND artist:"${artist.replace(/"/g, '')}"`;
    const search = await mbFetch<MbRecordingSearchResponse>(
      `${MUSICBRAINZ_URL}?query=${encodeURIComponent(query)}&fmt=json&limit=5`,
    );
    if (search) {
      const candidates = (search.recordings ?? [])
        .filter(r => (r.score ?? 0) >= MB_MIN_SCORE && r.title && r['artist-credit']?.[0]?.name)
        .map(r => ({ title: r.title, artist: r['artist-credit']?.[0]?.name ?? '', raw: r }));
      const best = pickBestCandidate(candidates, song);

      if (best) {
        hit.matchedTitle ??= best.title;
        hit.matchedArtist ??= best.artist;

        // Genres (voted) take precedence over tags (raw)
        const rawGenre = best.raw.genres?.[0]?.name;
        let genre = rawGenre ? mapGenre(rawGenre) : undefined;
        if (!genre) {
          // Fall back to the most-voted tag that maps to a canonical genre
          const sortedTags = [...(best.raw.tags ?? [])].sort((a, b) => b.count - a.count);
          for (const tag of sortedTags) {
            const mapped = mapGenre(tag.name);
            if (mapped) { genre = mapped; break; }
          }
        }
        if (genre) hit.genre = genre;

        // Year from recordings: EARLIEST across all matched candidates — a
        // single matched recording is often a remaster.
        if (needYear) {
          const years = candidates
            .filter(c => scoreTitle(c.title, title) === 2)
            .map(c => parseYear(c.raw['first-release-date']))
            .filter((y): y is number => y !== undefined);
          if (years.length > 0) hit.year = Math.min(...years);
        }
      }
    }
  }

  // 2. Release-group search — the original song release (single/album)
  //    carries the most trustworthy "first-release-date".
  if (needYear) {
    const rgQuery = `releasegroup:"${title.replace(/"/g, '')}" AND artist:"${artist.replace(/"/g, '')}"`;
    const rgSearch = await mbFetch<MbReleaseGroupSearchResponse>(
      `${MUSICBRAINZ_URL.replace('/recording', '/release-group')}?query=${encodeURIComponent(rgQuery)}&fmt=json&limit=5`,
    );
    if (rgSearch) {
      const candidates = (rgSearch['release-groups'] ?? [])
        .filter(rg => (rg.score ?? 0) >= MB_MIN_SCORE && rg.title && rg['artist-credit']?.[0]?.name)
        .map(rg => ({ title: rg.title, artist: rg['artist-credit']?.[0]?.name ?? '', raw: rg }));
      const eligible = candidates.filter(c =>
        artistCompatible(c.artist, artist) && scoreTitle(c.title, title) > 0,
      );
      // Prefer Single → Album → other types (original song release)
      const preferred =
        eligible.find(c => c.raw['primary-type'] === 'Single') ??
        eligible.find(c => c.raw['primary-type'] === 'Album') ??
        eligible[0];
      const rgYear = parseYear(preferred?.raw['first-release-date']);
      if (rgYear !== undefined) {
        hit.year = hit.year !== undefined ? Math.min(hit.year, rgYear) : rgYear;
        hit.yearFromReleaseGroup = true;
      }

      // R47 last resort: release-group genres (via lookup — the search
      // endpoint doesn't include them). Only when the recording search
      // found nothing — costs one extra throttled request.
      if (needGenre && !hit.genre && preferred) {
        const rgDetail = await mbFetch<MbReleaseGroup>(
          `https://musicbrainz.org/ws/2/release-group/${preferred.raw.id}?inc=genres&fmt=json`,
        );
        const rgGenreName = rgDetail?.genres?.[0]?.name;
        if (rgGenreName) {
          const genre = mapGenre(rgGenreName);
          if (genre) hit.genre = genre;
        }
      }
    }
  }

  if (!hit.matchedTitle && !hit.genre && !hit.year) return null;
  return hit.genre || hit.year ? hit : null;
}

// ── POST handler ─────────────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse<LookupResponse>> {
  if (!isLocalRequest(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const body = await request.json() as LookupRequest;
    if (!body?.songs || !Array.isArray(body.songs) || body.songs.length === 0) {
      return NextResponse.json({ success: false, error: 'No songs provided' }, { status: 400 });
    }

    const songs = body.songs.slice(0, MAX_SONGS_PER_REQUEST);
    const results: LookupResult[] = [];
    let itunesHits = 0;
    let deezerHits = 0;
    let mbHits = 0;
    let failed = 0;
    let skipped = 0;

    for (const song of songs) {
      if (!song?.id || !song.title || !song.artist) { skipped++; continue; }

      // Only look up what's actually missing — factual data fills gaps,
      // the LLM handles normalization of existing values.
      const needsGenre = !song.genre;
      const needsYear = !song.year;
      if (!needsGenre && !needsYear) { skipped++; continue; }

      // Per-field merge state across the source chain
      let genre: string | undefined;
      let year: number | undefined;
      let genreSource: LookupSource | undefined;
      let yearSource: LookupSource | undefined;
      let matchedTitle: string | undefined;
      let matchedArtist: string | undefined;

      const applyHit = (hit: SourceHit, source: LookupSource, preferYear: boolean): void => {
        if (!genre && hit.genre) { genre = hit.genre; genreSource = source; }
        if (hit.year && (!year || (preferYear && hit.yearFromReleaseGroup))) {
          year = hit.year;
          yearSource = source;
        }
        matchedTitle ??= hit.matchedTitle;
        matchedArtist ??= hit.matchedArtist;
      };

      // 1. iTunes — best coverage incl. popular titles, 1 fast request
      const itunesHit = await lookupItunes(song);
      if (itunesHit) applyHit(itunesHit, 'itunes', false);

      // 2. Deezer — album genres when iTunes found none
      if (needsGenre && !genre) {
        const deezerHit = await lookupDeezer(song);
        if (deezerHit) applyHit(deezerHit, 'deezer', false);
      }

      // 3. MusicBrainz — genre tags + authoritative original-release year.
      //    Runs when genre OR year is still missing; its release-group year
      //    OVERRIDES iTunes/Deezer years (original release vs. remaster).
      const stillNeedsGenre = needsGenre && !genre;
      const stillNeedsYear = needsYear && !year;
      if (stillNeedsGenre || stillNeedsYear) {
        const mbHit = await lookupMusicBrainz(song, stillNeedsYear, stillNeedsGenre);
        if (mbHit) applyHit(mbHit, 'musicbrainz', true);
      }

      if (!genre && !year) { failed++; continue; }

      // The badge source describes the GENRE suggestion; year-only rows
      // carry the year source (also used in the reason line).
      const source = genreSource ?? yearSource ?? 'itunes';
      const entry: LookupResult = { songId: song.id, source };
      if (genre && needsGenre) {
        entry.genre = genre;
        entry.genreConfidence = GENRE_CONFIDENCE[source] ?? 85;
      }
      if (year && needsYear) {
        entry.year = year;
        entry.yearConfidence = YEAR_CONFIDENCE[yearSource ?? source] ?? 88;
      }
      if (matchedTitle) entry.matchedTitle = matchedTitle;
      if (matchedArtist) entry.matchedArtist = matchedArtist;

      if (entry.genre || entry.year) {
        results.push(entry);
        if (source === 'itunes') itunesHits++;
        else if (source === 'deezer') deezerHits++;
        else mbHits++;
      } else {
        skipped++;
      }
    }

    return NextResponse.json({
      success: true,
      results,
      stats: { itunes: itunesHits, deezer: deezerHits, musicbrainz: mbHits, failed, skipped },
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[MusicLookup] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
