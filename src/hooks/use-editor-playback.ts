'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

interface UseEditorPlaybackReturn {
  isPlaying: boolean;
  setIsPlaying: React.Dispatch<React.SetStateAction<boolean>>;
  currentTime: number;
  setCurrentTime: React.Dispatch<React.SetStateAction<number>>;
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
  const audioRef = useRef<HTMLAudioElement>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Keep a ref of the latest currentTime so the animation loop
  // always knows the correct offset when play starts.
  const currentTimeRef = useRef(currentTime);
  currentTimeRef.current = currentTime;

  // ── Start / stop the rAF animation loop + audio element ──
  // Only depends on isPlaying and duration — NOT on currentTime.
  // The animation loop reads the startOffset from currentTimeRef at launch.
  useEffect(() => {
    if (isPlaying) {
      const startTime = performance.now();
      const startOffset = currentTimeRef.current;

      const animate = () => {
        const elapsed = performance.now() - startTime;
        const newTime = startOffset + elapsed;

        if (newTime >= duration) {
          setCurrentTime(duration);
          setIsPlaying(false);
        } else {
          setCurrentTime(newTime);
          animationFrameRef.current = requestAnimationFrame(animate);
        }
      };

      animationFrameRef.current = requestAnimationFrame(animate);

      // Play actual audio from the current position
      if (audioRef.current) {
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
  }, [isPlaying, duration]);

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
    audioRef,
    handlePlayPause,
    handleTimeChange,
  };
}
