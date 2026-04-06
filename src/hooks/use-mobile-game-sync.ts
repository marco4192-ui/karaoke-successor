'use client';

import { useEffect } from 'react';
import type { Song } from '@/types/game';

/**
 * Hook for syncing game state to mobile companion clients.
 * Sends periodic updates with current song info, playback state, and time.
 */
export function useMobileGameSync(
  song: Song | null,
  isPlaying: boolean,
  gameMode: string,
) {
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
              isPlaying: isPlaying,
              // Note: currentTime is NOT included here to avoid stale closures.
              // The sync runs on a 2-second interval — exact time isn't critical.
              gameMode: gameMode,
              songEnded: false,
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
  }, [song, isPlaying, gameMode]);
}
