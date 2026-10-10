'use client';

import { useEffect } from 'react';
import { setJson } from '@/lib/storage';
import { StorageKeys } from '@/lib/storage';
import type { JukeboxCoreState } from './jukebox-hook-types';

// ===================== PARAMS / RETURN =====================

export interface UseJukeboxCleanupParams {
  core: JukeboxCoreState;
}

// ===================== HOOK =====================

/**
 * Unmount teardown for the jukebox (R10 extraction): pauses the media
 * elements, resets queue/playback state, clears the tracking refs and the
 * saved playlist storage key.  Runs its single effect after all other
 * jukebox effects (identical to the former monolith's cleanup position).
 */
export function useJukeboxCleanup({ core }: UseJukeboxCleanupParams): void {
  const {
    videoRef, audioRef,
    setPlaylist, setCurrentSong, setCurrentIndex, setIsPlaying, setTimerRemaining,
    manualIdsRef, processedWishlistRef, songRequesterRef, recentlyPlayedRef,
    genreCountRef, requesterCountRef,
  } = core;

  // ==================== CLEANUP ON UNMOUNT ====================

  useEffect(() => {
    const audioEl = audioRef.current;
    const videoEl = videoRef.current;
    return () => {
      if (audioEl) audioEl.pause();
      if (videoEl) videoEl.pause();
      setPlaylist([]);
      setCurrentSong(null);
      setCurrentIndex(0);
      setIsPlaying(false);
      setTimerRemaining(null);
      manualIdsRef.current = new Set();
      processedWishlistRef.current = new Set();
      songRequesterRef.current.clear();
      recentlyPlayedRef.current = [];
      genreCountRef.current.clear();
      requesterCountRef.current.clear();
      // Clear saved playlist
      try { setJson(StorageKeys.JUKEBOX_PLAYLIST, []); } catch { /* ignore */ }
    };
  }, [audioRef, videoRef]);
}
