'use client';

import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';

/**
 * Dailymotion player component — mirrors the YouTubePlayer prop interface
 * so GameBackground can dispatch to it without wrapper gymnastics.
 *
 * Uses the OFFICIAL Dailymotion Player Library Script
 * (https://geo.dailymotion.com/libs/player.js → window.dailymotion.createPlayer()).
 *
 * IMPORTANT (verified against the live SDK, 2024+ "PES" architecture):
 * - The Library Script lives at /libs/player.js. The plain /player.js URL is the
 *   Player-Embed-Script bootstrap which NEVER defines the programmatic API
 *   (it only prints "please use Library Script instead").
 * - The public namespace is `window.dailymotion` (NOT the legacy `window.DM`).
 * - `createPlayer(containerId, config)` is ASYNC and resolves a player facade
 *   exposing play()/pause()/seek()/setMute()/setVolume()/on()/off()/destroy().
 * - Event payloads are FLAT objects (e.g. `videoTime`, `videoDuration`,
 *   `playerError: { title, message, code }`).
 * - Official AD events (ad_start / ad_end / ad_error) — the core of the
 *   "Einblendung über dailymotion.com" overlay + game-wait behaviour.
 */

// ── Minimal typings for the Dailymotion SDK ──
interface DMPlayer {
  play(): void;
  pause(): void;
  seek(_seconds: number): void;
  setMute(_muted: boolean): void;
  setVolume(_volume: number): void;
  destroy(): void;
  on(_event: string, _callback: (_payload?: DMEventPayload) => void, _opts?: { once?: boolean }): unknown;
  off(_event: string, _callback?: (_payload?: DMEventPayload) => void): unknown;
  getState(): Promise<DMEventPayload | null>;
}

/** Flat event payload shape of the modern SDK (subset of ~80 fields). */
interface DMEventPayload {
  videoTime?: number;
  videoDuration?: number;
  adTime?: number;
  adDuration?: number;
  adIsPlaying?: boolean;
  playerIsPlaying?: boolean;
  playerIsMuted?: boolean;
  playerError?: { code?: string; title?: string; message?: string };
  [key: string]: unknown;
}

interface DailymotionNamespace {
  createPlayer(
    _elementId: string,
    _options: {
      video: string;
      width?: string | number;
      height?: string | number;
      params?: Record<string, string | number | boolean>;
    }
  ): Promise<DMPlayer>;
}

declare global {
  interface Window {
    dailymotion?: DailymotionNamespace;
  }
}

export interface DailymotionPlayerProps {
  /** Full Dailymotion URL (any supported format — the ID is extracted internally). */
  videoUrl: string;
  videoGap?: number; // Offset in MILLISECONDS (positive = video starts AFTER audio)
  onReady?: () => void;
  onTimeUpdate?: (_currentTime: number) => void;
  onEnded?: () => void;
  onAdStart?: () => void;
  onAdEnd?: () => void;
  onError?: (_errorCode: number) => void;
  isPlaying?: boolean;
  startTime?: number; // Start position in MILLISECONDS (song time)
  interactive?: boolean; // Allow user interaction (needed to click skippable ads)
  muted?: boolean;
  /** Playback volume 0..1 — applied when defined (jukebox). Undefined = player default. */
  volume?: number;
}

/** Imperative handle for parents that need to drive the player directly. */
export interface DailymotionPlayerHandle {
  seekTo: (_seconds: number) => void;
  getCurrentTime: () => number;
}

/** Load-queue shared by all Dailymotion player instances (script loads once). */
let sdkLoadState: 'idle' | 'loading' | 'ready' = 'idle';
const sdkReadyCallbacks: Array<() => void> = [];

function isSdkReady(): boolean {
  return typeof window !== 'undefined' && !!window.dailymotion?.createPlayer;
}

function loadDailymotionSdk(onReady: () => void): void {
  if (typeof window === 'undefined') return;
  if (sdkLoadState === 'ready' || isSdkReady()) {
    sdkLoadState = 'ready';
    onReady();
    return;
  }
  sdkReadyCallbacks.push(onReady);
  if (sdkLoadState === 'loading') return;
  sdkLoadState = 'loading';

  const finish = () => {
    if (isSdkReady()) {
      sdkLoadState = 'ready';
      sdkReadyCallbacks.splice(0).forEach(cb => cb());
    }
  };

  const script = document.createElement('script');
  script.id = 'dailymotion-player-sdk';
  // Library Script (NOT /player.js — that is the embed bootstrap without the JS API)
  script.src = 'https://geo.dailymotion.com/libs/player.js';
  script.async = true;
  script.onload = finish;
  script.onerror = () => {
    // eslint-disable-next-line no-console
    console.warn('[Dailymotion] SDK script failed to load — retrying via polling');
    const poll = setInterval(() => {
      if (isSdkReady()) {
        clearInterval(poll);
        finish();
      }
    }, 250);
    setTimeout(() => clearInterval(poll), 15000);
  };
  document.head.appendChild(script);
}

