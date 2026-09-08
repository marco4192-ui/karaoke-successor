'use client';

import { useRef, useEffect } from 'react';
import { BattleRoyaleGame, BattleRoyalePlayer } from '@/lib/game/battle-royale';

interface CompanionPitchEntry {
  note: number | null;
  frequency: number | null;
  accuracy: number;
  isSinging?: boolean;
  /** Timestamp when this pitch was last updated from the companion API */
  lastUpdated: number;
}

interface UseBattleRoyaleCompanionPollingParams {
  gameStatus: BattleRoyaleGame['status'];
  players: BattleRoyalePlayer[];
}

interface UseBattleRoyaleCompanionPollingReturn {
  companionPitchCacheRef: React.RefObject<Map<string, CompanionPitchEntry>>;
}

/** Maximum age (ms) before a cached pitch is considered stale and evicted. */
const STALE_PITCH_MS = 1000; // 5 poll cycles at 200ms interval

/**
 * Polls companion app pitch data during gameplay.
 * Companion apps detect pitch on-device and submit via /api/mobile (type
 * 'pitch' / 'batch_pitch'). We poll their results here and cache them for the
 * scoring game loop.
 *
 * Item 8.1 FIX: the getpitch response entries are shaped
 * `{ clientId, code, data: PitchData, profile }` (same as CPTM's
 * useCompanionPitchPolling). The old implementation read `entry.note`
 * (undefined — note is nested in `entry.data`) and keyed the cache by
 * connection code, so companion pitch NEVER reached BR scoring. The cache is
 * now keyed by PROFILE ID — BR player ids are profile ids in both entry
 * paths (unified party setup + standalone BR setup), so the scoring loop can
 * simply look up `cache.get(player.id)`.
 *
 * Polls at 200ms interval (5 polls/sec) — sufficient since scoring only
 * evaluates every 100ms (TICK_INTERVAL). Uses AbortController to cancel
 * in-flight requests on cleanup.
 *
 * Cached pitches have a 1-second grace period before eviction to tolerate
 * occasional missed poll cycles from companions with slower connections.
 */
export function useBattleRoyaleCompanionPolling({
  gameStatus,
  players,
}: UseBattleRoyaleCompanionPollingParams): UseBattleRoyaleCompanionPollingReturn {
  const companionPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const companionPitchCacheRef = useRef<Map<string, CompanionPitchEntry>>(new Map());
  const playersRef = useRef(players);
  useEffect(() => { playersRef.current = players; }, [players]);

  useEffect(() => {
    // Clear stale cache when game status changes
    companionPitchCacheRef.current.clear();

    if (gameStatus !== 'playing') {
      if (companionPollRef.current) {
        clearInterval(companionPollRef.current);
        companionPollRef.current = null;
      }
      return;
    }

    const companionPlayers = playersRef.current.filter(p => p.playerType === 'companion' && !p.eliminated);
    if (companionPlayers.length === 0) return;

    let abortController: AbortController | null = null;

    const pollCompanionPitch = async () => {
      // Cancel any in-flight request
      if (abortController) abortController.abort();
      abortController = new AbortController();

      try {
        const res = await fetch('/api/mobile?action=getpitch', {
          signal: abortController.signal,
        });
        if (!res.ok) return;
        const data = await res.json();

        // data is expected to be { success: true, pitches: [...] } — extract the pitches array
        const pitchEntries = Array.isArray(data?.pitches) ? data.pitches : [];

        const now = Date.now();

        // Build the set of active profile ids from the response.
        // Each entry: { clientId, code, data: PitchData, profile: MobileProfile | null }
        const activeProfileIds = new Set<string>();
        for (const entry of pitchEntries) {
          const profileId: string | undefined = entry?.profile?.id;
          const pitchData = entry?.data;
          if (!profileId || !pitchData) continue;

          activeProfileIds.add(profileId);
          companionPitchCacheRef.current.set(profileId, {
            note: pitchData.note ?? null,
            frequency: pitchData.frequency ?? null,
            accuracy: pitchData.accuracy || 0,
            isSinging: pitchData.isSinging,
            lastUpdated: now,
          });
        }

        // Only evict cached pitches that are stale (not updated within
        // the grace period). Companions that simply missed one poll cycle
        // retain their cached pitch data for up to STALE_PITCH_MS.
        for (const [cachedId, cachedEntry] of companionPitchCacheRef.current.entries()) {
          if (!activeProfileIds.has(cachedId) && (now - cachedEntry.lastUpdated) > STALE_PITCH_MS) {
            companionPitchCacheRef.current.delete(cachedId);
          }
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        // Silently ignore polling errors (companion API may not be available)
      }
    };

    // Poll every 200ms
    pollCompanionPitch();
    companionPollRef.current = setInterval(pollCompanionPitch, 200);

    return () => {
      if (companionPollRef.current) {
        clearInterval(companionPollRef.current);
        companionPollRef.current = null;
      }
      if (abortController) abortController.abort();
    };
  }, [gameStatus]);

  return { companionPitchCacheRef };
}
