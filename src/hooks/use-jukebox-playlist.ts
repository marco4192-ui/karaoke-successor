/**
 * use-jukebox-playlist.ts
 * 
 * Hook for managing jukebox playlist state and operations
 * Extracted from jukebox-screen.tsx for better maintainability
 */

import { useState, useCallback, useMemo } from 'react';
import { Song } from '@/types/game';

export interface UseJukeboxPlaylistOptions {
  initialShuffle?: boolean;
  initialRepeat?: 'none' | 'one' | 'all';
}

export interface UseJukeboxPlaylistResult {
  playlist: Song[];
  currentIndex: number;
  currentSong: Song | null;
  shuffle: boolean;
  repeat: 'none' | 'one' | 'all';
  upNext: Song[];
  setShuffle: (shuffle: boolean) => void;
  setRepeat: (repeat: 'none' | 'one' | 'all') => void;
  generatePlaylist: (songs: Song[]) => void;
  playNext: () => void;
  playPrevious: () => void;
  playSongAtIndex: (index: number) => void;
  addToPlaylist: (songs: Song[]) => void;
  clearPlaylist: () => void;
}

/**
 * Fisher-Yates shuffle algorithm
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Hook for managing jukebox playlist
 */
export function useJukeboxPlaylist(options: UseJukeboxPlaylistOptions = {}): UseJukeboxPlaylistResult {
  const {
    initialShuffle = true,
    initialRepeat = 'all',
  } = options;

  const [playlist, setPlaylist] = useState<Song[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [shuffle, setShuffle] = useState(initialShuffle);
  const [repeat, setRepeat] = useState<'none' | 'one' | 'all'>(initialRepeat);

  // Current song
  const currentSong = useMemo(() => {
    return playlist[currentIndex] || null;
  }, [playlist, currentIndex]);

  // Up next songs (5 songs after current)
  const upNext = useMemo(() => {
    return playlist.slice(currentIndex + 1, currentIndex + 6);
  }, [playlist, currentIndex]);

  // Generate a new playlist from songs
  const generatePlaylist = useCallback((songs: Song[]) => {
    if (songs.length === 0) return;

    const newPlaylist = shuffle ? shuffleArray(songs) : [...songs];
    setPlaylist(newPlaylist);
    setCurrentIndex(0);
  }, [shuffle]);

  // Play next song
  const playNext = useCallback(() => {
    if (playlist.length === 0) return;

    let nextIndex = currentIndex + 1;

    if (nextIndex >= playlist.length) {
      if (repeat === 'all') {
        nextIndex = 0;
      } else {
        return; // End of playlist
      }
    }

    setCurrentIndex(nextIndex);
  }, [playlist, currentIndex, repeat]);

  // Play previous song
  const playPrevious = useCallback(() => {
    if (playlist.length === 0) return;

    let prevIndex = currentIndex - 1;
    if (prevIndex < 0) {
      prevIndex = playlist.length - 1;
    }

    setCurrentIndex(prevIndex);
  }, [playlist, currentIndex]);

  // Play specific song by index
  const playSongAtIndex = useCallback((index: number) => {
    if (index >= 0 && index < playlist.length) {
      setCurrentIndex(index);
    }
  }, [playlist]);

  // Add songs to playlist
  const addToPlaylist = useCallback((songs: Song[]) => {
    setPlaylist(prev => [...prev, ...songs]);
  }, []);

  // Clear playlist
  const clearPlaylist = useCallback(() => {
    setPlaylist([]);
    setCurrentIndex(0);
  }, []);

  return {
    playlist,
    currentIndex,
    currentSong,
    shuffle,
    repeat,
    upNext,
    setShuffle,
    setRepeat,
    generatePlaylist,
    playNext,
    playPrevious,
    playSongAtIndex,
    addToPlaylist,
    clearPlaylist,
  };
}
