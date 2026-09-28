'use client';

import { useMemo } from 'react';
import type { UseJukeboxReturn } from './jukebox-types';

// ── Sub-hook imports ──
import { useJukeboxState } from './hooks/use-jukebox-state';
import { useJukeboxLibrary } from './hooks/use-jukebox-library';
import { useJukeboxFilters } from './hooks/use-jukebox-filters';
import { useJukeboxQueue } from './hooks/use-jukebox-queue';
import { useJukeboxPlayback } from './hooks/use-jukebox-playback';
import { useJukeboxFullscreen } from './hooks/use-jukebox-fullscreen';
import { useJukeboxMedia } from './hooks/use-jukebox-media';
import { useJukeboxLyrics } from './hooks/use-jukebox-lyrics';
import { useJukeboxCleanup } from './hooks/use-jukebox-cleanup';
import { useJukeboxSync } from './hooks/use-jukebox-sync';

/**
 * Jukebox — Core Hook (Orchestrator)
 *
 * Composes the focused sub-hooks under ./hooks/ into the public
 * useJukebox() API (return shape: UseJukeboxReturn from jukebox-types).
 * The sub-hooks are called in an order that keeps the effect execution
 * order IDENTICAL to the former monolith:
 *
 *   useJukeboxState      (no effects — shared state/refs container)
 *   useJukeboxLibrary    (effect: load songs)
 *   useJukeboxFilters    (no effects — filter/config state + filtered pool)
 *   useJukeboxQueue      (effects: video-add bridge, wishlist polling)
 *   useJukeboxPlayback   (effects: N4 timer, jukebox:start, pool-changed)
 *   useJukeboxFullscreen (effects: fullscreenchange, jukebox:fullscreen)
 *   useJukeboxMedia      (effects: platform reset, loudness, volume write,
 *                         robust auto-play, time tracking)
 *   useJukeboxLyrics     (effects: visibility, lyrics tracking)
 *   useJukeboxCleanup    (effect: unmount teardown)
 *   useJukeboxSync       (effects: companion remote events, YT time → state)
 *
 * R10: the monolithic hook was split into these modules; this file remains
 * the public orchestrator and its export surface is unchanged.
 */
