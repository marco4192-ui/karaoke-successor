/**
 * R69: Score upload outbox — offline resilience for online leaderboard
 * submissions.
 *
 * Before R69 a failed score upload (server down, flaky network) simply
 * showed an error and the score was LOST for the online board. This module
 * queues the complete submission (payload + proof inputs) in localStorage
 * and retries:
 *   - when the next game ends (the post-game processing flushes first), and
 *   - when the browser window regains focus (throttled to 60 s).
 *
 * The anti-cheat proof is REBUILT at flush time (fresh proof_ts — the
 * server's 5-minute proof window measures when the proof was generated,
 * not when the game happened; the same is true for live uploads). The
 * per-note chain inputs are stored alongside so a queued retry produces
 * the same chain root as a live submission would have.
 *
 * Flush strategy: FIFO, one entry at a time, STOP on the first failure
 * (the server is probably unreachable — hammering the remaining entries
 * would only burn the rate limit). Entries die after 5 attempts or 48 h.
 *
 * Privacy: entries are only enqueued after the user gave leaderboard
 * consent, and are removed when the online profile is deleted (GDPR).
 */

import { getItem, setItem, removeItem, StorageKeys } from '@/lib/storage';
import type {
  SubmitScorePayload,
  NoteProofEntry,
  ScoringMetaForProof,
} from './types';

/** Max queued submissions (drop-oldest at capacity). */
const MAX_ENTRIES = 20;
/** Entries older than this are dropped at the next prune (score relevance). */
const MAX_AGE_MS = 48 * 60 * 60 * 1000;
/** Drop an entry after this many failed flush attempts. */
const MAX_ATTEMPTS = 5;
/** Cap stored per-note chain inputs per entry (matches collector generously). */
const MAX_STORED_NOTES = 2000;
/** Minimum distance between focus-triggered flushes. */
const FOCUS_FLUSH_THROTTLE_MS = 60_000;

/** Everything needed to rebuild + submit the score later. */
export interface OutboxEntry {
  queuedAt: number;
  attempts: number;
  /** The score payload WITHOUT the proof (rebuilt at flush time). */
  payload: Omit<SubmitScorePayload, 'proof'>;
  /** Inputs for generateProofPackage at flush time (absent → flush submits
   *  without a proof, e.g. party-scale submissions). */
  proofInputs?: {
    scoringMeta: ScoringMetaForProof;
    noteResults: NoteProofEntry[];
  };
}

/**
 * Thrown by submitScore when a failed submission was queued for retry —
 * lets the UI distinguish "lost" from "will be retried".
 */
export class OfflineQueuedError extends Error {
  constructor() {
    super('Score queued for retry (offline outbox)');
    this.name = 'OfflineQueuedError';
  }
}

function readFile(): Array<OutboxEntry> {
  try {
    const raw = getItem(StorageKeys.SCORE_OUTBOX);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Partial<{ entries: Array<OutboxEntry> }> | null;
    if (!parsed || !Array.isArray(parsed.entries)) return [];
    return parsed.entries.filter(e => e && e.payload && e.proofInputs);
  } catch {
    return [];
  }
}

function writeFile(entries: Array<OutboxEntry>): void {
  try {
    if (entries.length === 0) {
      removeItem(StorageKeys.SCORE_OUTBOX);
    } else {
      setItem(StorageKeys.SCORE_OUTBOX, JSON.stringify({ entries }));
    }
  } catch { /* quota errors are non-critical — drop silently */ }
}

function prune(entries: Array<OutboxEntry>): Array<OutboxEntry> {
  const now = Date.now();
  return entries.filter(e => now - e.queuedAt < MAX_AGE_MS && e.attempts < MAX_ATTEMPTS);
}

/** True when an equivalent submission is already queued. */
function isDuplicate(entries: Array<OutboxEntry>, payload: OutboxEntry['payload']): boolean {
  return entries.some(e =>
    e.payload.profile_uid === payload.profile_uid
    && e.payload.song_hash === payload.song_hash
    && e.payload.game_type === payload.game_type
    && e.payload.score === payload.score,
  );
}

