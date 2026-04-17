'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Song } from '@/types/game';

// ============================================================================
// Types
// ============================================================================

export interface ViralMatchInfo {
  title: string;
  artist: string;
  source: string;
  playlistName: string;
  chartPosition: number;
  country: string;
}

export interface ViralMatchResult {
  song_id: string;
  song_title: string;
  song_artist: string;
  chart_entries: ViralMatchInfo[];
}

export interface ViralStatus {
  totalEntries: number;
  matchedCount: number;
  lastFetchedAt: number | null;
  sources: string[];
  country: string;
}

export interface ViralEntry {
  id: string;
  title: string;
  artist: string;
  source: string;
  playlistName: string;
  chartPosition: number;
  country: string;
  fetchedAt: number;
  matchedSongId: string | null;
}

// ============================================================================
// Tauri invoke wrappers
// ============================================================================

async function viralRefreshCharts(country?: string) {
  return invoke<Record<string, unknown>>('viral_refresh_charts', {
    country: country ?? null,
  });
}

async function viralMatchLibrary(songs: { id: string; title: string; artist: string }[]) {
  return invoke<ViralMatchResult[]>('viral_match_library', {
    songsJson: JSON.stringify(songs),
  });
}

async function viralGetMatchedIds() {
  return invoke<string[]>('viral_get_matched_ids');
}

async function viralGetStatus() {
  return invoke<ViralStatus>('viral_get_status');
}

async function viralClear() {
  return invoke<Record<string, unknown>>('viral_clear');
}

async function viralSetCountry(country: string) {
  return invoke<Record<string, unknown>>('viral_set_country', { country });
}

// ============================================================================
// Check if running in Tauri
// ============================================================================

function isTauri(): boolean {
  return typeof window !== 'undefined' &&
    ('__TAURI__' in window || '__TAURI_INTERNALS__' in window);
}

// ============================================================================
// React Hook
// ============================================================================

export interface UseViralCharts {
  /** Set of song IDs that are matched as viral/trending */
  viralSongIds: Set<string>;
  /** Whether a refresh is currently in progress */
  isRefreshing: boolean;
  /** Last refresh error message */
  error: string | null;
  /** Status info (last fetch time, counts, etc.) */
  status: ViralStatus | null;
  /** Manually trigger a chart refresh */
  refreshCharts: (country?: string) => Promise<void>;
  /** Manually trigger matching against library */
  matchLibrary: (songs: Song[]) => Promise<void>;
  /** Get the match info for a specific song */
  getMatchInfo: (songId: string) => ViralMatchInfo[] | null;
  /** Set the chart country */
  setCountry: (country: string) => Promise<void>;
  /** Clear all cached data */
  clearData: () => Promise<void>;
}

export function useViralCharts(): UseViralCharts {
  const [viralSongIds, setViralSongIds] = useState<Set<string>>(new Set());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<ViralStatus | null>(null);
  const [matchDetails, setMatchDetails] = useState<Map<string, ViralMatchInfo[]>>(new Map());

  const mountedRef = useRef(true);
  const matchDetailsRef = useRef(matchDetails);
  matchDetailsRef.current = matchDetails;

  // Load cached matched IDs on mount (fast, no network)
  const loadCachedMatches = useCallback(async () => {
    if (!isTauri()) return;
    try {
      const ids = await viralGetMatchedIds();
      if (mountedRef.current) {
        setViralSongIds(new Set(ids));
      }
    } catch {
      // Silently fail — chart feature is optional
    }
  }, []);

  // Load status
  const loadStatus = useCallback(async () => {
    if (!isTauri()) return;
    try {
      const s = await viralGetStatus();
      if (mountedRef.current) {
        setStatus(s);
      }
    } catch {
      // Silently fail
    }
  }, []);

  // Initialize
  useEffect(() => {
    mountedRef.current = true;
    loadCachedMatches();
    loadStatus();

    // Auto-refresh charts on first load if we have no data
    if (isTauri() && !status?.lastFetchedAt) {
      // Don't auto-refresh immediately — let the user or app trigger it
      // to avoid blocking startup. The library screen will trigger it.
    }

    return () => { mountedRef.current = false; };
  }, []);

  // Refresh charts from external sources
  const refreshCharts = useCallback(async (country?: string) => {
    if (!isTauri()) return;
    setIsRefreshing(true);
    setError(null);
    try {
      await viralRefreshCharts(country);
      if (mountedRef.current) {
        await loadStatus();
        // Clear old matches since chart data changed
        setViralSongIds(new Set());
        setMatchDetails(new Map());
      }
    } catch (e) {
      if (mountedRef.current) {
        setError(e instanceof Error ? e.message : String(e));
      }
    } finally {
      if (mountedRef.current) {
        setIsRefreshing(false);
      }
    }
  }, [loadStatus]);

  // Match chart entries against local library
  const matchLibrary = useCallback(async (songs: Song[]) => {
    if (!isTauri()) return;
    setIsRefreshing(true);
    setError(null);
    try {
      const songData = songs.map(s => ({
        id: s.id,
        title: s.title,
        artist: s.artist,
      }));

      const results = await viralMatchLibrary(songData);

      if (mountedRef.current) {
        const newIds = new Set<string>();
        const newDetails = new Map<string, ViralMatchInfo[]>();

        for (const result of results) {
          newIds.add(result.song_id);
          newDetails.set(result.song_id, result.chart_entries);
        }

        setViralSongIds(newIds);
        setMatchDetails(newDetails);
        await loadStatus();
      }
    } catch (e) {
      if (mountedRef.current) {
        setError(e instanceof Error ? e.message : String(e));
      }
    } finally {
      if (mountedRef.current) {
        setIsRefreshing(false);
      }
    }
  }, [loadStatus]);

  // Get match info for a specific song
  const getMatchInfo = useCallback((songId: string): ViralMatchInfo[] | null => {
    return matchDetailsRef.current.get(songId) ?? null;
  }, []);

  // Set country
  const setCountry = useCallback(async (country: string) => {
    if (!isTauri()) return;
    try {
      await viralSetCountry(country);
      if (mountedRef.current) {
        await loadStatus();
      }
    } catch (e) {
      if (mountedRef.current) {
        setError(e instanceof Error ? e.message : String(e));
      }
    }
  }, [loadStatus]);

  // Clear data
  const clearData = useCallback(async () => {
    if (!isTauri()) return;
    try {
      await viralClear();
      if (mountedRef.current) {
        setViralSongIds(new Set());
        setMatchDetails(new Map());
        setStatus(null);
      }
    } catch (e) {
      if (mountedRef.current) {
        setError(e instanceof Error ? e.message : String(e));
      }
    }
  }, []);

  return {
    viralSongIds,
    isRefreshing,
    error,
    status,
    refreshCharts,
    matchLibrary,
    getMatchInfo,
    setCountry,
    clearData,
  };
}
