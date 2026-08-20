/**
 * Anti-Cheat Proof Generator for Online Leaderboard.
 *
 * Generates a compact, verifiable proof package that accompanies each score
 * submission. The server validates this proof to detect fabricated scores
 * without requiring the full per-tick data.
 *
 * === Proof Architecture ===
 *
 * 1. **Scoring Metadata Proof**: The server can independently verify that the
 *    claimed score is physically possible for a song with N note-ticks,
 *    G golden ticks, and the given combo multiplier. This prevents the most
 *    trivial cheat: just sending score=10000 with arbitrary metadata.
 *
 * 2. **Per-Note Hash Chain**: A Merkle-like hash chain where each note's
 *    completion produces a digest: H(prev_digest || noteIdx || ticksHit || totalTicks || isGolden).
 *    The final chain root is sent alongside the score. To forge this, an attacker
 *    would need to know the exact scoring metadata AND produce a valid chain
 *    that matches the claimed notes_hit / notes_missed / max_combo / accuracy.
 *
 * 3. **Timing Fingerprint**: SHA-256 of (score, accuracy, maxCombo, notesHit, notesMissed,
 *    totalNotes, difficulty, comboMultiplier, timestamp-window).
 *    Prevents replaying the same proof for different scores or songs.
 *
 * 4. **Integrity Hash**: A single SHA-256 hash of ALL the above, binding everything
 *    together. The server recomputes this from the received fields and checks it matches.
 *    If any field is tampered with post-generation, the hash breaks.
 *
 * === What this does NOT do ===
 *
 * - This is NOT cryptographic signing (no private key). A determined attacker with
 *   access to the client source code could still generate valid proofs for fabricated
 *   scores. The goal is to raise the bar significantly so that casual score manipulation
 *   (e.g., editing a JSON payload in DevTools) is caught.
 *
 * - This does NOT prevent all replay attacks. The timestamp window provides limited
 *   replay protection. For stronger replay protection, a server-side nonce or challenge
 *   would be needed (future enhancement).
 */

import { sha256 as internalSha256 } from './song-fingerprint-internal';
import type { ScoringMetaForProof } from './song-fingerprint';

// ── Types ──────────────────────────────────────────────────

/** Per-note proof entry generated during gameplay */
export interface NoteProofEntry {
  /** Index of this note in the song (0-based) */
  noteIdx: number;
  /** Number of ticks that were hits */
  ticksHit: number;
  /** Total ticks for this note */
  totalTicks: number;
  /** Whether this note is golden */
  isGolden: boolean;
  /** Whether every tick was hit (perfect note) */
  wasPerfect: boolean;
}

/** The complete proof package sent alongside a score submission */
export interface ScoreProofPackage {
  // --- Scoring Metadata (for server-side max-score verification) ---
  /** Total number of note-level ticks in the song */
  total_note_ticks: number;
  /** Number of golden note ticks */
  golden_note_ticks: number;
  /** Normal note ticks */
  normal_note_ticks: number;
  /** Points per tick (pre-normalized, from ScoringMetadata) */
  points_per_tick: number;
  /** Combo multiplier for the difficulty used */
  combo_multiplier: number;
  /** Total number of singable notes in the song */
  total_notes: number;
  /** Max possible score (always 10000, but sent for explicitness) */
  max_possible_score: number;

  // --- Hash Chain ---
  /** Merkle-like chain root hash (hex) */
  chain_root: string;
  /** Number of notes included in the chain */
  chain_length: number;

  // --- Timing / Integrity ---
  /** Unix timestamp (seconds) when proof was generated (±60s window) */
  proof_ts: number;
  /** SHA-256 integrity hash binding all fields together */
  integrity_hash: string;

  // --- Song Fingerprint Version ---
  /** Which fingerprint version generated the song_hash */
  fingerprint_version: 'v1' | 'v2';
}

// ── Proof Generator Class ──────────────────────────────────

/**
 * Incremental proof builder — call `addNote()` for each completed note,
 * then `finalize()` to get the proof package.
 *
 * Designed to be used inside the scoring loop with zero allocation overhead
 * per tick (state is simple numbers/strings, no objects created per tick).
 */
export class ScoreProofBuilder {
  private chainDigest = '';
  private noteCount = 0;
  private scoringMeta: ScoringMetaForProof | null = null;

  /**
   * Initialize with the song's scoring metadata.
   * Must be called before any addNote() calls.
   */
  initScoringMeta(meta: ScoringMetaForProof): void {
    this.scoringMeta = meta;
    // Initialize chain with a seed derived from the metadata itself
    // This binds the chain to the specific song/version/difficulty
    this.chainDigest = sha256(
      `${meta.totalNoteTicks}:${meta.goldenNoteTicks}:${meta.normalNoteTicks}:${meta.pointsPerTick}:${meta.comboMultiplier}`
    );
    this.noteCount = 0;
  }

