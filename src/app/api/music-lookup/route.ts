import { NextRequest, NextResponse } from 'next/server';
import { isLocalRequest } from '@/app/api/lib/is-local-request';

/**
 * Factual music metadata lookup (R6).
 *
 * Queries public music databases for genre/year facts instead of letting the
 * LLM guess them:
 *  1. Deezer   (api.deezer.com)      — album genres + release date. No auth.
 *  2. MusicBrainz (musicbrainz.org)  — genre tags + first-release-date.
 *     Requires a descriptive User-Agent and ~1 req/s throttling.
 *
 * In environments where Deezer is unreachable (e.g. geo-blocked datacenters,
 * 403) the route fast-fails and continues with MusicBrainz only — the caller
 * never sees an error, just fewer/absent factual results. The LLM harmonize
 * step remains the fallback for everything this route can't resolve.
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

export interface LookupResult {
  songId: string;
  genre?: string;
  genreConfidence?: number;
  year?: number;
  yearConfidence?: number;
  source: 'deezer' | 'musicbrainz';
  matchedTitle?: string;
  matchedArtist?: string;
}

interface LookupResponse {
  success: boolean;
  results?: LookupResult[];
  error?: string;
  /** Human-readable summary for debugging (never shown to the user). */
  stats?: { deezer: number; musicbrainz: number; failed: number; skipped: number };
}

// ── Constants ────────────────────────────────────────────────────────────

/** Hard cap per request — keeps response time bounded. */
const MAX_SONGS_PER_REQUEST = 15;

const DEEZER_SEARCH_URL = 'https://api.deezer.com/search';
const DEEZER_ALBUM_URL = 'https://api.deezer.com/album';
const MUSICBRAINZ_URL = 'https://musicbrainz.org/ws/2/recording';
const USER_AGENT = 'KaraokeZERO/1.0 (https://github.com/marco4192-ui/karaoke-successor)';

const FETCH_TIMEOUT_MS = 8000;
/** MusicBrainz asks anonymous clients for max ~1 request/second. */
const MB_THROTTLE_MS = 1100;

/**
 * Deezer genre names (some localized French) → our canonical genres
 * (aligned with src/lib/constants.ts GENRES list).
 */
const GENRE_MAP: Record<string, string> = {
  'pop': 'Pop',
  'variété française': 'Pop',
  'variete francaise': 'Pop',
  'chanson': 'Singer-Songwriter',
  'chanson française': 'Pop',
  'rock': 'Rock',
  'alternative': 'Rock',
  'alternatif': 'Rock',
  'punk': 'Punk',
  'metal': 'Metal',
  'rap/hip hop': 'Hip-Hop',
  'rap/hip-hop': 'Hip-Hop',
  'hip hop/rap': 'Hip-Hop',
  'hip-hop': 'Hip-Hop',
  'r&b': 'R&B',
  'contemporary r&b': 'R&B',
  'soul & funk': 'Soul',
  'soul': 'Soul',
  'funk': 'Funk',
  'disco': 'Pop',
  'dance': 'Dance',
  'electro': 'Electronic',
  'electronic': 'Electronic',
  'techno': 'Electronic',
  'house': 'Electronic',
  'trance': 'Electronic',
  'dubstep': 'Electronic',
  'drum and bass': 'Electronic',
  'folk': 'Folk',
  'country': 'Country',
  'bluegrass': 'Folk',
  'jazz': 'Jazz',
  'blues': 'Blues',
  'classical': 'Classical',
  'musique classique': 'Classical',
  'classique': 'Classical',
  'reggae': 'Reggae',
  'dancehall': 'Reggae',
  'raggae': 'Reggae',
  'latin': 'Latin',
  'latino': 'Latin',
  'latin music': 'Latin',
  'reggaeton': 'Latin',
  'bossa nova': 'Latin',
  'samba': 'Latin',
  'k-pop': 'K-Pop',
  'kpop': 'K-Pop',
  'j-pop': 'J-Pop',
  'jpop': 'J-Pop',
  'anime': 'Soundtrack',
  'films/games': 'Soundtrack',
  'bande originale': 'Soundtrack',
  'soundtrack': 'Soundtrack',
  'original soundtrack': 'Soundtrack',
  'musicals': 'Musical',
  'musique du monde': 'Folk',
  'musiques du monde': 'Folk',
  'world': 'Folk',
  'world music': 'Folk',
  'african music': 'Folk',
  'musique africaine': 'Folk',
  'christian music': 'Gospel',
  'gospel': 'Gospel',
  'christian & gospel': 'Gospel',
  'christmas': 'Christmas',
  'kids/family': "Children's",
  'children music': "Children's",
  'enfants': "Children's",
  'opéra': 'Opera',
  'opera': 'Opera',
};

