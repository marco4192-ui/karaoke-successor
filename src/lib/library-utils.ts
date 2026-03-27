/**
 * library-utils.ts
 * 
 * Utility functions for library song grouping and sorting
 * Extracted from library-screen.tsx for better maintainability
 */

import { Song } from '@/types/game';
import { LibraryGroupBy } from '@/hooks/use-library-settings';

/**
 * Get the first letter group for folder view
 */
export function getLetterGroup(name: string): string {
  if (!name) return '#';
  const firstChar = name.trim().charAt(0).toUpperCase();
  
  // Check if starts with "The "
  if (name.trim().toLowerCase().startsWith('the ')) {
    return 'The';
  }
  
  // Check if it's a letter A-Z
  if (firstChar >= 'A' && firstChar <= 'Z') {
    return firstChar;
  }
  
  // Everything else goes to #
  return '#';
}

/**
 * Group songs by specified criteria
 */
export function groupSongs(songs: Song[], groupBy: LibraryGroupBy): Map<string, Song[]> {
  const groups = new Map<string, Song[]>();
  
  songs.forEach(song => {
    let key: string;
    
    switch (groupBy) {
      case 'artist':
        key = getLetterGroup(song.artist);
        break;
      case 'title':
        key = getLetterGroup(song.title);
        break;
      case 'genre':
        key = song.genre || 'Unknown';
        break;
      case 'language':
        key = song.language || 'unknown';
        break;
      case 'folder':
        // Get the TOP-LEVEL folder only (parent folder of the song's folder)
        // Songs are typically in: BaseFolder/ArtistFolder/SongFolder/song.txt
        // We want to show only: ArtistFolder (the first level after base)
        if (song.folderPath) {
          const parts = song.folderPath.split('/').filter(p => p.length > 0);
          // Only show the first subfolder level (not the song's immediate folder)
          // If path is "Artist/Album/Song", show "Artist"
          // If path is "Artist/Song", show "Artist"
          // If path is "Song", show "Root"
          if (parts.length >= 2) {
            // Skip the last part (song folder) and take the first meaningful parent
            key = parts[0];
          } else if (parts.length === 1) {
            // Single folder - could be an artist folder with songs directly
            key = parts[0];
          } else {
            key = 'Root';
          }
        } else if (song.storageFolder) {
          // For storage folder, extract top-level folder
          const parts = song.storageFolder.split('/').filter(p => p.length > 0);
          key = parts.length > 0 ? parts[0] : 'Root';
        } else {
          key = 'Root';
        }
        break;
      default:
        key = 'All';
    }
    
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(song);
  });
  
  return groups;
}

/**
 * Get sorted folder keys based on group type
 */
export function getSortedFolderKeys(groups: Map<string, Song[]>, groupBy: LibraryGroupBy): string[] {
  const keys = Array.from(groups.keys());
  
  if (groupBy === 'artist' || groupBy === 'title') {
    // Sort: A-Z first, then "The", then "#"
    return keys.sort((a, b) => {
      if (a === '#' && b !== '#') return 1;
      if (b === '#' && a !== '#') return -1;
      if (a === 'The' && b !== 'The' && b !== '#') return 1;
      if (b === 'The' && a !== 'The' && a !== '#') return -1;
      return a.localeCompare(b);
    });
  }
  
  return keys.sort((a, b) => a.localeCompare(b));
}

/**
 * Filter songs based on search query and settings
 */
export function filterSongs(
  songs: Song[],
  searchQuery: string,
  settings: {
    filterDifficulty: string;
    filterGenre: string;
    filterLanguage: string;
    filterDuet: boolean;
  },
  mode?: 'single' | 'duel' | 'duet' | string
): Song[] {
  let filtered = [...songs];
  
  // Search filter
  if (searchQuery) {
    const lowerQuery = searchQuery.toLowerCase();
    filtered = filtered.filter(s => 
      s.title.toLowerCase().includes(lowerQuery) ||
      s.artist.toLowerCase().includes(lowerQuery) ||
      s.genre?.toLowerCase().includes(lowerQuery) ||
      s.album?.toLowerCase().includes(lowerQuery)
    );
  }
  
  // Difficulty filter
  if (settings.filterDifficulty !== 'all') {
    filtered = filtered.filter(s => s.difficulty === settings.filterDifficulty);
  }
  
  // Genre filter
  if (settings.filterGenre && settings.filterGenre !== 'all') {
    filtered = filtered.filter(s => s.genre === settings.filterGenre);
  }
  
  // Language filter
  if (settings.filterLanguage && settings.filterLanguage !== 'all') {
    filtered = filtered.filter(s => s.language === settings.filterLanguage);
  }
  
  // Duet filter
  if (settings.filterDuet || mode === 'duet') {
    filtered = filtered.filter(s => isDuetSong(s));
  }
  
  return filtered;
}

/**
 * Check if a song is a duet song
 */
export function isDuetSong(song: Song): boolean {
  // Check if explicitly marked as duet
  if (song.isDuet === true) return true;
  
  // Check folder path for [DUET] marker (case insensitive)
  if (song.folderPath?.toLowerCase().includes('[duet]')) return true;
  if (song.storageFolder?.toLowerCase().includes('[duet]')) return true;
  
  // Check if song has duet player data
  if (song.duetPlayerNames && song.duetPlayerNames.length >= 2) return true;
  
  // Check if any lyric lines have notes with P1/P2 player assignments
  if (song.lyrics && song.lyrics.length > 0) {
    const hasDuetNotes = song.lyrics.some(line => 
      line.notes && line.notes.some(note => 
        note.player === 'P1' || note.player === 'P2'
      )
    );
    if (hasDuetNotes) return true;
  }
  
  return false;
}

/**
 * Sort songs by specified criteria
 */
export function sortSongs(
  songs: Song[],
  sortBy: 'title' | 'artist' | 'dateAdded',
  sortOrder: 'asc' | 'desc'
): Song[] {
  return [...songs].sort((a, b) => {
    let comparison = 0;
    switch (sortBy) {
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
    return sortOrder === 'asc' ? comparison : -comparison;
  });
}

/**
 * Get unique genres from songs
 */
export function getAvailableGenres(songs: Song[]): string[] {
  const genreSet = new Set<string>();
  songs.forEach(s => {
    if (s.genre) genreSet.add(s.genre);
  });
  return ['all', ...Array.from(genreSet).sort()];
}

/**
 * Get unique languages from songs
 */
export function getAvailableLanguages(songs: Song[]): string[] {
  const langSet = new Set<string>();
  songs.forEach(s => {
    if (s.language) langSet.add(s.language);
  });
  return ['all', ...Array.from(langSet).sort()];
}
