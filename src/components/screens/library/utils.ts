'use client';

import { Song } from '@/types/game';
import { LANGUAGE_NAMES } from '@/lib/i18n/translations';
import type { Language } from '@/lib/i18n/translations';
import { LibraryGroupBy } from './types';

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

export function isDuetSong(song: Song): boolean {
  // Check if explicitly marked as duet
  if (song.isDuet === true) return true;
  // Check title for [Duet] / [DUET] / (Duet) etc. (case insensitive)
  if (song.title && /\[\s*duet\s*\]/i.test(song.title)) return true;
  if (song.title && /\(\s*duet\s*\)/i.test(song.title)) return true;
  return false;
}

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
