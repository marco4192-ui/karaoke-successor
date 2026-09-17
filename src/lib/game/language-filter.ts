/**
 * Shared LANGUAGE filter rules (user item: Rule-based Harmonization for
 * Language — "Die Regeln waren ja schon definiert").
 *
 * User rules:
 *  1. A song with MULTIPLE languages under #LANGUAGE: ("German/English",
 *     "de+en", "Deutsch & Englisch") appears under EVERY listed language in
 *     the filter dropdowns — never as a new combined "German/English" entry.
 *  2. Parenthetical additions ("English (US)", "German (with French
 *     chorus)") are ALWAYS removed — only the bare language counts.
 *  3. Languages with fewer than MIN_SONGS_FOR_OWN_LANGUAGE_ENTRY (5) songs
 *     are grouped under "Others". As soon as a language reaches 5 songs it
 *     automatically gets its own entry.
 *
 * Every language dropdown / filter in the app (Library, party setup,
 * medley setup, tournament) goes through these helpers so the rules behave
 * identically everywhere.
 */

import { Song } from '@/types/game';
import { normalizeLanguage } from '@/lib/parsers/meta-normalizer';

/** Filter entry that collects all languages below the own-entry threshold. */
export const LANGUAGE_FILTER_OTHERS = 'Others';

/** A language needs at least this many songs to get its own filter entry. */
export const MIN_SONGS_FOR_OWN_LANGUAGE_ENTRY = 5;

/**
 * Split a (possibly multilingual) #LANGUAGE: value into its canonical parts.
 * - Parenthetical additions are stripped first ("German (modern)" → "German").
 * - Separators: "/", "+", "&", "," — e.g. "German/English", "de+en",
 *   "Deutsch & Englisch", "German, English".
 * - Each part is normalized to its canonical name (alias map in
 *   meta-normalizer: "deutsch" → "German").
 * - Duplicates collapse; empty parts drop.
 */
export function splitLanguageParts(raw: string): string[] {
  const withoutParens = raw
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!withoutParens) return [];

  const seen = new Set<string>();
  const parts: string[] = [];
  for (const piece of withoutParens.split(/\s*[\/+&,]\s*/)) {
    const canonical = normalizeLanguage(piece.trim());
    if (!canonical) continue;
    const key = canonical.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      parts.push(canonical);
    }
  }
  return parts;
}

/**
 * Song count per canonical language. A multilingual song ("German/English")
 * counts for EVERY listed language — that is what makes it appear in both
 * filters (rule 1) and what feeds the 5-song threshold (rule 3).
 */
export function countSongsPerLanguage(songs: Song[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const s of songs) {
    if (!s.language) continue;
    for (const part of splitLanguageParts(s.language)) {
      counts.set(part, (counts.get(part) ?? 0) + 1);
    }
  }
  return counts;
}

/** Languages that reached the 5-song threshold (own filter entries). */
export function getBigLanguages(songs: Song[]): Set<string> {
  const big = new Set<string>();
  for (const [lang, count] of countSongsPerLanguage(songs)) {
    if (count >= MIN_SONGS_FOR_OWN_LANGUAGE_ENTRY) big.add(lang);
  }
  return big;
}

/**
 * Filter dropdown entries: every language with ≥ MIN_SONGS_FOR_OWN_LANGUAGE_ENTRY
 * songs (alphabetical), plus the "Others" bucket when at least one language
 * is below the threshold. Optionally prefixed with 'all'.
 */
export function getLanguageFilterEntries(songs: Song[], includeAll = true): string[] {
  const counts = countSongsPerLanguage(songs);
  const big: string[] = [];
  let smallCount = 0;
  for (const [lang, count] of counts) {
    if (count >= MIN_SONGS_FOR_OWN_LANGUAGE_ENTRY) big.push(lang);
    else smallCount++;
  }
  big.sort((a, b) => a.localeCompare(b));

  const entries: string[] = includeAll ? ['all', ...big] : big;
  if (smallCount > 0) entries.push(LANGUAGE_FILTER_OTHERS);
  return entries;
}

/**
 * Does a song match a language filter VALUE?
 * - 'all' → true.
 * - A concrete language → true when the song lists that language (a
 *   "German/English" song matches BOTH "German" and "English").
 * - 'Others' → true when the song has at least one language below the
 *   own-entry threshold (bigLanguages derived from the same song pool the
 *   dropdown was built from). Without threshold info, permissive.
 */
export function songMatchesLanguageFilter(
  song: Song,
  filterValue: string,
  bigLanguages?: Set<string>,
): boolean {
  if (filterValue === 'all') return true;
  if (!song.language) return false;

  const parts = splitLanguageParts(song.language);
  if (parts.length === 0) return false;

  if (filterValue === LANGUAGE_FILTER_OTHERS) {
    if (bigLanguages) return parts.some(p => !bigLanguages.has(p));
    return true;
  }

  const target = normalizeLanguage(filterValue);
  return parts.includes(target);
}
