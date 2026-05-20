'use client';

import type { Song } from '@/types/game';
import { normalizeFilePath } from '@/lib/tauri-file-storage';

// ── Types ──

export interface PlayMediaParams {
  audioRef: React.RefObject<HTMLAudioElement | null>;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  song: Song;
  isNativeAudio: boolean;
  nativeAudioPlay?: (_filePath: string) => Promise<void>;
  nativeAudioSeek?: (_positionMs: number) => Promise<void>;
}

export interface MediaWatchdogParams {
  audioRef: React.RefObject<HTMLAudioElement | null>;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isYouTube: boolean;
  isNativeAudio: boolean;
  youtubeTimeRef: React.MutableRefObject<number>;
  nativeAudioTimeRef: React.MutableRefObject<number>;
  wasPausedByStoreRef: React.MutableRefObject<boolean>;
  endGameAndCleanupRef: React.MutableRefObject<() => void>;
}

// ── Media playback ──

/**
 * Start audio/video/YouTube/native-audio playback for the given song.
 *
 * Handles three playback priorities:
 * 1. Separate audio file (most common)
 * 2. Video with embedded audio (fallback when no separate audio)
 * 3. YouTube video (handled externally by IFrame Player API)
 *
 * Also starts a muted background video if the song has one but it's
 * not the primary audio source.
 */
export async function playSongMedia(params: PlayMediaParams): Promise<void> {
  const { audioRef, videoRef, song, isNativeAudio, nativeAudioPlay, nativeAudioSeek } = params;

  try {
    const startPosition = (song.start || 0) / 1000;
    const currentAudioUrl = song.audioUrl;
    const currentVideoUrl = song.videoBackground;

    // PRIORITY 1: Separate audio file (most common case)
    if (audioRef.current && currentAudioUrl) {
      // Only set src if it differs — avoids resetting playback
      if (audioRef.current.src !== currentAudioUrl) {
        audioRef.current.src = currentAudioUrl;
      }
      audioRef.current.currentTime = startPosition;
      // When native audio is active, mute the browser audio element
      if (isNativeAudio) {
        audioRef.current.muted = true;
      }
      await audioRef.current.play();

      // Start native audio playback if enabled and file path is available
      if (isNativeAudio && nativeAudioPlay && song.baseFolder && song.relativeAudioPath) {
        // Use centralized normalizeFilePath for consistent path construction
        // (handles backslashes, trailing slashes, and HTML entities like &amp;)
        const normalizedBase = normalizeFilePath(song.baseFolder);
        const normalizedRelative = normalizeFilePath(song.relativeAudioPath);
        const nativePath = `${normalizedBase}/${normalizedRelative}`;
        nativeAudioPlay(nativePath).catch((err) => {
          // eslint-disable-next-line no-console
          console.error('[GameScreen] Native audio play failed, falling back to browser:', err);
          if (audioRef.current) audioRef.current.muted = false;
        });
        // Seek to start position after native audio begins
        if (nativeAudioSeek) {
          nativeAudioSeek(song.start || 0).catch(() => {});
        }
      }
    }

    // PRIORITY 2: Video with embedded audio
    else if (song.hasEmbeddedAudio && videoRef.current && currentVideoUrl && !currentAudioUrl) {
      if (videoRef.current.src !== currentVideoUrl) {
        videoRef.current.src = currentVideoUrl;
      }
      videoRef.current.currentTime = startPosition;

      try {
        videoRef.current.muted = false;
        await videoRef.current.play();
      } catch (error) {
        console.debug('[useGameLoop]: video autoplay failed, retrying muted', error);
        videoRef.current.muted = true;
        await videoRef.current.play();
        setTimeout(() => {
          if (videoRef.current) {
            videoRef.current.muted = false;
          }
        }, 100);
      }
    }

    // PRIORITY 3: YouTube video
    // YouTube playback is handled by the YouTube IFrame Player API
    // (use-youtube-game.ts), which manages its own play/pause/seek
    // lifecycle independently. No action needed here — the game loop
    // receives time via youtubeTimeRef.current from the YT player.

    // BACKGROUND VIDEO (muted, synced with audio)
    if (videoRef.current && currentVideoUrl && !song.hasEmbeddedAudio) {
      // Only set src if it differs — avoids resetting playback
      if (videoRef.current.src !== currentVideoUrl) {
        videoRef.current.src = currentVideoUrl;
      }
      const videoGapSeconds = (song.videoGap || 0) / 1000;
      videoRef.current.currentTime = Math.max(0, startPosition - videoGapSeconds);
      videoRef.current.muted = true;
      videoRef.current.play().catch(() => {});
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[GameScreen] Media playback failed:', error);
    // Do NOT set isPlaying(true) — the media didn't start,
    // so the game loop must not run (would cause infinite wall-clock hang).
  }
}

// ── Media playback watchdog ──

/**
 * Schedule a 10-second watchdog that aborts the game if no media source
 * is actually playing after the countdown finishes.  In non-scoring modes
 * (rate-my-song) we only log a warning instead of aborting.
 *
 * Returns a cleanup function that clears the watchdog timeout.
 */
export function scheduleMediaWatchdog(
  params: MediaWatchdogParams & { isNonScoringMode: boolean },
): () => void {
  const {
    audioRef,
    videoRef,
    isYouTube,
    isNativeAudio,
    youtubeTimeRef,
    nativeAudioTimeRef,
    wasPausedByStoreRef,
    endGameAndCleanupRef,
    isNonScoringMode,
  } = params;

  const timer = setTimeout(() => {
    // Do NOT abort if the user paused during the watchdog window
    if (wasPausedByStoreRef.current) return;

    const audioPlaying = audioRef.current && !audioRef.current.paused && audioRef.current.readyState >= 2;
    const videoPlaying = videoRef.current && !videoRef.current.paused && videoRef.current.readyState >= 2;
    const youTubeActive = isYouTube;
    const nativePlaying = isNativeAudio && nativeAudioTimeRef.current > 0;
    const youTubePlaying = youTubeActive && youtubeTimeRef.current > 0;

    if (!audioPlaying && !videoPlaying && !youTubePlaying && !nativePlaying) {
      if (isNonScoringMode) {
        // eslint-disable-next-line no-console
        console.warn('[GameLoop] Media playback watchdog: no media playing after 10s in non-scoring mode — continuing with wall-clock timing');
      } else {
        // eslint-disable-next-line no-console
        console.error('[GameLoop] Media playback watchdog: no media actually playing after 10s — ending game to prevent hang');
        endGameAndCleanupRef.current();
      }
    }
  }, 10000);

  return () => clearTimeout(timer);
}
