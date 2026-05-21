'use client';

import { useMobileSwipe } from '@/hooks/use-mobile-swipe';

interface SwipeAction {
  icon: React.ReactNode;
  color: string;
  label: string;
}

interface MobileSwipeableItemProps {
  children: React.ReactNode;
  /** Action revealed when swiping left */
  leftAction?: SwipeAction;
  /** Callback when swipe-left threshold is reached and released */
  onSwipeLeft?: () => void;
  /** Action revealed when swiping right */
  rightAction?: SwipeAction;
  /** Callback when swipe-right threshold is reached and released */
  onSwipeRight?: () => void;
  /** Extra CSS classes for the outer container */
  className?: string;
  /** Disable swipe gestures */
  disabled?: boolean;
}

/**
 * A mobile-friendly swipeable list-item container.
 *
 * When the user swipes left, the child content slides aside to reveal
 * a colored action area behind it (e.g., a red "Delete" zone).
 * When the user swipes right, the content slides back.
 *
 * If the swipe distance exceeds the threshold on release, the
 * corresponding `onSwipeLeft` / `onSwipeRight` callback fires.
 */
export function MobileSwipeableItem({
  children,
  leftAction,
  onSwipeLeft,
  rightAction,
  onSwipeRight,
  className = '',
  disabled = false,
}: MobileSwipeableItemProps) {
  const { swipeOffset, isSwipeActive, handlers } = useMobileSwipe({
    threshold: 80,
    onSwipeLeft,
    onSwipeRight,
    disabled,
  });

  // We use the absolute value for the "revealed" width of the action area
  const revealedWidth = Math.abs(Math.min(swipeOffset, 0)); // only left-swipe reveals

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* ---- Action area behind (fixed on the right) ---- */}
      {leftAction && (
        <div
          className="absolute inset-y-0 right-0 flex items-center justify-end pr-4 rounded-xl transition-none"
          style={{
            backgroundColor: leftAction.color || '#ef4444',
            opacity: 1,
            pointerEvents: 'none',
          }}
        >
          <div className="flex flex-col items-center gap-1 text-white">
            <span className="flex items-center">{leftAction.icon}</span>
            <span className="text-xs font-medium">{leftAction.label}</span>
          </div>
        </div>
      )}

      {/* ---- Foreground content (slides) ---- */}
      <div
        {...handlers}
        className="relative z-10 touch-none select-none"
        style={{
          transform: `translateX(${swipeOffset}px)`,
          transition: isSwipeActive ? 'none' : 'transform 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        }}
      >
        {children}
      </div>
    </div>
  );
}
