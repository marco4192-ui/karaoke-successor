'use client';

import { useCallback, useRef, useEffect } from 'react';
import { useGameStore } from '@/lib/game/store';
import type { Song, GameMode } from '@/types/game';

// Re-export types for backward compatibility
export type { MobilePitchData } from '@/hooks/use-mobile-pitch-polling';
export type { CompanionProfile, CompanionQueueItem } from '@/hooks/use-companion-sync';

import { useMobilePitchPolling } from '@/hooks/use-mobile-pitch-polling';
import { useCompanionSync } from '@/hooks/use-companion-sync';
import { useSongLibrarySync } from '@/hooks/use-song-library-sync';

export interface UseMobileClientOptions {
  song: Song | null;
  isPlaying: boolean;
  currentTime: number;
  gameMode?: GameMode;
}

/**
 * Main mobile client hook — facade that composes focused sub-hooks.
 *
 * Refactored from a monolithic 340-line hook (Q9) into:
 * - useMobilePitchPolling — pitch data polling (deduped, was copy-pasted here)
 * - useCompanionSync — companion profiles & queue management
 * - useSongLibrarySync — song library & host profile sync
 *
 * Game state sending and ad state are kept inline because they're small
 * and tightly coupled to the hook's caller-provided props.
 */
export function useMobileClient({
  song,
  isPlaying,
  currentTime,
  gameMode,
}: UseMobileClientOptions): {
  mobilePitch: import('@/hooks/use-mobile-pitch-polling').MobilePitchData | null;
  hasMobileClient: boolean;
  sendGameState: () => Promise<void>;
  sendAdState: (isAdPlaying: boolean) => Promise<void>;
  companionProfiles: import('@/hooks/use-companion-sync').CompanionProfile[];
  syncCompanionProfiles: () => Promise<void>;
  companionQueue: import('@/hooks/use-companion-sync').CompanionQueueItem[];
  syncCompanionQueue: () => Promise<void>;
  syncSongLibrary: () => Promise<void>;
} {
  // ── Sub-hooks ──
  const { mobilePitch, hasMobileClient } = useMobilePitchPolling(song);
  const {
    companionProfiles,
    syncCompanionProfiles,
    companionQueue,
    syncCompanionQueue,
  } = useCompanionSync();
  const profiles = useGameStore((state) => state.profiles);
  const { syncSongLibrary } = useSongLibrarySync(profiles);

  // ── Game state sending (throttled to max 2 Hz) ──
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

  // Poll game state at throttle rate
  useEffect(() => {
    if (!song) return;
    sendGameState(); // immediate first send
    const interval = setInterval(sendGameState, 500); // poll at max 2 Hz
    return () => clearInterval(interval);
  }, [sendGameState]);

  // ── Ad state sending ──
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

  return {
    mobilePitch,
    hasMobileClient,
    sendGameState,
    sendAdState,
    companionProfiles,
    syncCompanionProfiles,
    companionQueue,
    syncCompanionQueue,
    syncSongLibrary,
  };
}
