'use client';

import { useEffect, useRef, useState } from 'react';
import type { Song } from '@/types/game';

/**
 * Hook for syncing game state to mobile companion clients.
 * Sends periodic updates with current song info, playback state, and time.
 */
export function useMobileGameSync(
  song: Song | null,
  isPlaying: boolean,
  gameMode: string,
  songEnded: boolean = false,
  tournamentMatchId?: string | null,
  currentScreen?: string,
) {
  const isPlayingRef = useRef(isPlaying);
  const gameModeRef = useRef(gameMode);
  const songEndedRef = useRef(songEnded);
  const tournamentMatchIdRef = useRef(tournamentMatchId);
  // Tracks the RAW param (undefined when the caller doesn't pass one) —
  // see the payload build below for why this must not default to null.
  const currentScreenRef = useRef<string | undefined>(currentScreen);
  const [lastSyncError, setLastSyncError] = useState<string | null>(null);
  const syncErrorTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const clearSyncError = (err: string) => {
    setLastSyncError(err);
    if (syncErrorTimerRef.current) clearTimeout(syncErrorTimerRef.current);
    syncErrorTimerRef.current = setTimeout(() => setLastSyncError(null), 5000);
  };

  useEffect(() => {
    return () => {
      if (syncErrorTimerRef.current) clearTimeout(syncErrorTimerRef.current);
    };
  }, []);
  useEffect(() => {
    isPlayingRef.current = isPlaying;
    gameModeRef.current = gameMode;
    songEndedRef.current = songEnded;
    tournamentMatchIdRef.current = tournamentMatchId;
    // Keep the raw value — undefined means "caller has no screen context"
    // and must NOT be sent (see payload build).
    currentScreenRef.current = currentScreen;
  }, [isPlaying, gameMode, songEnded, tournamentMatchId, currentScreen]);

  useEffect(() => {
    if (!song) return;

    const syncGameState = async () => {
      try {
        // NOTE: `currentScreen` is only included when the caller actually
        // provides one. Pushing `null` for callers that don't pass it made
        // this 2s-sync fight use-mobile-screen-sync's authoritative screen
        // push on the server (merge overwrote the real screen with null),
        // which companion mirrors then received as a screen flicker.
        const payload: Record<string, unknown> = {
          currentSong: { id: song.id, title: song.title, artist: song.artist },
          isPlaying: isPlayingRef.current,
          gameMode: gameModeRef.current,
          songEnded: songEndedRef.current,
          // #10 Broadcast tournament match ID for spectator voting
          tournamentMatchId: tournamentMatchIdRef.current || null,
        };
        if (currentScreenRef.current) {
          // Current screen name for remote control UI
          payload.currentScreen = currentScreenRef.current;
        }
        const res = await fetch('/api/mobile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'gamestate', payload }),
        });
        if (!res.ok) {
          clearSyncError(`Game state sync failed (${res.status})`);
          return;
        }
        setLastSyncError(null);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Network error';
        // eslint-disable-next-line no-console
        console.warn('Game state sync failed:', err);
        clearSyncError(`Game state sync failed: ${msg}`);
      }
    };

    // Initial sync
    syncGameState();

    // Sync every 2 seconds while playing
    const syncInterval = setInterval(syncGameState, 2000);

    return () => clearInterval(syncInterval);
  }, [song]);

  return { lastSyncError };
}
