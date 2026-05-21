'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

const PREVIEW_DURATION_SECONDS = 15;

interface UseMobileSongPreviewOptions {
  onPreviewStart?: () => void;
  onPreviewEnd?: () => void;
}

interface UseMobileSongPreviewReturn {
  isPreviewPlaying: boolean;
  previewSongId: string | null;
  previewProgress: number; // 0–1 based on elapsed time out of 15s
  playPreview: (songId: string, audioUrl: string) => void;
  stopPreview: () => void;
}

export function useMobileSongPreview(options: UseMobileSongPreviewOptions = {}): UseMobileSongPreviewReturn {
  const { onPreviewStart, onPreviewEnd } = options;

  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [previewSongId, setPreviewSongId] = useState<string | null>(null);
  const [previewProgress, setPreviewProgress] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timeUpdateHandlerRef = useRef<((e: Event) => void) | null>(null);
  const startTimestampRef = useRef<number>(0);
  const progressRAFRef = useRef<number | null>(null);
  const autoStopTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Progress animation loop — updates every animation frame for smooth ring
  const updateProgressLoop = useCallback(() => {
    const elapsed = (Date.now() - startTimestampRef.current) / 1000;
    const progress = Math.min(elapsed / PREVIEW_DURATION_SECONDS, 1);
    setPreviewProgress(progress);

    if (progress < 1) {
      progressRAFRef.current = requestAnimationFrame(updateProgressLoop);
    }
  }, []);

  const stopPreviewLoop = useCallback(() => {
    if (progressRAFRef.current !== null) {
      cancelAnimationFrame(progressRAFRef.current);
      progressRAFRef.current = null;
    }
  }, []);

  const stopPreview = useCallback(() => {
    stopPreviewLoop();

    if (autoStopTimeoutRef.current) {
      clearTimeout(autoStopTimeoutRef.current);
      autoStopTimeoutRef.current = null;
    }

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeEventListener('timeupdate', timeUpdateHandlerRef.current!);
      audioRef.current.removeEventListener('ended', timeUpdateHandlerRef.current!);
      audioRef.current.removeAttribute('src');
      audioRef.current.load();
      audioRef.current = null;
    }
    timeUpdateHandlerRef.current = null;

    setIsPreviewPlaying(false);
    setPreviewSongId(null);
    setPreviewProgress(0);

    onPreviewEnd?.();
  }, [stopPreviewLoop, onPreviewEnd]);

  const playPreview = useCallback((songId: string, audioUrl: string) => {
    // Stop any existing preview first
    if (audioRef.current) {
      stopPreview();
    }

    const audio = new Audio();
    audio.volume = 0.6;
    audio.preload = 'auto';
    audio.src = audioUrl;

    const handleTimeUpdate = () => {
      if (audio.currentTime >= PREVIEW_DURATION_SECONDS) {
        audio.pause();
        stopPreview();
        return;
      }
    };

    timeUpdateHandlerRef.current = handleTimeUpdate;
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', stopPreview);

    audioRef.current = audio;

    audio.addEventListener('canplaythrough', () => {
      if (audio.paused && audioRef.current === audio) {
        audio.currentTime = 0;
        audio.play().catch(() => {
          stopPreview();
        });
      }
    }, { once: true });

    // Fallback: try playing immediately if already buffered
    if (audio.readyState >= 3) {
      audio.currentTime = 0;
      audio.play().catch(() => {
        stopPreview();
      });
    }

    setIsPreviewPlaying(true);
    setPreviewSongId(songId);
    setPreviewProgress(0);
    startTimestampRef.current = Date.now();

    // Start progress animation
    stopPreviewLoop();
    progressRAFRef.current = requestAnimationFrame(updateProgressLoop);

    // Auto-stop safety net
    autoStopTimeoutRef.current = setTimeout(() => {
      stopPreview();
    }, PREVIEW_DURATION_SECONDS * 1000 + 500);

    onPreviewStart?.();
  }, [stopPreview, stopPreviewLoop, updateProgressLoop, onPreviewStart]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPreviewLoop();
      if (autoStopTimeoutRef.current) {
        clearTimeout(autoStopTimeoutRef.current);
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.removeEventListener('timeupdate', timeUpdateHandlerRef.current!);
        audioRef.current.removeEventListener('ended', timeUpdateHandlerRef.current!);
        audioRef.current.removeAttribute('src');
        audioRef.current.load();
      }
    };
  }, [stopPreviewLoop]);

  return {
    isPreviewPlaying,
    previewSongId,
    previewProgress,
    playPreview,
    stopPreview,
  };
}
