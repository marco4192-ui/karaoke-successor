/**
 * use-jukebox-media.ts
 * 
 * Hook for managing media playback in jukebox mode
 * Extracted from jukebox-screen.tsx for better maintainability
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Song } from '@/types/game';

export interface UseJukeboxMediaOptions {
  volume?: number;
  onMediaEnd?: () => void;
}

export interface UseJukeboxMediaResult {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  volume: number;
  isPlaying: boolean;
  setVolume: (volume: number) => void;
  play: () => void;
  pause: () => void;
  stop: () => void;
  playSong: (song: Song | null) => void;
}

/**
 * Hook for managing jukebox media playback
 */
export function useJukeboxMedia(options: UseJukeboxMediaOptions = {}): UseJukeboxMediaResult {
  const {
    volume: initialVolume = 0.7,
    onMediaEnd,
  } = options;

  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  
  const [volume, setVolume] = useState(initialVolume);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);

  // Update volume on both elements
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume;
    }
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume, currentSong]);

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
    };
  }, []);

  // Play
  const play = useCallback(() => {
    const playTimer = setTimeout(() => {
      if (videoRef.current) {
        videoRef.current.play().catch(() => {});
      }
      if (audioRef.current) {
        audioRef.current.play().catch(() => {});
      }
    }, 100);
    setIsPlaying(true);
    return () => clearTimeout(playTimer);
  }, []);

  // Pause
  const pause = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.pause();
    }
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setIsPlaying(false);
  }, []);

  // Stop
  const stop = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
    setCurrentSong(null);
  }, []);

  // Play a specific song
  const playSong = useCallback((song: Song | null) => {
    if (!song) {
      stop();
      return;
    }

    setCurrentSong(song);
    setIsPlaying(true);

    // Small delay to allow refs to be set
    const playTimer = setTimeout(() => {
      // Determine if video has embedded audio
      const videoHasEmbeddedAudio = song.hasEmbeddedAudio || !song.audioUrl;

      // Play video if available
      if (song.videoBackground && videoRef.current) {
        videoRef.current.currentTime = 0;
        videoRef.current.play().catch(() => {});
      }

      // Play separate audio only if there's a dedicated audioUrl
      if (song.audioUrl && !videoHasEmbeddedAudio && audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => {});
      }
    }, 100);

    return () => clearTimeout(playTimer);
  }, [stop]);

  // Handle media end
  useEffect(() => {
    const handleVideoEnd = () => {
      if (onMediaEnd) {
        onMediaEnd();
      }
    };

    const handleAudioEnd = () => {
      if (onMediaEnd) {
        onMediaEnd();
      }
    };

    const video = videoRef.current;
    const audio = audioRef.current;

    video?.addEventListener('ended', handleVideoEnd);
    audio?.addEventListener('ended', handleAudioEnd);

    return () => {
      video?.removeEventListener('ended', handleVideoEnd);
      audio?.removeEventListener('ended', handleAudioEnd);
    };
  }, [onMediaEnd]);

  return {
    videoRef,
    audioRef,
    volume,
    isPlaying,
    setVolume,
    play,
    pause,
    stop,
    playSong,
  };
}