/**
 * Map a Dailymotion error to the unified (YouTube-style) error code space.
 * Official DM player error codes (verified against the SDK):
 * DM001 no video specified · DM002 deleted · DM007 GEO-restricted ·
 * DM010 private · DM004 copyrighted/forbidden · DM008/DM009 explicit.
 */
function mapDailymotionError(payload?: DMEventPayload): number {
  const err = payload?.playerError;
  const code = typeof err?.code === 'string' ? err.code.toUpperCase() : '';
  const message = `${err?.title ?? ''} ${err?.message ?? ''}`.toLowerCase();

  if (code === 'DM007') return 1000; // geo-restricted by its owner
  if (code === 'DM010') return 101; // private content
  if (code === 'DM001' || code === 'DM002' || code === 'DM005') return 100; // gone/deleted/rejected
  if (code === 'DM004' || code === 'DM008' || code === 'DM009') return 101; // forbidden

  if (message.includes('geo') || message.includes('country') || message.includes('region')) return 1000; // VIDEO_ERROR_GEO
  if (message.includes('private') || message.includes('not found') || message.includes('no longer available') || message.includes('404')) return 100;
  if (message.includes('permission') || message.includes('403') || message.includes('not allowed') || message.includes('forbidden')) return 101;
  return 5;
}

/** Extract a Dailymotion video ID from any supported URL format. */
function extractVideoId(url: string): string {
  const m = url.match(/dailymotion\.com\/(?:embed\/)?video\/([a-zA-Z0-9]+)/i)
    ?? url.match(/dai\.ly\/([a-zA-Z0-9]+)/i);
  return m?.[1] ?? url;
}

// Unique DOM ids for createPlayer() (it looks the element up by `#id`).
let containerIdCounter = 0;

