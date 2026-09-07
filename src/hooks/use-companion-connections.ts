'use client';

import { useEffect, useState } from 'react';

/**
 * Tracks which player profiles have a connected companion device.
 *
 * Polls the mobile server's `clients` endpoint (same source of truth as the
 * Settings → Mobile Devices list) and returns a Set of profile ids that
 * currently have a connected companion client.
 *
 * Previously the party setup hardcoded `isConnected: false` for companion
 * players ("Will be updated by mobile sync" — never implemented), so the UI
 * always showed "(not connected)" even when the device was connected and
 * mirroring. This hook provides the real status.
 */
export function useCompanionConnections(enabled: boolean, pollMs = 2000): Set<string> {
  const [connectedProfileIds, setConnectedProfileIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!enabled) {
      setConnectedProfileIds(new Set());
      return;
    }

    let cancelled = false;

    const poll = async () => {
      try {
        const res = await fetch('/api/mobile?action=clients', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json() as {
          clients?: Array<{ connected?: boolean; profile?: { id?: string } | null }>;
        };
        if (cancelled) return;
        const ids = new Set<string>();
        for (const c of data.clients ?? []) {
          if (c.connected && c.profile?.id) ids.add(c.profile.id);
        }
        setConnectedProfileIds(prev => {
          if (prev.size === ids.size && [...ids].every(id => prev.has(id))) return prev;
          return ids;
        });
      } catch {
        // Server unreachable — keep last known state
      }
    };

    poll();
    const interval = setInterval(poll, pollMs);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [enabled, pollMs]);

  return connectedProfileIds;
}
