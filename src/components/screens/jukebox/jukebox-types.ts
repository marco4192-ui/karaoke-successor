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
  // Setters
  setFilterGenre: (_g: string) => void;
  setFilterArtist: (_a: string) => void;
  setSearchQuery: (_q: string) => void;
  setShuffle: (_s: boolean) => void;
  setRepeat: (_r: RepeatMode) => void;
  setVolume: (_v: number) => void;
  setHidePlaylist: (_h: boolean) => void;
  setShowLyrics: (_s: boolean) => void;
  setCurrentLyricIndex: (_i: number) => void;
  setCurrentSong: (_s: Song | null) => void;
  setCurrentIndex: (_i: number) => void;
  setIsAdPlaying: (_a: boolean) => void;
  setYoutubeTime: (_t: number) => void;
  // Actions
  startJukebox: () => void;
  stopJukebox: () => void;
  playNext: () => void;
  playPrevious: () => void;
  handleMediaEnd: () => void;
  toggleFullscreen: () => void;
  togglePlayPause: () => void;
}