/**
 * MusicBrainz tag names → canonical genres. MB tags are free-form;
 * these are the statistically most common ones.
 */
const TAG_MAP: Record<string, string> = {
  'pop': 'Pop',
  'pop rock': 'Pop',
  'synthpop': 'Pop',
  'synth-pop': 'Pop',
  'electropop': 'Pop',
  'dance-pop': 'Pop',
  'europop': 'Pop',
  'soft rock': 'Pop',
  'rock': 'Rock',
  'classic rock': 'Rock',
  'hard rock': 'Rock',
  'alternative rock': 'Rock',
  'progressive rock': 'Rock',
  'punk rock': 'Punk',
  'punk': 'Punk',
  'post-punk': 'Punk',
  'emo': 'Punk',
  'metal': 'Metal',
  'heavy metal': 'Metal',
  'thrash metal': 'Metal',
  'death metal': 'Metal',
  'power metal': 'Metal',
  'hip hop': 'Hip-Hop',
  'hip-hop': 'Hip-Hop',
  'rap': 'Hip-Hop',
  'trap': 'Hip-Hop',
  'rhythm and blues': 'R&B',
  'r&b': 'R&B',
  'rnb': 'R&B',
  'soul': 'Soul',
  'neo soul': 'Soul',
  'funk': 'Funk',
  'disco': 'Pop',
  'dance': 'Dance',
  'electronic': 'Electronic',
  'electro': 'Electronic',
  'electronica': 'Electronic',
  'techno': 'Electronic',
  'house': 'Electronic',
  'trance': 'Electronic',
  'dubstep': 'Electronic',
  'drum and bass': 'Electronic',
  'ambient': 'Electronic',
  'new wave': 'Pop',
  'folk': 'Folk',
  'folk rock': 'Folk',
  'indie folk': 'Folk',
  'americana': 'Folk',
  'country': 'Country',
  'country rock': 'Country',
  'bluegrass': 'Folk',
  'jazz': 'Jazz',
  'vocal jazz': 'Jazz',
  'smooth jazz': 'Jazz',
  'bebop': 'Jazz',
  'swing': 'Swing',
  'blues': 'Blues',
  'classical': 'Classical',
  'opera': 'Opera',
  'reggae': 'Reggae',
  'roots reggae': 'Reggae',
  'dancehall': 'Reggae',
  'latin': 'Latin',
  'latin pop': 'Latin',
  'salsa': 'Latin',
  'bossa nova': 'Latin',
  'cumbia': 'Latin',
  'reggaeton': 'Latin',
  'k-pop': 'K-Pop',
  'k-pop boy group': 'K-Pop',
  'k-pop girl group': 'K-Pop',
  'j-pop': 'J-Pop',
  'j-rock': 'J-Pop',
  'jpop': 'J-Pop',
  'anime': 'Soundtrack',
  'soundtrack': 'Soundtrack',
  'film score': 'Soundtrack',
  'video game music': 'Soundtrack',
  'musical': 'Musical',
  'christmas': 'Christmas',
  'gospel': 'Gospel',
  'schlager': 'Schlager',
  'volksmusik': 'Volksmusik',
  'musik': 'Schlager',
  'chanson': 'Singer-Songwriter',
  'singer-songwriter': 'Singer-Songwriter',
};

