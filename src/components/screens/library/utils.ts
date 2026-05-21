'use client';

import { Song } from '@/types/game';
import { LANGUAGE_NAMES } from '@/lib/i18n/translations';
import type { Language } from '@/lib/i18n/translations';
import { LibraryGroupBy } from './types';
import { normalizeLanguage, splitGenres, normalizeGenreName } from '@/lib/parsers/meta-normalizer';

function getLetterGroup(name: string): string {
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

export function isDuetSong(song: Song): boolean {
  // Check if explicitly marked as duet
  if (song.isDuet === true) return true;
  // Check title for [Duet] / [DUET] / (Duet) etc. (case insensitive)
  if (song.title && /\[\s*duet\s*\]/i.test(song.title)) return true;
  if (song.title && /\(\s*duet\s*\)/i.test(song.title)) return true;
  // Fallback: check lyrics for P1/P2 player markers (common in Ultrastar format)
  // Songs that have P1 and P2 markers in lyrics are duets even without explicit flag
  if (song.lyrics && song.lyrics.length > 0) {
    let hasP1 = false;
    let hasP2 = false;
    for (const line of song.lyrics) {
      if (line.player === 'P1') hasP1 = true;
      if (line.player === 'P2') hasP2 = true;
      if (hasP1 && hasP2) return true;
      // Also check note-level player markers
      if (line.notes) {
        for (const note of line.notes) {
          if (note.player === 'P1') hasP1 = true;
          if (note.player === 'P2') hasP2 = true;
          if (hasP1 && hasP2) return true;
        }
      }
    }
  }
  return false;
}

export function groupSongs(songs: Song[], groupBy: LibraryGroupBy): Map<string, Song[]> {
  const groups = new Map<string, Song[]>();
  
  songs.forEach(song => {
    let keys: string[];
    
    switch (groupBy) {
      case 'artist':
        keys = [getLetterGroup(song.artist)];
        break;
      case 'title':
        keys = [getLetterGroup(song.title)];
        break;
      case 'genre': {
        // Normalize and split comma-separated genres
        // e.g., "Soundtrack, K-Pop" → song appears in both "Soundtrack" and "K-Pop" folders
        if (song.genre) {
          keys = splitGenres(song.genre).map(g => normalizeGenreName(g));
        } else {
          keys = ['Unknown'];
        }
        break;
      }
      case 'language': {
        // Normalize language for grouping (e.g., "English", "Deutsch", "español" all map to canonical)
        keys = [song.language ? normalizeLanguage(song.language) : 'unknown'];
        break;
      }
      case 'folder':
        keys = (() => {
          if (song.folderPath) {
            const parts = song.folderPath.split('/').filter(p => p.length > 0);
            if (parts.length >= 2) {
              return [parts[0]];
            } else if (parts.length === 1) {
              return [parts[0]];
            } else {
              return ['Root'];
            }
          } else if (song.storageFolder) {
            const parts = song.storageFolder.split('/').filter(p => p.length > 0);
            return parts.length > 0 ? [parts[0]] : ['Root'];
          } else {
            return ['Root'];
          }
        })();
        break;
      default:
        keys = ['All'];
    }
    
    // Add song to each group key (important for multi-genre)
    for (const key of keys) {
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      const group = groups.get(key);
      if (group && !group.includes(song)) {
        group.push(song);
      }
    }
  });
  
  return groups;
}

export function getSortedFolderKeys(groupedSongs: Map<string, Song[]>, groupBy: LibraryGroupBy): string[] {
  const keys = Array.from(groupedSongs.keys());

  if (groupBy === 'artist' || groupBy === 'title') {
    // Sort letter groups A–Z, then '#' at the end
    return keys.sort((a, b) => {
      if (a === '#') return 1;
      if (b === '#') return -1;
      return a.localeCompare(b);
    });
  }

  // Alphabetical sort for genre, language, folder
  return keys.sort((a, b) => a.localeCompare(b));
}

export function getGroupDisplayName(key: string, groupBy: LibraryGroupBy): string {
  if (groupBy === 'language') {
    return LANGUAGE_NAMES[key as Language] || key;
  }
  return key;
}
