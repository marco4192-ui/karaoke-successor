/**
 * Rate my Song — Song Suggestions
 *
 * Suggests songs similar to the current one, prioritizing same genre.
 */

import { getAllSongs } from '@/lib/game/song-library';

// ── Types ──

export interface SongSuggestion {
  id: string;
  title: string;
  artist: string;
  genre: string;
}

// ── Helpers ──

/** Fisher-Yates shuffle (in-place) */
function shuffleArray<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

// ── Public API ──

/**
 * Get song suggestions similar to the current song.
 * Prioritizes same genre, then random others. Excludes the current song.
 */
export function getSongSuggestions(
  currentSongGenre: string,
  currentSongId: string,
  count: number = 5,
): SongSuggestion[] {
  const allSongs = getAllSongs();
  const normalizedGenre = currentSongGenre.trim().toLowerCase();

  // Separate into same-genre and other songs
  const sameGenre: SongSuggestion[] = [];
  const otherSongs: SongSuggestion[] = [];

  for (const song of allSongs) {
    if (song.id === currentSongId) continue;
    if (!song.title || !song.artist) continue;

    const songGenre = (song.genre || '').trim().toLowerCase();
    const entry: SongSuggestion = {
      id: song.id,
      title: song.title,
      artist: song.artist,
      genre: song.genre || 'Unknown',
    };

    if (normalizedGenre && songGenre === normalizedGenre) {
      sameGenre.push(entry);
    } else {
      otherSongs.push(entry);
    }
  }

  // Shuffle both arrays
  shuffleArray(sameGenre);
  shuffleArray(otherSongs);

  // Combine: prefer same genre, fill rest with other songs
  const combined = [...sameGenre, ...otherSongs];
  return combined.slice(0, count);
}