/** Queue a failed submission (drop-oldest at capacity, deduplicated). */
export function enqueueScore(entry: Omit<OutboxEntry, 'queuedAt' | 'attempts'>): void {
  try {
    let entries = prune(readFile());
    if (isDuplicate(entries, entry.payload)) return;
    entries.push({
      ...entry,
      ...(entry.proofInputs ? {
        proofInputs: {
          scoringMeta: entry.proofInputs.scoringMeta,
          // Cap the stored note chain to keep localStorage usage bounded.
          noteResults: entry.proofInputs.noteResults.slice(0, MAX_STORED_NOTES),
        },
      } : {}),
      queuedAt: Date.now(),
      attempts: 0,
    });
    if (entries.length > MAX_ENTRIES) entries = entries.slice(-MAX_ENTRIES);
    writeFile(entries);
  } catch { /* non-critical */ }
}

/** Remove every queued submission of a profile (GDPR delete / opt-out). */
export function clearScoreOutboxForProfile(profileUid: string): void {
  try {
    writeFile(readFile().filter(e => e.payload.profile_uid !== profileUid));
  } catch { /* non-critical */ }
}

/** Current queue length (for UI/debugging). */
export function scoreOutboxSize(): number {
  return prune(readFile()).length;
}

/** Serializes flushes — a game-end flush and a focus flush must not race. */
let flushPromise: Promise<void> | null = null;

/**
 * Try to flush queued submissions (FIFO, stop on first failure). The proof
 * is rebuilt with a fresh timestamp; a still-failing entry stays queued
 * with attempts+1. Resolves when the flush round settled.
 */
export function flushScoreOutbox(): Promise<void> {
  if (flushPromise) return flushPromise;
  flushPromise = (async () => {
    try {
      const [{ leaderboardService }] = await Promise.all([
        import('@/lib/api/leaderboard-service'),
      ]);

      for (let i = 0; i <= MAX_ENTRIES; i++) {
        const entries = prune(readFile());
        if (entries.length === 0) return;
        const entry = entries[0];
        const rest = entries.slice(1);

        try {
          let proof: import('./anti-cheat-proof').ScoreProofPackage | undefined;
          if (entry.proofInputs) {
            const { generateProofPackage } = await import('@/lib/leaderboard/anti-cheat-proof');
            proof = generateProofPackage({
              scoringMeta: entry.proofInputs.scoringMeta,
              noteResults: entry.proofInputs.noteResults,
              score: entry.payload.score,
              accuracy: entry.payload.accuracy,
              maxCombo: entry.payload.max_combo,
              notesHit: entry.payload.notes_hit,
              notesMissed: entry.payload.notes_missed,
              difficulty: entry.payload.difficulty,
              fingerprintVersion: entry.payload.song_hash_v2 ? 'v2' : 'v1',
            });
          }
          await leaderboardService.submitScorePayload({ ...entry.payload, proof });
          writeFile(rest); // flushed — drop the entry
        } catch {
          // Server (still) unreachable — keep the entry with attempts+1 and
          // stop this flush round; the rest would fail the same way.
          const bumped: OutboxEntry = { ...entry, attempts: entry.attempts + 1 };
          writeFile(bumped.attempts < MAX_ATTEMPTS ? [...rest, bumped] : rest);
          return;
        }
      }
    } catch {
      // Dynamic import failure or storage issue — nothing we can do; the
      // entries stay queued for the next trigger.
    }
  })();
  void flushPromise.finally(() => { flushPromise = null; });
  return flushPromise;
}

// ── Focus-triggered flushing (registered once, throttled) ──────────────

if (typeof window !== 'undefined') {
  let lastFocusFlush = 0;
  let flushScheduled = false;
  window.addEventListener('focus', () => {
    const now = Date.now();
    if (now - lastFocusFlush < FOCUS_FLUSH_THROTTLE_MS || flushScheduled) return;
    lastFocusFlush = now;
    flushScheduled = true;
    // Give the app a moment to settle before firing network requests.
    window.setTimeout(() => {
      flushScheduled = false;
      void flushScoreOutbox();
    }, 3000);
  });
}
