'use client';

/**
 * DEAD CODE (Code Review #5, 2026-04-17)
 *
 * This file is not imported by any other file in the project.
 *
 * Possible function: YouTube video background player with YouTube IFrame API
 * integration. Supports URL input, ad overlay management, and video looping.
 * Designed to play YouTube music videos as animated backgrounds during gameplay.
 *
 * Currently, YouTube playback for songs is handled by youtube-player.tsx and
 * the useYouTubeGame hook. Background videos use GameBackground.tsx which
 * supports image backgrounds and animated gradients but not YouTube videos.
 *
 * This component provides the missing YouTube background feature — the ability
 * to play the song's music video behind the note highway and lyrics.
 *
 * The AdOverlay and YouTubeUrlInput sub-components are also dead exports.
 *
 * Consider: This would be a popular feature for YouTube-sourced songs.
 * Could be integrated into GameBackground.tsx as an additional background source.
 */

import React, { useEffect, useRef, useState } from 'react';
import type { YTPlayer } from '@/types/youtube';
import { extractYouTubeId } from './youtube-player';

interface YouTubeBackgroundPlayerProps {
  videoId: string;
  videoGap?: number; // Offset in MILLISECONDS
  onReady?: () => void;
  onTimeUpdate?: (currentTime: number) => void;
  onEnded?: () => void;
  onAdStart?: () => void;
  onAdEnd?: () => void;
  isPlaying?: boolean;
  startTime?: number;
  muted?: boolean;
  showControls?: boolean;
}

// Global player counter for unique IDs
let playerCounter = 0;

