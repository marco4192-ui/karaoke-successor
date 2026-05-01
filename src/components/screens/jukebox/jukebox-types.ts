'use client';

import { Song } from '@/types/game';

export type RepeatMode = 'none' | 'one' | 'all';

export interface UseJukeboxReturn {
  // State
  isPlaying: boolean;
  currentSong: Song | null;
  customYoutubeId: string | null;
  playlist: Song[];
  currentIndex: number;
  songs: Song[];
  filterGenre: string;
  filterArtist: string;
  searchQuery: string;
  shuffle: boolean;
  repeat: RepeatMode;
  youtubeTime: number;
  isAdPlaying: boolean;
  volume: number;
  isFullscreen: boolean;
  hidePlaylist: boolean;
  showLyrics: boolean;
  currentLyricIndex: number;
  // Derived
  genres: string[];
  artists: string[];
  filteredSongs: Song[];
  upNext: Song[];
  // Refs
  videoRef: React.RefObject<HTMLVideoElement | null>;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  // Setters
  setFilterGenre: (g: string) => void;
  setFilterArtist: (a: string) => void;
  setSearchQuery: (q: string) => void;
  setShuffle: (s: boolean) => void;
  setRepeat: (r: RepeatMode) => void;
  setVolume: (v: number) => void;
  setHidePlaylist: (h: boolean) => void;
  setShowLyrics: (s: boolean) => void;
  setCurrentLyricIndex: (i: number) => void;
  setCurrentSong: (s: Song | null) => void;
  setCurrentIndex: (i: number) => void;
  setIsAdPlaying: (a: boolean) => void;
  setYoutubeTime: (t: number) => void;
  // Actions
  startJukebox: () => void;
  stopJukebox: () => void;
  playNext: () => void;
  playPrevious: () => void;
  handleMediaEnd: () => void;
  toggleFullscreen: () => void;
  togglePlayPause: () => void;
}
