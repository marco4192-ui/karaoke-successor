'use client';

import { type ReactNode } from 'react';
import { useMobilePullToRefresh } from '@/hooks/use-mobile-pull-to-refresh';
import { useTranslation } from '@/lib/i18n/translations';

interface MobilePullRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
  className?: string;
}

/**
 * Pull-to-refresh wrapper for mobile list views.
 * Only activates when the scroll container is at the top.
 * Shows an animated arrow that rotates past the threshold, then a spinner while refreshing.
 */
export function MobilePullRefresh({ onRefresh, children, className }: MobilePullRefreshProps) {
  const { t } = useTranslation();
  const { pullDistance, isRefreshing, pullRef, indicatorText, handleTouchStart, handleTouchMove, handleTouchEnd } =
    useMobilePullToRefresh({ onRefresh, threshold: 80 });

  const arrowRotation = Math.min(pullDistance / 80, 1) * 180;
  const indicatorOpacity = pullDistance > 0 || isRefreshing ? 1 : 0;

  return (
    <div
      ref={pullRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className={`overflow-y-auto overscroll-y-contain relative ${className ?? ''}`}
      style={{
        WebkitOverflowScrolling: 'touch',
      }}
    >
      {/* Pull indicator — positioned above content */}
      <div
        className="flex flex-col items-center justify-center overflow-hidden pointer-events-none absolute top-0 left-0 right-0 z-10"
        style={{
          height: isRefreshing ? 48 : Math.max(0, pullDistance),
          opacity: indicatorOpacity,
          transition: 'height 0.2s ease-out, opacity 0.15s ease-out',
          transform: isRefreshing ? 'translateY(0px)' : undefined,
        }}
      >
        {isRefreshing ? (
          <div className="animate-spin w-5 h-5 border-2 border-cyan-500 border-t-transparent rounded-full" />
        ) : (
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            style={{
              transform: `rotate(${arrowRotation}deg)`,
              transition: 'transform 0.1s ease-out',
            }}
            className="text-cyan-400"
          >
            <path
              d="M10 3.5v13M10 3.5L6 7.5M10 3.5l4 4"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
        {(pullDistance > 0 || isRefreshing) && (
          <p className="text-[11px] text-white/40 mt-1 select-none whitespace-nowrap">
            {t(`mobilePullRefresh.${indicatorText}`)}
          </p>
        )}
      </div>

      {/* Scrollable content */}
      <div
        style={{
          transform: pullDistance > 0 && !isRefreshing ? `translateY(${pullDistance}px)` : undefined,
          transition: isRefreshing || pullDistance === 0 ? 'transform 0.2s ease-out' : 'none',
        }}
      >
        {children}
      </div>
    </div>
  );
}
