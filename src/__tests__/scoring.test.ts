import { describe, it, expect } from 'vitest';
import {
  calculateTickPoints,
  calculateScoringMetadata,
  calculateNoteCompletionBonus,
  calculateNoteConsolation,
  evaluateTick,
  getComboFactor,
  scaleAccuracy,
  MAX_POINTS_PER_SONG,
  ACCURACY_CURVE_EXPONENT,
} from '@/lib/game/scoring';

describe('Scoring system (simplified: flat per-tick)', () => {
  describe('scaleAccuracy()', () => {
    it('returns accuracy unchanged (no-op in simplified scoring)', () => {
      expect(scaleAccuracy(0)).toBe(0);
      expect(scaleAccuracy(0.5)).toBe(0.5);
      expect(scaleAccuracy(1.0)).toBe(1);
    });
  });

  describe('getComboFactor()', () => {
    it('always returns 1 (no combo in simplified scoring)', () => {
      expect(getComboFactor(0, 2.0)).toBe(1);
      expect(getComboFactor(50, 2.0)).toBe(1);
      expect(getComboFactor(100, 2.5)).toBe(1);
    });
  });

  describe('calculateScoringMetadata()', () => {
    it('computes correct metadata for simple notes with default maxPoints=10000', () => {
      const notes = [
        { duration: 500, isGolden: false },
        { duration: 500, isGolden: false },
        { duration: 500, isGolden: false },
      ];
      const beatDuration = 125;
      const result = calculateScoringMetadata(notes, beatDuration, 'medium');

      expect(result.totalNoteTicks).toBe(12);
      expect(result.goldenNoteTicks).toBe(0);
      expect(result.normalNoteTicks).toBe(12);
      expect(result.pointsPerTick).toBeCloseTo(10000 / 12, 4);
      expect(result.comboMultiplier).toBe(1); // always 1
      expect(result.totalNotes).toBe(3);
    });

    it('handles golden notes correctly with 2× weighting', () => {
      const notes = [
        { duration: 500, isGolden: true },
        { duration: 500, isGolden: false },
      ];
      const beatDuration = 125;
      const result = calculateScoringMetadata(notes, beatDuration);

      // 4 golden ticks + 4 normal ticks
      // Effective total = 4 + 2*4 = 12
      expect(result.goldenNoteTicks).toBe(4);
      expect(result.normalNoteTicks).toBe(4);
      expect(result.totalNoteTicks).toBe(8);
      expect(result.pointsPerTick).toBeCloseTo(10000 / 12, 4);
      expect(result.goldenPointsPerTick).toBeCloseTo(10000 / 12 * 2, 4);
    });

    it('handles empty notes array', () => {
      const result = calculateScoringMetadata([], 125);
      expect(result.totalNoteTicks).toBe(0);
      expect(result.goldenNoteTicks).toBe(0);
      expect(result.normalNoteTicks).toBe(0);
      expect(result.perfectScoreBase).toBe(0);
      expect(result.pointsPerTick).toBe(1);
      expect(result.goldenPointsPerTick).toBe(2);
    });

    it('handles all golden notes', () => {
      const notes = [
        { duration: 1000, isGolden: true },
        { duration: 1000, isGolden: true },
      ];
      const beatDuration = 250;
      const result = calculateScoringMetadata(notes, beatDuration);

      // 8 golden ticks, 0 normal ticks
      // Effective total = 0 + 2*8 = 16
      expect(result.totalNoteTicks).toBe(8);
      expect(result.goldenNoteTicks).toBe(8);
      expect(result.normalNoteTicks).toBe(0);
      expect(result.pointsPerTick).toBeCloseTo(10000 / 16, 4);
      expect(result.goldenPointsPerTick).toBeCloseTo(10000 / 16 * 2, 4);
    });

    it('minimum tick is 1 even for very short durations', () => {
      const notes = [{ duration: 1, isGolden: false }];
      const beatDuration = 5000;
      const result = calculateScoringMetadata(notes, beatDuration);
      expect(result.totalNoteTicks).toBe(1);
    });

    it('supports custom maxPoints', () => {
      const notes = [
        { duration: 500, isGolden: false },
        { duration: 500, isGolden: false },
      ];
      const beatDuration = 125;
      const result = calculateScoringMetadata(notes, beatDuration, 'medium', 2000);

      // All normal notes — effective total = 8
      expect(result.totalNoteTicks).toBe(8);
      expect(result.pointsPerTick).toBeCloseTo(2000 / 8, 4);
    });
  });

  describe('calculateTickPoints()', () => {
    it('returns 0 for zero accuracy', () => {
      expect(calculateTickPoints(0, false, 10)).toBe(0);
    });

    it('returns 0 for negative accuracy', () => {
      expect(calculateTickPoints(-0.5, false, 10)).toBe(0);
    });

    it('returns accuracy * pointsPerTick for full accuracy', () => {
      const pointsPerTick = 100;
      expect(calculateTickPoints(1.0, false, pointsPerTick)).toBe(100);
    });

    it('applies 2× weighting via goldenPointsPerTick (caller responsibility)', () => {
      const pointsPerTick = 100;
      const goldenPointsPerTick = 200;
      expect(calculateTickPoints(1.0, false, pointsPerTick)).toBe(100);
      expect(calculateTickPoints(1.0, true, goldenPointsPerTick)).toBe(200);
    });

    it('returns min 1 point per hit', () => {
      // Very small accuracy * small pointsPerTick
      const points = calculateTickPoints(0.01, false, 0.5);
      expect(points).toBe(1);
    });

    it('no power curve — linear accuracy mapping', () => {
      const pointsPerTick = 1000;
      expect(calculateTickPoints(0.5, false, pointsPerTick)).toBe(500);
      expect(calculateTickPoints(0.1, false, pointsPerTick)).toBe(100);
    });
  });

  describe('calculateNoteCompletionBonus()', () => {
    it('always returns 0 (no completion bonus in simplified scoring)', () => {
      const meta = calculateScoringMetadata(
        [{ duration: 500, isGolden: false }],
        125,
        'medium',
      );
      expect(calculateNoteCompletionBonus({ totalTicks: 4, isGolden: false }, meta)).toBe(0);
      expect(calculateNoteCompletionBonus({ totalTicks: 4, isGolden: true }, meta)).toBe(0);
    });
  });

  describe('calculateNoteConsolation()', () => {
    it('always returns 0 (no consolation in simplified scoring)', () => {
      const meta = calculateScoringMetadata(
        [{ duration: 500, isGolden: false }],
        125,
        'medium',
      );
      expect(calculateNoteConsolation({ totalTicks: 4, isGolden: false }, meta)).toBe(0);
    });
  });

  describe('evaluateTick()', () => {
    it('returns Miss when pitch difference exceeds tolerance', () => {
      const result = evaluateTick(60, 67, 'medium');
      expect(result.displayType).toBe('Miss');
      expect(result.isHit).toBe(false);
      expect(result.accuracy).toBe(0);
    });

    it('returns a hit when pitch is exact match', () => {
      const result = evaluateTick(60, 60, 'medium');
      expect(result.isHit).toBe(true);
      expect(result.accuracy).toBe(1);
      expect(result.displayType).toBe('Perfect');
    });

    it('returns Great for close pitch on easy (not Perfect due to threshold)', () => {
      const result = evaluateTick(60, 60.5, 'easy');
      expect(result.isHit).toBe(true);
      expect(result.displayType).toBe('Great');
    });

    it('returns Perfect for exact match on hard', () => {
      const result = evaluateTick(60, 60, 'hard');
      expect(result.isHit).toBe(true);
      expect(result.displayType).toBe('Perfect');
    });

    it('wraps pitch classes correctly (octave invariance)', () => {
      const result = evaluateTick(72, 60, 'easy');
      expect(result.isHit).toBe(true);
      expect(result.accuracy).toBe(1);
    });

    it('respects difficulty tolerance levels', () => {
      const easyResult = evaluateTick(60, 63, 'easy');
      const hardResult = evaluateTick(60, 63, 'hard');
      expect(easyResult.isHit).toBe(true);
      expect(hardResult.isHit).toBe(false);
    });
  });

  describe('MAX_POINTS_PER_SONG invariant', () => {
    it('is 10000', () => {
      expect(MAX_POINTS_PER_SONG).toBe(10000);
    });

    it('perfect game sums to MAX_POINTS_PER_SONG (flat per-tick, no combo)', () => {
      const notes = Array.from({ length: 10 }, () => ({ duration: 500, isGolden: false }));
      const beatDuration = 125;
      const meta = calculateScoringMetadata(notes, beatDuration, 'medium');

      let total = 0;
      for (let i = 0; i < meta.totalNoteTicks; i++) {
        const tickPts = calculateTickPoints(1.0, false, meta.pointsPerTick);
        total += tickPts;
      }
      // Each tick at accuracy 1.0 = Math.max(1, Math.round(1.0 * pointsPerTick))
      // Sum should be very close to 10000 (rounding ±few points)
      expect(total).toBeCloseTo(MAX_POINTS_PER_SONG, -1);
    });

    it('perfect game on golden notes sums to MAX_POINTS_PER_SONG', () => {
      const notes = Array.from({ length: 5 }, () => ({ duration: 500, isGolden: true }));
      const beatDuration = 125;
      const meta = calculateScoringMetadata(notes, beatDuration, 'medium');

      // All golden: effective total = 2 * totalNoteTicks
      // goldenPointsPerTick = 2 * (10000 / effectiveTotal)
      // Each golden tick uses goldenPointsPerTick → sum = totalNoteTicks * goldenPointsPerTick = 10000
      let total = 0;
      for (let i = 0; i < meta.totalNoteTicks; i++) {
        total += calculateTickPoints(1.0, true, meta.goldenPointsPerTick);
      }
      expect(total).toBeCloseTo(MAX_POINTS_PER_SONG, -1);
    });

    it('imperfect game scores less than MAX_POINTS_PER_SONG', () => {
      const notes = Array.from({ length: 10 }, () => ({ duration: 500, isGolden: false }));
      const beatDuration = 125;
      const meta = calculateScoringMetadata(notes, beatDuration, 'medium');

      let total = 0;
      for (let i = 0; i < meta.totalNoteTicks; i++) {
        if (i % 2 === 0) {
          total += calculateTickPoints(0.7, false, meta.pointsPerTick);
        }
        // Misses score 0 — no consolation
      }
      expect(total).toBeLessThan(MAX_POINTS_PER_SONG * 0.5);
    });

    it('mixed golden + normal notes sum to MAX_POINTS_PER_SONG on perfect play', () => {
      // 3 normal notes + 2 golden notes, each 500ms, beatDuration=125ms → 4 ticks each
      const notes = [
        { duration: 500, isGolden: false },
        { duration: 500, isGolden: true },
        { duration: 500, isGolden: false },
        { duration: 500, isGolden: true },
        { duration: 500, isGolden: false },
      ];
      const beatDuration = 125;
      const meta = calculateScoringMetadata(notes, beatDuration, 'medium');

      // 12 normal + 8 golden = 20 total ticks
      // effective = 12 + 2*8 = 28
      expect(meta.normalNoteTicks).toBe(12);
      expect(meta.goldenNoteTicks).toBe(8);
      expect(meta.totalNoteTicks).toBe(20);

      let total = 0;
      // Simulate: first 12 ticks are normal, next 8 are golden
      for (let i = 0; i < 12; i++) {
        total += calculateTickPoints(1.0, false, meta.pointsPerTick);
      }
      for (let i = 0; i < 8; i++) {
        total += calculateTickPoints(1.0, true, meta.goldenPointsPerTick);
      }
      expect(total).toBeCloseTo(MAX_POINTS_PER_SONG, -1);
    });
  });
});
