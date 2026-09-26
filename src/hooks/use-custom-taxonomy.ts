'use client';

/**
 * Reactive access to the custom taxonomy store (Settings → Genres & Languages).
 *
 * useSyncExternalStore re-renders every consumer (editor dropdowns, Metadata
 * Studio, the settings tab itself) the moment a custom genre/language is
 * added or removed — no page reload needed anywhere.
 */

import { useSyncExternalStore } from 'react';
import { customTaxonomy } from '@/lib/game/custom-taxonomy';

export interface CustomTaxonomyState {
  /** Built-in GENRES + user customs. */
  allGenres: string[];
  /** Built-in LANGUAGES + user customs. */
  allLanguages: string[];
  /** User-defined genres only (deletable). */
  customGenres: string[];
  /** User-defined languages only (deletable). */
  customLanguages: string[];
}

// Module-level wrappers — STABLE identity across renders (required by
// useSyncExternalStore) and correctly bound to the singleton (passing
// `customTaxonomy.subscribe` directly would lose its `this` context).
function subscribeToTaxonomy(listener: () => void): () => void {
  return customTaxonomy.subscribe(listener);
}

function getSnapshot(): number {
  return customTaxonomy.getSnapshotVersion();
}

export function useCustomTaxonomy(): CustomTaxonomyState {
  // Subscribe to the store version; derive the lists from the singleton on
  // every render triggered by a version change.
  useSyncExternalStore(subscribeToTaxonomy, getSnapshot, getSnapshot);

  return {
    allGenres: customTaxonomy.getAllGenres(),
    allLanguages: customTaxonomy.getAllLanguages(),
    customGenres: customTaxonomy.getCustomGenres(),
    customLanguages: customTaxonomy.getCustomLanguages(),
  };
}
