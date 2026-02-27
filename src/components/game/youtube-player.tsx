'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';

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
  videoGap?: number; // Offset in seconds (positive = video starts after audio)
  onReady?: () => void;
  onTimeUpdate?: (currentTime: number) => void;
  onEnded?: () => void;
  isPlaying?: boolean;
  startTime?: number; // Start position in seconds
}

declare global {
  interface Window {
    YT: {
      Player: new (
        elementId: string,
        config: {
          videoId: string;
          playerVars?: {
            autoplay?: number;
            controls?: number;
            disablekb?: number;
            fs?: number;
            modestbranding?: number;
            rel?: number;
            showinfo?: number;
            start?: number;
            origin?: string;
          };
          events?: {
            onReady?: (event: { target: YTPlayer }) => void;
            onStateChange?: (event: { data: number; target: YTPlayer }) => void;
            onError?: (event: { data: number }) => void;
          };
        }
      ) => YTPlayer;
      PlayerState: {
        ENDED: number;
        PLAYING: number;
        PAUSED: number;
        BUFFERING: number;
        CUED: number;
      };
    };
    onYouTubeIframeAPIReady: () => void;
  }
}

interface YTPlayer {
  playVideo: () => void;
  pauseVideo: () => void;
  stopVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead?: boolean) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  getPlayerState: () => number;
  mute: () => void;
  unMute: () => void;
  isMuted: () => boolean;
  setVolume: (volume: number) => void;
  destroy: () => void;
}

export function YouTubePlayer({ 
  videoId, 
  videoGap = 0,
  onReady, 
  onTimeUpdate, 
  onEnded,
  isPlaying = true,
  startTime = 0
}: YouTubePlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const [isApiLoaded, setIsApiLoaded] = useState(false);
  const timeUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Load YouTube IFrame API
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Check if API is already loaded
    if (window.YT && window.YT.Player) {
      // Use microtask to avoid synchronous setState
      queueMicrotask(() => setIsApiLoaded(true));
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
  
  // Initialize player when API is loaded
  useEffect(() => {
    if (!isApiLoaded || !containerRef.current || playerRef.current) return;
    
    const adjustedStartTime = Math.max(0, (startTime / 1000) - videoGap);
    
    playerRef.current = new window.YT.Player(`youtube-player-${videoId}`, {
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
          onReady?.();
        },
        onStateChange: (event) => {
          if (event.data === window.YT.PlayerState.ENDED) {
            onEnded?.();
          }
        },
      },
    });
    
    // Start time update interval
    timeUpdateIntervalRef.current = setInterval(() => {
      if (playerRef.current && onTimeUpdate) {
        const currentTime = playerRef.current.getCurrentTime();
        onTimeUpdate((currentTime + videoGap) * 1000); // Apply videoGap and convert to ms
      }
    }, 100);
    
    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
      if (timeUpdateIntervalRef.current) {
        clearInterval(timeUpdateIntervalRef.current);
      }
    };
  }, [isApiLoaded, videoId, videoGap, onReady, onTimeUpdate, onEnded, startTime]);
  
  // Handle play/pause
  useEffect(() => {
    if (!playerRef.current) return;
    
    if (isPlaying) {
      playerRef.current.playVideo();
    } else {
      playerRef.current.pauseVideo();
    }
  }, [isPlaying]);
  
  // Method to seek to a specific time
  const seekTo = useCallback((timeMs: number) => {
    if (!playerRef.current) return;
    const adjustedTime = (timeMs / 1000) - videoGap;
    playerRef.current.seekTo(Math.max(0, adjustedTime), true);
  }, [videoGap]);
  
  // Method to get current time
  const getCurrentTime = useCallback(() => {
    if (!playerRef.current) return 0;
    return (playerRef.current.getCurrentTime() + videoGap) * 1000;
  }, [videoGap]);
  
  return (
    <div ref={containerRef} className="absolute inset-0 w-full h-full">
      <div 
        id={`youtube-player-${videoId}`} 
        className="absolute inset-0 w-full h-full"
        style={{ pointerEvents: 'none' }}
      />
    </div>
  );
}

export default YouTubePlayer;
