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
  youtubeTime: number;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  audioSong: { id: string } | null;
}

export function usePtmTimeTracking({
  phase,
  isPlaying,
  isYouTube,
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
  const currentTimeRef = useRef(currentTime);
  currentTimeRef.current = currentTime;
  const lastCurrentTimeUpdateRef = useRef(0);

  // ── RAF-based time tracking (smooth ~40fps) ──
  useEffect(() => {
    if (phase !== 'playing' || !isPlaying) return;
    let rafId: number;

    const timeLoop = () => {
      let elapsedMs: number;

      if (isYouTube && youtubeTimeRef.current > 0) {
        elapsedMs = youtubeTimeRef.current * 1000;
      } else if (audioRef.current && !audioRef.current.paused && audioRef.current.readyState >= 2) {
        elapsedMs = audioRef.current.currentTime * 1000;
      } else if (videoRef.current && !videoRef.current.paused && videoRef.current.readyState >= 2 && !isYouTube) {
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
  }, [phase, isPlaying, isYouTube, audioRef, videoRef]);

  // ── Legacy timeupdate fallback (non-playing phases: intro, countdown) ──
  useEffect(() => {
    if (phase === 'playing') return; // handled by RAF loop above

    if (isYouTube && youtubeTimeRef.current > 0) {
      setCurrentTime(youtubeTimeRef.current * 1000);
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
  }, [audioRef, videoRef, isYouTube, phase]);

  return { currentTime, setCurrentTime, currentTimeRef };
}
