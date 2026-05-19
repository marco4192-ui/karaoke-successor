'use client';

import type { Song, PitchDetectionResult } from '@/types/game';

// ── Types ──

export interface ComputeElapsedParams {
  audioRef: React.RefObject<HTMLAudioElement | null>;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  song: Song;
  isNativeAudio: boolean;
  isYouTube: boolean;
  youtubeTimeRef: React.MutableRefObject<number>;
  nativeAudioTimeRef: React.MutableRefObject<number>;
  startTimeRef: React.MutableRefObject<number>;
}

export interface BuildP2PitchParams {
  frequency: number;
  volume: number;
  isSinging?: boolean;
}

// ── Elapsed time computation ──

/**
 * Compute the current elapsed time (in ms) from song start.
 *
 * Priority order:
 * 1. Native audio time (ASIO / WASAPI) — lowest latency
 * 2. YouTube time — from the IFrame Player API
 * 3. Browser audio element currentTime
 * 4. Browser video element currentTime (for embedded-audio videos)
 * 5. Wall-clock fallback — (Date.now() − startTime) + startPosition
 */
export function computeGameElapsedMs(params: ComputeElapsedParams): number {
  const {
    audioRef,
    videoRef,
    song,
    isNativeAudio,
    isYouTube,
    youtubeTimeRef,
    nativeAudioTimeRef,
    startTimeRef,
  } = params;

  const startPositionMs = song.start || 0;

  // Priority: native audio time (ASIO / WASAPI)
  if (isNativeAudio && nativeAudioTimeRef.current > 0) {
    return nativeAudioTimeRef.current;
  }

  // Priority: YouTube time
  if (isYouTube && youtubeTimeRef.current > 0) {
    return youtubeTimeRef.current;
  }

  // Priority: browser audio element
  if (audioRef.current && !audioRef.current.paused && audioRef.current.readyState >= 2) {
    return audioRef.current.currentTime * 1000;
  }

  // Priority: browser video element (embedded audio)
  if (song.hasEmbeddedAudio && videoRef.current && !videoRef.current.paused && videoRef.current.readyState >= 2) {
    return videoRef.current.currentTime * 1000;
  }

  // Fallback: wall-clock timing
  return (Date.now() - startTimeRef.current) + startPositionMs;
}

// ── P2 pitch result construction ──

/**
 * Build a `PitchDetectionResult` for Player 2 from raw pitch data.
 *
 * P2's clarity is not tracked by the local pitch detector (only frequency
 * is), so a moderate default of 0.7 is used.  Clarity is only used for
 * display — not scoring.
 */
export function buildP2PitchResult(params: BuildP2PitchParams): PitchDetectionResult {
  const { frequency, volume, isSinging } = params;
  return {
    frequency,
    note: Math.round(12 * (Math.log2(frequency / 440)) + 69),
    clarity: 0.7,
    volume,
    isSinging: isSinging ?? true,
  };
}

// ── Effective song end computation ──

/**
 * Determine the effective end time for the song.
 *
 * When #END: is not defined, the audio/video element's natural "ended"
 * event (handled via onEnded prop) terminates the game.  For non-scoring
 * modes (rate-my-song), fall back to song.duration when no media is
 * playing, so the game doesn't run forever.
 */
export function getEffectiveSongEnd(
  song: Song,
  gameMode: string,
): number {
  return song.end || (gameMode === 'rate-my-song' ? song.duration : 0);
}
