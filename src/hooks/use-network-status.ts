'use client';

import { useState, useEffect } from 'react';

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

const API_BASE = 'https://hosting236176.ae88b.netcup.net/leaderboard-api';

async function checkServerReachable(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${API_BASE}/`, { method: 'GET', signal: controller.signal });
    clearTimeout(timeoutId);
    return res.ok;
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

    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  return { isOnline, isServerReachable };
}
