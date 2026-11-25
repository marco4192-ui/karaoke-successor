'use client';

import { useState, useEffect, useRef } from 'react';
import { API_BASE } from '@/lib/api/leaderboard-service';
import { useGameStore } from '@/lib/game/store';
import { usePartyStore } from '@/lib/game/party-store';

// ============================================================================
// Types
// ============================================================================

export interface NetworkStatus {
  /** Whether the browser reports network connectivity */
  isOnline: boolean;
  /** Whether the leaderboard API server is reachable (null = not checked yet) */
  isServerReachable: boolean | null;
}

// ============================================================================
// Server reachability check
// ============================================================================

async function checkServerReachable(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    // Intentionally WITHOUT the X-API-Key: this is a liveness probe, not an
    // authenticated call. The app-only-auth server (by design) answers a
    // keyless GET / with 401 — which PROVES routing, PHP and the key check
    // are all working, i.e. the server is very much alive. Treating 401 as
    // "unreachable" (the old `res.ok` test) kept the "Server unreachable"
    // banner permanently visible while every real board call (with the key)
    // loaded fine. 403 (.htaccess protection) is also a live server.
    // 404/5xx/network-error/timeout remain unreachable.
    const res = await fetch(`${API_BASE}/`, { method: 'GET', signal: controller.signal });
    clearTimeout(timeoutId);
    return res.ok || res.status === 401 || res.status === 403;
  } catch { return false; }
}

/** R110 (user point 8): online features actually used? When the user never
 *  enabled the online leaderboard, the periodic probe is SKIPPED entirely —
 *  it was the source of endless failed console requests ("fehlerhafte
 *  Anfragen") for people who never touched the leaderboard. */
function isOnlineUsageEnabled(): boolean {
  try {
    return useGameStore.getState().onlineEnabled === true;
  } catch {
    return true; // store unavailable (SSR) — keep the legacy behavior
  }
}

/** R111 (user 7): true while a song is ACTIVELY running — standard games set
 *  the game-store status to 'playing'; party modes (PTM/CPTM/Medley/BR) flag
 *  isSongPlaying in the party store. Leaderboard/liveness requests are paused
 *  during gameplay (they cost console noise + network roundtrips exactly when
 *  the game loop is most timing-sensitive). */
function isGameplayActive(): boolean {
  try {
    if (useGameStore.getState().gameState.status === 'playing') return true;
    if (usePartyStore.getState().isSongPlaying) return true;
    return false;
  } catch {
    return false;
  }
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook that tracks network connectivity and server reachability.
 *
 * R110 (user point 8): two noise fixes —
 *  1. The probe only runs while online features are ENABLED
 *     (gameStore.onlineEnabled, default false). A user who never uses the
 *     online leaderboard no longer generates a failed cross-origin request
 *     every 60 s in the console.
 *  2. Exponential backoff while unreachable (60 s → 2 min → 5 min → 10 min),
 *     reset to 60 s after a successful probe. A dead server used to be
 *     re-probed at full rate forever; now the console noise decays.
 */
export function useNetworkStatus(): NetworkStatus {
  const [isOnline, setIsOnline] = useState(() => typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [isServerReachable, setIsServerReachable] = useState<boolean | null>(null);
  const backoffMsRef = useRef(60_000);

  // Browser online/offline events
  useEffect(() => {
    const goOnline = () => {
      setIsOnline(true);
      backoffMsRef.current = 60_000;
      // Re-check server when coming back online
      if (isOnlineUsageEnabled()) {
        checkServerReachable().then(setIsServerReachable);
      }
    };
    const goOffline = () => {
      setIsOnline(false);
      setIsServerReachable(false);
    };

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);

    // Initial server check (only when online features are in use at all)
    if (isOnlineUsageEnabled()) {
      checkServerReachable().then(setIsServerReachable);
    }

    // Self-healing (R80): the probe used to run exactly once — a transient
    // failure at startup (or a server restart) kept the banner up forever,
    // even while boards loaded fine afterwards. Re-probe on a backoff
    // schedule so the banner clears itself once the server answers again.
    // R110: recursive setTimeout — the NEXT delay is chosen per outcome
    // (backoff while unreachable, 60 s while healthy), and each tick
    // re-checks whether online features are still enabled at all.
    let probeTimer: ReturnType<typeof setTimeout> | null = null;
    /** Recursive probe scheduler. Optional `delayMs` overrides the backoff
     *  interval (used for the gameplay re-check loop: no request fires, we
     *  just want to notice the song's end quickly). */
    const runProbeCycle = (delayMs?: number) => {
      probeTimer = setTimeout(async () => {
        if (!isOnlineUsageEnabled()) {
          // Online features off → no probing, no console noise. Stay quiet
          // (null = banner hidden) until the flag flips on again.
          setIsServerReachable(null);
          runProbeCycle();
          return;
        }
        // R111 (user 7): active gameplay → NO requests. Re-check every 15 s
        // (no network traffic) so probing resumes once the song ends; the
        // banner keeps its last known state meanwhile.
        if (isGameplayActive()) {
          runProbeCycle(15_000);
          return;
        }
        const reachable = await checkServerReachable();
        setIsServerReachable(reachable);
        backoffMsRef.current = reachable
          ? 60_000
          : Math.min(backoffMsRef.current * 2, 600_000);
        runProbeCycle();
      }, delayMs ?? backoffMsRef.current);
    };
    if (isOnlineUsageEnabled()) runProbeCycle();

    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
      if (probeTimer) clearTimeout(probeTimer);
    };
  }, []);

  return { isOnline, isServerReachable };
}
