'use client';

import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { extractVkVideoRef } from '@/lib/url-utils';
import {
  START_GATE_TOLERANCE_SECONDS,
  toSongTimeMs,
  type ManualStartPlayerProps,
} from '@/components/game/platform-player-shared';

/**
 * VK Video player component — mirrors the YouTubePlayer prop interface.
 *
 * Uses the OFFICIAL VK Widget SDK (https://vk.com/js/api/videoplayer.js,
 * verified against the live SDK source):
 *
 *   VK.VideoPlayer(iframe) — validates src matches vk(video).(com|ru)/
 *   video_ext.php?…&js_api=1, then exposes:
 *     play() · pause() · seek(sec) · mute() · unmute() · setVolume(v)
 *     getCurrentTime() · getDuration() · getState() · getErrorCode()
 *     on(event, cb) · off(event, cb) · destroy()
 *
 *   VK.VideoPlayer.Events = {
 *     INITED: 'inited', TIMEUPDATE: 'timeupdate', STARTED: 'started',
 *     RESUMED: 'resumed', PAUSED: 'paused', SEEKED: 'seeked',
 *     ENDED: 'ended', ERROR: 'error',
 *     ADSTARTED: 'adStarted', ADCOMPLETED: 'adCompleted',   ← OFFICIAL AD EVENTS
 *     VOLUMECHANGE, QUALITYCHANGE, AUTOPLAY_SOUND_PROHIBITED, … }
 *
 *   Every event payload merges the tracked state fields:
 *     { state, volume, muted, time, duration, quality, errorCode } (+ event data)
 *
 *   Commands sent before INITED are queued inside the SDK and flushed on init.
 *
 * The iframe src must be the FULL Export-URL from the VK video page
 * (…/video_ext.php?oid=…&id=…&hash=…) — the hash cannot be derived without
 * VK API credentials. A missing hash is surfaced as an error (code 101).
 */

// ── Minimal typings for the VK SDK (transcribed from the live SDK source) ──
interface VKPlayerState {
  state: string;
  volume: number;
  muted: boolean;
  time: number;
  duration: number;
  quality: number;
  errorCode: number;
}

interface VKPlayer {
  play(): void;
  pause(): void;
  seek(_seconds: number): void;
  mute(): void;
  unmute(): void;
  setVolume(_volume: number): void;
  getCurrentTime(): number;
  getDuration(): number;
  getState(): string;
  getErrorCode(): number;
  isMuted(): boolean;
  on(_event: string, _cb: (_state: Partial<VKPlayerState>) => void): void;
  off(_event: string, _cb: (_state: Partial<VKPlayerState>) => void): void;
  destroy(): void;
}

interface VKVideoPlayerNamespace {
  (_iframe: HTMLIFrameElement): VKPlayer;
  Events: Record<string, string>;
  States: Record<string, string>;
}

declare global {
  interface Window {
    VK?: {
      VideoPlayer?: VKVideoPlayerNamespace;
    };
  }
}

export interface VKPlayerProps extends ManualStartPlayerProps {
  /** Full VK video URL (video_ext.php Export URL preferred — carries the hash). */
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
  /** Playback volume 0..1 — applied when defined (jukebox). Undefined = player default. */
  volume?: number;
}

/** Imperative handle for parents that need to drive the player directly. */
export interface VKPlayerHandle {
  seekTo: (_seconds: number) => void;
  getCurrentTime: () => number;
}

// ── SDK script load-queue (script loads once per page) ──
let sdkLoadState: 'idle' | 'loading' | 'ready' = 'idle';
const sdkReadyCallbacks: Array<() => void> = [];

function isSdkReady(): boolean {
  return typeof window !== 'undefined' && !!window.VK?.VideoPlayer;
}

