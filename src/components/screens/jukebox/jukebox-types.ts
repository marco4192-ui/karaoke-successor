'use client';

import { Song } from '@/types/game';

export type RepeatMode = 'none' | 'one' | 'all';

// --- Sub-Interfaces for cleaner separation (#27) ---

export interface JukeboxFiltersState {
  filterGenre: string;
  filterArtist: string;
  searchQuery: string;
  shuffle: boolean;
  repeat: RepeatMode;
  // F11: Duration filter bounds (seconds)
  minDuration: number;
  maxDuration: number;
  // F10: Max songs in playlist (0 = unlimited)
  maxSongs: number;
  // N4: Auto-stop timer in minutes (0 = no timer)
  timerMinutes: number;
  // F7: Recently played exclusion in minutes (0 = off)
  recentlyPlayedMinutes: number;
}

export interface JukeboxPlaybackState {
  isPlaying: boolean;
  /** Effective playback state (isPlaying && !platformPaused) — drives the
   *  play/pause button icon and equalizer animations. */
  isMediaPlaying: boolean;
  currentSong: Song | null;
  playlist: Song[];
  currentIndex: number;
  youtubeTime: number;
  currentTime: number;         // #12: tracked playback time (seconds)
  duration: number;            // #12: current song duration (seconds)
  isAdPlaying: boolean;
  volume: number;
  isFullscreen: boolean;
  isMuted: boolean;            // #F3: mute state
  previousVolume: number;      // #F3: volume before mute
  hidePlaylist: boolean;
  showLyrics: boolean;
  currentLyricIndex: number;
  isLoading: boolean;          // #3: loading state for song switching
  // N8: Wishlist song attribution (companion who requested it)
  currentSongRequestedBy: string | null;
  /** Pause flag for streaming-platform videos (YouTube/Rutube/…) — these are
   *  driven via the isPlaying prop, not via HTML5 media elements. */
  platformPaused: boolean;
  /** Repeat-one restart counter for platform videos — bumping it remounts the
   *  player (key) which restarts playback from the beginning. */
  platformRestartKey: number;
}

export interface JukeboxDerivedState {
  genres: string[];
  artists: string[];
  filteredSongs: Song[];
  upNext: Song[];
  // N9: Statistics
  songsPlayed: number;
  topGenres: { genre: string; count: number }[];
  topRequesters: { name: string; count: number }[];
  // N4: Remaining timer time (seconds)
  timerRemaining: number | null;
}

export interface JukeboxFilterSetters {
  setFilterGenre: (_g: string) => void;
  setFilterArtist: (_a: string) => void;
  setSearchQuery: (_q: string) => void;
  setShuffle: (_s: boolean) => void;
  setRepeat: (_r: RepeatMode) => void;
  setMinDuration: (_d: number) => void;
  setMaxDuration: (_d: number) => void;
  setMaxSongs: (_n: number) => void;
  setTimerMinutes: (_m: number) => void;
  setRecentlyPlayedMinutes: (_m: number) => void;
}

export interface JukeboxPlaybackSetters {
  setVolume: (_v: number) => void;
  setHidePlaylist: (_h: boolean) => void;
  setShowLyrics: (_s: boolean) => void;
  setCurrentLyricIndex: (_i: number) => void;
  setCurrentSong: (_s: Song | null) => void;
  setCurrentIndex: (_i: number) => void;
  setIsAdPlaying: (_a: boolean) => void;
  setYoutubeTime: (_t: number) => void;
  setCurrentTime: (_t: number) => void;
  setDuration: (_d: number) => void;
}

export interface JukeboxVideoQueueActions {
  /** Queue a video link (video AND sound) following the jukebox queue rules:
   *  running jukebox → after the last user song; idle jukebox → plays immediately.
   *  Returns false when the URL matches no supported platform. */
  addVideoToQueue: (_url: string, _label?: string, _requester?: string) => boolean;
  /** Queue a parsed list of video links in order (link-list feature).
   *  Returns the number of successfully queued links. */
  addVideoListToQueue: (_links: Array<{ url: string; label?: string }>) => number;
  /** Remove a queued video break that is not currently playing. */
  removeQueueVideo: (_songId: string) => boolean;
  /** Play a library playlist directly in the jukebox (stored order) or — when
   *  the jukebox is already running — enqueue it after the last user song. */
  enqueueLibraryPlaylist: (_playlistId: string) => Promise<boolean>;
}

export interface JukeboxPlayerActions {
  startJukebox: () => void;
  stopJukebox: () => void;
  playNext: () => void;
  playPrevious: () => void;
  handleMediaEnd: () => void;
  toggleFullscreen: () => void;
  togglePlayPause: () => void;
  toggleMute: () => void;          // #F3
  seekTo: (_fraction: number) => void; // #F1: seek bar
  // N10: Export/Import
  exportPlaylist: () => string;
}

export interface UseJukeboxReturn extends
  JukeboxFiltersState,
  JukeboxPlaybackState,
  JukeboxDerivedState,
  JukeboxFilterSetters,
  JukeboxPlaybackSetters,
  JukeboxVideoQueueActions,
  JukeboxPlayerActions {
  /** Full song library (all loaded songs) */
  songs: Song[];
}
