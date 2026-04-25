'use client';

import { useEffect, useCallback, useRef } from 'react';
import type { Song } from '@/types/game';

/**
 * Hook for OS-level media controls integration via the Media Session API.
 * Works in Tauri's WebView (WebView2/WKWebView/WebKitGTK) on all platforms.
 *
 * Features:
 * - Displays song metadata in OS media controls (title, artist, album art)
 * - Handles OS media key events (play/pause, stop)
 * - Updates playback position state for OS seekbar
 *
 * @param song - Current song (null when no song is active)
 * @param isPlaying - Whether audio is currently playing
 * @param audioRef - Ref to the HTMLAudioElement for position tracking
 * @param onPause - Callback when OS "pause" is triggered
 * @param onResume - Callback when OS "play" is triggered
 */

interface UseMediaSessionOptions {
  song: Song | null;
  isPlaying: boolean;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  onPause?: () => void;
  onResume?: () => void;
}

export function useMediaSession({
  song,
  isPlaying,
  audioRef,
  onPause,
  onResume,
}: UseMediaSessionOptions) {
  const pauseRef = useRef(onPause);
  pauseRef.current = onPause;
  const resumeRef = useRef(onResume);
  resumeRef.current = onResume;

  // Set metadata when song changes
  useEffect(() => {
    if (!song || typeof navigator === 'undefined' || !('mediaSession' in navigator)) {
      return;
    }

    const metadata: MediaMetadata = {
      title: `${song.title} — Karaoke`,
      artist: song.artist || 'Unknown Artist',
      album: 'Karaoke Successor',
    };

    // Attach cover art if available
    if (song.coverImage) {
      metadata.artwork = [
        { src: song.coverImage, sizes: '512x512', type: 'image/jpeg' },
        { src: song.coverImage, sizes: '256x256', type: 'image/jpeg' },
      ];
    }

    navigator.mediaSession.metadata = new MediaMetadata(metadata);
  }, [song]);

  // Set action handlers once on mount
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) {
      return;
    }

    const noop = () => {};

    navigator.mediaSession.setActionHandler('play', () => {
      resumeRef.current?.();
    });

    navigator.mediaSession.setActionHandler('pause', () => {
      pauseRef.current?.();
    });

    navigator.mediaSession.setActionHandler('stop', () => {
      pauseRef.current?.();
    });

    // previoustrack/nexttrack are no-ops since karaoke has no playlist queue
    navigator.mediaSession.setActionHandler('previoustrack', noop);
    navigator.mediaSession.setActionHandler('nexttrack', noop);

    return () => {
      // Clear handlers on unmount to avoid stale callbacks
      navigator.mediaSession.setActionHandler('play', null);
      navigator.mediaSession.setActionHandler('pause', null);
      navigator.mediaSession.setActionHandler('stop', null);
      navigator.mediaSession.setActionHandler('previoustrack', null);
      navigator.mediaSession.setActionHandler('nexttrack', null);
      navigator.mediaSession.metadata = null;
    };
  }, []);

  // Update playback state (playing/paused)
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) {
      return;
    }

    if (isPlaying) {
      navigator.mediaSession.playbackState = 'playing';
    } else {
      navigator.mediaSession.playbackState = 'paused';
    }
  }, [isPlaying]);

  // Update position state for OS seekbar (poll every second while playing)
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) {
      return;
    }

    if (!isPlaying) return;

    const updatePosition = () => {
      const audio = audioRef.current;
      if (audio && audio.duration && isFinite(audio.duration)) {
        try {
          navigator.mediaSession.setPositionState({
            duration: audio.duration,
            playbackRate: audio.playbackRate,
            position: Math.min(audio.currentTime, audio.duration),
          });
        } catch {
          // setPositionState can throw if called in invalid state — ignore
        }
      }
    };

    // Initial update
    updatePosition();

    const interval = setInterval(updatePosition, 1000);
    return () => clearInterval(interval);
  }, [isPlaying, audioRef]);
}
