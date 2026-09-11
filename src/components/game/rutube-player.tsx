'use client';

import { useEffect, useRef, useState, forwardRef, useImperativeHandle, useCallback } from 'react';
import { extractRutubeId } from '@/lib/url-utils';
import {
  START_GATE_TOLERANCE_SECONDS,
  toSongTimeMs,
  type ManualStartPlayerProps,
} from '@/components/game/platform-player-shared';

/**
 * Rutube player component — mirrors the YouTubePlayer prop interface.
 *
 * Uses the Rutube embed player (https://rutube.ru/play/embed/{id}/) with its
 * postMessage-based Player API (player version ≥ 2.92.0-embed, documented in
 * the archived github.com/rutube/RutubePlayerJSAPI repo).
 *
 * Commands are JSON strings posted to the iframe:
 *   { type: 'player:play' | 'player:pause' | 'player:stop'
 *     | 'player:setCurrentTime' (data.time) | 'player:mute' | 'player:unMute'
 *     | 'player:hideControls' | 'player:showControls' }
 *
 * Events are JSON strings on window.message with type 'player:…':
 *   player:ready · player:playStart (fires ONCE when the video starts) ·
 *   player:changeState (playing|pause|seeking|seeked|buffering|completed) ·
 *   player:currentTime ({time, duration}) · player:playComplete · player:error
 *
 * Start gate: Rutube has no ad events, so the "ad vs. song start" detection
 * uses the position gate — the game resumes only when the reported video time
 * reaches the song's start offset (ads run on their own timeline, so video
 * time does not advance past the gate while an ad plays). Until then the
 * player reports the gate as "pending" via onAdStart/onAdEnd (reusing the
 * ad-wait machinery of the game screen).
 *
 * URL parameters (officially documented): t=<seconds> start position,
 * stopTime=<seconds> end position, skinColor=<hex>.
 */

// ── Message shapes (subset we consume) ──
interface RutubeMessage {
  type?: string;
  data?: {
    state?: 'playing' | 'pause' | 'paused' | 'seeking' | 'seeked' | 'buffering' | 'completed';
    time?: number;
    currentTime?: number;
    duration?: number;
    videoId?: string;
    message?: string;
    [key: string]: unknown;
  };
}

export interface RutubePlayerProps extends ManualStartPlayerProps {
  /** Full Rutube URL (video page or play/embed — the ID is extracted internally). */
  videoUrl: string;
  videoGap?: number; // Offset in MILLISECONDS (positive = video starts AFTER audio)
  onReady?: () => void;
  onTimeUpdate?: (_songTimeMs: number) => void;
  onEnded?: () => void;
  onAdStart?: () => void;
  onAdEnd?: () => void;
  onError?: (_errorCode: number) => void;
  isPlaying?: boolean;
  startTime?: number; // Start position in MILLISECONDS (song time)
  interactive?: boolean;
  muted?: boolean;
}

/** Imperative handle for parents that need to drive the player directly. */
export interface RutubePlayerHandle {
  seekTo: (_seconds: number) => void;
  getCurrentTime: () => number;
}

// Unique iframe ids — used for message filtering via event.source.
let iframeIdCounter = 0;

