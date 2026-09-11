'use client';

import { useEffect, useRef, useState, forwardRef, useImperativeHandle, useCallback } from 'react';
import { extractNiconicoId } from '@/lib/url-utils';
import {
  START_GATE_TOLERANCE_SECONDS,
  API_DEAD_TIMEOUT_MS,
  useManualSongClock,
  toSongTimeMs,
  type ManualStartPlayerProps,
} from '@/components/game/platform-player-shared';

/**
 * Niconico player component — mirrors the YouTubePlayer prop interface.
 *
 * Uses Niconico's UNOFFICIAL embed player API (embed.nicovideo.jp/watch/{id}
 * ?jsapi=1&playerId={id}). Reverse-engineered reference (Zenn xpadev, 2023 +
 * nanoway article). Because it is unofficial it can break silently with player
 * updates — this component feature-detects API liveness and falls back to the
 * manual start gate (same UX as Bilibili) when no events arrive.
 *
 * Protocol (all via window.postMessage):
 *   Events  (iframe → parent, origin https://embed.nicovideo.jp):
 *     { eventName, playerId, sourceConnectorType: 0, data }
 *     - loadComplete          → data.videoInfo { lengthInSeconds, title, videoId, … }
 *     - playerMetadataChange  → data { currentTime, duration, muted, volume, … }
 *     - playerStatusChange    → data.playerStatus: 1 loading · 2 playing · 3 paused · 4 ended
 *     - error                 → data { code, message } (possibly_deleted_video,
 *                               externally_unwatchable [channel videos], …)
 *   Commands (parent → iframe, sourceConnectorType: 1):
 *     { eventName: 'play' | 'pause', playerId }
 *     { eventName: 'seek', data: { time }, playerId }
 *     { eventName: 'mute', data: { mute: true|false }, playerId }
 *
 * Start gate: playerStatusChange=2 (playing) AND currentTime reaching the song
 * start offset AND the reported duration matching the real video (ad timelines
 * are far shorter) — belt and suspenders against pre-roll ad positions.
 *
 * Known embed limitations (surfaced as errors):
 *   - Channel videos → error code 'externally_unwatchable' → 101 (not embeddable)
 *   - Premium-exclusive / paid videos are not embeddable at all
 */

const NICONICO_EMBED_ORIGIN = 'https://embed.nicovideo.jp';

// ── Message shapes (subset we consume) ──
interface NiconicoMessage {
  eventName?: string;
  playerId?: string;
  sourceConnectorType?: number;
  data?: {
    playerStatus?: number;
    currentTime?: number;
    duration?: number;
    muted?: boolean;
    volume?: number;
    code?: string;
    message?: string;
    videoInfo?: {
      lengthInSeconds?: number;
      title?: string;
      videoId?: string;
    };
    [key: string]: unknown;
  };
}

export interface NiconicoPlayerProps extends ManualStartPlayerProps {
  /** Full Niconico URL (watch page or embed — the id is extracted internally). */
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
export interface NiconicoPlayerHandle {
  seekTo: (_seconds: number) => void;
  getCurrentTime: () => number;
}

// Unique player ids — the embed echoes `playerId` on every message.
let playerIdCounter = 0;

export const NiconicoPlayer = forwardRef<NiconicoPlayerHandle, NiconicoPlayerProps>(function NiconicoPlayer({
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
  muted = false,
  manualStartConfirmed = false,
  onManualGateRequired,
}, ref) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const playerIdRef = useRef<string>(`niconico-player-${++playerIdCounter}-${Date.now().toString(36)}`);

  const videoId = extractNiconicoId(videoUrl);
  const videoGapSeconds = videoGap / 1000;
  const startSeconds = Math.max(0, (startTime / 1000) - videoGapSeconds);

  // ── Callback refs ──
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
  const onManualGateRequiredRef = useRef(onManualGateRequired);
  onManualGateRequiredRef.current = onManualGateRequired;
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;

  // ── Playback state tracking ──
  /** API liveness: true once ANY event arrived from the embed player. */
  const apiAliveRef = useRef(false);
  /** True while operating in manual-gate fallback mode (API dead). */
  const manualModeRef = useRef(false);
  /** Render-visible mirror of manualModeRef (the ref flips inside a timeout
   *  without a render; this state forces re-evaluation of the manual clock). */
  const [manualModeActive, setManualModeActive] = useState(false);
  const gateOpenRef = useRef(false);
  const gatePendingSignalledRef = useRef(false);
  const playingStatusRef = useRef(false);
  const lastVideoTimeRef = useRef(0);
  const expectedDurationRef = useRef(0);
  const endedFiredRef = useRef(false);
  const loadCompleteFiredRef = useRef(false);
  const manualConfirmedRef = useRef(manualStartConfirmed);
  manualConfirmedRef.current = manualStartConfirmed;

  // Manual fallback clock state.
  const manualClockActive = isPlaying && manualStartConfirmed && manualModeActive;
  const currentSongTimeMsRef = useRef(startTime);

  useManualSongClock({
    startOffsetMs: startTime,
    active: manualClockActive,
    onTick: (songTimeMs) => {
      currentSongTimeMsRef.current = songTimeMs;
      onTimeUpdateRef.current?.(songTimeMs);
    },
  });

  /** Post a command message to the Niconico iframe. */
  const postCommand = useCallback((eventName: string, data: Record<string, unknown> = {}) => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;
    try {
      iframe.contentWindow.postMessage(
        { eventName, data, playerId: playerIdRef.current, sourceConnectorType: 1 },
        NICONICO_EMBED_ORIGIN,
      );
    } catch {
      // iframe not ready — ignore
    }
  }, []);

