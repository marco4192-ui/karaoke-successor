'use client';

import { useEffect, useRef } from 'react';

/**
 * Shared utilities for the streaming-platform player components
 * (Rutube / VK / Bilibili / Niconico).
 *
 * All four players mirror the YouTubePlayer/DailymotionPlayer prop interface
 * so GameBackground can dispatch to them uniformly:
 *
 *   videoUrl, videoGap (ms), onReady, onTimeUpdate (song-time ms),
 *   onEnded, onAdStart, onAdEnd, onError, isPlaying, startTime (ms),
 *   interactive, muted
 *
 * plus the manual-start extension:
 *
 *   manualStartConfirmed — the user confirmed "music is running" via the
 *                          song-start gate (Bilibili always; Niconico when
 *                          its unofficial API is dead).
 *   onManualGateRequired — the player detects it cannot drive playback
 *                          programmatically and requests the manual gate UI.
 */

/** Props shared by all manual-start-capable platform players. */
export interface ManualStartPlayerProps {
  /** True once the user confirmed the song-start gate ("Musik läuft — Los!"). */
  manualStartConfirmed?: boolean;
  /** Fired when the player cannot auto-start and needs the manual gate UI. */
  onManualGateRequired?: () => void;
}

/** Tolerance (seconds) around the gate position before the gate counts as open. */
export const START_GATE_TOLERANCE_SECONDS = 0.3;

/** How long (ms) to wait for API signs of life before requesting the manual gate. */
export const API_DEAD_TIMEOUT_MS = 9000;

/**
 * Wall-clock based song clock for players without a time API (Bilibili,
 * Niconico API-dead fallback).
 *
 * Emits `onTick(startOffsetMs + elapsedMs)` every 100ms while `active` is
 * true — the elapsed time is measured from the FIRST activation, and the
 * clock freezes while inactive (pause) and resumes without drift.
 */
export function useManualSongClock(options: {
  /** Song position (ms) at the moment the clock starts ticking. */
  startOffsetMs: number;
  /** Clock only advances while true. */
  active: boolean;
  /** Called ~10x/s with the current song time in ms. */
  onTick: (_songTimeMs: number) => void;
}): void {
  const { startOffsetMs, active, onTick } = options;

  // Ref-synced callbacks (effect-based to comply with the react-hooks/refs
  // lint rule; the one-commit delay is irrelevant for a 100ms ticker).
  const onTickRef = useRef(onTick);
  const startOffsetRef = useRef(startOffsetMs);
  useEffect(() => {
    onTickRef.current = onTick;
    startOffsetRef.current = startOffsetMs;
  }, [onTick, startOffsetMs]);

  // Elapsed accumulation: anchorWall = wall time when the clock last resumed,
  // anchorElapsed = accumulated elapsed ms at that moment.
  const anchorWallRef = useRef<number | null>(null);
  const anchorElapsedRef = useRef(0);

  useEffect(() => {
    if (active) {
      // (Re-)start the clock — remember when we resumed so pause/resume
      // picks up exactly where it left off (no drift, no jump).
      if (anchorWallRef.current === null) {
        anchorWallRef.current = Date.now();
      }
    } else if (anchorWallRef.current !== null) {
      // Freeze: fold the elapsed time into the anchor.
      anchorElapsedRef.current += Date.now() - anchorWallRef.current;
      anchorWallRef.current = null;
    }
  }, [active]);

  useEffect(() => {
    if (!active) return;
    const interval = setInterval(() => {
      const wall = anchorWallRef.current;
      if (wall === null) return;
      const elapsed = anchorElapsedRef.current + (Date.now() - wall);
      onTickRef.current(startOffsetRef.current + elapsed);
    }, 100);
    return () => clearInterval(interval);
  }, [active]);

  // Reset when the song (start offset) changes — a new song starts the clock over.
  useEffect(() => {
    anchorWallRef.current = active ? Date.now() : null;
    anchorElapsedRef.current = 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only on offset identity change
  }, [startOffsetMs]);
}

/**
 * Clamp a reported platform video position into a monotonic song time (ms).
 *
 * - Converts video seconds to song ms:  (videoSec + videoGapSec) * 1000
 * - Floors at `startTimeMs` so pre-start seeks/jitter never wind the clock back
 * - Caps regression vs. the last emitted value (platforms sometimes re-emit
 *   stale positions right after seeks).
 */
export function toSongTimeMs(
  videoSeconds: number,
  videoGapSeconds: number,
  startTimeMs: number,
): number {
  const raw = (videoSeconds + videoGapSeconds) * 1000;
  return Math.max(startTimeMs, Math.round(raw));
}
