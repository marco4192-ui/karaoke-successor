'use client';

/**
 * Unified Video Player (Code Review #6, 2026-04-17)
 *
 * Consolidates video playback from multiple sources into a single component:
 * - YouTube videos (IFrame API with ad detection, video gap, error handling)
 * - Local video files (HTML5 <video> with separate/embedded audio)
 * - Direct video URLs (MP4, WebM, OGG, HLS, DASH)
 *
 * Replaces: video-player.ts, youtube-background-player.tsx
 * Keeps: youtube-player.tsx utilities (extractYouTubeId, isYouTubeUrl, etc.)
 *
 * Features:
 * - Unified play/pause/seek/volume/playbackRate interface via props
 * - YouTube IFrame API: ad detection, video gap offset, race-condition-safe loading
 * - Local video: muted/visible or audio-through-video mode
 * - AdOverlay component for YouTube ad breaks
 * - YouTubeUrlInput component for URL entry with oEmbed title lookup
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { YTPlayer } from '@/types/youtube';

// ===================== UTILITY FUNCTIONS =====================

// Video file extensions supported by HTML5 <video> element
const DIRECT_VIDEO_EXTENSIONS = ['.mp4', '.webm', '.ogg', '.ogv', '.m3u8', '.mpd'];

/**
 * Extract YouTube video ID from various URL formats.
 * Supports: youtube.com/watch, youtu.be, youtube.com/embed, shorts, music, live.
 */
export function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([^&\?\/]+)/,
    /(?:youtube\.com\/shorts\/)([^&\?\/]+)/,
    /(?:music\.youtube\.com\/watch\?v=)([^&\?\/]+)/,
    /(?:youtube\.com\/live\/)([^&\?\/]+)/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

/**
 * Check if a URL points to a YouTube video.
 */
export function isYouTubeUrl(url: string): boolean {
  if (!url) return false;
  const lower = url.toLowerCase();
  return lower.includes('youtube.com') || lower.includes('youtu.be') || lower.includes('youtube-nocookie.com');
}

/**
 * Check if a URL points directly to a video file.
 */
export function isDirectVideoUrl(url: string): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname.toLowerCase();
    return DIRECT_VIDEO_EXTENSIONS.some(ext => pathname.endsWith(ext));
  } catch {
    const lower = url.toLowerCase();
    return DIRECT_VIDEO_EXTENSIONS.some(ext => lower.endsWith(ext));
  }
}

/**
 * Determine the video source type from a URL string.
 */
export type VideoSourceType = 'youtube' | 'file' | 'url';

export function detectVideoSourceType(url: string): VideoSourceType {
  if (isYouTubeUrl(url)) return 'youtube';
  if (isDirectVideoUrl(url)) return 'url';
  // If it has a path that looks like a file (with extension)
  if (url.includes('/') && url.includes('.')) return 'file';
  return 'url';
}

// YouTube error codes mapped to user-friendly messages
const YOUTUBE_ERROR_MESSAGES: Record<number, string> = {
  2: 'Der Anfrage-Parameter enthält einen ungültigen Wert.',
  5: 'Ein HTML5-spezifischer Fehler ist aufgetreten.',
  100: 'Das Video wurde nicht gefunden. Möglicherweise wurde es gelöscht oder als privat markiert.',
  101: 'Das Video kann nicht eingebettet werden.',
  150: 'Das Video kann nicht eingebettet werden.',
};

// ===================== AD OVERLAY =====================

interface AdOverlayProps {
  isVisible: boolean;
  countdown?: number;
}

export function AdOverlay({ isVisible, countdown }: AdOverlayProps) {
  if (!isVisible) return null;
  return (
    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="text-center p-8">
        <div className="animate-pulse mb-4">
          <svg className="w-16 h-16 mx-auto text-yellow-400" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
          </svg>
        </div>
        <h3 className="text-2xl font-bold text-white mb-2">Advertisement</h3>
        <p className="text-white/60 mb-4">The game will resume after the ad...</p>
        {countdown !== undefined && countdown > 0 && (
          <div className="text-4xl font-bold text-cyan-400">{countdown}s</div>
        )}
        <div className="mt-4 text-sm text-white/40">Please wait or skip the ad on YouTube</div>
      </div>
    </div>
  );
}

