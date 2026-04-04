'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Song } from '@/types/game';

export function useLibraryPreview() {
  const [previewSong, setPreviewSong] = useState<Song | null>(null);
  const [previewAudio, setPreviewAudio] = useState<HTMLAudioElement | null>(null);
  const previewTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const previewVideoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  
  const handlePreviewStart = useCallback((song: Song) => {
    // Allow preview even without audioUrl if there's video
    if (!song.audioUrl && !song.videoBackground && !song.youtubeUrl) return;
    
    // Clear any existing timeout
    if (previewTimeoutRef.current) {
      clearTimeout(previewTimeoutRef.current);
    }
    
    // Delay before starting preview
    previewTimeoutRef.current = setTimeout(() => {
      // Stop any existing preview
      if (previewAudio) {
        previewAudio.pause();
      }
      
      // Stop all existing videos first
      previewVideoRefs.current.forEach((video) => {
        video.pause();
        video.currentTime = 0;
      });
      
      // Create new audio for preview (if audio exists)
      if (song.audioUrl) {
        const audio = new Audio();
        audio.volume = 0.3;
        
        // Start from preview time if available
        if (song.preview) {
          audio.currentTime = song.preview.startTime / 1000;
        }
        
        audio.src = song.audioUrl;
        audio.play().catch(() => {});
        
        setPreviewAudio(audio);
      }
      
      // Start video preview (if local video exists)
      if (song.videoBackground) {
        const videoEl = previewVideoRefs.current.get(song.id);
        if (videoEl) {
          // Set start time from preview if available
          if (song.preview) {
            videoEl.currentTime = song.preview.startTime / 1000;
          }
          // For videos with embedded audio, unmute the video
          if (song.hasEmbeddedAudio && !song.audioUrl) {
            videoEl.muted = false;
          }
          videoEl.play().catch(() => {});
        }
      }
      
      setPreviewSong(song);
    }, 500); // 500ms delay before preview starts
  }, [previewAudio]);
  
  const handlePreviewStop = useCallback(() => {
    if (previewTimeoutRef.current) {
      clearTimeout(previewTimeoutRef.current);
    }
    if (previewAudio) {
      previewAudio.pause();
    }
    // Stop all preview videos
    previewVideoRefs.current.forEach((video) => {
      video.pause();
      video.currentTime = 0;
    });
    setPreviewSong(null);
  }, [previewAudio]);
  
  // Cleanup preview audio on unmount
  useEffect(() => {
    return () => {
      if (previewAudio) {
        previewAudio.pause();
        previewAudio.src = '';
      }
      if (previewTimeoutRef.current) {
        clearTimeout(previewTimeoutRef.current);
      }
    };
  }, [previewAudio]);
  
  return {
    previewSong,
    previewAudio,
    previewVideoRefs,
    handlePreviewStart,
    handlePreviewStop,
  };
}
