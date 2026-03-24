'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { extractYouTubeId } from '@/components/game/youtube-player';
import type { Song } from '@/types/game';

export interface UseGameMediaOptions {
  song: Song | null;
  isPlaying: boolean;
  onTimeUpdate?: (time: number) => void;
  onAdStart?: () => void;
  onAdEnd?: () => void;
}

export interface GameMediaState {
  mediaLoaded: boolean;
  isYouTube: boolean;
  youtubeVideoId: string | null;
  useYouTubeAudio: boolean;
  isAdPlaying: boolean;
  adCountdown: number;
  customYoutubeId: string | null;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  videoRef: React.RefObject<HTMLVideoElement | null>;
}

export function useGameMedia({
  song,
  isPlaying,
  onTimeUpdate,
  onAdStart,
  onAdEnd,
}: UseGameMediaOptions): GameMediaState & {
  setMediaLoaded: (value: boolean) => void;
  handleYoutubeUrlSubmit: (url: string) => void;
  clearCustomYoutube: () => void;
  handleAdStart: () => void;
  handleAdEnd: () => void;
  startMediaPlayback: (startPosition: number) => Promise<void>;
  pauseMedia: () => void;
  stopMedia: () => void;
} {
  const [mediaLoaded, setMediaLoaded] = useState(false);
  const [customYoutubeId, setCustomYoutubeId] = useState<string | null>(null);
  const [isAdPlaying, setIsAdPlaying] = useState(false);
  const [adCountdown, setAdCountdown] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioLoadedRef = useRef(false);
  const videoLoadedRef = useRef(false);

  // Check if song has YouTube URL
  const songYoutubeUrl = song?.youtubeUrl;
  const videoBackground = song?.videoBackground;
  const songYoutubeId = songYoutubeUrl ? extractYouTubeId(songYoutubeUrl) :
    (videoBackground && (videoBackground.startsWith('http://') || videoBackground.startsWith('https://')) ?
      extractYouTubeId(videoBackground) : null);

  // Use custom YouTube ID if set, otherwise use song's YouTube ID
  const youtubeVideoId = customYoutubeId || songYoutubeId;
  const isYouTube = !!youtubeVideoId;
  const useYouTubeAudio = isYouTube && !song?.audioUrl;

  // Handle custom YouTube URL input
  const handleYoutubeUrlSubmit = useCallback((url: string) => {
    const extractedId = extractYouTubeId(url);
    if (extractedId) {
      setCustomYoutubeId(extractedId);
    }
  }, []);

  // Clear custom YouTube video
  const clearCustomYoutube = useCallback(() => {
    setCustomYoutubeId(null);
  }, []);

  // Handle ad detection callbacks
  const handleAdStart = useCallback(() => {
    setIsAdPlaying(true);
    setAdCountdown(30);
    onAdStart?.();
  }, [onAdStart]);

  const handleAdEnd = useCallback(() => {
    setIsAdPlaying(false);
    setAdCountdown(0);
    onAdEnd?.();
  }, [onAdEnd]);

  // Ad countdown effect
  useEffect(() => {
    if (isAdPlaying && adCountdown > 0) {
      const timer = setTimeout(() => {
        setAdCountdown(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isAdPlaying, adCountdown]);

  // Initialize media elements when song loads
  useEffect(() => {
    if (!song) return;

    // Reset media loaded state
    setMediaLoaded(false);
    audioLoadedRef.current = false;
    videoLoadedRef.current = false;

    const loadMedia = async () => {
      // For songs with audioUrl, wait for audio element to be ready
      if (song.audioUrl) {
        const maxWait = 5000;
        const startTime = Date.now();

        while (!audioLoadedRef.current && Date.now() - startTime < maxWait) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }

      // For songs with embedded audio (video), wait for video element
      if (song.hasEmbeddedAudio && song.videoBackground && !song.audioUrl) {
        const maxWait = 5000;
        const startTime = Date.now();

        while (!videoLoadedRef.current && Date.now() - startTime < maxWait) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }

      // For YouTube videos, just need a small delay for iframe to initialize
      if (song.youtubeUrl) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      setMediaLoaded(true);
    };

    loadMedia();
  }, [song]);

  // Start media playback
  const startMediaPlayback = useCallback(async (startPosition: number) => {
    try {
      // Get fresh media URLs from IndexedDB if storedMedia flag is set
      let currentAudioUrl = song?.audioUrl;
      let currentVideoUrl = song?.videoBackground;

      if (song?.storedMedia) {
        try {
          const { getSongMediaUrls } = await import('@/lib/db/media-db');
          const mediaUrls = await getSongMediaUrls(song.id);
          if (mediaUrls.audioUrl) currentAudioUrl = mediaUrls.audioUrl;
          if (mediaUrls.videoUrl) currentVideoUrl = mediaUrls.videoUrl;
        } catch (e) {
          console.error('[useGameMedia] Failed to load media from IndexedDB:', e);
        }
      }

      // PRIORITY 1: Separate audio file
      if (audioRef.current && currentAudioUrl) {
        audioRef.current.src = currentAudioUrl;
        audioRef.current.currentTime = startPosition;
        await audioRef.current.play();
      }

      // PRIORITY 2: Video with embedded audio
      else if (song?.hasEmbeddedAudio && videoRef.current && currentVideoUrl && !currentAudioUrl) {
        videoRef.current.src = currentVideoUrl;
        videoRef.current.currentTime = startPosition;

        try {
          videoRef.current.muted = false;
          await videoRef.current.play();
        } catch {
          videoRef.current.muted = true;
          await videoRef.current.play();
          setTimeout(() => {
            if (videoRef.current) {
              videoRef.current.muted = false;
            }
          }, 100);
        }
      }

      // PRIORITY 3: YouTube video
      else if (isYouTube && youtubeVideoId) {
        // YouTube player is rendered in JSX and controlled by isPlaying prop
      }

      // BACKGROUND VIDEO (muted, synced with audio)
      if (videoRef.current && song?.videoBackground && !song?.hasEmbeddedAudio) {
        const videoGapSeconds = (song.videoGap || 0) / 1000;
        videoRef.current.currentTime = Math.max(0, startPosition - videoGapSeconds);
        videoRef.current.muted = true;
        videoRef.current.play().catch(() => { });
      }
    } catch (error) {
      console.error('[useGameMedia] Media playback failed:', error);
    }
  }, [song, isYouTube, youtubeVideoId]);

  // Pause media
  const pauseMedia = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    if (videoRef.current) {
      videoRef.current.pause();
    }
  }, []);

  // Stop media
  const stopMedia = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  }, []);

  return {
    mediaLoaded,
    isYouTube,
    youtubeVideoId,
    useYouTubeAudio,
    isAdPlaying,
    adCountdown,
    customYoutubeId,
    audioRef,
    videoRef,
    setMediaLoaded,
    handleYoutubeUrlSubmit,
    clearCustomYoutube,
    handleAdStart,
    handleAdEnd,
    startMediaPlayback,
    pauseMedia,
    stopMedia,
  };
}
