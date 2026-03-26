'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Song } from '@/types/game';
import { apiClient } from '@/lib/api-client';

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
} {
  const [mobilePitch, setMobilePitch] = useState<MobilePitchData | null>(null);
  const [hasMobileClient, setHasMobileClient] = useState(false);
  const [isRemoteControlEnabled, setIsRemoteControlEnabled] = useState(true);

  // Poll for mobile pitch data
  useEffect(() => {
    if (!song) return;

    const pollMobilePitch = async () => {
      try {
        const data = await apiClient.mobileGetPitch();
        if (data.success && data.pitch) {
          setMobilePitch((data.pitch as { data: MobilePitchData }).data);
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
      await apiClient.mobileGameState({
        currentSong: { id: song.id, title: song.title, artist: song.artist },
        isPlaying,
        currentTime,
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
      await apiClient.mobileSetAdPlaying(isAdPlaying);
    } catch {
      // Ignore errors
    }
  }, []);

  return {
    mobilePitch,
    hasMobileClient,
    isRemoteControlEnabled,
    sendGameState,
    sendAdState,
  };
}
