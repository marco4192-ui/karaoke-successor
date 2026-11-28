'use client';

import { useState, useEffect, useRef } from 'react';
import { subscribePitchFeed, isPitchFeedConnected } from '@/lib/socketio/socketio-pitch-feed';
import { PitchStabilizer } from '@/lib/audio/pitch-smoothing';

export interface MobilePitchData {
  frequency: number | null;
  note: number | null;
  volume: number;
  clarity?: number;
  /** R94-5: server receive time — drives the stale-frame TTL below. */
  timestamp?: number;
}

/** R94-5: companion frames older than this are treated as silence. Kills the
 *  hidden "infinite hold": the last frame used to stay in the ref forever
 *  (phone locked / network stall) and kept scoring. 500 ms > the phone's
 *  33 ms send throttle + network jitter, so live streams never trip it. */
const COMPANION_FRAME_TTL_MS = 500;
/** R94-5: same stabilization the DESKTOP pitch detector applies before
 *  scoring (DIFFICULTY_PITCH_CONFIGS.medium.pitchStabilityFrames = 2) —
 *  without this the desktop scored a smoothed note while the companion
 *  scored raw jitter, an asymmetric scoring basis. */
const COMPANION_STABILITY_FRAMES = 2;

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
  // R94-5: mirror of the legacy-mode state so the stale sweep can read the
  // current frame without re-subscribing on every pitch change.
  const mobilePitchStateRef = useRef<MobilePitchData | null>(null);
  useEffect(() => { mobilePitchStateRef.current = mobilePitch; }, [mobilePitch]);
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
    // R111 (user 5): cadence targets. FULL = HTTP fallback data path (phone
    // socket down, fresh HTTP frames newer than the socket feed). PROBE =
    // socket-connected liveness check — push mode is authoritative, the probe
    // only exists to detect a phone that silently fell back to HTTP batching.
    const POLL_FULL_MS = 100;
    const POLL_PROBE_MS = 2000;
    // R114 (user): NO immediate first fetch and NO 100 ms opening cadence.
    // The old start (instant pollMobilePitch + 100 ms interval) fired a
    // request burst at every song start until the socket's connect finished
    // and the probe cadence took over. Now: socket already connected → probe
    // cadence from the start; otherwise a single delayed first poll (500 ms —
    // by then the pitch-feed socket is usually connected and the very first
    // pollMobilePitch call switches to probe cadence BEFORE fetching).
    let pollDelay = isPitchFeedConnected() ? POLL_PROBE_MS : 500;

    // ── R94-5: parity layer for companion frames ──
    // 1) PitchStabilizer: same 2-frame/±1-semitone smoothing the desktop
    //    detector applies — both input sources now feed the SAME note
    //    quality into scoring.
    // 2) TTL sweep: when no fresh frame arrived within COMPANION_FRAME_TTL_MS,
    //    the ref/state is nulled (silence) — mirrors the desktop detector,
    //    which nulls immediately when the gate closes.
    const stabilizer = new PitchStabilizer(COMPANION_STABILITY_FRAMES);
    const processFrame = (frame: MobilePitchData): MobilePitchData => {
      if (frame.note != null) {
        const stable = stabilizer.process(frame.note);
        return stable !== null ? { ...frame, note: stable } : frame;
      }
      stabilizer.reset();
      return frame;
    };
    const isStale = (frame: MobilePitchData | null): boolean =>
      !!frame && typeof frame.timestamp === 'number' && Date.now() - frame.timestamp > COMPANION_FRAME_TTL_MS;

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

    // R95/2b: dedup must hide RENDER CHURN, not LIVENESS. A steady note with
    // steady volume (phone AGC!) produces byte-identical frames for seconds;
    // the old dedup skipped applyFrame entirely, so the 500ms TTL sweep
    // nulled the frame mid-note — the stream looked dead while the phone
    // was singing (constant-frame companion streams scored ZERO, sustained
    // notes tore off). Identical frames now refresh the stored timestamp so
    // the sweep sees the stream is alive.
    const refreshLiveness = (frame: MobilePitchData) => {
      const target = pitchRefStable.current;
      if (target) {
        const cur = target.current;
        if (cur && cur.note != null && typeof frame.timestamp === 'number') {
          target.current = { ...cur, timestamp: frame.timestamp };
        }
        return;
      }
      // State mode: throttled refresh (~3 Hz) — keeps the TTL alive without
      // per-frame re-renders (the whole point of the dedup).
      const cur = mobilePitchStateRef.current;
      if (
        cur && cur.note != null && typeof frame.timestamp === 'number' &&
        Date.now() - (typeof cur.timestamp === 'number' ? cur.timestamp : 0) > 300
      ) {
        setMobilePitch({ ...cur, timestamp: frame.timestamp });
      }
    };

    const staleSweepInterval = setInterval(() => {
      if (aborted) return;
      const target = pitchRefStable.current;
      if (target) {
        if (isStale(target.current) && target.current?.note != null) {
          stabilizer.reset();
          target.current = { ...target.current, frequency: null, note: null };
        }
      } else if (isStale(mobilePitchStateRef.current) && mobilePitchStateRef.current?.note != null) {
        stabilizer.reset();
        setMobilePitch({ ...mobilePitchStateRef.current, frequency: null, note: null });
      }
    }, 250);

    // ── Socket.IO pitch feed (PREFERRED — R111/user 5: pure PUSH) ──
    // The companion phone pushes every frame the moment it occurs
    // ('companion:pitch', ~30 Hz while singing); matching semantics as below.
    // The HTTP poll is NOT a pull-mode data path anymore — it is a liveness
    // PROBE (2 s) that only ramps to full cadence when it detects the phone
    // streaming over the HTTP fallback (socket down on the phone). Silence
    // therefore produces ~0.5 requests/s instead of 10/s.
    let lastSocketPitchAt = 0;
    let firstSocketClientId: string | null = null;
    // R111: true while the phone demonstrably streams over the HTTP fallback
    // (fresh HTTP frames NEWER than the socket feed). A socket frame resets it.
    let httpFallbackActive = false;
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
      httpFallbackActive = false;
      // R94-5: stabilize + TTL-check BEFORE dedup (identical raw frames must
      // still advance the stabilizer's window).
      const raw = event.data as MobilePitchData;
      if (isStale(raw)) {
        stabilizer.reset();
        return;
      }
      const pitchData = processFrame(raw);
      // Dedup on the meaningful fields only (excluding the ever-changing
      // timestamp) so silence doesn't cause 30 useless re-renders per second.
      const serialized = JSON.stringify({
        f: pitchData.frequency, n: pitchData.note, v: pitchData.volume,
      });
      if (serialized !== lastPitchRef.current) {
        lastPitchRef.current = serialized;
        applyFrame(pitchData);
      } else {
        // R95/2b: identical frame — still mark the stream as live (see
        // refreshLiveness) so the TTL sweep keeps a sustained note alive.
        refreshLiveness(pitchData);
      }
      setHasMobileClient(true);
    });

    const startPolling = () => {
      if (pollInterval) clearInterval(pollInterval);
      pollInterval = setInterval(pollMobilePitch, pollDelay);
    };

    // R111 (user 5) + R114: cadence switch — see the constants above the
    // pollDelay declaration. setPollDelay restarts the interval only when the
    // cadence actually changes.
    const setPollDelay = (ms: number) => {
      if (pollDelay !== ms) {
        pollDelay = ms;
        startPolling();
      }
    };

    const pollMobilePitch = async () => {
      // While socket frames arrive fresh the poll NEVER fires (pure push).
      if (Date.now() - lastSocketPitchAt < 400) return;
      // Socket connected and no HTTP fallback detected → slow probe cadence.
      // (The fetch below ramps back to full cadence when it detects a phone
      // streaming over HTTP because its own socket is down.)
      if (isPitchFeedConnected() && !httpFallbackActive) setPollDelay(POLL_PROBE_MS);
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
          const pitchData = chosen?.data as MobilePitchData | undefined;
          if (pitchData) {
            // R94-5: same TTL for the HTTP watchdog — a stale server frame
            // (phone stopped streaming) must not feed scoring.
            if (isStale(pitchData)) {
              setHasMobileClient(false);
              // R111: silence (stale entries) must NOT hold the fast cadence —
              // the phone is not streaming, so the fallback flag resets and
              // the probe cadence takes over at the next poll start.
              httpFallbackActive = false;
              return;
            }
            const processed = processFrame(pitchData);
            // Dedup: only update state if pitch actually changed
            const serialized = JSON.stringify({
              f: processed.frequency, n: processed.note, v: processed.volume,
            });
            if (serialized !== lastPitchRef.current) {
              lastPitchRef.current = serialized;
              applyFrame(processed);
            } else {
              // R95/2b: identical frame — keep the TTL alive (see socket path)
              refreshLiveness(processed);
            }
            setHasMobileClient(true);
            // R111 (user 5): fresh HTTP frame — the phone is streaming over the
            // HTTP fallback ONLY when its frame is NEWER than the last socket
            // frame (the socket path writes the SAME server store, so matching
            // timestamps mean push is alive). Ramp to full cadence just for the
            // genuine fallback; otherwise push mode stays authoritative.
            const frameTs = typeof pitchData.timestamp === 'number' ? pitchData.timestamp : 0;
            if (frameTs > lastSocketPitchAt + 200) {
              httpFallbackActive = true;
              setPollDelay(POLL_FULL_MS);
            }
          }
        } else {
          setHasMobileClient(false);
          // No companion frames at all: backoff (max 2s) — but never below the
          // probe cadence while the socket is connected (push is authoritative).
          if (!isPitchFeedConnected() && pollDelay < 2000) {
            pollDelay = Math.min(pollDelay * 2, 2000);
            startPolling();
          }
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        // Ignore other polling errors — companion may not be connected
      }
    };

    // R114 (user): delayed first poll, then interval. The delayed start gives
    // the pitch-feed socket time to finish connecting so the FIRST pollMobile-
    // Pitch call already switches to probe cadence before its fetch (no more
    // 100 ms opening burst). A genuine HTTP-fallback phone is detected on the
    // first poll and then ramps to full cadence immediately.
    const firstPollTimer = setTimeout(() => {
      if (aborted) return;
      pollMobilePitch();
      startPolling();
    }, pollDelay);

    // Clear backoff timer on cleanup
    return () => {
      aborted = true;
      clearTimeout(firstPollTimer);
      unsubPitchFeed();
      clearInterval(staleSweepInterval);
      if (pollInterval) clearInterval(pollInterval);
      if (abortController) abortController.abort();
    };
  }, [song]);

  // R60: Im Ref-Modus ist mobilePitch-State immer null (kein Consumer sollte
  // ihn dort noch lesen) — der Rückwert ist der aktuelle Ref-Stand für
  // Debug/Compatibilität.
  return { mobilePitch: pitchRef ? (pitchRef.current) : mobilePitch, hasMobileClient };
}
