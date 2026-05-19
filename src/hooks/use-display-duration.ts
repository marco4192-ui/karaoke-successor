'use client';

import { useState, useEffect } from 'react';
import type { Song } from '@/types/game';

interface DisplayDurationParams {
  effectiveSong: Song | null;
  mediaLoaded: boolean;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  videoRef: React.RefObject<HTMLVideoElement | null>;
}

/**
 * Computes the display duration for the progress bar and time display.
 * Prefers #END: tag value, then falls back to audio/video element duration.
 * Extracted from useGameScreenLogic.
 */
export function useDisplayDuration({
  effectiveSong,
  mediaLoaded,
  audioRef,
  videoRef,
}: DisplayDurationParams): {
  displayDuration: number;
  setDisplayDuration: React.Dispatch<React.SetStateAction<number>>;
} {
  const [displayDuration, setDisplayDuration] = useState(0);

  useEffect(() => {
    if (!effectiveSong) return;
    const compute = () => {
      if (effectiveSong.end) {
        setDisplayDuration(effectiveSong.end);
        return;
      }
      const audioDur = audioRef.current?.duration;
      if (audioDur && isFinite(audioDur) && audioDur > 0) {
        setDisplayDuration(audioDur * 1000);
        return;
      }
      const videoDur = videoRef.current?.duration;
      if (videoDur && isFinite(videoDur) && videoDur > 0) {
        setDisplayDuration(videoDur * 1000);
        return;
      }
      setDisplayDuration(effectiveSong.duration);
    };
    queueMicrotask(compute);
  }, [effectiveSong, mediaLoaded, audioRef, videoRef]);

  return { displayDuration, setDisplayDuration };
}
