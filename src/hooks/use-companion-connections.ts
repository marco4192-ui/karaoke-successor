'use client';

import { useEffect, useState } from 'react';

/** Info about one companion client as reported by the server's clients list. */
export interface CompanionClientInfo {
  id: string;
  name: string;
  connected: boolean;
  lastActivity: number;
  profile: { id: string; name: string; color: string; avatar?: string } | null;
}

export interface CompanionConnections {
  /** Profile ids that currently have a connected companion client (existing behaviour). */
  connectedProfileIds: Set<string>;
  /** All registered clients (raw list — includes disconnected ones, sorted by lastActivity desc). */
  clients: CompanionClientInfo[];
  /** Connected clients that have NOT claimed any profile yet. */
  unassignedClients: CompanionClientInfo[];
}

/**
 * Tracks which player profiles have a connected companion device.
 *
 * Polls the mobile server's `clients` endpoint (same source of truth as the
 * Settings → Mobile Devices list) and returns
 *  - a Set of profile ids that currently have a connected companion client
 *  - the full client list (for the R34 assign flow: devices connected but
 *    without a profile claim never matched any player before — the setup
 *    showed "not connected" although the phone was online. The assign UI
 *    now lets the host bind such devices to a player explicitly.)
 */
export function useCompanionConnections(enabled: boolean, pollMs = 2000): CompanionConnections {
  const [state, setState] = useState<CompanionConnections>({
    connectedProfileIds: new Set(),
    clients: [],
    unassignedClients: [],
  });

  useEffect(() => {
    if (!enabled) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync (clear stale ids when disabled)
      setState({ connectedProfileIds: new Set(), clients: [], unassignedClients: [] });
      return;
    }

    let cancelled = false;

    const poll = async () => {
      try {
        const res = await fetch('/api/mobile?action=clients', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json() as {
          clients?: Array<{
            id?: string;
            name?: string;
            connected?: number | boolean;
            lastActivity?: number;
            profile?: { id?: string; name?: string; color?: string; avatar?: string } | null;
          }>;
        };
        if (cancelled) return;
        const clients: CompanionClientInfo[] = (data.clients ?? [])
          .filter((c): c is { id: string; name?: string; connected?: number | boolean; lastActivity?: number; profile?: { id?: string; name?: string; color?: string; avatar?: string } | null } => !!c.id)
          .map(c => ({
            id: c.id,
            name: c.name || 'Mobile Device',
            // Server stores the connect timestamp (truthy) — removed clients
            // are deleted from the map, so everyone listed is registered.
            connected: !!c.connected,
            lastActivity: c.lastActivity ?? 0,
            profile: c.profile?.id
              ? {
                id: c.profile.id,
                name: c.profile.name || c.profile.id,
                color: c.profile.color || '#06B6D4',
                avatar: c.profile.avatar,
              }
              : null,
          }));
        const ids = new Set<string>();
        for (const c of clients) {
          if (c.connected && c.profile) ids.add(c.profile.id);
        }
        const unassigned = clients
          .filter(c => c.connected && !c.profile)
          .sort((a, b) => b.lastActivity - a.lastActivity);
        setState(prev => {
          const prevIds = prev.connectedProfileIds;
          if (
            prevIds.size === ids.size && [...ids].every(id => prevIds.has(id)) &&
            prev.clients.length === clients.length && prev.clients.every((c, i) => c.id === clients[i].id && c.profile?.id === clients[i].profile?.id)
          ) return prev;
          return { connectedProfileIds: ids, clients, unassignedClients: unassigned };
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

  return state;
}
