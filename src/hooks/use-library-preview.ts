'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Song } from '@/types/game';
import { ensureSongUrls } from '@/lib/game/song-url-restore';

export function useLibraryPreview() {
  const [previewSong, setPreviewSong] = useState<Song | null>(null);
  const [previewAudio, setPreviewAudio] = useState<HTMLAudioElement | null>(null);
  const previewTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const previewDurationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const previewVideoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  // Track the active Audio object for proper cleanup
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  // Generation counter to detect stale/cancelled preview operations.
  // Incremented on every stop so async callbacks can bail out.
  const previewGenerationRef = useRef(0);

  /** Safely dispose of an Audio element (remove src, release resources) */
  const disposeAudio = useCallback((audio: HTMLAudioElement) => {
    audio.pause();
    audio.removeAttribute('src');
    audio.load(); // Release media resources
  }, []);

  /** Get the preview start time in seconds from the song's metadata */
  const getPreviewStartTime = useCallback((song: Song): number => {
    if (song.previewStart && song.previewStart > 0) return song.previewStart;
    if (song.preview?.startTime) return song.preview.startTime / 1000;
    return 0;
  }, []);

  /** Get the preview duration in seconds from the song's metadata */
  const getPreviewDuration = useCallback((song: Song): number => {
    if (song.previewDuration && song.previewDuration > 0) return song.previewDuration;
    if (song.preview?.duration) return song.preview.duration / 1000;
    return 30;
  }, []);

  /** Stop all active preview media and invalidate any pending async operations */
  const stopAllMedia = useCallback(() => {
    // Invalidate any in-flight preview operations so their async callbacks bail out
    previewGenerationRef.current++;

    // Clean up the tracked audio object
    if (activeAudioRef.current) {
      disposeAudio(activeAudioRef.current);
      activeAudioRef.current = null;
    }
    setPreviewAudio(null);

    previewVideoRefs.current.forEach((video) => {
      video.pause();
      video.currentTime = 0;
    });
    if (previewDurationTimeoutRef.current) {
      clearTimeout(previewDurationTimeoutRef.current);
      previewDurationTimeoutRef.current = null;
    }
  }, [disposeAudio]);

  const handlePreviewStart = useCallback((song: Song) => {
    const hasMedia = song.audioUrl || song.videoBackground || song.youtubeUrl || song.videoUrl
      || song.relativeAudioPath || song.relativeVideoPath || song.storedMedia;
    if (!hasMedia) return;

    if (previewTimeoutRef.current) {
      clearTimeout(previewTimeoutRef.current);
    }

    // Capture the current generation so we can detect if this preview
    // was cancelled while the 500ms delay or async URL restoration runs.
    const generation = ++previewGenerationRef.current;

    previewTimeoutRef.current = setTimeout(async () => {
      // Bail out if preview was cancelled during the 500ms delay
      if (generation !== previewGenerationRef.current) return;

      // Dispose previous audio to free resources
      if (activeAudioRef.current) {
        disposeAudio(activeAudioRef.current);
        activeAudioRef.current = null;
      }

      // Restore media URLs if missing (Tauri needs relative paths resolved)
      let songToPlay = song;
      if (!songToPlay.audioUrl || !songToPlay.videoBackground) {
        try {
          songToPlay = await ensureSongUrls(song);
        } catch { /* use original song */ }
      }

      // Bail out if preview was cancelled during async URL restoration
      if (generation !== previewGenerationRef.current) return;

      const startTime = getPreviewStartTime(songToPlay);
      const duration = getPreviewDuration(songToPlay);

      // Create new audio for preview and track it
      if (songToPlay.audioUrl) {
        const audio = new Audio();
        audio.volume = 0.3;
        audio.src = songToPlay.audioUrl;
        activeAudioRef.current = audio;

        let hasStartedPlayback = false;

        const tryPlay = () => {
          // Guard: only play if this audio is still the active one and
          // the preview hasn't been cancelled in the meantime.
          if (audio !== activeAudioRef.current) {
            disposeAudio(audio);
            return;
          }
          if (hasStartedPlayback) return;
          hasStartedPlayback = true;
          if (startTime > 0 && audio.duration >= startTime) {
            audio.currentTime = startTime;
          }
          audio.play().catch(() => {});
        };

        audio.addEventListener('loadedmetadata', tryPlay, { once: true });
        audio.addEventListener('canplaythrough', tryPlay, { once: true });

        setPreviewAudio(audio);
      }

      // Start video preview
      const videoSrc = songToPlay.videoUrl || songToPlay.videoBackground;
      if (videoSrc) {
        const videoEl = previewVideoRefs.current.get(songToPlay.id);
        if (videoEl) {
          if (!videoEl.src || videoEl.src === window.location.href) {
            videoEl.src = videoSrc;
          }

          videoEl.addEventListener('loadedmetadata', () => {
            if (generation !== previewGenerationRef.current) return;
            if (startTime > 0 && videoEl.duration >= startTime) {
              videoEl.currentTime = startTime;
            }
            videoEl.play().catch(() => {});
          }, { once: true });

          if (videoEl.readyState >= 1) {
            if (startTime > 0 && videoEl.duration >= startTime) {
              videoEl.currentTime = startTime;
            }
            videoEl.play().catch(() => {});
          }
        }
      }

      // One last cancellation check before committing state updates
      if (generation !== previewGenerationRef.current) return;

      setPreviewSong(songToPlay);

      // Clear any previous duration timeout before setting a new one
      if (previewDurationTimeoutRef.current) {
        clearTimeout(previewDurationTimeoutRef.current);
      }
      // Auto-stop after preview duration
      previewDurationTimeoutRef.current = setTimeout(() => {
        stopAllMedia();
        setPreviewSong(null);
      }, duration * 1000);
    }, 500);
  }, [stopAllMedia, disposeAudio, getPreviewStartTime, getPreviewDuration]);

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
      // Invalidate any in-flight async preview operations
      previewGenerationRef.current++;
      if (previewTimeoutRef.current) {
        clearTimeout(previewTimeoutRef.current);
      }
      if (previewDurationTimeoutRef.current) {
        clearTimeout(previewDurationTimeoutRef.current);
      }
      if (activeAudioRef.current) {
        disposeAudio(activeAudioRef.current);
        activeAudioRef.current = null;
      }
    };
  }, [disposeAudio]);

  return {
    previewSong,
    previewAudio,
    previewVideoRefs,
    handlePreviewStart,
    handlePreviewStop,
  };
}
