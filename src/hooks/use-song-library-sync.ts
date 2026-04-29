'use client';

import { useEffect, useCallback } from 'react';
import { useGameStore } from '@/lib/game/store';
import { getAllSongs } from '@/lib/game/song-library';
import type { PlayerProfile } from '@/types/game';

/**
 * Syncs song library and host profiles to the mobile companion server.
 *
 * Extracted from use-mobile-client.ts (Q9) to reduce responsibility count.
 * - Syncs song library to server on mount and every 30 seconds
 * - Publishes host profiles to server on change and every 60 seconds
 */
export function useSongLibrarySync(profiles: PlayerProfile[]): {
  syncSongLibrary: () => Promise<void>;
} {
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

    } catch (error) {
      console.error('[SongLibrarySync] Error syncing songs:', error);
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

  return { syncSongLibrary };
}
