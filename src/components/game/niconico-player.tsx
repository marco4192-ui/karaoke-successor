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
 * JUKEBOX MODE (autoStart=true): the embed URL gains &autoplay=1 and the play
 * command is re-sent on loadComplete + retried periodically. Reason: the
 * isPlaying-driven 'play' postMessage sent at mount time is silently dropped
 * while the iframe is still loading (cross-origin target not reachable yet) —
 * without the re-send the video sits paused and the user had to press the
 * in-frame play button manually. When autoplay is still blocked after 12 s
 * (browser gesture policy), the manual-gate fallback engages via
 * onManualGateRequired and manualStartConfirmed runs the wall-clock song
 * clock. The karaoke GAME never passes autoStart (countdown-gated playback).
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

/** Jukebox auto-start: how long to wait for playback (API alive, play command
 *  sent) before falling back to the manual start gate. */
const AUTO_START_FALLBACK_MS = 12000;
/** Auto-start play-command retry cadence / budget. */
const PLAY_RETRY_INTERVAL_MS = 2000;
const PLAY_RETRY_BUDGET = 10;

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
  /** JUKEBOX mode: attempt automatic playback (autoplay=1 + play-command
   *  retries). The game does NOT pass this — playback there is countdown-gated. */
  autoStart?: boolean;
  /** Reports the video duration in SECONDS once known (jukebox progress bar). */
  onDuration?: (_seconds: number) => void;
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
  autoStart = false,
  onDuration,
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
  const onDurationRef = useRef(onDuration);
  onDurationRef.current = onDuration;
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;

  // Seek-once tracker (song-relative): seek to the start offset on the first
  // driven play. Declared before the event effect — loadComplete uses it.
  const seekedOnceForSongRef = useRef(false);

  // ── Playback state tracking ──
  /** API liveness: true once ANY event arrived from the embed player. */
  const apiAliveRef = useRef(false);
  /** True while operating in manual-gate fallback mode (API dead). */
  const manualModeRef = useRef(false);
  /** True when autoStart playback never materialized (autoplay blocked by the
   *  browser's gesture policy) → manual gate fallback with a live API. */
  const autoStartTimedOutRef = useRef(false);
  /** Combined "manual gate mode": API dead OR auto-start timed out. */
  const manualGateMode = () => manualModeRef.current || autoStartTimedOutRef.current;
  /** Render-visible mirror (the refs flip inside timeouts without a render;
   *  this state forces re-evaluation of the manual clock). */
  const [manualModeActive, setManualModeActive] = useState(false);
  const [autoStartTimedOut, setAutoStartTimedOut] = useState(false);
  const gateOpenRef = useRef(false);
  const gatePendingSignalledRef = useRef(false);
  const playingStatusRef = useRef(false);
  const lastVideoTimeRef = useRef(0);
  const expectedDurationRef = useRef(0);
  const endedFiredRef = useRef(false);
  const loadCompleteFiredRef = useRef(false);
  const manualConfirmedRef = useRef(manualStartConfirmed);
  manualConfirmedRef.current = manualStartConfirmed;

  // Manual fallback clock state — active in manual-gate mode (API dead OR
  // auto-start timed out) once the user confirmed the gate.
  const manualClockActive = isPlaying && manualStartConfirmed && (manualModeActive || autoStartTimedOut);
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
    autoStartTimedOutRef.current = false;
    manualGateEngagedRef.current = false;
    setManualModeActive(false);
    setAutoStartTimedOut(false);
    gateOpenRef.current = false;
    gatePendingSignalledRef.current = false;
    playingStatusRef.current = false;
    lastVideoTimeRef.current = 0;
    expectedDurationRef.current = 0;
    endedFiredRef.current = false;
    loadCompleteFiredRef.current = false;
    seekedOnceForSongRef.current = false;

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
            if (typeof len === 'number' && isFinite(len)) {
              expectedDurationRef.current = len;
              onDurationRef.current?.(len);
            }
            onReadyRef.current?.();
            // CRITICAL re-send: the isPlaying-driven 'play' command from the
            // mount-time effect is silently dropped while the iframe was still
            // loading (cross-origin postMessage to a not-yet-loaded document
            // never arrives) — without this the video sits paused and the user
            // had to press the in-frame play button manually.
            if (isPlayingRef.current) {
              postCommand('play');
              if (!seekedOnceForSongRef.current && startSeconds > 0.2) {
                seekedOnceForSongRef.current = true;
                postCommand('seek', { time: startSeconds });
              }
            }
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

    // Auto-start retries: while playback is wanted, the API is alive and the
    // gate hasn't opened, re-send the play command periodically (the first
    // command can be dropped or ignored before the player is interactive).
    // Bounded — a permanently rejecting player falls back to the manual gate.
    let playRetries = 0;
    const playRetryInterval = setInterval(() => {
      if (manualGateMode() || gateOpenRef.current || !isPlayingRef.current) return;
      if (!apiAliveRef.current) return; // target not loaded yet — loadComplete re-sends
      if (++playRetries > PLAY_RETRY_BUDGET) return;
      postCommand('play');
    }, PLAY_RETRY_INTERVAL_MS);

    // Auto-start fallback (jukebox only): API alive + playback wanted, but the
    // gate STILL hasn't opened after 12 s (autoplay blocked by the browser's
    // gesture policy) → engage the manual gate; confirmation runs the manual
    // clock while the start-assist restart re-attempts autoplay with a fresh
    // user gesture. The game never passes autoStart → unaffected.
    const autoStartTimeout = autoStart
      ? setTimeout(() => {
          if (!manualModeRef.current && !autoStartTimedOutRef.current
              && !gateOpenRef.current && isPlayingRef.current) {
            // eslint-disable-next-line no-console
            console.warn('[Niconico] Auto-start did not engage — falling back to manual start gate');
            autoStartTimedOutRef.current = true;
            setAutoStartTimedOut(true);
            onManualGateRequiredRef.current?.();
          }
        }, AUTO_START_FALLBACK_MS)
      : null;

    return () => {
      window.removeEventListener('message', handleMessage);
      clearInterval(gateWatchInterval);
      clearInterval(playRetryInterval);
      clearTimeout(apiDeadTimeout);
      if (autoStartTimeout) clearTimeout(autoStartTimeout);
    };
    // videoUrl is the dependency — stable per song URL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoUrl, videoGap, startTime]);

  // ── Manual-gate fallback (API dead or auto-start timed out) — same edge logic as Bilibili. ──
  // CRITICAL: the "engaged" tracker must NOT depend on isPlaying — the
  // ad-wait machinery pauses the game when the gate engages; a pending flag
  // derived from isPlaying would reset and swallow the confirmation release.
  const manualGateEngagedRef = useRef(false);
  useEffect(() => {
    if ((manualModeActive || autoStartTimedOut) && isPlaying && !manualStartConfirmed && !manualGateEngagedRef.current) {
      manualGateEngagedRef.current = true;
      onAdStartRef.current?.();
    }
  }, [isPlaying, manualStartConfirmed, manualModeActive, autoStartTimedOut]);

  useEffect(() => {
    if (manualStartConfirmed && manualGateEngagedRef.current) {
      manualGateEngagedRef.current = false;
      onAdEndRef.current?.();
    }
  }, [manualStartConfirmed]);

  // ── Play / pause driving (API mode; manual mode has no programmatic start) ──
  useEffect(() => {
    if (manualGateMode()) return;
    if (isPlaying) {
      postCommand('play');
      // Seek to the song start once on the first driven play.
      if (!seekedOnceForSongRef.current && startSeconds > 0.2) {
        seekedOnceForSongRef.current = true;
        postCommand('seek', { time: startSeconds });
      }
    } else if (gateOpenRef.current || playingStatusRef.current) {
      // Pause when the gate already opened OR the user started playback
      // in-frame (manual-gate fallback with a live API).
      postCommand('pause');
    }
  }, [isPlaying, startSeconds, postCommand]);

  // ── Mute (API mode — works in manual-gate mode too) ──
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

  const embedSrc = `${NICONICO_EMBED_ORIGIN}/watch/${videoId}?jsapi=1&playerId=${encodeURIComponent(playerIdRef.current)}${autoStart ? '&autoplay=1' : ''}`;

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
