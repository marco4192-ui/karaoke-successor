'use client';

/**
 * Hook: Wendet Practice-Mode-Features auf Audio-/Video-Elemente an.
 *
 * - Setzt playbackRate auf Audio/Video
 * - Erkennt Loop-Ende und seekt automatisch zurück
 * - Trackt Loop-Iterationen
 */
import { useEffect, useRef, useCallback, useState } from 'react';
import type { PracticeModeConfig } from '@/lib/game/practice-mode';

export interface UsePracticePlaybackOptions {
  practiceMode: PracticeModeConfig;
  isPlaying: boolean;
  currentTime: number;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  videoRef: React.RefObject<HTMLVideoElement | null>;
}

export function usePracticePlayback({
  practiceMode,
  isPlaying,
  currentTime,
  audioRef,
  videoRef,
}: UsePracticePlaybackOptions) {
  const [loopCount, setLoopCount] = useState(0);
  const loopIterationRef = useRef(0);
  const lastSeekTimeRef = useRef<number | null>(null);

  // Apply playbackRate to audio + video elements
  useEffect(() => {
    const rate = practiceMode.playbackRate;
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
    }
  }, [practiceMode.playbackRate, audioRef, videoRef]);

  // Loop detection: when currentTime >= loopEnd, seek back to loopStart
  useEffect(() => {
    if (
      !practiceMode.enabled ||
      !practiceMode.loopEnabled ||
      practiceMode.loopStart === null ||
      practiceMode.loopEnd === null ||
      !isPlaying
    ) {
      return;
    }

    // Avoid re-triggering right after a seek (debounce)
    if (lastSeekTimeRef.current !== null && Date.now() - lastSeekTimeRef.current < 500) {
      return;
    }

    if (currentTime * 1000 >= practiceMode.loopEnd) {
      const seekTarget = practiceMode.loopStart / 1000;

      loopIterationRef.current += 1;
      setLoopCount(loopIterationRef.current);

      lastSeekTimeRef.current = Date.now();

      if (audioRef.current) {
        audioRef.current.currentTime = seekTarget;
      }
      if (videoRef.current) {
        videoRef.current.currentTime = seekTarget;
      }
    }
  }, [currentTime, practiceMode, isPlaying, audioRef, videoRef]);

  // Set current time as loop start
  const setLoopStart = useCallback(() => {
    const timeMs = Math.round((audioRef.current?.currentTime ?? 0) * 1000);
    return timeMs;
  }, [audioRef]);

  // Set current time as loop end
  const setLoopEnd = useCallback(() => {
    const timeMs = Math.round((audioRef.current?.currentTime ?? 0) * 1000);
    return timeMs;
  }, [audioRef]);

  // Reset loop counter (call when loop region changes)
  const resetLoopCount = useCallback(() => {
    loopIterationRef.current = 0;
    setLoopCount(0);
  }, []);

  return { loopCount, setLoopStart, setLoopEnd, resetLoopCount };
}