export const RutubePlayer = forwardRef<RutubePlayerHandle, RutubePlayerProps>(function RutubePlayer({
  videoUrl,
  videoGap = 0,
  onReady,
  onTimeUpdate,
  onEnded,
  onAdStart,
  onAdEnd,
  onError,
  isPlaying = true,
  startTime = 0,
  interactive = false,
  muted = false,
}, ref) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const iframeIdRef = useRef<string>(`rutube-player-${++iframeIdCounter}`);
  const [ready, setReady] = useState(false);

  const videoId = extractRutubeId(videoUrl);
  const videoGapSeconds = videoGap / 1000;
  const startSeconds = Math.max(0, (startTime / 1000) - videoGapSeconds);

  // ── Callback refs (avoid player re-init on identity changes) ──
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;
  const onTimeUpdateRef = useRef(onTimeUpdate);
  onTimeUpdateRef.current = onTimeUpdate;
  const onEndedRef = useRef(onEnded);
  onEndedRef.current = onEnded;
  const onAdStartRef = useRef(onAdStart);
  onAdStartRef.current = onAdStart;
  const onAdEndRef = useRef(onAdEnd);
  onAdEndRef.current = onAdEnd;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;

  // ── Playback state tracking (refs — no re-render churn) ──
  /** Last reported video time (seconds) + wall clock when it arrived (interpolation anchor). */
  const lastVideoTimeRef = useRef(0);
  const lastTimeWallRef = useRef<number | null>(null);
  /** Rutube-reported playing state (interpolation only runs while playing). */
  const playingStateRef = useRef(false);
  /** True once the start gate opened (video reached the song start position). */
  const gateOpenRef = useRef(false);
  /** True once Rutube fired player:playStart — the VIDEO itself started (after any ad). */
  const playStartReceivedRef = useRef(false);
  /** True while an onAdStart has been fired for the current gate (fires once per gate). */
  const gatePendingSignalledRef = useRef(false);
  /** Expected duration (seconds) once known — used to clamp interpolation. */
  const durationRef = useRef(0);
  const endedFiredRef = useRef(false);

  /** Post a command message to the Rutube iframe. */
  const postCommand = useCallback((type: string, data: Record<string, unknown> = {}) => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;
    try {
      iframe.contentWindow.postMessage(JSON.stringify({ type, data }), '*');
    } catch {
      // iframe not ready / cross-origin issue — ignore
    }
  }, []);

  useImperativeHandle(ref, () => ({
    seekTo: (seconds: number) => {
      if (!isFinite(seconds)) return;
      postCommand('player:setCurrentTime', { time: Math.max(0, seconds) });
    },
    getCurrentTime: () => lastVideoTimeRef.current,
  }), [postCommand]);

  // ── Event listener + iframe (re)creation on URL change ──
  useEffect(() => {
    gateOpenRef.current = false;
    gatePendingSignalledRef.current = false;
    lastVideoTimeRef.current = 0;
    lastTimeWallRef.current = null;
    playingStateRef.current = false;
    playStartReceivedRef.current = false;
    durationRef.current = 0;
    endedFiredRef.current = false;

    const handleTime = (videoTimeSeconds: number, durationSeconds?: number) => {
      if (typeof videoTimeSeconds !== 'number' || !isFinite(videoTimeSeconds)) return;
      if (typeof durationSeconds === 'number' && isFinite(durationSeconds) && durationSeconds > 0) {
        durationRef.current = durationSeconds;
      }
      lastVideoTimeRef.current = videoTimeSeconds;
      lastTimeWallRef.current = Date.now();

      // ── Start gate: open once the VIDEO started (playStart fires after any
      // pre-roll ad) AND its position reached the song start offset. Requiring
      // both prevents the gate from opening on ad-timeline time updates. ──
      if (!gateOpenRef.current && playStartReceivedRef.current
          && videoTimeSeconds >= Math.max(0.05, startSeconds - START_GATE_TOLERANCE_SECONDS)) {
        gateOpenRef.current = true;
        // If the gate was signalled as pending (game paused), release it now —
        // the same auto-resume flow as an ad ending.
        onAdEndRef.current?.();
      }

      // Emit song time only once the gate is open — before that the clock
      // would start during ads/seek-jitter.
      if (gateOpenRef.current) {
        onTimeUpdateRef.current?.(toSongTimeMs(videoTimeSeconds, videoGapSeconds, startTime));
      }
    };

    const handleMessage = (event: MessageEvent) => {
      // Robust filter: only messages from OUR iframe.
      if (event.source !== iframeRef.current?.contentWindow) return;
      let msg: RutubeMessage;
      try {
        msg = typeof event.data === 'string' ? JSON.parse(event.data) : (event.data as RutubeMessage);
      } catch {
        return; // not a Rutube player message
      }
      if (!msg || typeof msg.type !== 'string' || !msg.type.startsWith('player:')) return;
      const data = msg.data ?? {};

      switch (msg.type) {
        case 'player:ready':
          setReady(true);
          onReadyRef.current?.();
          break;

        case 'player:playStart':
          // Fires ONCE when the actual video starts (after any pre-roll ad).
          playStartReceivedRef.current = true;
          playingStateRef.current = true;
          break;

        case 'player:changeState': {
          const state = data.state;
          playingStateRef.current = state === 'playing';
          if (state === 'completed') {
            endedFiredRef.current = true;
            onEndedRef.current?.();
          }
          break;
        }

        case 'player:currentTime': {
          const t = typeof data.time === 'number' ? data.time
            : typeof data.currentTime === 'number' ? data.currentTime : undefined;
          handleTime(t ?? lastVideoTimeRef.current, data.duration);
          break;
        }

        case 'player:playComplete':
          if (!endedFiredRef.current) {
            endedFiredRef.current = true;
            onEndedRef.current?.();
          }
          break;

        case 'player:error': {
          // Rutube sends {message, type} — no unified code space. Map to the
          // YouTube-style codes the game screen already renders.
          const text = `${data.message ?? ''} ${data.type ?? ''}`.toLowerCase();
          if (text.includes('geo') || text.includes('country') || text.includes('region')) {
            onErrorRef.current?.(1000); // VIDEO_ERROR_GEO
          } else if (text.includes('not found') || text.includes('deleted') || text.includes('unavailable') || text.includes('404')) {
            onErrorRef.current?.(100);
          } else if (text.includes('private') || text.includes('permission') || text.includes('forbidden') || text.includes('403')) {
            onErrorRef.current?.(101);
          } else if (text.includes('18') || text.includes('adult')) {
            onErrorRef.current?.(1000); // age-gated → treated as restricted
          } else {
            onErrorRef.current?.(5);
          }
          break;
        }
      }
    };

    window.addEventListener('message', handleMessage);

    // No ad events → the gate is the ad-wait. When the game starts playing and
    // the gate is still closed (ad / not started), signal the wait ONCE.
    const gateWatchInterval = setInterval(() => {
      if (isPlayingRef.current && !gateOpenRef.current && !gatePendingSignalledRef.current) {
        gatePendingSignalledRef.current = true;
        onAdStartRef.current?.();
      }
    }, 250);

    // Interpolation: smooth 100ms song-time updates between currentTime events
    // (event cadence is ~250-500ms — too coarse for karaoke notes).
    const clockInterval = setInterval(() => {
      if (!gateOpenRef.current) return;
      const wall = lastTimeWallRef.current;
      if (wall === null || !playingStateRef.current) return;
      const interpolated = lastVideoTimeRef.current + (Date.now() - wall) / 1000;
      const clamped = durationRef.current > 0 ? Math.min(interpolated, durationRef.current) : interpolated;
      onTimeUpdateRef.current?.(toSongTimeMs(clamped, videoGapSeconds, startTime));
    }, 100);

    return () => {
      window.removeEventListener('message', handleMessage);
      clearInterval(gateWatchInterval);
      clearInterval(clockInterval);
    };
    // videoUrl (not videoId) is the dependency — stable per song URL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoUrl, videoGap, startTime]);

  // ── Play / pause driving (gate-aware: never pause while the gate is pending
  // or the video hasn't started — that would cancel the very playback whose
  // progress must open the gate) ──
  useEffect(() => {
    if (!ready) return;
    if (isPlaying) {
      postCommand('player:play');
    } else if (gateOpenRef.current) {
      postCommand('player:pause');
    }
  }, [isPlaying, ready, postCommand]);

  // ── Mute ──
  useEffect(() => {
    if (!ready) return;
    postCommand(muted ? 'player:mute' : 'player:unMute');
  }, [muted, ready, postCommand]);

  // ── Controls visibility (hide the UI chrome in non-interactive mode) ──
  useEffect(() => {
    if (!ready) return;
    postCommand(interactive ? 'player:showControls' : 'player:hideControls');
  }, [interactive, ready, postCommand]);

  if (!videoId) {
    // Unrecognized URL — surface as an embed error instead of a black screen.
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-black/60" role="alert">
        <p className="text-white/80 text-sm px-4 text-center">
          Rutube: video ID not found in URL
        </p>
      </div>
    );
  }

  const embedSrc = `https://rutube.ru/play/embed/${videoId}/?t=${Math.floor(startSeconds)}`;

  return (
    <iframe
      ref={iframeRef}
      id={iframeIdRef.current}
      src={embedSrc}
      title="Rutube video player"
      className="absolute inset-0 w-full h-full"
      style={{ border: 'none', pointerEvents: interactive ? 'auto' : 'none' }}
      allow="autoplay; fullscreen; encrypted-media"
      allowFullScreen
    />
  );
});

export default RutubePlayer;
