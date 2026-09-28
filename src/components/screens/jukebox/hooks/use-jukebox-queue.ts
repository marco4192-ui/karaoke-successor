'use client';

import { useCallback, useEffect, useRef } from 'react';
import { Song } from '@/types/game';
import { getSongByIdWithLyrics } from '@/lib/game/song-library';
import { ensureSongUrls } from '@/lib/game/song-url-restore';
import { getPlaylistById } from '@/lib/playlist-manager';
import { createVideoBreakSong } from '../video-break';
import type { JukeboxCoreState } from './jukebox-hook-types';

// ===================== PARAMS / RETURN =====================

export interface UseJukeboxQueueParams {
  core: JukeboxCoreState;
  filteredSongs: Song[];
  shuffle: boolean;
  /** Raw shuffle setter (the public setShuffle is the live-reshuffling handle). */
  setShuffle: (_s: boolean) => void;
  // F10: Max songs in playlist (0 = unlimited)
  maxSongs: number;
  // N4: Auto-stop timer in minutes (0 = no timer)
  timerMinutes: number;
  songsRef: React.MutableRefObject<Song[]>;
}

export interface UseJukeboxQueueReturn {
  prepareSong: (_song: Song) => Promise<Song>;
  generatePlaylist: () => Promise<boolean>;
  addVideoToQueue: (_url: string, _label?: string, _requester?: string) => boolean;
  addVideoListToQueue: (_links: Array<{ url: string; label?: string }>) => number;
  addSongToQueue: (_song: Song, _requester?: string) => Promise<boolean>;
  addSongsToQueue: (_songs: Song[], _requester?: string) => Promise<number>;
  removeQueueVideo: (_songId: string) => boolean;
  enqueueLibraryPlaylist: (_playlistId: string) => Promise<boolean>;
  /** #17: Public setShuffle — reshuffles the remaining queue when enabled live. */
  handleSetShuffle: (_newShuffle: boolean) => void;
  /** N10: Export the current queue as JSON. */
  exportPlaylist: () => string;
}

// ===================== HOOK =====================

/**
 * Queue management for the jukebox (R10 extraction): song preparation,
 * playlist generation (wishlist interleave), the manual/video/song queue
 * inserts, queue removal, library-playlist enqueue, the companion
 * video-add bridge + wishlist polling effects, live shuffle toggle and
 * playlist export.
 */
