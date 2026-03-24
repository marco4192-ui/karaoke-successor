'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
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
  const timeUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const playerIdRef = useRef<string>(`youtube-player-${++playerCounter}`);
  
  // Ad detection refs
  const lastDurationRef = useRef<number>(0);
  const adDetectedRef = useRef<boolean>(false);
  const lastStateRef = useRef<number>(-1);
  const expectedDurationRef = useRef<number>(0);
  const initialVideoIdRef = useRef<string>(videoId);
  
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
  
  // Initialize player when API is loaded and videoId changes
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
    // Positive videoGap: video starts AFTER audio, so video needs to skip ahead
    // Negative videoGap: video starts BEFORE audio, so video starts later relative to audio
    const videoGapSeconds = videoGap / 1000;
    const adjustedStartTime = Math.max(0, (startTime / 1000) - videoGapSeconds);
    
    // Small delay to ensure DOM is ready
    const initTimeout = setTimeout(() => {
      playerRef.current = new window.YT.Player(playerIdRef.current, {
        videoId,
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          modestbranding: 1,
          rel: 0,
          start: Math.floor(adjustedStartTime),
          origin: window.location.origin,
        },
        events: {
          onReady: () => {
            try {
              expectedDurationRef.current = playerRef.current?.getDuration() || 0;
            } catch { /* ignore */ }
            onReady?.();
          },
          onStateChange: (event) => {
            const state = event.data;
            lastStateRef.current = state;
            
            if (state === window.YT.PlayerState.ENDED) {
              onEnded?.();
            }
            
            // Ad detection: Check if video duration changed unexpectedly
            if (state === window.YT.PlayerState.PLAYING && playerRef.current) {
              try {
                const currentDuration = playerRef.current.getDuration();
                const currentTime = playerRef.current.getCurrentTime();
                const videoData = playerRef.current.getVideoData();
                
                // Ad detection heuristics:
                // 1. Duration is much shorter than expected (ads are usually short)
                // 2. Video ID changed (ad video vs main video)
                // 3. Current time is near start with very short duration
                
                const isAd = (
                  (currentDuration < 60 && currentTime < 10) ||
                  (videoData?.video_id && videoData.video_id !== initialVideoIdRef.current) ||
                  (lastDurationRef.current > 0 && Math.abs(currentDuration - lastDurationRef.current) > 30)
                );
                
                if (isAd && !adDetectedRef.current) {
                  adDetectedRef.current = true;
                  onAdStart?.();
                } else if (!isAd && adDetectedRef.current) {
                  adDetectedRef.current = false;
                  onAdEnd?.();
                }
                
                lastDurationRef.current = currentDuration;
              } catch { /* ignore */ }
            }
            
            // Also detect ad end on buffering after ad
            if (state === window.YT.PlayerState.BUFFERING && adDetectedRef.current) {
              setTimeout(() => {
                if (playerRef.current) {
                  try {
                    const currentDuration = playerRef.current.getDuration();
                    const videoData = playerRef.current.getVideoData();
                    
                    if (videoData?.video_id === initialVideoIdRef.current && 
                        currentDuration > 60 && adDetectedRef.current) {
                      adDetectedRef.current = false;
                      onAdEnd?.();
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
        if (playerRef.current && onTimeUpdate && !adDetectedRef.current) {
          try {
            const currentTime = playerRef.current.getCurrentTime();
            if (typeof currentTime === 'number' && !isNaN(currentTime)) {
              // Convert video time to audio/song time
              // songTime = videoTime + videoGap
              // If videoGap > 0: video started after audio, so song time is ahead of video
              // If videoGap < 0: video started before audio, so song time is behind video
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
  }, [isApiLoaded, videoId, videoGap, onReady, onTimeUpdate, onEnded, onAdStart, onAdEnd, startTime]);
  
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
