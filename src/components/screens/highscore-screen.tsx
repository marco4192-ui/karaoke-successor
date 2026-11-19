'use client';

/**
 * R81 — Highscores, rebuilt as SONG-based boards.
 *
 * Both tabs list SONGS (rows = library songs; only songs that exist in the
 * local library are eligible — the board can never be inflated with fake
 * song entries). Each row shows the BEST score achieved on that song:
 *
 *  • Local  — best of the local highscores. Party game modes are excluded
 *             (they produce no highscores; older stored entries may still
 *             contain them), difficulty chip + theme-party filtered.
 *  • Global — best online entry across the song's solo ('s') AND duet ('d')
 *             boards (fetchBatchScores, ≤200 hashes per call), plus a
 *             Solo/Duo tag showing which board the best came from.
 *
 * Shared controls on both tabs: difficulty chips [All|Easy|Normal|Hard]
 * (API naming — the internal 'medium' displays as 'normal') and ONE search
 * box matching song title, artist or ANY player name on that song's board.
 * Clicking a row opens the SongHighscoreModal drill-down.
 *
 * Removed with the rebuild: time windows, sorts, total-players, own-rank
 * banner, no-rounds banner, BR chips, All/My-scores filter, the
 * ranking-titles card and the per-row rival toggle (the rival BAR stays —
 * now on both tabs; the toggle moves into the song modal).
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Angry } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useGameStore } from '@/lib/game/store';
import { useTranslation } from '@/lib/i18n/translations';
import { TrophyIcon, MusicIcon } from '@/components/icons';
import type { Song, HighscoreEntry, Difficulty } from '@/types/game';
import { CountryFlagImage } from '@/components/screens/character/country-picker';
import type { OnlineScoreEntry, BatchScoresResponse } from '@/lib/leaderboard/types';
import type { RivalEntry } from '@/lib/leaderboard/rivals';
import { getAllSongs, filterSongsByMotto } from '@/lib/game/song-library';
import { songHashFromSong } from '@/lib/leaderboard/song-fingerprint';
import { isPartyGameMode } from '@/lib/game/party-modes';
import { useMottoParty } from '@/hooks/use-motto-party';
import type { MottoPartyConfig } from '@/lib/game/motto-party';
import { SongHighscoreModal } from '@/components/results/song-highscore-modal';
import { RivalCompareDialog } from './rival-compare-dialog';

// ── Constants & helpers ──────────────────────────────────

/** Difficulty chips — API naming ('normal'; the internal 'medium' maps to it). */
const BOARD_DIFFICULTIES = ['all', 'easy', 'normal', 'hard'] as const;
type BoardDifficulty = (typeof BOARD_DIFFICULTIES)[number];

/** fetchBatchScores accepts at most 200 hashes per call — chunk the library. */
const BATCH_HASH_CHUNK_SIZE = 200;
/** Entries requested per song hash (server dedupes per player). */
const BATCH_SCORE_LIMIT = 2000;
/** Display cap for both boards. */
const MAX_ROWS = 100;

/** Map the internal difficulty ('easy'|'medium'|'hard') to the API/board
 *  naming ('easy'|'normal'|'hard') used by the chips and badges. */
function apiDifficulty(d: Difficulty): 'easy' | 'normal' | 'hard' {
  return d === 'easy' ? 'easy' : d === 'hard' ? 'hard' : 'normal';
}

