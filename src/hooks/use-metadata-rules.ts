'use client';

/**
 * Reactive access to the metadata-rules store (R50, Settings → Metadaten
 * Studio → Regel-basierte Harmonisierung).
 *
 * useSyncExternalStore re-renders every consumer the moment a rule changes —
 * the rules editor, the Metadata Studio rule plan and every genre dropdown
 * pick up user rule changes instantly, no reload needed.
 */

import { useSyncExternalStore } from 'react';
import { metadataRules, MetadataRulesData } from '@/lib/game/metadata-rules';

export interface MetadataRulesState {
  genreRules: Record<string, string>;
  languageRules: Record<string, string>;
  /** Total number of user deltas (changed + added rules, both kinds). */
  changedCount: number;
  /** Store version — changes on EVERY mutation; use as a dependency so
   *  derived data (e.g. the Metadata Studio rule plan) recomputes. */
  version: number;
}

// Module-level wrappers — STABLE identity across renders (required by
// useSyncExternalStore) and correctly bound to the singleton.
function subscribeToRules(listener: () => void): () => void {
  return metadataRules.subscribe(listener);
}

function getSnapshot(): number {
  return metadataRules.getSnapshotVersion();
}

export function useMetadataRules(): MetadataRulesState {
  const version = useSyncExternalStore(subscribeToRules, getSnapshot, getSnapshot);

  const data: MetadataRulesData = {
    genreRules: metadataRules.getGenreRules(),
    languageRules: metadataRules.getLanguageRules(),
  };
  return {
    ...data,
    changedCount: Object.keys(data.genreRules).length + Object.keys(data.languageRules).length,
    version,
  };
}
