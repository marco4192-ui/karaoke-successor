'use client';

import { useState, useEffect, useRef } from 'react';
import { subscribePitchFeed } from '@/lib/socketio/socketio-pitch-feed';

export interface MobilePitchData {
  frequency: number | null;
  note: number | null;
  volume: number;
  clarity?: number;
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
 *
 * R52 — Profil-Matching: Bei mehreren verbundenen Companions (z. B. Sänger +
 * Zuschauer mit Companion-Steuerung) darf P1 nicht einfach den ERSTEN
 * Pitch-Stream bekommen („first wins" griff sich previously das falsche
 * Handy). Mit matchProfileId werden nur Frames des Companions akzeptiert,
 * dessen Profil dem Spieler entspricht; ohne matchProfileId (Legacy-Modus,
 * z. B. CPTM-Zuseher) bleibt das alte first-wins-Verhalten.
 *
 * R60 — PERF-FIX (Ref-Modus): Mit dem dritten Parameter `pitchRef` fließen
 * Frames DIREKT in den Ref — ohne setState, ohne Re-Render. Zuvor re-renderete
 * jeder Pitch-Frame (30 Hz pro Handy) die komplette GameScreen-Baumgruppe;
 * im Duell mit 2 Companion-Sängern (60 SetState/s) stockte das Spiel.
 * Der Game-Loop liest den Ref ohnehin mit rAF-Takt — der Umweg über React
 * State war reiner Overhead. `hasMobileClient` bleibt State (ändert sich
 * selten). Ohne pitchRef gilt das Legacy-Verhalten (mobilePitch-State).
 */
export function useMobilePitchPolling(
  song: { id: string } | null,
  matchProfileId?: string | null,
  pitchRef?: React.MutableRefObject<MobilePitchData | null>,
): {
  mobilePitch: MobilePitchData | null;
  hasMobileClient: boolean;
} {
  const [mobilePitch, setMobilePitch] = useState<MobilePitchData | null>(null);
  const [hasMobileClient, setHasMobileClient] = useState(false);
  // Track last received pitch to skip identical updates (dedup re-renders)
  const lastPitchRef = useRef<string>('');
  // Stable ref of the profile to match (song changes restart the effect; the
  // profile id may arrive with the first gamestate AFTER the game screen
  // mounted — the ref always reflects the latest value via effect sync).
  const matchProfileIdRef = useRef<string | null>(matchProfileId ?? null);
  useEffect(() => {
    matchProfileIdRef.current = matchProfileId ?? null;
  }, [matchProfileId]);
  // R60: neuester pitchRef-Stand (Effekt läuft nur auf Song-Wechsel — der
  // Ref selbst kann sich zwischen Renders ändern, ohne den Effekt neu zu
  // starten; useRef-Objekte des Callers sind idR. stabil).
  const pitchRefStable = useRef(pitchRef);
  pitchRefStable.current = pitchRef;

  useEffect(() => {
    if (!song) {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync
      setMobilePitch(null);
      setHasMobileClient(false);
      lastPitchRef.current = '';
      if (pitchRefStable.current) pitchRefStable.current.current = null;
      return;
    }

    let aborted = false;
    let abortController: AbortController | null = null;
    let pollInterval: ReturnType<typeof setInterval> | null = null;
    // Exponential backoff: when no companion is connected, poll less frequently
    let pollDelay = 100;

    // R60: Frame-Zustellung — Ref-Modus schreibt direkt (kein Re-Render),
    // Legacy-Modus updated State.
    const applyFrame = (pitchData: MobilePitchData) => {
      const target = pitchRefStable.current;
      if (target) {
        target.current = pitchData;
        return;
      }
      setMobilePitch(pitchData);
    };

    // ── Socket.IO pitch feed (preferred): instant pushes, no polling chain ──
    // Matching semantics: with matchProfileId ONLY frames from that profile
    // are accepted (the singing phone); without it the FIRST companion that
    // streams pitch during this song wins (legacy behavior — same order the
    // server's getpitch Map iteration would produce). The HTTP poll below
    // stays as a fallback watchdog — skipped while socket frames arrive
    // fresh (< 400 ms).
    let lastSocketPitchAt = 0;
    let firstSocketClientId: string | null = null;
    const unsubPitchFeed = subscribePitchFeed((event) => {
      if (aborted) return;
      const wanted = matchProfileIdRef.current;
      if (wanted) {
        // Profile-matched: ignore every other phone's frames entirely
        if (event.profile?.id !== wanted) return;
      } else {
        if (firstSocketClientId === null) firstSocketClientId = event.clientId;
        if (event.clientId !== firstSocketClientId) return;
      }
      lastSocketPitchAt = Date.now();
      const pitchData = event.data;
      // Dedup on the meaningful fields only (excluding the ever-changing
      // timestamp) so silence doesn't cause 30 useless re-renders per second.
      const serialized = JSON.stringify({
        f: pitchData.frequency, n: pitchData.note, v: pitchData.volume,
      });
      if (serialized !== lastPitchRef.current) {
        lastPitchRef.current = serialized;
        applyFrame(pitchData);
      }
      setHasMobileClient(true);
    });

    const startPolling = () => {
      if (pollInterval) clearInterval(pollInterval);
      pollInterval = setInterval(pollMobilePitch, pollDelay);
    };

    const pollMobilePitch = async () => {
      // Watchdog: skip the HTTP poll while the socket feed is fresh
      if (Date.now() - lastSocketPitchAt < 400) return;
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
        if (!response.ok) return;

        const data = await response.json();
        if (aborted) return;

        if (data.success && Array.isArray(data.pitches) && data.pitches.length > 0) {
          // R52 — Profil-Matching auch im HTTP-Watchdog: bevorzugt der Eintrag
          // des SPIELENDEN Profils (mehrere Handys → richtiges Mikro), sonst
          // wie bisher der erste (Legacy).
          const wanted = matchProfileIdRef.current;
          const entries = data.pitches as Array<{ clientId?: string; data?: MobilePitchData; profile?: { id?: string } | null }>;
          const matched = wanted
            ? entries.find(e => e.profile?.id === wanted && e.data)
            : undefined;
          const chosen = matched ?? entries[0];
          const pitchData = chosen?.data;
          if (pitchData) {
            // Dedup: only update state if pitch actually changed
            const serialized = JSON.stringify(pitchData);
            if (serialized !== lastPitchRef.current) {
              lastPitchRef.current = serialized;
              applyFrame(pitchData);
            }
            setHasMobileClient(true);
          }
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

    // Start first poll immediately, then set up interval for repeated polling
    pollMobilePitch();
    startPolling();

    // Clear backoff timer on cleanup
    return () => {
      aborted = true;
      unsubPitchFeed();
      if (pollInterval) clearInterval(pollInterval);
      if (abortController) abortController.abort();
    };
  }, [song]);

  // R60: Im Ref-Modus ist mobilePitch-State immer null (kein Consumer sollte
  // ihn dort noch lesen) — der Rückwert ist der aktuelle Ref-Stand für
  // Debug/Compatibilität.
  return { mobilePitch: pitchRef ? (pitchRef.current) : mobilePitch, hasMobileClient };
}
