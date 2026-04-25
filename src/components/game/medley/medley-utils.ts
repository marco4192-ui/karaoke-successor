// ===================== MEDLEY SNIPPET GENERATION =====================

import type { Song } from '@/types/game';

export interface MedleySnippet {
  song: Song;
  startTime: number; // ms in the original song
  endTime: number;   // ms in the original song
  duration: number;  // ms
}

/** UltraStar beat duration formula: beatDuration = 15000 / BPM (ms per beat) */
const beatDurationMs = (bpm: number) => 15000 / bpm;

/**
 * Generate random medley snippets for a given count and duration.
 * Uses UltraStar #MEDLEYSTARTBEAT / #MEDLEYENDBEAT tags when available,
 * falls back to random start within the song's lyric range.
 */
export function generateMedleySnippets(
  songs: Song[],
  count: number,
  snippetDurationSec: number,
  languageFilter: string | null = null,
  genreFilter: string | null = null,
): MedleySnippet[] {
  const snippetDuration = snippetDurationSec * 1000; // convert to ms

  // Filter songs by language and genre if specified
  const eligible = songs.filter(s => {
    if (s.duration <= snippetDuration) return false;
    if (languageFilter && s.language && s.language !== languageFilter) return false;
    if (genreFilter && s.genre && s.genre !== genreFilter) return false;
    return true;
  });

  // Shuffle and take `count` songs
  const shuffled = [...eligible].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, count);

  return selected.map(song => {
    // Priority 1: Both #MEDLEYSTARTBEAT and #MEDLEYENDBEAT defined
    if (song.medleyStartBeat !== undefined && song.medleyEndBeat !== undefined && song.bpm > 0) {
      const bd = beatDurationMs(song.bpm);
      const startTime = song.medleyStartBeat * bd;
      const endTime = song.medleyEndBeat * bd;
      return { song, startTime, endTime, duration: endTime - startTime };
    }

    // Priority 2: Only #MEDLEYSTARTBEAT defined — play from there
    if (song.medleyStartBeat !== undefined && song.bpm > 0) {
      const bd = beatDurationMs(song.bpm);
      const startTime = song.medleyStartBeat * bd;
      return {
        song,
        startTime,
        endTime: startTime + snippetDuration,
        duration: snippetDuration,
      };
    }

    // Priority 3: Random start within the song's lyric range
    const maxSafeTime = song.lyrics && song.lyrics.length > 0
      ? Math.max(...song.lyrics.map(l => l.endTime))
      : Math.min(song.duration, snippetDuration * 3);
    const maxStartTime = Math.max(0, maxSafeTime - snippetDuration);
    const startTime = Math.random() * maxStartTime;

    return {
      song,
      startTime,
      endTime: startTime + snippetDuration,
      duration: snippetDuration,
    };
  });
}

/**
 * Get available languages from the song library.
 */
export function getAvailableLanguages(songs: Song[]): string[] {
  const langs = new Set<string>();
  for (const s of songs) {
    if (s.language) langs.add(s.language);
  }
  return Array.from(langs).sort();
}

/**
 * Get available genres from the song library.
 */
export function getAvailableGenres(songs: Song[]): string[] {
  const genres = new Set<string>();
  for (const s of songs) {
    if (s.genre) genres.add(s.genre);
  }
  return Array.from(genres).sort();
}

/** Display-friendly language names */
export const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English', de: 'Deutsch', es: 'Español', fr: 'Français',
  it: 'Italiano', pt: 'Português', ja: '日本語', ko: '한국어',
  zh: '中文', nl: 'Nederlands', pl: 'Polski', ru: 'Русский',
  sv: 'Svenska', tr: 'Türkçe', ar: 'العربية', hi: 'हिन्दी',
  da: 'Dansk', fi: 'Suomi', no: 'Norsk', cs: 'Čeština',
  hu: 'Magyar', ro: 'Română', th: 'ไทย', vi: 'Tiếng Việt',
  id: 'Bahasa Indonesia', ms: 'Bahasa Melayu', tl: 'Filipino',
  uk: 'Українська', he: 'עברית', el: 'Ελληνικά', bg: 'Български',
};
