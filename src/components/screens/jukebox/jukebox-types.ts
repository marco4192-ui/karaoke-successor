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
  setFilterGenre: (_gg: string) => void;
  setFilterArtist: (_aa: string) => void;
  setSearchQuery: (_qq: string) => void;
  setShuffle: (s: boolean) => void;
  setRepeat: (_rr: RepeatMode) => void;
  setVolume: (_vv: number) => void;
  setHidePlaylist: (_hh: boolean) => void;
  setShowLyrics: (s: boolean) => void;
  setCurrentLyricIndex: (_ii: number) => void;
  setCurrentSong: (s: Song | null) => void;
  setCurrentIndex: (i: number) => void;
  setIsAdPlaying: (a: boolean) => void;
  setYoutubeTime: (_tt: number) => void;
  // Actions
  startJukebox: () => void;
  stopJukebox: () => void;
  playNext: () => void;
  playPrevious: () => void;
  handleMediaEnd: () => void;
  toggleFullscreen: () => void;
  togglePlayPause: () => void;
}
