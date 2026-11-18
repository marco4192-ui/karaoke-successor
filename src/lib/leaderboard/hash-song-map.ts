/**
 * R72: map online song hashes back to local Song objects.
 *
 * The server only ever sees fingerprint hashes (copyright-safe); titles
 * live exclusively in the local library. This helper computes the v1
 * fingerprints of the local songs and returns hash → Song for every wanted
 * hash that matches. Bounded by library size — used by dialogs/cards
 * (rival comparison, online stats, recent plays), never hot paths.
 */

import { getAllSongs } from '@/lib/game/song-library';
import { songHashFromSong } from './song-fingerprint';
import type { Song } from '@/types/game';

export async function mapHashesToSongs(hashes: Iterable<string>): Promise<Map<string, Song>> {
  const wanted = new Set(hashes);
  const result = new Map<string, Song>();
  if (wanted.size === 0) return result;

  const songs = getAllSongs();
  for (const song of songs) {
    if (result.size >= wanted.size) break; // everything matched — stop hashing
    try {
      const sHash = songHashFromSong(song, 's');
      if (sHash && wanted.has(sHash)) result.set(sHash, song);
      // Duet boards live under a different fingerprint (game type is part
      // of the hash) — compute it as well so duet plays resolve too.
      const dHash = songHashFromSong(song, 'd');
      if (dHash && dHash !== sHash && wanted.has(dHash)) result.set(dHash, song);
    } catch {
      continue; // song without notes — no fingerprint
    }
  }
  return result;
}
