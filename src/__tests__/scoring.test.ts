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

describe('Scoring system', () => {
  describe('scaleAccuracy()', () => {
    it('returns 0 for zero or negative accuracy', () => {
      expect(scaleAccuracy(0)).toBe(0);
      expect(scaleAccuracy(-0.5)).toBe(0);
    });

    it('returns 1 for accuracy >= 1', () => {
      expect(scaleAccuracy(1.0)).toBe(1);
      expect(scaleAccuracy(1.5)).toBe(1);
    });

    it('boosts low accuracy values (concave curve)', () => {
      // accuracy=0.1 -> ~0.25 (boosted), not 0.1
      const scaled = scaleAccuracy(0.1);
      expect(scaled).toBeGreaterThan(0.2);
      expect(scaled).toBeLessThan(0.3);
    });

    it('barely changes high accuracy values', () => {
      // accuracy=0.9 -> ~0.94 (slight boost)
      const scaled = scaleAccuracy(0.9);
      expect(scaled).toBeGreaterThan(0.9);
      expect(scaled).toBeLessThan(1.0);
    });

    it('follows the power curve formula', () => {
      expect(scaleAccuracy(0.5)).toBeCloseTo(Math.pow(0.5, ACCURACY_CURVE_EXPONENT), 4);
    });
  });

  describe('getComboFactor()', () => {
    it('returns 1.0 for combo=0 (no bonus)', () => {
      expect(getComboFactor(0, 2.0)).toBe(1.0);
    });

    it('returns full multiplier at combo=50', () => {
      expect(getComboFactor(50, 2.0)).toBe(2.0);
      expect(getComboFactor(100, 2.0)).toBe(2.0); // capped
    });

    it('ramps linearly from 1.0 to multiplier', () => {
      const f25 = getComboFactor(25, 2.0);
      expect(f25).toBeCloseTo(1.5, 2); // halfway = 1.5
    });

    it('respects different difficulty multipliers', () => {
      expect(getComboFactor(50, 1.5)).toBe(1.5); // Easy
      expect(getComboFactor(50, 2.5)).toBe(2.5); // Hard
    });
  });

  describe('calculateScoringMetadata()', () => {
    it('computes correct metadata for simple notes', () => {
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
      expect(result.pointsPerTick).toBeGreaterThan(0);
      expect(result.comboMultiplier).toBe(2.0); // medium
      expect(result.totalNotes).toBe(3);
    });

    it('handles golden notes correctly', () => {
      const notes = [
        { duration: 500, isGolden: true },
        { duration: 500, isGolden: false },
      ];
      const beatDuration = 125;
      const result = calculateScoringMetadata(notes, beatDuration);

      expect(result.goldenNoteTicks).toBe(4);
      expect(result.normalNoteTicks).toBe(4);
      expect(result.totalNoteTicks).toBe(8);
    });

    it('handles empty notes array', () => {
      const result = calculateScoringMetadata([], 125);
      expect(result.totalNoteTicks).toBe(0);
      expect(result.goldenNoteTicks).toBe(0);
      expect(result.normalNoteTicks).toBe(0);
      expect(result.perfectScoreBase).toBe(0);
      expect(result.pointsPerTick).toBe(1);
    });

    it('handles all golden notes', () => {
      const notes = [
        { duration: 1000, isGolden: true },
        { duration: 1000, isGolden: true },
      ];
      const beatDuration = 250;
      const result = calculateScoringMetadata(notes, beatDuration);

      expect(result.totalNoteTicks).toBe(8);
      expect(result.goldenNoteTicks).toBe(8);
      expect(result.normalNoteTicks).toBe(0);
    });

    it('perfectScoreBase reflects raw weight (2x normal, 10x golden)', () => {
      const notes = [
        { duration: 1000, isGolden: false }, // 4 ticks normal
        { duration: 1000, isGolden: true },  // 4 ticks golden
      ];
      const beatDuration = 250;
      const result = calculateScoringMetadata(notes, beatDuration);

      // perfectScoreBase = (4 * 2) + (4 * 10) = 48
      expect(result.perfectScoreBase).toBe(48);
    });

    it('minimum tick is 1 even for very short durations', () => {
      const notes = [{ duration: 1, isGolden: false }];
      const beatDuration = 5000;
      const result = calculateScoringMetadata(notes, beatDuration);
      expect(result.totalNoteTicks).toBe(1);
    });

    it('sets combo multiplier based on difficulty', () => {
      const notes = [{ duration: 500, isGolden: false }];
      const meta = calculateScoringMetadata(notes, 125, 'easy');
      expect(meta.comboMultiplier).toBe(1.5);

      const metaH = calculateScoringMetadata(notes, 125, 'hard');
      expect(metaH.comboMultiplier).toBe(2.5);
    });

    it('defaults to medium difficulty', () => {
      const notes = [{ duration: 500, isGolden: false }];
      const meta = calculateScoringMetadata(notes, 125);
      expect(meta.comboMultiplier).toBe(2.0);
    });
  });

  describe('calculateTickPoints()', () => {
    it('returns 0 for zero accuracy', () => {
      expect(calculateTickPoints(0, false, 10)).toBe(0);
    });

    it('returns 0 for negative accuracy', () => {
      expect(calculateTickPoints(-0.5, false, 10)).toBe(0);
    });

    it('returns correct points for normal note with full accuracy', () => {
      const pointsPerTick = 100;
      const expected = pointsPerTick * scaleAccuracy(1.0) * 2;
      expect(calculateTickPoints(1.0, false, pointsPerTick)).toBe(expected);
    });

    it('returns correct points for golden note with full accuracy', () => {
      const pointsPerTick = 100;
      const expected = pointsPerTick * scaleAccuracy(1.0) * 10;
      expect(calculateTickPoints(1.0, true, pointsPerTick)).toBe(expected);
    });

    it('applies power curve: low accuracy gives more than linear', () => {
      const pointsPerTick = 100;
      const fullPoints = calculateTickPoints(1.0, false, pointsPerTick);
      const lowAccPoints = calculateTickPoints(0.1, false, pointsPerTick);
      // Linear would give 10% of full. Power curve gives ~25%.
      expect(lowAccPoints).toBeGreaterThan(fullPoints * 0.2);
      expect(lowAccPoints).toBeLessThan(fullPoints * 0.3);
    });

    it('golden note multiplier is 5x the normal note multiplier', () => {
      const pointsPerTick = 50;
      const normalPoints = calculateTickPoints(1.0, false, pointsPerTick);
      const goldenPoints = calculateTickPoints(1.0, true, pointsPerTick);
      expect(goldenPoints).toBe(normalPoints * 5);
    });
  });

  describe('calculateNoteCompletionBonus()', () => {
    it('returns positive bonus for a normal note', () => {
      const meta = calculateScoringMetadata(
        [{ duration: 500, isGolden: false }],
        125,
        'medium',
      );
      const bonus = calculateNoteCompletionBonus({ totalTicks: 4, isGolden: false }, meta);
      expect(bonus).toBeGreaterThan(0);
    });

    it('golden note bonus is 5x normal note bonus', () => {
      const meta = calculateScoringMetadata(
        [{ duration: 500, isGolden: false }],
        125,
        'medium',
      );
      const normalBonus = calculateNoteCompletionBonus({ totalTicks: 4, isGolden: false }, meta);
      const goldenBonus = calculateNoteCompletionBonus({ totalTicks: 4, isGolden: true }, meta);
      expect(goldenBonus).toBe(normalBonus * 5);
    });
  });

  describe('calculateNoteConsolation()', () => {
    it('returns positive consolation for attempted but missed note', () => {
      const meta = calculateScoringMetadata(
        [{ duration: 500, isGolden: false }],
        125,
        'medium',
      );
      const consolation = calculateNoteConsolation({ totalTicks: 4, isGolden: false }, meta);
      expect(consolation).toBeGreaterThanOrEqual(1);
    });

    it('consolation is less than the note max points', () => {
      const meta = calculateScoringMetadata(
        [{ duration: 500, isGolden: false }],
        125,
        'medium',
      );
      const consolation = calculateNoteConsolation({ totalTicks: 4, isGolden: false }, meta);
      const noteMax = 4 * meta.pointsPerTick * 2; // 4 ticks * ppt * normal weight
      expect(consolation).toBeLessThan(noteMax);
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

    it('perfect game (tick points + combo + completion) sums to MAX_POINTS_PER_SONG', () => {
      const notes = Array.from({ length: 10 }, () => ({ duration: 500, isGolden: false }));
      const beatDuration = 125;
      const meta = calculateScoringMetadata(notes, beatDuration, 'medium');

      let total = 0;
      let combo = 0;
      for (let i = 0; i < meta.totalNoteTicks; i++) {
        combo++;
        const comboFactor = getComboFactor(combo, meta.comboMultiplier);
        const tickPts = calculateTickPoints(1.0, false, meta.pointsPerTick);
        total += Math.max(1, Math.round(tickPts * comboFactor));
      }
      // Add completion bonus for all notes
      for (const note of notes) {
        const ticksInNote = Math.max(1, Math.round(note.duration / beatDuration));
        total += calculateNoteCompletionBonus({ totalTicks: ticksInNote, isGolden: note.isGolden }, meta);
      }
      // Should be very close to 10000 (rounding + Math.max(1,...) may cause ±few points)
      expect(total).toBeCloseTo(MAX_POINTS_PER_SONG, -1);
    });

    it('perfect game on golden notes sums to MAX_POINTS_PER_SONG', () => {
      const notes = Array.from({ length: 5 }, () => ({ duration: 500, isGolden: true }));
      const beatDuration = 125;
      const meta = calculateScoringMetadata(notes, beatDuration, 'medium');

      let total = 0;
      let combo = 0;
      for (let i = 0; i < meta.totalNoteTicks; i++) {
        combo++;
        const comboFactor = getComboFactor(combo, meta.comboMultiplier);
        const tickPts = calculateTickPoints(1.0, true, meta.pointsPerTick);
        total += Math.max(1, Math.round(tickPts * comboFactor));
      }
      for (const note of notes) {
        const ticksInNote = Math.max(1, Math.round(note.duration / beatDuration));
        total += calculateNoteCompletionBonus({ totalTicks: ticksInNote, isGolden: true }, meta);
      }
      expect(total).toBeCloseTo(MAX_POINTS_PER_SONG, -1);
    });

    it('perfect game on mixed notes sums to MAX_POINTS_PER_SONG', () => {
      const notes = [
        { duration: 500, isGolden: false },
        { duration: 500, isGolden: true },
        { duration: 500, isGolden: false },
      ];
      const beatDuration = 125;
      const meta = calculateScoringMetadata(notes, beatDuration, 'medium');

      let total = 0;
      let combo = 0;
      for (const note of notes) {
        const ticksInNote = Math.max(1, Math.round(note.duration / beatDuration));
        for (let i = 0; i < ticksInNote; i++) {
          combo++;
          const comboFactor = getComboFactor(combo, meta.comboMultiplier);
          const tickPts = calculateTickPoints(1.0, note.isGolden, meta.pointsPerTick);
          total += Math.max(1, Math.round(tickPts * comboFactor));
        }
        total += calculateNoteCompletionBonus({ totalTicks: ticksInNote, isGolden: note.isGolden }, meta);
      }
      expect(total).toBeCloseTo(MAX_POINTS_PER_SONG, -1);
    });

    it('imperfect game scores less than MAX_POINTS_PER_SONG', () => {
      const notes = Array.from({ length: 10 }, () => ({ duration: 500, isGolden: false }));
      const beatDuration = 125;
      const meta = calculateScoringMetadata(notes, beatDuration, 'medium');

      let total = 0;
      let combo = 0;
      for (let i = 0; i < meta.totalNoteTicks; i++) {
        // Simulate 50% accuracy (alternate hit/miss)
        if (i % 2 === 0) {
          combo++;
          const comboFactor = getComboFactor(combo, meta.comboMultiplier);
          const tickPts = calculateTickPoints(0.7, false, meta.pointsPerTick); // 70% accuracy
          total += Math.max(1, Math.round(tickPts * comboFactor));
        } else {
          combo = 0; // miss resets combo
          // Missed notes get consolation
          total += calculateNoteConsolation({ totalTicks: 1, isGolden: false }, meta);
        }
      }
      // With 50% hit rate at 70% accuracy, should be well below 10000
      expect(total).toBeLessThan(MAX_POINTS_PER_SONG * 0.7);
    });
  });
});
