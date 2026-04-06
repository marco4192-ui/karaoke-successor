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

  // Audio playback animation loop
  useEffect(() => {
    if (isPlaying) {
      const startTime = performance.now();
      const startOffset = currentTime;

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

      // Also play actual audio
      if (audioRef.current) {
        audioRef.current.currentTime = currentTime / 1000;
        audioRef.current.play().catch(() => {});
      }
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioRef.current) {
        audioRef.current.pause();
      }
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, duration, currentTime]);

  // Update audio element seek position when not playing
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
