'use client';

import { useState, useEffect, useCallback } from 'react';
import type { OnlineDailyEntry } from '@/lib/leaderboard/types';
import { localDateISO } from './daily-helpers';

/** Online side of the per-stage Top-3 box: fetches TODAY's daily board once
 *  when the user switches to Online (local date — see localDateISO);
 *  afterwards the entries are served from state and filtered per stage +
 *  difficulty by the Top3Box. Also owns the reload trigger for the LOCAL
 *  side: today's slot scores live in localStorage, so the key is bumped when
 *  the window regains focus — freshly recorded scores appear without a
 *  remount (e.g. when returning from a finished game). */
export function useOnlineTop3() {
  const [top3Source, setTop3Source] = useState<'local' | 'online'>('local');
  const [onlineTop3, setOnlineTop3] = useState<OnlineDailyEntry[] | null>(null);
  const [onlineTop3Loading, setOnlineTop3Loading] = useState(false);
  const [onlineTop3Error, setOnlineTop3Error] = useState<string | null>(null);
  // Reload trigger for the local Top-3 — bumped when the window regains focus
  const [top3ReloadKey, setTop3ReloadKey] = useState(0);

  const loadOnlineTop3 = useCallback(async () => {
    setOnlineTop3Loading(true);
    setOnlineTop3Error(null);
    try {
      const { leaderboardService } = await import('@/lib/api/leaderboard-service');
      const entries = await leaderboardService.fetchDailyLeaderboard(localDateISO());
      setOnlineTop3(entries);
    } catch (err) {
      setOnlineTop3(null);
      setOnlineTop3Error(err instanceof Error ? err.message : 'Server nicht erreichbar');
    } finally {
      setOnlineTop3Loading(false);
    }
  }, []);

  // Fetch once on the first switch to Online (the error flag guards the
  // effect against a refetch loop after a failed request — retry via button).
  useEffect(() => {
    if (top3Source === 'online' && onlineTop3 === null && !onlineTop3Loading && onlineTop3Error === null) {
      void loadOnlineTop3();
    }
  }, [top3Source, onlineTop3, onlineTop3Loading, onlineTop3Error, loadOnlineTop3]);

  // Reload trigger for the LOCAL Top-3: re-read the localStorage scores when
  // the window regains focus.
  useEffect(() => {
    const onFocused = () => setTop3ReloadKey(k => k + 1);
    const onVisibility = () => { if (document.visibilityState === 'visible') setTop3ReloadKey(k => k + 1); };
    window.addEventListener('focus', onFocused);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('focus', onFocused);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return {
    top3Source,
    setTop3Source,
    onlineTop3,
    onlineTop3Loading,
    onlineTop3Error,
    loadOnlineTop3,
    top3ReloadKey,
  };
}
