'use client';

import { WifiOff, Wifi, Upload } from 'lucide-react';
import { useNetworkStatus, clearOfflineQueue } from '@/hooks/use-network-status';

/**
 * Offline banner that shows when:
 * 1. No network connectivity (orange banner)
 * 2. Network is up but server is unreachable (yellow banner)
 * 3. There are pending queued requests (blue badge)
 */
export function OfflineBanner() {
  const { isOnline, isServerReachable, pendingCount } = useNetworkStatus();

  // Don't show anything if online and server is reachable
  if (isOnline && isServerReachable === true && pendingCount === 0) {
    return null;
  }

  // Fully offline
  if (!isOnline) {
    return (
      <div className="fixed top-0 left-0 right-0 z-[100] bg-orange-600/95 text-white text-center text-xs py-1.5 px-4 flex items-center justify-center gap-2">
        <WifiOff className="w-3.5 h-3.5 flex-shrink-0" />
        <span>Offline — Karaoke-Funktionen sind verfügbar, Online-Features deaktiviert</span>
      </div>
    );
  }

  // Online but server unreachable
  if (isServerReachable === false && pendingCount === 0) {
    return (
      <div className="fixed top-0 left-0 right-0 z-[100] bg-yellow-600/90 text-white text-center text-xs py-1.5 px-4 flex items-center justify-center gap-2">
        <Wifi className="w-3.5 h-3.5 flex-shrink-0" />
        <span>Server nicht erreichbar — Leaderboard und Online-Features nicht verf&uuml;gbar</span>
      </div>
    );
  }

  // Pending queue (online but have queued requests from offline period)
  if (pendingCount > 0) {
    return (
      <div className="fixed top-0 left-0 right-0 z-[100] bg-blue-600/90 text-white text-center text-xs py-1.5 px-4 flex items-center justify-center gap-2">
        <Upload className="w-3.5 h-3.5 flex-shrink-0" />
        <span>{pendingCount} ausstehende Anfrage{pendingCount > 1 ? 'n' : ''} in der Warteschlange</span>
        <button
          onClick={clearOfflineQueue}
          className="ml-2 underline hover:no-underline text-blue-200"
        >
          Verwerfen
        </button>
      </div>
    );
  }

  // Server check still in progress
  if (isServerReachable === null) {
    return null;
  }

  return null;
}
