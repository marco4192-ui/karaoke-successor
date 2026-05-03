import { describe, it, expect } from 'vitest';
import {
  calculateTickPoints,
  calculateScoringMetadata,
  evaluateTick,
  MAX_POINTS_PER_SONG,
} from '@/lib/game/scoring';

describe('Scoring system', () => {
  describe('calculateScoringMetadata()', () => {
    it('computes correct metadata for simple notes', () => {
      const notes = [
        { duration: 500, isGolden: false },
        { duration: 500, isGolden: false },
        { duration: 500, isGolden: false },
      ];
      const beatDuration = 125; // 500ms per beat at 120 BPM (UltraStar formula: 15000/120)
      const result = calculateScoringMetadata(notes, beatDuration);

      // Each note duration / beatDuration = ticks
      // 500/125 = 4 ticks per note, 12 total
      expect(result.totalNoteTicks).toBe(12);
      expect(result.goldenNoteTicks).toBe(0);
      expect(result.normalNoteTicks).toBe(12);
      expect(result.pointsPerTick).toBeGreaterThan(0);
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
      expect(result.pointsPerTick).toBe(1); // fallback
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

    it('perfectScoreBase uses correct multipliers (2x normal, 10x golden)', () => {
      const notes = [
        { duration: 1000, isGolden: false }, // 4 ticks normal
        { duration: 1000, isGolden: true },  // 4 ticks golden
      ];
      const beatDuration = 250;
      const result = calculateScoringMetadata(notes, beatDuration);

      // perfectScoreBase = (4 * 2) + (4 * 10) = 8 + 40 = 48
      expect(result.perfectScoreBase).toBe(48);
      // pointsPerTick = 10000 / 48
      expect(result.pointsPerTick).toBeCloseTo(MAX_POINTS_PER_SONG / 48);
    });

    it('minimum tick is 1 even for very short durations', () => {
      const notes = [
        { duration: 1, isGolden: false },
      ];
      const beatDuration = 5000; // very long beat duration
      const result = calculateScoringMetadata(notes, beatDuration);

      expect(result.totalNoteTicks).toBe(1);
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
      // multiplier = 2 for normal notes
      const expected = pointsPerTick * 1.0 * 2;
      expect(calculateTickPoints(1.0, false, pointsPerTick)).toBe(expected);
    });

    it('returns correct points for golden note with full accuracy', () => {
      const pointsPerTick = 100;
      // multiplier = 10 for golden notes
      const expected = pointsPerTick * 1.0 * 10;
      expect(calculateTickPoints(1.0, true, pointsPerTick)).toBe(expected);
    });

    it('scales points by accuracy', () => {
      const pointsPerTick = 100;
      const fullPoints = calculateTickPoints(1.0, false, pointsPerTick);
      const halfPoints = calculateTickPoints(0.5, false, pointsPerTick);
      expect(halfPoints).toBe(fullPoints / 2);
    });

    it('golden note multiplier is 5x the normal note multiplier', () => {
      const pointsPerTick = 50;
      const normalPoints = calculateTickPoints(1.0, false, pointsPerTick);
      const goldenPoints = calculateTickPoints(1.0, true, pointsPerTick);
      expect(goldenPoints).toBe(normalPoints * 5); // 10/2 = 5
    });
  });

  describe('evaluateTick()', () => {
    it('returns Miss when pitch difference exceeds tolerance', () => {
      const result = evaluateTick(60, 67, 'medium'); // 7 semitones diff, tolerance is 2
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
      // MIDI 60 (C4) → pitch class 0, MIDI 60.5 rounds to 61 → pitch class 1
      // Relative diff = 1, tolerance = 3, accuracy = 1 - 1/3 = 0.667
      // Easy thresholds: perfect > 0.85, great > 0.6
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
      // MIDI 60 (C4) and MIDI 72 (C5) should have 0 difference
      const result = evaluateTick(72, 60, 'easy');
      expect(result.isHit).toBe(true);
      expect(result.accuracy).toBe(1);
    });

    it('respects difficulty tolerance levels', () => {
      // Easy has tolerance 3, hard has tolerance 1
      const easyResult = evaluateTick(60, 63, 'easy'); // 3 semitones
      const hardResult = evaluateTick(60, 63, 'hard'); // 3 semitones

      expect(easyResult.isHit).toBe(true); // within easy tolerance
      expect(hardResult.isHit).toBe(false); // exceeds hard tolerance
    });
  });

  describe('MAX_POINTS_PER_SONG invariant', () => {
    it('is 10000', () => {
      expect(MAX_POINTS_PER_SONG).toBe(10000);
    });

    it('perfect game on all-normal notes sums to MAX_POINTS_PER_SONG', () => {
      const notes = Array.from({ length: 10 }, () => ({ duration: 500, isGolden: false }));
      const beatDuration = 125;
      const meta = calculateScoringMetadata(notes, beatDuration);

      let total = 0;
      for (let i = 0; i < meta.totalNoteTicks; i++) {
        total += calculateTickPoints(1.0, false, meta.pointsPerTick);
      }
      expect(total).toBeCloseTo(MAX_POINTS_PER_SONG, 0);
    });

    it('perfect game on all-golden notes sums to MAX_POINTS_PER_SONG', () => {
      const notes = Array.from({ length: 5 }, () => ({ duration: 500, isGolden: true }));
      const beatDuration = 125;
      const meta = calculateScoringMetadata(notes, beatDuration);

      let total = 0;
      for (let i = 0; i < meta.totalNoteTicks; i++) {
        total += calculateTickPoints(1.0, true, meta.pointsPerTick);
      }
      expect(total).toBeCloseTo(MAX_POINTS_PER_SONG, 0);
    });

    it('perfect game on mixed notes sums to MAX_POINTS_PER_SONG', () => {
      const notes = [
        { duration: 500, isGolden: false },
        { duration: 500, isGolden: true },
        { duration: 500, isGolden: false },
      ];
      const beatDuration = 125;
      const meta = calculateScoringMetadata(notes, beatDuration);

      let total = 0;
      let tickIndex = 0;
      for (const note of notes) {
        const ticksInNote = Math.max(1, Math.round(note.duration / beatDuration));
        for (let i = 0; i < ticksInNote; i++) {
          total += calculateTickPoints(1.0, note.isGolden, meta.pointsPerTick);
          tickIndex++;
        }
      }
      expect(total).toBeCloseTo(MAX_POINTS_PER_SONG, 0);
    });
  });
});