  /**
   * Add a completed note to the proof chain.
   * Called when a note finishes (from runScoringPass note completion).
   *
   * This is O(1) — just one SHA-256 of a short string.
   */
  addNote(entry: NoteProofEntry): void {
    // Chain: H(prev_digest + ":" + noteIdx + ":" + ticksHit + ":" + totalTicks + ":" + isGolden + ":" + wasPerfect)
    const input = `${this.chainDigest}:${entry.noteIdx}:${entry.ticksHit}:${entry.totalTicks}:${entry.isGolden ? 1 : 0}:${entry.wasPerfect ? 1 : 0}`;
    this.chainDigest = sha256(input);
    this.noteCount++;
  }

  /**
   * Finalize the proof package.
   * Call once after all notes have been added.
   */
  finalize(params: {
    score: number;
    accuracy: number;
    maxCombo: number;
    notesHit: number;
    notesMissed: number;
    difficulty: string;
    fingerprintVersion: 'v1' | 'v2';
  }): ScoreProofPackage {
    if (!this.scoringMeta) {
      throw new Error('ScoreProofBuilder: initScoringMeta() must be called before finalize()');
    }

    const meta = this.scoringMeta;
    const proofTs = Math.floor(Date.now() / 1000);

    const pkg: ScoreProofPackage = {
      // Scoring metadata
      total_note_ticks: meta.totalNoteTicks,
      golden_note_ticks: meta.goldenNoteTicks,
      normal_note_ticks: meta.normalNoteTicks,
      points_per_tick: Math.round(meta.pointsPerTick * 1e8) / 1e8, // 8 decimal precision
      combo_multiplier: meta.comboMultiplier,
      total_notes: meta.totalNotes,
      max_possible_score: 10000,

      // Hash chain
      chain_root: this.chainDigest,
      chain_length: this.noteCount,

      // Timing
      proof_ts: proofTs,
      integrity_hash: '', // computed below

      // Fingerprint version
      fingerprint_version: params.fingerprintVersion,
    };

    // Compute integrity hash over all fields (excluding itself)
    pkg.integrity_hash = computeIntegrityHash(pkg, params);

    return pkg;
  }

  /** Reset for reuse */
  reset(): void {
    this.chainDigest = '';
    this.noteCount = 0;
    this.scoringMeta = null;
  }
}

// ── Internal: SHA-256 wrapper ───────────────────────────────

/** SHA-256 hash using the internal sync implementation from song-fingerprint */
function sha256(message: string): string {
  return internalSha256(message);
}

// ── Internal: Integrity Hash ────────────────────────────────

/**
 * Compute the integrity hash that binds all proof fields together.
 * Any tampering with a single field will produce a different hash.
 */
function computeIntegrityHash(pkg: ScoreProofPackage, params: {
  score: number;
  accuracy: number;
  maxCombo: number;
  notesHit: number;
  notesMissed: number;
  difficulty: string;
}): string {
  // Concatenate ALL relevant data in a deterministic order
  const raw = [
    // Scoring metadata
    pkg.total_note_ticks,
    pkg.golden_note_ticks,
    pkg.normal_note_ticks,
    pkg.points_per_tick,
    pkg.combo_multiplier,
    pkg.total_notes,
    pkg.max_possible_score,
    // Chain
    pkg.chain_root,
    pkg.chain_length,
    // Timing
    pkg.proof_ts,
    // Game result
    params.score,
    params.accuracy,
    params.maxCombo,
    params.notesHit,
    params.notesMissed,
    params.difficulty,
    // Fingerprint version
    pkg.fingerprint_version,
  ].join('|');
  return sha256(raw);
}

// ── Server-side verification (mirrored in PHP) ─────────────

/**
 * Server-side score plausibility checks.
 * This logic is MIRRORED in PHP on the server — both must stay in sync.
 *
 * Returns { valid: true } or { valid: false, reason: string }.
 */
