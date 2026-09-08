'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

// Editor-specific playback rates (slower for detailed editing)
export const EDITOR_PLAYBACK_RATES = [
  { value: 1.0, label: '100%' },
  { value: 0.75, label: '75%' },
  { value: 0.5, label: '50%' },
  { value: 0.25, label: '25%' },
  { value: 0.1, label: '10%' },
];

interface UseEditorPlaybackReturn {
  isPlaying: boolean;
  setIsPlaying: React.Dispatch<React.SetStateAction<boolean>>;
  currentTime: number;
  setCurrentTime: React.Dispatch<React.SetStateAction<number>>;
  playbackRate: number;
  setPlaybackRate: React.Dispatch<React.SetStateAction<number>>;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  handlePlayPause: () => void;
  handleTimeChange: (_time: number) => void;
}

export function useEditorPlayback(
  duration: number,
  _audioUrl?: string
): UseEditorPlaybackReturn {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Keep refs of the latest values so the animation loop and event handlers
  // always know the correct state at launch / mid-playback.
  const currentTimeRef = useRef(currentTime);
  const playbackRateRef = useRef(playbackRate);
  const isPlayingRef = useRef(isPlaying);
  useEffect(() => {
    currentTimeRef.current = currentTime;
    playbackRateRef.current = playbackRate;
    isPlayingRef.current = isPlaying;
  }, [currentTime, playbackRate, isPlaying]);

  // ── Re-basable animation loop ─────────────────────────────────────
  // The loop derives the displayed time from (baseTime + elapsed wall clock × rate).
  // handleTimeChange re-bases these refs, so seeking WHILE PLAYING now works
  // (previously the loop kept overwriting the seek with the old position).
  const baseTimeRef = useRef(0);
  const baseWallRef = useRef(0);

  const rebase = useCallback((timeMs: number) => {
    baseTimeRef.current = timeMs;
    baseWallRef.current = performance.now();
  }, []);

  // ── Start / stop the rAF animation loop + audio element ──
  useEffect(() => {
    if (isPlaying) {
      const startOffset = currentTimeRef.current;
      const rate = playbackRate;
      rebase(startOffset);

      const animate = () => {
        const newTime = baseTimeRef.current + (performance.now() - baseWallRef.current) * rate;

        if (newTime >= duration) {
          setCurrentTime(duration);
          setIsPlaying(false);
        } else {
          setCurrentTime(newTime);
          animationFrameRef.current = requestAnimationFrame(animate);
        }
      };

      animationFrameRef.current = requestAnimationFrame(animate);

      // Play actual audio from the current position with the selected rate
      if (audioRef.current) {
        audioRef.current.playbackRate = rate;
        audioRef.current.currentTime = startOffset / 1000;
        audioRef.current.play().catch(() => {});
      }
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      if (audioRef.current) {
        audioRef.current.pause();
      }
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [isPlaying, duration, playbackRate, rebase]);

  // Sync playbackRate to the audio element when changed during playback
  useEffect(() => {
    if (audioRef.current && isPlayingRef.current) {
      audioRef.current.playbackRate = playbackRate;
      // Re-base the visual loop so time doesn't jump when the rate changes
      rebase(currentTimeRef.current);
    }
  }, [playbackRate, rebase]);

  // Update audio element seek position when the user scrubs (not playing)
  useEffect(() => {
    if (audioRef.current && !isPlayingRef.current) {
      audioRef.current.currentTime = currentTime / 1000;
    }
  }, [currentTime]);

  const handlePlayPause = useCallback(() => {
    setIsPlaying(prev => !prev);
  }, []);

  const handleTimeChange = useCallback((time: number) => {
    setCurrentTime(time);
    // Sync the ref immediately so tap-mode note placement uses the fresh value
    currentTimeRef.current = time;

    if (isPlayingRef.current) {
      // Seek while playing: re-base the animation loop and move the audio
      // element to the new position.
      rebase(time);
      if (audioRef.current) {
        audioRef.current.currentTime = time / 1000;
      }
    }
  }, [rebase]);

  return {
    isPlaying,
    setIsPlaying,
    currentTime,
    setCurrentTime,
    playbackRate,
    setPlaybackRate,
    audioRef,
    handlePlayPause,
    handleTimeChange,
  };
}
