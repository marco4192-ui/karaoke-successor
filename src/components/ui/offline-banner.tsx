'use client';

import { WifiOff, Wifi, Database } from 'lucide-react';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { dbGetStats, type DbStats } from '@/hooks/use-sqlite';
import { useEffect, useState } from 'react';
import { useTranslation } from '@/lib/i18n/translations';

/**
 * Offline banner that shows when:
 * 1. No network connectivity (orange banner) — shows SQLite local data stats
 * 2. Network is up but server is unreachable (yellow banner)
 *
 * When offline, core karaoke features (library, playback, scoring) remain
 * fully functional because all data is stored in a local SQLite database
 * via Tauri native commands.
 *
 * R80: rendered IN FLOW (w-full) instead of `fixed top-0 z-[100]` — the old
 * overlay covered the NavBar and the page heading whenever it appeared.
 * As the first child of the app's flex column it now pushes the header and
 * content down instead of floating over them.
 */
export function OfflineBanner() {
  const { isOnline, isServerReachable } = useNetworkStatus();
  const [dbStats, setDbStats] = useState<DbStats | null>(null);
  const { t } = useTranslation();

  // Fetch SQLite stats when offline to show what's available locally

  useEffect(() => {
    if (isOnline) {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync
      setDbStats(null);
      return;
    }
    dbGetStats().then(setDbStats).catch(() => setDbStats(null));
  }, [isOnline]);

  // Don't show anything if online and server is reachable
  if (isOnline && isServerReachable === true) {
    return null;
  }

  // Fully offline — show local SQLite data availability
  if (!isOnline) {
    const localInfo = dbStats
      ? t('offlineBanner.songsPlaylists').replace('{songs}', String(dbStats.songs)).replace('{playlists}', String(dbStats.playlists))
      : t('offlineBanner.localData');

    return (
      <div role="alert" aria-live="polite" className="w-full bg-orange-600/95 text-white text-center text-xs py-1.5 px-4">
        <div className="flex items-center justify-center gap-2">
          <WifiOff className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{t('offlineBanner.offline')}</span>
          <Database className="w-3.5 h-3.5 flex-shrink-0 opacity-80" />
          <span>{localInfo}</span>
        </div>
      </div>
    );
  }

  // Online but server unreachable
  if (isServerReachable === false) {
    return (
      <div role="alert" aria-live="polite" className="w-full bg-yellow-600/90 text-white text-center text-xs py-1.5 px-4 flex items-center justify-center gap-2">
        <Wifi className="w-3.5 h-3.5 flex-shrink-0" />
        <span>{t('offlineBanner.serverUnreachable')}</span>
      </div>
    );
  }

  // Server check still in progress
  return null;
}
