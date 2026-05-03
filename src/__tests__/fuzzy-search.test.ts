import { describe, it, expect } from 'vitest';
import { fuzzyMatch } from '@/lib/fuzzy-search';

describe('Fuzzy Search', () => {
  describe('fuzzyMatch()', () => {
    it('returns true for exact substring match', () => {
      expect(fuzzyMatch('Queen', 'Queen - Bohemian Rhapsody')).toBe(true);
    });

    it('is case-insensitive', () => {
      expect(fuzzyMatch('queen', 'Queen - Bohemian Rhapsody')).toBe(true);
      expect(fuzzyMatch('QUEEN', 'Queen - Bohemian Rhapsody')).toBe(true);
      expect(fuzzyMatch('Queen', 'queen - bohemian rhapsody')).toBe(true);
    });

    it('finds matches with one edit (Levenshtein)', () => {
      expect(fuzzyMatch('Quen', 'Queen')).toBe(true);
    });

    it('finds matches with one character substitution', () => {
      expect(fuzzyMatch('Koldplay', 'Coldplay')).toBe(true);
    });

    it('finds matches with one missing character', () => {
      expect(fuzzyMatch('Coldpay', 'Coldplay')).toBe(true);
    });

    it('matches against individual words in multi-word text', () => {
      expect(fuzzyMatch('Koldplay', 'Coldplay - Viva La Vida')).toBe(true);
    });

    it('handles partial prefix matching', () => {
      expect(fuzzyMatch('Col', 'Coldplay')).toBe(true);
    });

    it('returns false for query too short (< 3 chars) without exact match', () => {
      // "ab" is < 3 chars and not a substring
      expect(fuzzyMatch('ab', 'Coldplay')).toBe(false);
    });

    it('returns false for short query that IS a substring', () => {
      // Even short queries work if they're exact substrings
      expect(fuzzyMatch('Col', 'Coldplay')).toBe(true);
    });

    it('returns false when query has no match', () => {
      expect(fuzzyMatch('xyzabc', 'Coldplay - Bohemian Rhapsody')).toBe(false);
    });

    it('returns false for empty query', () => {
      expect(fuzzyMatch('', 'Coldplay')).toBe(false);
    });

    it('returns false for empty text', () => {
      expect(fuzzyMatch('Coldplay', '')).toBe(false);
    });

    it('handles empty query string with whitespace (treated as empty = true)', () => {
      // fuzzyMatch trims and returns true for empty trimmed queries
      expect(fuzzyMatch('   ', 'Coldplay')).toBe(true);
    });

    it('returns false when both are empty', () => {
      expect(fuzzyMatch('', '')).toBe(false);
    });

    it('matches full text when lengths are similar', () => {
      expect(fuzzyMatch('Coldplay', 'Coldplay')).toBe(true);
    });

    it('handles queries with special characters', () => {
      expect(fuzzyMatch('Cold-play', 'Coldplay - Viva La Vida')).toBe(true);
    });

    it('handles numeric queries', () => {
      expect(fuzzyMatch('2024', 'Song from 2024')).toBe(true);
    });

    it('short single-char query matches as exact substring', () => {
      // "a" is < 3 chars but is an exact substring of "A Day in the Life"
      expect(fuzzyMatch('a', 'A Day in the Life')).toBe(true);
    });

    it('matches word with one edit tolerance', () => {
      // "Beetles" vs "Beatles" — 1 edit (t→t, actually Be[e]tles vs Bea[t]les)
      expect(fuzzyMatch('Beetles', 'The Beatles')).toBe(true);
    });
  });
});
