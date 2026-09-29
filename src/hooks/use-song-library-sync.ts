'use client';

import { useEffect, useCallback, useRef } from 'react';
import { getAllSongs } from '@/lib/game/song-library';
import type { PlayerProfile, Song } from '@/types/game';
import { StorageKeys, setJson } from '@/lib/storage';
import { getPlaylists } from '@/lib/playlist-manager';
import { isDuetSong } from '@/components/screens/library/utils';

/**
 * Syncs song library, host profiles, playlists and cover thumbnails to the
 * mobile companion server.
 *
 * Extracted from use-mobile-client.ts (Q9) to reduce responsibility count.
 * - Syncs song library to server on mount and every 30 seconds
 * - Publishes host profiles (incl. achievements/XP/stats, R33) on change + 60 s
 * - Syncs playlists (incl. songs for the jukebox playlist browser, R33/P8)
 *   every 30 seconds (for companion playlist picker)
 * - Uploads mini cover thumbnails (96 px JPEG, R33/P13) for the companion
 *   library — generated in small batches, only changed covers are sent
 */

/** Max songs per playlist pushed for the companion playlist browser. */
const PLAYLIST_SONGS_CAP = 50;

/** Downscale a cover image to a small JPEG data-URL for the companion app. */
async function generateCoverThumbnail(src: string, size = 96, quality = 0.6): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      const timeout = setTimeout(() => resolve(null), 4000);
      img.onload = () => {
        clearTimeout(timeout);
        try {
          const canvas = document.createElement('canvas');
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext('2d');
          if (!ctx) return resolve(null);
          ctx.drawImage(img, 0, 0, size, size);
          resolve(canvas.toDataURL('image/jpeg', quality));
        } catch {
          resolve(null);
        }
      };
      img.onerror = () => { clearTimeout(timeout); resolve(null); };
      img.src = src;
    } catch {
      resolve(null);
    }
  });
}

export function useSongLibrarySync(profiles: PlayerProfile[]): {
  syncSongLibrary: () => Promise<void>;
} {
  // Track last synced song count to avoid redundant syncs when library hasn't changed
  const lastSyncedCountRef = useRef(-1);

  // R33/P13: cover thumbnail state — last uploaded data-URL per songId
  const uploadedCoversRef = useRef<Record<string, string>>({});

  // Sync song library to server for companion clients
  const syncSongLibrary = useCallback(async () => {
    try {
      const allSongs = getAllSongs();

      // Skip sync if song count hasn't changed since last sync.
      // Companion clients get the full library on initial connect anyway.
      if (allSongs.length === lastSyncedCountRef.current) {
        return;
      }
      lastSyncedCountRef.current = allSongs.length;

      const simplifiedSongs = allSongs
        .filter(song => song.id && song.title) // Skip songs without id or title
        .map(song => ({
          id: song.id,
          title: song.title,
          artist: song.artist || 'Unknown',
          duration: song.duration || 0,
          genre: song.genre,
          language: song.language,
          // Release year (#YEAR: tag) — used for the era/decade filter
          year: song.year,
          // Don't send coverImage if it's a blob: URL — companions can't access main app blobs
          coverImage: song.coverImage && !song.coverImage.startsWith('blob:')
            ? song.coverImage
            : undefined,
          isDuet: isDuetSong(song),
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
      // eslint-disable-next-line no-console
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

  // ── R33/P13: Mini cover thumbnails for the companion library ──
  // Generate 96 px JPEG thumbnails (canvas) for songs with a usable cover
  // image and upload ONLY the changed ones (hash-compared against the last
  // upload). Small batches (10 per tick) keep the main thread free.
  useEffect(() => {
    let cancelled = false;

    const uploadCovers = async () => {
      try {
        const allSongs = getAllSongs() as Song[];
        const withCovers = allSongs
          .filter(s => s.id && s.coverImage && !s.coverImage.startsWith('blob:'))
          .slice(0, 400);

        const changed: Record<string, string> = {};
        let checked = 0;
        for (const song of withCovers) {
          if (cancelled) return;
          if (checked >= 10) break; // batch cap per tick
          const src = song.coverImage!;
          if (uploadedCoversRef.current[song.id] === src) continue; // unchanged
          checked += 1;
          const thumb = await generateCoverThumbnail(src);
          if (thumb && !cancelled) {
            changed[song.id] = thumb;
            uploadedCoversRef.current[song.id] = src;
          }
        }
        if (Object.keys(changed).length > 0 && !cancelled) {
          await fetch('/api/mobile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'songcovers', payload: { covers: changed } }),
          }).catch(() => { /* ignore */ });
        }
      } catch {
        // Non-critical — covers are a progressive enhancement
      }
    };

    uploadCovers();
    const interval = setInterval(uploadCovers, 15000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  // Publish host profiles to server memory for companion app to fetch via API
  // (localStorage is NOT available in API routes, so we POST to server)
  // Also re-sync periodically (every 60s) to survive server restarts
  useEffect(() => {
    if (profiles.length === 0) return;

    // R33/P9: include achievements/XP/level/stats so the companion
    // Achievements mirror can render the player's own achievement list.
    const hostProfiles = profiles.map(p => ({
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      color: p.color,
      createdAt: p.createdAt,
      isActive: p.isActive ?? true,
      achievements: (p.achievements ?? []).map(a => a.id),
      xp: p.xp ?? 0,
      level: p.level ?? 1,
      songsPlayed: p.songsCompleted ?? 0,
      gamesPlayed: p.gamesPlayed ?? 0,
    }));
    // Also keep localStorage for any legacy use
    try {
      setJson(StorageKeys.HOST_PROFILES, hostProfiles);
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

  // Sync playlists to server every 30 seconds (for companion playlist picker)
  // R33/P8: include each playlist's songs (id/title/artist, capped) so the
  // companion Jukebox "Browse Playlist" dialog can list them.
  useEffect(() => {
    const syncPlaylists = () => {
      try {
        const playlists = getPlaylists();
        // Song lookup map (id → title/artist) — one pass, no per-song scans
        const songMap = new Map<string, { title: string; artist: string }>();
        for (const s of getAllSongs() as Song[]) {
          if (s.id) songMap.set(s.id, { title: s.title, artist: s.artist || '' });
        }
        const simplified = playlists.map((p) => ({
          id: p.id,
          name: p.name,
          isSystem: p.isSystem,
          songCount: p.songIds?.length ?? 0,
          songs: (p.songIds ?? []).slice(0, PLAYLIST_SONGS_CAP).map((songId) => {
            const song = songMap.get(songId);
            return {
              id: songId,
              title: song?.title ?? songId,
              artist: song?.artist ?? '',
            };
          }),
        }));
        fetch('/api/mobile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'setplaylists', payload: simplified }),
        }).catch(() => { /* ignore */ });
      } catch { /* ignore */ }
    };
    syncPlaylists();
    const interval = setInterval(syncPlaylists, 30000);
    return () => clearInterval(interval);
  }, []);

  return { syncSongLibrary };
}
