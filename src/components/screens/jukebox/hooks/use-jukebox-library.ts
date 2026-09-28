'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { Song } from '@/types/game';
import { getAllSongsAsync } from '@/lib/game/song-library';
import { getAvailableDecades } from '@/lib/game/era-filter';

// ===================== RETURN =====================

export interface UseJukeboxLibraryReturn {
  /** Full song library (all loaded songs) */
  songs: Song[];
  /** Refs for stable access inside callbacks */
  songsRef: React.MutableRefObject<Song[]>;
  genres: string[];
  artists: string[];
  /** Decade options ('1960','1980',…) — 'all' handled as first entry */
  eras: string[];
  /** Exact year options ('1998','1985',… newest first) — 'all' handled as first entry */
  years: string[];
}

// ===================== HOOK =====================

/**
 * Song library for the jukebox (R10 extraction): loads all songs once on
 * mount, derives the genre/artist/era/year filter options, and keeps the
 * render-synced songsRef for stable access inside callbacks.
 */
export function useJukeboxLibrary(): UseJukeboxLibraryReturn {
  // --- Song Library ---
  const [songs, setSongs] = useState<Song[]>([]);

  // Refs for stable access inside callbacks
  const songsRef = useRef(songs);
  songsRef.current = songs;

  // ==================== LOAD SONGS ====================

  useEffect(() => {
    const loadSongs = async () => {
      const allSongs = await getAllSongsAsync();
      setSongs(allSongs);
    };
    loadSongs();
  }, []);

  // ==================== GENRES & ARTISTS ====================

  const genres = useMemo(() => {
    const genreSet = new Set<string>();
    songs.forEach(s => { if (s.genre) genreSet.add(s.genre); });
    return ['all', ...Array.from(genreSet).sort()];
  }, [songs]);

  const artists = useMemo(() => {
    const artistSet = new Set<string>();
    songs.forEach(s => { if (s.artist) artistSet.add(s.artist); });
    return Array.from(artistSet).sort();
  }, [songs]);

  // Era (decade) options derived from the library years, ascending
  const eras = useMemo(() => ['all', ...getAvailableDecades(songs)], [songs]);

  // Exact year options derived from the library years, newest first
  const years = useMemo(() => {
    const yearSet = new Set<number>();
    songs.forEach(s => { if (s.year) yearSet.add(s.year); });
    return ['all', ...Array.from(yearSet).sort((a, b) => b - a).map(String)];
  }, [songs]);

  return { songs, songsRef, genres, artists, eras, years };
}
