'use client';

import { useEffect, useRef } from 'react';
import type { GamePhase } from './cptm-types';
import { subscribePitchFeed, isPitchFeedConnected } from '@/lib/socketio/socketio-pitch-feed';

// ===================== CONSTANTS =====================

/** Companion pitch polling interval in ms (5 polls/sec) — used ONLY while the
 *  phone demonstrably streams over the HTTP fallback (R111/user 5). */
const COMPANION_POLL_MS = 200;

/** R111 (user 5): push-first liveness probe cadence — while the pitch-feed
 *  socket is connected and no HTTP fallback is detected, the poll degrades
 *  to this (silence no longer produces a 5 Hz request stream). */
const COMPANION_PROBE_MS = 2000;

/** Maximum age (ms) before a cached companion pitch is considered stale and evicted */
const STALE_PITCH_MS = 1000;

// ===================== TYPES =====================

/** Latest pitch data received from a companion app for a given profile. */
export interface CompanionPitchEntry {
  note: number | null;
  frequency: number | null;
  clarity: number;
  volume: number;
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
  const companionAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (phase !== 'playing' || !isPlaying) {
      // No timer can exist while not playing (the effect below this guard
      // owns the whole lifecycle) — the cache stays for the next phase.
      return;
    }

    // ── Socket.IO pitch feed (PREFERRED — R111/user 5: pure PUSH) ──
    // The phones push every frame the moment it occurs; this cache fills
    // from the pushes directly. The HTTP poll below is a liveness PROBE that
    // ramps to full cadence ONLY when it detects a phone streaming over the
    // HTTP fallback (its own socket down) — otherwise it stays at probe pace.
    // Stale eviction runs on every poll cycle (probe included).
    let lastSocketPitchAt = 0;
    let httpFallbackActive = false;
    const unsubPitchFeed = subscribePitchFeed((event) => {
      const profileId = event.profile?.id;
      const d = event.data;
      if (!profileId || !d) return;
      lastSocketPitchAt = Date.now();
      httpFallbackActive = false;
      companionPitchCacheRef.current.set(profileId, {
        note: d.note ?? null,
        frequency: d.frequency ?? null,
        clarity: d.clarity ?? 0,
        volume: d.volume ?? 0,
        lastUpdated: Date.now(),
      });
    });

    // R111: cadence state — probe pace (2 s) while push is authoritative,
    // full pace (200 ms) when the phone demonstrably streams over HTTP.
    // R114 (user): NO immediate first fetch and NO 200 ms opening cadence —
    // socket already connected → probe pace from the start; otherwise a
    // single delayed first poll (500 ms — the pitch-feed socket is usually
    // connected by then, so the first poll switches to probe pace BEFORE
    // fetching). A genuine HTTP-fallback phone ramps to full pace on the
    // first poll.
    const pollDelayRef = { current: isPitchFeedConnected() ? COMPANION_PROBE_MS : 500 };
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    const restartPoll = () => {
      if (pollTimer) clearInterval(pollTimer);
      pollTimer = setInterval(pollCompanionPitch, pollDelayRef.current);
    };

    const pollCompanionPitch = async () => {
      // While socket frames arrive fresh the probe never fetches (pure push).
      if (Date.now() - lastSocketPitchAt < 400) return;
      // Socket connected and no HTTP fallback detected → probe cadence.
      if (isPitchFeedConnected() && !httpFallbackActive && pollDelayRef.current !== COMPANION_PROBE_MS) {
        pollDelayRef.current = COMPANION_PROBE_MS;
        restartPoll();
      }
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
        let freshestHttpTs = 0;

        for (const entry of pitchEntries) {
          const profileId = entry.profile?.id;
          const pitchData = entry.data;
          if (!profileId || !pitchData) continue;

          activeProfileIds.add(profileId);
          const ts = typeof pitchData.timestamp === 'number' ? pitchData.timestamp : now;
          if (ts > freshestHttpTs) freshestHttpTs = ts;
          companionPitchCacheRef.current.set(profileId, {
            note: pitchData.note ?? null,
            frequency: pitchData.frequency ?? null,
            clarity: pitchData.clarity ?? 0,
            volume: pitchData.volume ?? 0,
            lastUpdated: now,
          });
        }

        // R111: a fresh HTTP frame NEWER than the last socket frame proves the
        // phone streams over the HTTP fallback → full polling cadence (same
        // store, matching timestamps mean the socket path is authoritative).
        if (freshestHttpTs > 0 && freshestHttpTs > lastSocketPitchAt + 200) {
          httpFallbackActive = true;
        } else if (freshestHttpTs === 0) {
          // No fresh frames at all (silence) → fallback flag resets
          httpFallbackActive = false;
        }
        if (httpFallbackActive && pollDelayRef.current !== COMPANION_POLL_MS) {
          pollDelayRef.current = COMPANION_POLL_MS;
          restartPoll();
        }

        // Evict stale entries not seen fresh in this poll cycle
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

    // R114 (user): delayed first poll, then interval (see pollDelayRef above)
    // — the pitch-feed socket gets time to connect, so the first poll usually
    // runs at probe pace instead of opening a request burst.
    const firstPollTimer = setTimeout(() => {
      pollCompanionPitch();
      restartPoll();
    }, pollDelayRef.current);

    // R111: stale eviction must run at a fixed 250 ms cadence INDEPENDENT of
    // the probe cadence — with push mode active the poll fetches only every
    // 2 s, but silent phones (entries older than STALE_PITCH_MS) must be
    // evicted as fast as the old 200 ms poll did.
    const staleSweep = setInterval(() => {
      const now = Date.now();
      for (const [pid, entry] of companionPitchCacheRef.current.entries()) {
        if (now - entry.lastUpdated > STALE_PITCH_MS) {
          companionPitchCacheRef.current.delete(pid);
        }
      }
    }, 250);

    return () => {
      unsubPitchFeed();
      clearTimeout(firstPollTimer);
      clearInterval(staleSweep);
      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
      if (companionAbortRef.current) companionAbortRef.current.abort();
    };
  }, [phase, isPlaying]);

  return companionPitchCacheRef;
}
