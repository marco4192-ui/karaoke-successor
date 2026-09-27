'use client';

/**
 * Reactive access to the Motto-Party store (Settings → Motto-Party).
 *
 * useSyncExternalStore re-renders every consumer (the settings tab, the
 * party setup, the companion mirror) the moment the motto config changes —
 * toggling the motto on instantly hides every filter UI and re-restricts
 * every song pool, no reload needed.
 */

import { useSyncExternalStore } from 'react';
import { mottoParty } from '@/lib/game/motto-party';
import type { MottoPartyConfig } from '@/lib/game/motto-party';

// Module-level wrappers — STABLE identity across renders (required by
// useSyncExternalStore) and correctly bound to the singleton (passing
// `mottoParty.subscribe` directly would lose its `this` context).
function subscribeToMottoParty(listener: () => void): () => void {
  return mottoParty.subscribe(listener);
}

function getSnapshot(): number {
  return mottoParty.getSnapshotVersion();
}

/** Current Motto-Party config (deep copy — safe to read anywhere). */
export function useMottoParty(): MottoPartyConfig {
  // Subscribe to the store version; derive the config from the singleton on
  // every render triggered by a version change.
  useSyncExternalStore(subscribeToMottoParty, getSnapshot, getSnapshot);

  return mottoParty.getConfig();
}
