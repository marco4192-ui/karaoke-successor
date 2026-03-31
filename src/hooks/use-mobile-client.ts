'use client';

import { useState, useEffect, useCallback } from 'react';
import { useGameStore } from '@/lib/game/store';
import type { Song, GameMode } from '@/types/game';

export interface UseMobileClientOptions {
  song: Song | null;
  isPlaying: boolean;
  currentTime: number;
  gameMode?: GameMode;
}

export interface MobilePitchData {
  frequency: number | null;
  note: number | null;
  volume: number;
}

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

export function useMobileClient({
  song,
  isPlaying,
  currentTime,
  gameMode,
}: UseMobileClientOptions): {
  mobilePitch: MobilePitchData | null;
  hasMobileClient: boolean;
  isRemoteControlEnabled: boolean;
  sendGameState: () => Promise<void>;
  sendAdState: (isAdPlaying: boolean) => Promise<void>;
  companionProfiles: CompanionProfile[];
  syncCompanionProfiles: () => Promise<void>;
  companionQueue: CompanionQueueItem[];
  syncCompanionQueue: () => Promise<void>;
} {
  const [mobilePitch, setMobilePitch] = useState<MobilePitchData | null>(null);
  const [hasMobileClient, setHasMobileClient] = useState(false);
  const [isRemoteControlEnabled, setIsRemoteControlEnabled] = useState(true);
  const [companionProfiles, setCompanionProfiles] = useState<CompanionProfile[]>([]);
  const [companionQueue, setCompanionQueue] = useState<CompanionQueueItem[]>([]);
  const importProfileFromMobile = useGameStore((state) => state.importProfileFromMobile);

  // Poll for mobile pitch data
  useEffect(() => {
    if (!song) return;

    const pollMobilePitch = async () => {
      try {
        const response = await fetch('/api/mobile?action=getpitch');
        const data = await response.json();
        if (data.success && data.pitch) {
          setMobilePitch(data.pitch.data);
          setHasMobileClient(true);
        }
      } catch {
        // Ignore polling errors
      }
    };

    const pollInterval = setInterval(pollMobilePitch, 50);

    return () => clearInterval(pollInterval);
  }, [song]);

  // Send game state to mobile clients
  const sendGameState = useCallback(async () => {
    if (!song) return;

    try {
      await fetch('/api/mobile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'gamestate',
          payload: {
            currentSong: { id: song.id, title: song.title, artist: song.artist },
            isPlaying,
            currentTime,
            gameMode: gameMode || 'standard',
          },
        }),
      });
    } catch {
      // Ignore sync errors
    }
  }, [song, isPlaying, currentTime, gameMode]);

  // Update game state for mobile clients
  useEffect(() => {
    sendGameState();
  }, [sendGameState]);

  // Send ad state to mobile clients
  const sendAdState = useCallback(async (isAdPlaying: boolean) => {
    try {
      await fetch('/api/mobile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'setAdPlaying',
          payload: { isAdPlaying },
        }),
      });
    } catch {
      // Ignore errors
    }
  }, []);

  // Fetch companion profiles from server
  const fetchCompanionProfiles = useCallback(async () => {
    try {
      const response = await fetch('/api/mobile?action=getprofiles');
      const data = await response.json();
      if (data.success && data.profiles) {
        setCompanionProfiles(data.profiles);
      }
    } catch {
      // Ignore errors
    }
  }, []);

  // Sync companion profiles to main app's character list
  const syncCompanionProfiles = useCallback(async () => {
    await fetchCompanionProfiles();
    
    // Import each profile to the main app's store
    companionProfiles.forEach((profile) => {
      importProfileFromMobile(profile);
    });
  }, [fetchCompanionProfiles, companionProfiles, importProfileFromMobile]);

  // Periodically fetch companion profiles (every 10 seconds)
  useEffect(() => {
    const syncInterval = setInterval(fetchCompanionProfiles, 10000);
    fetchCompanionProfiles(); // Initial fetch
    
    return () => clearInterval(syncInterval);
  }, [fetchCompanionProfiles]);

  // Auto-sync profiles when they change
  useEffect(() => {
    if (companionProfiles.length > 0) {
      companionProfiles.forEach((profile) => {
        importProfileFromMobile(profile);
      });
    }
  }, [companionProfiles, importProfileFromMobile]);

  // Fetch companion queue from server
  const fetchCompanionQueue = useCallback(async () => {
    try {
      const response = await fetch('/api/mobile?action=getqueue');
      const data = await response.json();
      if (data.success && data.queue) {
        setCompanionQueue(data.queue);
      }
    } catch {
      // Ignore errors
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
    mobilePitch,
    hasMobileClient,
    isRemoteControlEnabled,
    sendGameState,
    sendAdState,
    companionProfiles,
    syncCompanionProfiles,
    companionQueue,
    syncCompanionQueue,
  };
}
