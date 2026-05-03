import { describe, it, expect } from 'vitest';
import {
  getLevelForXP,
  getRankForXP,
  calculateSongXP,
} from '@/lib/game/player-progression';

describe('Player Progression System', () => {
  describe('getLevelForXP()', () => {
    it('returns level 1 for 0 XP', () => {
      const result = getLevelForXP(0);
      expect(result.level).toBe(1);
      expect(result.currentXP).toBe(0);
      expect(result.progress).toBe(0);
    });

    it('returns level 1 for XP less than 500', () => {
      const result = getLevelForXP(249);
      expect(result.level).toBe(1);
      expect(result.progress).toBeCloseTo(49.8, 0);
    });

    it('returns level 2 for exactly 500 XP', () => {
      const result = getLevelForXP(500);
      expect(result.level).toBe(2);
      expect(result.progress).toBe(0);
    });

    it('calculates progress correctly within a level', () => {
      const result = getLevelForXP(750);
      // Tier 1: 500 XP per level. Level 2 starts at 500, ends at 1000
      // Progress = (750 - 500) / 500 * 100 = 50%
      expect(result.level).toBe(2);
      expect(result.progress).toBe(50);
    });

    it('transitions to tier 2 at level 10 (4500 XP)', () => {
      // Levels 1-9: 500 XP each = 4500 XP total
      const result = getLevelForXP(4500);
      expect(result.level).toBe(10);
      expect(result.progress).toBe(0);
    });

    it('uses 1000 XP per level for tier 2 (levels 10-24)', () => {
      // Level 10 starts at 4500 XP, each level costs 1000 XP
      // Level 11 starts at 5500, level 12 starts at 6500
      const result = getLevelForXP(6000);
      expect(result.level).toBe(11);
      expect(result.progress).toBe(50); // (6000-5500)/1000 * 100 = 50%
    });

    it('transitions to tier 3 at level 25 (19500 XP)', () => {
      // T1: 9 levels * 500 = 4500
      // T2: 15 levels * 1000 = 15000
      // Total: 19500
      const result = getLevelForXP(19500);
      expect(result.level).toBe(25);
      expect(result.progress).toBe(0);
    });

    it('returns progress clamped between 0 and 100', () => {
      const low = getLevelForXP(0);
      expect(low.progress).toBeGreaterThanOrEqual(0);
      expect(low.progress).toBeLessThanOrEqual(100);
    });

    it('handles negative XP as 0', () => {
      const result = getLevelForXP(-100);
      expect(result.level).toBe(1);
      expect(result.currentXP).toBe(0);
    });

    it('handles NaN as 0', () => {
      const result = getLevelForXP(NaN);
      expect(result.level).toBe(1);
    });

    it('handles very high XP without infinite loop', () => {
      const result = getLevelForXP(999999999);
      expect(result.level).toBeGreaterThan(1);
      expect(result.progress).toBeLessThanOrEqual(100);
      // Should complete within reasonable time (no infinite loop)
    });

    it('returns correct nextLevelXP', () => {
      const result = getLevelForXP(0);
      expect(result.nextLevelXP).toBe(500);
    });
  });

  describe('getRankForXP()', () => {
    it('returns beginner rank for 0 XP', () => {
      const rank = getRankForXP(0);
      expect(rank.id).toBe('beginner');
      expect(rank.name).toBe('Beginner');
    });

    it('returns novice rank for 500 XP', () => {
      const rank = getRankForXP(500);
      expect(rank.id).toBe('novice');
    });

    it('returns apprentice rank for 1500 XP', () => {
      const rank = getRankForXP(1500);
      expect(rank.id).toBe('apprentice');
    });

    it('returns singer rank for 3000 XP', () => {
      const rank = getRankForXP(3000);
      expect(rank.id).toBe('singer');
    });

    it('returns legend rank for 25000 XP', () => {
      const rank = getRankForXP(25000);
      expect(rank.id).toBe('legend');
    });

    it('returns divine rank for 200000 XP', () => {
      const rank = getRankForXP(200000);
      expect(rank.id).toBe('divine');
    });

    it('returns beginner for very low XP', () => {
      const rank = getRankForXP(10);
      expect(rank.id).toBe('beginner');
    });

    it('each rank has required properties', () => {
      const rank = getRankForXP(0);
      expect(rank).toHaveProperty('id');
      expect(rank).toHaveProperty('name');
      expect(rank).toHaveProperty('icon');
      expect(rank).toHaveProperty('minXP');
      expect(rank).toHaveProperty('maxXP');
      expect(rank).toHaveProperty('color');
      expect(rank).toHaveProperty('titles');
    });
  });

  describe('calculateSongXP()', () => {
    it('returns base XP for a completed song', () => {
      const xp = calculateSongXP(0, 0, 0, 0, 0);
      expect(xp).toBe(50); // SONG_COMPLETE base
    });

    it('adds accuracy bonus for perfect accuracy', () => {
      const xp = calculateSongXP(10000, 100, 0, 0, 0);
      expect(xp).toBe(200); // 50 base + 150 perfect bonus
    });

    it('adds accuracy bonus for excellent accuracy (95+)', () => {
      const xp = calculateSongXP(9000, 95, 0, 0, 0);
      expect(xp).toBe(125); // 50 base + 75 excellent bonus
    });

    it('does not add accuracy bonus below 95', () => {
      const xp = calculateSongXP(8000, 94, 0, 0, 0);
      expect(xp).toBe(50); // 50 base only
    });

    it('adds XP for perfect notes', () => {
      const xp = calculateSongXP(0, 0, 0, 10, 0);
      expect(xp).toBe(70); // 50 base + (10 * 2)
    });

    it('adds XP for golden notes', () => {
      const xp = calculateSongXP(0, 0, 0, 0, 5);
      expect(xp).toBe(100); // 50 base + (5 * 10)
    });

    it('adds combo milestone XP for 50+ combo', () => {
      const xp = calculateSongXP(0, 0, 50, 0, 0);
      expect(xp).toBe(75); // 50 base + 25 combo milestone
    });

    it('adds combo milestone XP for 100+ combo', () => {
      const xp = calculateSongXP(0, 0, 100, 0, 0);
      expect(xp).toBe(100); // 50 base + 50 combo milestone
    });

    it('adds combo milestone XP for 200+ combo', () => {
      const xp = calculateSongXP(0, 0, 200, 0, 0);
      expect(xp).toBe(150); // 50 base + 100 combo milestone
    });

    it('does not give combo bonus below 50', () => {
      const xp = calculateSongXP(0, 0, 49, 0, 0);
      expect(xp).toBe(50); // 50 base only
    });

    it('adds challenge mode bonus', () => {
      const xp = calculateSongXP(0, 0, 0, 0, 0, 'blind-audition');
      expect(xp).toBe(250); // 50 base + 200 challenge bonus
    });

    it('ignores unknown challenge mode', () => {
      const xp = calculateSongXP(0, 0, 0, 0, 0, 'nonexistent-challenge');
      expect(xp).toBe(50); // 50 base only
    });

    it('combines all XP sources correctly', () => {
      // Perfect accuracy, 5 perfect notes, 2 golden notes, 100 combo, blind-audition challenge
      const xp = calculateSongXP(10000, 100, 100, 5, 2, 'blind-audition');
      // 50 (base) + 150 (perfect) + 10 (5*2 perfect notes) + 20 (2*10 golden) + 50 (100 combo) + 200 (challenge)
      expect(xp).toBe(480);
    });

    it('returns rounded integer', () => {
      const xp = calculateSongXP(5000, 50.5, 10, 3, 1);
      expect(Number.isInteger(xp)).toBe(true);
    });
  });
});
