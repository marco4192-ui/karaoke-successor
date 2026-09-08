import { describe, it, expect } from 'vitest';
import { calculateScoringMetadata } from '@/lib/game/scoring';
import { expectedPointsPerTick } from '@/lib/leaderboard/anti-cheat-proof';

/**
 * Contract test: the points-per-tick the client computes via
 * calculateScoringMetadata must match what the server (anti-cheat.php,
 * mirrored here by expectedPointsPerTick) expects for the same claimed
 * tick counts. If either side changes its formula, this test breaks.
 */
describe('anti-cheat: points-per-tick consistency (client scoring vs server mirror)', () => {
  it('matches for a song with golden notes', () => {
    const notes = Array.from({ length: 50 }, (_, i) => ({ duration: 250, isGolden: i % 10 === 0 }));
    const meta = calculateScoringMetadata(notes, 125, 'medium', 10000);
    expect(meta.isFullScoring).toBe(true);
    expect(meta.totalNoteTicks).toBeGreaterThan(0);
    expect(meta.goldenNoteTicks).toBeGreaterThan(0);

    const expected = expectedPointsPerTick(meta.totalNoteTicks, meta.goldenNoteTicks, 10000);
    expect(meta.pointsPerTick).toBeCloseTo(expected, 6);
  });

  it('matches for a song without golden notes (golden pool redistributed to ticks)', () => {
    const notes = Array.from({ length: 40 }, () => ({ duration: 300, isGolden: false }));
    const meta = calculateScoringMetadata(notes, 125, 'medium', 10000);
    expect(meta.isFullScoring).toBe(true);

    const expected = expectedPointsPerTick(meta.totalNoteTicks, meta.goldenNoteTicks, 10000);
    expect(meta.pointsPerTick).toBeCloseTo(expected, 6);
    expect(meta.pointsPerTick).toBeCloseTo(8000 / meta.totalNoteTicks, 6);
  });

  it('server tolerance accepts the client value and rejects a fabricated one', () => {
    const notes = Array.from({ length: 30 }, (_, i) => ({ duration: 200, isGolden: i % 7 === 0 }));
    const meta = calculateScoringMetadata(notes, 125, 'medium', 10000);
    const expected = expectedPointsPerTick(meta.totalNoteTicks, meta.goldenNoteTicks, 10000);
    const tolerance = Math.max(expected * 0.01, 0.000001);

    expect(Math.abs(meta.pointsPerTick - expected)).toBeLessThanOrEqual(tolerance);

    const fabricated = expected * 2;
    expect(Math.abs(fabricated - expected)).toBeGreaterThan(tolerance);
  });
});
