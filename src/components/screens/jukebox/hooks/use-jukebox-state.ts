'use client';

import { useState, useRef } from 'react';
import type { Song } from '@/types/game';
import type { JukeboxCoreState, JukeboxExternalRefs, RecentlyPlayedEntry } from './jukebox-hook-types';

/**
 * Core state + refs of the jukebox hook (R10 extraction): the former STATE
 * and REFS blocks of the monolithic useJukebox (minus the filter/config
 * state that lives in useJukeboxFilters and the UI-local state owned by the
 * fullscreen/media/lyrics hooks).  Called FIRST by the orchestrator so every
 * domain hook can share the playback setters and the render-synced refs
 * without circular wiring.  Contains no effects — the effect order in the
 * orchestrator therefore stays identical to the monolith.
 */
export function useJukeboxState(refs?: JukeboxExternalRefs): JukeboxCoreState {
  // ==================== STATE ====================

  // --- Playback State ---
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [playlist, setPlaylist] = useState<Song[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [youtubeTime, setYoutubeTime] = useState(0);
  // #12: Tracked playback time & duration (seconds)
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isAdPlaying, setIsAdPlaying] = useState(false);
  const [hidePlaylist, setHidePlaylist] = useState(false);
  // #3: Loading state for song switching
  const [isLoading, setIsLoading] = useState(false);
  // N8: Wishlist song attribution
  const [currentSongRequestedBy, setCurrentSongRequestedBy] = useState<string | null>(null);
  // Pause flag for streaming-platform videos (driven via isPlaying prop)
  const [platformPaused, setPlatformPaused] = useState(false);
  // Repeat-one restart counter for platform videos — bumping the key remounts
  // the platform player which restarts playback from the beginning.
  const [platformRestartKey, setPlatformRestartKey] = useState(0);

  // --- N4: Timer ---
  const [timerRemaining, setTimerRemaining] = useState<number | null>(null);

  // --- N9: Statistics ---
  const [songsPlayed, setSongsPlayed] = useState(0);
  const genreCountRef = useRef<Map<string, number>>(new Map());
  const requesterCountRef = useRef<Map<string, number>>(new Map());

  // ==================== REFS ====================

  // Track manual vs random song IDs
  const manualIdsRef = useRef(new Set<string>());
  // Track already-processed wishlist items to avoid duplicates
  const processedWishlistRef = useRef(new Set<string>());
  // Map songId → requester name for N8 attribution
  const songRequesterRef = useRef<Map<string, string>>(new Map());
  // F7: Recently played history
  const recentlyPlayedRef = useRef<RecentlyPlayedEntry[]>([]);
  // Stable refs for use inside callbacks without re-triggering effects
  const defaultContainerRef = useRef<HTMLDivElement | null>(null);
  const defaultVideoRef = useRef<HTMLVideoElement | null>(null);
  const defaultAudioRef = useRef<HTMLAudioElement | null>(null);
  const containerRef = refs?.containerRef ?? defaultContainerRef;
  const videoRef = refs?.videoRef ?? defaultVideoRef;
  const audioRef = refs?.audioRef ?? defaultAudioRef;
  // Refs for stable access inside callbacks
  const playlistRef = useRef(playlist);
  playlistRef.current = playlist;
  const currentIndexRef = useRef(currentIndex);
  currentIndexRef.current = currentIndex;
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;
  const currentSongRef = useRef(currentSong);
  currentSongRef.current = currentSong;
  // Shared queue↔playback bridge: assigned by useJukeboxPlayback
  const playNextRef = useRef<() => Promise<void>>(() => Promise.resolve());

  return {
    isPlaying, setIsPlaying,
    currentSong, setCurrentSong,
    playlist, setPlaylist,
    currentIndex, setCurrentIndex,
    youtubeTime, setYoutubeTime,
    currentTime, setCurrentTime,
    duration, setDuration,
    isAdPlaying, setIsAdPlaying,
    hidePlaylist, setHidePlaylist,
    isLoading, setIsLoading,
    currentSongRequestedBy, setCurrentSongRequestedBy,
    platformPaused, setPlatformPaused,
    platformRestartKey, setPlatformRestartKey,
    timerRemaining, setTimerRemaining,
    songsPlayed, setSongsPlayed,
    genreCountRef, requesterCountRef,
    manualIdsRef, processedWishlistRef, songRequesterRef, recentlyPlayedRef,
    playNextRef,
    containerRef, videoRef, audioRef,
    playlistRef, currentIndexRef, isPlayingRef, currentSongRef,
  };
}
