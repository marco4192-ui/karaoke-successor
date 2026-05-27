'use client';

import { useRef, useState, useCallback } from 'react';

interface UseMobileSwipeOptions {
  /** Horizontal distance (in px) required to trigger the action. Default 80 */
  threshold?: number;
  /** Callback when user swipes past threshold and releases */
  onSwipeLeft?: () => void;
  /** Callback when user swipes past threshold and releases */
  onSwipeRight?: () => void;
  /** Whether the swipe is currently disabled */
  disabled?: boolean;
}

interface UseMobileSwipeReturn {
  /** Current horizontal offset in px (negative = swiped left) */
  swipeOffset: number;
  /** Whether the user is currently touching / swiping */
  isSwipeActive: boolean;
  /** Ref to attach to the swipeable container element */
  itemRef: React.RefObject<HTMLDivElement | null>;
  /** Touch handlers to spread onto the element */
  handlers: {
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchMove: (e: React.TouchEvent) => void;
    onTouchEnd: () => void;
  };
}

/**
 * Reusable swipe-to-action hook for mobile list items.
 *
 * Tracks touch start/move/end, calculates horizontal swipe distance,
 * and fires a callback when the user swipes past the threshold and releases.
 *
 * Only triggers when the horizontal delta exceeds the vertical delta
 * so vertical scrolling is not interfered with.
 */
export function useMobileSwipe({
  threshold = 80,
  onSwipeLeft,
  onSwipeRight,
  disabled = false,
}: UseMobileSwipeOptions = {}): UseMobileSwipeReturn {
  const itemRef = useRef<HTMLDivElement>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwipeActive, setIsSwipeActive] = useState(false);

  // Keep refs to the latest touch data so we don't need to re-attach handlers
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const isSwiping = useRef(false);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled) return;

    const touch = e.touches[0];
    touchStartX.current = touch.clientX;
    touchStartY.current = touch.clientY;
    isSwiping.current = false; // will be determined on first significant move

    setIsSwipeActive(true);
    setSwipeOffset(0);
  }, [disabled]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (disabled) return;

    const touch = e.touches[0];
    const dx = touch.clientX - touchStartX.current;
    const dy = touch.clientY - touchStartY.current;

    // Lock to swipe direction once the delta is large enough to tell intent
    if (!isSwiping.current) {
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        isSwiping.current = Math.abs(dx) > Math.abs(dy);
      }
      return;
    }

    // If we determined it's a vertical scroll, do nothing
    if (!isSwiping.current) return;

    // Calculate clamped offset. Allow swiping both directions.
    // Clamp so it can't go past the threshold on the "negative" side (left).
    const actionWidth = threshold;
    let offset: number;

    if (dx < 0) {
      // Swiping left – reveal action behind. Clamp to [-actionWidth, 0]
      offset = Math.max(dx, -actionWidth);
    } else {
      // Swiping right – snap back to 0
      offset = Math.min(dx, 0);
    }

    setSwipeOffset(offset);
  }, [disabled, threshold]);

  const onTouchEnd = useCallback(() => {
    setIsSwipeActive(false);

    if (!isSwiping.current) {
      setSwipeOffset(0);
      return;
    }

    if (swipeOffset <= -threshold && onSwipeLeft) {
      onSwipeLeft();
    } else if (swipeOffset >= threshold && onSwipeRight) {
      onSwipeRight();
    }

    setSwipeOffset(0);
    isSwiping.current = false;
  }, [swipeOffset, threshold, onSwipeLeft, onSwipeRight]);

  return {
    swipeOffset,
    isSwipeActive,
    itemRef,
    handlers: {
      onTouchStart,
      onTouchMove,
      onTouchEnd,
    },
  };
}
