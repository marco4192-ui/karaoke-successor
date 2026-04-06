'use client';

import React, { useEffect, useRef, useState } from 'react';
import type { YTPlayer } from '@/types/youtube';

// Extract YouTube video ID from various URL formats
export function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([^&\?\/]+)/,
    /^([a-zA-Z0-9_-]{11})$/, // Direct video ID
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
  onTimeUpdate?: (currentTime: number) => void;
  onEnded?: () => void;
  onAdStart?: () => void;
  onAdEnd?: () => void;
  isPlaying?: boolean;
  startTime?: number; // Start position in milliseconds
  interactive?: boolean; // Allow user interaction with the player
}

// Global player counter for unique IDs
let playerCounter = 0;

export function YouTubePlayer({ 
  videoId, 
  videoGap = 0,
  onReady, 
  onTimeUpdate, 
  onEnded,
  onAdStart,
  onAdEnd,
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
    
    // Small delay to ensure DOM is ready
    const initTimeout = setTimeout(() => {
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
          origin: window.location.origin,
        },
        events: {
          onReady: (event) => {
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
