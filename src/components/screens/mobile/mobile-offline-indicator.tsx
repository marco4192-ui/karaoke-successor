'use client';

import { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/translations';

// ============================================================================
// Hook: useNetworkStatus
// ============================================================================

/**
 * Custom hook that detects browser online/offline state.
 * Uses `navigator.onLine` for the initial value and subscribes
 * to `online` / `offline` window events.
 *
 * Returns `{ isOnline, isOffline }` — cleans up listeners on unmount.
 */
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(
    () => (typeof navigator !== 'undefined' ? navigator.onLine : true),
  );

  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);

    // R33: Reconciliation — some environments (headless browsers, embedded
    // webviews, iOS Safari cold starts) capture a stale `false` on mount
    // without ever firing an 'online` event, leaving the banner up forever
    // although the network is up. Periodically + on visibility changes,
    // re-read navigator.onLine as the source of truth.
    const reconcile = () => setIsOnline(navigator.onLine);
    const interval = setInterval(reconcile, 5000);
    document.addEventListener('visibilitychange', reconcile);

    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
      clearInterval(interval);
      document.removeEventListener('visibilitychange', reconcile);
    };
  }, []);

  return { isOnline, isOffline: !isOnline };
}

// ============================================================================
// Component: MobileOfflineIndicator
// ============================================================================

/**
 * Fixed banner that slides in from the top of the screen when the device
 * goes offline.  Uses a dark-red/amber theme consistent with the app's
 * dark design.  `pointer-events-none` ensures it never blocks taps, and
 * `z-50` keeps it above everything else.
 */
export function MobileOfflineIndicator() {
  const { isOffline } = useNetworkStatus();
  const { t } = useTranslation();

  return (
    <div
      role="alert"
      aria-live="polite"
      className={`
        fixed top-0 left-0 right-0 z-50
        pointer-events-none
        flex items-center justify-center gap-2
        bg-gradient-to-r from-red-900/95 via-amber-900/90 to-red-900/95
        border-b border-amber-500/30
        backdrop-blur-md
        px-4 py-2.5
        transition-transform duration-300 ease-in-out
        ${isOffline ? 'translate-y-0' : '-translate-y-full'}
      `}
    >
      <WifiOff className="w-4 h-4 text-amber-400 flex-shrink-0" />
      <span className="text-sm font-semibold text-amber-100">
        {t('mobileOffline.title')}
      </span>
      <span className="hidden sm:inline text-xs text-amber-300/70">
        — {t('mobileOffline.subtitle')}
      </span>
    </div>
  );
}
MobileOfflineIndicator.displayName = 'MobileOfflineIndicator';
