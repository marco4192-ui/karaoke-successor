'use client';

import { useState, useMemo, useDeferredValue, useRef } from 'react';
import type { Song } from '@/types/game';
import { songMatchesEra } from '@/lib/game/era-filter';
import { fuzzyScore } from '@/lib/fuzzy-search';
import { getJsonOptional } from '@/lib/storage';
import { StorageKeys } from '@/lib/storage';
import type { RepeatMode, JukeboxSongSuggestion } from '../jukebox-types';
import type { RecentlyPlayedEntry } from './jukebox-hook-types';

// ===================== PARAMS / RETURN =====================

export interface UseJukeboxFiltersParams {
  songs: Song[];
  recentlyPlayedRef: React.MutableRefObject<RecentlyPlayedEntry[]>;
}

export interface UseJukeboxFiltersReturn {
  filterGenre: string;
  setFilterGenre: (_g: string) => void;
  filterArtist: string;
  setFilterArtist: (_a: string) => void;
  filterEra: string;
  setFilterEra: (_e: string) => void;
  filterYear: string;
  setFilterYear: (_y: string) => void;
  searchQuery: string;
  setSearchQuery: (_q: string) => void;
  shuffle: boolean;
  /** Raw setter — the PUBLIC setShuffle is the live-reshuffling handleSetShuffle. */
  setShuffle: (_s: boolean) => void;
  shuffleRef: React.MutableRefObject<boolean>;
  repeat: RepeatMode;
  setRepeat: (_r: RepeatMode) => void;
  repeatRef: React.MutableRefObject<RepeatMode>;
  // F11: Duration filter bounds (seconds)
  minDuration: number;
  setMinDuration: (_d: number) => void;
  maxDuration: number;
  setMaxDuration: (_d: number) => void;
  // F10: Max songs in playlist (0 = unlimited)
  maxSongs: number;
  setMaxSongs: (_n: number) => void;
  // N4: Auto-stop timer in minutes (0 = no timer)
  timerMinutes: number;
  setTimerMinutes: (_m: number) => void;
  // F7: Recently played exclusion in minutes (0 = off)
  recentlyPlayedMinutes: number;
  setRecentlyPlayedMinutes: (_m: number) => void;
  /** Pool change counter setter — bumped by the 'jukebox-pool-changed' listener
   *  (useJukeboxPlayback) to trigger re-filtering. */
  setPoolChangeCounter: (_fn: (_c: number) => number) => void;
  filteredSongs: Song[];
  /** Best fuzzy matches for the current search query (descending score, max 8). */
  searchSuggestions: JukeboxSongSuggestion[];
}

// ===================== HOOK =====================

/**
 * Filter/config state of the jukebox (R10 extraction): the former
 * "Filter / Config State" block plus the fuzzy search suggestions and the
 * filteredSongs memo.  The shuffle/repeat render-synced refs live here too.
 */
