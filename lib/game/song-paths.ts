// Shared path utilities for song library modules
import type { Song } from '@/types/game';
import { normalizeFilePath } from '@/lib/tauri-file-storage';
import { StorageKeys, getItem } from '@/lib/storage';

/** The 7 path fields on Song that need normalization. */
export const SONG_PATH_FIELDS = [
  'baseFolder',
  'relativeAudioPath',
  'relativeVideoPath',
  'relativeCoverPath',
  'relativeTxtPath',
  'folderPath',
  'relativeBackgroundPath',
] as const;

/** Check if a path is absolute (Windows: D:\… or UNC, Unix: /…) */
export function isAbsolutePath(p: string): boolean {
  return p.startsWith('/') || /^[A-Za-z]:[\\/]/.test(p) || p.startsWith('\\\\');
}

/**
 * Resolve the effective songs base folder.
 *
 * Priority:
 * 1. `songBaseFolder` if it is an absolute path
 * 2. `localStorage('karaoke-songs-folder')` (normalized)
 * 3. `null` — caller should fall back gracefully
 */
export function resolveSongsBaseFolder(songBaseFolder?: string): string | null {
  // Try storage
  let localStorageFolder: string | null = null;
  const raw = getItem(StorageKeys.SONGS_FOLDER);
  localStorageFolder = raw ? normalizeFilePath(raw) : null;

  const candidate = songBaseFolder || localStorageFolder;

  if (candidate) {
    if (isAbsolutePath(candidate)) {
      return candidate;
    }
    // Relative candidate — prefer absolute localStorage folder
    if (localStorageFolder && isAbsolutePath(localStorageFolder)) {
      return localStorageFolder;
    }
  }

  // Return the localStorage folder even if relative (best effort)
  return localStorageFolder;
}

/**
 * Normalize all 7 path fields of a song using `normalizeFilePath`.
 *
 * Returns the (possibly mutated) song and whether any field changed.
 */
export function normalizeSongPathFields(song: Song): { song: Song; changed: boolean } {
  let changed = false;
  for (const field of SONG_PATH_FIELDS) {
    const val = song[field];
    if (typeof val === 'string' && val.length > 0) {
      const normalized = normalizeFilePath(val);
      if (normalized !== val) {
        // field is a known string-valued key of Song — safe targeted cast
        (song as Record<typeof field, string | undefined>)[field] = normalized;
        changed = true;
      }
    }
  }
  return { song, changed };
}
