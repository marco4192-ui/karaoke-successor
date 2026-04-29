'use client';

import { useEffect, useRef } from 'react';
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
) {
  const isPlayingRef = useRef(isPlaying);
  const gameModeRef = useRef(gameMode);
  const songEndedRef = useRef(songEnded);
  isPlayingRef.current = isPlaying;
  gameModeRef.current = gameMode;
  songEndedRef.current = songEnded;

  useEffect(() => {
    if (!song) return;

    const syncGameState = async () => {
      try {
        await fetch('/api/mobile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'gamestate',
            payload: {
              currentSong: { id: song.id, title: song.title, artist: song.artist },
              isPlaying: isPlayingRef.current,
              gameMode: gameModeRef.current,
              songEnded: songEndedRef.current,
            },
          }),
        });
      } catch {
        // Ignore sync errors — mobile client will reconnect
      }
    };

    // Initial sync
    syncGameState();

    // Sync every 2 seconds while playing
    const syncInterval = setInterval(syncGameState, 2000);

    return () => clearInterval(syncInterval);
  }, [song]);
}
