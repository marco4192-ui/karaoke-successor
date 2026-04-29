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
// Pending requests queue — stores operations that failed due to being offline
// Stored in localStorage for persistence across sessions.
//
// NOTE (FD7): This infrastructure is defined but the queue is never populated.
// No addToOfflineQueue() function exists yet. The clearOfflineQueue() export
// exists for future use. This is planned infrastructure for offline-first support.
// ============================================================================

const QUEUE_KEY = 'karaoke-offline-queue';

interface PendingRequest {
  id: string;
  type: string;
  payload: unknown;
  createdAt: number;
}

function loadQueue(): PendingRequest[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(QUEUE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch { return []; }
}

function saveQueue(queue: PendingRequest[]): void {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(QUEUE_KEY, JSON.stringify(queue)); } catch {}
}

/** Clear all pending requests. */
export function clearOfflineQueue(): void {
  saveQueue([]);
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

export interface UseNetworkStatusResult extends NetworkStatus {
  /** Number of pending requests in the offline queue */
  pendingCount: number;
}

/**
 * Hook that tracks network connectivity and server reachability.
 * Also provides access to the offline request queue.
 */
export function useNetworkStatus(): UseNetworkStatusResult {
  const [isOnline, setIsOnline] = useState(() => typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [isServerReachable, setIsServerReachable] = useState<boolean | null>(null);
  const [pendingCount, setPendingCount] = useState(0);

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

  // Poll pending queue count every 2 seconds (simple reactivity without custom events)
  useEffect(() => {
    setPendingCount(loadQueue().length);
    const interval = setInterval(() => setPendingCount(loadQueue().length), 2000);
    return () => clearInterval(interval);
  }, []);

  return { isOnline, isServerReachable, pendingCount };
}
