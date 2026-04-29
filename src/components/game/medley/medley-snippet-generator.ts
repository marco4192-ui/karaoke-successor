/**
 * Medley Contest — Snippet Generator
 *
 * Generates random MedleySong snippets with optional genre/language filtering.
 * Respects #MEDLEYSTARTBEAT / #MEDLEYENDBEAT tags.
 */

import type { Song } from '@/types/game';
import type { MedleySong } from './medley-types';

/** ms per beat for UltraStar timing */
const beatDurationMs = (bpm: number) => 15000 / bpm;

/**
 * Generate N random medley songs from the library.
 * Filters by genre/language if provided.
 * Songs must be longer than snippetDuration.
 */
export function generateMedleySnippets(
  allSongs: Song[],
  count: number,
  snippetDurationSec: number,
  genre?: string,
  language?: string,
): MedleySong[] {
  const snippetMs = snippetDurationSec * 1000;

  // Filter songs
  let candidates = allSongs.filter(s => s.duration > snippetMs);
  if (genre && genre !== 'all') {
    candidates = candidates.filter(s => s.genre?.toLowerCase().includes(genre.toLowerCase()));
  }
  if (language && language !== 'all') {
    candidates = candidates.filter(s => s.language === language);
  }

  // Shuffle and pick
  const shuffled = [...candidates].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, count);

  return selected.map(song => {
    // Priority 1: Both MEDLEYSTARTBEAT and MEDLEYENDBEAT defined
    if (song.medleyStartBeat !== undefined && song.medleyEndBeat !== undefined && song.bpm > 0) {
      const bd = beatDurationMs(song.bpm);
      const startTime = song.medleyStartBeat * bd;
      const endTime = song.medleyEndBeat * bd;
      return { song, startTime, endTime, duration: endTime - startTime };
    }

    // Priority 2: Only MEDLEYSTARTBEAT defined
    if (song.medleyStartBeat !== undefined && song.bpm > 0) {
      const bd = beatDurationMs(song.bpm);
      const startTime = song.medleyStartBeat * bd;
      return { song, startTime, endTime: startTime + snippetMs, duration: snippetMs };
    }

    // Priority 3: Random within note range
    const maxSafeTime = song.lyrics && song.lyrics.length > 0
      ? Math.max(...song.lyrics.map(l => l.endTime))
      : Math.min(song.duration, snippetMs * 3);
    const maxStartTime = Math.max(0, maxSafeTime - snippetMs);
    const startTime = Math.random() * maxStartTime;

    return {
      song,
      startTime,
      endTime: startTime + snippetMs,
      duration: snippetMs,
    };
  });
}

/**
 * Extract available genres/languages from song library for filter dropdowns.
 */
export function getAvailableGenres(songs: Song[]): string[] {
  const genres = new Set<string>();
  for (const s of songs) {
    if (s.genre) genres.add(s.genre);
  }
  return ['all', ...Array.from(genres).sort()];
}

export function getAvailableLanguages(songs: Song[]): string[] {
  const langs = new Set<string>();
  for (const s of songs) {
    if (s.language) langs.add(s.language);
  }
  return ['all', ...Array.from(langs).sort()];
}
