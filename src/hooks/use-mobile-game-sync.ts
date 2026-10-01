'use client';

import { useEffect, useRef, useState } from 'react';
import type { Song } from '@/types/game';
import { isGamestateWriterYielding, postGameState } from '@/lib/desktop-instance';

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
  const currentScreenRef = useRef(currentScreen);
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
    currentScreenRef.current = currentScreen;
  }, [isPlaying, gameMode, songEnded, tournamentMatchId, currentScreen]);

  useEffect(() => {
    if (!song) return;

    const syncGameState = async () => {
      try {
        // R43: unified helper — attaches the instance senderId and yields
        // with exponential backoff when another window owns the writer
        // election (no more 409 console spam every 2 s).
        const res = await postGameState({
          currentSong: { id: song.id, title: song.title, artist: song.artist },
          isPlaying: isPlayingRef.current,
          gameMode: gameModeRef.current,
          songEnded: songEndedRef.current,
          // #10 Broadcast tournament match ID for spectator voting
          tournamentMatchId: tournamentMatchIdRef.current || null,
          // Current screen name for remote control UI
          currentScreen: currentScreenRef.current || null,
        });
        if (res === null || isGamestateWriterYielding()) {
          // Skipped (yielding to the winning window) or network error —
          // not a sync failure worth a red banner.
          return;
        }
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
