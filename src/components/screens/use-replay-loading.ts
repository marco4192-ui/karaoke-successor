'use client';

import { useState, useEffect } from 'react';
import { getLastReplayId } from '@/lib/replay-state';
import { getReplay, type ReplayRecord } from '@/lib/db/replay-db';

/**
 * Loads the most recent replay recording from IndexedDB.
 * The replay might still be saving when this hook mounts, so it polls
 * with retries to handle the async save race condition.
 */
export function useReplayLoading() {
  const [replayRecord, setReplayRecord] = useState<ReplayRecord | null>(null);

  useEffect(() => {
    let active = true;
    const MAX_RETRIES = 10;
    const RETRY_DELAY = 500; // ms

    const loadReplay = async (attempt: number) => {
      const replayId = getLastReplayId();
      if (!replayId || !active) return;
      try {
        const record = await getReplay(replayId);
        if (record) {
          setReplayRecord(record);
        } else if (attempt < MAX_RETRIES) {
          // Replay not yet saved — retry after delay
          setTimeout(() => loadReplay(attempt + 1), RETRY_DELAY);
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('[ResultsScreen] Failed to load replay:', err);
      }
    };
    loadReplay(0);
    return () => { active = false; };
  }, []);

  return { replayRecord };
}