function chunk<T>(items: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

// ── Row shapes ───────────────────────────────────────────

/** One LOCAL board row: a library song + its best (filtered) local entry. */
interface LocalSongRow {
  kind: 'local';
  song: Song;
  best: HighscoreEntry;
  /** API naming of the best entry's difficulty ('medium' → 'normal'). */
  difficulty: 'easy' | 'normal' | 'hard';
  /** Every player name on this song's (filtered) entries — search matching. */
  playerNames: string[];
}

/** One GLOBAL board row: a library song + its best online entry. */
interface GlobalSongRow {
  kind: 'global';
  song: Song;
  best: OnlineScoreEntry;
  /** Which online board the best entry came from ('d' = duet board). */
  gameType: 's' | 'd';
  /** Every player name on this song's (filtered) boards — search matching. */
  playerNames: string[];
}

type SongBoardRowData = LocalSongRow | GlobalSongRow;

// ── Small display helpers ────────────────────────────────

/**
 * Leaderboard flag: rendered as a crisp flagcdn image (CountryFlagImage)
 * instead of an emoji — Windows has no flag glyphs in its fonts.
 * Keeps the title tooltip and the show/null-code handling intact.
 */
function CountryFlag({ code, show }: { code: string | null | undefined; show: boolean }) {
  if (!code || !show) return null;
  return (
    <span className="inline-flex items-center ml-1" title={code}>
      <CountryFlagImage code={code} className="h-3.5 w-5" />
    </span>
  );
}

function VerifiedBadge({ verified }: { verified: boolean }) {
  if (!verified) return null;
  return (
    <span className="inline-flex items-center gap-0.5 text-[10px] text-green-400 bg-green-500/15 border border-green-500/30 rounded-full px-1.5 py-0.5" title="Verified">
      ✓
    </span>
  );
}

// ── Cover thumbnail (R83/E) ──────────────────────────────

/**
 * Best-effort cover thumbnail for a board row. Uses the song's ready
 * coverImage URL when present; otherwise resolves one lazily from the
 * media sources (imported songs → media DB, Tauri folder songs → disk).
 * No retry ladder here (the library grid owns healing) — on any failure
 * the row simply shows the music-note placeholder.
 */
function CoverThumb({ song }: { song: Song }) {
  const [src, setSrc] = useState<string | null>(song.coverImage ?? null);
  const [broken, setBroken] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setBroken(false);
    const resolve = async () => {
      if (song.coverImage) { if (!cancelled) setSrc(song.coverImage); return; }
      try {
        if (song.storedMedia) {
          const { refreshSongMediaUrl } = await import('@/lib/db/media-db');
          const url = await refreshSongMediaUrl(song.id, 'cover');
          if (url && !cancelled) { setSrc(url); return; }
        }
        if (song.relativeCoverPath) {
          const { refreshTauriMediaUrl } = await import('@/lib/file-storage-media');
          const url = await refreshTauriMediaUrl(song.relativeCoverPath, song.baseFolder);
          if (url && !cancelled) setSrc(url);
        }
      } catch { /* no cover available — placeholder stays */ }
    };
    resolve();
    return () => { cancelled = true; };
  }, [song.id, song.coverImage, song.storedMedia, song.relativeCoverPath, song.baseFolder]);

  if (!src || broken) {
    return (
      <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-gradient-to-br from-purple-600/60 to-cyan-600/60 flex items-center justify-center shrink-0" aria-hidden>
        <MusicIcon className="w-5 h-5 text-white/50" />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt=""
      onError={() => setBroken(true)}
      className="w-10 h-10 md:w-12 md:h-12 rounded-lg object-cover shrink-0 border border-white/10"
      loading="lazy"
    />
  );
}

// ── Board row ────────────────────────────────────────────

