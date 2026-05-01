import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  generateMedleySnippets,
  getAvailableGenres,
  getAvailableLanguages,
} from '@/components/game/medley/medley-snippet-generator';
import type { Song } from '@/types/game';
import type { MedleySong } from '@/components/game/medley/medley-types';

// Mock Math.random for deterministic tests
const originalRandom = Math.random;

function createMockSong(overrides: Partial<Song> = {}): Song {
  return {
    id: 'song-1',
    title: 'Test Song',
    artist: 'Test Artist',
    bpm: 120,
    duration: 180000, // 3 minutes
    difficulty: 'medium',
    rating: 3,
    gap: 0,
    lyrics: [
      {
        id: 'line-0',
        text: 'Hello world',
        startTime: 10000,
        endTime: 20000,
        notes: [],
      },
      {
        id: 'line-1',
        text: 'Goodbye world',
        startTime: 30000,
        endTime: 40000,
        notes: [],
      },
    ],
    ...overrides,
  };
}

describe('Medley Snippet Generator', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('generateMedleySnippets()', () => {
    it('returns correct number of snippets', () => {
      const songs = [
        createMockSong({ id: 's1', duration: 180000 }),
        createMockSong({ id: 's2', duration: 180000 }),
        createMockSong({ id: 's3', duration: 180000 }),
      ];

      const result = generateMedleySnippets(songs, 3, 30);
      expect(result).toHaveLength(3);
    });

    it('returns fewer snippets than requested if not enough songs', () => {
      const songs = [
        createMockSong({ id: 's1', duration: 180000 }),
      ];

      const result = generateMedleySnippets(songs, 5, 30);
      expect(result).toHaveLength(1);
    });

    it('returns empty array when no songs available', () => {
      const result = generateMedleySnippets([], 3, 30);
      expect(result).toHaveLength(0);
    });

    it('filters out songs shorter than snippet duration', () => {
      const songs = [
        createMockSong({ id: 's1', duration: 10000 }), // shorter than 30s
        createMockSong({ id: 's2', duration: 60000 }), // longer than 30s
      ];

      const result = generateMedleySnippets(songs, 2, 30);
      expect(result).toHaveLength(1);
      expect(result[0].song.id).toBe('s2');
    });

    it('each snippet has the required properties', () => {
      const songs = [createMockSong({ duration: 120000 })];
      const result = generateMedleySnippets(songs, 1, 30);

      expect(result[0]).toHaveProperty('song');
      expect(result[0]).toHaveProperty('startTime');
      expect(result[0]).toHaveProperty('endTime');
      expect(result[0]).toHaveProperty('duration');
      expect(typeof result[0].startTime).toBe('number');
      expect(typeof result[0].endTime).toBe('number');
      expect(typeof result[0].duration).toBe('number');
    });

    it('snippet duration matches requested duration for random selection', () => {
      let callCount = 0;
      vi.spyOn(Math, 'random').mockImplementation(() => {
        callCount++;
        if (callCount === 1) return 0.5; // sort (pass)
        return 0.3; // startTime
      });

      const songs = [createMockSong({ duration: 120000, bpm: 120 })];
      const result = generateMedleySnippets(songs, 1, 20);

      // Without MEDLEYSTARTBEAT, the duration should be the snippet duration
      expect(result[0].duration).toBe(20000); // 20s * 1000
    });

    it('uses MEDLEYSTARTBEAT and MEDLEYENDBEAT when defined', () => {
      vi.spyOn(Math, 'random').mockImplementation(() => 0.5);

      const songs = [
        createMockSong({
          duration: 180000,
          bpm: 120,
          medleyStartBeat: 10,
          medleyEndBeat: 30,
        }),
      ];

      const result = generateMedleySnippets(songs, 1, 30);

      // beatDuration = 15000/120 = 125ms
      // startTime = 10 * 125 = 1250
      // endTime = min(30 * 125, 180000) = 3750
      expect(result[0].startTime).toBe(1250);
      expect(result[0].endTime).toBe(3750);
      expect(result[0].duration).toBe(2500);
    });

    it('uses only MEDLEYSTARTBEAT when end is not defined', () => {
      vi.spyOn(Math, 'random').mockImplementation(() => 0.5);

      const songs = [
        createMockSong({
          duration: 180000,
          bpm: 120,
          medleyStartBeat: 10,
        }),
      ];

      const result = generateMedleySnippets(songs, 1, 20);

      // beatDuration = 15000/120 = 125ms
      // startTime = 10 * 125 = 1250
      // endTime = 1250 + 20000 = 21250
      expect(result[0].startTime).toBe(1250);
      expect(result[0].endTime).toBe(21250);
    });

    it('snippets do not exceed song duration', () => {
      vi.spyOn(Math, 'random').mockImplementation(() => 0.5);

      const songs = [
        createMockSong({
          duration: 60000,
          bpm: 120,
          medleyStartBeat: 100,
          medleyEndBeat: 1000,
        }),
      ];

      const result = generateMedleySnippets(songs, 1, 30);
      // beatDuration = 125ms
      // medleyEnd = 1000 * 125 = 125000, but song duration is 60000
      // So endTime should be min(125000, 60000) = 60000
      expect(result[0].endTime).toBeLessThanOrEqual(60000);
    });

    it('startTime is non-negative', () => {
      vi.spyOn(Math, 'random').mockImplementation(() => 0.5);

      const songs = [createMockSong({ duration: 120000 })];
      const result = generateMedleySnippets(songs, 1, 20);

      expect(result[0].startTime).toBeGreaterThanOrEqual(0);
    });

    it('endTime > startTime', () => {
      vi.spyOn(Math, 'random').mockImplementation(() => 0.5);

      const songs = [createMockSong({ duration: 120000 })];
      const result = generateMedleySnippets(songs, 1, 20);

      expect(result[0].endTime).toBeGreaterThan(result[0].startTime);
    });
  });

  describe('genre filtering', () => {
    it('filters songs by genre', () => {
      vi.spyOn(Math, 'random').mockImplementation(() => 0.5);

      const songs = [
        createMockSong({ id: 's1', duration: 120000, genre: 'Pop' }),
        createMockSong({ id: 's2', duration: 120000, genre: 'Rock' }),
        createMockSong({ id: 's3', duration: 120000, genre: 'Pop' }),
      ];

      const result = generateMedleySnippets(songs, 5, 30, 'pop');
      expect(result).toHaveLength(2);
      expect(result.every(r => r.song.genre?.toLowerCase().includes('pop'))).toBe(true);
    });

    it('genre "all" passes all songs through', () => {
      vi.spyOn(Math, 'random').mockImplementation(() => 0.5);

      const songs = [
        createMockSong({ id: 's1', duration: 120000, genre: 'Pop' }),
        createMockSong({ id: 's2', duration: 120000, genre: 'Rock' }),
      ];

      const result = generateMedleySnippets(songs, 5, 30, 'all');
      expect(result).toHaveLength(2);
    });
  });

  describe('language filtering', () => {
    it('filters songs by language', () => {
      vi.spyOn(Math, 'random').mockImplementation(() => 0.5);

      const songs = [
        createMockSong({ id: 's1', duration: 120000, language: 'en' }),
        createMockSong({ id: 's2', duration: 120000, language: 'de' }),
        createMockSong({ id: 's3', duration: 120000, language: 'en' }),
      ];

      const result = generateMedleySnippets(songs, 5, 30, undefined, 'en');
      expect(result).toHaveLength(2);
      expect(result.every(r => r.song.language === 'en')).toBe(true);
    });
  });

  describe('getAvailableGenres()', () => {
    it('returns sorted unique genres with "all" first', () => {
      const songs = [
        createMockSong({ genre: 'Rock' }),
        createMockSong({ genre: 'Pop' }),
        createMockSong({ genre: 'Rock' }),
      ];

      const genres = getAvailableGenres(songs);
      expect(genres[0]).toBe('all');
      expect(genres).toContain('Pop');
      expect(genres).toContain('Rock');
    });

    it('handles songs without genre', () => {
      const songs = [
        createMockSong({ genre: undefined }),
        createMockSong({ genre: 'Jazz' }),
      ];

      const genres = getAvailableGenres(songs);
      expect(genres[0]).toBe('all');
      expect(genres).toContain('Jazz');
      expect(genres).toHaveLength(2);
    });

    it('returns only "all" for empty song list', () => {
      const genres = getAvailableGenres([]);
      expect(genres).toEqual(['all']);
    });
  });

  describe('getAvailableLanguages()', () => {
    it('returns sorted unique languages with "all" first', () => {
      const songs = [
        createMockSong({ language: 'en' }),
        createMockSong({ language: 'de' }),
        createMockSong({ language: 'en' }),
      ];

      const langs = getAvailableLanguages(songs);
      expect(langs[0]).toBe('all');
      expect(langs).toContain('de');
      expect(langs).toContain('en');
    });

    it('returns only "all" for empty song list', () => {
      const langs = getAvailableLanguages([]);
      expect(langs).toEqual(['all']);
    });
  });
});
