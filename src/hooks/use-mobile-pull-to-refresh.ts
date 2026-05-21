'use client';

import { useRef, useState, useCallback } from 'react';

interface UseMobilePullToRefreshOptions {
  onRefresh: () => Promise<void>;
  threshold?: number;
}

interface UseMobilePullToRefreshReturn {
  pullDistance: number;
  isRefreshing: boolean;
  pullRef: React.RefObject<HTMLDivElement | null>;
  indicatorText: 'pullToRefresh' | 'releaseToRefresh' | 'refreshing';
  handleTouchStart: (e: React.TouchEvent) => void;
  handleTouchMove: (e: React.TouchEvent) => void;
  handleTouchEnd: () => void;
}

export function useMobilePullToRefresh({
  onRefresh,
  threshold = 80,
}: UseMobilePullToRefreshOptions): UseMobilePullToRefreshReturn {
  const pullRef = useRef<HTMLDivElement>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Track start position and current distance in refs to avoid stale closures
  const startYRef = useRef<number | null>(null);
  const pullingRef = useRef(false);
  const currentDistanceRef = useRef(0);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (isRefreshing) return;

    const target = pullRef.current;
    if (!target) return;

    // Only activate when scrolled to the very top
    if (target.scrollTop !== 0) return;

    const touch = e.touches[0];
    startYRef.current = touch.clientY;
    pullingRef.current = false;
    currentDistanceRef.current = 0;
  }, [isRefreshing]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (isRefreshing) return;
    if (startYRef.current === null) return;

    const target = pullRef.current;
    if (!target) return;

    // If user scrolled away from top, cancel pull gesture
    if (target.scrollTop !== 0) {
      startYRef.current = null;
      setPullDistance(0);
      pullingRef.current = false;
      currentDistanceRef.current = 0;
      return;
    }

    const currentY = e.touches[0].clientY;
    const diff = currentY - startYRef.current;

    if (diff <= 0) {
      setPullDistance(0);
      currentDistanceRef.current = 0;
      return;
    }

    // Dampen the pull beyond threshold for a rubber-band feel
    const dampened = diff > threshold
      ? threshold + (diff - threshold) * 0.3
      : diff;

    pullingRef.current = true;
    currentDistanceRef.current = dampened;
    setPullDistance(dampened);
  }, [isRefreshing, threshold]);

  const handleTouchEnd = useCallback(async () => {
    if (isRefreshing) return;

    startYRef.current = null;

    if (pullingRef.current && currentDistanceRef.current >= threshold) {
      setIsRefreshing(true);
      setPullDistance(0);
      pullingRef.current = false;
      currentDistanceRef.current = 0;

      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    } else {
      setPullDistance(0);
      pullingRef.current = false;
      currentDistanceRef.current = 0;
    }
  }, [isRefreshing, threshold, onRefresh]);

  const indicatorText: 'pullToRefresh' | 'releaseToRefresh' | 'refreshing' =
    isRefreshing
      ? 'refreshing'
      : pullDistance >= threshold
        ? 'releaseToRefresh'
        : 'pullToRefresh';

  return {
    pullDistance,
    isRefreshing,
    pullRef,
    indicatorText,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  };
}
