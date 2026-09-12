'use client';

import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { extractVimeoRef } from '@/lib/url-utils';

/**
 * Vimeo player component — mirrors the YouTubePlayer prop interface.
 *
 * Uses the official @vimeo/player SDK (player.vimeo.com/api/player.js).
 * Vimeo embeds are AD-FREE (ads exist only in Vimeo's own monetization
 * programmes), so the ad callbacks never fire — they are kept for
 * interface parity with the other platform players.
 *
 * Playback restrictions (private / domain-locked / geo-blocked videos)
 * surface through the SDK's 'error' event and are mapped to the unified
 * error-code space (101 = embed restricted, 100 = not found/private,
 * 1000 = geo-restricted, 5 = generic player error).
 */

// ── Minimal typings for the Vimeo player SDK ──
interface VimeoPlayerInstance {
  play(): Promise<void>;
  pause(): Promise<void>;
  setCurrentTime(_seconds: number): Promise<number>;
  getCurrentTime(): Promise<number>;
  getDuration(): Promise<number>;
  setMuted(_muted: boolean): Promise<boolean>;
  setVolume(_volume: number): Promise<number>;
  destroy(): Promise<void>;
  on(_event: string, _callback: (_e: Record<string, unknown>) => void): void;
  off?(_event: string, _callback: unknown): void;
  ready?(): Promise<void>;
}

interface VimeoNamespace {
  Player: new (_element: HTMLElement | string, _options?: Record<string, unknown>) => VimeoPlayerInstance;
}

declare global {
  interface Window {
    Vimeo?: VimeoNamespace;
  }
}

export interface VimeoPlayerProps {
  /** Full Vimeo URL (vimeo.com/ID, vimeo.com/ID/hash, player.vimeo.com/video/ID?h=…). */
  videoUrl: string;
  videoGap?: number; // Offset in MILLISECONDS (positive = video starts AFTER audio)
  onReady?: () => void;
  onTimeUpdate?: (_currentTime: number) => void;
  onEnded?: () => void;
  onAdStart?: () => void; // never fires — Vimeo embeds are ad-free (interface parity)
  onAdEnd?: () => void; // never fires — interface parity
  onError?: (_errorCode: number) => void;
  isPlaying?: boolean;
  startTime?: number; // Start position in MILLISECONDS (song time)
  interactive?: boolean; // Allow user interaction with the player controls
  muted?: boolean;
  /** Playback volume 0..1 — applied when defined (jukebox). Undefined = player default. */
  volume?: number;
}

/** Imperative handle for parents that need to drive the player directly. */
export interface VimeoPlayerHandle {
  seekTo: (_seconds: number) => void;
  getCurrentTime: () => number;
}

/** Load-queue shared by all Vimeo player instances (script loads once). */
let sdkLoadState: 'idle' | 'loading' | 'ready' = 'idle';
const sdkReadyCallbacks: Array<() => void> = [];

function loadVimeoSdk(onReady: () => void): void {
  if (typeof window === 'undefined') return;
  if (sdkLoadState === 'ready') {
    onReady();
    return;
  }
  sdkReadyCallbacks.push(onReady);
  if (sdkLoadState === 'loading') return;
  sdkLoadState = 'loading';

  const finish = () => {
    if (window.Vimeo?.Player) {
      sdkLoadState = 'ready';
      sdkReadyCallbacks.splice(0).forEach(cb => cb());
    }
  };

  const script = document.createElement('script');
  script.id = 'vimeo-player-sdk';
  script.src = 'https://player.vimeo.com/api/player.js';
  script.async = true;
  script.onload = finish;
  script.onerror = () => {
    // eslint-disable-next-line no-console
    console.warn('[Vimeo] SDK script failed to load — retrying via polling');
    const poll = setInterval(() => {
      if (window.Vimeo?.Player) {
        clearInterval(poll);
        finish();
      }
    }, 250);
    setTimeout(() => clearInterval(poll), 15000);
  };
  document.head.appendChild(script);
}

/** Map a Vimeo error ({name, message}) to the unified error-code space. */
function mapVimeoError(e: Record<string, unknown>): number {
  const name = String(e.name ?? e.errorName ?? '');
  const message = String(e.message ?? '').toLowerCase();
  if (name === 'GeoRestrictedError' || message.includes('geo')) return 1000; // VIDEO_ERROR_GEO
  if (name === 'NotAllowedError') return 101; // domain-locked / embed not allowed
  if (name === 'PrivateError' || name === 'PasswordError' || name === 'NotFoundError') return 100;
  if (message.includes('permission') || message.includes('not allowed') || message.includes('domain')) return 101;
  return 5;
}