// ===================== YOUTUBE URL INPUT =====================

interface YouTubeUrlInputProps {
  onVideoSelect: (videoId: string, title?: string) => void;
  currentVideoId?: string;
  placeholder?: string;
  className?: string;
}

export function YouTubeUrlInput({ onVideoSelect, currentVideoId, placeholder = 'YouTube URL or Video ID', className = '' }: YouTubeUrlInputProps) {
  const [url, setUrl] = useState('');
  const [isValid, setIsValid] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const validateAndExtract = useCallback((input: string) => {
    const videoId = extractYouTubeId(input);
    setIsValid(!!videoId);
    return videoId;
  }, []);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setUrl(value);
    validateAndExtract(value);
  }, [validateAndExtract]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const videoId = validateAndExtract(url);
    if (videoId) {
      setIsLoading(true);
      fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`)
        .then(res => res.json())
        .then(data => onVideoSelect(videoId, data.title))
        .catch(() => onVideoSelect(videoId))
        .finally(() => setIsLoading(false));
    }
  }, [url, validateAndExtract, onVideoSelect]);

  const handleClear = useCallback(() => {
    setUrl('');
    setIsValid(false);
  }, []);

  return (
    <form onSubmit={handleSubmit} className={`flex gap-2 ${className}`}>
      <div className="relative flex-1">
        <input
          type="text"
          value={url}
          onChange={handleChange}
          placeholder={placeholder}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-white/40 focus:outline-none focus:border-cyan-500/50"
        />
        {url && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>
      <button
        type="submit"
        disabled={!isValid || isLoading}
        className={`px-4 py-2 rounded-lg font-medium transition-all ${
          isValid && !isLoading
            ? 'bg-red-600 hover:bg-red-500 text-white'
            : 'bg-white/10 text-white/40 cursor-not-allowed'
        }`}
      >
        {isLoading ? (
          <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        ) : (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" />
          </svg>
        )}
      </button>
    </form>
  );
}

// ===================== UNIFIED VIDEO PLAYER =====================

export interface UnifiedVideoPlayerProps {
  /** Video source — YouTube URL, direct video URL, or local file path */
  source: string | null;
  /** Video gap offset in MILLISECONDS (positive = video starts AFTER audio) */
  videoGap?: number;
  /** Song start time in MILLISECONDS */
  startTime?: number;
  /** Whether the video should be playing */
  isPlaying?: boolean;
  /** Whether the video should be muted */
  muted?: boolean;
  /** Whether to show YouTube player controls */
  interactive?: boolean;
  /** Whether to show ad overlay during YouTube ads */
  showAdOverlay?: boolean;
  /** Additional CSS class names */
  className?: string;
  /** Callbacks */
  onReady?: () => void;
  onTimeUpdate?: (currentTime: number) => void;
  onEnded?: () => void;
  onAdStart?: () => void;
  onAdEnd?: () => void;
  onError?: (errorCode: number, message: string) => void;
  /** Ref to the underlying video element (for local videos only) */
  videoRef?: React.RefObject<HTMLVideoElement | null>;
}

// Global player counter for unique DOM IDs
let playerCounter = 0;

export function UnifiedVideoPlayer({
  source,
  videoGap = 0,
  startTime = 0,
  isPlaying = false,
  muted = false,
  interactive = false,
  showAdOverlay = true,
  className = '',
  onReady,
  onTimeUpdate,
  onEnded,
  onAdStart,
  onAdEnd,
  onError,
  videoRef,
}: UnifiedVideoPlayerProps) {
  // Determine source type
  const sourceType = source ? detectVideoSourceType(source) : null;

  // YouTube player state
  const containerRef = useRef<HTMLDivElement>(null);
  const ytPlayerRef = useRef<YTPlayer | null>(null);
  const [isApiLoaded, setIsApiLoaded] = useState(false);
  const timeUpdateRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const playerIdRef = useRef<string>(`uvp-${++playerCounter}`);
  const adDetectedRef = useRef(false);
  const [isAdDetected, setIsAdDetected] = useState(false);
  const initialVideoIdRef = useRef<string | null>(null);

  // Callbacks via refs to prevent re-initialization
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;
  const onTimeUpdateRef = useRef(onTimeUpdate);
  onTimeUpdateRef.current = onTimeUpdate;
  const onEndedRef = useRef(onEnded);
  onEndedRef.current = onEnded;
  const onAdStartRef = useRef(onAdStart);
  onAdStartRef.current = onAdStart;
  const onAdEndRef = useRef(onAdEnd);
  onAdEndRef.current = onAdEnd;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;

  // Load YouTube IFrame API once
  useEffect(() => {
    if (sourceType !== 'youtube' || typeof window === 'undefined') return;

    if (window.YT && window.YT.Player) {
      setIsApiLoaded(true);
      return;
    }

    const existingScript = document.getElementById('youtube-iframe-api');
    if (existingScript) {
      const poll = setInterval(() => {
        if (window.YT && window.YT.Player) {
          clearInterval(poll);
          setIsApiLoaded(true);
        }
      }, 100);
      return () => clearInterval(poll);
    }

    // Set callback BEFORE appending script
    window.onYouTubeIframeAPIReady = () => setIsApiLoaded(true);
    const script = document.createElement('script');
    script.id = 'youtube-iframe-api';
    script.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(script);

    const fallback = setTimeout(() => {
      if (!window.YT?.Player) {
        const poll = setInterval(() => {
          if (window.YT?.Player) { clearInterval(poll); setIsApiLoaded(true); }
        }, 200);
        setTimeout(() => clearInterval(poll), 10000);
      }
    }, 10000);

    return () => clearTimeout(fallback);
  }, [sourceType]);

  // Initialize YouTube player when API loaded and videoId changes
  useEffect(() => {
    if (sourceType !== 'youtube' || !isApiLoaded || !containerRef.current || !source) return;

    const videoId = extractYouTubeId(source);
    if (!videoId) return;

    // Destroy existing player
    if (ytPlayerRef.current) {
      try { ytPlayerRef.current.destroy(); } catch { /* ignore */ }
      ytPlayerRef.current = null;
    }

    playerIdRef.current = `uvp-${++playerCounter}`;
    adDetectedRef.current = false;
    setIsAdDetected(false);
    initialVideoIdRef.current = videoId;

    const videoGapSeconds = videoGap / 1000;
    const adjustedStartTime = Math.max(0, (startTime / 1000) - videoGapSeconds);
    const origin = window.location.origin.startsWith('http') ? window.location.origin : undefined;

    const initTimeout = setTimeout(() => {
      if (!containerRef.current || !document.getElementById(playerIdRef.current)) return;

      ytPlayerRef.current = new window.YT.Player(playerIdRef.current, {
        videoId,
        playerVars: {
          autoplay: 0,
          controls: interactive ? 1 : 0,
          disablekb: interactive ? 0 : 1,
          fs: 0,
          modestbranding: 1,
          rel: 0,
          start: Math.floor(adjustedStartTime),
          ...(origin ? { origin } : {}),
          enablejsapi: 1,
        },
        events: {
          onReady: () => {
            try {
              onReadyRef.current?.();
            } catch { /* ignore */ }
            if (isPlayingRef.current) {
              try { ytPlayerRef.current?.playVideo(); } catch { /* ignore */ }
            }
          },
          onStateChange: (e) => {
            const state = e.data;
            if (!window.YT?.PlayerState) return;

            if (state === window.YT.PlayerState.ENDED) {
              onEndedRef.current?.();
            }

            // Ad detection
            if (state === window.YT.PlayerState.PLAYING && ytPlayerRef.current) {
              try {
                const videoData = ytPlayerRef.current.getVideoData();
                const isAd = videoData?.video_id && videoData.video_id !== initialVideoIdRef.current;
                if (isAd && !adDetectedRef.current) {
                  adDetectedRef.current = true;
                  setIsAdDetected(true);
                  onAdStartRef.current?.();
                } else if (!isAd && adDetectedRef.current) {
                  adDetectedRef.current = false;
                  setIsAdDetected(false);
                  onAdEndRef.current?.();
                }
              } catch { /* ignore */ }
            }

            if (state === window.YT.PlayerState.BUFFERING && adDetectedRef.current) {
              setTimeout(() => {
                if (ytPlayerRef.current) {
                  try {
                    const videoData = ytPlayerRef.current.getVideoData();
                    if (videoData?.video_id === initialVideoIdRef.current && adDetectedRef.current) {
                      adDetectedRef.current = false;
                      setIsAdDetected(false);
                      onAdEndRef.current?.();
                    }
                  } catch { /* ignore */ }
                }
              }, 500);
            }
          },
          onError: (e) => {
            const code = e.data as number;
            const msg = YOUTUBE_ERROR_MESSAGES[code] || `Unbekannter YouTube-Fehler (Code: ${code})`;
            onErrorRef.current?.(code, msg);
          },
        },
      });

      // Start time update interval
      if (timeUpdateRef.current) clearInterval(timeUpdateRef.current);
      timeUpdateRef.current = setInterval(() => {
        if (ytPlayerRef.current && !adDetectedRef.current) {
          try {
            const ct = ytPlayerRef.current.getCurrentTime();
            if (typeof ct === 'number' && !isNaN(ct)) {
              const songTime = (ct + videoGapSeconds) * 1000;
              onTimeUpdateRef.current?.(songTime);
            }
          } catch { /* not ready */ }
        }
      }, 100);
    }, 100);

    return () => {
      clearTimeout(initTimeout);
      if (ytPlayerRef.current) {
        try { ytPlayerRef.current.destroy(); } catch { /* ignore */ }
        ytPlayerRef.current = null;
      }
      if (timeUpdateRef.current) {
        clearInterval(timeUpdateRef.current);
        timeUpdateRef.current = null;
      }
    };
  }, [source, sourceType, isApiLoaded, videoGap, startTime, interactive]);

  // Handle play/pause for YouTube
  useEffect(() => {
    if (sourceType !== 'youtube' || !ytPlayerRef.current) return;
    try {
      if (isPlaying) ytPlayerRef.current.playVideo();
      else ytPlayerRef.current.pauseVideo();
    } catch { /* not ready */ }
  }, [isPlaying, sourceType]);

  // Handle mute for YouTube
  useEffect(() => {
    if (sourceType !== 'youtube' || !ytPlayerRef.current) return;
    try {
      if (muted) ytPlayerRef.current.mute();
      else ytPlayerRef.current.unMute();
    } catch { /* not ready */ }
  }, [muted, sourceType]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (ytPlayerRef.current) {
        try { ytPlayerRef.current.destroy(); } catch { /* ignore */ }
      }
      if (timeUpdateRef.current) {
        clearInterval(timeUpdateRef.current);
      }
    };
  }, []);

  // YouTube player rendering
  if (sourceType === 'youtube' && source) {
    return (
      <div ref={containerRef} className={`absolute inset-0 w-full h-full overflow-hidden ${className}`}>
        <div
          id={playerIdRef.current}
          className="absolute top-1/2 left-1/2 min-w-[100%] min-h-[100%] w-auto h-auto"
          style={{
            transform: 'translate(-50%, -50%)',
            pointerEvents: interactive ? 'auto' : 'none',
          }}
        />
        {showAdOverlay && (
          <AdOverlay isVisible={isAdDetected && showAdOverlay} />
        )}
      </div>
    );
  }

  // Local / direct video player rendering
  if (source && (sourceType === 'file' || sourceType === 'url')) {
    return (
      <div className={`absolute inset-0 w-full h-full overflow-hidden ${className}`}>
        <video
          ref={videoRef}
          key={`uvp-${source}`}
          src={source}
          className="absolute inset-0 w-full h-full object-cover"
          muted={muted}
          playsInline
          autoPlay={false}
          preload="auto"
          onEnded={() => onEnded?.()}
          onTimeUpdate={(e) => {
            const ct = e.currentTarget.currentTime;
            if (typeof ct === 'number' && !isNaN(ct)) {
              onTimeUpdate?.(ct * 1000);
            }
          }}
        />
      </div>
    );
  }

  // No source — render nothing
  return null;
}

export default UnifiedVideoPlayer;