export function useJukeboxFilters({ songs, recentlyPlayedRef }: UseJukeboxFiltersParams): UseJukeboxFiltersReturn {
  // --- Filter / Config State ---
  const [filterGenre, setFilterGenre] = useState<string>('all');
  const [filterArtist, setFilterArtist] = useState<string>('');
  // Era/decade filter (decade start year, e.g. '1980') — for themed parties
  const [filterEra, setFilterEra] = useState<string>('all');
  // Exact year filter (e.g. '1985') — finer than the era/decade filter
  const [filterYear, setFilterYear] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [shuffle, setShuffle] = useState(true);
  const [repeat, setRepeat] = useState<RepeatMode>('all');
  // F11: Duration filter bounds (seconds)
  const [minDuration, setMinDuration] = useState(0);
  const [maxDuration, setMaxDuration] = useState(0);
  // F10: Max songs in playlist (0 = unlimited)
  const [maxSongs, setMaxSongs] = useState(0);
  // N4: Auto-stop timer in minutes (0 = no timer)
  const [timerMinutes, setTimerMinutes] = useState(0);
  // F7: Recently played exclusion in minutes (0 = off)
  const [recentlyPlayedMinutes, setRecentlyPlayedMinutes] = useState(30);

  // Pool change counter — incremented by PoolSelector to trigger re-filtering
  const [poolChangeCounter, setPoolChangeCounter] = useState(0);

  const shuffleRef = useRef(shuffle);
  shuffleRef.current = shuffle;
  const repeatRef = useRef(repeat);
  repeatRef.current = repeat;

  // ==================== SEARCH SUGGESTIONS (fuzzy ranking) ====================

  // Deferred query keeps typing smooth while the fuzzy scoring of the whole
  // library catches up (React renders the input with the fresh value first).
  const deferredSearchQuery = useDeferredValue(searchQuery);

  /** Best fuzzy matches for the current search query (descending score, max 8). */
  const searchSuggestions = useMemo<JukeboxSongSuggestion[]>(() => {
    const q = deferredSearchQuery.trim();
    if (!q) return [];
    const scored: JukeboxSongSuggestion[] = [];
    for (const song of songs) {
      const score = Math.max(
        fuzzyScore(q, song.title),
        fuzzyScore(q, song.artist) * 0.98,
        song.album ? fuzzyScore(q, song.album) * 0.9 : 0,
      );
      if (score > 0) scored.push({ song, score });
    }
    scored.sort((a, b) => b.score - a.score || a.song.title.localeCompare(b.song.title));
    return scored.slice(0, 8);
  }, [deferredSearchQuery, songs]);

  // ==================== FILTER SONGS ====================

  const filteredSongs = useMemo(() => {
    let filtered = songs;

    // F8: If a saved playlist exists, filter to those IDs
    const savedPlaylistIds = getJsonOptional<string[]>(StorageKeys.JUKEBOX_PLAYLIST);
    if (savedPlaylistIds && savedPlaylistIds.length > 0) {
      const idSet = new Set(savedPlaylistIds);
      filtered = filtered.filter(s => idSet.has(s.id));
    }

    // Genre filter
    if (filterGenre !== 'all') {
      filtered = filtered.filter(s => s.genre?.toLowerCase().includes(filterGenre.toLowerCase()));
    }
    // Artist filter
    if (filterArtist) {
      filtered = filtered.filter(s => s.artist === filterArtist);
    }
    // Era (decade) filter — matches songs whose year falls into the decade
    if (filterEra !== 'all') {
      filtered = filtered.filter(s => songMatchesEra(s, filterEra));
    }
    // Year filter — exact year match (finer than the era/decade filter)
    if (filterYear !== 'all') {
      const year = parseInt(filterYear, 10);
      filtered = filtered.filter(s => s.year === year);
    }
    // Search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(s =>
        s.title.toLowerCase().includes(query) ||
        s.artist.toLowerCase().includes(query) ||
        s.album?.toLowerCase().includes(query)
      );
    }
    // F11: Duration filter
    if (minDuration > 0) {
      filtered = filtered.filter(s => (s.duration / 1000) >= minDuration);
    }
    if (maxDuration > 0) {
      filtered = filtered.filter(s => (s.duration / 1000) <= maxDuration);
    }
    // F7: Recently played exclusion
    if (recentlyPlayedMinutes > 0) {
      const cutoff = Date.now() - recentlyPlayedMinutes * 60 * 1000;
      recentlyPlayedRef.current = recentlyPlayedRef.current.filter(e => e.playedAt > cutoff - 60 * 60 * 1000);
      const recentIds = new Set(
        recentlyPlayedRef.current
          .filter(e => e.playedAt > cutoff)
          .map(e => e.songId)
      );
      if (recentIds.size > 0) {
        filtered = filtered.filter(s => !recentIds.has(s.id));
      }
    }
    return filtered;
  }, [songs, filterGenre, filterArtist, filterEra, filterYear, searchQuery, minDuration, maxDuration, recentlyPlayedMinutes, poolChangeCounter]);

  return {
    filterGenre, setFilterGenre,
    filterArtist, setFilterArtist,
    filterEra, setFilterEra,
    filterYear, setFilterYear,
    searchQuery, setSearchQuery,
    shuffle, setShuffle, shuffleRef,
    repeat, setRepeat, repeatRef,
    minDuration, setMinDuration,
    maxDuration, setMaxDuration,
    maxSongs, setMaxSongs,
    timerMinutes, setTimerMinutes,
    recentlyPlayedMinutes, setRecentlyPlayedMinutes,
    setPoolChangeCounter,
    filteredSongs,
    searchSuggestions,
  };
}
