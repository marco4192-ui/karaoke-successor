'use client';

import { useRef, useEffect } from 'react';
import { BattleRoyaleGame, BattleRoyalePlayer } from '@/lib/game/battle-royale';

interface CompanionPitchEntry {
  note: number;
  accuracy: number;
  isSinging?: boolean;
}

interface UseBattleRoyaleCompanionPollingParams {
  gameStatus: BattleRoyaleGame['status'];
  players: BattleRoyalePlayer[];
}

interface UseBattleRoyaleCompanionPollingReturn {
  companionPitchCacheRef: React.RefObject<Map<string, CompanionPitchEntry>>;
}

/**
 * Polls companion app pitch data during gameplay.
 * Companion apps detect pitch on-device and submit via /api/mobile?action=pitch.
 * We poll their results here and cache them for the scoring game loop.
 *
 * Polls at 200ms interval (5 polls/sec) — sufficient since scoring only
 * evaluates every 100ms (TICK_INTERVAL). Uses AbortController to cancel
 * in-flight requests on cleanup.
 */
export function useBattleRoyaleCompanionPolling({
  gameStatus,
  players,
}: UseBattleRoyaleCompanionPollingParams): UseBattleRoyaleCompanionPollingReturn {
  const companionPollRef = useRef<NodeJS.Timeout | null>(null);
  const companionPitchCacheRef = useRef<Map<string, CompanionPitchEntry>>(new Map());
  const playersRef = useRef(players);
  playersRef.current = players;

  useEffect(() => {
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

        // data is expected to be an array of { clientId, note, accuracy } objects
        const pitchEntries = Array.isArray(data) ? data : [];

        // Build the set of active companion client IDs from the response
        const activeClientIds = new Set<string>();
        for (const entry of pitchEntries) {
          if (entry.clientId && entry.note !== undefined) {
            activeClientIds.add(entry.clientId);
            companionPitchCacheRef.current.set(entry.clientId, {
              note: entry.note,
              accuracy: entry.accuracy || 0,
              isSinging: entry.isSinging,
            });
          }
        }

        // Only evict cached pitches for companions that are no longer active,
        // instead of clearing the entire cache (which would lose data for
        // companions that simply missed one poll cycle).
        for (const cachedId of companionPitchCacheRef.current.keys()) {
          if (!activeClientIds.has(cachedId)) {
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
