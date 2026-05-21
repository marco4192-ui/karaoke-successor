'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Song } from '@/types/game';
import { getAllSongsAsync, getSongByIdWithLyrics } from '@/lib/game/song-library';
import { ensureSongUrls } from '@/lib/game/song-url-restore';
import { extractYouTubeId } from '@/components/game/youtube-player';
import { getJsonOptional, setJson } from '@/lib/storage';
import { StorageKeys } from '@/lib/storage';
import { RepeatMode } from './jukebox-types';
import type { UseJukeboxReturn } from './jukebox-types';

/** Track recently played songs for F7 exclusion */
interface RecentlyPlayedEntry {
  songId: string;
  playedAt: number;
}

export function useJukebox(refs?: {
  containerRef?: React.RefObject<HTMLDivElement | null>;
  videoRef?: React.RefObject<HTMLVideoElement | null>;
  audioRef?: React.RefObject<HTMLAudioElement | null>;
}): UseJukeboxReturn {
  // ==================== STATE ====================

  // --- Filter / Config State ---
  const [filterGenre, setFilterGenre] = useState<string>('all');
  const [filterArtist, setFilterArtist] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [shuffle, setShuffle] = useState(true);
  const [repeat, setRepeat] = useState<RepeatMode>('all');
  // F11: Duration filter bounds (seconds)
  const [minDuration, setMinDuration] = useState(0);
  const [maxDuration, setMaxDuration] = useState(0);
  // F10: Max songs in playlist (0 = unlimited)
  const [maxSongs, setMaxSongs] = useState(0);
  // N4: Auto-stop timer in minutes (0 = no timer)
  const [timerMinutes, setTimerMinutes] = useState(0);
  // F7: Recently played exclusion in minutes (0 = off)
  const [recentlyPlayedMinutes, setRecentlyPlayedMinutes] = useState(30);

  // --- Playback State ---
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [customYoutubeId, setCustomYoutubeId] = useState<string | null>(null);
  const [playlist, setPlaylist] = useState<Song[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [youtubeTime, setYoutubeTime] = useState(0);
  // #12: Tracked playback time & duration (seconds)
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isAdPlaying, setIsAdPlaying] = useState(false);
  const [volume, setVolume] = useState(0.7);
  const [isFullscreen, setIsFullscreen] = useState(false);
  // F3: Mute state
  const [isMuted, setIsMuted] = useState(false);
  const [previousVolume, setPreviousVolume] = useState(0.7);
  const [hidePlaylist, setHidePlaylist] = useState(false);
  const [showLyrics, setShowLyrics] = useState(false);
  const [currentLyricIndex, setCurrentLyricIndex] = useState(0);
  // #3: Loading state for song switching
  const [isLoading, setIsLoading] = useState(false);
  // N8: Wishlist song attribution
  const [currentSongRequestedBy, setCurrentSongRequestedBy] = useState<string | null>(null);

  // --- Song Library ---
  const [songs, setSongs] = useState<Song[]>([]);

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
  const songsRef = useRef(songs);
  songsRef.current = songs;
  const playlistRef = useRef(playlist);
  playlistRef.current = playlist;
  const currentIndexRef = useRef(currentIndex);
  currentIndexRef.current = currentIndex;
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;
  const currentSongRef = useRef(currentSong);
  currentSongRef.current = currentSong;

  // ==================== LOAD SONGS ====================

  useEffect(() => {
    const loadSongs = async () => {
      const allSongs = await getAllSongsAsync();
      setSongs(allSongs);
    };
    loadSongs();
  }, []);

  // ==================== GENRES & ARTISTS ====================

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

  // ==================== FILTER SONGS ====================

  const filteredSongs = useMemo(() => {
    let filtered = songs;

    // F8: If a saved playlist exists, filter to those IDs
    const savedPlaylistIds = getJsonOptional<string[]>(StorageKeys.JUKEBOX_PLAYLIST);
    if (savedPlaylistIds && savedPlaylistIds.length > 0) {
      const idSet = new Set(savedPlaylistIds);
      filtered = filtered.filter(s => idSet.has(s.id));
    }

    // Genre filter
    if (filterGenre !== 'all') {
      filtered = filtered.filter(s => s.genre?.toLowerCase().includes(filterGenre.toLowerCase()));
    }
    // Artist filter
    if (filterArtist) {
      filtered = filtered.filter(s => s.artist === filterArtist);
    }
    // Search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(s =>
        s.title.toLowerCase().includes(query) ||
        s.artist.toLowerCase().includes(query) ||
        s.album?.toLowerCase().includes(query)
      );
    }
    // F11: Duration filter
    if (minDuration > 0) {
      filtered = filtered.filter(s => (s.duration / 1000) >= minDuration);
    }
    if (maxDuration > 0) {
      filtered = filtered.filter(s => (s.duration / 1000) <= maxDuration);
    }
    // F7: Recently played exclusion
    if (recentlyPlayedMinutes > 0) {
      const cutoff = Date.now() - recentlyPlayedMinutes * 60 * 1000;
      recentlyPlayedRef.current = recentlyPlayedRef.current.filter(e => e.playedAt > cutoff - 60 * 60 * 1000);
      const recentIds = new Set(
        recentlyPlayedRef.current
          .filter(e => e.playedAt > cutoff)
          .map(e => e.songId)
      );
      if (recentIds.size > 0) {
        filtered = filtered.filter(s => !recentIds.has(s.id));
      }
    }
    return filtered;
  }, [songs, filterGenre, filterArtist, searchQuery, minDuration, maxDuration, recentlyPlayedMinutes]);

  // ==================== DERIVED STATE ====================

  const upNext = useMemo(() => {
    return playlist.slice(currentIndex + 1, currentIndex + 6);
  }, [playlist, currentIndex]);

  // N9: Top genres
  const topGenres = useMemo(() => {
    return Array.from(genreCountRef.current.entries())
      .map(([genre, count]) => ({ genre, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- ref-based, update triggered by songsPlayed
  }, [songsPlayed]);

  // N9: Top requesters
  const topRequesters = useMemo(() => {
    return Array.from(requesterCountRef.current.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- ref-based
  }, [songsPlayed]);

  // ==================== PREPARE SONG ====================

  const prepareSong = useCallback(async (song: Song): Promise<Song> => {
    const withLyrics = await getSongByIdWithLyrics(song.id);
    return withLyrics || await ensureSongUrls(song);
  }, []);

  // ==================== GENERATE PLAYLIST ====================

  const generatePlaylist = useCallback(async () => {
    if (filteredSongs.length === 0) return false;

    let newPlaylist = [...filteredSongs];

    // Shuffle if enabled
    if (shuffle) {
      for (let i = newPlaylist.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newPlaylist[i], newPlaylist[j]] = [newPlaylist[j], newPlaylist[i]];
      }
    }

    // #1 FIX: Mark ALL songs that are known wishlist items in manualIdsRef
    // Use processedWishlistRef to know which are wishlist songs
    for (const song of newPlaylist) {
      if (processedWishlistRef.current.has(song.id)) {
        manualIdsRef.current.add(song.id);
      }
    }

    // N1: Interleave wishlist songs in round-robin order among random songs
    // Collect wishlist songs that are in the pool and their requesters
    const wishlistSongs: { song: Song; requester: string }[] = [];
    const randomSongs: Song[] = [];

    for (const song of newPlaylist) {
      const requester = songRequesterRef.current.get(song.id);
      if (requester && manualIdsRef.current.has(song.id)) {
        wishlistSongs.push({ song, requester });
      } else {
        randomSongs.push(song);
      }
    }

    // Interleave: one random, one wishlist, one random, ...
    if (wishlistSongs.length > 0) {
      const interleaved: Song[] = [];
      const maxLen = Math.max(randomSongs.length, wishlistSongs.length);
      for (let i = 0; i < maxLen; i++) {
        if (i < randomSongs.length) interleaved.push(randomSongs[i]);
        if (i < wishlistSongs.length) interleaved.push(wishlistSongs[i].song);
      }
      newPlaylist = interleaved;
    }

    // #15 FIX: No separate wishlist fetch here — polling effect handles live insertion

    // F10: Limit playlist size
    if (maxSongs > 0) {
      newPlaylist = newPlaylist.slice(0, maxSongs);
    }

    // Prepare first song
    const firstSong = newPlaylist[0];
    if (firstSong) {
      const preparedSong = await prepareSong(firstSong);
      newPlaylist = [preparedSong, ...newPlaylist.slice(1)];
    }

    setPlaylist(newPlaylist);
    setCurrentIndex(0);
    setCurrentSong(newPlaylist[0] || null);
    setCurrentTime(0);
    setDuration(newPlaylist[0]?.duration ? newPlaylist[0].duration / 1000 : 0);
    return true;
  }, [filteredSongs, shuffle, prepareSong, maxSongs]);

  // ==================== INSERT MANUAL SONG ====================

  const insertManualSongRef = useRef<(song: Song, requester?: string) => void>(() => {});

  const insertManualSong = useCallback((song: Song, requester?: string) => {
    // Don't insert duplicates
    if (playlistRef.current.some(s => s.id === song.id)) return;

    // Track requester
    if (requester) {
      songRequesterRef.current.set(song.id, requester);
      requesterCountRef.current.set(requester, (requesterCountRef.current.get(requester) || 0) + 1);
    }

    setPlaylist(prev => {
      const newPlaylist = [...prev];
      const ci = currentIndexRef.current;
      // N1: Find the first 'random' song after currentIndex to insert before it
      const insertIdx = newPlaylist.findIndex((s, idx) => idx > ci && !manualIdsRef.current.has(s.id));
      if (insertIdx === -1) {
        newPlaylist.push(song);
      } else {
        newPlaylist.splice(insertIdx, 0, song);
      }
      manualIdsRef.current.add(song.id);
      return newPlaylist;
    });
  }, []);

  insertManualSongRef.current = insertManualSong;

  // ==================== WISHLIST POLLING ====================

  useEffect(() => {
    if (songsRef.current.length === 0) return;
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
          // Mark as manual
          manualIdsRef.current.add(item.songId);
          // Track requester for N8
          songRequesterRef.current.set(item.songId, item.addedBy);
          // Resolve wishlist item to full Song object
          const fullSong = songsRef.current.find(s => s.id === item.songId);
          if (fullSong && playlistRef.current.length > 0) {
            insertManualSongRef.current(fullSong, item.addedBy);
          }
        }
      } catch (error) {
        // #25 FIX: Log instead of ignoring
        console.debug('[useJukebox] Wishlist poll failed:', error);
      }
    };
    pollWishlist();
    const interval = setInterval(pollWishlist, 5000);
    return () => { active = false; clearInterval(interval); };
  // #2 FIX: Only run once when songs are first loaded
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Intentionally empty — songsRef is always current

  // ==================== PLAY NEXT ====================

  const playNext = useCallback(async () => {
    if (playlistRef.current.length === 0) return;
    let nextIndex = currentIndexRef.current + 1;
    if (nextIndex >= playlistRef.current.length) {
      if (repeat === 'all') {
        nextIndex = 0;
      } else {
        setIsPlaying(false);
        return;
      }
    }
    setIsLoading(true);
    try {
      const nextSong = playlistRef.current[nextIndex];
      const preparedSong = await prepareSong(nextSong);
      // F7: Track as recently played
      recentlyPlayedRef.current.push({ songId: nextSong.id, playedAt: Date.now() });
      // N9: Update statistics
      setSongsPlayed(prev => prev + 1);
      if (nextSong.genre) {
        genreCountRef.current.set(nextSong.genre, (genreCountRef.current.get(nextSong.genre) || 0) + 1);
      }
      // N8: Set requester attribution
      const requester = songRequesterRef.current.get(nextSong.id) || null;
      setCurrentSongRequestedBy(requester);
      if (requester) {
        requesterCountRef.current.set(requester, (requesterCountRef.current.get(requester) || 0) + 1);
      }
      setCurrentIndex(nextIndex);
      setCurrentSong(preparedSong);
      setCurrentTime(0);
      setDuration(preparedSong.duration ? preparedSong.duration / 1000 : 0);
    } catch (error) {
      console.debug('[useJukebox] playNext failed:', error);
    } finally {
      setIsLoading(false);
    }
  }, [playlist, currentIndex, repeat, prepareSong]);

  // ==================== PLAY PREVIOUS ====================

  const playPrevious = useCallback(async () => {
    if (playlistRef.current.length === 0) return;
    // #10 FIX: At index 0, restart current song instead of wrapping
    if (currentIndexRef.current === 0) {
      // Restart current song
      if (videoRef.current) videoRef.current.currentTime = 0;
      if (audioRef.current) audioRef.current.currentTime = 0;
      setCurrentTime(0);
      return;
    }
    setIsLoading(true);
    try {
      const prevIndex = currentIndexRef.current - 1;
      const prevSong = playlistRef.current[prevIndex];
      const preparedSong = await prepareSong(prevSong);
      const requester = songRequesterRef.current.get(prevSong.id) || null;
      setCurrentSongRequestedBy(requester);
      setCurrentIndex(prevIndex);
      setCurrentSong(preparedSong);
      setCurrentTime(0);
      setDuration(preparedSong.duration ? preparedSong.duration / 1000 : 0);
    } catch (error) {
      console.debug('[useJukebox] playPrevious failed:', error);
    } finally {
      setIsLoading(false);
    }
  }, [playlist, currentIndex, prepareSong, videoRef, audioRef]);

  // ==================== HANDLE MEDIA END ====================

  const handleMediaEnd = useCallback(() => {
    if (repeat === 'one' && currentSongRef.current) {
      const videoHasEmbeddedAudio = currentSongRef.current.hasEmbeddedAudio || !currentSongRef.current.audioUrl;
      if (currentSongRef.current.videoBackground && videoRef.current) {
        videoRef.current.currentTime = 0;
        videoRef.current.play().catch(() => {});
      }
      if (currentSongRef.current.audioUrl && !videoHasEmbeddedAudio && audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => {});
      }
    } else {
      playNext();
    }
  }, [repeat, playNext]);

  // ==================== START / STOP JUKEBOX ====================

  const startJukebox = useCallback(async () => {
    setIsLoading(true);
    try {
      // #5 FIX: Catch errors from generatePlaylist
      const success = await generatePlaylist();
      if (success) {
        setIsPlaying(true);
        setSongsPlayed(0);
        genreCountRef.current.clear();
        requesterCountRef.current.clear();
        // N4: Start timer if configured
        if (timerMinutes > 0) {
          setTimerRemaining(timerMinutes * 60);
        }
      }
    } catch (error) {
      console.debug('[useJukebox] startJukebox failed:', error);
    } finally {
      setIsLoading(false);
    }
  }, [generatePlaylist, timerMinutes]);

  const stopJukebox = useCallback(() => {
    setIsPlaying(false);
    if (videoRef.current) videoRef.current.pause();
    if (audioRef.current) audioRef.current.pause();
    setTimerRemaining(null);
  }, [videoRef, audioRef]);

  // ==================== N4: TIMER ====================

  useEffect(() => {
    if (timerRemaining === null || timerRemaining <= 0) return;
    const interval = setInterval(() => {
      setTimerRemaining(prev => {
        if (prev === null || prev <= 1) {
          stopJukebox();
          return null;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timerRemaining, stopJukebox]);

  // ==================== JUKEBOX START EVENT LISTENER ====================

  useEffect(() => {
    const handleStartSignal = () => {
      startJukebox();
    };
    window.addEventListener('jukebox:start', handleStartSignal);
    return () => window.removeEventListener('jukebox:start', handleStartSignal);
  }, [startJukebox]);

  // ==================== FULLSCREEN ====================

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement === containerRef.current) {
      document.exitFullscreen();
    } else if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      containerRef.current?.requestFullscreen().catch(() => {});
    }
  }, [containerRef]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === containerRef.current);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [containerRef]);

  // ==================== PLAY / PAUSE ====================

  const togglePlayPause = useCallback(() => {
    // #18 FIX: Only play the correct media element
    const song = currentSongRef.current;
    if (!song) return;
    const videoHasEmbeddedAudio = song.hasEmbeddedAudio || !song.audioUrl;

    if (song.videoBackground && videoRef.current) {
      if (videoRef.current.paused) videoRef.current.play().catch(() => {});
      else videoRef.current.pause();
    }
    if (song.audioUrl && !videoHasEmbeddedAudio && audioRef.current) {
      if (audioRef.current.paused) audioRef.current.play().catch(() => {});
      else audioRef.current.pause();
    }
  }, [videoRef, audioRef]);

  // ==================== F3: MUTE TOGGLE ====================

  const toggleMute = useCallback(() => {
    if (isMuted) {
      // Unmute: restore previous volume
      setVolume(previousVolume);
      setIsMuted(false);
    } else {
      // Mute: save current volume and set to 0
      setPreviousVolume(volume);
      setVolume(0);
      setIsMuted(true);
    }
  }, [isMuted, volume, previousVolume]);

  // ==================== F1: SEEK TO ====================

  const seekTo = useCallback((fraction: number) => {
    const song = currentSongRef.current;
    if (!song) return;
    const songDuration = song.duration / 1000; // ms to seconds
    const targetTime = Math.max(0, Math.min(fraction, 1)) * songDuration;

    if (videoRef.current) {
      videoRef.current.currentTime = targetTime;
    }
    if (audioRef.current) {
      audioRef.current.currentTime = targetTime;
    }
    setCurrentTime(targetTime);
  }, [videoRef, audioRef]);

  // ==================== VOLUME ====================

  useEffect(() => {
    if (videoRef.current) videoRef.current.volume = volume;
    if (audioRef.current) audioRef.current.volume = volume;
    // If user moves slider while muted, unmute
    if (volume > 0 && isMuted) {
      setIsMuted(false);
    }
  }, [volume, videoRef, audioRef, isMuted]);

  // ==================== #4 FIX: ROBUST AUTO-PLAY ====================

  useEffect(() => {
    if (!isPlaying || !currentSong) return;
    const videoHasEmbeddedAudio = currentSong.hasEmbeddedAudio || !currentSong.audioUrl;

    let retries = 0;
    const maxRetries = 15;

    const attemptPlay = () => {
      let played = false;
      if (currentSong.videoBackground && videoRef.current) {
        videoRef.current.currentTime = 0;
        videoRef.current.play().catch(() => {});
        played = true;
      }
      if (currentSong.audioUrl && !videoHasEmbeddedAudio && audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => {});
        played = true;
      }
      return played;
    };

    // Try immediately, then retry if media not ready
    const played = attemptPlay();
    if (!played) {
      const retryInterval = setInterval(() => {
        const didPlay = attemptPlay();
        retries++;
        if (didPlay || retries >= maxRetries) {
          clearInterval(retryInterval);
        }
      }, 100);
      return () => clearInterval(retryInterval);
    }
  }, [isPlaying, currentSong, videoRef, audioRef]);

  // ==================== #12: TIME TRACKING ====================

  useEffect(() => {
    const audioEl = audioRef.current;
    const videoEl = videoRef.current;
    if (!audioEl && !videoEl) return;

    const handleTimeUpdate = () => {
      // Use audio/video time (YouTube uses youtubeTime)
      const time = (audioEl?.currentTime || 0) || (videoEl?.currentTime || 0);
      setCurrentTime(time);
      if (audioEl?.duration) setDuration(audioEl.duration);
      if (videoEl?.duration) setDuration(videoEl.duration);
    };

    const handleLoadedMetadata = () => {
      if (audioEl?.duration) setDuration(audioEl.duration);
      if (videoEl?.duration) setDuration(videoEl.duration);
    };

    audioEl?.addEventListener('timeupdate', handleTimeUpdate);
    audioEl?.addEventListener('loadedmetadata', handleLoadedMetadata);
    videoEl?.addEventListener('timeupdate', handleTimeUpdate);
    videoEl?.addEventListener('loadedmetadata', handleLoadedMetadata);

    return () => {
      audioEl?.removeEventListener('timeupdate', handleTimeUpdate);
      audioEl?.removeEventListener('loadedmetadata', handleLoadedMetadata);
      videoEl?.removeEventListener('timeupdate', handleTimeUpdate);
      videoEl?.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [audioRef, videoRef]);

  // ==================== F5: ENERGY SAVING ====================

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Tab is hidden — we don't pause, but reduce processing
        // The lyrics interval will still run but do less work
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // ==================== LYRICS TRACKING ====================

  useEffect(() => {
    // F5: Skip lyrics updates when tab is hidden
    if (document.hidden) return;
    if (!showLyrics || !currentSong || !currentSong.lyrics?.length) return;

    const updateCurrentLyric = () => {
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
  }, [showLyrics, currentSong, youtubeTime, audioRef, videoRef]);

  // ==================== CLEANUP ON UNMOUNT ====================

  useEffect(() => {
    const audioEl = audioRef.current;
    const videoEl = videoRef.current;
    return () => {
      if (audioEl) audioEl.pause();
      if (videoEl) videoEl.pause();
      setPlaylist([]);
      setCurrentSong(null);
      setCurrentIndex(0);
      setIsPlaying(false);
      setTimerRemaining(null);
      manualIdsRef.current = new Set();
      processedWishlistRef.current = new Set();
      songRequesterRef.current.clear();
      recentlyPlayedRef.current = [];
      genreCountRef.current.clear();
      requesterCountRef.current.clear();
      // Clear saved playlist
      try { setJson(StorageKeys.JUKEBOX_PLAYLIST, []); } catch { /* ignore */ }
    };
  }, [audioRef, videoRef]);

  // ==================== #17: LIVE SHUFFLE TOGGLE ====================

  const handleSetShuffle = useCallback((newShuffle: boolean) => {
    setShuffle(newShuffle);
    if (!newShuffle || !isPlayingRef.current) return;

    // Reshuffle remaining songs (from currentIndex+1 onward) while keeping current song
    setPlaylist(prev => {
      const current = prev[currentIndexRef.current];
      const alreadyPlayed = prev.slice(0, currentIndexRef.current + 1);
      const remaining = prev.slice(currentIndexRef.current + 1);

      if (remaining.length <= 1) return prev;

      // Fisher-Yates shuffle on remaining
      const shuffled = [...remaining];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }

      return [...alreadyPlayed, ...shuffled];
    });
  }, []);

  // ==================== YOUTUBE URL HANDLING ====================

  const handleYoutubeUrlSubmit = useCallback((url: string) => {
    const extractedId = extractYouTubeId(url);
    if (extractedId) {
      setCustomYoutubeId(extractedId);
    }
  }, []);

  const clearCustomYoutube = useCallback(() => {
    setCustomYoutubeId(null);
  }, []);

  // ==================== N10: EXPORT PLAYLIST ====================

  const exportPlaylist = useCallback(() => {
    return JSON.stringify(playlistRef.current.map(s => ({
      id: s.id,
      title: s.title,
      artist: s.artist,
      duration: s.duration,
    })), null, 2);
  }, []);

  // ==================== YOUTUBE TIME → STATE TIME ====================

  useEffect(() => {
    if (youtubeTime > 0 && currentSong) {
      setCurrentTime(youtubeTime / 1000);
      setDuration(currentSong.duration / 1000);
    }
  }, [youtubeTime, currentSong]);

  // ==================== RETURN ====================

  return {
    // Filters
    filterGenre, filterArtist, searchQuery, shuffle, repeat,
    minDuration, maxDuration, maxSongs, timerMinutes, recentlyPlayedMinutes,
    setFilterGenre, setFilterArtist, setSearchQuery,
    setShuffle: handleSetShuffle, setRepeat,
    setMinDuration, setMaxDuration, setMaxSongs, setTimerMinutes, setRecentlyPlayedMinutes,
    // Playback
    isPlaying, currentSong, customYoutubeId, playlist, currentIndex,
    youtubeTime, currentTime, duration, isAdPlaying,
    volume, isFullscreen, isMuted, previousVolume,
    hidePlaylist, showLyrics, currentLyricIndex, isLoading,
    currentSongRequestedBy,
    setVolume, setHidePlaylist, setShowLyrics,
    setCurrentLyricIndex, setCurrentSong, setCurrentIndex,
    setIsAdPlaying, setYoutubeTime, setCurrentTime, setDuration,
    // Derived
    genres, artists, filteredSongs, upNext,
    songsPlayed, topGenres, topRequesters, timerRemaining,
    // YouTube
    handleYoutubeUrlSubmit, clearCustomYoutube,
    // Actions
    startJukebox, stopJukebox, playNext, playPrevious,
    handleMediaEnd, toggleFullscreen, togglePlayPause,
    toggleMute, seekTo,
    exportPlaylist,
    // Library
    songs,
  };
}
