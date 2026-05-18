/**
 * Medley Contest — Snippet Generator
 *
 * Generates random MedleySong snippets with optional genre/language filtering.
 * Respects #MEDLEYSTARTBEAT / #MEDLEYENDBEAT tags.
 *
 * Deduplication logic (Feature #3):
 * When the library has fewer unique songs than the requested snippet count,
 * we use all unique songs first, then allow repeats. Repeats are spaced
 * as far apart as possible by round-robin cycling through the candidate pool.
 * Each song tracks how many times it has been used to maximise spacing.
 *
 * Smart positioning (Feature #8):
 * When no MEDLEYSTARTBEAT/MEDLEYENDBEAT tags exist, we score potential
 * start positions based on note density, position in song (prefer 20–80%),
 * and avoidance of long instrumental gaps (>5 s without notes).
 */

import type { Song, LyricLine } from '@/types/game';
import type { MedleySong } from './medley-types';

/** ms per beat for UltraStar timing */
const beatDurationMs = (bpm: number) => 15000 / bpm;

// ===================== FEATURE #8: INTELLIGENT SNIPPET POSITIONING =====================

/**
 * Score a potential snippet start position (higher = better).
 *
 * Criteria:
 * - Note density: more notes in the snippet window → higher score
 * - Position: prefer 20–80 % of song length (avoids intros/outros)
 * - No long instrumental gap: penalise positions followed by >5 s without notes
 *
 * @returns A numeric score (0–1 range, normalised later).
 */
function scoreSnippetStart(
  startTime: number,
  endTime: number,
  notes: Array<{ startTime: number }>,
  songDuration: number,
): number {
  // 1) Note density — count notes within the window
  const notesInWindow = notes.filter(
    n => n.startTime >= startTime && n.startTime <= endTime,
  ).length;
  // Normalise to 0–1 (assume ~30 notes in 30 s is "full density")
  const densityScore = Math.min(1, notesInWindow / 30);

  // 2) Position score — bell curve peaking at 50 % of song
  const midPoint = startTime + (endTime - startTime) / 2;
  const relativePos = songDuration > 0 ? midPoint / songDuration : 0.5;
  // Gaussian-like: peak at 0.5, drops at edges
  const positionScore = Math.exp(-Math.pow((relativePos - 0.5) * 3, 2));

  // 3) Instrumental gap penalty — if next note is >5 s after startTime, penalise
  const nextNote = notes.find(n => n.startTime >= startTime);
  const gapPenalty =
    nextNote && nextNote.startTime - startTime > 5000
      ? -0.3
      : 0;

  // 4) Avoid first 10 seconds (intro)
  const introPenalty = startTime < 10000 ? -0.2 : 0;

  return densityScore * 0.5 + positionScore * 0.3 + gapPenalty + introPenalty;
}

/**
 * Find the lyric line with the most notes (heuristic for chorus detection).
 * Returns the line index, or -1 if no lyrics.
 */
function findChorusLine(lyrics: LyricLine[]): number {
  if (!lyrics.length) return -1;
  let bestIdx = 0;
  let bestCount = 0;
  for (let i = 0; i < lyrics.length; i++) {
    const count = lyrics[i].notes.length;
    if (count > bestCount) {
      bestCount = count;
      bestIdx = i;
    }
  }
  return bestIdx;
}

/**
 * Find the best snippet start time for a song when no MEDLEY tags exist.
 *
 * Strategy:
 * 1. Collect all note start times
 * 2. Slide a window of snippetDuration across the note range
 * 3. Score each position using `scoreSnippetStart`
 * 4. Pick the highest-scoring position
 * 5. If lyrics exist, bias towards the chorus (densest lyric line)
 */
export function findBestSnippetStart(
  song: Song,
  snippetMs: number,
): number {
  const notes = song.lyrics.flatMap(l => l.notes);
  if (notes.length === 0) return 10000; // fallback: 10 s

  // Find the effective note range
  const firstNoteTime = notes[0].startTime;
  const lastNoteTime = notes[notes.length - 1].startTime;
  const noteRangeEnd = lastNoteTime + 5000; // allow 5 s buffer after last note
  const maxStart = Math.max(firstNoteTime, noteRangeEnd - snippetMs);

  // If chorus is detected, also consider starting near the chorus
  const chorusIdx = findChorusLine(song.lyrics);
  const chorusStart = chorusIdx >= 0 ? song.lyrics[chorusIdx].startTime : -1;

  // Slide window in 2-second steps for performance
  const stepMs = 2000;
  let bestScore = -Infinity;
  let bestStart = firstNoteTime;

  for (let t = firstNoteTime; t <= maxStart; t += stepMs) {
    // Skip first 10 seconds (intro)
    if (t < 10000) continue;

    const score = scoreSnippetStart(t, t + snippetMs, notes, song.duration);

    // Bonus if near chorus
    if (chorusStart >= 0 && Math.abs(t - chorusStart) < snippetMs) {
      return chorusStart; // Just use the chorus start directly
    }

    if (score > bestScore) {
      bestScore = score;
      bestStart = t;
    }
  }

  return bestStart;
}

// ===================== MAIN GENERATOR =====================

/**
 * Pick songs from candidates, handling deduplication when library is small.
 *
 * When fewer unique songs exist than `count`:
 * - Use all unique songs first
 * - Then cycle through the pool, spacing repeats as far apart as possible
 */
function pickSongsWithDedup(candidates: Song[], count: number): Song[] {
  if (candidates.length === 0) return [];

  // Fisher-Yates shuffle
  const shuffled = [...candidates];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  if (shuffled.length >= count) {
    // Enough unique songs — no repeats needed
    return shuffled.slice(0, count);
  }

  // Not enough unique songs — use all, then repeat with max spacing
  const result: Song[] = [...shuffled];
  let useCount = new Map<string, number>();
  for (const s of shuffled) useCount.set(s.id, 1);

  while (result.length < count) {
    // Pick the song that has been used the LEAST (round-robin spacing)
    let bestSong = shuffled[0];
    let bestUsage = Infinity;
    for (const s of shuffled) {
      const usage = useCount.get(s.id) || 0;
      if (usage < bestUsage) {
        bestUsage = usage;
        bestSong = s;
      }
    }
    result.push(bestSong);
    useCount.set(bestSong.id, (useCount.get(bestSong.id) || 0) + 1);
  }

  return result;
}

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

  // Deduplication-aware selection (Feature #3)
  const selected = pickSongsWithDedup(candidates, count);

  return selected.map(song => {
    // Priority 1: Both MEDLEYSTARTBEAT and MEDLEYENDBEAT defined
    if (song.medleyStartBeat !== undefined && song.medleyEndBeat !== undefined && song.bpm > 0) {
      const bd = beatDurationMs(song.bpm);
      const startTime = (song.gap || 0) + song.medleyStartBeat * bd;
      const endTime = Math.min((song.gap || 0) + song.medleyEndBeat * bd, song.duration);
      return { song, startTime, endTime, duration: endTime - startTime };
    }

    // Priority 2: Only MEDLEYSTARTBEAT defined
    if (song.medleyStartBeat !== undefined && song.bpm > 0) {
      const bd = beatDurationMs(song.bpm);
      const startTime = (song.gap || 0) + song.medleyStartBeat * bd;
      const endTime = Math.min(startTime + snippetMs, song.duration);
      return { song, startTime, endTime, duration: endTime - startTime };
    }

    // Priority 3: Smart positioning (Feature #8)
    const startTime = findBestSnippetStart(song, snippetMs);
    const endTime = Math.min(startTime + snippetMs, song.duration);

    return {
      song,
      startTime,
      endTime,
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
