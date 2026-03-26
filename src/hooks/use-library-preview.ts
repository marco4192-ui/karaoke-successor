/**
 * Custom hook for managing song preview functionality in the library
 * Handles audio/video preview with cleanup
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import { Song } from '@/types/game';
import { logger } from '@/lib/logger';

export interface PreviewState {
  previewSong: Song | null;
  previewAudio: HTMLAudioElement | null;
  previewVideoId: string | null;
}

export function useLibraryPreview() {
  const [previewSong, setPreviewSong] = useState<Song | null>(null);
  const [previewAudio, setPreviewAudio] = useState<HTMLAudioElement | null>(null);
  const [previewVideoId, setPreviewVideoId] = useState<string | null>(null);
  const previewTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const previewVideoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());

  // Clear preview timeout
  const clearPreviewTimeout = useCallback(() => {
    if (previewTimeoutRef.current) {
      clearTimeout(previewTimeoutRef.current);
      previewTimeoutRef.current = null;
    }
  }, []);

  // Stop current preview
  const stopPreview = useCallback(() => {
    clearPreviewTimeout();
    
    if (previewAudio) {
      previewAudio.pause();
      previewAudio.src = '';
      setPreviewAudio(null);
    }
    
    // Pause all video previews
    previewVideoRefs.current.forEach(video => {
      video.pause();
    });
    
    setPreviewSong(null);
    setPreviewVideoId(null);
  }, [previewAudio, clearPreviewTimeout]);

  // Start preview for a song
  const startPreview = useCallback((song: Song) => {
    // Cancel any pending preview
    clearPreviewTimeout();
    
    // If already previewing this song, stop it
    if (previewSong?.id === song.id) {
      stopPreview();
      return;
    }
    
    // Stop any existing preview
    if (previewAudio) {
      previewAudio.pause();
    }
    
    // Set the new preview song
    setPreviewSong(song);
    
    // For audio files, create and play audio preview
    if (song.audioUrl && !song.hasEmbeddedAudio) {
      try {
        const audio = new Audio(song.audioUrl);
        audio.volume = 0.5;
        audio.currentTime = song.preview?.startTime ? song.preview.startTime / 1000 : 0;
        
        audio.play().catch(e => {
          logger.warn('[LibraryPreview]', 'Audio preview failed:', e);
        });
        
        setPreviewAudio(audio);
      } catch (e) {
        logger.warn('[LibraryPreview]', 'Failed to create audio preview:', e);
      }
    }
    
    // For YouTube songs, set the video ID
    if (song.youtubeUrl) {
      // Extract YouTube ID - this will trigger iframe creation in the component
      setPreviewVideoId(song.id);
    }
  }, [previewSong, previewAudio, clearPreviewTimeout, stopPreview]);

  // Start preview with delay (for hover)
  const startPreviewDelayed = useCallback((song: Song, delay = 500) => {
    clearPreviewTimeout();
    
    previewTimeoutRef.current = setTimeout(() => {
      startPreview(song);
    }, delay);
  }, [startPreview, clearPreviewTimeout]);

  // Cancel pending preview (for mouse leave before delay)
  const cancelPreview = useCallback(() => {
    clearPreviewTimeout();
  }, [clearPreviewTimeout]);

  // Register video ref for preview control
  const registerVideoRef = useCallback((songId: string, element: HTMLVideoElement | null) => {
    if (element) {
      previewVideoRefs.current.set(songId, element);
    } else {
      previewVideoRefs.current.delete(songId);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearPreviewTimeout();
      if (previewAudio) {
        previewAudio.pause();
      }
    };
  }, [clearPreviewTimeout]);

  return {
    previewSong,
    previewAudio,
    previewVideoId,
    startPreview,
    startPreviewDelayed,
    stopPreview,
    cancelPreview,
    registerVideoRef,
  };
}

export default useLibraryPreview;
