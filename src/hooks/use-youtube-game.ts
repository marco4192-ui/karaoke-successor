'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { extractYouTubeId, isYouTubeUrl } from '@/components/game/youtube-player';

interface UseYouTubeGameParams {
  effectiveSong: {
    youtubeUrl?: string;
    videoBackground?: string;
    videoUrl?: string;
    audioUrl?: string;
  } | null;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
}

interface UseYouTubeGameReturn {
  youtubeVideoId: string | null;
  customYoutubeId: string | null;
  showYoutubeInput: boolean;
  setShowYoutubeInput: (show: boolean) => void;
  isYouTube: boolean;
  useYouTubeAudio: boolean;
  isAdPlaying: boolean;
  adCountdown: number;
  handleYoutubeUrlSubmit: (url: string) => void;
  clearCustomYoutube: () => void;
  handleAdStart: () => void;
  handleAdEnd: () => void;
}

/**
 * Hook for managing YouTube video integration, custom URL input, and ad detection.
 * Handles: YouTube ID extraction, custom URL overrides, ad countdown timer.
 */
export function useYouTubeGame({
  effectiveSong,
  isPlaying,
  setIsPlaying,
}: UseYouTubeGameParams): UseYouTubeGameReturn {
  const [customYoutubeUrl, setCustomYoutubeUrl] = useState('');
  const [customYoutubeId, setCustomYoutubeId] = useState<string | null>(null);
  const [showYoutubeInput, setShowYoutubeInput] = useState(false);
  const [isAdPlaying, setIsAdPlaying] = useState(false);
  const [adCountdown, setAdCountdown] = useState(0);
  // Track whether the game was playing before the ad started,
  // so handleAdEnd only auto-resumes if the user didn't manually pause.
  const wasPlayingBeforeAdRef = useRef(false);

  // Extract YouTube ID from youtubeUrl, videoBackground, or videoUrl (fallback)
  const songYoutubeUrl = effectiveSong?.youtubeUrl;
  const videoBackground = effectiveSong?.videoBackground;
  const videoUrl = effectiveSong?.videoUrl;
  const songYoutubeId = songYoutubeUrl
    ? extractYouTubeId(songYoutubeUrl)
    : (videoBackground && isYouTubeUrl(videoBackground)
        ? extractYouTubeId(videoBackground)
        : (videoUrl && isYouTubeUrl(videoUrl)
          ? extractYouTubeId(videoUrl)
          : null));

  // Use custom YouTube ID if set, otherwise use song's YouTube ID
  const youtubeVideoId = customYoutubeId || songYoutubeId;
  const isYouTube = !!youtubeVideoId;

  // Determine if we should use YouTube audio (no separate audio file)
  const useYouTubeAudio = isYouTube && !effectiveSong?.audioUrl;

  // Handle custom YouTube URL input
  const handleYoutubeUrlSubmit = useCallback((url: string) => {
    const extractedId = extractYouTubeId(url);
    if (extractedId) {
      setCustomYoutubeId(extractedId);
      setCustomYoutubeUrl(url);
      setShowYoutubeInput(false);
    }
  }, []);

  // Clear custom YouTube video
  const clearCustomYoutube = useCallback(() => {
    setCustomYoutubeId(null);
    setCustomYoutubeUrl('');
  }, []);

  // Handle ad detection callbacks
  const handleAdStart = useCallback(() => {
    setIsAdPlaying(true);
    setAdCountdown(30); // Max 30 seconds for ad

    // Remember whether the game was playing before the ad
    wasPlayingBeforeAdRef.current = isPlaying;

    // Pause the game if playing
    if (isPlaying) {
      setIsPlaying(false);
    }

    // Sync ad state to mobile clients
    fetch('/api/mobile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'setAdPlaying',
        payload: { isAdPlaying: true },
      }),
    }).catch(() => {});
  }, [isPlaying, setIsPlaying]);

  const handleAdEnd = useCallback(() => {
    setIsAdPlaying(false);
    setAdCountdown(0);

    // Only auto-resume if the game was playing before the ad started
    // (don't resume if the user manually paused during the ad)
    if (wasPlayingBeforeAdRef.current) {
      setIsPlaying(true);
    }

    // Sync ad state to mobile clients
    fetch('/api/mobile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'setAdPlaying',
        payload: { isAdPlaying: false },
      }),
    }).catch(() => {});
  }, [setIsPlaying]);

  // Ad countdown effect
  useEffect(() => {
    if (isAdPlaying && adCountdown > 0) {
      const timer = setTimeout(() => {
        setAdCountdown(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isAdPlaying, adCountdown]);

  return {
    youtubeVideoId,
    customYoutubeId,
    showYoutubeInput,
    setShowYoutubeInput,
    isYouTube,
    useYouTubeAudio,
    isAdPlaying,
    adCountdown,
    handleYoutubeUrlSubmit,
    clearCustomYoutube,
    handleAdStart,
    handleAdEnd,
  };
}