export function useJukeboxQueue({
  core,
  filteredSongs,
  shuffle,
  setShuffle,
  maxSongs,
  timerMinutes,
  songsRef,
}: UseJukeboxQueueParams): UseJukeboxQueueReturn {
  const {
    playlistRef, currentIndexRef, isPlayingRef, currentSongRef,
    manualIdsRef, processedWishlistRef, songRequesterRef,
    genreCountRef, requesterCountRef,
    playNextRef,
    setPlaylist, setCurrentIndex, setCurrentSong,
    setCurrentSongRequestedBy, setCurrentTime, setDuration,
    setPlatformPaused, setIsPlaying, setSongsPlayed, setTimerRemaining,
  } = core;

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

  // ==================== VIDEO QUEUE (Video Breaks) ====================

  /**
   * Insert a song into the queue AFTER the last user-requested song (i.e.
   * before the next random song) — ref-synced so sequential inserts in the
   * same tick (link lists!) keep their order and are immediately visible to
   * playNext(). Returns the insert position or -1 when skipped (duplicate).
   */
  const insertSongIntoQueue = useCallback((song: Song, requester?: string): number => {
    const currentPlaylist = playlistRef.current;
    if (currentPlaylist.some(s => s.id === song.id)) return -1;

    if (requester) {
      songRequesterRef.current.set(song.id, requester);
    }

    const newPlaylist = [...currentPlaylist];
    const ci = currentIndexRef.current;
    const insertIdx = newPlaylist.findIndex((s, idx) => idx > ci && !manualIdsRef.current.has(s.id));
    const target = insertIdx === -1 ? newPlaylist.length : insertIdx;
    newPlaylist.splice(target, 0, song);
    manualIdsRef.current.add(song.id);

    // Keep the ref in sync IMMEDIATELY — setState is async and same-tick
    // callers (list inserts, playNext) must see the new queue.
    playlistRef.current = newPlaylist;
    setPlaylist(newPlaylist);
    return target;
  }, []);

  const addVideoToQueue = useCallback((url: string, label?: string, requester?: string): boolean => {
    const video = createVideoBreakSong(url, label);
    if (!video) return false;

    const running = isPlayingRef.current && playlistRef.current.length > 0;

    if (!running && playlistRef.current.length === 0) {
      // No queue at all → the video starts immediately
      if (requester) songRequesterRef.current.set(video.id, requester);
      manualIdsRef.current.add(video.id);
      playlistRef.current = [video];
      currentSongRef.current = video;
      currentIndexRef.current = 0;
      isPlayingRef.current = true;
      setPlaylist([video]);
      setCurrentIndex(0);
      setCurrentSong(video);
      setCurrentSongRequestedBy(requester ?? null);
      setCurrentTime(0);
      setDuration(0);
      setPlatformPaused(false);
      setIsPlaying(true);
      setSongsPlayed(prev => prev + 1);
      return true;
    }

    if (!running) {
      // Stopped jukebox with an existing queue → the video becomes the next
      // item and playback resumes with it right away.
      insertSongIntoQueue(video, requester);
      isPlayingRef.current = true;
      setPlatformPaused(false);
      setIsPlaying(true);
      playNextRef.current();
      return true;
    }

    // Running → insert after the last user song (before the next random song)
    insertSongIntoQueue(video, requester);
    return true;
  }, [insertSongIntoQueue]);

  const addVideoToQueueRef = useRef(addVideoToQueue);
  addVideoToQueueRef.current = addVideoToQueue;

  const addVideoListToQueue = useCallback((links: Array<{ url: string; label?: string }>): number => {
    let queued = 0;
    for (const link of links) {
      if (!link?.url?.trim()) continue;
      if (addVideoToQueueRef.current(link.url, link.label)) queued++;
    }
    return queued;
  }, []);

  // ==================== SONG QUEUE (search suggestions) ====================

  /**
   * Queue a library song following the same rules as addVideoToQueue():
   * running jukebox → inserted after the last user song; idle jukebox →
   * the song starts playing immediately (preparing it first so media URLs
   * exist). Returns false for duplicates.
   */
  const addSongToQueue = useCallback(async (song: Song, requester?: string): Promise<boolean> => {
    const running = isPlayingRef.current && playlistRef.current.length > 0;

    if (!running && playlistRef.current.length === 0) {
      // No queue at all → the song starts immediately
      try {
        const prepared = await prepareSong(song);
        if (requester) songRequesterRef.current.set(prepared.id, requester);
        manualIdsRef.current.add(prepared.id);
        playlistRef.current = [prepared];
        currentSongRef.current = prepared;
        currentIndexRef.current = 0;
        isPlayingRef.current = true;
        setPlaylist([prepared]);
        setCurrentIndex(0);
        setCurrentSong(prepared);
        setCurrentSongRequestedBy(requester ?? null);
        setCurrentTime(0);
        setDuration(prepared.duration ? prepared.duration / 1000 : 0);
        setPlatformPaused(false);
        setIsPlaying(true);
        setSongsPlayed(prev => prev + 1);
        return true;
      } catch (error) {
        // eslint-disable-next-line no-console
        console.debug('[useJukebox] addSongToQueue failed:', error);
        return false;
      }
    }

    if (!running) {
      // Stopped jukebox with an existing queue → the song becomes the next
      // item and playback resumes with it right away.
      const inserted = insertSongIntoQueue(song, requester);
      if (inserted === -1) return false;
      isPlayingRef.current = true;
      setPlatformPaused(false);
      setIsPlaying(true);
      playNextRef.current();
      return true;
    }

    // Running → insert after the last user song (before the next random song)
    return insertSongIntoQueue(song, requester) !== -1;
  }, [insertSongIntoQueue, prepareSong]);

  const addSongToQueueRef = useRef(addSongToQueue);
  addSongToQueueRef.current = addSongToQueue;

  /** Queue a list of library songs in order (search "add all").
   *  Sequential awaits keep the order and make each insert visible to the
   *  next call. Returns the number of successfully queued songs. */
  const addSongsToQueue = useCallback(async (songsToQueue: Song[], requester?: string): Promise<number> => {
    let queued = 0;
    for (const song of songsToQueue) {
      if (await addSongToQueueRef.current(song, requester)) queued++;
    }
    return queued;
  }, []);

  const removeQueueVideo = useCallback((songId: string): boolean => {
    const currentPlaylist = playlistRef.current;
    const idx = currentPlaylist.findIndex(s => s.id === songId);
    if (idx === -1) return false;
    // Never remove the currently playing item (use Next instead)
    if (idx === currentIndexRef.current) return false;

    const newPlaylist = currentPlaylist.filter(s => s.id !== songId);
    playlistRef.current = newPlaylist;
    setPlaylist(newPlaylist);
    if (idx < currentIndexRef.current) {
      const shifted = currentIndexRef.current - 1;
      currentIndexRef.current = shifted;
      setCurrentIndex(shifted);
    }
    manualIdsRef.current.delete(songId);
    songRequesterRef.current.delete(songId);
    return true;
  }, []);

  /** Library playlist → jukebox: fresh start (stored order) or enqueue while running. */
  const enqueueLibraryPlaylist = useCallback(async (playlistId: string): Promise<boolean> => {
    const pl = getPlaylistById(playlistId);
    if (!pl || pl.songIds.length === 0) return false;

    const full = pl.songIds
      .map(id => songsRef.current.find(s => s.id === id))
      .filter((s): s is Song => !!s);
    if (full.length === 0) return false;

    const running = isPlayingRef.current && playlistRef.current.length > 0;

    if (!running && playlistRef.current.length === 0) {
      // Fresh start: play EXACTLY this playlist in stored order
      const prepared = await prepareSong(full[0]);
      const newPlaylist = [prepared, ...full.slice(1)];
      full.forEach(s => manualIdsRef.current.add(s.id));
      playlistRef.current = newPlaylist;
      currentSongRef.current = prepared;
      currentIndexRef.current = 0;
      isPlayingRef.current = true;
      setPlaylist(newPlaylist);
      setCurrentIndex(0);
      setCurrentSong(prepared);
      setCurrentSongRequestedBy(null);
      setCurrentTime(0);
      setDuration(prepared.duration ? prepared.duration / 1000 : 0);
      setPlatformPaused(false);
      setIsPlaying(true);
      setSongsPlayed(0);
      genreCountRef.current.clear();
      requesterCountRef.current.clear();
      if (timerMinutes > 0) setTimerRemaining(timerMinutes * 60);
      return true;
    }

    if (!running) {
      // Stopped with an existing queue → enqueue after the current position and resume
      full.forEach(s => insertSongIntoQueue(s));
      isPlayingRef.current = true;
      setPlatformPaused(false);
      setIsPlaying(true);
      playNextRef.current();
      return true;
    }

    // Running → enqueue all songs after the last user song, in stored order
    full.forEach(s => insertSongIntoQueue(s));
    return true;
  }, [prepareSong, insertSongIntoQueue, timerMinutes]);

  // Companion App: video link arrives via the remote-command bridge
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ url?: string; label?: string; requester?: string }>).detail;
      if (!detail?.url) return;
      addVideoToQueueRef.current(detail.url, detail.label, detail.requester);
    };
    window.addEventListener('jukebox:video-add', handler as EventListener);
    return () => window.removeEventListener('jukebox:video-add', handler as EventListener);
  }, []);

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
        // eslint-disable-next-line no-console
        console.debug('[useJukebox] Wishlist poll failed:', error);
      }
    };
    pollWishlist();
    const interval = setInterval(pollWishlist, 5000);
    return () => { active = false; clearInterval(interval); };
  // #2 FIX: Only run once when songs are first loaded
   
  }, []); // Intentionally empty — songsRef is always current

  // ==================== #17: LIVE SHUFFLE TOGGLE ====================

  const handleSetShuffle = useCallback((newShuffle: boolean) => {
    setShuffle(newShuffle);
    if (!newShuffle || !isPlayingRef.current) return;

    // Reshuffle remaining songs (from currentIndex+1 onward) while keeping current song
    setPlaylist(prev => {
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

  // ==================== N10: EXPORT PLAYLIST ====================

  const exportPlaylist = useCallback(() => {
    return JSON.stringify(playlistRef.current.map(s => ({
      id: s.id,
      title: s.title,
      artist: s.artist,
      duration: s.duration,
    })), null, 2);
  }, []);

  return {
    prepareSong,
    generatePlaylist,
    addVideoToQueue,
    addVideoListToQueue,
    addSongToQueue,
    addSongsToQueue,
    removeQueueVideo,
    enqueueLibraryPlaylist,
    handleSetShuffle,
    exportPlaylist,
  };
}
