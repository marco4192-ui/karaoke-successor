'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Song } from '@/types/game';
import { getAllSongsAsync, ensureSongUrls } from '@/lib/game/song-library';
import { RepeatMode } from './jukebox-types';

export function useJukebox() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [playlist, setPlaylist] = useState<Song[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [filterGenre, setFilterGenre] = useState<string>('all');
  const [filterArtist, setFilterArtist] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [shuffle, setShuffle] = useState(true);
  const [repeat, setRepeat] = useState<RepeatMode>('all');
  const [customYoutubeUrl, setCustomYoutubeUrl] = useState('');
  const [customYoutubeId, setCustomYoutubeId] = useState<string | null>(null);
  const [youtubeTime, setYoutubeTime] = useState(0);
  const [isAdPlaying, setIsAdPlaying] = useState(false);
  const [volume, setVolume] = useState(0.7);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hidePlaylist, setHidePlaylist] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);
  const [currentLyricIndex, setCurrentLyricIndex] = useState(0);
  const [songs, setSongs] = useState<Song[]>([]);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Load songs asynchronously
  useEffect(() => {
    const loadSongs = async () => {
      const allSongs = await getAllSongsAsync();
      setSongs(allSongs);
    };
    loadSongs();
  }, []);

  // Unique genres and artists
  const genres = useMemo(() => {
    const genreSet = new Set<string>();
    songs.forEach(s => { if (s.genre) genreSet.add(s.genre); });
    return ['all', ...Array.from(genreSet).sort()];
  }, [songs]);

  const artists = useMemo(() => {
    const artistSet = new Set<string>();
    songs.forEach(s => { if (s.artist) artistSet.add(s.artist); });
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

  // Generate playlist
  const generatePlaylist = useCallback(async () => {
    if (filteredSongs.length === 0) return;
    let newPlaylist = [...filteredSongs];
    if (shuffle) {
      for (let i = newPlaylist.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newPlaylist[i], newPlaylist[j]] = [newPlaylist[j], newPlaylist[i]];
      }
    }
    const firstSong = newPlaylist[0];
    if (firstSong) {
      const preparedSong = await ensureSongUrls(firstSong);
      newPlaylist = [preparedSong, ...newPlaylist.slice(1)];
    }
    setPlaylist(newPlaylist);
    setCurrentIndex(0);
    setCurrentSong(newPlaylist[0] || null);
  }, [filteredSongs, shuffle]);

  // Play next song
  const playNext = useCallback(async () => {
    if (playlist.length === 0) return;
    let nextIndex = currentIndex + 1;
    if (nextIndex >= playlist.length) {
      if (repeat === 'all') {
        nextIndex = 0;
      } else {
        setIsPlaying(false);
        return;
      }
    }
    const nextSong = playlist[nextIndex];
    const preparedSong = await ensureSongUrls(nextSong);
    setCurrentIndex(nextIndex);
    setCurrentSong(preparedSong);
  }, [playlist, currentIndex, repeat]);

  // Play previous song
  const playPrevious = useCallback(async () => {
    if (playlist.length === 0) return;
    let prevIndex = currentIndex - 1;
    if (prevIndex < 0) {
      prevIndex = playlist.length - 1;
    }
    const prevSong = playlist[prevIndex];
    const preparedSong = await ensureSongUrls(prevSong);
    setCurrentIndex(prevIndex);
    setCurrentSong(preparedSong);
  }, [playlist, currentIndex]);

  // Handle media end
  const handleMediaEnd = useCallback(() => {
    if (repeat === 'one' && currentSong) {
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
        videoRef.current.play();
      }
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play();
      }
    } else {
      playNext();
    }
  }, [repeat, currentSong, playNext]);

  // Start / Stop jukebox
  const startJukebox = () => {
    generatePlaylist();
    setIsPlaying(true);
  };

  const stopJukebox = () => {
    setIsPlaying(false);
    if (videoRef.current) videoRef.current.pause();
    if (audioRef.current) audioRef.current.pause();
  };

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Toggle play/pause
  const togglePlayPause = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) videoRef.current.play();
      else videoRef.current.pause();
    }
    if (audioRef.current) {
      if (audioRef.current.paused) audioRef.current.play();
      else audioRef.current.pause();
    }
  };

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      setPlaylist([]);
      setCurrentSong(null);
      setCurrentIndex(0);
      setIsPlaying(false);
    };
  }, []);

  // Update volume
  useEffect(() => {
    if (videoRef.current) videoRef.current.volume = volume;
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume, currentSong]);

  // Auto-play when song changes
  useEffect(() => {
    if (isPlaying && currentSong) {
      const playTimer = setTimeout(() => {
        const videoHasEmbeddedAudio = currentSong.hasEmbeddedAudio || !currentSong.audioUrl;
        if (currentSong.videoBackground && videoRef.current) {
          videoRef.current.currentTime = 0;
          videoRef.current.play().catch(() => {});
        }
        if (currentSong.audioUrl && !videoHasEmbeddedAudio && audioRef.current) {
          audioRef.current.currentTime = 0;
          audioRef.current.play().catch(() => {});
        }
      }, 100);
      return () => clearTimeout(playTimer);
    }
  }, [isPlaying, currentSong]);

  // Track current lyric line based on time
  useEffect(() => {
    if (!showLyrics || !currentSong || !currentSong.lyrics?.length) return;
    const updateCurrentLyric = () => {
      const currentTime = (audioRef.current?.currentTime || videoRef.current?.currentTime || 0) * 1000;
      for (let i = currentSong.lyrics.length - 1; i >= 0; i--) {
        if (currentTime >= currentSong.lyrics[i].startTime) {
          setCurrentLyricIndex(i);
          break;
        }
      }
    };
    const interval = setInterval(updateCurrentLyric, 100);
    return () => clearInterval(interval);
  }, [showLyrics, currentSong]);

  // Up next songs
  const upNext = useMemo(() => {
    return playlist.slice(currentIndex + 1, currentIndex + 6);
  }, [playlist, currentIndex]);

  return {
    isPlaying, currentSong, playlist, currentIndex, songs,
    filterGenre, filterArtist, searchQuery, shuffle, repeat,
    customYoutubeUrl, customYoutubeId, youtubeTime, isAdPlaying,
    volume, isFullscreen, hidePlaylist, showLyrics, currentLyricIndex,
    genres, artists, filteredSongs, upNext,
    videoRef, audioRef, containerRef,
    setFilterGenre, setFilterArtist, setSearchQuery, setShuffle, setRepeat,
    setCustomYoutubeUrl, setVolume, setHidePlaylist, setShowLyrics,
    setCurrentLyricIndex, setCurrentSong, setCurrentIndex,
    setIsAdPlaying, setYoutubeTime,
    startJukebox, stopJukebox, playNext, playPrevious,
    handleMediaEnd, toggleFullscreen, togglePlayPause,
  };
}
