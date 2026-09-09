'use client';

import { useMemo, useDeferredValue, useState, useEffect } from 'react';
import { Song } from '@/types/game';
import { LibrarySettings, StartOptions } from '@/components/screens/library/types';
import { isDuetSong } from '@/components/screens/library/utils';
import { fuzzyMatch } from '@/lib/fuzzy-search';
import { useDebouncedValue } from './use-debounce';
import { normalizeLanguage, splitGenres, normalizeGenreName } from '@/lib/parsers/meta-normalizer';
import { CHRISTMAS_FILTER_VALUE, isChristmasSong, isChristmasSeasonEnabled } from '@/lib/seasonal';

interface UseLibraryFiltersParams {
  loadedSongs: Song[];
  searchQuery: string;
  settings: LibrarySettings;
  startMode: StartOptions['mode'];
  viralSongIds?: Set<string>;
}

export function useLibraryFilters({ loadedSongs, searchQuery, settings, startMode, viralSongIds }: UseLibraryFiltersParams) {
  // Seasonal easter egg: the 🎄 Christmas filter is only offered in December
  // (or via ?xmas=1). Evaluated post-mount so SSR and client agree on the
  // initial render — no hydration mismatch across timezone edges.
  const [xmasSeason, setXmasSeason] = useState(false);
  useEffect(() => {
    setXmasSeason(isChristmasSeasonEnabled());
  }, []);

  // B.1: Debounce search — wait 200ms after last keystroke before filtering.
  // This prevents expensive fuzzy matching on every single character typed.
  const debouncedQuery = useDebouncedValue(searchQuery, 200);

  // B.2: Deferred value — lets React keep the search input responsive
  // while the filter/sort computation runs at lower priority.
  const deferredQuery = useDeferredValue(debouncedQuery);
  const isFilterStale = deferredQuery !== debouncedQuery;

  const filteredSongs = useMemo(() => {
    let songs = loadedSongs;
    
    // Use the deferred (lower-priority) search query for filtering.
    // The raw searchQuery drives the input; deferredQuery drives the grid.
    if (deferredQuery) {
      songs = songs.filter(s =>
        fuzzyMatch(deferredQuery, s.title) ||
        fuzzyMatch(deferredQuery, s.artist) ||
        (s.genre && fuzzyMatch(deferredQuery, s.genre)) ||
        (s.album && fuzzyMatch(deferredQuery, s.album))
      );
    }
    
    // Difficulty filter
    if (settings.filterDifficulty !== 'all') {
      songs = songs.filter(s => s.difficulty === settings.filterDifficulty);
    }
    
    // Genre filter - reads from #Genre: tag in txt files
    // Supports comma-separated genres (e.g., "Soundtrack, K-Pop")
    if (settings.filterGenre === CHRISTMAS_FILTER_VALUE) {
      // Seasonal easter egg: heuristic (title/genre), NOT a canonical genre —
      // Christmas songs keep their real genre in the metadata.
      songs = songs.filter(s => isChristmasSong(s));
    } else if (settings.filterGenre && settings.filterGenre !== 'all') {
      const normalizedFilter = normalizeGenreName(settings.filterGenre).toLowerCase();
      songs = songs.filter(s => {
        if (!s.genre) return false;
        const parts = splitGenres(s.genre);
        return parts.some(g => normalizeGenreName(g).toLowerCase() === normalizedFilter);
      });
    }
    
    // Language filter - reads from #Language: tag in txt files (normalized)
    if (settings.filterLanguage && settings.filterLanguage !== 'all') {
      const normalizedFilter = normalizeLanguage(settings.filterLanguage);
      songs = songs.filter(s => {
        if (!s.language) return false;
        return normalizeLanguage(s.language) === normalizedFilter;
      });
    }
    
    // Year filter
    if (settings.filterYear && settings.filterYear !== 'all') {
      const yr = parseInt(settings.filterYear, 10);
      if (!isNaN(yr)) {
        songs = songs.filter(s => s.year === yr);
      }
    }
    
    // Duet filter - show only duet songs when enabled
    if (settings.filterDuet) {
      songs = songs.filter(s => isDuetSong(s));
    }
    
    // Duet mode filter - show only duet-compatible songs when in duet mode (NOT duel mode)
    // Duet mode: Two players sing different parts (need duet songs)
    // Duel mode: Two players compete on the same song (any song works)
    if (startMode === 'duet') {
      songs = songs.filter(s => isDuetSong(s));
    }

    // Viral hits filter - show only songs that are matched as trending
    if (settings.filterViral && viralSongIds && viralSongIds.size > 0) {
      songs = songs.filter(s => viralSongIds.has(s.id));
    }
    
    // Sort
    songs = [...songs].sort((a, b) => {
      let comparison = 0;
      switch (settings.sortBy) {
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'artist':
          comparison = a.artist.localeCompare(b.artist);
          break;
        case 'dateAdded':
          comparison = (b.dateAdded || 0) - (a.dateAdded || 0);
          break;
      }
      return settings.sortOrder === 'asc' ? comparison : -comparison;
    });
    
    return songs;
  }, [loadedSongs, deferredQuery, settings, startMode, viralSongIds]);
  
  // Get unique genres from loaded songs (read from #Genre: in txt files, normalized).
  // In December the seasonal 🎄 Christmas entry is injected right after "all".
  const availableGenres = useMemo(() => {
    const genreSet = new Set<string>();
    loadedSongs.forEach(s => {
      if (s.genre) {
        const parts = splitGenres(s.genre);
        parts.forEach(g => genreSet.add(normalizeGenreName(g)));
      }
    });
    return [
      'all',
      ...(xmasSeason ? [CHRISTMAS_FILTER_VALUE] : []),
      ...Array.from(genreSet).sort(),
    ];
  }, [loadedSongs, xmasSeason]);
  
  // Get unique languages from loaded songs (read from #Language: in txt files, normalized)
  const availableLanguages = useMemo(() => {
    const langSet = new Set<string>();
    loadedSongs.forEach(s => {
      if (s.language) langSet.add(normalizeLanguage(s.language));
    });
    return ['all', ...Array.from(langSet).sort()];
  }, [loadedSongs]);
  
  // Get unique years from loaded songs
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    loadedSongs.forEach(s => { if (s.year) years.add(s.year); });
    return ['all', ...Array.from(years).sort((a, b) => b - a).map(String)];
  }, [loadedSongs]);
  
  return { filteredSongs, availableGenres, availableLanguages, availableYears, isFilterStale };
}