// ── Helpers ──────────────────────────────────────────────────────────────

/** Normalize a raw genre/tag string to our canonical form. */
function mapGenre(raw: string): string | undefined {
  const key = raw.trim().toLowerCase();
  if (!key) return undefined;
  return GENRE_MAP[key] ?? TAG_MAP[key];
}

/** Case/diacritic-insensitive title similarity gate. */
function titleMatches(a: string, b: string): boolean {
  const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  const na = norm(a);
  const nb = norm(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  // One is a prefix of the other (e.g. "Bohemian Rhapsody" vs
  // "Bohemian Rhapsody - Remastered 2011")
  if (na.startsWith(nb) || nb.startsWith(na)) return true;
  return false;
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

// ── Deezer ───────────────────────────────────────────────────────────────

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

/** Result of a single-source lookup attempt. */
interface SourceHit {
  genre?: string;
  year?: number;
  matchedTitle?: string;
  matchedArtist?: string;
}

let deezerDownUntil = 0;
/** After a network-level failure, skip Deezer for 10 minutes (fast-fail). */
function isDeezerDown(): boolean {
  return Date.now() < deezerDownUntil;
}
function markDeezerDown(): void {
  deezerDownUntil = Date.now() + 10 * 60 * 1000;
}

async function lookupDeezer(song: LookupSong): Promise<SourceHit | null> {
  if (isDeezerDown()) return null;

  const query = `artist:"${song.artist}" track:"${song.title}"`;
  let search: DeezerSearchResponse;
  try {
    search = await fetchJson<DeezerSearchResponse>(
      `${DEEZER_SEARCH_URL}?q=${encodeURIComponent(query)}&limit=5`,
    );
  } catch {
    // 403 (geo-block) or network failure — disable for a while
    markDeezerDown();
    return null;
  }

  const candidates = search.data ?? [];
  const best = candidates.find(t => titleMatches(t.title, song.title));
  if (!best) return null;

  const hit: SourceHit = {
    matchedTitle: best.title,
    matchedArtist: best.artist?.name,
  };

  // Second call: album details carry the genres
  try {
    const album = await fetchJson<DeezerAlbumResponse>(`${DEEZER_ALBUM_URL}/${best.album.id}`);
    const rawGenre = album.genres?.data?.[0]?.name;
    const genre = rawGenre ? mapGenre(rawGenre) : undefined;
    if (genre) hit.genre = genre;

    const rd = album.release_date;
    if (rd && /^\d{4}/.test(rd)) {
      const y = parseInt(rd.slice(0, 4), 10);
      if (y >= 1900 && y <= new Date().getFullYear() + 1) hit.year = y;
    }
  } catch {
    // Album fetch failed — keep the partial hit (match info only)
  }

  return hit.genre || hit.year ? hit : null;
}

// ── MusicBrainz ──────────────────────────────────────────────────────────

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

function parseYear(raw: string | undefined): number | undefined {
  if (!raw || !/^\d{4}/.test(raw)) return undefined;
  const y = parseInt(raw.slice(0, 4), 10);
  if (y >= 1900 && y <= new Date().getFullYear() + 1) return y;
  return undefined;
}

async function lookupMusicBrainz(song: LookupSong, needYear: boolean): Promise<SourceHit | null> {
  // 1. Recording search — genre tags + candidate years
  const query = `recording:"${song.title}" AND artist:"${song.artist}"`;
  const search = await mbFetch<MbRecordingSearchResponse>(
    `${MUSICBRAINZ_URL}?query=${encodeURIComponent(query)}&fmt=json&limit=5`,
  );
  if (!search) return null;

  const candidates = (search.recordings ?? []).filter(r => (r.score ?? 0) >= 85);
  const titleMatchesList = candidates.filter(r => titleMatches(r.title, song.title));
  const best = titleMatchesList[0]
    ?? candidates.find(r => r.genres?.length || r.tags?.length);
  if (!best) return null;

  const hit: SourceHit = {
    matchedTitle: best.title,
    matchedArtist: best['artist-credit']?.[0]?.name,
  };

  // Genres (voted) take precedence over tags (raw)
  const rawGenre = best.genres?.[0]?.name;
  let genre = rawGenre ? mapGenre(rawGenre) : undefined;
  if (!genre) {
    // Fall back to the most-voted tag that maps to a canonical genre
    const sortedTags = [...(best.tags ?? [])].sort((a, b) => b.count - a.count);
    for (const tag of sortedTags) {
      const mapped = mapGenre(tag.name);
      if (mapped) { genre = mapped; break; }
    }
  }
  if (genre) hit.genre = genre;

  // Year from the recording: EARLIEST across all matched candidates — a
  // single matched recording is often a remaster whose first-release-date
  // is much later than the original song.
  if (needYear) {
    const years = titleMatchesList
      .map(r => parseYear(r['first-release-date']))
      .filter((y): y is number => y !== undefined);
    if (years.length > 0) hit.year = Math.min(...years);
  }

  // 2. Release-group search — the original song release (single/album)
  //    carries the most trustworthy "first-release-date".
  if (needYear) {
    const rgQuery = `releasegroup:"${song.title}" AND artist:"${song.artist}"`;
    const rgSearch = await mbFetch<MbReleaseGroupSearchResponse>(
      `${MUSICBRAINZ_URL.replace('/recording', '/release-group')}?query=${encodeURIComponent(rgQuery)}&fmt=json&limit=5`,
    );
    if (rgSearch) {
      const rgs = (rgSearch['release-groups'] ?? []).filter(rg =>
        (rg.score ?? 0) >= 80 && titleMatches(rg.title, song.title),
      );
      // Prefer Single → Album → other types (original song release)
      const preferred =
        rgs.find(rg => rg['primary-type'] === 'Single')
        ?? rgs.find(rg => rg['primary-type'] === 'Album')
        ?? rgs[0];
      const rgYear = parseYear(preferred?.['first-release-date']);
      if (rgYear !== undefined) {
        // The release-group date wins (original release), recording date as tiebreak
        hit.year = hit.year !== undefined ? Math.min(hit.year, rgYear) : rgYear;
      }
    }
  }

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

      let hit: SourceHit | null = null;
      let source: 'deezer' | 'musicbrainz' = 'deezer';

      // Deezer first (fast, good album genres)
      const deezHit = needsGenre ? await lookupDeezer(song) : null;
      if (deezHit) {
        hit = deezHit;
        source = 'deezer';
      } else {
        const mbHit = await lookupMusicBrainz(song, needsYear);
        if (mbHit) {
          hit = mbHit;
          source = 'musicbrainz';
        }
      }

      if (!hit) { failed++; continue; }

      const entry: LookupResult = { songId: song.id, source };
      if (hit.genre && needsGenre) {
        entry.genre = hit.genre;
        entry.genreConfidence = source === 'deezer' ? 92 : 85;
      }
      if (hit.year && needsYear) {
        entry.year = hit.year;
        entry.yearConfidence = source === 'deezer' ? 90 : 88;
      }
      if (hit.matchedTitle) entry.matchedTitle = hit.matchedTitle;
      if (hit.matchedArtist) entry.matchedArtist = hit.matchedArtist;

      if (entry.genre || entry.year) {
        results.push(entry);
        if (source === 'deezer') deezerHits++; else mbHits++;
      } else {
        skipped++;
      }
    }

    return NextResponse.json({
      success: true,
      results,
      stats: { deezer: deezerHits, musicbrainz: mbHits, failed, skipped },
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
