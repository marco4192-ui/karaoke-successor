'use client';

import { useState, useCallback, useEffect } from 'react';
import { getSongLoudnessGainDb } from '@/lib/audio/loudness';
import { getBool } from '@/lib/storage';
import { StorageKeys } from '@/lib/storage';
import { getSongPlatformVideo } from '../video-break';
import type { JukeboxCoreState } from './jukebox-hook-types';

// ===================== PARAMS / RETURN =====================

export interface UseJukeboxMediaParams {
  core: JukeboxCoreState;
}

export interface UseJukeboxMediaReturn {
  volume: number;
  setVolume: React.Dispatch<React.SetStateAction<number>>;
  // #F3: mute state
  isMuted: boolean;
  /** #F3: volume before mute */
  previousVolume: number;
  togglePlayPause: () => void;
  toggleMute: () => void;          // #F3
  seekTo: (_fraction: number) => void; // #F1: seek bar
}

// ===================== HOOK =====================

/**
 * Media element interaction for the jukebox (R10 extraction): play/pause,
 * mute, seeking, volume + loudness normalization, the platform-pause reset,
 * the #4 robust auto-play retry loop and the #12 time tracking listeners.
 */
export function useJukeboxMedia({ core }: UseJukeboxMediaParams): UseJukeboxMediaReturn {
  const {
    isPlaying, currentSong,
    currentSongRef,
    videoRef, audioRef,
    setPlatformPaused, setCurrentTime, setDuration,
  } = core;

  const [volume, setVolume] = useState(0.7);
  // F3: Mute state
  const [isMuted, setIsMuted] = useState(false);
  const [previousVolume, setPreviousVolume] = useState(0.7);

  // ==================== PLAY / PAUSE ====================

  const togglePlayPause = useCallback(() => {
    const song = currentSongRef.current;
    if (!song) return;

    // Streaming-platform videos (video break or platform #VIDEO) are driven
    // via the isPlaying prop — pause them through the platformPaused flag.
    if (getSongPlatformVideo(song)) {
      setPlatformPaused(p => !p);
      return;
    }

    // #18 FIX: Only play the correct media element
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

  // Reset the platform pause flag whenever the current media changes
  useEffect(() => {
    setPlatformPaused(false);
  }, [currentSong?.id]);

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

  // Loudness normalization: per-song attenuation factor toward the 89 dB
  // reference, folded multiplicatively into the volume write below.
  // Element-level attenuation only (element.volume cannot boost) — analysis
  // failures yield factor 1 (unchanged volume) and never block playback.
  // State is tagged with the analyzed songId so a stale (previous song's)
  // factor is ignored while the new song's analysis is still running.
  const [loudnessGain, setLoudnessGain] = useState<{ songId: string | null; factor: number }>({ songId: null, factor: 1 });
  const jukeboxSongId = currentSong?.id;
  const loudnessFactor = loudnessGain.songId === jukeboxSongId ? loudnessGain.factor : 1;
  useEffect(() => {
    let cancelled = false;
    const audioUrl = currentSong?.audioUrl;
    if (!jukeboxSongId || !audioUrl || !getBool(StorageKeys.LOUDNESS_NORMALIZATION, true)) return;
    getSongLoudnessGainDb(jukeboxSongId, audioUrl)
      .then((gainDb) => {
        if (cancelled) return;
        setLoudnessGain({ songId: jukeboxSongId, factor: gainDb <= 0 ? Math.pow(10, gainDb / 20) : 1 });
      })
      .catch(() => {
        // Never throw — analysis failure means factor 1.
      });
    return () => { cancelled = true; };
  }, [jukeboxSongId, currentSong?.audioUrl]);

  useEffect(() => {
    const v = Math.min(1, Math.max(0, volume * loudnessFactor));
    if (videoRef.current) videoRef.current.volume = v;
    if (audioRef.current) audioRef.current.volume = v;
    // If user moves slider while muted, unmute
    if (volume > 0 && isMuted) {
      setIsMuted(false);
    }
  }, [volume, loudnessFactor, videoRef, audioRef, isMuted]);

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
    // currentSong is needed because audioRef/videoRef are stable ref objects;
    // the <audio>/<video> DOM elements only mount when a song is set, so
    // we must re-run this effect each time currentSong changes to attach
    // listeners to the newly mounted elements.
  }, [audioRef, videoRef, currentSong]);

  return {
    volume,
    setVolume,
    isMuted,
    previousVolume,
    togglePlayPause,
    toggleMute,
    seekTo,
  };
}
