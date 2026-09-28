'use client';

import { useCallback, useEffect } from 'react';
import type { Song } from '@/types/game';
import { getSongPlatformVideo, isVideoBreak } from '../video-break';
import type { RepeatMode } from '../jukebox-types';
import type { JukeboxCoreState } from './jukebox-hook-types';

// ===================== PARAMS / RETURN =====================

export interface UseJukeboxPlaybackParams {
  core: JukeboxCoreState;
  generatePlaylist: () => Promise<boolean>;
  prepareSong: (_song: Song) => Promise<Song>;
  repeat: RepeatMode;
  // N4: Auto-stop timer in minutes (0 = no timer)
  timerMinutes: number;
  /** Bumped by the 'jukebox-pool-changed' listener to trigger re-filtering. */
  setPoolChangeCounter: (_fn: (_c: number) => number) => void;
}

export interface UseJukeboxPlaybackReturn {
  startJukebox: () => Promise<void>;
  stopJukebox: () => void;
  playNext: () => Promise<void>;
  playPrevious: () => Promise<void>;
  handleMediaEnd: () => void;
}

// ===================== HOOK =====================

/**
 * Playback transport & run lifecycle for the jukebox (R10 extraction):
 * next/previous navigation, media-end handling (repeat-one restarts),
 * start/stop, the N4 auto-stop timer, and the jukebox:start /
 * jukebox-pool-changed window listeners.
 */
export function useJukeboxPlayback({
  core,
  generatePlaylist,
  prepareSong,
  repeat,
  timerMinutes,
  setPoolChangeCounter,
}: UseJukeboxPlaybackParams): UseJukeboxPlaybackReturn {
  const {
    playlist, currentIndex, timerRemaining,
    playlistRef, currentIndexRef, isPlayingRef, currentSongRef,
    recentlyPlayedRef, genreCountRef, requesterCountRef, songRequesterRef,
    playNextRef,
    videoRef, audioRef,
    setIsPlaying, setIsLoading, setPlatformPaused, setPlatformRestartKey,
    setCurrentIndex, setCurrentSong, setCurrentTime, setDuration,
    setCurrentSongRequestedBy, setSongsPlayed, setTimerRemaining,
  } = core;

  // ==================== PLAY NEXT ====================

  const playNext = useCallback(async () => {
    if (playlistRef.current.length === 0) return;
    let nextIndex = currentIndexRef.current + 1;
    if (nextIndex >= playlistRef.current.length) {
      // A queue that contains ONLY video links ends after the last video —
      // looping a video list like a song pool is almost never wanted.
      const onlyVideoBreaks = playlistRef.current.every(s => isVideoBreak(s));
      if (repeat === 'all' && !onlyVideoBreaks) {
        nextIndex = 0;
      } else {
        isPlayingRef.current = false;
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
      currentSongRef.current = preparedSong;
      currentIndexRef.current = nextIndex;
      setCurrentIndex(nextIndex);
      setCurrentSong(preparedSong);
      setCurrentTime(0);
      setPlatformPaused(false);
      setDuration(preparedSong.duration ? preparedSong.duration / 1000 : 0);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.debug('[useJukebox] playNext failed:', error);
    } finally {
      setIsLoading(false);
    }
  }, [playlist, currentIndex, repeat, prepareSong]);

  playNextRef.current = playNext;

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
      currentSongRef.current = preparedSong;
      currentIndexRef.current = prevIndex;
      setPlatformPaused(false);
      setCurrentIndex(prevIndex);
      setCurrentSong(preparedSong);
      setCurrentTime(0);
      setDuration(preparedSong.duration ? preparedSong.duration / 1000 : 0);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.debug('[useJukebox] playPrevious failed:', error);
    } finally {
      setIsLoading(false);
    }
  }, [playlist, currentIndex, prepareSong, videoRef, audioRef]);

  // ==================== HANDLE MEDIA END ====================

  const handleMediaEnd = useCallback(() => {
    if (repeat === 'one' && currentSongRef.current) {
      const videoHasEmbeddedAudio = currentSongRef.current.hasEmbeddedAudio || !currentSongRef.current.audioUrl;
      // Streaming-platform videos: restart via player remount (key bump)
      if (getSongPlatformVideo(currentSongRef.current)) {
        setPlatformPaused(false);
        setCurrentTime(0);
        setPlatformRestartKey(k => k + 1);
        return;
      }
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
      // eslint-disable-next-line no-console
      console.debug('[useJukebox] startJukebox failed:', error);
    } finally {
      setIsLoading(false);
    }
  }, [generatePlaylist, timerMinutes]);

  const stopJukebox = useCallback(() => {
    isPlayingRef.current = false;
    setIsPlaying(false);
    setPlatformPaused(false);
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

  // ==================== POOL CHANGE EVENT LISTENER ====================

  useEffect(() => {
    const handlePoolChange = () => {
      setPoolChangeCounter(c => c + 1);
    };
    window.addEventListener('jukebox-pool-changed', handlePoolChange);
    return () => window.removeEventListener('jukebox-pool-changed', handlePoolChange);
  }, []);

  return {
    startJukebox,
    stopJukebox,
    playNext,
    playPrevious,
    handleMediaEnd,
  };
}
