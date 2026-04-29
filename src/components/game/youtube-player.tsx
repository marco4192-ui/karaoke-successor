'use client';

import React, { useEffect, useRef, useState } from 'react';
import type { YTPlayer } from '@/types/youtube';

// Extract YouTube video ID from various URL formats
export function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  
  const patterns = [
    // Standard: youtube.com/watch?v=ID, youtu.be/ID, youtube.com/embed/ID, youtube.com/v/ID
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([^&\?\/]+)/,
    // YouTube Shorts: youtube.com/shorts/ID
    /(?:youtube\.com\/shorts\/)([^&\?\/]+)/,
    // YouTube Music: music.youtube.com/watch?v=ID
    /(?:music\.youtube\.com\/watch\?v=)([^&\?\/]+)/,
    // YouTube Live: youtube.com/live/ID
    /(?:youtube\.com\/live\/)([^&\?\/]+)/,
    // Direct video ID (11 chars)
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  
  return null;
}

// Video file extensions supported by HTML5 <video> element
const DIRECT_VIDEO_EXTENSIONS = ['.mp4', '.webm', '.ogg', '.ogv', '.m3u8', '.mpd'];

/**
 * Check if a URL points to a YouTube video.
 * Matches youtube.com, youtu.be, music.youtube.com, and youtube-nocookie.com.
 */
export function isYouTubeUrl(url: string): boolean {
  if (!url) return false;
  const lower = url.toLowerCase();
  return (
    lower.includes('youtube.com') ||
    lower.includes('youtu.be') ||
    lower.includes('youtube-nocookie.com')
  );
}

/**
 * Check if a URL points directly to a video file (MP4, WebM, OGG, etc.).
 * Used to distinguish direct video URLs from YouTube or other platform URLs.
 */
export function isDirectVideoUrl(url: string): boolean {
  if (!url) return false;
  try {
    // Extract the path part of the URL and check the file extension
    const parsed = new URL(url);
    const pathname = parsed.pathname.toLowerCase();
    return DIRECT_VIDEO_EXTENSIONS.some(ext => pathname.endsWith(ext));
  } catch {
    // Not a valid URL — check raw string as fallback
    const lower = url.toLowerCase();
    return DIRECT_VIDEO_EXTENSIONS.some(ext => lower.endsWith(ext));
  }
}

interface YouTubePlayerProps {
  videoId: string;
  videoGap?: number; // Offset in MILLISECONDS (positive = video starts AFTER audio)
  onReady?: () => void;
  onTimeUpdate?: (currentTime: number) => void;
  onEnded?: () => void;
  onAdStart?: () => void;
  onAdEnd?: () => void;
  onError?: (errorCode: number) => void;
  isPlaying?: boolean;
  startTime?: number; // Start position in milliseconds
  interactive?: boolean; // Allow user interaction with the player
}

// Global player counter for unique IDs
let playerCounter = 0;

// YouTube error codes mapped to user-friendly messages
const YOUTUBE_ERROR_MESSAGES: Record<number, string> = {
  2: 'Der Anfrage-Parameter enthält einen ungültigen Wert.',
  5: 'Ein HTML5-spezifischer Fehler ist aufgetreten.',
  100: 'Das Video wurde nicht gefunden. Möglicherweise wurde es gelöscht oder als privat markiert.',
  101: 'Das Video kann nicht eingebettet werden.',
  150: 'Das Video kann nicht eingebettet werden.',
};