function loadVkSdk(onReady: () => void): void {
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
  script.id = 'vk-videoplayer-sdk';
  script.src = 'https://vk.com/js/api/videoplayer.js';
  script.async = true;
  script.onload = finish;
  script.onerror = () => {
    // vk.com may be blocked (network policy / regional) — surface after polling
    // eslint-disable-next-line no-console
    console.warn('[VK] SDK script failed to load — retrying via polling');
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

export const VKPlayer = forwardRef<VKPlayerHandle, VKPlayerProps>(function VKPlayer({
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
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const playerRef = useRef<VKPlayer | null>(null);
  const [sdkReady, setSdkReady] = useState(false);
  const [inited, setInited] = useState(false);

  const vkRef = extractVkVideoRef(videoUrl);
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
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;
  const volumeRef = useRef(volume);
  volumeRef.current = volume;
  const mutedRef = useRef(muted);
  mutedRef.current = muted;

  // ── Playback state tracking ──
  const gateOpenRef = useRef(false);
  const gatePendingSignalledRef = useRef(false);
  const adActiveRef = useRef(false);
  const startedReceivedRef = useRef(false);
  const lastVideoTimeRef = useRef(0);
  const endedFiredRef = useRef(false);
  const seekedOnceRef = useRef(false);

  useImperativeHandle(ref, () => ({
    seekTo: (seconds: number) => {
      if (!isFinite(seconds)) return;
      try { playerRef.current?.seek(Math.max(0, seconds)); } catch { /* not ready */ }
    },
    getCurrentTime: () => lastVideoTimeRef.current,
  }), []);

  // ── SDK loading ──
  useEffect(() => {
    if (typeof window === 'undefined') return;
    loadVkSdk(() => setSdkReady(true));
  }, []);

  // ── Player lifecycle ──
  useEffect(() => {
    if (!sdkReady || !iframeRef.current || !window.VK?.VideoPlayer || !vkRef) return;

    gateOpenRef.current = false;
    gatePendingSignalledRef.current = false;
    adActiveRef.current = false;
    startedReceivedRef.current = false;
    lastVideoTimeRef.current = 0;
    endedFiredRef.current = false;
    seekedOnceRef.current = false;
    setInited(false);

    let cancelled = false;

    let player: VKPlayer;
    try {
      player = window.VK.VideoPlayer(iframeRef.current);
    } catch (err) {
      // Thrown when the src is not a valid VK embed with js_api=1
      // eslint-disable-next-line no-console
      console.error('[VK] Failed to create player:', err);
      onErrorRef.current?.(5);
      return;
    }
    playerRef.current = player;

    const E = window.VK?.VideoPlayer?.Events ?? {};
    const handleTime = (timeSeconds: number) => {
      if (typeof timeSeconds !== 'number' || !isFinite(timeSeconds)) return;
      lastVideoTimeRef.current = timeSeconds;

      // ── Start gate: open once the VIDEO itself started (the `started`
      // event — ads run before it) AND its position reached the song start.
      // Both conditions prevent the gate from opening on ad-timeline time. ──
      if (!gateOpenRef.current && !adActiveRef.current && startedReceivedRef.current
          && timeSeconds >= Math.max(0.05, startSeconds - START_GATE_TOLERANCE_SECONDS)) {
        gateOpenRef.current = true;
        // Release a pending gate wait (game auto-resumes like an ad end).
        onAdEndRef.current?.();
      }

      if (gateOpenRef.current && !adActiveRef.current) {
        onTimeUpdateRef.current?.(toSongTimeMs(timeSeconds, videoGapSeconds, startTime));
      }
    };

    player.on(E.INITED ?? 'inited', () => {
      if (cancelled) return;
      setInited(true);
      // Apply the initial volume right away (SDK method — 0..1). While muted
      // the volume is kept as the restore target for a later unmute.
      if (volumeRef.current !== undefined) {
        try { player.setVolume(Math.min(1, Math.max(0, volumeRef.current))); } catch { /* ignore */ }
      }
      onReadyRef.current?.();
    });

    player.on(E.TIMEUPDATE ?? 'timeupdate', (state) => {
      if (cancelled) return;
      handleTime(state.time ?? lastVideoTimeRef.current);
    });

    player.on(E.STARTED ?? 'started', () => {
      if (cancelled) return;
      // Actual video playback started (autoplay succeeded or user clicked,
      // and any pre-roll ad has finished). Gates the start on the next timeupdate.
      startedReceivedRef.current = true;
    });

    player.on(E.ENDED ?? 'ended', () => {
      if (cancelled || endedFiredRef.current) return;
      endedFiredRef.current = true;
      onEndedRef.current?.();
    });

    // ── OFFICIAL ad events — same wait/resume flow as Dailymotion ──
    player.on(E.ADSTARTED ?? 'adStarted', () => {
      if (cancelled) return;
      adActiveRef.current = true;
      onAdStartRef.current?.();
    });
    player.on(E.ADCOMPLETED ?? 'adCompleted', () => {
      if (cancelled) return;
      adActiveRef.current = false;
      onAdEndRef.current?.();
    });

    player.on(E.ERROR ?? 'error', (state) => {
      if (cancelled) return;
      // eslint-disable-next-line no-console
      console.error('[VK] Player error, code:', state.errorCode);
      const code = state.errorCode;
      if (code === 1000 || code === 1001) onErrorRef.current?.(1000); // geo-ish restriction
      else if (code === 100 || code === 404) onErrorRef.current?.(100); // not found
      else onErrorRef.current?.(5);
    });

    // Startup watchdog: an embed with an invalid/missing hash shows an error
    // INSIDE the iframe and posts nothing. Surface it instead of hanging.
    const watchdog = setTimeout(() => {
      if (cancelled) return;
      if (!initedRefSafe() || (isPlayingRef.current && lastVideoTimeRef.current <= 0 && !adActiveRef.current)) {
        onErrorRef.current?.(vkRef.hash ? 5 : 101);
      }
    }, 14000);
    const initedRefSafe = () => playerRef.current?.getState() !== 'uninited';

    // Start gate watcher: signal the game-wait once when playback should be
    // running but the gate hasn't opened (autoplay blocked / ad / slow start).
    const gateWatchInterval = setInterval(() => {
      if (cancelled || adActiveRef.current) return; // ad events handle that case
      if (isPlayingRef.current && !gateOpenRef.current && !gatePendingSignalledRef.current) {
        gatePendingSignalledRef.current = true;
        onAdStartRef.current?.();
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(watchdog);
      clearInterval(gateWatchInterval);
      try { player.destroy(); } catch { /* ignore */ }
      playerRef.current = null;
    };
    // videoUrl is the dependency — stable per song URL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sdkReady, videoUrl, videoGap, startTime]);

  // ── Play / pause driving (gate-aware: never pause while the gate is
  // pending or an ad is running — that would cancel the playback whose
  // progress must open the gate / the ad that must complete) ──
  useEffect(() => {
    const p = playerRef.current;
    if (!p || !inited) return;
    if (isPlaying) {
      // Seek to the song start once on the first driven play.
      if (!seekedOnceRef.current && startSeconds > 0.2) {
        seekedOnceRef.current = true;
        try { p.seek(startSeconds); } catch { /* ignore */ }
      }
      try { p.play(); } catch { /* ignore */ }
    } else if (gateOpenRef.current && !adActiveRef.current) {
      try { p.pause(); } catch { /* ignore */ }
    }
  }, [isPlaying, inited, startSeconds]);

  // ── Mute ──
  useEffect(() => {
    const p = playerRef.current;
    if (!p || !inited) return;
    try {
      if (muted) p.mute();
      else p.unmute();
    } catch { /* ignore */ }
  }, [muted, inited]);

  // ── Volume (jukebox) — 0..1, applied without re-creating the player ──
  useEffect(() => {
    if (volume === undefined) return;
    const p = playerRef.current;
    if (!p || !inited) return;
    try {
      p.setVolume(Math.min(1, Math.max(0, volume)));
    } catch { /* ignore */ }
  }, [volume, inited]);

  if (!vkRef || !vkRef.hash) {
    // A watch URL without the embed hash cannot play — explain what to paste.
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-black/60" role="alert">
        <p className="text-white/80 text-sm px-6 text-center max-w-md">
          {vkRef
            ? 'VK: missing embed hash — paste the full video_ext.php Export URL or the complete iframe embed code (Einbetten → code kopieren) from the VK video page'
            : 'VK: video ID not found in URL'}
        </p>
      </div>
    );
  }

  const embedSrc = `https://vk.com/video_ext.php?oid=${encodeURIComponent(vkRef.oid)}&id=${encodeURIComponent(vkRef.videoId)}&hash=${encodeURIComponent(vkRef.hash)}${vkRef.list ? `&list=${encodeURIComponent(vkRef.list)}` : ''}&js_api=1&hd=2`;

  return (
    <iframe
      ref={iframeRef}
      src={embedSrc}
      title="VK video player"
      className="absolute inset-0 w-full h-full"
      style={{ border: 'none', pointerEvents: interactive ? 'auto' : 'none' }}
      allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
      allowFullScreen
    />
  );
});

export default VKPlayer;
