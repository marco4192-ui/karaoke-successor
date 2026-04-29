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
 */
export function useBattleRoyaleCompanionPolling({
  gameStatus,
  players,
}: UseBattleRoyaleCompanionPollingParams): UseBattleRoyaleCompanionPollingReturn {
  const companionPollRef = useRef<NodeJS.Timeout | null>(null);
  const companionPitchCacheRef = useRef<Map<string, CompanionPitchEntry>>(new Map());

  useEffect(() => {
    if (gameStatus !== 'playing') {
      if (companionPollRef.current) {
        clearInterval(companionPollRef.current);
        companionPollRef.current = null;
      }
      return;
    }

    const companionPlayers = players.filter(p => p.playerType === 'companion' && !p.eliminated);
    if (companionPlayers.length === 0) return;

    const pollCompanionPitch = async () => {
      try {
        const res = await fetch('/api/mobile?action=getpitch');
        if (!res.ok) return;
        const data = await res.json();

        // data is expected to be an array of { clientId, note, accuracy } objects
        const pitchEntries = Array.isArray(data) ? data : [];

        // Update the cache
        companionPitchCacheRef.current.clear();
        for (const entry of pitchEntries) {
          if (entry.clientId && entry.note !== undefined) {
            companionPitchCacheRef.current.set(entry.clientId, {
              note: entry.note,
              accuracy: entry.accuracy || 0,
              isSinging: entry.isSinging,
            });
          }
        }
      } catch {
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
    };
  }, [gameStatus, players]);

  return { companionPitchCacheRef };
}
