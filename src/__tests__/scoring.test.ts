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
  calculateComboMultiplier,
  isNoteCompleteForCombo,
  createComboScoringState,
} from '@/lib/game/scoring';

describe('Scoring system (70% tick, 10% golden, 20% combo)', () => {
  describe('scaleAccuracy()', () => {
    it('returns accuracy unchanged (no-op)', () => {
      expect(scaleAccuracy(0)).toBe(0);
      expect(scaleAccuracy(0.5)).toBe(0.5);
      expect(scaleAccuracy(1.0)).toBe(1);
    });
  });

  describe('getComboFactor()', () => {
    it('always returns 1 (deprecated)', () => {
      expect(getComboFactor(0, 2.0)).toBe(1);
      expect(getComboFactor(50, 2.0)).toBe(1);
    });
  });

  describe('calculateScoringMetadata() — full scoring (10,000)', () => {
    it('splits 70/10/20 when golden notes exist', () => {
      const notes = [
        { duration: 500, isGolden: false },
        { duration: 500, isGolden: true },
      ];
      const beatDuration = 125;
      const result = calculateScoringMetadata(notes, beatDuration, 'medium', 10000);

      // 4 normal ticks + 4 golden ticks = 8 total
      expect(result.totalNoteTicks).toBe(8);
      expect(result.goldenNoteTicks).toBe(4);
      expect(result.normalNoteTicks).toBe(4);
      expect(result.totalNotes).toBe(2);
      expect(result.isFullScoring).toBe(true);

      // Tick pool: 7,000 across all 8 ticks
      expect(result.pointsPerTick).toBeCloseTo(7000 / 8, 4);
      // Golden: tick pool base + golden bonus (1000/4 = 250)
      expect(result.goldenPointsPerTick).toBeCloseTo(7000 / 8 + 250, 4);
      // Combo pool: 2,000
      expect(result.comboPoolMaxPoints).toBe(2000);
      expect(result.maxComboProgress).toBeGreaterThan(0);
    });

    it('redistributes golden pool to ticks when no golden notes', () => {
      const notes = [
        { duration: 500, isGolden: false },
        { duration: 500, isGolden: false },
      ];
      const beatDuration = 125;
      const result = calculateScoringMetadata(notes, beatDuration, 'medium', 10000);

      // 8 ticks, no golden
      expect(result.totalNoteTicks).toBe(8);
      expect(result.goldenNoteTicks).toBe(0);
      expect(result.isFullScoring).toBe(true);

      // Tick pool = 8,000 (70% + 10% redistributed)
      expect(result.pointsPerTick).toBeCloseTo(8000 / 8, 4);
      // goldenPointsPerTick = pointsPerTick + 0 (no golden bonus)
      expect(result.goldenPointsPerTick).toBeCloseTo(8000 / 8, 4);
      expect(result.comboPoolMaxPoints).toBe(2000);
    });

    it('handles empty notes array', () => {
      const result = calculateScoringMetadata([], 125);
      expect(result.totalNoteTicks).toBe(0);
      expect(result.pointsPerTick).toBe(1);
      expect(result.comboPoolMaxPoints).toBe(2000);
      expect(result.maxComboProgress).toBe(0);
    });

    it('handles all golden notes', () => {
      const notes = [
        { duration: 1000, isGolden: true },
        { duration: 1000, isGolden: true },
      ];
      const beatDuration = 250;
      const result = calculateScoringMetadata(notes, beatDuration);

      // 8 golden ticks
      expect(result.totalNoteTicks).toBe(8);
      expect(result.goldenNoteTicks).toBe(8);
      expect(result.pointsPerTick).toBeCloseTo(7000 / 8, 4);
      expect(result.goldenPointsPerTick).toBeCloseTo(7000 / 8 + 1000 / 8, 4);
    });

    it('minimum tick is 1 even for very short durations', () => {
      const result = calculateScoringMetadata([{ duration: 1, isGolden: false }], 5000);
      expect(result.totalNoteTicks).toBe(1);
    });
  });

  describe('calculateScoringMetadata() — party mode (2,000)', () => {
    it('uses simple tick scoring with golden 2x', () => {
      const notes = [
        { duration: 500, isGolden: true },
        { duration: 500, isGolden: false },
      ];
      const beatDuration = 125;
      const result = calculateScoringMetadata(notes, beatDuration, 'medium', 2000);

      expect(result.isFullScoring).toBe(false);
      expect(result.comboPoolMaxPoints).toBe(0);
      expect(result.maxComboProgress).toBe(0);

      // Old behavior: effective = 4 normal + 2*4 golden = 12
      expect(result.pointsPerTick).toBeCloseTo(2000 / 12, 4);
      expect(result.goldenPointsPerTick).toBeCloseTo(2000 / 12 * 2, 4);
    });
  });

  describe('calculateComboMultiplier()', () => {
    it('returns correct multipliers', () => {
      expect(calculateComboMultiplier(0)).toBe(1);
      expect(calculateComboMultiplier(4)).toBe(1);
      expect(calculateComboMultiplier(5)).toBe(1.25);
      expect(calculateComboMultiplier(9)).toBe(1.25);
      expect(calculateComboMultiplier(10)).toBe(1.5);
      expect(calculateComboMultiplier(14)).toBe(1.5);
      expect(calculateComboMultiplier(15)).toBe(1.75);
      expect(calculateComboMultiplier(19)).toBe(1.75);
      expect(calculateComboMultiplier(20)).toBe(2);
      expect(calculateComboMultiplier(100)).toBe(2);
    });
  });

  describe('isNoteCompleteForCombo()', () => {
    it('easy allows 2 missed ticks', () => {
      expect(isNoteCompleteForCombo(4, 4, 'easy')).toBe(true);
      expect(isNoteCompleteForCombo(2, 4, 'easy')).toBe(true);
      expect(isNoteCompleteForCombo(1, 4, 'easy')).toBe(false);
      expect(isNoteCompleteForCombo(0, 4, 'easy')).toBe(false);
    });

    it('medium allows 1 missed tick', () => {
      expect(isNoteCompleteForCombo(4, 4, 'medium')).toBe(true);
      expect(isNoteCompleteForCombo(3, 4, 'medium')).toBe(true);
      expect(isNoteCompleteForCombo(2, 4, 'medium')).toBe(false);
    });

    it('hard requires all ticks', () => {
      expect(isNoteCompleteForCombo(4, 4, 'hard')).toBe(true);
      expect(isNoteCompleteForCombo(3, 4, 'hard')).toBe(false);
    });

    it('handles single-tick notes', () => {
      expect(isNoteCompleteForCombo(1, 1, 'easy')).toBe(true);
      expect(isNoteCompleteForCombo(0, 1, 'easy')).toBe(true); // 0 missed ≤ 2
      expect(isNoteCompleteForCombo(0, 1, 'medium')).toBe(true); // 0 missed ≤ 1
      expect(isNoteCompleteForCombo(0, 1, 'hard')).toBe(false);
      expect(isNoteCompleteForCombo(1, 1, 'hard')).toBe(true);
    });
  });

  describe('createComboScoringState()', () => {
    it('creates fresh state', () => {
      const state = createComboScoringState();
      expect(state.comboNotes).toBe(0);
      expect(state.maxComboNotes).toBe(0);
      expect(state.earnedProgress).toBe(0);
      expect(state.lastComboScore).toBe(0);
    });
  });

  describe('calculateTickPoints()', () => {
    it('returns 0 for zero accuracy', () => {
      expect(calculateTickPoints(0, false, 10)).toBe(0);
    });
    it('returns accuracy * pointsPerTick', () => {
      expect(calculateTickPoints(1.0, false, 100)).toBe(100);
    });
    it('uses goldenPointsPerTick when passed (caller responsibility)', () => {
      expect(calculateTickPoints(1.0, false, 100)).toBe(100);
      expect(calculateTickPoints(1.0, true, 200)).toBe(200);
    });
    it('returns min 1 point per hit', () => {
      expect(calculateTickPoints(0.01, false, 0.5)).toBe(1);
    });
    it('linear accuracy mapping', () => {
      expect(calculateTickPoints(0.5, false, 1000)).toBe(500);
    });
  });

  describe('calculateNoteCompletionBonus()', () => {
    it('always returns 0 (deprecated)', () => {
      const meta = calculateScoringMetadata([{ duration: 500, isGolden: false }], 125);
      expect(calculateNoteCompletionBonus({ totalTicks: 4, isGolden: false }, meta)).toBe(0);
    });
  });

  describe('calculateNoteConsolation()', () => {
    it('always returns 0 (deprecated)', () => {
      const meta = calculateScoringMetadata([{ duration: 500, isGolden: false }], 125);
      expect(calculateNoteConsolation({ totalTicks: 4, isGolden: false }, meta)).toBe(0);
    });
  });

  describe('evaluateTick()', () => {
    it('returns Miss when pitch difference exceeds tolerance', () => {
      expect(evaluateTick(60, 67, 'medium').displayType).toBe('Miss');
    });
    it('returns Perfect for exact match', () => {
      const r = evaluateTick(60, 60, 'medium');
      expect(r.isHit).toBe(true);
      expect(r.displayType).toBe('Perfect');
    });
    it('wraps pitch classes correctly (octave invariance)', () => {
      const r = evaluateTick(72, 60, 'easy');
      expect(r.isHit).toBe(true);
      expect(r.accuracy).toBe(1);
    });
    it('respects difficulty tolerance levels', () => {
      expect(evaluateTick(60, 63, 'easy').isHit).toBe(true);
      expect(evaluateTick(60, 63, 'hard').isHit).toBe(false);
    });
  });

  describe('MAX_POINTS_PER_SONG invariant', () => {
    it('is 10000', () => {
      expect(MAX_POINTS_PER_SONG).toBe(10000);
    });

    it('perfect game (all ticks + combo) sums to ~10,000 — no golden', () => {
      const notes = Array.from({ length: 20 }, () => ({ duration: 500, isGolden: false }));
      const beatDuration = 125;
      const meta = calculateScoringMetadata(notes, beatDuration, 'medium');

      // Tick pool: 8,000 across 80 ticks = 100 per tick
      let tickTotal = 0;
      for (let i = 0; i < meta.totalNoteTicks; i++) {
        tickTotal += calculateTickPoints(1.0, false, meta.pointsPerTick);
      }
      expect(tickTotal).toBeCloseTo(8000, -1);

      // Combo: 20 notes completed → sum of multipliers = maxComboProgress
      // combo score = 2000 * (maxComboProgress / maxComboProgress) = 2000
      expect(meta.comboPoolMaxPoints).toBe(2000);

      const total = tickTotal + meta.comboPoolMaxPoints;
      expect(total).toBeCloseTo(MAX_POINTS_PER_SONG, -1);
    });

    it('perfect game with golden notes sums to ~10,000', () => {
      const notes = [
        ...Array.from({ length: 8 }, () => ({ duration: 500, isGolden: false })),
        ...Array.from({ length: 2 }, () => ({ duration: 500, isGolden: true })),
      ];
      const beatDuration = 125;
      const meta = calculateScoringMetadata(notes, beatDuration, 'medium');

      // 10 notes × 4 ticks = 40 ticks (32 normal, 8 golden)
      // Tick pool: 7,000 → pointsPerTick = 7000/40 = 175
      // Golden bonus: 1,000 / 8 = 125 → goldenPointsPerTick = 300
      let tickTotal = 0;
      for (let i = 0; i < 32; i++) {
        tickTotal += calculateTickPoints(1.0, false, meta.pointsPerTick);
      }
      for (let i = 0; i < 8; i++) {
        tickTotal += calculateTickPoints(1.0, true, meta.goldenPointsPerTick);
      }
      expect(tickTotal).toBeCloseTo(8000, -1); // 7000 + 1000

      const total = tickTotal + meta.comboPoolMaxPoints;
      expect(total).toBeCloseTo(MAX_POINTS_PER_SONG, -1);
    });

    it('imperfect game scores less than MAX_POINTS_PER_SONG', () => {
      const notes = Array.from({ length: 10 }, () => ({ duration: 500, isGolden: false }));
      const beatDuration = 125;
      const meta = calculateScoringMetadata(notes, beatDuration, 'medium');

      let tickTotal = 0;
      for (let i = 0; i < meta.totalNoteTicks; i++) {
        if (i % 2 === 0) {
          tickTotal += calculateTickPoints(0.7, false, meta.pointsPerTick);
        }
      }
      // Half ticks missed → less tick points + broken combo → less combo bonus
      expect(tickTotal).toBeLessThan(8000 * 0.5);
    });
  });

  describe('Combo progress bar calculation', () => {
    it('pre-calculates maxComboProgress correctly for 20 notes', () => {
      const notes = Array.from({ length: 20 }, () => ({ duration: 500, isGolden: false }));
      const meta = calculateScoringMetadata(notes, 125);

      // Notes 1-4: 1× each = 4
      // Notes 5-9: 1.25× each = 6.25
      // Notes 10-14: 1.5× each = 7.5
      // Notes 15-19: 1.75× each = 8.75
      // Note 20: 2× = 2
      const expected = 4 + 6.25 + 7.5 + 8.75 + 2;
      expect(meta.maxComboProgress).toBeCloseTo(expected, 4);
    });

    it('partial combo yields proportional score', () => {
      const notes = Array.from({ length: 20 }, () => ({ duration: 500, isGolden: false }));
      const meta = calculateScoringMetadata(notes, 125);

      // Simulate hitting only first 10 notes in sequence
      let progress = 0;
      for (let i = 1; i <= 10; i++) {
        progress += calculateComboMultiplier(i);
      }
      const comboScore = meta.comboPoolMaxPoints * (progress / meta.maxComboProgress);

      // Should be roughly half the combo pool
      expect(comboScore).toBeGreaterThan(500);
      expect(comboScore).toBeLessThan(1500);
    });
  });
});
