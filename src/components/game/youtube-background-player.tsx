'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { YTPlayer } from '@/types/youtube';
import { extractYouTubeId } from './youtube-player';
import { logger } from '@/lib/logger';

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
  const timeUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const playerIdRef = useRef<string>(`youtube-bg-player-${++playerCounter}`);
  const lastStateRef = useRef<number>(-1);
  const adDetectedRef = useRef<boolean>(false);
  const wasPlayingBeforeAdRef = useRef<boolean>(false);
  
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
    
    // Load the API
    const script = document.createElement('script');
    script.id = 'youtube-iframe-api';
    script.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(script);
    
    window.onYouTubeIframeAPIReady = () => {
      setIsApiLoaded(true);
    };
    
    return () => {
      if (timeUpdateIntervalRef.current) {
        clearInterval(timeUpdateIntervalRef.current);
      }
    };
  }, []);
  
  // Detect ads based on player state anomalies
  const detectAd = useCallback((player: YTPlayer) => {
    try {
      const currentTime = player.getCurrentTime();
      const duration = player.getDuration();
      const state = player.getPlayerState();
      
      // Ad detection heuristics:
      // 1. If video duration suddenly changes (ads are usually short)
      // 2. If we're playing but time is not advancing normally
      // 3. If video data changes (ad video vs main video)
      
      // Check if current time is valid
      if (currentTime > 0 && duration > 0) {
        // If video is playing but time is near start with short duration, likely an ad
        if (state === window.YT.PlayerState.PLAYING && duration < 60 && currentTime < 5) {
          return true;
        }
      }
      
      return false;
    } catch {
      return false;
    }
  }, []);
  
  // Initialize player when API is loaded and videoId changes
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
          origin: window.location.origin,
          playsinline: 1,
        },
        events: {
          onReady: (event) => {
            logger.debug('[YouTube]', 'Player ready');
            if (muted) {
              event.target.mute();
            }
            onReady?.();
          },
          onStateChange: (event) => {
            const state = event.data;
            const prevState = lastStateRef.current;
            lastStateRef.current = state;
            
            logger.debug('[YouTube]', 'State changed:', {
              state,
              prevState,
              stateName: state === -1 ? 'UNSTARTED' : 
                         state === 0 ? 'ENDED' :
                         state === 1 ? 'PLAYING' :
                         state === 2 ? 'PAUSED' :
                         state === 3 ? 'BUFFERING' :
                         state === 5 ? 'CUED' : 'UNKNOWN'
            });
            
            // Ad detection logic
            if (state === window.YT.PlayerState.PLAYING) {
              const player = event.target;
              
              // Check for ad
              const isAdPlaying = detectAd(player);
              
              if (isAdPlaying && !adDetectedRef.current) {
                logger.info('[YouTube]', 'Ad detected!');
                adDetectedRef.current = true;
                wasPlayingBeforeAdRef.current = true;
                onAdStart?.();
              } else if (!isAdPlaying && adDetectedRef.current) {
                logger.info('[YouTube]', 'Ad ended, resuming');
                adDetectedRef.current = false;
                onAdEnd?.();
              }
            }
            
            if (state === window.YT.PlayerState.ENDED) {
              onEnded?.();
            }
          },
          onError: (event) => {
            logger.error('[YouTube]', 'Player error:', event.data);
          },
        },
      });
      
      // Start time update interval
      if (timeUpdateIntervalRef.current) {
        clearInterval(timeUpdateIntervalRef.current);
      }
      
      timeUpdateIntervalRef.current = setInterval(() => {
        if (playerRef.current && onTimeUpdate) {
          try {
            const currentTime = playerRef.current.getCurrentTime();
            if (typeof currentTime === 'number' && !isNaN(currentTime)) {
              const videoGapSeconds = videoGap / 1000;
              const songTime = (currentTime + videoGapSeconds) * 1000;
              onTimeUpdate(songTime);
            }
          } catch (e) {
            // Player not ready yet
          }
        }
      }, 100);
    }, 100);
    
    return () => {
      clearTimeout(initTimeout);
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch (e) {
          // Ignore destroy errors
        }
        playerRef.current = null;
      }
      if (timeUpdateIntervalRef.current) {
        clearInterval(timeUpdateIntervalRef.current);
      }
    };
  }, [isApiLoaded, videoId, videoGap, onReady, onTimeUpdate, onEnded, onAdStart, onAdEnd, startTime, muted, showControls, detectAd]);
  
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
