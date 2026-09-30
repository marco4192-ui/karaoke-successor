'use client';

import { useEffect, useRef } from 'react';
import { pruneStaleSavedMics } from '@/lib/audio/mic-device-resolver';

/**
 * R41/P10 — keeps a saved-mic list (read from MULTI_MIC_CONFIG) free of
 * stale devices. The persisted config used to keep entries for unplugged /
 * re-plugged hardware forever; every mic picker that reads it offered dead
 * devices. Consumers mount this hook next to their own list state:
 *
 *  1. on mount — prune persisted entries whose device is gone, then notify
 *     (only when something was actually removed) so the caller re-reads
 *     the now-clean config;
 *  2. on `devicechange` — prune again and ALWAYS notify: the central
 *     resolver listener (mic-device-resolver.ts) may have pruned
 *     concurrently, and a re-read is cheap compared to a hardware change.
 *
 * The callback receives the number of entries the local prune removed
 * (0 when nothing changed) — callers can use it to also drop now-invalid
 * selections. Pruning never prompts for permission (enumerateDevices
 * deviceIds don't need labels) and never removes entries it cannot verify
 * (pre-permission browsers) or special ids ('default' / 'auto' /
 * 'companion') — see mic-device-resolver.ts.
 */
export function useSavedMicsLiveSync(
  onMicsChanged: (_prunedCount: number) => void,
): void {
  // Latest-ref so callers can pass inline closures without re-subscribing.
  const cbRef = useRef(onMicsChanged);
  useEffect(() => {
    cbRef.current = onMicsChanged;
  }, [onMicsChanged]);

  useEffect(() => {
    let cancelled = false;

    // Mount: prune dead entries, then re-read once when something was removed.
    void pruneStaleSavedMics()
      .then(removed => {
        if (!cancelled && removed > 0) cbRef.current(removed);
      })
      .catch(() => { /* non-critical */ });

    const md = typeof navigator !== 'undefined' ? navigator.mediaDevices : undefined;
    if (!md || typeof md.addEventListener !== 'function') return;

    const handleDeviceChange = () => {
      void pruneStaleSavedMics()
        .then(removed => {
          if (!cancelled) cbRef.current(removed);
        })
        .catch(() => { /* non-critical */ });
    };
    md.addEventListener('devicechange', handleDeviceChange);
    return () => {
      cancelled = true;
      md.removeEventListener('devicechange', handleDeviceChange);
    };
  }, []);
}
