import { describe, it, expect } from 'vitest';
import { calculateScoringMetadata } from '@/lib/game/scoring';
import {
  expectedPointsPerTick,
  generateProofPackage,
  verifyIntegrityHash,
  verifyScorePlausibility,
  type ScoreProofPackage,
} from '@/lib/leaderboard/anti-cheat-proof';
import { toApiDifficulty } from '@/lib/api/leaderboard-service';
import type { Difficulty } from '@/types/game';

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

// ── R67: integrity-hash serialization contract (JS ↔ PHP) ──────────────

/**
 * PHP stringifies floats with precision=14 (%.14G-style, trailing zeros
 * stripped) while JS uses the shortest round-trip representation (up to 17
 * significant digits). The integrity hash only matches server-side when
 * both produce the SAME string — i.e. the JS string must not exceed 14
 * significant digits.
 */
function phpFloatString(x: number): string {
  if (Number.isInteger(x)) return String(x);
  let s = x.toPrecision(14);
  if (s.includes('.')) s = s.replace(/0+$/, '').replace(/\.$/, '');
  return s;
}

function jsPhpSerializationMatches(x: number): boolean {
  return String(x) === phpFloatString(x);
}

describe('anti-cheat: difficulty must enter the hash in API form (R67 fix A)', () => {
  it('toApiDifficulty maps the internal medium to normal (easy/hard are stable)', () => {
    const map: Record<Difficulty, 'easy' | 'normal' | 'hard'> = {
      easy: 'easy',
      medium: 'normal',
      hard: 'hard',
    };
    for (const [internal, api] of Object.entries(map)) {
      expect(toApiDifficulty(internal as Difficulty)).toBe(api);
    }
  });

  it('proof hashed with the API difficulty verifies against the API difficulty — and NOT against the raw medium', () => {
    const notes = Array.from({ length: 30 }, () => ({ duration: 200, isGolden: false }));
    const meta = calculateScoringMetadata(notes, 125, 'medium', 10000);
    const accuracy = Math.round((47 / 68) * 100 * 100) / 100; // 69.12 (rounded, R67 fix B)

    const proof = generateProofPackage({
      scoringMeta: {
        totalNotes: meta.totalNotes,
        totalNoteTicks: meta.totalNoteTicks,
        goldenNoteTicks: meta.goldenNoteTicks,
        normalNoteTicks: meta.normalNoteTicks,
        pointsPerTick: meta.pointsPerTick,
        comboMultiplier: 1,
      },
      noteResults: Array.from({ length: 47 }, (_, i) => ({
        noteIdx: i, ticksHit: 1, totalTicks: 1, isGolden: false, wasPerfect: false,
      })),
      score: 7421,
      accuracy,
      maxCombo: 33,
      notesHit: 47,
      notesMissed: 21,
      difficulty: 'normal', // API form — as submitted in the payload
      fingerprintVersion: 'v1',
    });

    // Server recomputes with the payload's difficulty ('normal') → matches.
    expect(
      verifyIntegrityHash(proof, { score: 7421, accuracy, maxCombo: 33, notesHit: 47, notesMissed: 21, difficulty: 'normal' }),
    ).toBe(true);

    // The OLD bug: hashing the raw internal 'medium' can never verify
    // against the payload's 'normal'.
    const oldStyleProof: ScoreProofPackage = { ...proof };
    expect(
      verifyIntegrityHash(oldStyleProof, { score: 7421, accuracy, maxCombo: 33, notesHit: 47, notesMissed: 21, difficulty: 'medium' }),
    ).toBe(false);
  });
});

describe('anti-cheat: accuracy must be PHP-serializable (R67 fix B)', () => {
  it('a raw notesHit/totalNotes ratio does NOT serialize identically in JS and PHP', () => {
    const raw = (47 / 68) * 100; // 69.11764705882354 — 16 significant digits
    expect(jsPhpSerializationMatches(raw)).toBe(false);
  });

  it('rounding to 2 decimal places makes every accuracy value PHP-safe', () => {
    // Sweep all hit ratios for a realistic range of total notes
    for (let total = 1; total <= 150; total++) {
      for (let hit = 0; hit <= total; hit++) {
        const rounded = Math.round((hit / total) * 100 * 100) / 100;
        if (!jsPhpSerializationMatches(rounded)) {
          throw new Error(`accuracy ${rounded} (hit=${hit}, total=${total}) is not PHP-serializable`);
        }
      }
    }
    expect(true).toBe(true);
  });
});

