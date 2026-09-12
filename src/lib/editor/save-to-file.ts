// Save Song to UltraStar txt file
// This module handles saving song edits back to the original txt file
// Tauri: writes directly to the original file location.
// Browser: there is no songs folder — the regenerated txt is persisted to the
//   song's IndexedDB media record (the same place loadSongLyrics reads from).
//   Without this fallback, AI-suggest/metadata edits only lived in the library
//   cache and NEVER reached the "txt file" the user inspects (storedTxt was
//   never updated) — the whole feature looked like a no-op.

import { Song } from '@/types/game';
import { generateUltraStarTxt } from '@/lib/parsers/ultrastar-parser';
import { StorageKeys, getString } from '@/lib/storage';

import { normalizeFilePath } from '@/lib/tauri-file-storage';

// Characters that are invalid in file paths on Windows
const INVALID_PATH_CHARS = /[<>:"/\\|?*]/g;

export interface SaveResult {
  success: boolean;
  message: string;
  path?: string;
}

/** True when running inside the Tauri desktop shell. */
function isTauriRuntime(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

/**
 * Browser fallback: store the regenerated txt content in the song's IndexedDB
 * media record (same record loadSongLyrics / getTxtContent read). Also flags
 * `storedTxt: true` so future loads find it.
 */
async function saveTxtToIndexedDb(song: Song, txtContent: string): Promise<SaveResult> {
  try {
    const { storeMedia } = await import('@/lib/db/media-db');
    const blob = new Blob([txtContent], { type: 'text/plain' });
    await storeMedia(song.id, 'txt', blob);

    // Keep the library entry consistent (storedTxt flag) — best-effort
    try {
      const { updateSong } = await import('@/lib/game/song-library');
      updateSong(song.id, { storedTxt: true });
    } catch { /* non-critical */ }

    return { success: true, message: 'Gespeichert (Browser-Speicher)' };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[SaveToFile] IndexedDB txt fallback failed:', error);
    return {
      success: false,
      message: 'Speichern im Browser-Speicher fehlgeschlagen',
    };
  }
}

// Save song to txt file
// Tauri: writes the original file. Browser: persists to IndexedDB.
export async function saveSongToTxt(song: Song): Promise<SaveResult> {
  try {
    // Generate txt content
    const txtContent = generateUltraStarTxt(song);

    // Get the songs folder from storage (normalized)
    const raw = getString(StorageKeys.SONGS_FOLDER);
    const songsFolder = raw ? normalizeFilePath(raw) : null;

    // ── Browser (or no songs folder configured): IndexedDB fallback ──
    // The web build has no filesystem — persisting only to the library cache
    // made AI-suggest/metadata edits invisible to the txt and they vanished
    // on the next rescan. The IndexedDB txt record IS the persistent txt here.
    if (!isTauriRuntime() || !songsFolder) {
      return await saveTxtToIndexedDb(song, txtContent);
    }

    // Determine the original file path
    let filePath: string | null = null;

    // Priority 1: Use relativeTxtPath (most reliable - stored during scan)
    if (song.relativeTxtPath) {
      // relativeTxtPath is relative to the songs folder (without root folder name)
      // Use centralized normalizeFilePath for consistent path construction
      filePath = `${normalizeFilePath(songsFolder)}/${normalizeFilePath(song.relativeTxtPath)}`;
    }
    // Priority 2: Use folderPath + constructed filename
    else if (song.folderPath) {
      filePath = `${normalizeFilePath(songsFolder)}/${normalizeFilePath(song.folderPath)}/${song.title.replace(INVALID_PATH_CHARS, '_')} - ${song.artist.replace(INVALID_PATH_CHARS, '_')}.txt`;
    }
    // Fallback: Ask user where to save (using native dialog)
    else {
      // eslint-disable-next-line no-console
      console.warn('[SaveToFile] No path info available, asking user...');
      const { nativePickFileSave } = await import('@/lib/native-fs');
      const userPath = await nativePickFileSave(
        'Save TXT file',
        'UltraStar TXT',
        ['txt']
      );

      if (!userPath) {
        return { success: false, message: 'Speichern abgebrochen' };
      }

      filePath = userPath;
    }

    if (!filePath) {
      return { success: false, message: 'Kein Dateipfad ermittelt' };
    }

    // Verify the file exists before writing (using native command)
    if (song.relativeTxtPath || song.folderPath) {
      const { nativeFileExists } = await import('@/lib/native-fs');
      const fileExists = await nativeFileExists(filePath);

      if (!fileExists) {
        // eslint-disable-next-line no-console
        console.warn('[SaveToFile] Original file does not exist:', filePath);
        // File doesn't exist - this might be a new file, that's OK
      }
    }

    // Write the file using native command (bypasses ACL)
    const { nativeWriteFileText } = await import('@/lib/native-fs');
    await nativeWriteFileText(filePath, txtContent);

    return { success: true, message: 'Datei gespeichert!', path: filePath };

  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[SaveToFile] Error saving song:', error);
    return {
      success: false,
      message: `Fehler beim Speichern: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`,
    };
  }
}