export const DailymotionPlayer = forwardRef<DailymotionPlayerHandle, DailymotionPlayerProps>(function DailymotionPlayer({
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
  volume,
}, ref) {
  const containerRef = useRef<HTMLDivElement>(null);
  // Stable, querySelector-safe id for the lifetime of this component instance.
  const containerIdRef = useRef<string>(`dm-player-${++containerIdCounter}-${Date.now().toString(36)}`);
  const playerRef = useRef<DMPlayer | null>(null);
  const [sdkReady, setSdkReady] = useState(false);
  /** True while a player facade exists — gates mute/volume effects so early
   *  calls can't hit a not-yet-created player (createPlayer is async). */
  const [playerActive, setPlayerActive] = useState(false);
  const timeUpdateIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastTimeRef = useRef<number>(0);

  // Callback props in refs to avoid re-initialization on identity changes
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
  const mutedRef = useRef(muted);
  mutedRef.current = muted;
  const volumeRef = useRef(volume);
  volumeRef.current = volume;
  const adActiveRef = useRef(false);

  useImperativeHandle(ref, () => ({
    seekTo: (seconds: number) => {
      const p = playerRef.current;
      if (!p || !isFinite(seconds)) return;
      try { p.seek(Math.max(0, seconds)); } catch { /* Player not ready */ }
    },
    getCurrentTime: () => lastTimeRef.current,
  }), []);

  // Extract the video ID from the URL (kept OUTSIDE the effect so the
  // dependency stays the raw URL — the ID is stable per URL).
  const videoId = extractVideoId(videoUrl);

  // ── SDK loading ──
  useEffect(() => {
    if (typeof window === 'undefined') return;
    loadDailymotionSdk(() => setSdkReady(true));
  }, []);

  // ── Player lifecycle (create on URL change, destroy on cleanup) ──
  useEffect(() => {
    if (!sdkReady || !containerRef.current || !window.dailymotion?.createPlayer) return;

    let cancelled = false;
    const container = containerRef.current;
    // createPlayer() requires an element ID — assign our stable instance id.
    container.id = containerIdRef.current;
    // The SDK injects the player wrapper INTO the element — clear stale content
    container.innerHTML = '';
    adActiveRef.current = false;
    lastTimeRef.current = 0;

    const videoGapSeconds = videoGap / 1000;
    const adjustedStartSeconds = Math.max(0, (startTime / 1000) - videoGapSeconds);

    const runWhenReady = (p: DMPlayer) => {
      if (cancelled) return;
      playerRef.current = p;
      setPlayerActive(true);

      const safeTime = (): number => lastTimeRef.current;

      // 'playback_ready' replaces the legacy 'apiready' event. play() calls
      // issued BEFORE this point are silently dropped by the SDK.
      p.on('playback_ready', () => {
        if (cancelled) return;
        try {
          if (isPlayingRef.current) p.play();
        } catch { /* ignore */ }
        try { p.setMute(mutedRef.current); } catch { /* ignore */ }
        // Initial volume (0..1, official SDK facade) — set while muted it
        // becomes the restore target for a later unmute.
        if (volumeRef.current !== undefined) {
          try { p.setVolume(Math.min(1, Math.max(0, volumeRef.current))); } catch { /* ignore */ }
        }
        // Seek to the start offset once the player is ready
        if (adjustedStartSeconds > 0.2) {
          try { p.seek(adjustedStartSeconds); } catch { /* ignore */ }
        }
        onReadyRef.current?.();
      });

      // The SDK fires 'end' (player-level) AND 'video_end' — listen to both,
      // fire the callback once.
      let endedFired = false;
      const handleEnded = () => {
        if (cancelled || endedFired) return;
        endedFired = true;
        onEndedRef.current?.();
      };
      p.on('end', handleEnded);
      p.on('video_end', handleEnded);

      // ── OFFICIAL ad events — the core of the ad-wait feature ──
      p.on('ad_start', () => {
        adActiveRef.current = true;
        onAdStartRef.current?.();
      });
      p.on('ad_end', () => {
        adActiveRef.current = false;
        onAdEndRef.current?.();
      });
      p.on('ad_error', () => {
        // A failed ad still counts as "ad over" — the game may resume.
        adActiveRef.current = false;
        onAdEndRef.current?.();
      });

      p.on('timeupdate', (payload) => {
        const t = payload?.videoTime;
        if (typeof t === 'number' && isFinite(t) && t > 0) lastTimeRef.current = t;
      });

      p.on('error', (payload) => {
        // eslint-disable-next-line no-console
        console.error('[Dailymotion] Player error:', payload?.playerError?.title ?? payload?.playerError?.message ?? 'unknown');
        onErrorRef.current?.(mapDailymotionError(payload));
      });

      // Time polling (100ms — same cadence as the YouTube player). The event
      // cadence (~330ms) alone is too coarse for karaoke sync; getState() is a
      // fast async (~3ms) snapshot that includes videoTime.
      if (timeUpdateIntervalRef.current) clearInterval(timeUpdateIntervalRef.current);
      timeUpdateIntervalRef.current = setInterval(() => {
        if (!playerRef.current || adActiveRef.current || cancelled) return; // freeze during ads
        playerRef.current.getState().then(state => {
          if (cancelled || adActiveRef.current) return;
          const t = typeof state?.videoTime === 'number' ? state.videoTime : safeTime();
          if (t > 0) {
            lastTimeRef.current = t;
            const songTime = (t + videoGapSeconds) * 1000;
            onTimeUpdateRef.current?.(songTime);
          }
        }).catch(() => { /* not ready */ });
      }, 100);
    };

    void window.dailymotion.createPlayer(containerIdRef.current, {
      video: videoId,
      width: '100%',
      height: '100%',
      params: {
        autoplay: false, // playback is driven by isPlaying (user-gesture compliant)
        mute: false,
        'ui-start-screen-info': false,
        'endscreen-enable': false,
      },
    }).then(player => {
      if (cancelled) {
        // Effect was cleaned up while the player was being created
        try { player.destroy(); } catch { /* ignore */ }
        return;
      }
      runWhenReady(player);
    }).catch(err => {
      // eslint-disable-next-line no-console
      console.error('[Dailymotion] Failed to create player:', err);
      onErrorRef.current?.(5);
    });

    return () => {
      cancelled = true;
      setPlayerActive(false);
      if (timeUpdateIntervalRef.current) {
        clearInterval(timeUpdateIntervalRef.current);
        timeUpdateIntervalRef.current = null;
      }
      if (playerRef.current) {
        try { playerRef.current.destroy(); } catch { /* ignore */ }
        playerRef.current = null;
      }
      container.innerHTML = '';
    };
    // videoUrl (not videoId) is the dependency — stable per song URL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sdkReady, videoUrl, videoGap, startTime, interactive]);

  // ── Play / pause ──
  useEffect(() => {
    const p = playerRef.current;
    if (!p) return;
    try {
      if (isPlaying && !adActiveRef.current) p.play();
      else p.pause();
    } catch { /* Player not ready */ }
  }, [isPlaying]);

  // ── Mute ──
  useEffect(() => {
    const p = playerRef.current;
    if (!p) return;
    try { p.setMute(muted); } catch { /* Player not ready */ }
  }, [muted]);

  // ── Volume (jukebox) — 0..1, applied without re-creating the player ──
  useEffect(() => {
    if (volume === undefined) return;
    const p = playerRef.current;
    if (!p || !playerActive) return;
    try {
      p.setVolume(Math.min(1, Math.max(0, volume)));
    } catch { /* Player not ready */ }
  }, [volume, playerActive]);

  return (
    <div
      ref={containerRef}
      id={containerIdRef.current}
      className="absolute inset-0 w-full h-full"
      style={{ pointerEvents: interactive ? 'auto' : 'none' }}
      aria-label="Dailymotion video player"
    />
  );
});

export default DailymotionPlayer;