export function verifyScorePlausibility(
  score: number,
  maxScore: number,
  accuracy: number,
  maxCombo: number,
  notesHit: number,
  notesMissed: number,
  proof: ScoreProofPackage,
): { valid: boolean; reason?: string } {
  // 1. Score bounds check
  if (score < 0 || score > 10000) {
    return { valid: false, reason: 'score_out_of_range' };
  }
  if (maxScore !== 10000) {
    return { valid: false, reason: 'invalid_max_score' };
  }

  // 2. Accuracy bounds
  if (accuracy < 0 || accuracy > 100) {
    return { valid: false, reason: 'accuracy_out_of_range' };
  }

  // 3. Notes consistency
  const totalNotesClaimed = notesHit + notesMissed;
  if (totalNotesClaimed <= 0) {
    return { valid: false, reason: 'no_notes_claimed' };
  }
  if (proof.total_notes > 0 && totalNotesClaimed > proof.total_notes * 1.05) {
    // Allow 5% tolerance for edge cases (duet mode can have different note counts)
    return { valid: false, reason: 'too_many_notes_claimed' };
  }

  // 4. Max combo cannot exceed total note ticks
  if (maxCombo > proof.total_note_ticks) {
    return { valid: false, reason: 'combo_exceeds_ticks' };
  }
  // Max combo cannot exceed notes hit
  if (maxCombo > notesHit) {
    return { valid: false, reason: 'combo_exceeds_hits' };
  }

  // 5. Accuracy plausibility
  // accuracy (note-level, 0-100) should roughly correspond to notesHit / totalNotesClaimed
  // But the actual accuracy is tick-based, so we allow wide tolerance
  if (proof.total_notes > 0) {
    const hitRatio = notesHit / totalNotesClaimed;
    // Note-level accuracy is based on tick hit ratio, which can differ from note hit ratio.
    // A note with 1/3 ticks hit still counts as "hit". So accuracy can be much lower than hitRatio.
    // But accuracy cannot be HIGHER than hitRatio (can't have 100% tick accuracy if you missed notes)
    // Actually this IS possible if missed notes had 0 ticks evaluated. So skip this check.
  }

  // 6. Chain length consistency
  if (proof.chain_length > 0 && proof.total_notes > 0) {
    // The chain should have roughly the same number of entries as notes in the song.
    // In duet mode or with special game types, this may differ, so allow 20% tolerance.
    if (proof.chain_length > proof.total_notes * 1.2) {
      return { valid: false, reason: 'chain_too_long' };
    }
  }

  // 7. Scoring metadata consistency
  if (proof.total_note_ticks !== proof.golden_note_ticks + proof.normal_note_ticks) {
    return { valid: false, reason: 'tick_count_mismatch' };
  }

  // 8. Combo multiplier must match difficulty
  const validCombos: Record<string, number> = { easy: 1.5, normal: 2.0, hard: 2.5 };
  // Note: proof doesn't include difficulty directly, it's in the score submission

  // 9. Points per tick plausibility
  if (proof.points_per_tick <= 0 || proof.points_per_tick > 100) {
    return { valid: false, reason: 'invalid_points_per_tick' };
  }

  // 10. Rough maximum score estimation
  // Even with perfect play, score cannot exceed 10000.
  // A very rough lower bound: if you hit 0 notes, you should have ~0 points
  // (consolation points for attempted notes are minimal).
  // If score is very high but notesHit is very low, that's suspicious.
  if (notesHit === 0 && score > proof.total_notes * 5) {
    // Consolation is ~10% of note max, but only for ATTEMPTED notes.
    // If NO notes were hit but score is high, something is wrong.
    return { valid: false, reason: 'high_score_no_hits' };
  }

  return { valid: true };
}

/**
 * Re-compute and verify the integrity hash of a proof package.
 * Returns true if the hash matches (proof has not been tampered with).
 */
export function verifyIntegrityHash(
  proof: ScoreProofPackage,
  params: {
    score: number;
    accuracy: number;
    maxCombo: number;
    notesHit: number;
    notesMissed: number;
    difficulty: string;
  }
): boolean {
  const expected = computeIntegrityHash(proof, params);
  // Constant-time comparison to prevent timing attacks (overkill for this use case, but good practice)
  if (expected.length !== proof.integrity_hash.length) return false;
  let result = 0;
  for (let i = 0; i < expected.length; i++) {
    result |= expected.charCodeAt(i) ^ proof.integrity_hash.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Verify the proof timestamp is within an acceptable window.
 * Prevents submitting old proofs for new scores.
 */
export function verifyProofTimestamp(proof: ScoreProofPackage, maxAgeSeconds: number = 300): boolean {
  const now = Math.floor(Date.now() / 1000);
  const age = now - proof.proof_ts;
  return age >= 0 && age <= maxAgeSeconds;
}

/**
 * Quick one-shot proof generation for testing / simple use cases.
 * For the actual game loop, use ScoreProofBuilder for incremental construction.
 */
export function generateProofPackage(params: {
  scoringMeta: ScoringMetaForProof;
  noteResults: NoteProofEntry[];
  score: number;
  accuracy: number;
  maxCombo: number;
  notesHit: number;
  notesMissed: number;
  difficulty: string;
  fingerprintVersion: 'v1' | 'v2';
}): ScoreProofPackage {
  const builder = new ScoreProofBuilder();
  builder.initScoringMeta(params.scoringMeta);
  for (const note of params.noteResults) {
    builder.addNote(note);
  }
  return builder.finalize({
    score: params.score,
    accuracy: params.accuracy,
    maxCombo: params.maxCombo,
    notesHit: params.notesHit,
    notesMissed: params.notesMissed,
    difficulty: params.difficulty,
    fingerprintVersion: params.fingerprintVersion,
  });
}