export function useJukebox(refs?: {
  containerRef?: React.RefObject<HTMLDivElement | null>;
  videoRef?: React.RefObject<HTMLVideoElement | null>;
  audioRef?: React.RefObject<HTMLAudioElement | null>;
}): UseJukeboxReturn {
  // ── Core state & refs (former STATE/REFS blocks) ──
  const core = useJukeboxState(refs);
  const {
    isPlaying, currentSong, playlist, currentIndex,
    youtubeTime, currentTime, duration, isAdPlaying,
    hidePlaylist, isLoading, currentSongRequestedBy,
    platformPaused, platformRestartKey,
    timerRemaining, songsPlayed,
    genreCountRef, requesterCountRef,
    setCurrentSong, setCurrentIndex, setHidePlaylist,
    setIsAdPlaying, setYoutubeTime, setCurrentTime, setDuration,
  } = core;

  // ── Song library + genre/artist/era/year options ──
  const { songs, songsRef, genres, artists, eras, years } = useJukeboxLibrary();

  // ── Filter/config state + fuzzy search + filtered pool ──
  const {
    filterGenre, filterArtist, filterEra, filterYear, searchQuery,
    shuffle, repeat, minDuration, maxDuration, maxSongs, timerMinutes, recentlyPlayedMinutes,
    setFilterGenre, setFilterArtist, setFilterEra, setFilterYear, setSearchQuery,
    setShuffle, setRepeat,
    setMinDuration, setMaxDuration, setMaxSongs, setTimerMinutes, setRecentlyPlayedMinutes,
    shuffleRef, repeatRef, setPoolChangeCounter,
    filteredSongs, searchSuggestions,
  } = useJukeboxFilters({ songs, recentlyPlayedRef: core.recentlyPlayedRef });

  // ── Queue management (prepare/generate/insert/remove/enqueue + wishlist) ──
  const {
    prepareSong, generatePlaylist,
    addVideoToQueue, addVideoListToQueue,
    addSongToQueue, addSongsToQueue,
    removeQueueVideo, enqueueLibraryPlaylist,
    handleSetShuffle, exportPlaylist,
  } = useJukeboxQueue({
    core,
    filteredSongs,
    shuffle,
    setShuffle,
    maxSongs,
    timerMinutes,
    songsRef,
  });

  // ── Playback transport & run lifecycle (next/prev/media end/start/stop) ──
  const { startJukebox, stopJukebox, playNext, playPrevious, handleMediaEnd } = useJukeboxPlayback({
    core,
    generatePlaylist,
    prepareSong,
    repeat,
    timerMinutes,
    setPoolChangeCounter,
  });

  // ── Fullscreen ──
  const { isFullscreen, toggleFullscreen } = useJukeboxFullscreen({ core });

  // ── Media interaction (play/pause, mute, seek, volume/loudness, autoplay) ──
  const { volume, setVolume, isMuted, previousVolume, togglePlayPause, toggleMute, seekTo } = useJukeboxMedia({ core });

  // ── Lyrics (sing-along toggle + line tracking) ──
  const { showLyrics, setShowLyrics, currentLyricIndex, setCurrentLyricIndex } = useJukeboxLyrics({ core });

  // ── Unmount teardown ──
  useJukeboxCleanup({ core });

  // ── Companion remote control + platform time sync ──
  useJukeboxSync({
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
  });

  // ==================== DERIVED STATE ====================

  /** Effective playback state: platform videos pause via platformPaused,
   *  HTML5 media via the media elements themselves (isPlaying stays true). */
  const isMediaPlaying = isPlaying && !platformPaused;

  const upNext = useMemo(() => {
    return playlist.slice(currentIndex + 1, currentIndex + 6);
  }, [playlist, currentIndex]);

  // N9: Top genres
  const topGenres = useMemo(() => {
    return Array.from(genreCountRef.current.entries())
      .map(([genre, count]) => ({ genre, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- ref-based, update triggered by songsPlayed
  }, [songsPlayed]);

  // N9: Top requesters
  const topRequesters = useMemo(() => {
    return Array.from(requesterCountRef.current.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- ref-based
  }, [songsPlayed]);

  // ==================== RETURN ====================

  return {
    // Filters
    filterGenre, filterArtist, filterEra, filterYear, searchQuery, shuffle, repeat,
    minDuration, maxDuration, maxSongs, timerMinutes, recentlyPlayedMinutes,
    setFilterGenre, setFilterArtist, setFilterEra, setFilterYear, setSearchQuery,
    setShuffle: handleSetShuffle, setRepeat,
    setMinDuration, setMaxDuration, setMaxSongs, setTimerMinutes, setRecentlyPlayedMinutes,
    // Playback
    isPlaying, isMediaPlaying, currentSong, playlist, currentIndex, platformPaused, platformRestartKey,
    youtubeTime, currentTime, duration, isAdPlaying,
    volume, isFullscreen, isMuted, previousVolume,
    hidePlaylist, showLyrics, currentLyricIndex, isLoading,
    currentSongRequestedBy,
    setVolume, setHidePlaylist, setShowLyrics,
    setCurrentLyricIndex, setCurrentSong, setCurrentIndex,
    setIsAdPlaying, setYoutubeTime, setCurrentTime, setDuration,
    // Derived
    genres, artists, eras, years, filteredSongs, upNext, searchSuggestions,
    songsPlayed, topGenres, topRequesters, timerRemaining,
    // Video queue (video breaks) + library playlists
    addVideoToQueue, addVideoListToQueue, removeQueueVideo, enqueueLibraryPlaylist,
    // Song queue (search suggestions)
    addSongToQueue, addSongsToQueue,
    // Actions
    startJukebox, stopJukebox, playNext, playPrevious,
    handleMediaEnd, toggleFullscreen, togglePlayPause,
    toggleMute, seekTo,
    exportPlaylist,
    // Library
    songs,
  };
}
