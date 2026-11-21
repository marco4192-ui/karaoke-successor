/**
 * Shared music-library preload coordinator.
 *
 * R87: the title screen (splash) and the app boot (useAppEffects, formerly
 * R84) BOTH want the song library warm at startup — the splash so the first
 * Library visit after "Start" is instant, the app as its original background
 * warm-up. Both used to call loadCustomSongsFromStorage() +
 * getAllSongsAsync() independently; on a cold start the two calls raced and
 * duplicated the entire IndexedDB / cover-restore work.
 *
 * This module funnels every caller into ONE deduplicated promise and exposes
 * a tiny subscribable status so the splash can show a "library warming up"
 * chip (spinner → checkmark) while the opener plays.
 *
 * Deliberately LIGHTWEIGHT at module scope: song-library (a heavy module)
 * is only imported dynamically INSIDE the preload function, so importing
 * this coordinator from the splash chunk adds near zero parse cost.
 */

export type LibraryPreloadStatus = 'idle' | 'loading' | 'ready' | 'error';

let status: LibraryPreloadStatus = 'idle';
const listeners = new Set<(s: LibraryPreloadStatus) => void>();
let preloadPromise: Promise<void> | null = null;

function setStatus(next: LibraryPreloadStatus) {
  status = next;
  for (const fn of listeners) {
    try {
      fn(next);
    } catch {
      // A broken subscriber must never break the preload pipeline.
    }
  }
}

/** Current library preload status (for useSyncExternalStore / polling). */
export function getLibraryPreloadStatus(): LibraryPreloadStatus {
  return status;
}

/** Subscribe to status changes. Returns an unsubscribe function. */
export function subscribeLibraryPreload(fn: (s: LibraryPreloadStatus) => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/**
 * Start (or join) the one shared library preload:
 * IndexedDB song load + full getAllSongsAsync() cover/URL restore.
 *
 * - Concurrent calls share the same in-flight promise (no duplicate work).
 * - After success, later calls resolve immediately (status stays 'ready').
 * - After failure, the promise resets so a later call can retry.
 */
export function preloadLibrary(): Promise<void> {
  if (status === 'loading' || status === 'ready') {
    return preloadPromise ?? Promise.resolve();
  }
  setStatus('loading');
  preloadPromise = (async () => {
    try {
      // Dynamic import keeps this coordinator chunk-light (see header).
      const { loadCustomSongsFromStorage, getAllSongsAsync } = await import('./song-library');
      await loadCustomSongsFromStorage();
      await getAllSongsAsync();
      setStatus('ready');
    } catch (err) {
      // Non-critical: the library screens fall back to loading on visit.
      // eslint-disable-next-line no-console
      console.warn('[LibraryPreload] Failed:', err);
      setStatus('error');
      preloadPromise = null; // allow a later retry
    }
  })();
  return preloadPromise;
}
