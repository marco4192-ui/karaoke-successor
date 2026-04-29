'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Song } from '@/types/game';
import { getAllSongsAsync, ensureSongUrls, getSongByIdWithLyrics } from '@/lib/game/song-library';
import { RepeatMode } from './jukebox-types';

export function useJukebox() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [playlist, setPlaylist] = useState<Song[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  // Track which song IDs were manually added (via companion wishlist) vs random system picks
  const manualIdsRef = useRef(new Set<string>());
  // Track already-processed wishlist items to avoid re-inserting duplicates
  const processedWishlistRef = useRef(new Set<string>());
  const [filterGenre, setFilterGenre] = useState<string>('all');
  const [filterArtist, setFilterArtist] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [shuffle, setShuffle] = useState(true);
  const [repeat, setRepeat] = useState<RepeatMode>('all');
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
      filtered = filtered.filter(s => s.genre?.toLowerCase().includes(filterGenre.toLowerCase()));
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

  // Prepare a song for playback: restore URLs + load lyrics
  const prepareSong = useCallback(async (song: Song): Promise<Song> => {
    // getSongByIdWithLyrics loads lyrics from IndexedDB/filesystem AND restores URLs
    const withLyrics = await getSongByIdWithLyrics(song.id);
    return withLyrics || await ensureSongUrls(song);
  }, []);

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

    // Fetch companion wishlist and insert those songs after the first random
    // song but before the remaining random songs (user wishes before system picks)
    try {
      const res = await fetch('/api/mobile?action=getjukebox');
      const data = await res.json();
      if (data.success && Array.isArray(data.wishlist) && data.wishlist.length > 0) {
        const wishlistSongIds = new Set<string>();
        const wishlistSongs: Song[] = [];
        for (const item of data.wishlist) {
          const key = `${item.songId}-${item.addedBy}`;
          processedWishlistRef.current.add(key);
          if (!wishlistSongIds.has(item.songId)) {
            wishlistSongIds.add(item.songId);
            const fullSong = newPlaylist.find(s => s.id === item.songId);
            if (fullSong) {
              wishlistSongs.push(fullSong);
              manualIdsRef.current.add(fullSong.id);
            }
          }
        }
        if (wishlistSongs.length > 0) {
          // Remove wishlist songs from random pool to avoid duplicates
          const randomPool = newPlaylist.filter(s => !wishlistSongIds.has(s.id));
          // Place one random song first, then all wishlist songs, then remaining random
          const firstRandom = newPlaylist[0] && !wishlistSongIds.has(newPlaylist[0].id)
            ? [newPlaylist[0]]
            : (randomPool.length > 0 ? [randomPool.shift()!] : []);
          newPlaylist = [...firstRandom, ...wishlistSongs, ...randomPool];
        }
      }
    } catch { /* ignore */ }

    const firstSong = newPlaylist[0];
    if (firstSong) {
      const preparedSong = await prepareSong(firstSong);
      newPlaylist = [preparedSong, ...newPlaylist.slice(1)];
    }
    setPlaylist(newPlaylist);
    setCurrentIndex(0);
    setCurrentSong(newPlaylist[0] || null);
  }, [filteredSongs, shuffle, prepareSong]);

  // Insert a manually-added song after the last manual song (or after current) but before the first random song
  const insertManualSong = useCallback((song: Song) => {
    // Don't insert duplicates already in the playlist
    if (playlist.some(s => s.id === song.id)) return;
    setPlaylist(prev => {
      const newPlaylist = [...prev];
      // Find the first 'random' song after currentIndex
      const insertIdx = newPlaylist.findIndex((s, idx) => idx > currentIndex && !manualIdsRef.current.has(s.id));
      if (insertIdx === -1) {
        // All songs after current are manual, or at end of list → append
        newPlaylist.push(song);
      } else {
        newPlaylist.splice(insertIdx, 0, song);
      }
      manualIdsRef.current.add(song.id);
      return newPlaylist;
    });
  }, [playlist, currentIndex]);

  // Poll companion jukebox wishlist and insert new manual songs into the playlist.
  // Runs always (not only when playing) so wishlist items are ready before jukebox starts.
  useEffect(() => {
    if (songs.length === 0) return; // Need songs loaded to resolve wishlist items
    let active = true;
    const pollWishlist = async () => {
      try {
        const res = await fetch('/api/mobile?action=getjukebox');
        const data = await res.json();
        if (!active || !data.success || !Array.isArray(data.wishlist)) return;
        for (const item of data.wishlist) {
          const key = `${item.songId}-${item.addedBy}`;
          if (processedWishlistRef.current.has(key)) continue;
          processedWishlistRef.current.add(key);
          // Resolve wishlist item to full Song object
          const fullSong = songs.find(s => s.id === item.songId);
          if (fullSong) {
            if (playlist.length > 0) {
              // Jukebox already running — insert after last manual song
              insertManualSong(fullSong);
            }
            // If playlist is empty, the songs will be picked up when
            // generatePlaylist creates the playlist (processedWishlistRef
            // prevents duplicates).
          }
        }
      } catch {
        // Ignore polling errors
      }
    };
    pollWishlist();
    const interval = setInterval(pollWishlist, 5000);
    return () => { active = false; clearInterval(interval); };
  }, [songs.length, songs, playlist.length, insertManualSong]);

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
    const preparedSong = await prepareSong(nextSong);
    setCurrentIndex(nextIndex);
    setCurrentSong(preparedSong);
  }, [playlist, currentIndex, repeat, prepareSong]);

  // Play previous song
  const playPrevious = useCallback(async () => {
    if (playlist.length === 0) return;
    let prevIndex = currentIndex - 1;
    if (prevIndex < 0) {
      prevIndex = playlist.length - 1;
    }
    const prevSong = playlist[prevIndex];
    const preparedSong = await prepareSong(prevSong);
    setCurrentIndex(prevIndex);
    setCurrentSong(preparedSong);
  }, [playlist, currentIndex, prepareSong]);

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
  const startJukebox = async () => {
    await generatePlaylist();
    setIsPlaying(true);
  };

  const stopJukebox = () => {
    setIsPlaying(false);
    if (videoRef.current) videoRef.current.pause();
    if (audioRef.current) audioRef.current.pause();
  };

  // Toggle fullscreen — specifically targets the jukebox container, not the entire document.
  // When the app is already in app-level fullscreen (NavBar button), simply exit fullscreen
  // instead of switching to the jukebox's own split layout fullscreen.
  const toggleFullscreen = () => {
    if (document.fullscreenElement === containerRef.current) {
      // We are in jukebox fullscreen → exit
      document.exitFullscreen();
    } else if (document.fullscreenElement) {
      // App-level fullscreen is active (NavBar button) → exit fullscreen entirely.
      // Do NOT switch to jukebox container fullscreen — the main menu fullscreen
      // should only stretch the current view, not trigger jukebox half-fullscreen.
      document.exitFullscreen();
    } else {
      // Not in any fullscreen → enter jukebox fullscreen
      containerRef.current?.requestFullscreen().catch(() => {});
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

  // Fullscreen change listener — only respond when THIS container is the fullscreen element.
  // The app-level NavBar fullscreen (documentElement) must NOT trigger jukebox fullscreen layout.
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === containerRef.current);
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
      manualIdsRef.current = new Set();
      processedWishlistRef.current = new Set();
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
      // Use YouTube time if available, otherwise fall back to audio/video element time
      const currentTimeMs = youtubeTime > 0
        ? youtubeTime
        : (audioRef.current?.currentTime || videoRef.current?.currentTime || 0) * 1000;
      for (let i = currentSong.lyrics.length - 1; i >= 0; i--) {
        if (currentTimeMs >= currentSong.lyrics[i].startTime) {
          setCurrentLyricIndex(i);
          break;
        }
      }
    };
    const interval = setInterval(updateCurrentLyric, 100);
    return () => clearInterval(interval);
  }, [showLyrics, currentSong, youtubeTime]);

  // Up next songs
  const upNext = useMemo(() => {
    return playlist.slice(currentIndex + 1, currentIndex + 6);
  }, [playlist, currentIndex]);

  return {
    isPlaying, currentSong, playlist, currentIndex, songs,
    filterGenre, filterArtist, searchQuery, shuffle, repeat,
    youtubeTime, isAdPlaying,
    volume, isFullscreen, hidePlaylist, showLyrics, currentLyricIndex,
    genres, artists, filteredSongs, upNext,
    videoRef, audioRef, containerRef,
    setFilterGenre, setFilterArtist, setSearchQuery, setShuffle, setRepeat,
    setVolume, setHidePlaylist, setShowLyrics,
    setCurrentLyricIndex, setCurrentSong, setCurrentIndex,
    setIsAdPlaying, setYoutubeTime,
    startJukebox, stopJukebox, playNext, playPrevious,
    handleMediaEnd, toggleFullscreen, togglePlayPause,
  };
}
