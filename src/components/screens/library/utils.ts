'use client';

import { Song } from '@/types/game';
import { LANGUAGE_NAMES } from '@/lib/i18n/translations';
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
  // Check if notes are split across non-overlapping time ranges (indicates duet parts)
  // This catches duets where P1/P2 markers are missing but notes are clearly split
  if (song.lyrics && song.lyrics.length > 1) {
    const allNotes = song.lyrics.flatMap(l => l.notes);
    if (allNotes.length > 4) {
      // Sort notes by start time
      const sorted = [...allNotes].sort((a, b) => a.startTime - b.startTime);
      // Find the largest gap between consecutive notes
      let maxGap = 0;
      for (let i = 1; i < sorted.length; i++) {
        const gap = sorted[i].startTime - (sorted[i - 1].startTime + sorted[i - 1].duration);
        if (gap > maxGap) maxGap = gap;
      }
      // If there's a gap larger than 1.5 seconds somewhere in the middle,
      // and notes before and after that gap don't overlap, it might be a duet split
      const totalDuration = sorted[sorted.length - 1].startTime + sorted[sorted.length - 1].duration - sorted[0].startTime;
      if (maxGap > 1500 && totalDuration > 10000) {
        // Find the gap position
        let gapIndex = 0;
        for (let i = 1; i < sorted.length; i++) {
          const gap = sorted[i].startTime - (sorted[i - 1].startTime + sorted[i - 1].duration);
          if (gap > 1500) { gapIndex = i; break; }
        }
        // Check if notes before and after gap don't overlap (true split)
        const beforeEnd = sorted[gapIndex - 1].startTime + sorted[gapIndex - 1].duration;
        const afterStart = sorted[gapIndex].startTime;
        if (afterStart >= beforeEnd) {
          return true;
        }
      }
    }
  }
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

export function getGroupDisplayName(key: string, groupBy: LibraryGroupBy): string {
  if (groupBy === 'language') {
    return LANGUAGE_NAMES[key] || key;
  }
  return key;
}
