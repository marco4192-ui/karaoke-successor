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

  // Fisher-Yates shuffle and pick
  const shuffled = [...candidates];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const selected = shuffled.slice(0, count);

  return selected.map(song => {
    // Priority 1: Both MEDLEYSTARTBEAT and MEDLEYENDBEAT defined
    if (song.medleyStartBeat !== undefined && song.medleyEndBeat !== undefined && song.bpm > 0) {
      const bd = beatDurationMs(song.bpm);
      const startTime = song.medleyStartBeat * bd;
      const endTime = Math.min(song.medleyEndBeat * bd, song.duration);
      return { song, startTime, endTime, duration: endTime - startTime };
    }

    // Priority 2: Only MEDLEYSTARTBEAT defined
    if (song.medleyStartBeat !== undefined && song.bpm > 0) {
      const bd = beatDurationMs(song.bpm);
      const startTime = song.medleyStartBeat * bd;
      const endTime = Math.min(startTime + snippetMs, song.duration);
      return { song, startTime, endTime, duration: endTime - startTime };
    }

    // Priority 3: Random within note range
    const maxSafeTime = song.lyrics && song.lyrics.length > 0
      ? song.lyrics.reduce((max, l) => Math.max(max, l.endTime), 0)
      : Math.min(song.duration, snippetMs * 3);
    const maxStartTime = Math.max(0, maxSafeTime - snippetMs);
    const startTime = Math.random() * maxStartTime;

    return {
      song,
      startTime,
      endTime: Math.min(startTime + snippetMs, song.duration),
      duration: Math.min(snippetMs, song.duration - startTime),
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
