'use client';

import { useEffect } from 'react';
import type { RepeatMode } from '../jukebox-types';
import type { JukeboxCoreState } from './jukebox-hook-types';

// ===================== PARAMS =====================

export interface UseJukeboxSyncParams {
  core: JukeboxCoreState;
  stopJukebox: () => void;
  togglePlayPause: () => void;
  playNext: () => Promise<void>;
  playPrevious: () => Promise<void>;
  /** #17: Public setShuffle (live reshuffle). */
  handleSetShuffle: (_newShuffle: boolean) => void;
  setRepeat: (_r: RepeatMode) => void;
  setVolume: React.Dispatch<React.SetStateAction<number>>;
  setShowLyrics: React.Dispatch<React.SetStateAction<boolean>>;
  shuffleRef: React.MutableRefObject<boolean>;
  repeatRef: React.MutableRefObject<RepeatMode>;
}

// ===================== HOOK =====================

/**
 * External input synchronization for the jukebox (R10 extraction): the
 * companion remote-control window events (stop/toggle/next/prev/shuffle/
 * repeat/volume/lyrics/playlist) and the streaming-platform player time →
 * state time mapping (youtubeTime).
 */
export function useJukeboxSync({
  core,
  stopJukebox,
  togglePlayPause,
  playNext,
  playPrevious,
  handleSetShuffle,
  setRepeat,
  setVolume,
  setShowLyrics,
  shuffleRef,
  repeatRef,
}: UseJukeboxSyncParams): void {
  const {
    youtubeTime, currentSong,
    setCurrentTime, setDuration, setHidePlaylist,
  } = core;

  // ==================== COMPANION REMOTE CONTROL EVENTS ====================

  useEffect(() => {
    const handlers: Array<[string, EventListener]> = [
      ['jukebox:stop', () => { stopJukebox(); }],
      ['jukebox:toggle_play', () => { togglePlayPause(); }],
      ['jukebox:next', () => { playNext(); }],
      ['jukebox:prev', () => { playPrevious(); }],
      ['jukebox:shuffle', () => { handleSetShuffle(!shuffleRef.current); }],
      ['jukebox:repeat', () => {
        const modes: RepeatMode[] = ['all', 'none', 'one'];
        const curIdx = modes.indexOf(repeatRef.current);
        setRepeat(modes[(curIdx + 1) % modes.length]);
      }],
      ['jukebox:volume_up', () => { setVolume(v => Math.min(1, v + 0.1)); }],
      ['jukebox:volume_down', () => { setVolume(v => Math.max(0, v - 0.1)); }],
      ['jukebox:lyrics_toggle', () => { setShowLyrics(s => !s); }],
      ['jukebox:playlist_toggle', () => { setHidePlaylist(h => !h); }],
    ];
    handlers.forEach(([evt, fn]) => window.addEventListener(evt, fn));
    return () => { handlers.forEach(([evt, fn]) => window.removeEventListener(evt, fn)); };
  }, [stopJukebox, togglePlayPause, playNext, playPrevious, handleSetShuffle, setRepeat, setVolume, setShowLyrics, setHidePlaylist]);

  // ==================== YOUTUBE TIME → STATE TIME ====================

  useEffect(() => {
    if (youtubeTime > 0 && currentSong) {
      setCurrentTime(youtubeTime / 1000);
      // Video breaks have duration 0 until the player reports it — never
      // stomp a player-reported duration back to the (unknown) song duration.
      if (currentSong.duration > 0) {
        setDuration(currentSong.duration / 1000);
      }
    }
  }, [youtubeTime, currentSong]);
}
