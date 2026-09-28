'use client';

import { useState, useEffect } from 'react';
import type { JukeboxCoreState } from './jukebox-hook-types';

// ===================== PARAMS / RETURN =====================

export interface UseJukeboxLyricsParams {
  core: JukeboxCoreState;
}

export interface UseJukeboxLyricsReturn {
  showLyrics: boolean;
  setShowLyrics: React.Dispatch<React.SetStateAction<boolean>>;
  currentLyricIndex: number;
  setCurrentLyricIndex: (_i: number) => void;
}

// ===================== HOOK =====================

/**
 * Lyrics display state for the jukebox (R10 extraction): the sing-along
 * toggle + current lyric line index, the F5 energy-saving visibility
 * listener and the 100 ms lyric tracking interval.
 */
export function useJukeboxLyrics({ core }: UseJukeboxLyricsParams): UseJukeboxLyricsReturn {
  const { currentSong, youtubeTime, videoRef, audioRef } = core;
  const [showLyrics, setShowLyrics] = useState(false);
  const [currentLyricIndex, setCurrentLyricIndex] = useState(0);

  // ==================== F5: ENERGY SAVING ====================

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Tab is hidden — we don't pause, but reduce processing
        // The lyrics interval will still run but do less work
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // ==================== LYRICS TRACKING ====================

  useEffect(() => {
    // F5: Skip lyrics updates when tab is hidden
    if (document.hidden) return;
    if (!showLyrics || !currentSong || !currentSong.lyrics?.length) return;

    const updateCurrentLyric = () => {
      const currentTimeMs = youtubeTime > 0
        ? youtubeTime
        : (audioRef.current?.currentTime || videoRef.current?.currentTime || 0) * 1000;
      for (let i = currentSong.lyrics.length - 1; i >= 0; i--) {
        if (currentTimeMs >= currentSong.lyrics[i].startTime) {
          setCurrentLyricIndex(i);
          break;
        }
      }
    };
    const interval = setInterval(updateCurrentLyric, 100);
    return () => clearInterval(interval);
  }, [showLyrics, currentSong, youtubeTime, audioRef, videoRef]);

  return {
    showLyrics,
    setShowLyrics,
    currentLyricIndex,
    setCurrentLyricIndex,
  };
}
