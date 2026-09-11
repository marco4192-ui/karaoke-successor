'use client';

import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import type { YTPlayer } from '@/types/youtube';
export { isYouTubeUrl } from '@/lib/url-utils';

// Extract YouTube video ID from various URL formats
export function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  
  const patterns = [
    // Standard: youtube.com/watch?v=ID, youtu.be/ID, youtube.com/embed/ID, youtube.com/v/ID
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([^&?\/]+)/, // eslint-disable-line no-useless-escape
    // YouTube Shorts: youtube.com/shorts/ID
    /(?:youtube\.com\/shorts\/)([^&?\/]+)/, // eslint-disable-line no-useless-escape
    // YouTube Music: music.youtube.com/watch?v=ID
    /(?:music\.youtube\.com\/watch\?v=)([^&?\/]+)/, // eslint-disable-line no-useless-escape
    // YouTube Live: youtube.com/live/ID
    /(?:youtube\.com\/live\/)([^&?\/]+)/, // eslint-disable-line no-useless-escape
    // Direct video ID (11 chars)
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  
  return null;
}

interface YouTubePlayerProps {
  videoId: string;
  videoGap?: number; // Offset in MILLISECONDS (positive = video starts AFTER audio)
  onReady?: () => void;
  onTimeUpdate?: (_currentTime: number) => void;
  onEnded?: () => void;
  onAdStart?: () => void;
  onAdEnd?: () => void;
  onError?: (_errorCode: number) => void;
  isPlaying?: boolean;
  startTime?: number; // Start position in milliseconds
  interactive?: boolean; // Allow user interaction with the player
  muted?: boolean; // Audio muted (e.g. when a separate audio track is the master)
  /** Playback volume 0..1 — applied when defined (jukebox). Undefined = player default. */
  volume?: number;
  /** Reports the video duration in SECONDS once it is known (jukebox progress bar). */
  onDuration?: (_seconds: number) => void;
}

/** Imperative handle for parents that need to drive the player directly
 *  (e.g. the editor's video sync overlay seeking while paused). */
export interface YouTubePlayerHandle {
  /** Seek to a VIDEO time position in seconds (not song time). */
  seekTo: (_seconds: number) => void;
  /** Current VIDEO time position in seconds (0 when the player is not ready). */
  getCurrentTime: () => number;
}

// YouTube error codes mapped to user-friendly messages
const YOUTUBE_ERROR_MESSAGES: Record<number, string> = {
  2: 'Der Anfrage-Parameter enthält einen ungültigen Wert.',
  5: 'Ein HTML5-spezifischer Fehler ist aufgetreten.',
  100: 'Das Video wurde nicht gefunden. Möglicherweise wurde es gelöscht oder als privat markiert.',
  101: 'Das Video kann nicht eingebettet werden.',
  150: 'Das Video kann nicht eingebettet werden.',
  1001: 'Die YouTube-API konnte nicht geladen werden (Netzwerk- oder Werbeblocker?).',
};

/** Synthetic error code: the IFrame API script never became available. */
export const YT_ERROR_API_UNAVAILABLE = 1001;

/** Report the "API not loadable" failure at most once per page (multiple
 *  player instances share the same script element). */
let apiLoadFailureReported = false;

// Timing for the API-load fallback ladder (see the script-load effect):
// after 8 s start polling; if the API is still absent 6 s later, report.
const API_LOAD_FALLBACK_MS = 8000;
const API_LOAD_GIVE_UP_MS = 6000;

