'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
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

  // Fix (Code Review #5): Throttled to max 2 Hz to avoid 60 HTTP requests/sec
  // when currentTime updates at animation frame rate.
  // Uses refs for currentTime/isPlaying/gameMode so the callback identity
  // is stable — the throttle handles actual rate limiting.
  const currentTimeRef = useRef(currentTime);
  currentTimeRef.current = currentTime;
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;
  const gameModeRef = useRef(gameMode);
  gameModeRef.current = gameMode;
  const lastSentRef = useRef(0);
  const sendGameState = useCallback(async () => {
    if (!song) return;

    const now = Date.now();
    if (now - lastSentRef.current < 500) return; // Max 2 Hz
    lastSentRef.current = now;

    try {
      await fetch('/api/mobile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'gamestate',
          payload: {
            currentSong: { id: song.id, title: song.title, artist: song.artist },
            isPlaying: isPlayingRef.current,
            currentTime: currentTimeRef.current,
            gameMode: gameModeRef.current || 'standard',
          },
        }),
      });
    } catch {
      // Ignore sync errors
    }
  }, [song]);

  // Update game state for mobile clients — poll at throttle rate.
  // sendGameState is now stable (only depends on song), so this effect
  // runs once per song and then polls via interval at the throttled rate.
  useEffect(() => {
    if (!song) return;
    sendGameState(); // immediate first send
    const interval = setInterval(sendGameState, 500); // poll at max 2 Hz
    return () => clearInterval(interval);
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
      const simplifiedSongs = allSongs
        .filter(song => song.id && song.title) // Skip songs without id or title
        .map(song => ({
          id: song.id,
          title: song.title,
          artist: song.artist || 'Unknown',
          duration: song.duration || 0,
          genre: song.genre,
          language: song.language,
          // Don't send coverImage if it's a blob: URL — companions can't access main app blobs
          coverImage: song.coverImage && !song.coverImage.startsWith('blob:')
            ? song.coverImage
            : undefined,
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

  // Publish host profiles to server memory for companion app to fetch via API
  // (localStorage is NOT available in API routes, so we POST to server)
  // Also re-sync periodically (every 60s) to survive server restarts
  useEffect(() => {
    if (profiles.length === 0) return;

    const hostProfiles = profiles.map(p => ({
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      color: p.color,
      createdAt: p.createdAt,
    }));
    // Also keep localStorage for any legacy use
    try {
      localStorage.setItem('karaoke-host-profiles', JSON.stringify(hostProfiles));
    } catch { /* ignore */ }

    const pushProfiles = () => {
      fetch('/api/mobile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'sethostprofiles',
          payload: hostProfiles,
        }),
      }).catch(() => { /* ignore */ });
    };

    // Push immediately when profiles change
    pushProfiles();

    // Re-push every 60s to survive server restarts (in-memory state is lost)
    const interval = setInterval(pushProfiles, 60000);
    return () => clearInterval(interval);
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
