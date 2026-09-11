'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { extractYouTubeId } from '@/components/game/youtube-player';
import {
  detectVideoPlatform,
  platformAdLabel,
  MANUAL_START_PLATFORMS,
  type VideoPlatform,
} from '@/lib/url-utils';

/** Maximum ad countdown duration in seconds */
const MAX_AD_COUNTDOWN_SECONDS = 30;

interface UseYouTubeGameParams {
  effectiveSong: {
    youtubeUrl?: string;
    dailymotionUrl?: string;
    vimeoUrl?: string;
    rutubeUrl?: string;
    vkVideoUrl?: string;
    bilibiliUrl?: string;
    nicovideoUrl?: string;
    videoBackground?: string;
    videoUrl?: string;
    audioUrl?: string;
    id?: string;
  } | null;
  isPlaying: boolean;
  setIsPlaying: (_playing: boolean) => void;
}

interface UseYouTubeGameReturn {
  youtubeVideoId: string | null;
  customYoutubeId: string | null;
  showYoutubeInput: boolean;
  setShowYoutubeInput: (_show: boolean) => void;
  isYouTube: boolean;
  useYouTubeAudio: boolean;
  /** Detected streaming platform of the song's video URL (YouTube/Dailymotion/Vimeo). */
  videoPlatform: VideoPlatform;
  /** Full platform video URL (null for the custom-YouTube override and non-platform songs). */
  platformVideoUrl: string | null;
  /** Domain label for the ad overlay ("youtube.com", "dailymotion.com", "vimeo.com"). */
  adPlatformLabel: string;
  /** True when the streaming player (any platform) must provide the audio. */
  usePlatformAudio: boolean;
  isAdPlaying: boolean;
  adCountdown: number;
  /** True when the platform needs a MANUAL song-start confirmation (Bilibili always; Niconico when its API is dead). */
  needsManualStart: boolean;
  /** True while the manual start gate is engaged (game waiting for the user to confirm "music is running"). */
  manualStartPending: boolean;
  /** True once the user confirmed the manual start gate — passed down to the players. */
  manualStartConfirmed: boolean;
  /** Confirm the manual start gate (user clicked "Musik läuft — Los!"). */
  confirmManualStart: () => void;
  /** A player (Niconico) signals its API is dead and requests the manual gate. */
  requestManualGate: () => void;
  handleYoutubeUrlSubmit: (_url: string) => void;
  clearCustomYoutube: () => void;
  handleAdStart: () => void;
  handleAdEnd: () => void;
}

/**
 * Hook for managing streaming-video platform integration (YouTube,
 * Dailymotion, Vimeo, Rutube, VK, Bilibili, Niconico), custom URL overrides,
 * and ad detection.
 * Handles: platform detection, YouTube ID extraction, custom URL overrides,
 * ad countdown timer, the game-wait/resume flow around ads, and the manual
 * song-start gate for platforms without a playback API (Bilibili) or with a
 * dead API (Niconico fallback).
 *
 * Naming note: the hook keeps its historical export name (useYouTubeGame)
 * for call-site stability, but is platform-aware since the
 * Dailymotion/Vimeo integration.
 */
