/**
 * Shared jukebox-pool helpers: make a library playlist the active jukebox
 * song pool (or clear it) from ANY jukebox surface — setup view, player
 * header pool selector, controls bar and fullscreen header all route through
 * here so the pool state can never drift apart between them.
 */
'use client';

import { useEffect, useState } from 'react';
import { getPlaylists } from '@/lib/playlist-manager';
import { getJsonOptional, removeItem, setJson, StorageKeys } from '@/lib/storage';

/** Make a library playlist the active jukebox pool ('' = all songs). */
export function setJukeboxPool(playlistId: string): void {
  if (!playlistId) {
    try {
      removeItem(StorageKeys.JUKEBOX_PLAYLIST);
    } catch {
      /* ignore */
    }
  } else {
    const pl = getPlaylists().find(p => p.id === playlistId);
    if (pl) {
      try {
        setJson(StorageKeys.JUKEBOX_PLAYLIST, pl.songIds);
      } catch {
        /* ignore */
      }
    }
  }
  // Notify useJukebox (and every mounted pool indicator) to re-filter.
  window.dispatchEvent(new CustomEvent('jukebox-pool-changed'));
}

/** The currently active pool playlist id ('' when "all songs"), matched by song ids. */
export function getActiveJukeboxPoolId(): string {
  let stored: string[] | null = null;
  try {
    stored = getJsonOptional<string[]>(StorageKeys.JUKEBOX_PLAYLIST) ?? null;
  } catch {
    stored = null;
  }
  if (!stored || stored.length === 0) return '';
  try {
    const match = getPlaylists().find(
      p => !p.isSystem
        && p.songIds.length > 0
        && stored.length === p.songIds.length
        && stored.every((sid, idx) => sid === p.songIds[idx]),
    );
    return match?.id ?? '';
  } catch {
    return '';
  }
}

/**
 * Reactive active-pool id: reads the persisted pool and re-reads it whenever
 * any surface changes the pool (via the `jukebox-pool-changed` event).
 */
export function useJukeboxPoolId(): string {
  const [poolId, setPoolId] = useState<string>(() => getActiveJukeboxPoolId());

  useEffect(() => {
    const onChange = () => setPoolId(getActiveJukeboxPoolId());
    window.addEventListener('jukebox-pool-changed', onChange);
    return () => window.removeEventListener('jukebox-pool-changed', onChange);
  }, []);

  return poolId;
}