export function YouTubeBackgroundPlayer({ 
  videoId, 
  videoGap = 0,
  onReady, 
  onTimeUpdate, 
  onEnded,
  onAdStart,
  onAdEnd,
  isPlaying = true,
  startTime = 0,
  muted = false,
  showControls = false
}: YouTubeBackgroundPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const [isApiLoaded, setIsApiLoaded] = useState(false);
  const timeUpdateIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const playerIdRef = useRef<string>(`youtube-bg-player-${++playerCounter}`);
  const adDetectedRef = useRef<boolean>(false);
  const initialVideoIdRef = useRef<string>(videoId);

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
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;
  
  // Load YouTube IFrame API
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
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
      return;
    }
    
    // CRITICAL: Set the callback BEFORE appending the script to prevent a race condition.
    window.onYouTubeIframeAPIReady = () => {
      setIsApiLoaded(true);
    };
    
    // Load the API
    const script = document.createElement('script');
    script.id = 'youtube-iframe-api';
    script.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(script);
    
    // Timeout fallback
    const fallbackTimeout = setTimeout(() => {
      if (!window.YT?.Player) {
        const poll = setInterval(() => {
          if (window.YT?.Player) { clearInterval(poll); setIsApiLoaded(true); }
        }, 200);
        setTimeout(() => clearInterval(poll), 10000);
      }
    }, 10000);
    
    return () => {
      clearTimeout(fallbackTimeout);
      if (timeUpdateIntervalRef.current) {
        clearInterval(timeUpdateIntervalRef.current);
      }
    };
  }, []);
  
  // Initialize player when API is loaded and videoId changes
  // NOTE: Callback props are NOT in the dependency array — they are read via refs.
  useEffect(() => {
    if (!isApiLoaded || !containerRef.current) return;
    
    // Destroy existing player
    if (playerRef.current) {
      playerRef.current.destroy();
      playerRef.current = null;
    }
    
    // Generate new player ID for this video
    playerIdRef.current = `youtube-bg-player-${++playerCounter}`;
    adDetectedRef.current = false;
    initialVideoIdRef.current = videoId;
    
    const videoGapSeconds = videoGap / 1000;
    const adjustedStartTime = Math.max(0, (startTime / 1000) - videoGapSeconds);
    
    // Small delay to ensure DOM is ready
    const initTimeout = setTimeout(() => {
      playerRef.current = new window.YT.Player(playerIdRef.current, {
        videoId,
        playerVars: {
          autoplay: 0,
          controls: showControls ? 1 : 0,
          disablekb: showControls ? 0 : 1,
          fs: 0,
          modestbranding: 1,
          rel: 0,
          start: Math.floor(adjustedStartTime),
          origin: window.location.origin.startsWith('http') ? window.location.origin : undefined,
          playsinline: 1,
          enablejsapi: 1,
        },
        events: {
          onReady: (event) => {
            if (muted) event.target.mute();
            // Auto-play if game already signaled play
            if (isPlayingRef.current) {
              try { event.target.playVideo(); } catch { /* ignore */ }
            }
            onReadyRef.current?.();
          },
          onStateChange: (event) => {
            const state = event.data;
            
            if (!window.YT?.PlayerState) return;
            
            if (state === window.YT.PlayerState.ENDED) {
              onEndedRef.current?.();
            }
            
            // Ad detection: only flag when video ID changes
            if (state === window.YT.PlayerState.PLAYING && playerRef.current) {
              try {
                const videoData = playerRef.current.getVideoData();
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
            
            if (state === window.YT.PlayerState.BUFFERING && adDetectedRef.current) {
              setTimeout(() => {
                if (playerRef.current) {
                  try {
                    const videoData = playerRef.current.getVideoData();
                    if (videoData?.video_id === initialVideoIdRef.current) {
                      adDetectedRef.current = false;
                      onAdEndRef.current?.();
                    }
                  } catch { /* ignore */ }
                }
              }, 500);
            }
          },
          onError: (event) => {
            console.error('[YouTube] Player error:', event.data);
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
  }, [isApiLoaded, videoId, videoGap, startTime, muted, showControls]);
  
  // Handle play/pause
  useEffect(() => {
    if (!playerRef.current) return;
    
    try {
      if (isPlaying) {
        playerRef.current.playVideo();
      } else {
        playerRef.current.pauseVideo();
      }
    } catch (e) {
      // Player not ready
    }
  }, [isPlaying]);
  
  // Handle mute
  useEffect(() => {
    if (!playerRef.current) return;
    
    try {
      if (muted) {
        playerRef.current.mute();
      } else {
        playerRef.current.unMute();
      }
    } catch (e) {
      // Player not ready
    }
  }, [muted]);
  
  return (
    <div ref={containerRef} className="absolute inset-0 w-full h-full overflow-hidden">
      <div 
        id={playerIdRef.current} 
        className="absolute top-1/2 left-1/2 min-w-[100%] min-h-[100%] w-auto h-auto"
        style={{ 
          transform: 'translate(-50%, -50%)',
          pointerEvents: showControls ? 'auto' : 'none'
        }}
      />
    </div>
  );
}

// YouTube URL Input Component
interface YouTubeUrlInputProps {
  onVideoSelect: (videoId: string, title?: string) => void;
  currentVideoId?: string;
  placeholder?: string;
  className?: string;
}

export function YouTubeUrlInput({ onVideoSelect, currentVideoId, placeholder = "YouTube URL or Video ID", className = "" }: YouTubeUrlInputProps) {
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
      
      // Try to get video title from YouTube oEmbed API
      fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`)
        .then(res => res.json())
        .then(data => {
          onVideoSelect(videoId, data.title);
        })
        .catch(() => {
          onVideoSelect(videoId);
        })
        .finally(() => {
          setIsLoading(false);
        });
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

// Ad Overlay Component
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
        <p className="text-white/60 mb-4">
          The game will resume after the ad...
        </p>
        {countdown !== undefined && countdown > 0 && (
          <div className="text-4xl font-bold text-cyan-400">
            {countdown}s
          </div>
        )}
        <div className="mt-4 text-sm text-white/40">
          Please wait or skip the ad on YouTube
        </div>
      </div>
    </div>
  );
}

export default YouTubeBackgroundPlayer;
