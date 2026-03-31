'use client';

import { useState, useEffect, useCallback } from 'react';
import { useGameStore } from '@/lib/game/store';
import type { Song } from '@/types/game';

export interface UseMobileClientOptions {
  song: Song | null;
  isPlaying: boolean;
  currentTime: number;
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

export function useMobileClient({
  song,
  isPlaying,
  currentTime,
}: UseMobileClientOptions): {
  mobilePitch: MobilePitchData | null;
  hasMobileClient: boolean;
  isRemoteControlEnabled: boolean;
  sendGameState: () => Promise<void>;
  sendAdState: (isAdPlaying: boolean) => Promise<void>;
  companionProfiles: CompanionProfile[];
  syncCompanionProfiles: () => Promise<void>;
} {
  const [mobilePitch, setMobilePitch] = useState<MobilePitchData | null>(null);
  const [hasMobileClient, setHasMobileClient] = useState(false);
  const [isRemoteControlEnabled, setIsRemoteControlEnabled] = useState(true);
  const [companionProfiles, setCompanionProfiles] = useState<CompanionProfile[]>([]);
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
          },
        }),
      });
    } catch {
      // Ignore sync errors
    }
  }, [song, isPlaying, currentTime]);

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

  return {
    mobilePitch,
    hasMobileClient,
    isRemoteControlEnabled,
    sendGameState,
    sendAdState,
    companionProfiles,
    syncCompanionProfiles,
  };
}