export function useYouTubeGame({
  effectiveSong,
  isPlaying,
  setIsPlaying,
}: UseYouTubeGameParams): UseYouTubeGameReturn {
  const [customYoutubeId, setCustomYoutubeId] = useState<string | null>(null);
  const [showYoutubeInput, setShowYoutubeInput] = useState(false);
  const [isAdPlaying, setIsAdPlaying] = useState(false);
  const [adCountdown, setAdCountdown] = useState(0);
  // ── Manual start gate state (Bilibili / Niconico-API-dead) ──
  const [manualFallback, setManualFallback] = useState(false);
  const [manualStartConfirmed, setManualStartConfirmed] = useState(false);
  // Track whether the game was playing before the ad started,
  // so handleAdEnd only auto-resumes if the user didn't manually pause.
  const wasPlayingBeforeAdRef = useRef(false);

  // ── Platform detection (YouTube / Dailymotion / Vimeo / Rutube / VK / Bilibili / Niconico) ──
  // Candidate URL fields in priority order — mirrors the historical
  // YouTube-only extraction (youtubeUrl → videoBackground → videoUrl).
  const songYoutubeUrl = effectiveSong?.youtubeUrl;
  const videoBackground = effectiveSong?.videoBackground;
  const videoUrl = effectiveSong?.videoUrl;

  const songPlatformUrl =
    songYoutubeUrl ||
    effectiveSong?.dailymotionUrl ||
    effectiveSong?.vimeoUrl ||
    effectiveSong?.rutubeUrl ||
    effectiveSong?.vkVideoUrl ||
    effectiveSong?.bilibiliUrl ||
    effectiveSong?.nicovideoUrl ||
    (videoBackground && detectVideoPlatform(videoBackground) ? videoBackground : undefined) ||
    (videoUrl && detectVideoPlatform(videoUrl) ? videoUrl : undefined) ||
    null;

  // A custom YouTube override (user-pasted URL) always wins over the song's video.
  const customActive = !!customYoutubeId;
  const videoPlatform: VideoPlatform = customActive
    ? 'youtube'
    : detectVideoPlatform(songPlatformUrl ?? '');
  const platformVideoUrl = !customActive && videoPlatform ? songPlatformUrl : null;
  const adPlatformLabel = platformAdLabel(videoPlatform);

  // ── Manual start gate ──
  // Bilibili has no playback API → always manual. Niconico may request the
  // manual gate at runtime when its unofficial API is dead (manualFallback).
  const needsManualStart = !!videoPlatform
    && (MANUAL_START_PLATFORMS.includes(videoPlatform) || manualFallback);
  const manualStartPending = needsManualStart && !manualStartConfirmed;

  const confirmManualStart = useCallback(() => {
    setManualStartConfirmed(true);
  }, []);

  const requestManualGate = useCallback(() => {
    setManualFallback(true);
  }, []);

  // Reset the gate state when the song's platform URL changes (new song / round).
  const gateResetKey = platformVideoUrl ?? '';
  const prevGateResetKeyRef = useRef(gateResetKey);
  useEffect(() => {
    if (prevGateResetKeyRef.current !== gateResetKey) {
      prevGateResetKeyRef.current = gateResetKey;
      setManualFallback(false);
      setManualStartConfirmed(false);
    }
  }, [gateResetKey]);

  // Use custom YouTube ID if set, otherwise use song's YouTube ID
  const songYoutubeId = !customActive && videoPlatform === 'youtube' && songPlatformUrl
    ? extractYouTubeId(songPlatformUrl)
    : null;
  const youtubeVideoId = customYoutubeId || songYoutubeId;
  const isYouTube = !!youtubeVideoId;

  // Determine if we should use the streaming player's audio (no separate audio file)
  const usePlatformAudio = videoPlatform !== null && !effectiveSong?.audioUrl;
  const useYouTubeAudio = isYouTube && usePlatformAudio;

  // Handle custom YouTube URL input
  const handleYoutubeUrlSubmit = useCallback((url: string) => {
    const extractedId = extractYouTubeId(url);
    if (extractedId) {
      setCustomYoutubeId(extractedId);
      setShowYoutubeInput(false);
    }
  }, []);

  // Clear custom YouTube video
  const clearCustomYoutube = useCallback(() => {
    setCustomYoutubeId(null);
  }, []);

  // Handle ad detection callbacks
  const handleAdStart = useCallback(() => {
    setIsAdPlaying(true);
    setAdCountdown(MAX_AD_COUNTDOWN_SECONDS);

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
    videoPlatform,
    platformVideoUrl,
    adPlatformLabel,
    usePlatformAudio,
    isAdPlaying,
    adCountdown,
    needsManualStart,
    manualStartPending,
    manualStartConfirmed,
    confirmManualStart,
    requestManualGate,
    handleYoutubeUrlSubmit,
    clearCustomYoutube,
    handleAdStart,
    handleAdEnd,
  };
}
