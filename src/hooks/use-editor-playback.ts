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
  handleTimeChange: (time: number) => void;
}

export function useEditorPlayback(
  duration: number,
  audioUrl?: string
): UseEditorPlaybackReturn {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Keep a ref of the latest values so the animation loop
  // always knows the correct state at launch.
  const currentTimeRef = useRef(currentTime);
  currentTimeRef.current = currentTime;
  const playbackRateRef = useRef(playbackRate);
  playbackRateRef.current = playbackRate;

  // ── Start / stop the rAF animation loop + audio element ──
  useEffect(() => {
    if (isPlaying) {
      const startTime = performance.now();
      const startOffset = currentTimeRef.current;
      const rate = playbackRate;

      const animate = () => {
        const elapsed = performance.now() - startTime;
        const newTime = startOffset + elapsed * rate;

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
  }, [isPlaying, duration, playbackRate]);

  // Sync playbackRate to the audio element when changed during playback
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  // Update audio element seek position when the user scrubs (not playing)
  useEffect(() => {
    if (audioRef.current && !isPlaying) {
      audioRef.current.currentTime = currentTime / 1000;
    }
  }, [currentTime, isPlaying]);

  const handlePlayPause = useCallback(() => {
    setIsPlaying(prev => !prev);
  }, []);

  const handleTimeChange = useCallback((time: number) => {
    setCurrentTime(time);
  }, []);

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
