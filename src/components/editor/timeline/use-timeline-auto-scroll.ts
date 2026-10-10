'use client';

/**
 * Auto-scroll while playing — keeps the playhead inside the viewport.
 *
 * Extracted verbatim from the Timeline component (R2 refactor): the ref-sync
 * effect (currentTime/scrollOffset/pps without re-triggering the loop) and
 * the requestAnimationFrame loop that re-centers the scroll offset whenever
 * the playhead leaves the visible window (throttled to one check per 80 ms).
 * Only the module boundary is new — logic and comments are unchanged.
 */
import React, { useEffect, useRef } from 'react';

export interface TimelineAutoScrollParams {
  /** Scroll container of the timeline (shared with the Timeline component). */
  containerRef: React.RefObject<HTMLDivElement | null>;
  isPlaying: boolean;
  currentTime: number;
  scrollOffset: number;
  pixelsPerSecond: number;
  /** Scroll-offset setter owned by the Timeline component. */
  setScrollOffset: React.Dispatch<React.SetStateAction<number>>;
}

export function useTimelineAutoScroll({
  containerRef,
  isPlaying,
  currentTime,
  scrollOffset,
  pixelsPerSecond,
  setScrollOffset,
}: TimelineAutoScrollParams) {
  // Keep refs for values the scroll loop needs without re-triggering the effect
  const lastScrollCheckRef = useRef<number>(0);
  const currentTimeRef = useRef(currentTime);
  const scrollOffsetRef = useRef(scrollOffset);
  const ppsRef = useRef(pixelsPerSecond);
  useEffect(() => {
    currentTimeRef.current = currentTime;
    scrollOffsetRef.current = scrollOffset;
    ppsRef.current = pixelsPerSecond;
  }, [currentTime, scrollOffset, pixelsPerSecond]);

  // Auto-scroll while playing — reads currentTime from a ref so the effect
  // is only mounted/unmounted when isPlaying changes, NOT every frame.
  useEffect(() => {
    if (!isPlaying) return;

    let animationId: number;

    const tick = () => {
      const container = containerRef.current;
      if (!container) {
        animationId = requestAnimationFrame(tick);
        return;
      }

      const now = Date.now();
      if (now - lastScrollCheckRef.current > 80) {
        lastScrollCheckRef.current = now;

        const playheadX = (currentTimeRef.current / 1000) * ppsRef.current;
        const visibleWidth = container.clientWidth;
        const currentScroll = scrollOffsetRef.current;

        if (playheadX < currentScroll || playheadX > currentScroll + visibleWidth - 120) {
          setScrollOffset(Math.max(0, playheadX - 120));
        }
      }

      animationId = requestAnimationFrame(tick);
    };

    animationId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [isPlaying, containerRef, setScrollOffset]);
}
