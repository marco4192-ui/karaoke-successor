'use client';

import { useState, useEffect, useCallback } from 'react';
import { useGameStore } from '@/lib/game/store';

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

  // Sync companion profiles: fetch from server AND import into main app's character list
  const syncCompanionProfiles = useCallback(async () => {
    try {
      const response = await fetch('/api/mobile?action=getprofiles');
      if (!response.ok) {
        console.error('[CompanionSync] Failed to fetch profiles:', response.status);
        return;
      }
      const data = await response.json();
      if (data.success && data.profiles) {
        setCompanionProfiles(data.profiles);
        data.profiles.forEach((profile: CompanionProfile) => {
          importProfileFromMobile(profile);
        });
      }
    } catch (error) {
      console.error('[CompanionSync] Error syncing profiles:', error);
    }
  }, [importProfileFromMobile]);

  // Periodically fetch companion profiles (every 10 seconds)
  useEffect(() => {
    const syncInterval = setInterval(syncCompanionProfiles, 10000);
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

  // Sync companion queue - can be used by main app to show companion queue items
  const syncCompanionQueue = useCallback(async () => {
    await fetchCompanionQueue();
  }, [fetchCompanionQueue]);

  // Periodically fetch companion queue (every 5 seconds)
  useEffect(() => {
    const syncInterval = setInterval(fetchCompanionQueue, 5000);
    fetchCompanionQueue(); // Initial fetch

    return () => clearInterval(syncInterval);
  }, [fetchCompanionQueue]);

  return {
    companionProfiles,
    syncCompanionProfiles,
    companionQueue,
    syncCompanionQueue,
  };
}
