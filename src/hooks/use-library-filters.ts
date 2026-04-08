'use client';

import { useMemo } from 'react';
import { Song } from '@/types/game';
import { LibrarySettings, StartOptions } from '@/components/screens/library/types';
import { isDuetSong } from '@/components/screens/library/utils';
import { fuzzyMatch } from '@/lib/fuzzy-search';

interface UseLibraryFiltersParams {
  loadedSongs: Song[];
  searchQuery: string;
  settings: LibrarySettings;
  startMode: StartOptions['mode'];
}

export function useLibraryFilters({ loadedSongs, searchQuery, settings, startMode }: UseLibraryFiltersParams) {
  const filteredSongs = useMemo(() => {
    let songs = loadedSongs;
    
    // Search filter (fuzzy matching — tolerant of typos like "Quen" for "Queen")
    if (searchQuery) {
      songs = songs.filter(s =>
        fuzzyMatch(searchQuery, s.title) ||
        fuzzyMatch(searchQuery, s.artist) ||
        (s.genre && fuzzyMatch(searchQuery, s.genre)) ||
        (s.album && fuzzyMatch(searchQuery, s.album))
      );
    }
    
    // Difficulty filter
    if (settings.filterDifficulty !== 'all') {
      songs = songs.filter(s => s.difficulty === settings.filterDifficulty);
    }
    
    // Genre filter - reads from #Genre: tag in txt files
    if (settings.filterGenre && settings.filterGenre !== 'all') {
      songs = songs.filter(s => s.genre === settings.filterGenre);
    }
    
    // Language filter - reads from #Language: tag in txt files
    if (settings.filterLanguage && settings.filterLanguage !== 'all') {
      songs = songs.filter(s => s.language === settings.filterLanguage);
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
  }, [loadedSongs, searchQuery, settings, startMode]);
  
  // Get unique genres from loaded songs (read from #Genre: in txt files)
  const availableGenres = useMemo(() => {
    const genreSet = new Set<string>();
    loadedSongs.forEach(s => {
      if (s.genre) genreSet.add(s.genre);
    });
    return ['all', ...Array.from(genreSet).sort()];
  }, [loadedSongs]);
  
  // Get unique languages from loaded songs (read from #Language: in txt files)
  const availableLanguages = useMemo(() => {
    const langSet = new Set<string>();
    loadedSongs.forEach(s => {
      if (s.language) langSet.add(s.language);
    });
    return ['all', ...Array.from(langSet).sort()];
  }, [loadedSongs]);
  
  return { filteredSongs, availableGenres, availableLanguages };
}
