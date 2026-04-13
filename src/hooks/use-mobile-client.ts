'use client';

import { useState, useEffect, useCallback } from 'react';
import { useGameStore } from '@/lib/game/store';
import { getAllSongs } from '@/lib/game/song-library';
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
  syncSongLibrary: () => Promise<void>;
} {
  const [mobilePitch, setMobilePitch] = useState<MobilePitchData | null>(null);
  const [hasMobileClient, setHasMobileClient] = useState(false);
  const [isRemoteControlEnabled, setIsRemoteControlEnabled] = useState(true);
  const [companionProfiles, setCompanionProfiles] = useState<CompanionProfile[]>([]);
  const [companionQueue, setCompanionQueue] = useState<CompanionQueueItem[]>([]);
  const importProfileFromMobile = useGameStore((state) => state.importProfileFromMobile);
  const profiles = useGameStore((state) => state.profiles);

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
        console.log('[MobileClient] Fetched', data.profiles.length, 'companion profiles');
        setCompanionProfiles(data.profiles);
      }
    } catch (error) {
      console.error('[MobileClient] Error fetching profiles:', error);
    }
  }, []);

  // Sync companion profiles to main app's character list
  const syncCompanionProfiles = useCallback(async () => {
    const response = await fetch('/api/mobile?action=getprofiles');
    const data = await response.json();
    if (data.success && data.profiles) {
      // Import each profile directly from the response
      data.profiles.forEach((profile: CompanionProfile) => {
        console.log('[MobileClient] Importing profile:', profile.name);
        importProfileFromMobile(profile);
      });
    }
  }, [importProfileFromMobile]);

  // Periodically fetch companion profiles (every 10 seconds)
  useEffect(() => {
    const syncInterval = setInterval(fetchCompanionProfiles, 10000);
    fetchCompanionProfiles(); // Initial fetch
    
    return () => clearInterval(syncInterval);
  }, [fetchCompanionProfiles]);

  // Auto-sync profiles when they change
  useEffect(() => {
    if (companionProfiles.length > 0) {
      console.log('[MobileClient] Auto-importing', companionProfiles.length, 'profiles');
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

  // Sync song library to server for companion clients
  const syncSongLibrary = useCallback(async () => {
    try {
      const allSongs = getAllSongs();
      const simplifiedSongs = allSongs.map(song => ({
        id: song.id,
        title: song.title,
        artist: song.artist,
        duration: song.duration,
        genre: song.genre,
        language: song.language,
        coverImage: song.coverImage,
      }));
      
      await fetch('/api/mobile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'setsongs',
          payload: simplifiedSongs,
        }),
      });
      
      console.log('[MobileClient] Synced', simplifiedSongs.length, 'songs to server');
    } catch (error) {
      console.error('[MobileClient] Error syncing songs:', error);
    }
  }, []);

  // Sync songs on mount and when songs change
  useEffect(() => {
    syncSongLibrary();
    
    // Also sync periodically (every 30 seconds)
    const syncInterval = setInterval(syncSongLibrary, 30000);
    return () => clearInterval(syncInterval);
  }, [syncSongLibrary]);

  // Publish host profiles to localStorage for companion app to fetch via API
  useEffect(() => {
    if (profiles.length > 0) {
      const hostProfiles = profiles.map(p => ({
        id: p.id,
        name: p.name,
        avatar: p.avatar,
        color: p.color,
        createdAt: p.createdAt,
      }));
      try {
        localStorage.setItem('karaoke-host-profiles', JSON.stringify(hostProfiles));
      } catch { /* ignore */ }
    }
  }, [profiles]);

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
    syncSongLibrary,
  };
}
