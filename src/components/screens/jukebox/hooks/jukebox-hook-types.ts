'use client';

/**
 * Jukebox — hook type definitions (R10 extraction).
 *
 * Shared param/return interfaces for the sub-hooks under ./hooks/ that
 * use-jukebox.ts composes into the public useJukebox() orchestrator.
 * The public return type (UseJukeboxReturn) stays in ../jukebox-types.ts.
 * Type-level only.
 */

import type { Song } from '@/types/game';

/** Track recently played songs for F7 exclusion */
export interface RecentlyPlayedEntry {
  songId: string;
  playedAt: number;
}

/**
 * Core playback/queue state + refs shared by all jukebox sub-hooks.
 * Owned by useJukeboxState (called first by the orchestrator) so the domain
 * hooks (queue, playback, fullscreen, media, lyrics, cleanup, sync) can
 * share setters and render-synced refs without circular wiring — mirroring
 * the former STATE/REFS blocks of the monolithic hook.
 */
export interface JukeboxCoreState {
  // --- Playback State ---
  isPlaying: boolean;
  setIsPlaying: (_v: boolean) => void;
  currentSong: Song | null;
  setCurrentSong: (_s: Song | null) => void;
  playlist: Song[];
  setPlaylist: React.Dispatch<React.SetStateAction<Song[]>>;
  currentIndex: number;
  setCurrentIndex: (_i: number) => void;
  youtubeTime: number;
  setYoutubeTime: (_t: number) => void;
  currentTime: number;
  setCurrentTime: (_t: number) => void;
  duration: number;
  setDuration: (_d: number) => void;
  isAdPlaying: boolean;
  setIsAdPlaying: (_v: boolean) => void;
  hidePlaylist: boolean;
  setHidePlaylist: React.Dispatch<React.SetStateAction<boolean>>;
  // #3: Loading state for song switching
  isLoading: boolean;
  setIsLoading: (_v: boolean) => void;
  // N8: Wishlist song attribution (companion who requested it)
  currentSongRequestedBy: string | null;
  setCurrentSongRequestedBy: (_v: string | null) => void;
  /** Pause flag for streaming-platform videos (driven via isPlaying prop) */
  platformPaused: boolean;
  setPlatformPaused: React.Dispatch<React.SetStateAction<boolean>>;
  /** Repeat-one restart counter for platform videos — bumping the key remounts
   *  the platform player which restarts playback from the beginning. */
  platformRestartKey: number;
  setPlatformRestartKey: React.Dispatch<React.SetStateAction<number>>;

  // --- N4: Timer ---
  timerRemaining: number | null;
  setTimerRemaining: React.Dispatch<React.SetStateAction<number | null>>;

  // --- N9: Statistics ---
  songsPlayed: number;
  setSongsPlayed: React.Dispatch<React.SetStateAction<number>>;

  // --- Refs ---
  // Track manual vs random song IDs
  manualIdsRef: React.MutableRefObject<Set<string>>;
  // Track already-processed wishlist items to avoid duplicates
  processedWishlistRef: React.MutableRefObject<Set<string>>;
  // Map songId → requester name for N8 attribution
  songRequesterRef: React.MutableRefObject<Map<string, string>>;
  // F7: Recently played history
  recentlyPlayedRef: React.MutableRefObject<RecentlyPlayedEntry[]>;
  // N9: Statistics counters
  genreCountRef: React.MutableRefObject<Map<string, number>>;
  requesterCountRef: React.MutableRefObject<Map<string, number>>;
  /** Stable ref to playNext — created here (shared), assigned by
   *  useJukeboxPlayback; the queue inserts use it on their resume path. */
  playNextRef: React.MutableRefObject<() => Promise<void>>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  // Refs for stable access inside callbacks
  playlistRef: React.MutableRefObject<Song[]>;
  currentIndexRef: React.MutableRefObject<number>;
  isPlayingRef: React.MutableRefObject<boolean>;
  currentSongRef: React.MutableRefObject<Song | null>;
}

/** External media element refs accepted by useJukebox (orchestrator passthrough). */
export interface JukeboxExternalRefs {
  containerRef?: React.RefObject<HTMLDivElement | null>;
  videoRef?: React.RefObject<HTMLVideoElement | null>;
  audioRef?: React.RefObject<HTMLAudioElement | null>;
}
