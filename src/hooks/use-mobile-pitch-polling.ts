'use client';

import { useState, useEffect, useRef } from 'react';

export interface MobilePitchData {
  frequency: number | null;
  note: number | null;
  volume: number;
  clarity?: number;
  isSinging?: boolean;
}

/**
 * Hook to poll mobile companion pitch data from the server.
 * Extracted from game-screen.tsx to reduce its size.
 *
 * Polls /api/mobile?action=getpitch every 100ms when a song is active.
 * Optimizations vs original 50ms polling:
 * - 100ms interval (10 polls/sec) — sufficient for smooth pitch visualization
 * - Dedup: only triggers React re-render when pitch data actually changed
 * - AbortController: cancels in-flight requests when a new poll starts
 */
export function useMobilePitchPolling(song: { id: string } | null): {
  mobilePitch: MobilePitchData | null;
  hasMobileClient: boolean;
} {
  const [mobilePitch, setMobilePitch] = useState<MobilePitchData | null>(null);
  const [hasMobileClient, setHasMobileClient] = useState(false);
  // Track last received pitch to skip identical updates (dedup re-renders)
  const lastPitchRef = useRef<string>('');

  useEffect(() => {
    if (!song) {
      setMobilePitch(null);
      setHasMobileClient(false);
      lastPitchRef.current = '';
      return;
    }

    let aborted = false;
    let abortController: AbortController | null = null;
    let pollInterval: ReturnType<typeof setInterval> | null = null;
    // Exponential backoff: when no companion is connected, poll less frequently
    let pollDelay = 100;
    let backoffTimer: ReturnType<typeof setTimeout> | null = null;

    const startPolling = () => {
      if (pollInterval) clearInterval(pollInterval);
      pollInterval = setInterval(pollMobilePitch, pollDelay);
    };

    const pollMobilePitch = async () => {
      // Cancel any in-flight request from the previous poll
      if (abortController) {
        abortController.abort();
      }
      abortController = new AbortController();

      try {
        const response = await fetch('/api/mobile?action=getpitch', {
          signal: abortController.signal,
        });
        if (aborted) return;

        const data = await response.json();
        if (aborted) return;

        if (data.success && Array.isArray(data.pitches) && data.pitches.length > 0) {
          const pitchData = data.pitches[0].data;
          // Dedup: only update state if pitch actually changed
          const serialized = JSON.stringify(pitchData);
          if (serialized !== lastPitchRef.current) {
            lastPitchRef.current = serialized;
            setMobilePitch(pitchData);
          }
          setHasMobileClient(true);
          // Companion connected: reset to fast polling
          if (pollDelay > 100) {
            pollDelay = 100;
            startPolling();
          }
        } else {
          setHasMobileClient(false);
          // No companion: apply backoff (max 2s)
          if (pollDelay < 2000) {
            pollDelay = Math.min(pollDelay * 2, 2000);
            startPolling();
          }
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        // Ignore other polling errors — companion may not be connected
      }
    };

    // Clear backoff timer on cleanup
    return () => {
      aborted = true;
      if (pollInterval) clearInterval(pollInterval);
      if (backoffTimer) clearTimeout(backoffTimer);
      if (abortController) abortController.abort();
    };
  }, [song]);

  return { mobilePitch, hasMobileClient };
}