  useImperativeHandle(ref, () => ({
    seekTo: (seconds: number) => {
      if (!isFinite(seconds)) return;
      postCommand('seek', { time: Math.max(0, seconds) });
    },
    getCurrentTime: () => manualModeRef.current ? currentSongTimeMsRef.current : lastVideoTimeRef.current,
  }), [postCommand]);

  // ── Event listener + reset on URL change ──
  useEffect(() => {
    apiAliveRef.current = false;
    manualModeRef.current = false;
    manualGateEngagedRef.current = false;
    setManualModeActive(false);
    gateOpenRef.current = false;
    gatePendingSignalledRef.current = false;
    playingStatusRef.current = false;
    lastVideoTimeRef.current = 0;
    expectedDurationRef.current = 0;
    endedFiredRef.current = false;
    loadCompleteFiredRef.current = false;

    const handleTime = (videoTimeSeconds: number, durationSeconds?: number) => {
      if (typeof videoTimeSeconds !== 'number' || !isFinite(videoTimeSeconds)) return;
      lastVideoTimeRef.current = videoTimeSeconds;

      // Ad heuristic: the reported duration must plausibly match the real
      // video duration (from loadComplete). Pre-roll ads report a far shorter
      // duration — during ads the gate must NOT open even if time flows.
      const durationOk = !expectedDurationRef.current || !durationSeconds
        || durationSeconds >= expectedDurationRef.current * 0.8;

      // ── Start gate ──
      if (!gateOpenRef.current && playingStatusRef.current && durationOk
          && videoTimeSeconds >= Math.max(0.05, startSeconds - START_GATE_TOLERANCE_SECONDS)) {
        gateOpenRef.current = true;
        onAdEndRef.current?.();
      }

      if (gateOpenRef.current) {
        onTimeUpdateRef.current?.(toSongTimeMs(videoTimeSeconds, videoGapSeconds, startTime));
      }
    };

    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== NICONICO_EMBED_ORIGIN) return;
      const msg = event.data as NiconicoMessage;
      if (!msg || typeof msg.eventName !== 'string') return;
      // playerId filter — but stay lenient if the player omits it.
      if (msg.playerId && msg.playerId !== playerIdRef.current) return;

      apiAliveRef.current = true;
      const data = msg.data ?? {};

      switch (msg.eventName) {
        case 'loadComplete': {
          if (!loadCompleteFiredRef.current) {
            loadCompleteFiredRef.current = true;
            const len = data.videoInfo?.lengthInSeconds;
            if (typeof len === 'number' && isFinite(len)) expectedDurationRef.current = len;
            onReadyRef.current?.();
          }
          break;
        }

        case 'playerStatusChange': {
          const status = data.playerStatus;
          playingStatusRef.current = status === 2;
          if (status === 4 && !endedFiredRef.current) {
            endedFiredRef.current = true;
            onEndedRef.current?.();
          }
          break;
        }

        case 'playerMetadataChange': {
          handleTime(data.currentTime ?? lastVideoTimeRef.current, data.duration);
          break;
        }

        case 'error': {
          const code = `${data.code ?? ''}`.toLowerCase();
          const text = `${data.message ?? ''}`.toLowerCase();
          if (code === 'possibly_deleted_video' || text.includes('deleted') || text.includes('視聴できない')) {
            onErrorRef.current?.(100);
          } else if (code === 'externally_unwatchable') {
            // Channel videos cannot be embedded
            onErrorRef.current?.(101);
          } else {
            onErrorRef.current?.(5);
          }
          break;
        }
      }
    };

