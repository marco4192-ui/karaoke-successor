/**
 * Sub-hook: RAF-based time tracking for smooth note highway animation.
 * Falls back to native timeupdate events during non-playing phases.
 */
'use client';

import { useEffect, useRef, useState } from 'react';

interface UsePtmTimeTrackingOptions {
  phase: string;
  isPlaying: boolean;
  isYouTube: boolean;
  /** True for ANY streaming platform (YouTube/Dailymotion/Vimeo) — platform time is the clock. */
  isStreamingVideo?: boolean;
  /** Streaming-player time in MILLISECONDS (matches the players' onTimeUpdate contract). */
  youtubeTime: number;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  /** R111 (user 1.2): needs audioUrl — the platform clock only applies when
   *  the platform player provides the AUDIO (no separate audio file). With a
   *  separate file the platform video is muted and the audio element is the
   *  clock (same semantics as computeGameElapsedMs). */
  audioSong: { id: string; audioUrl?: string } | null;
}

export function usePtmTimeTracking({
  phase,
  isPlaying,
  isYouTube,
  isStreamingVideo = false,
  youtubeTime,
  audioRef,
  videoRef,
  audioSong,
}: UsePtmTimeTrackingOptions): {
  currentTime: number;
  setCurrentTime: React.Dispatch<React.SetStateAction<number>>;
  currentTimeRef: React.RefObject<number>;
} {
  const [currentTime, setCurrentTime] = useState(0);
  const youtubeTimeRef = useRef(youtubeTime);
  youtubeTimeRef.current = youtubeTime;
  // R111 (user 1.2): wall-clock anchor of the last platform report — the
  // platform clock advances in ~100 ms steps (player interval); extrapolating
  // between reports keeps the PTM note stream smooth for video-link songs.
  const platformWallRef = useRef(0);
  useEffect(() => {
    platformWallRef.current = performance.now();
  }, [youtubeTime]);
  const currentTimeRef = useRef(currentTime);
  currentTimeRef.current = currentTime;
  const lastCurrentTimeUpdateRef = useRef(0);
  // R111 (user 1.2): monotonic guard — extrapolation re-anchors must never
  // wind the clock back mid-song.
  const lastElapsedMsRef = useRef(0);

  // ── RAF-based time tracking (smooth ~40fps) ──
  useEffect(() => {
    if (phase !== 'playing' || !isPlaying) return;
    let rafId: number;
    // Fresh loop start — re-arm the monotonic guard for the new song/resume.
    lastElapsedMsRef.current = 0;

    const timeLoop = () => {
      let elapsedMs: number;

      // Streaming-platform clock (YouTube / Dailymotion / Vimeo) — but ONLY
      // while the platform provides the audio (no separate audio file);
      // R111 (user 1.2): extrapolated between the coarse platform reports so
      // the note stream glides instead of stepping in 100 ms jumps. Monotonic
      // clamp is scoped to THIS branch — medley snippet switches legitimately
      // jump the clock backwards and must never be clamped.
      if ((isYouTube || isStreamingVideo) && !audioSong?.audioUrl && youtubeTimeRef.current > 0) {
        const age = performance.now() - platformWallRef.current;
        const lead = Math.max(0, Math.min(age, 150));
        elapsedMs = Math.max(youtubeTimeRef.current + lead, lastElapsedMsRef.current);
        lastElapsedMsRef.current = elapsedMs;
      } else if (audioRef.current && !audioRef.current.paused && audioRef.current.readyState >= 2) {
        elapsedMs = audioRef.current.currentTime * 1000;
      } else if (videoRef.current && !videoRef.current.paused && videoRef.current.readyState >= 2 && !isYouTube && !isStreamingVideo) {
        elapsedMs = videoRef.current.currentTime * 1000;
      } else {
        // Fallback: keep current time (no regression)
        elapsedMs = currentTimeRef.current;
      }

      // Throttle React state updates to ~40fps (25ms) for smooth visuals
      const now = performance.now();
      if (now - lastCurrentTimeUpdateRef.current >= 25) {
        setCurrentTime(elapsedMs);
        lastCurrentTimeUpdateRef.current = now;
      }

      rafId = requestAnimationFrame(timeLoop);
    };

    rafId = requestAnimationFrame(timeLoop);
    return () => cancelAnimationFrame(rafId);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- audioSong only
    // gates the platform-vs-audio clock choice (its identity is stable per
    // song; the loop reads refs for everything that changes per frame).
  }, [phase, isPlaying, isYouTube, isStreamingVideo, audioRef, videoRef, audioSong]);

  // ── Legacy timeupdate fallback (non-playing phases: intro, countdown) ──
  useEffect(() => {
    if (phase === 'playing') return; // handled by RAF loop above

    if ((isYouTube || isStreamingVideo) && youtubeTimeRef.current > 0) {
      setCurrentTime(youtubeTimeRef.current);
      return;
    }

    const audio = audioRef.current;
    if (audio) {
      const handleTimeUpdate = () => setCurrentTime(audio.currentTime * 1000);
      audio.addEventListener('timeupdate', handleTimeUpdate);
      return () => audio.removeEventListener('timeupdate', handleTimeUpdate);
    }

    const video = videoRef.current;
    if (video) {
      const handleTimeUpdate = () => setCurrentTime(video.currentTime * 1000);
      video.addEventListener('timeupdate', handleTimeUpdate);
      return () => video.removeEventListener('timeupdate', handleTimeUpdate);
    }
  }, [audioRef, videoRef, isYouTube, isStreamingVideo, phase]);

  return { currentTime, setCurrentTime, currentTimeRef };
}
