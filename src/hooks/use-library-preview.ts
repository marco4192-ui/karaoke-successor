'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Song } from '@/types/game';

export function useLibraryPreview() {
  const [previewSong, setPreviewSong] = useState<Song | null>(null);
  const [previewAudio, setPreviewAudio] = useState<HTMLAudioElement | null>(null);
  const previewTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const previewDurationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const previewVideoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());

  /** Get the preview start time in seconds from the song's metadata */
  const getPreviewStartTime = useCallback((song: Song): number => {
    // #PREVIEWSTART is stored in seconds directly
    if (song.previewStart && song.previewStart > 0) return song.previewStart;
    // Fallback to preview.startTime which is in ms
    if (song.preview?.startTime) return song.preview.startTime / 1000;
    return 0;
  }, []);

  /** Get the preview duration in seconds from the song's metadata */
  const getPreviewDuration = useCallback((song: Song): number => {
    // #PREVIEWDURATION is stored in seconds directly
    if (song.previewDuration && song.previewDuration > 0) return song.previewDuration;
    // Fallback to preview.duration which is in ms
    if (song.preview?.duration) return song.preview.duration / 1000;
    return 30; // default 30 seconds
  }, []);

  /** Stop all active preview media */
  const stopAllMedia = useCallback(() => {
    if (previewAudio) {
      previewAudio.pause();
      previewAudio.currentTime = 0;
    }
    previewVideoRefs.current.forEach((video) => {
      video.pause();
      video.currentTime = 0;
    });
    if (previewDurationTimeoutRef.current) {
      clearTimeout(previewDurationTimeoutRef.current);
      previewDurationTimeoutRef.current = null;
    }
  }, [previewAudio]);

  const handlePreviewStart = useCallback((song: Song) => {
    // Allow preview even without audioUrl if there's video
    if (!song.audioUrl && !song.videoBackground && !song.youtubeUrl && !song.videoUrl) return;

    // Clear any existing delay timeout
    if (previewTimeoutRef.current) {
      clearTimeout(previewTimeoutRef.current);
    }

    // Delay before starting preview (avoid instant playback on quick hovers)
    previewTimeoutRef.current = setTimeout(() => {
      // Stop any existing preview first
      stopAllMedia();

      const startTime = getPreviewStartTime(song);
      const duration = getPreviewDuration(song);

      // Create new audio for preview
      if (song.audioUrl) {
        const audio = new Audio();
        audio.volume = 0.3;
        audio.src = song.audioUrl;

        audio.addEventListener('loadedmetadata', () => {
          // Set start time for audio preview
          if (startTime > 0 && audio.duration >= startTime) {
            audio.currentTime = startTime;
          }
          audio.play().catch(() => {});
        });

        // Fallback if already loaded (cached)
        audio.addEventListener('canplaythrough', () => {
          if (audio.paused) {
            if (startTime > 0 && audio.duration >= startTime) {
              audio.currentTime = startTime;
            }
            audio.play().catch(() => {});
          }
        }, { once: true });

        setPreviewAudio(audio);
      }

      // Start video preview
      const videoSrc = song.videoUrl || song.videoBackground;
      if (videoSrc) {
        const videoEl = previewVideoRefs.current.get(song.id);
        if (videoEl) {
          videoEl.addEventListener('loadedmetadata', () => {
            if (startTime > 0 && videoEl.duration >= startTime) {
              videoEl.currentTime = startTime;
            }
            videoEl.play().catch(() => {});
          }, { once: true });

          // Fallback if already loaded
          if (videoEl.readyState >= 1) {
            if (startTime > 0 && videoEl.duration >= startTime) {
              videoEl.currentTime = startTime;
            }
            videoEl.play().catch(() => {});
          }
        }
      }

      setPreviewSong(song);

      // Auto-stop after preview duration
      previewDurationTimeoutRef.current = setTimeout(() => {
        stopAllMedia();
        setPreviewSong(null);
      }, duration * 1000);
    }, 500); // 500ms delay before preview starts
  }, [previewAudio, stopAllMedia, getPreviewStartTime, getPreviewDuration]);

  const handlePreviewStop = useCallback(() => {
    if (previewTimeoutRef.current) {
      clearTimeout(previewTimeoutRef.current);
    }
    stopAllMedia();
    setPreviewSong(null);
  }, [stopAllMedia]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (previewAudio) {
        previewAudio.pause();
        previewAudio.src = '';
      }
      if (previewTimeoutRef.current) {
        clearTimeout(previewTimeoutRef.current);
      }
      if (previewDurationTimeoutRef.current) {
        clearTimeout(previewDurationTimeoutRef.current);
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