export function YouTubePlayer({ 
  videoId, 
  videoGap = 0,
  onReady, 
  onTimeUpdate, 
  onEnded,
  onAdStart,
  onAdEnd,
  onError,
  isPlaying = true,
  startTime = 0,
  interactive = false
}: YouTubePlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const [isApiLoaded, setIsApiLoaded] = useState(false);
  const timeUpdateIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const playerIdRef = useRef<string>(`youtube-player-${++playerCounter}`);
  
  // Store callback props in refs to avoid re-initialization on identity changes
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
  
  // Ad detection refs
  const lastDurationRef = useRef<number>(0);
  const adDetectedRef = useRef<boolean>(false);
  const lastStateRef = useRef<number>(-1);
  const expectedDurationRef = useRef<number>(0);
  const initialVideoIdRef = useRef<string>(videoId);
  
  // Load YouTube IFrame API (once globally)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const cleanupIntervals: ReturnType<typeof setInterval>[] = [];
    
    // Check if API is already loaded
    if (window.YT && window.YT.Player) {
      setIsApiLoaded(true);
      return;
    }
    
    // Check if script is already being loaded
    const existingScript = document.getElementById('youtube-iframe-api');
    if (existingScript) {
      const checkApi = setInterval(() => {
        if (window.YT && window.YT.Player) {
          clearInterval(checkApi);
          setIsApiLoaded(true);
        }
      }, 100);
      cleanupIntervals.push(checkApi);
      return () => { cleanupIntervals.forEach(clearInterval); };
    }
    
    // CRITICAL: Set the callback BEFORE appending the script to prevent a race condition.
    // If the script loads very fast (e.g. from cache), the callback must already be registered.
    window.onYouTubeIframeAPIReady = () => {
      console.log('[YouTube] IFrame API ready');
      setIsApiLoaded(true);
    };
    
    // Load the API
    const script = document.createElement('script');
    script.id = 'youtube-iframe-api';
    script.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(script);

    // Timeout fallback: if the API doesn't load within 10 seconds, try polling
    const fallbackTimeout = setTimeout(() => {
      if (!window.YT?.Player) {
        console.warn('[YouTube] API load timeout — starting polling fallback');
        const poll = setInterval(() => {
          if (window.YT?.Player) {
            clearInterval(poll);
            setIsApiLoaded(true);
          }
        }, 200);
        cleanupIntervals.push(poll);
        // Give up after another 10 seconds
        setTimeout(() => clearInterval(poll), 10000);
      }
    }, 10000);
    
    return () => {
      clearTimeout(fallbackTimeout);
      cleanupIntervals.forEach(clearInterval);
    };
  }, []);
  
  // Initialize player when API is loaded and videoId changes
  // NOTE: Callback props are NOT in the dependency array — they are read via refs
  // to prevent the player from being destroyed and recreated on every parent render.
  useEffect(() => {
    if (!isApiLoaded || !containerRef.current) return;
    
    // Reset ad detection state for new video
    adDetectedRef.current = false;
    lastDurationRef.current = 0;
    initialVideoIdRef.current = videoId;
    
    // Destroy existing player
    if (playerRef.current) {
      playerRef.current.destroy();
      playerRef.current = null;
    }
    
    // Generate new player ID for this video
    playerIdRef.current = `youtube-player-${++playerCounter}`;
    
    // videoGap is in milliseconds, convert to seconds for YouTube API
    const videoGapSeconds = videoGap / 1000;
    const adjustedStartTime = Math.max(0, (startTime / 1000) - videoGapSeconds);
    
    // Determine the origin parameter:
    // In Tauri, window.location.origin may be "tauri://localhost" which YouTube doesn't accept.
    // Use a safe fallback — YouTube doesn't strictly require origin, but it helps with
    // postMessage communication. Omit it in non-standard environments.
    const origin = window.location.origin.startsWith('http') ? window.location.origin : undefined;

    console.log('[YouTube] Creating player:', {
      videoId,
      adjustedStartTime: Math.floor(adjustedStartTime),
      videoGap,
      origin: origin || '(omitted for non-HTTP origin)',
    });
    
    // Small delay to ensure DOM is ready
    const initTimeout = setTimeout(() => {
      // Re-check that the container still exists (component may have unmounted)
      if (!containerRef.current || !document.getElementById(playerIdRef.current)) {
        console.warn('[YouTube] Container disappeared before player init — skipping');
        return;
      }

      playerRef.current = new window.YT.Player(playerIdRef.current, {
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
          // Enable JavaScript API (redundant with IFrame API but ensures compatibility)
          enablejsapi: 1,
        },
        events: {
          onReady: (event) => {
            console.log('[YouTube] Player ready for video:', videoId);
            try {
              expectedDurationRef.current = playerRef.current?.getDuration() || 0;
            } catch { /* ignore */ }
            
            // CRITICAL: If the game already signaled play, start the video now.
            // This fixes the race condition where isPlaying=true fires before
            // the player is ready (e.g. during countdown → play transition).
            if (isPlayingRef.current) {
              try {
                event.target.playVideo();
              } catch { /* ignore */ }
            }
            
            onReadyRef.current?.();
          },
          onStateChange: (event) => {
            const state = event.data;
            lastStateRef.current = state;
            
            if (!window.YT?.PlayerState) return;
            
            if (state === window.YT.PlayerState.ENDED) {
              onEndedRef.current?.();
            }
            
            // Ad detection: only flag when video ID changes (reliable heuristic)
            if (state === window.YT.PlayerState.PLAYING && playerRef.current) {
              try {
                const videoData = playerRef.current.getVideoData();
                
                // Ad detected when the video_id differs from our initial video
                const isAd = videoData?.video_id && videoData.video_id !== initialVideoIdRef.current;
                
                if (isAd && !adDetectedRef.current) {
                  adDetectedRef.current = true;
                  onAdStartRef.current?.();
                } else if (!isAd && adDetectedRef.current) {
                  adDetectedRef.current = false;
                  onAdEndRef.current?.();
                }
              } catch { /* ignore */ }
            }
            
            // Detect ad end when buffering returns to our video
            if (state === window.YT.PlayerState.BUFFERING && adDetectedRef.current) {
              setTimeout(() => {
                if (playerRef.current) {
                  try {
                    const videoData = playerRef.current.getVideoData();
                    if (videoData?.video_id === initialVideoIdRef.current && adDetectedRef.current) {
                      adDetectedRef.current = false;
                      onAdEndRef.current?.();
                    }
                  } catch { /* ignore */ }
                }
              }, 500);
            }
          },
          onError: (event) => {
            const errorCode = event.data as number;
            const message = YOUTUBE_ERROR_MESSAGES[errorCode] || `Unbekannter YouTube-Fehler (Code: ${errorCode})`;
            console.error('[YouTube] Player error:', errorCode, message);
            onErrorRef.current?.(errorCode);
          },
        },
      });
      
      // Start time update interval
      if (timeUpdateIntervalRef.current) {
        clearInterval(timeUpdateIntervalRef.current);
      }
      
      timeUpdateIntervalRef.current = setInterval(() => {
        if (playerRef.current && !adDetectedRef.current) {
          try {
            const currentTime = playerRef.current.getCurrentTime();
            if (typeof currentTime === 'number' && !isNaN(currentTime)) {
              const videoGapSeconds = videoGap / 1000;
              const songTime = (currentTime + videoGapSeconds) * 1000;
              onTimeUpdateRef.current?.(songTime);
            }
          } catch { /* Player not ready yet */ }
        }
      }, 100);
    }, 100);
    
    return () => {
      clearTimeout(initTimeout);
      if (playerRef.current) {
        try { playerRef.current.destroy(); } catch { /* ignore */ }
        playerRef.current = null;
      }
      if (timeUpdateIntervalRef.current) {
        clearInterval(timeUpdateIntervalRef.current);
        timeUpdateIntervalRef.current = null;
      }
    };
  }, [isApiLoaded, videoId, videoGap, startTime, interactive]);
  
  // Handle play/pause (only triggers when isPlaying actually changes)
  useEffect(() => {
    if (!playerRef.current) return;
    
    try {
      if (isPlaying) {
        playerRef.current.playVideo();
      } else {
        playerRef.current.pauseVideo();
      }
    } catch { /* Player not ready */ }
  }, [isPlaying]);
  
  return (
    <div ref={containerRef} className="absolute inset-0 w-full h-full">
      <div 
        id={playerIdRef.current} 
        className="absolute inset-0 w-full h-full"
        style={{ pointerEvents: interactive ? 'auto' : 'none' }}
      />
    </div>
  );
}

export default YouTubePlayer;
