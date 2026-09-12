/**
 * Library ↔ txt reconciliation (user feedback round R2-D / point 7).
 *
 * Problem: AI genre edits updated the library STORE (in-memory + localStorage
 * + IndexedDB custom-songs) even when the txt write failed — and the editor's
 * "Neu laden" discarded its scan result, so the store never got corrected.
 * Songs then showed "genre set" in the filters although the txt had no genre.
 *
 * This module rebuilds the library METADATA from the txt headers (fast header
 * scan, no media re-import) so a library reload resets genre/language/year to
 * the txt truth. Songs whose files are gone are dropped; songs without file
 * info (browser imports) are kept untouched. New files are NOT imported here
 * (that's the full folder scan's job — resource-friendly by design).
 */

import { Song } from '@/types/game';
import { getAllSongs, replaceCustomSongs } from '@/lib/game/song-library';
import { getString, StorageKeys } from '@/lib/storage';

export interface ReconcileResult {
  /** True when reconciliation was skipped (no Tauri / no songs folder). */
  skipped: boolean;
  /** Number of txt files found by the header scan. */
  scanned: number;
  /** Songs whose metadata was updated from the txt. */
  updated: number;
  /** Songs removed because their txt file no longer exists. */
  removed: number;
}

const SKIPPED: ReconcileResult = { skipped: true, scanned: 0, updated: 0, removed: 0 };

/** Path identity used to match library songs with scanned txt files. */
function pathKey(baseFolder: string, relativeTxtPath: string): string {
  return `${baseFolder}/${relativeTxtPath}`;
}

/**
 * Reconcile the library with the txt files on disk (Tauri only).
 * Genre/language/year/title/artist of every matched song are replaced with
 * the values from the txt header — the txt IS the source of truth.
 */
export async function reconcileLibraryFromFiles(): Promise<ReconcileResult> {
  if (typeof window === 'undefined' || !('__TAURI_INTERNALS__' in window)) {
    return SKIPPED;
  }

  const raw = getString(StorageKeys.SONGS_FOLDER)
    || localStorage.getItem('songsFolder')
    || localStorage.getItem('karaoke_songs_folder');
  if (!raw) return SKIPPED;

  try {
    const { scanSongsFolderTauri } = await import('@/lib/tauri-file-storage');
    const scan = await scanSongsFolderTauri(raw);
    if (scan.errors.length > 0 && scan.songs.length === 0) {
      // Scan itself failed — keep the current library instead of wiping it
      return SKIPPED;
    }

    interface ScannedMeta {
      title?: string;
      artist?: string;
      genre?: string;
      language?: string;
      year?: number;
    }
    const scannedByKey = new Map<string, ScannedMeta>();
    for (const s of scan.songs) {
      if (s.baseFolder && s.relativeTxtPath) {
        scannedByKey.set(pathKey(s.baseFolder, s.relativeTxtPath), {
          title: s.title,
          artist: s.artist,
          genre: s.genre,
          language: s.language,
          year: s.year,
        });
      }
    }

    const library = getAllSongs();
    const next: Song[] = [];
    let updated = 0;
    let removed = 0;

    for (const song of library) {
      if (!song.baseFolder || !song.relativeTxtPath) {
        // No file identity (browser import / manual song) — keep as-is
        next.push(song);
        continue;
      }
      const meta = scannedByKey.get(pathKey(song.baseFolder, song.relativeTxtPath));
      if (!meta) {
        // File is gone → drop from the library
        removed++;
        continue;
      }
      const merged: Song = {
        ...song,
        title: meta.title ?? song.title,
        artist: meta.artist ?? song.artist,
        genre: meta.genre ?? undefined,
        language: meta.language ?? undefined,
        year: meta.year ?? undefined,
      };
      const changed = merged.genre !== song.genre
        || merged.language !== song.language
        || merged.year !== song.year
        || merged.title !== song.title
        || merged.artist !== song.artist;
      if (changed) updated++;
      next.push(merged);
    }

    if (updated > 0 || removed > 0) {
      replaceCustomSongs(next);
    }

    return { skipped: false, scanned: scan.songs.length, updated, removed };
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[LibraryReconcile] Failed to reconcile library from txt:', e);
    return SKIPPED;
  }
}