export const YouTubePlayer = forwardRef<YouTubePlayerHandle, YouTubePlayerProps>(function YouTubePlayer({ 
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
  interactive = false,
  muted = false,
  volume,
  onDuration,
}, ref) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const [isApiLoaded, setIsApiLoaded] = useState(false);
  const timeUpdateIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
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
  const mutedRef = useRef(muted);
  mutedRef.current = muted;
  const volumeRef = useRef(volume);
  volumeRef.current = volume;
  const onDurationRef = useRef(onDuration);
  onDurationRef.current = onDuration;
  
  // ── Imperative handle: external seek + time queries ──
  // Used by the editor's video sync overlay. Does NOT re-create the player.
  useImperativeHandle(ref, () => ({
    seekTo: (seconds: number) => {
      const p = playerRef.current;
      if (!p || !isFinite(seconds)) return;
      try { p.seekTo(Math.max(0, seconds), true); } catch { /* Player not ready */ }
    },
    getCurrentTime: () => {
      try {
        const t = playerRef.current?.getCurrentTime();
        return typeof t === 'number' && isFinite(t) ? t : 0;
      } catch { return 0; }
    },
  }), []);
  
  // Ad detection refs
  const lastDurationRef = useRef<number>(0);
  const adDetectedRef = useRef<boolean>(false);
  const lastStateRef = useRef<number>(-1);
  const expectedDurationRef = useRef<number>(0);
  const initialVideoIdRef = useRef<string>(videoId);
  const adEndTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Load YouTube IFrame API (once globally)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const cleanupIntervals: ReturnType<typeof setInterval>[] = [];
    const cleanupTimeouts: ReturnType<typeof setTimeout>[] = [];
    
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
      // Give-up: a script that never loads (network error / blocker) previously
      // meant a SILENT black screen forever — report it once so hosts (jukebox:
      // auto-skip) can react.
      const giveUp = setTimeout(() => {
        if (!window.YT?.Player) {
          clearInterval(checkApi);
          if (!apiLoadFailureReported) {
            apiLoadFailureReported = true;
            onErrorRef.current?.(YT_ERROR_API_UNAVAILABLE);
          }
        }
      }, API_LOAD_FALLBACK_MS + API_LOAD_GIVE_UP_MS);
      cleanupTimeouts.push(giveUp);
      return () => { cleanupIntervals.forEach(clearInterval); cleanupTimeouts.forEach(clearTimeout); };
    }
    
    // CRITICAL: Set the callback BEFORE appending the script to prevent a race condition.
    // If the script loads very fast (e.g. from cache), the callback must already be registered.
    window.onYouTubeIframeAPIReady = () => {
      setIsApiLoaded(true);
    };
    
    // Load the API
    const script = document.createElement('script');
    script.id = 'youtube-iframe-api';
    script.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(script);

    // Backstop poll: the global callback can be overwritten by another
    // YouTubePlayer instance that mounts before the script finishes loading —
    // this poll guarantees every instance flips its own isApiLoaded.
    const quickPoll = setInterval(() => {
      if (window.YT?.Player) {
        clearInterval(quickPoll);
        setIsApiLoaded(true);
      }
    }, 100);
    cleanupIntervals.push(quickPoll);

    // Timeout fallback: if the API doesn't load within 8 seconds, keep polling
    // (up to 6 more seconds) — and when it never appears, report the failure
    // once so the app does not hang on a silent black screen.
    const fallbackTimeout = setTimeout(() => {
      if (!window.YT?.Player) {
        // eslint-disable-next-line no-console
        console.warn('[YouTube] API load timeout — starting polling fallback');
        const poll = setInterval(() => {
          if (window.YT?.Player) {
            clearInterval(poll);
            setIsApiLoaded(true);
          }
        }, 200);
        cleanupIntervals.push(poll);
        const giveUpTimeout = setTimeout(() => {
          if (!window.YT?.Player) {
            clearInterval(poll);
            if (!apiLoadFailureReported) {
              apiLoadFailureReported = true;
              // eslint-disable-next-line no-console
              console.warn('[YouTube] API unavailable — reporting error', YT_ERROR_API_UNAVAILABLE);
              onErrorRef.current?.(YT_ERROR_API_UNAVAILABLE);
            }
          }
        }, API_LOAD_GIVE_UP_MS);
        cleanupTimeouts.push(giveUpTimeout);
      }
    }, API_LOAD_FALLBACK_MS);
    
    return () => {
      clearTimeout(fallbackTimeout);
      cleanupIntervals.forEach(clearInterval);
      cleanupTimeouts.forEach(clearTimeout);
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
    
    // videoGap is in milliseconds, convert to seconds for YouTube API
    const videoGapSeconds = videoGap / 1000;
    const adjustedStartTime = Math.max(0, (startTime / 1000) - videoGapSeconds);
    
    // Determine the origin parameter:
    // In Tauri, window.location.origin may be "tauri://localhost" which YouTube doesn't accept.
    // Use a safe fallback — YouTube doesn't strictly require origin, but it helps with
    // postMessage communication. Omit it in non-standard environments.
    const origin = window.location.origin.startsWith('http') ? window.location.origin : undefined;

    // Small delay to ensure DOM is ready
    const initTimeout = setTimeout(() => {
      const host = containerRef.current;
      if (!host || !host.isConnected) {
        // eslint-disable-next-line no-console
        console.warn('[YouTube] Container disappeared before player init — skipping');
        return;
      }

      // DETERMINISTIC MOUNT: create a FRESH div inside the host for this player
      // instance. The IFrame API replaces that div with its iframe, so the
      // element must exist in the DOM at construction time — independent of
      // React re-renders.
      // (The previous id-based approach raced React's render cycle: the effect
      // generated a NEW id after render, and when no re-render happened within
      // the 100 ms window the id was absent from the DOM — the player was
      // silently never created → black screen without any error, e.g. for
      // jukebox video breaks where no 60 fps game loop forces re-renders.)
      host.replaceChildren();
      const mountEl = document.createElement('div');
      mountEl.className = 'absolute inset-0 w-full h-full';
      host.appendChild(mountEl);

      playerRef.current = new window.YT.Player(mountEl, {
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
        // Double assertion needed: YT.PlayerOptions.playerVars uses a branded type
        // that only accepts specific string keys, but the YouTube IFrame API actually
        // accepts arbitrary key-value pairs for player variables.
        } as unknown as Record<string, number>,
        events: {
          onReady: (event) => {
            try {
              expectedDurationRef.current = playerRef.current?.getDuration() || 0;
              if (expectedDurationRef.current > 0) {
                onDurationRef.current?.(expectedDurationRef.current);
              }
            } catch { /* ignore */ }
            
            // CRITICAL: If the game already signaled play, start the video now.
            // This fixes the race condition where isPlaying=true fires before
            // the player is ready (e.g. during countdown → play transition).
            if (isPlayingRef.current) {
              try {
                event.target.playVideo();
              } catch { /* ignore */ }
            }

            // Respect the muted flag once the player becomes ready
            try {
              if (mutedRef.current) event.target.mute();
              else event.target.unMute();
            } catch { /* ignore */ }

            // Apply an explicit volume when provided (jukebox)
            if (volumeRef.current !== undefined) {
              try { event.target.setVolume(Math.round(Math.min(1, Math.max(0, volumeRef.current)) * 100)); } catch { /* ignore */ }
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
              if (adEndTimerRef.current) clearTimeout(adEndTimerRef.current);
              adEndTimerRef.current = setTimeout(() => {
                adEndTimerRef.current = null;
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
            // eslint-disable-next-line no-console
            console.error('[YouTube] Player error:', message);
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
            // Report the duration once it becomes available (jukebox progress)
            const dur = playerRef.current.getDuration();
            if (typeof dur === 'number' && isFinite(dur) && dur > 0 && dur !== expectedDurationRef.current) {
              expectedDurationRef.current = dur;
              onDurationRef.current?.(dur);
            }
          } catch { /* Player not ready yet */ }
        }
      }, 100);
    }, 100);
    
    return () => {
      clearTimeout(initTimeout);
      if (adEndTimerRef.current) {
        clearTimeout(adEndTimerRef.current);
        adEndTimerRef.current = null;
      }
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

  // Handle mute changes without re-creating the player
  useEffect(() => {
    if (!playerRef.current) return;

    try {
      if (muted) playerRef.current.mute();
      else playerRef.current.unMute();
    } catch { /* Player not ready */ }
  }, [muted]);
  
  // Handle volume changes without re-creating the player (jukebox)
  useEffect(() => {
    if (volume === undefined || !playerRef.current) return;
    try {
      playerRef.current.setVolume(Math.round(Math.min(1, Math.max(0, volume)) * 100));
    } catch { /* Player not ready */ }
  }, [volume]);
  
  return (
    // The player iframe is mounted imperatively inside this container (see the
    // init effect). pointer-events is an inherited CSS property, so toggling
    // interactivity here covers the iframe without re-creating the player.
    <div
      ref={containerRef}
      className="absolute inset-0 w-full h-full"
      style={{ pointerEvents: interactive ? 'auto' : 'none' }}
    />
  );
});

export default YouTubePlayer;
