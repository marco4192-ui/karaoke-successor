/**
 * Shared metadata→txt persistence for AI harmonize flows.
 *
 * The library entry alone is NOT enough: a folder rescan replaces the whole
 * library from the filesystem (replaceCustomSongs) — without writing
 * #GENRE:/#LANGUAGE:/#YEAR: to the source txt, AI-applied values are
 * silently wiped on the next rescan.
 *
 * Used by BOTH harmonize UIs (batch dialog in the editor screen + the
 * sidebar card) so they stay consistent.
 */

import { Song } from '@/types/game';
import { getSongByIdWithLyrics } from '@/lib/game/song-library';
import { saveSongToTxt } from '@/lib/editor/save-to-file';

export interface PersistResult {
  /** True when the txt file was written successfully. */
  success: boolean;
  /** True when nothing could be written because the song has no lyrics
   *  (needed to regenerate the txt) — reported as a file error. */
  noLyrics?: boolean;
}

/**
 * Persist a metadata update to the song's SOURCE txt file.
 * The song is loaded WITH lyrics first (IndexedDB cache, warmed by the
 * batch flow) because saveSongToTxt regenerates the full txt content.
 */
export async function persistSongMetadataToTxt(
  songId: string,
  updates: Partial<Song>,
): Promise<PersistResult> {
  try {
    const song = await getSongByIdWithLyrics(songId);
    if (!song || !song.lyrics || song.lyrics.length === 0) {
      return { success: false, noLyrics: true };
    }
    const updated = { ...song, ...updates };
    const result = await saveSongToTxt(updated);
    return { success: result.success };
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[PersistMetadata] Failed to persist metadata to txt:', e);
    return { success: false };
  }
}
