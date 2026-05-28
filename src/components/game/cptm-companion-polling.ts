'use client';

import { useEffect, useRef } from 'react';
import type { GamePhase } from './cptm-types';

// ===================== CONSTANTS =====================

/** Companion pitch polling interval in ms (5 polls/sec) */
const COMPANION_POLL_MS = 200;

/** Maximum age (ms) before a cached companion pitch is considered stale and evicted */
const STALE_PITCH_MS = 1000;

// ===================== TYPES =====================

/** Latest pitch data received from a companion app for a given profile. */
export interface CompanionPitchEntry {
  note: number | null;
  frequency: number | null;
  clarity: number;
  volume: number;
  isSinging: boolean;
  /** Timestamp when this pitch was last updated from the companion API */
  lastUpdated: number;
}

// ===================== HOOK =====================

/**
 * Polls companion app pitch data at regular intervals during the playing phase.
 * Returns a ref to the pitch cache (profileId → pitch data).
 * The hook manages its own polling lifecycle and cleanup.
 */
export function useCompanionPitchPolling(
  phase: GamePhase,
  isPlaying: boolean,
): React.MutableRefObject<Map<string, CompanionPitchEntry>> {
  const companionPitchCacheRef = useRef<Map<string, CompanionPitchEntry>>(new Map());
  const companionPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const companionAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (phase !== 'playing' || !isPlaying) {
      if (companionPollRef.current) {
        clearInterval(companionPollRef.current);
        companionPollRef.current = null;
      }
      return;
    }

    const pollCompanionPitch = async () => {
      if (companionAbortRef.current) companionAbortRef.current.abort();
      companionAbortRef.current = new AbortController();

      try {
        const res = await fetch('/api/mobile?action=getpitch', {
          signal: companionAbortRef.current.signal,
        });
        if (!res.ok) return;
        const data = await res.json();

        // IMPORTANT: The getpitch API returns { success, pitches, clients }, not a raw array.
        // Do NOT change this to `Array.isArray(data)` — that would always be false.
        const pitchEntries = Array.isArray(data?.pitches) ? data.pitches : [];
        const now = Date.now();
        const activeProfileIds = new Set<string>();

        for (const entry of pitchEntries) {
          const profileId = entry.profile?.id;
          const pitchData = entry.data;
          if (!profileId || !pitchData) continue;

          activeProfileIds.add(profileId);
          companionPitchCacheRef.current.set(profileId, {
            note: pitchData.note ?? null,
            frequency: pitchData.frequency ?? null,
            clarity: pitchData.clarity ?? 0,
            volume: pitchData.volume ?? 0,
            isSinging: pitchData.isSinging ?? false,
            lastUpdated: now,
          });
        }

        // Evict stale entries not seen in this poll cycle
        for (const [cachedProfileId, cachedEntry] of companionPitchCacheRef.current.entries()) {
          if (!activeProfileIds.has(cachedProfileId) && (now - cachedEntry.lastUpdated) > STALE_PITCH_MS) {
            companionPitchCacheRef.current.delete(cachedProfileId);
          }
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        // Silently ignore polling errors
      }
    };

    pollCompanionPitch();
    companionPollRef.current = setInterval(pollCompanionPitch, COMPANION_POLL_MS);

    return () => {
      if (companionPollRef.current) {
        clearInterval(companionPollRef.current);
        companionPollRef.current = null;
      }
      if (companionAbortRef.current) companionAbortRef.current.abort();
    };
  }, [phase, isPlaying]);

  return companionPitchCacheRef;
}
