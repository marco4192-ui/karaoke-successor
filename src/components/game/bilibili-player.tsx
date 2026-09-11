'use client';

import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { extractBilibiliRef } from '@/lib/url-utils';
import {
  useManualSongClock,
  type ManualStartPlayerProps,
} from '@/components/game/platform-player-shared';

/**
 * Bilibili player component — mirrors the YouTubePlayer prop interface.
 *
 * Bilibili's external player (player.bilibili.com/player.html) has NO
 * JavaScript API — no postMessage protocol, no events, no play()/seek().
 * Everything must go through iframe URL parameters:
 *
 *   ?bvid=BV… (or aid=…) &page=N &danmaku=0 &high_quality=1 &as_wide=1
 *   &autoplay=0 &t=<seconds>   ← start position (verified live: the player
 *                                starts/pauses exactly at t)
 *
 * Consequently this player ALWAYS needs the manual start gate:
 *  1. The iframe renders paused at the song's start offset (t=…).
 *  2. When the game wants to play (isPlaying), the player fires onAdStart —
 *     the game pauses and the song-start gate UI asks the user to click play
 *     in the Bilibili player, then confirm ("Musik läuft — Los!").
 *  3. On confirmation (manualStartConfirmed) the player fires onAdEnd (game
 *     auto-resumes) and a wall-clock stopwatch becomes the song clock —
 *     onTimeUpdate(startTimeMs + elapsed). Bilibili embeds carry no pre-roll
 *     ads, so the stopwatch stays in sync with the video for practical
 *     purposes; drift from manual pause inside the iframe is accepted.
 *
 * The iframe is ALWAYS interactive (the user must be able to click play).
 */

export interface BilibiliPlayerProps extends ManualStartPlayerProps {
  /** Full Bilibili URL (watch page or player.bilibili.com embed — ids extracted internally). */
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
  interactive?: boolean; // Ignored — the iframe is always interactive (user must click play)
  muted?: boolean; // Ignored — no API to mute; the user controls volume in the player
}

/** Imperative handle — seek is unsupported (no API); time comes from the stopwatch. */
export interface BilibiliPlayerHandle {
  seekTo: (_seconds: number) => void;
  getCurrentTime: () => number;
}

export const BilibiliPlayer = forwardRef<BilibiliPlayerHandle, BilibiliPlayerProps>(function BilibiliPlayer({
  videoUrl,
  videoGap = 0,
  onReady,
  onTimeUpdate,
  onAdStart,
  onAdEnd,
  onError,
  isPlaying = true,
  startTime = 0,
  manualStartConfirmed = false,
}, ref) {
  const biliRef = extractBilibiliRef(videoUrl);
  const startSeconds = Math.max(0, (startTime / 1000) - (videoGap / 1000));

  // ── Callback refs ──
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;
  const onTimeUpdateRef = useRef(onTimeUpdate);
  onTimeUpdateRef.current = onTimeUpdate;
  const onAdStartRef = useRef(onAdStart);
  onAdStartRef.current = onAdStart;
  const onAdEndRef = useRef(onAdEnd);
  onAdEndRef.current = onAdEnd;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;
  const manualConfirmedRef = useRef(manualStartConfirmed);
  manualConfirmedRef.current = manualStartConfirmed;

  // Stopwatch clock state — active only while the game plays AND the gate is confirmed.
  const clockActive = isPlaying && manualStartConfirmed;
  const currentSongTimeMsRef = useRef(startTime);

  // The manual song clock: emits startTime + elapsed while active.
  useManualSongClock({
    startOffsetMs: startTime,
    active: clockActive,
    onTick: (songTimeMs) => {
      currentSongTimeMsRef.current = songTimeMs;
      onTimeUpdateRef.current?.(songTimeMs);
    },
  });

  // ── Manual start gate (edge-triggered) ──
  // ENGAGE: the game wants to play but the user hasn't confirmed → onAdStart
  // (game pauses, gate UI shows). RESOLVE: only via explicit confirmation →
  // onAdEnd (game auto-resumes).
  // CRITICAL: the "engaged" tracker must NOT depend on isPlaying — the ad-wait
  // machinery sets isPlaying=false when the gate engages, which would reset a
  // pending flag derived from isPlaying and swallow the later release.
  const gateEngagedRef = useRef(false);
  useEffect(() => {
    if (isPlaying && !manualStartConfirmed && !gateEngagedRef.current) {
      gateEngagedRef.current = true;
      onAdStartRef.current?.();
    }
  }, [isPlaying, manualStartConfirmed]);

  // Confirmation edge — releases an engaged gate exactly once.
  useEffect(() => {
    if (manualStartConfirmed && gateEngagedRef.current) {
      gateEngagedRef.current = false;
      onAdEndRef.current?.();
    }
  }, [manualStartConfirmed]);

  // New song (URL change) → reset the gate + stopwatch base.
  useEffect(() => {
    gateEngagedRef.current = false;
    currentSongTimeMsRef.current = startTime;
  }, [videoUrl, startTime]);

  // ── onReady: the iframe "loaded" signal (no API, but we can notify parents) ──
  const handleIframeLoad = () => {
    onReadyRef.current?.();
  };

  useImperativeHandle(ref, () => ({
    seekTo: (_seconds: number) => {
      // No API — seeking would require reloading the iframe with a new t=,
      // which would restart playback. Log-and-ignore (editor video-sync is
      // YouTube-only by design; Bilibili songs author timing via #GAP/#START).
      // eslint-disable-next-line no-console
      console.debug('[Bilibili] seekTo ignored — no player API available');
    },
    getCurrentTime: () => currentSongTimeMsRef.current,
  }), []);

  // Detect an unextractable URL (e.g. b23.tv short link) and surface it.
  useEffect(() => {
    if (!biliRef) {
      // eslint-disable-next-line no-console
      console.warn('[Bilibili] Could not extract a video id from URL:', videoUrl);
      onErrorRef.current?.(2); // invalid parameter (YouTube code space)
    }
  }, [biliRef, videoUrl, onErrorRef]);

  if (!biliRef) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-black/60" role="alert">
        <p className="text-white/80 text-sm px-6 text-center max-w-md">
          Bilibili: no BV/av id found — please use the full www.bilibili.com/video/BV… URL
        </p>
      </div>
    );
  }

  const embedParams = new URLSearchParams({
    ...(biliRef.bvid ? { bvid: biliRef.bvid } : {}),
    ...(biliRef.aid ? { aid: biliRef.aid } : {}),
    ...(biliRef.cid ? { cid: biliRef.cid } : {}),
    page: String(biliRef.page),
    danmaku: '0',       // no comment barrage over the video
    high_quality: '1',  // best available quality
    as_wide: '1',       // widescreen
    autoplay: '0',      // paused — the user starts the video (manual gate)
    t: String(Math.floor(startSeconds)),
  });
  const embedSrc = `https://player.bilibili.com/player.html?${embedParams.toString()}`;

  return (
    <iframe
      src={embedSrc}
      title="Bilibili video player"
      className="absolute inset-0 w-full h-full"
      style={{ border: 'none', pointerEvents: 'auto' }}
      allow="autoplay; fullscreen"
      allowFullScreen
      scrolling="no"
      onLoad={handleIframeLoad}
    />
  );
});

export default BilibiliPlayer;