    window.addEventListener('message', handleMessage);

    // Start gate watcher (API mode): signal the game-wait when playback is
    // wanted but the gate hasn't opened yet (ad / slow start / autoplay gate).
    const gateWatchInterval = setInterval(() => {
      if (manualModeRef.current) return;
      if (isPlayingRef.current && !gateOpenRef.current && !gatePendingSignalledRef.current) {
        gatePendingSignalledRef.current = true;
        onAdStartRef.current?.();
      }
    }, 250);

    // API-dead detection: if the game is playing but NO event ever arrived,
    // the unofficial API broke (player update) → switch to manual gate mode.
    const apiDeadTimeout = setTimeout(() => {
      if (!apiAliveRef.current && isPlayingRef.current) {
        // eslint-disable-next-line no-console
        console.warn('[Niconico] No API events received — switching to manual start gate');
        manualModeRef.current = true;
        setManualModeActive(true);
        gatePendingSignalledRef.current = false;
        onManualGateRequiredRef.current?.();
      }
    }, API_DEAD_TIMEOUT_MS);

    return () => {
      window.removeEventListener('message', handleMessage);
      clearInterval(gateWatchInterval);
      clearTimeout(apiDeadTimeout);
    };
    // videoUrl is the dependency — stable per song URL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoUrl, videoGap, startTime]);

  // ── Manual-gate fallback (API dead) — same edge logic as Bilibili. ──
  // CRITICAL: the "engaged" tracker must NOT depend on isPlaying — the
  // ad-wait machinery pauses the game when the gate engages; a pending flag
  // derived from isPlaying would reset and swallow the confirmation release.
  const manualGateEngagedRef = useRef(false);
  useEffect(() => {
    if (manualModeRef.current && isPlaying && !manualStartConfirmed && !manualGateEngagedRef.current) {
      manualGateEngagedRef.current = true;
      onAdStartRef.current?.();
    }
  }, [isPlaying, manualStartConfirmed]);

  useEffect(() => {
    if (manualStartConfirmed && manualGateEngagedRef.current) {
      manualGateEngagedRef.current = false;
      onAdEndRef.current?.();
    }
  }, [manualStartConfirmed]);

  // ── Play / pause driving (API mode; manual mode has no programmatic start) ──
  useEffect(() => {
    if (manualModeRef.current) return;
    if (isPlaying) {
      postCommand('play');
      // Seek to the song start once on the first driven play.
      if (!seekedOnceForSongRef.current && startSeconds > 0.2) {
        seekedOnceForSongRef.current = true;
        postCommand('seek', { time: startSeconds });
      }
    } else if (gateOpenRef.current) {
      postCommand('pause');
    }
  }, [isPlaying, startSeconds, postCommand]);
  const seekedOnceForSongRef = useRef(false);
  useEffect(() => {
    seekedOnceForSongRef.current = false;
  }, [videoUrl]);

  // ── Mute (API mode) ──
  useEffect(() => {
    if (manualModeRef.current) return;
    postCommand('mute', { mute: muted });
  }, [muted, postCommand]);

  if (!videoId) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-black/60" role="alert">
        <p className="text-white/80 text-sm px-6 text-center max-w-md">
          Niconico: video id not found — use the full nicovideo.jp/watch/sm… URL
        </p>
      </div>
    );
  }

  const embedSrc = `${NICONICO_EMBED_ORIGIN}/watch/${videoId}?jsapi=1&playerId=${encodeURIComponent(playerIdRef.current)}`;

  return (
    <iframe
      ref={iframeRef}
      src={embedSrc}
      title="Niconico video player"
      className="absolute inset-0 w-full h-full"
      // Interactive by default — Niconico embeds often gate autoplay behind a
      // user gesture, so the user must be able to click play inside the iframe.
      style={{ border: 'none', pointerEvents: 'auto' }}
      allow="autoplay; fullscreen; encrypted-media"
      allowFullScreen
    />
  );
});

export default NiconicoPlayer;