describe('anti-cheat: points_per_tick 8dp rounding is PHP-safe (R67)', () => {
  it('stays under 14 significant digits for every realistic tick count', () => {
    for (let ticks = 1; ticks <= 30000; ticks++) {
      for (const pool of [7000, 8000]) {
        const ppt = Math.round((pool / ticks) * 1e8) / 1e8;
        if (!jsPhpSerializationMatches(ppt)) {
          throw new Error(`ppt ${ppt} (ticks=${ticks}, pool=${pool}) is not PHP-serializable`);
        }
      }
    }
    expect(true).toBe(true);
  });
});

// ── R67 fix D: integrity hash must be STANDARD hex (PHP hash()-compatible) ──

describe('anti-cheat: integrity hash is standard unsigned hex (R67 fix D)', () => {
  it('produces 64 lowercase hex chars — no signed-word minus signs', async () => {
    const { createHash } = await import('node:crypto');
    const notes = Array.from({ length: 24 }, (_, i) => ({ duration: 400, isGolden: i % 6 === 0 }));
    const meta = calculateScoringMetadata(notes, 125, 'medium', 10000);
    const accuracy = Math.round((19 / 24) * 100 * 100) / 100;

    const proof = generateProofPackage({
      scoringMeta: {
        totalNotes: meta.totalNotes,
        totalNoteTicks: meta.totalNoteTicks,
        goldenNoteTicks: meta.goldenNoteTicks,
        normalNoteTicks: meta.normalNoteTicks,
        pointsPerTick: meta.pointsPerTick,
        comboMultiplier: 1,
      },
      noteResults: notes.map((_, i) => ({
        noteIdx: i, ticksHit: 1, totalTicks: 1, isGolden: false, wasPerfect: false,
      })),
      score: 1234,
      accuracy,
      maxCombo: 19,
      notesHit: 19,
      notesMissed: 5,
      difficulty: 'normal',
      fingerprintVersion: 'v1',
    });

    // (1) Format: exactly 64 chars of [0-9a-f] — the legacy signed-word
    // variant produced '-' characters (~99.6% of hashes) that PHP's
    // hash('sha256', …) can never emit.
    expect(proof.integrity_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(proof.chain_root).toMatch(/^[0-9a-f]{64}$/);

    // (2) Value: byte-identical to an independent SHA-256 implementation
    // over the exact join PHP recomputes — proving the client hash and the
    // server hash agree for the same input string.
    const phpJoinInput = [
      proof.total_note_ticks,
      proof.golden_note_ticks,
      proof.normal_note_ticks,
      proof.points_per_tick,
      proof.combo_multiplier,
      proof.total_notes,
      proof.max_possible_score,
      proof.chain_root,
      proof.chain_length,
      proof.proof_ts,
      1234, accuracy, 19, 19, 5, 'normal',
      proof.fingerprint_version,
    ].join('|');
    const expected = createHash('sha256').update(phpJoinInput, 'utf8').digest('hex');
    expect(proof.integrity_hash).toBe(expected);
  });
});

describe('anti-cheat: combo plausibility (R67 — combo is note-based, not hit-based)', () => {
  const makeProof = (totalNotes: number): ScoreProofPackage => ({
    total_note_ticks: totalNotes * 4,
    golden_note_ticks: 0,
    normal_note_ticks: totalNotes * 4,
    points_per_tick: Math.round((8000 / (totalNotes * 4)) * 1e8) / 1e8,
    combo_multiplier: 1,
    total_notes: totalNotes,
    max_possible_score: 10000,
    chain_root: 'a'.repeat(64),
    chain_length: Math.min(totalNotes, 200),
    proof_ts: Math.floor(Date.now() / 1000),
    integrity_hash: '0'.repeat(64),
    fingerprint_version: 'v1',
  });

  it('maxCombo may legitimately exceed notesHit (combo-complete short notes with 0 ticks hit)', () => {
    // 68 notes, 47 hit — but 50 combo-completed notes (3 short notes were
    // fully missed yet still combo-complete on easy). This was rejected as
    // combo_exceeds_hits before R67 — it must be valid now.
    const result = verifyScorePlausibility(7421, 10000, 69.12, 50, 47, 21, makeProof(68));
    expect(result.valid).toBe(true);
  });

  it('maxCombo beyond the total note count (5% tolerance) is still rejected', () => {
    const result = verifyScorePlausibility(7421, 10000, 69.12, 90, 47, 21, makeProof(68));
    expect(result).toEqual({ valid: false, reason: 'combo_exceeds_notes' });
  });

  it('maxCombo beyond the total tick count is still rejected', () => {
    const result = verifyScorePlausibility(7421, 10000, 69.12, 9999, 47, 21, makeProof(68));
    expect(result.valid).toBe(false);
  });
});