/** One clickable song row — shared by the local and global boards. */
function SongBoardRow({
  row,
  rank,
  isOwn,
  onClick,
}: {
  row: SongBoardRowData;
  rank: number;
  /** "Own entry" highlight: the best holder is one of my local profiles. */
  isOwn: boolean;
  onClick: () => void;
}) {
  const { t } = useTranslation();
  const isOnline = row.kind === 'global';

  // Normalize BEFORE any callback — keeps the union narrowed.
  const playerName = isOnline ? (row.best.display_name || 'Unknown') : row.best.playerName;
  const playerColor = isOnline ? row.best.color : row.best.playerColor;
  const playerAvatar = isOnline ? undefined : row.best.playerAvatar;
  const difficulty = isOnline ? row.best.difficulty : row.difficulty;
  const accuracy = row.best.accuracy;
  const score = row.best.score;
  const maxCombo = isOnline ? null : row.best.maxCombo;
  const gameType = isOnline ? row.gameType : 's';
  const verified = isOnline && row.best.verified;
  const countryCode = isOnline ? row.best.country_code : null;

  return (
    <Card
      data-testid={`board-row-${rank}`}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      role="button"
      tabIndex={0}
      className={`bg-white/5 border-white/10 hover:bg-white/10 transition-colors cursor-pointer text-left w-full ${rank < 3 ? 'border-l-4' : ''} ${rank === 0 ? 'border-l-yellow-400' : rank === 1 ? 'border-l-gray-300' : rank === 2 ? 'border-l-orange-400' : ''} ${isOwn ? 'ring-1 ring-cyan-500/40 bg-cyan-500/5' : ''}`}
    >
      <CardContent className="p-3 md:p-4 flex items-center gap-3 md:gap-4">
        {/* Rank medal */}
        <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center font-bold text-lg md:text-xl flex-shrink-0 ${rank === 0 ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-black' : rank === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-400 text-black' : rank === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-600 text-black' : 'bg-white/10 text-white/60'}`}>
          {rank === 0 ? '👑' : rank === 1 ? '🥈' : rank === 2 ? '🥉' : `#${rank + 1}`}
        </div>

        {/* Song cover (R83/E — visual anchor next to title/artist) */}
        <CoverThumb song={row.song} />

        {/* Best entry's player */}
        <div
          className="w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center text-white font-bold overflow-hidden flex-shrink-0"
          style={{ backgroundColor: playerColor }}
          title={playerName}
        >
          {playerAvatar ? (
            <img src={playerAvatar} alt={playerName} className="w-full h-full object-cover" />
          ) : (
            (playerName?.[0] || '?').toUpperCase()
          )}
        </div>

        {/* Song */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <span className="font-semibold text-white truncate max-w-full">{row.song.title}</span>
            <Badge variant="outline" className={`text-xs shrink-0 ${difficulty === 'easy' ? 'border-green-500 text-green-400' : difficulty === 'normal' ? 'border-yellow-500 text-yellow-400' : 'border-red-500 text-red-400'}`}>
              {t(`songHighscoreModal.difficulty_${difficulty}`)}
            </Badge>
            {isOnline && (
              <Badge variant="outline" className={`text-[10px] shrink-0 ${gameType === 'd' ? 'border-purple-500/60 text-purple-300' : 'border-cyan-500/60 text-cyan-300'}`}>
                {gameType === 'd' ? t('highscoreScreen.duoTag') : t('highscoreScreen.soloTag')}
              </Badge>
            )}
            {isOwn && (
              <Badge variant="outline" className="text-[10px] border-cyan-500/50 text-cyan-400 shrink-0">
                {t('highscoreScreen.localHighlight')}
              </Badge>
            )}
            {isOnline && <CountryFlag code={countryCode} show={!!countryCode} />}
            {verified && <VerifiedBadge verified />}
          </div>
          <p className="text-sm text-white/60 truncate">{row.song.artist}</p>
          <p className="text-xs text-white/40 truncate">{playerName}</p>
        </div>

        {/* Headline: the song's best score */}
        <div className="text-right flex-shrink-0">
          <div className="text-xl md:text-2xl font-bold text-cyan-400" data-testid="entry-headline">
            {score.toLocaleString()}
          </div>
          <div className="text-xs text-white/40">{t('highscoreScreen.bestOf')}</div>
          <div className="text-sm text-white/60">{t('highscoreScreen.accuracyLabel').replace('{n}', accuracy.toFixed(1))}</div>
          {maxCombo != null && (
            <div className="text-xs text-white/40">{t('highscoreScreen.maxComboLabel').replace('{n}', String(maxCombo))}</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Screen ───────────────────────────────────────────────

export function HighscoreScreen() {
  const { t } = useTranslation();
  const {
    highscores,
    activeProfileId,
    onlineEnabled,
    leaderboardType,
    setLeaderboardType,
    setPendingLibrarySong,
    profiles,
  } = useGameStore();

  // ── Shared board controls (both tabs) ──
  const [difficulty, setDifficulty] = useState<BoardDifficulty>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // ── Global board state ──
  const [globalBoards, setGlobalBoards] = useState<{ s: BatchScoresResponse; d: BatchScoresResponse } | null>(null);
  const [isLoadingGlobal, setIsLoadingGlobal] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [globalRefreshKey, setGlobalRefreshKey] = useState(0);

  // R83/D: per-difficulty board cache — switching back to a previously
  // loaded difficulty shows the cached boards INSTANTLY with zero requests
  // (the raw "Rate limit exceeded" the user saw came from re-fetching every
  // 200-hash chunk on EACH difficulty switch; the server allows 60 req/min).
  const globalBoardCache = useRef<Map<BoardDifficulty, { s: BatchScoresResponse; d: BatchScoresResponse }>>(new Map());
  // R83/D: debounce rapid difficulty switches — clicking through the chips
  // fires ONE fetch burst for the finally-selected difficulty.
  const globalFetchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Drill-down: per-song highscore modal ──
  const [modalSong, setModalSong] = useState<{ song: Song; gameType: 's' | 'd' } | null>(null);

  // ── Rivals (bar on BOTH tabs since R81; the per-row toggle moved to the song modal) ──
  const [rivals, setRivals] = useState<RivalEntry[]>([]);
  const [compareRival, setCompareRival] = useState<RivalEntry | null>(null);

  /** All ids/syncUids of my local profiles — "own entry" highlight on the global board. */
  const localProfileIds = useMemo(
    () => new Set(profiles.flatMap(p => [p.id, p.syncUid].filter(Boolean) as string[])),
    [profiles],
  );
  const activeProfile = useMemo(
    () => profiles.find(p => p.id === activeProfileId) ?? null,
    [profiles, activeProfileId],
  );

  const refreshRivals = useCallback(() => {
    import('@/lib/leaderboard/rivals').then(({ getRivals }) => setRivals(getRivals()));
  }, []);

  useEffect(() => { refreshRivals(); }, [refreshRivals]);

  // ── Theme-party song pool (both boards follow the motto filter) ──
  const motto = useMottoParty();
  // getConfig() hands out a fresh deep copy per render — collapse it to a
  // value-stable JSON key so the derived memos (and the global fetch effect!)
  // don't see a new dependency identity on every render.
  const mottoKey = JSON.stringify(motto);
  const themeActive = motto.enabled;
  const themeSongs = useMemo(() => {
    const songs = getAllSongs();
    const parsed = JSON.parse(mottoKey) as MottoPartyConfig;
    // Gate on `enabled` (like every other filterSongsByMotto call site): a
    // disabled motto may still carry configured terms — no party, no filter.
    return parsed.enabled ? filterSongsByMotto(songs, parsed) : songs;
  }, [mottoKey]);

  // ── LOCAL board: per-song best of the filtered local entries ──
  const localRows = useMemo<LocalSongRow[]>(() => {
    // Only songs that exist in the (theme-filtered) library are eligible —
    // entries of deleted or faked songs never reach the board.
    const eligibleIds = new Set<string>();
    const songsById = new Map<string, Song>();
    for (const song of themeSongs) {
      eligibleIds.add(song.id);
      songsById.set(song.id, song);
    }

    // Per-song aggregate: best entry + every player name on the filtered
    // entries (the search pool).
    const perSong = new Map<string, { best: HighscoreEntry; names: Set<string> }>();
    for (const entry of highscores) {
      if (isPartyGameMode(entry.gameMode)) continue; // party games produce no highscores
      if (!eligibleIds.has(entry.songId)) continue; // not in the (theme-filtered) library
      const diff = apiDifficulty(entry.difficulty);
      if (difficulty !== 'all' && diff !== difficulty) continue; // difficulty chip (API naming)

      const bucket = perSong.get(entry.songId);
      if (bucket) {
        bucket.names.add(entry.playerName);
        if (entry.score > bucket.best.score) bucket.best = entry;
      } else {
        perSong.set(entry.songId, { best: entry, names: new Set([entry.playerName]) });
      }
    }

    const rows: LocalSongRow[] = [];
    for (const [songId, { best, names }] of perSong) {
      const song = songsById.get(songId);
      if (!song) continue;
      rows.push({ kind: 'local', song, best, difficulty: apiDifficulty(best.difficulty), playerNames: [...names] });
    }
    return rows.sort((a, b) => b.best.score - a.best.score);
  }, [highscores, themeSongs, difficulty]);

  // ── Fingerprints for the global board (lazy — only while the tab is live,
  //    the pass over the whole library is too costly for the local tab) ──
  const needGlobalHashes = onlineEnabled && leaderboardType === 'global';
  const hashPlan = useMemo(() => {
    if (!needGlobalHashes) return null;
    const bySong = new Map<string, { s: string | null; d: string | null }>();
    const sHashes: string[] = [];
    const dHashes: string[] = [];
    for (const song of themeSongs) {
      let s: string | null = null;
      let d: string | null = null;
      try { s = songHashFromSong(song, 's'); } catch { /* song without notes — no fingerprint */ }
      try { d = songHashFromSong(song, 'd'); } catch { /* song without notes — no fingerprint */ }
      bySong.set(song.id, { s, d });
      if (s) sHashes.push(s);
      if (d) dHashes.push(d);
    }
    return { bySong, sHashes, dHashes };
  }, [needGlobalHashes, themeSongs]);

  // ── Global fetch: solo + duet boards of every (theme-filtered) song ──
  // R83/D: cached difficulties resolve instantly (no fetch, no spinner);
  // uncached ones debounce 400 ms so chip-surfing coalesces into one burst.
  useEffect(() => {
    if (!onlineEnabled || leaderboardType !== 'global' || !hashPlan) return;
    const { sHashes, dHashes } = hashPlan;
    if (sHashes.length === 0 && dHashes.length === 0) {
      // Nothing eligible (empty library or the theme party filters every song out).
      setGlobalBoards({ s: {}, d: {} });
      setIsLoadingGlobal(false);
      setGlobalError(null);
      return;
    }

    // Cached boards for this difficulty → show immediately, no requests.
    const cached = globalBoardCache.current.get(difficulty);
    if (cached) {
      setGlobalBoards(cached);
      setIsLoadingGlobal(false);
      setGlobalError(null);
      return;
    }

    let cancelled = false;
    setIsLoadingGlobal(true);
    setGlobalError(null);

    if (globalFetchDebounce.current) clearTimeout(globalFetchDebounce.current);
    globalFetchDebounce.current = setTimeout(() => {
      if (cancelled) return;
      import('@/lib/api/leaderboard-service')
        .then(async ({ leaderboardService }) => {
          // ≤200 hashes per call — chunk the library, merge the per-hash boards.
          const fetchBoard = async (hashes: string[], gameType: 's' | 'd'): Promise<BatchScoresResponse> => {
            const merged: BatchScoresResponse = {};
            for (const part of chunk(hashes, BATCH_HASH_CHUNK_SIZE)) {
              Object.assign(merged, await leaderboardService.fetchBatchScores(part, gameType, BATCH_SCORE_LIMIT, difficulty));
            }
            return merged;
          };
          // Solo + duet boards in parallel.
          const [sBoards, dBoards] = await Promise.all([
            fetchBoard(sHashes, 's'),
            fetchBoard(dHashes, 'd'),
          ]);
          if (cancelled) return;
          const boards = { s: sBoards, d: dBoards };
          globalBoardCache.current.set(difficulty, boards);
          setGlobalBoards(boards);
        })
        .catch((err: unknown) => {
          if (cancelled) return;
          const raw = err instanceof Error ? err.message : String(err);
          let message = raw || 'Failed to load global leaderboard';
          if (raw.includes('Rate limit') || raw.includes('429')) {
            // R83/D: the shared-hosting API allows 60 requests/min per IP —
            // surface a friendly, actionable message instead of the raw text.
            message = t('highscoreScreen.rateLimited');
          } else if (raw.includes('HTTP 500') || raw.includes('500')) {
            message = 'Server error (HTTP 500). The leaderboard service is temporarily unavailable. Please try again later.';
          } else if (raw.includes('Failed to fetch') || raw.includes('NetworkError')) {
            message = 'Network error. Please check your internet connection.';
          }
          setGlobalError(message);
        })
        .finally(() => {
          if (!cancelled) setIsLoadingGlobal(false);
        });
    }, 400);

    return () => {
      cancelled = true;
      if (globalFetchDebounce.current) { clearTimeout(globalFetchDebounce.current); globalFetchDebounce.current = null; }
    };
  }, [onlineEnabled, leaderboardType, difficulty, hashPlan, globalRefreshKey, t]);

  // ── GLOBAL board rows: better of the song's solo/duet best entries ──
  const globalRows = useMemo<GlobalSongRow[]>(() => {
    if (!globalBoards || !hashPlan) return [];
    const rows: GlobalSongRow[] = [];
    for (const song of themeSongs) {
      const hashes = hashPlan.bySong.get(song.id);
      if (!hashes) continue;

      // Best entry of each board (the per-hash board is score-sorted —
      // entries[0] is the best; the difficulty filter ran server-side).
      const sEntries = hashes.s ? globalBoards.s[hashes.s] : undefined;
      const dEntries = hashes.d ? globalBoards.d[hashes.d] : undefined;
      const candidates: Array<{ best: OnlineScoreEntry; gameType: 's' | 'd' }> = [];
      if (sEntries && sEntries.length > 0) candidates.push({ best: sEntries[0], gameType: 's' });
      if (dEntries && dEntries.length > 0) candidates.push({ best: dEntries[0], gameType: 'd' });
      if (candidates.length === 0) continue;

      // The row shows the better of the two boards' best entries.
      const winner = candidates.reduce((a, b) => (b.best.score > a.best.score ? b : a));

      // Search pool: every player name on this song's (filtered) boards.
      const names = new Set<string>();
      if (sEntries) for (const e of sEntries) names.add(e.display_name);
      if (dEntries) for (const e of dEntries) names.add(e.display_name);

      rows.push({ kind: 'global', song, best: winner.best, gameType: winner.gameType, playerNames: [...names] });
    }
    return rows.sort((a, b) => b.best.score - a.best.score);
  }, [globalBoards, themeSongs, hashPlan]);

  // ── Search: song title, artist or ANY player name on the song's board ──
  const activeRows: SongBoardRowData[] = leaderboardType === 'global' ? globalRows : localRows;
  const visibleRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return activeRows;
    return activeRows.filter(row =>
      row.song.title.toLowerCase().includes(q) ||
      row.song.artist.toLowerCase().includes(q) ||
      row.playerNames.some(name => name.toLowerCase().includes(q)),
    );
  }, [activeRows, searchQuery]);

  // ── Render flags ──
  const isGlobalTab = leaderboardType === 'global';
  const showGlobalLoading = isGlobalTab && isLoadingGlobal;
  const showGlobalError = isGlobalTab && !isLoadingGlobal && !!globalError;
  const hasQuery = searchQuery.trim().length > 0;
  const emptyMessage = hasQuery
    ? t('highscoreScreen.searchNoResults').replace('{q}', searchQuery)
    : themeActive
      ? t('highscoreScreen.themeNoMatches')
      : isGlobalTab
        ? t('highscoreScreen.noGlobal')
        : t('highscoreScreen.noAll');

  const openSongModal = useCallback((row: SongBoardRowData) => {
    // Local rows are mode-agnostic (the modal's local list filters by songId);
    // global rows open the board the best entry came from ('d' = duet board).
    setModalSong({ song: row.song, gameType: row.kind === 'global' ? row.gameType : 's' });
  }, []);

  const retryGlobalLoad = useCallback(() => {
    setGlobalError(null);
    // R83/D: a manual retry is an explicit refresh request — drop the
    // per-difficulty caches so the boards are re-fetched from the server.
    globalBoardCache.current.clear();
    setGlobalRefreshKey(key => key + 1);
  }, []);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-3" data-testid="highscore-title">
          <TrophyIcon className="w-8 h-8 text-yellow-400" />
          {t('highscoreScreen.title')}
        </h1>
        <p className="text-white/60">{t('highscoreScreen.description')}</p>
      </div>

      {/* Tabs + difficulty chips (shared controls, both tabs) */}
      {/* R83/A: explicit white label on every button — the shadcn default
          (text-primary-foreground) renders near-black in dark mode and was
          unreadable on the translucent tab backgrounds. */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Button
          onClick={() => setLeaderboardType('local')}
          className={`text-white ${leaderboardType === 'local' ? 'bg-cyan-500 hover:bg-cyan-600' : 'bg-white/10 hover:bg-white/20'}`}
        >
          {t('highscoreScreen.local')}
        </Button>
        {onlineEnabled && (
          <Button
            onClick={() => setLeaderboardType('global')}
            className={`text-white ${leaderboardType === 'global' ? 'bg-purple-500 hover:bg-purple-600' : 'bg-white/10 hover:bg-white/20'}`}
          >
            {t('highscoreScreen.global')}
          </Button>
        )}
        <div className="w-px bg-white/20 mx-1 hidden sm:block" />
        <div
          className="flex gap-1 bg-white/5 rounded-lg p-1 border border-white/10"
          role="group"
          aria-label={t('songHighscoreModal.difficultyFilter')}
          data-testid="board-difficulty-filter"
        >
          {BOARD_DIFFICULTIES.map(d => (
            <button
              key={d}
              type="button"
              onClick={() => setDifficulty(d)}
              data-testid={`board-difficulty-${d}`}
              className={`px-2.5 py-0.5 rounded-md text-[11px] font-medium transition-all ${
                d === 'easy' && difficulty === d ? 'bg-green-500 text-white' :
                d === 'normal' && difficulty === d ? 'bg-yellow-500 text-black' :
                d === 'hard' && difficulty === d ? 'bg-red-500 text-white' :
                d === 'all' && difficulty === d ? 'bg-cyan-500 text-white' :
                'text-white/50 hover:text-white'
              }`}
            >
              {t(`songHighscoreModal.difficulty_${d}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Rival bar (R81: on BOTH tabs) */}
      {rivals.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-4" data-testid="rival-bar">
          {/* R83: Angry icon instead of ⚔️ — crossed swords are reserved for
              duel mode; the rival symbol is the angry face (R81 convention). */}
          <span className="inline-flex items-center gap-1 text-xs text-white/40"><Angry className="w-3.5 h-3.5 text-red-400" /> {t('rivals.title')}:</span>
          {rivals.map(r => (
            <span
              key={r.uid}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 pl-1.5 pr-1 py-0.5 text-xs"
            >
              <span
                className="w-4 h-4 rounded-full inline-flex items-center justify-center text-[9px] font-bold text-white"
                style={{ backgroundColor: r.color }}
              >
                {r.name?.[0]?.toUpperCase() || '?'}
              </span>
              <span className="max-w-24 truncate">{r.name}</span>
              <button
                type="button"
                onClick={() => setCompareRival(r)}
                className="text-cyan-400 hover:text-cyan-300 font-medium px-1"
                title={t('rivals.compare').replace('{name}', r.name)}
                data-testid={`rival-compare-btn-${r.uid.slice(0, 8)}`}
              >
                {t('rivals.compareButton')}
              </button>
              <button
                type="button"
                onClick={() => { import('@/lib/leaderboard/rivals').then(({ removeRival }) => { removeRival(r.uid); refreshRivals(); }); }}
                className="text-white/30 hover:text-red-400 px-0.5"
                title={t('rivals.remove')}
                aria-label={t('rivals.remove')}
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Search (both tabs): matches song title, artist or any player name */}
      <div className="relative mb-6">
        <Input
          ref={searchInputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t('highscoreScreen.searchPlaceholder')}
          className="bg-white/5 border-white/10 text-white pl-10"
          data-testid="board-search"
        />
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70">
            ✕
          </button>
        )}
      </div>

      {/* Global loading */}
      {showGlobalLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full mr-3" />
          <span className="text-white/60">{t('highscoreScreen.loadingGlobal')}</span>
        </div>
      )}

      {/* Global error */}
      {showGlobalError && (
        <Card className="bg-red-500/10 border-red-500/30 mb-6">
          <CardContent className="py-4 text-center">
            <p className="text-red-400 mb-3">{globalError}</p>
            <div className="flex justify-center gap-2">
              <Button onClick={retryGlobalLoad} size="sm" className="bg-purple-500 hover:bg-purple-400 text-white">{t('highscoreScreen.retry')}</Button>
              <Button onClick={() => setLeaderboardType('local')} size="sm" className="bg-white/10 hover:bg-white/20 text-white">{t('highscoreScreen.switchToLocal')}</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty states */}
      {!showGlobalLoading && !showGlobalError && visibleRows.length === 0 && (
        <Card className="bg-white/5 border-white/10">
          <CardContent className="py-12 text-center">
            <TrophyIcon className="w-16 h-16 text-white/20 mx-auto mb-4" />
            <p className="text-white/60">{emptyMessage}</p>
          </CardContent>
        </Card>
      )}

      {/* Board rows */}
      {!showGlobalLoading && !showGlobalError && visibleRows.length > 0 && (
        <div className="space-y-2">
          {visibleRows.slice(0, MAX_ROWS).map((row, index) => (
            <SongBoardRow
              key={row.song.id}
              row={row}
              rank={index}
              isOwn={row.kind === 'global' && localProfileIds.has(row.best.profile_uid)}
              onClick={() => openSongModal(row)}
            />
          ))}
        </div>
      )}

      {/* Drill-down: per-song highscore modal — R83/F: the "Song starten"
          button hands the song to the Library (opens the start dialog there),
          so the user never has to search for it manually. */}
      {modalSong && (
        <SongHighscoreModal
          song={modalSong.song}
          isOpen
          onClose={() => setModalSong(null)}
          gameType={modalSong.gameType}
          onStartSong={() => { setPendingLibrarySong(modalSong.song); setModalSong(null); }}
        />
      )}

      {/* Head-to-head rival comparison (client-side via /scores/batch) */}
      {compareRival && activeProfile && (
        <RivalCompareDialog
          rival={compareRival}
          profile={activeProfile}
          open
          onOpenChange={(open) => { if (!open) setCompareRival(null); }}
        />
      )}
    </div>
  );
}
