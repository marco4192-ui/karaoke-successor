/**
 * R69: Real per-note proof collection for the online leaderboard.
 *
 * The anti-cheat proof's per-note hash chain used to be RECONSTRUCTED from
 * the claimed hit/miss sums at submission time (synthetic — it carried no
 * independent evidence, see the R68 audit). This collector receives the
 * REAL per-note completion data from the scoring pass (run-scoring-pass →
 * use-note-scoring) while the game is running, and the post-game upload
 * builds the chain from it.
 *
 * Design: module-level singleton (no React state, zero per-tick allocation).
 * Only P1 is collected — the online upload path submits results.players[0].
 * Freestyle notes that were silently skipped DO complete and appear here
 * (they legitimately extend the chain beyond hit+miss).
 */

import type { NoteProofEntry } from './anti-cheat-proof';

/** Hard cap — a 10-minute marathon song has ~600 notes; 4000 is generous. */
const MAX_COLLECTED = 4000;

let collected: NoteProofEntry[] = [];

/** Start a fresh collection (called when a game's scoring state resets). */
export function beginNoteProofCollection(): void {
  collected = [];
}

/**
 * Record one completed note. Called once per note from P1's scoring pass —
 * never per tick/frame, so the overhead is one array push per note.
 */
export function collectNoteProof(entry: NoteProofEntry): void {
  if (collected.length < MAX_COLLECTED) collected.push(entry);
}

/**
 * Take everything collected for the game that just ended and reset the
 * buffer. Returns an empty array when nothing was collected (e.g. the page
 * was reloaded between game end and upload) — callers fall back to the
 * legacy synthetic chain in that case.
 */
export function takeCollectedNoteProofs(): NoteProofEntry[] {
  const entries = collected;
  collected = [];
  return entries;
}
