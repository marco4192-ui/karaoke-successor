'use client';

import type { Song, PitchDetectionResult } from '@/types/game';

// ── Types ──

export interface ComputeElapsedParams {
  audioRef: React.RefObject<HTMLAudioElement | null>;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  song: Song;
  isNativeAudio: boolean;
  isYouTube: boolean;
  /** True for ANY streaming platform (YouTube/Dailymotion/Vimeo) — platform time is the clock. */
  isStreamingVideo?: boolean;
  youtubeTimeRef: React.MutableRefObject<number>;
  nativeAudioTimeRef: React.MutableRefObject<number>;
  startTimeRef: React.MutableRefObject<number>;
  /** R111 (user 1.2): wall-clock (performance.now()) of the moment the
   *  platform time in youtubeTimeRef was last updated — lets the loop
   *  EXTRAPOLATE between the ~100 ms granular platform reports so the note
   *  stream advances smoothly instead of stepping ("ruckelnder Notenstream").
   *  Absent → no extrapolation (legacy stepping behavior). */
  platformClockWallRef?: React.MutableRefObject<number>;
}

export interface BuildP2PitchParams {
  /**
   * R94-5 REGRESSION FIX: MIDI note. `setP2DetectedPitch` has carried MIDI
   * NOTES since the R60 refactor (use-duet-p2-pitch sets `mp.note` and
   * `result.rawNote ?? result.note`), but this builder still treated the
   * value as a FREQUENCY and re-converted Hz→MIDI — every P2 pitch was
   * scrambled through a bogus log2 mapping (a sung A4 / note 69 came out
   * as note 37!). P2 scored pseudo-random hits/misses with permanently
   * broken combos in duels/duets — for mic AND companion P2 singers.
   */
  note: number;
  volume: number;
}

// ── Elapsed time computation ──

/** Max wall-clock lead the extrapolation may add to the last platform
 *  report (ms). Caps the run-ahead when a platform feed stalls (buffering):
 *  the stream then FREEZES instead of sprinting, exactly like a buffering
 *  video. The platform interval is 100 ms — 150 covers one missed tick. */
const PLATFORM_EXTRAPOLATION_MAX_MS = 150;

/**
 * Compute the current elapsed time (in ms) from song start.
 *
 * Priority order:
 * 1. Native audio time (ASIO / WASAPI) — lowest latency
 * 2. Streaming-platform time — YouTube IFrame API / Dailymotion SDK / Vimeo player.js
 *    (ONLY while the platform provides the audio — with a separate audio file
 *    the platform player is muted and the HEARD audio element is the clock)
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
    isStreamingVideo = false,
    youtubeTimeRef,
    nativeAudioTimeRef,
    startTimeRef,
    platformClockWallRef,
  } = params;

  const startPositionMs = song.start || 0;

  // Priority: native audio time (ASIO / WASAPI)
  if (isNativeAudio && nativeAudioTimeRef.current > 0) {
    return nativeAudioTimeRef.current;
  }

  // Priority: streaming-platform time (YouTube / Dailymotion / Vimeo) — but
  // ONLY when the platform is the audio source (no separate audio file).
  // R111 (user 1): with a separate audio file the platform player is muted
  // (game-background) — its time would drift against the HEARD audio.
  if ((isYouTube || isStreamingVideo) && !song.audioUrl && youtubeTimeRef.current > 0) {
    const platformTime = youtubeTimeRef.current;
    // R111 (user 1.2): smooth clock — extrapolate between the coarse platform
    // reports with the wall clock so notes glide at rAF rate. Monotonic by
    // caller convention (each frame ≥ previous; tiny report jitter can never
    // pull the stream backwards).
    if (platformClockWallRef) {
      const age = performance.now() - platformClockWallRef.current;
      const lead = Math.max(0, Math.min(age, PLATFORM_EXTRAPOLATION_MAX_MS));
      return platformTime + lead;
    }
    return platformTime;
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
  const { note, volume } = params;
  const rounded = Math.round(note * 10) / 10;
  // Reconstruct the frequency — checkPlayerNoteHits gates on
  // `pitch.frequency` truthiness before looking at the note.
  const frequency = 440 * Math.pow(2, (rounded - 69) / 12);
  return {
    frequency,
    note: rounded,
    rawNote: rounded, // P2 pitch is not stabilized, so rawNote == note
    clarity: 0.7,
    volume,
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
