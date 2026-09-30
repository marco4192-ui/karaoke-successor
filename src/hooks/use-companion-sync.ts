'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useGameStore } from '@/lib/game/store';
import { createPollErrorLogger } from '@/lib/polling-resilience';

export interface CompanionProfile {
  id: string;
  name: string;
  avatar?: string;
  color: string;
  createdAt: number;
}

export interface CompanionQueueItem {
  id: string;
  songId: string;
  songTitle: string;
  songArtist: string;
  addedBy: string;
  addedAt: number;
  companionCode: string;
  status: 'pending' | 'playing' | 'completed';
  playerId?: string;
  playerName?: string;
}

/**
 * Manages companion (mobile client) profiles and queue.
 *
 * Extracted from use-mobile-client.ts (Q9) to reduce responsibility count.
 * - Periodically fetches companion profiles from the server (10s interval)
 * - Auto-imports profiles into the main app's character list
 * - Periodically fetches companion song queue (5s interval)
 */
export function useCompanionSync(): {
  companionProfiles: CompanionProfile[];
  syncCompanionProfiles: () => Promise<void>;
  companionQueue: CompanionQueueItem[];
  syncCompanionQueue: () => Promise<void>;
} {
  const [companionProfiles, setCompanionProfiles] = useState<CompanionProfile[]>([]);
  const [companionQueue, setCompanionQueue] = useState<CompanionQueueItem[]>([]);
  const importProfileFromMobile = useGameStore((state) => state.importProfileFromMobile);
  const syncVersionRef = useRef(0);
  const pollLoggerRef = useRef(createPollErrorLogger('CompanionSync'));
  // R34: clientId → already rebound (prevents duplicate rebind POSTs while a
  // rebind is in flight / until the server reflects the new profile id).
  const reboundClientsRef = useRef<Set<string>>(new Set());

  // Sync companion profiles: fetch from server AND import into main app's character list
  const syncCompanionProfiles = useCallback(async () => {
    const myVersion = ++syncVersionRef.current;
    try {
      const response = await fetch('/api/mobile?action=getprofiles');
      if (!response.ok) {
        pollLoggerRef.current.logError(new Error(`HTTP ${response.status}`));
        return;
      }
      const data = await response.json();
      if (myVersion !== syncVersionRef.current) return; // stale, newer call superseded
      if (data.success && data.profiles) {
        setCompanionProfiles(data.profiles);
        // R34: profileId → clientId map (server-side) for the name-dedup rebind
        const profileClients: Record<string, string> = data.profileClients ?? {};
        data.profiles.forEach((profile: CompanionProfile) => {
          const merged = importProfileFromMobile(profile);
          // R34 NAME-DEDUP REBIND: when the phone created its OWN profile with
          // a name that matches an existing desktop profile, the store keeps
          // the DESKTOP profile id — but the phone stays registered on the
          // server under its phone-id → connection detection NEVER matched
          // ("not connected" although online). Rebind the server client to
          // the desktop profile so the ids line up again.
          const clientId = profileClients[profile.id];
          if (
            merged && clientId && merged.id !== profile.id &&
            !reboundClientsRef.current.has(clientId)
          ) {
            reboundClientsRef.current.add(clientId);
            const rebindProfile = {
              id: merged.id,
              name: merged.name,
              color: merged.color,
              avatar: merged.avatar,
              createdAt: merged.createdAt || Date.now(),
            };
            fetch('/api/mobile', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'assigncharacter',
                payload: { targetClientId: clientId, profile: rebindProfile },
              }),
            }).catch(() => {
              // best-effort — retry on the next sync (allow rebind again)
              reboundClientsRef.current.delete(clientId);
            });
          }
        });
      }
      pollLoggerRef.current.logSuccess();
    } catch (error) {
      pollLoggerRef.current.logError(error);
    }
  }, [importProfileFromMobile]);

  // Periodically fetch companion profiles (every 10 seconds)
  useEffect(() => {
    const syncInterval = setInterval(syncCompanionProfiles, 10000);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync
    syncCompanionProfiles(); // Initial sync (fetches AND imports profiles)

    return () => clearInterval(syncInterval);
  }, [syncCompanionProfiles]);

  // Fetch companion queue from server
  const fetchCompanionQueue = useCallback(async () => {
    try {
      const response = await fetch('/api/mobile?action=getqueue');
      if (!response.ok) return;
      const data = await response.json();
      if (data.success && data.queue) {
        setCompanionQueue(data.queue);
      }
    } catch {
      // Ignore network errors
    }
  }, []);

  // Periodically fetch companion queue (every 5 seconds)
  useEffect(() => {
    const syncInterval = setInterval(fetchCompanionQueue, 5000);
    queueMicrotask(() => fetchCompanionQueue()); // Initial fetch

    return () => clearInterval(syncInterval);
  }, [fetchCompanionQueue]);

  return {
    companionProfiles,
    syncCompanionProfiles,
    companionQueue,
    syncCompanionQueue: fetchCompanionQueue,
  };
}
