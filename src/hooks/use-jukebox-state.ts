'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { getAllSongsAsync } from '@/lib/game/song-library';
import { Song } from '@/types/game';
import { useJukeboxPlaylist } from '@/hooks/use-jukebox-playlist';

export interface JukeboxStateReturn {
  // Playlist management from useJukeboxPlaylist
  playlist: Song[];
  currentIndex: number;
  currentSong: Song | null;
  shuffle: boolean;
  repeat: 'none' | 'all' | 'one';
  upNext: Song[];
  setShuffle: (value: boolean) => void;
  setRepeat: (value: 'none' | 'all' | 'one') => void;
  generatePlaylist: (songs: Song[]) => void;
  playNext: () => void;
  playPrevious: () => void;
  playSongAtIndex: (index: number) => void;
  clearPlaylist: () => void;

  // Filters
  filterGenre: string;
  setFilterGenre: (value: string) => void;
  filterArtist: string;
  setFilterArtist: (value: string) => void;
  searchQuery: string;
  setSearchQuery: (value: string) => void;

  // YouTube custom video
  customYoutubeUrl: string;
  setCustomYoutubeUrl: (value: string) => void;
  customYoutubeId: string | null;
  setCustomYoutubeId: (value: string | null) => void;

  // Media state
  youtubeTime: number;
  setYoutubeTime: (value: number) => void;
  isAdPlaying: boolean;
  setIsAdPlaying: (value: boolean) => void;

  // View state
  isFullscreen: boolean;
  setIsFullscreen: (value: boolean) => void;
  hidePlaylist: boolean;
  setHidePlaylist: (value: boolean) => void;
  showLyrics: boolean;
  setShowLyrics: (value: boolean) => void;
  currentLyricIndex: number;
  setCurrentLyricIndex: (value: number) => void;

  // Container ref
  containerRef: React.RefObject<HTMLDivElement | null>;

  // Songs data
  songs: Song[];
  genres: string[];
  artists: string[];
  filteredSongs: Song[];
}

export function useJukeboxState(): JukeboxStateReturn {
  // Use custom hook for playlist management
  const {
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
    clearPlaylist,
  } = useJukeboxPlaylist({ initialShuffle: true, initialRepeat: 'all' });

  // Filters
  const [filterGenre, setFilterGenre] = useState<string>('all');
  const [filterArtist, setFilterArtist] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Custom YouTube video for Jukebox
  const [customYoutubeUrl, setCustomYoutubeUrl] = useState('');
  const [customYoutubeId, setCustomYoutubeId] = useState<string | null>(null);

  // Media state
  const [youtubeTime, setYoutubeTime] = useState(0);
  const [isAdPlaying, setIsAdPlaying] = useState(false);

  // View state
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hidePlaylist, setHidePlaylist] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);
  const [currentLyricIndex, setCurrentLyricIndex] = useState(0);

  // Container ref
  const containerRef = useRef<HTMLDivElement>(null);

  // Load songs asynchronously
  const [songs, setSongs] = useState<Song[]>([]);

  useEffect(() => {
    const loadSongs = async () => {
      const allSongs = await getAllSongsAsync();
      setSongs(allSongs);
    };
    loadSongs();
  }, []);

  // Get unique genres and artists
  const genres = useMemo(() => {
    const genreSet = new Set<string>();
    songs.forEach(s => {
      if (s.genre) genreSet.add(s.genre);
    });
    return ['all', ...Array.from(genreSet).sort()];
  }, [songs]);

  const artists = useMemo(() => {
    const artistSet = new Set<string>();
    songs.forEach(s => {
      if (s.artist) artistSet.add(s.artist);
    });
    return Array.from(artistSet).sort();
  }, [songs]);

  // Filter songs
  const filteredSongs = useMemo(() => {
    let filtered = songs;
    if (filterGenre !== 'all') {
      filtered = filtered.filter(s => s.genre === filterGenre);
    }
    if (filterArtist) {
      filtered = filtered.filter(s => s.artist === filterArtist);
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(s =>
        s.title.toLowerCase().includes(query) ||
        s.artist.toLowerCase().includes(query) ||
        s.album?.toLowerCase().includes(query)
      );
    }
    return filtered;
  }, [songs, filterGenre, filterArtist, searchQuery]);

  return {
    // Playlist management
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
    clearPlaylist,

    // Filters
    filterGenre,
    setFilterGenre,
    filterArtist,
    setFilterArtist,
    searchQuery,
    setSearchQuery,

    // YouTube custom video
    customYoutubeUrl,
    setCustomYoutubeUrl,
    customYoutubeId,
    setCustomYoutubeId,

    // Media state
    youtubeTime,
    setYoutubeTime,
    isAdPlaying,
    setIsAdPlaying,

    // View state
    isFullscreen,
    setIsFullscreen,
    hidePlaylist,
    setHidePlaylist,
    showLyrics,
    setShowLyrics,
    currentLyricIndex,
    setCurrentLyricIndex,

    // Container ref
    containerRef,

    // Songs data
    songs,
    genres,
    artists,
    filteredSongs,
  };
}
