/**
 * Ghost-note performance sampling for Battle Royale (sample type, caps and
 * the immutable snapshot builder for React state).
 */
// ── Ghost notes (user request: mic failures as ghost notes) ──────────
// Visual performance samples, same shape as the Medley strips pipeline
// (see getMultiPlayerNoteOverlay): wrong-pitch misses become ghost bars at
// the sung pitch in the player's colour, hits fill the per-player strips.
export interface BrNotePerformanceSample {
  time: number;
  accuracy: number;
  hit: boolean;
  sungPitch?: number | null;
}

/** Cap per note — a 3s note at 100 ms cadence needs 30; 120 is generous. */
export const MAX_BR_PERF_SAMPLES = 120;
/** Notes whose last sample is older than this (ms, song-relative) drop out of the synced snapshot. */
const BR_PERF_PRUNE_MS = 6000;

/** Build an immutable snapshot (new Maps, copied arrays) for React state —
 *  drops notes that have fully scrolled past and caps the sample arrays. */
export function snapshotBrPerformance(
  src: Map<string, Map<string, BrNotePerformanceSample[]>>,
  currentTime: number,
): Map<string, Map<string, BrNotePerformanceSample[]>> {
  const out = new Map<string, Map<string, BrNotePerformanceSample[]>>();
  for (const [playerId, notes] of src) {
    const playerMap = new Map<string, BrNotePerformanceSample[]>();
    for (const [noteKey, samples] of notes) {
      const lastTime = samples.length > 0 ? samples[samples.length - 1].time : -1;
      if (lastTime < currentTime - BR_PERF_PRUNE_MS) continue;
      playerMap.set(noteKey, samples.slice(-MAX_BR_PERF_SAMPLES));
    }
    if (playerMap.size > 0) out.set(playerId, playerMap);
  }
  return out;
}
