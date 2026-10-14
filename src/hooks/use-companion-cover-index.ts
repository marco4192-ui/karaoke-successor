'use client';

/**
 * R65 — Companion cover index (phone side).
 *
 * The phone's cover tiles blindly requested `songcover` for EVERY song and
 * 404-retried on a ladder — songs without any cover (no coverImage, no
 * uploaded thumbnail) generated up to 5 failed requests each. On a large
 * library that flooded the console with 404s AND pushed the songcover rate
 * limit into 429 territory, burying the covers that DO exist (user report 4).
 *
 * This module keeps a phone-side set of songIds the SERVER can actually
 * serve a cover for (`songcoverids` = uploaded thumbnails; the desktop's
 * use-song-library-sync uploads 96px thumbnails for every usable cover,
 * including blob:-source ones the phone can't load directly).
 *
 * Consumers (SongCoverTile & friends):
 *   - before requesting `songcover`, ask hasServerCover(songId) — ids NOT
 *     in the index go straight to the initials fallback, ZERO requests;
 *   - subscribe() re-arms tiles when a refresh picks up newly uploaded
 *     covers (the desktop uploads in 15s batches — the index catches up).
 *
 * Semantics:
 *   - not yet loaded  → hasServerCover() === true (unchanged behavior:
 *     assume available; the first refresh lands within ~2s)
 *   - loaded          → exact set membership
 *   - refresh rate    ≤ 2/min (TTL 30s) — vs. a 300/min songcoverids limit
 */

const REFRESH_TTL_MS = 30_000;

let ids: Set<string> | null = null;
let loadedAt = 0;
let inFlight: Promise<void> | null = null;
const listeners = new Set<() => void>();

function notify(): void {
  for (const cb of listeners) {
    try { cb(); } catch { /* listener errors must not break the index */ }
  }
}

async function fetchIndex(): Promise<void> {
  try {
    const res = await fetch('/api/mobile?action=songcoverids');
    if (!res.ok) return;
    const data = await res.json();
    if (data && typeof data.ok === 'boolean') {
      const list = Array.isArray(data.ids) ? data.ids as unknown[] : [];
      const next = new Set<string>(list.filter((x): x is string => typeof x === 'string'));
      const prevIds = ids;
      ids = next;
      loadedAt = Date.now();
      // Only notify when the set actually changed (added ids re-arm tiles;
      // pure removals are irrelevant — already-loaded covers stay loaded).
      let changed = prevIds === null;
      if (!changed && prevIds) {
        for (const id of next) { if (!prevIds.has(id)) { changed = true; break; } }
      }
      if (changed) notify();
    }
  } catch {
    // Offline / server restarting — keep the last known index; the next
    // mount after TTL retries.
  }
}

/** Refresh the index if stale (TTL). Multiple concurrent callers share ONE
 *  in-flight request. Called from every cover consumer's mount effect. */
export function ensureCoverIndex(): Promise<void> {
  if (inFlight) return inFlight;
  if (ids !== null && Date.now() - loadedAt < REFRESH_TTL_MS) return Promise.resolve();
  inFlight = fetchIndex().finally(() => { inFlight = null; });
  return inFlight;
}

/** Force a refresh on the next ensureCoverIndex() call (e.g. after the
 *  song library itself re-synced and new covers are on the way). */
export function invalidateCoverIndex(): void {
  loadedAt = 0;
}

/** Whether the server is known to have a cover for this song. Unknown
 *  (not yet loaded) → true, preserving the pre-index behavior. */
export function hasServerCover(songId: string): boolean {
  return ids === null ? true : ids.has(songId);
}

/** Subscribe to index updates (fires when NEW ids appeared). Returns an
 *  unsubscribe function. */
export function subscribeCoverIndex(cb: () => void): () => void {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}
