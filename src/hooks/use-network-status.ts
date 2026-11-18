'use client';

import { useState, useEffect } from 'react';
import { API_BASE } from '@/lib/api/leaderboard-service';

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

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook that tracks network connectivity and server reachability.
 */
export function useNetworkStatus(): NetworkStatus {
  const [isOnline, setIsOnline] = useState(() => typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [isServerReachable, setIsServerReachable] = useState<boolean | null>(null);

  // Browser online/offline events
  useEffect(() => {
    const goOnline = () => {
      setIsOnline(true);
      // Re-check server when coming back online
      checkServerReachable().then(setIsServerReachable);
    };
    const goOffline = () => {
      setIsOnline(false);
      setIsServerReachable(false);
    };

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);

    // Initial server check
    checkServerReachable().then(setIsServerReachable);

    // Self-healing (R80): the probe used to run exactly once — a transient
    // failure at startup (or a server restart) kept the banner up forever,
    // even while boards loaded fine afterwards. Re-probe every 60 s so the
    // banner clears itself once the server answers again.
    const recheck = setInterval(() => {
      checkServerReachable().then(setIsServerReachable);
    }, 60_000);

    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
      clearInterval(recheck);
    };
  }, []);

  return { isOnline, isServerReachable };
}