export const VimeoPlayer = forwardRef<VimeoPlayerHandle, VimeoPlayerProps>(function VimeoPlayer({
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
  const playerRef = useRef<VimeoPlayerInstance | null>(null);
  const [sdkReady, setSdkReady] = useState(false);
  /** Flips true once the current player instance fired 'loaded' — gates the
   *  volume/mute effects so early calls don't hit a not-yet-loaded player. */
  const [playerLoaded, setPlayerLoaded] = useState(false);
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

  useImperativeHandle(ref, () => ({
    seekTo: (seconds: number) => {
      const p = playerRef.current;
      if (!p || !isFinite(seconds)) return;
      p.setCurrentTime(Math.max(0, seconds)).catch(() => { /* not ready */ });
    },
    getCurrentTime: () => lastTimeRef.current,
  }), []);

  // ── SDK loading ──
  useEffect(() => {
    if (typeof window === 'undefined') return;
    loadVimeoSdk(() => setSdkReady(true));
  }, []);

  // ── Player lifecycle ──
  useEffect(() => {
    if (!sdkReady || !containerRef.current || !window.Vimeo?.Player) return;

    const container = containerRef.current;
    container.innerHTML = '';
    lastTimeRef.current = 0;
    setPlayerLoaded(false);

    // Build the iframe src manually so unlisted-hash URLs work
    const vref = extractVimeoRef(videoUrl);
    const srcParts = [
      `https://player.vimeo.com/video/${vref?.id ?? ''}`,
      vref?.hash ? `h=${encodeURIComponent(vref.hash)}` : null,
      'title=0', 'byline=0', 'portrait=0', // clean look (documented params)
    ].filter(Boolean);
    const iframe = document.createElement('iframe');
    iframe.src = srcParts[0] + (srcParts.length > 1 ? `?${srcParts.slice(1).join('&')}` : '');
    iframe.width = '100%';
    iframe.height = '100%';
    iframe.allow = 'autoplay; fullscreen; picture-in-picture; encrypted-media';
    iframe.title = 'Vimeo video player';
    iframe.style.border = '0';
    iframe.style.position = 'absolute';
    iframe.style.inset = '0';
    iframe.style.pointerEvents = interactive ? 'auto' : 'none';
    container.appendChild(iframe);

    const videoGapSeconds = videoGap / 1000;
    const adjustedStartSeconds = Math.max(0, (startTime / 1000) - videoGapSeconds);

    let player: VimeoPlayerInstance;
    try {
      player = new window.Vimeo.Player(iframe);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[Vimeo] Failed to create player:', err);
      onErrorRef.current?.(5);
      return;
    }
    playerRef.current = player;

    player.on('loaded', () => {
      setPlayerLoaded(true);
      // Initial volume (0..1, official player.js API) — applied once the
      // iframe is actually loaded so it can't be silently rejected.
      if (volumeRef.current !== undefined) {
        player.setVolume(Math.min(1, Math.max(0, volumeRef.current))).catch(() => { /* not ready */ });
      }
      onReadyRef.current?.();
    });

    player.on('ended', () => {
      onEndedRef.current?.();
    });

    player.on('timeupdate', (e) => {
      const seconds = e.seconds;
      if (typeof seconds === 'number' && isFinite(seconds)) lastTimeRef.current = seconds;
    });

    player.on('error', (e) => {
      // eslint-disable-next-line no-console
      console.error('[Vimeo] Player error:', e.name ?? '', e.message ?? '');
      onErrorRef.current?.(mapVimeoError(e));
    });

    // Seek to the start offset once the player reports readiness
    const init = async () => {
      try {
        if (player.ready) await player.ready();
        if (adjustedStartSeconds > 0.2) {
          await player.setCurrentTime(adjustedStartSeconds);
        }
        if (isPlayingRef.current) {
          await player.play();
        }
        if (mutedRef.current) {
          await player.setMuted(true);
        }
      } catch { /* ignore — e.g. autoplay blocked until user gesture */ }
    };
    void init();

    // Time polling (100ms — same cadence as the other platform players)
    if (timeUpdateIntervalRef.current) clearInterval(timeUpdateIntervalRef.current);
    timeUpdateIntervalRef.current = setInterval(() => {
      const p = playerRef.current;
      if (!p) return;
      p.getCurrentTime().then(t => {
        if (typeof t === 'number' && isFinite(t) && t >= 0) {
          lastTimeRef.current = t;
          const songTime = (t + videoGapSeconds) * 1000;
          onTimeUpdateRef.current?.(songTime);
        }
      }).catch(() => { /* not ready */ });
    }, 100);

    return () => {
      if (timeUpdateIntervalRef.current) {
        clearInterval(timeUpdateIntervalRef.current);
        timeUpdateIntervalRef.current = null;
      }
      if (playerRef.current) {
        playerRef.current.destroy().catch(() => { /* ignore */ });
        playerRef.current = null;
      }
      container.innerHTML = '';
    };
  }, [sdkReady, videoUrl, videoGap, startTime, interactive]);

  // ── Play / pause ──
  useEffect(() => {
    const p = playerRef.current;
    if (!p) return;
    if (isPlaying) {
      p.play().catch(() => { /* autoplay restrictions */ });
    } else {
      p.pause().catch(() => { /* not ready */ });
    }
  }, [isPlaying]);

  // ── Mute ──
  useEffect(() => {
    const p = playerRef.current;
    if (!p) return;
    p.setMuted(muted).catch(() => { /* not ready */ });
  }, [muted]);

  // ── Volume (jukebox) — 0..1, applied without re-creating the player ──
  useEffect(() => {
    if (volume === undefined) return;
    const p = playerRef.current;
    if (!p || !playerLoaded) return;
    p.setVolume(Math.min(1, Math.max(0, volume))).catch(() => { /* not ready */ });
  }, [volume, playerLoaded]);

  // Ad callbacks are referenced via refs for interface parity (Vimeo: ad-free)
  void onAdStartRef;
  void onAdEndRef;

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 w-full h-full"
      aria-label="Vimeo video player"
    />
  );
});

export default VimeoPlayer;
