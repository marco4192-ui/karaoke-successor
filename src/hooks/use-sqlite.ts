'use client';

import { useCallback, useState, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';

// ============================================================================
// Types
// ============================================================================

export interface DbResult {
  success: boolean;
  rows_affected: number;
  message: string;
}

export interface DbStats {
  songs: number;
  folders: number;
  profiles: number;
  highscores: number;
  playlists: number;
  settings: number;
  dbSizeBytes: number;
  dbPath: string;
}

// ============================================================================
// Songs
// ============================================================================

export async function dbSaveSongs(songs: unknown[]): Promise<DbResult> {
  return invoke<DbResult>('db_save_songs', { songsJson: JSON.stringify(songs) });
}

export async function dbLoadSongs<T = unknown>(): Promise<T[]> {
  return invoke<T[]>('db_load_songs');
}

export async function dbGetSongCount(): Promise<number> {
  return invoke<number>('db_get_song_count');
}

export async function dbSearchSongs<T = unknown>(query: string, limit?: number): Promise<T[]> {
  return invoke<T[]>('db_search_songs', { query, limit });
}

// ============================================================================
// Folders
// ============================================================================

export async function dbSaveFolders(folders: unknown[]): Promise<DbResult> {
  return invoke<DbResult>('db_save_folders', { foldersJson: JSON.stringify(folders) });
}

export async function dbLoadFolders<T = unknown>(): Promise<T[]> {
  return invoke<T[]>('db_load_folders');
}

// ============================================================================
// Root Folders
// ============================================================================

export async function dbSaveRootFolders(paths: string[]): Promise<DbResult> {
  return invoke<DbResult>('db_save_root_folders', { paths });
}

export async function dbLoadRootFolders(): Promise<string[]> {
  return invoke<string[]>('db_load_root_folders');
}

// ============================================================================
// Profiles
// ============================================================================

export async function dbSaveProfile(profile: unknown): Promise<DbResult> {
  return invoke<DbResult>('db_save_profile', { profileJson: JSON.stringify(profile) });
}

export async function dbLoadProfiles<T = unknown>(): Promise<T[]> {
  return invoke<T[]>('db_load_profiles');
}

export async function dbDeleteProfile(profileId: string): Promise<DbResult> {
  return invoke<DbResult>('db_delete_profile', { profileId });
}

// ============================================================================
// Highscores
// ============================================================================

export async function dbSaveHighscore(highscore: unknown): Promise<DbResult> {
  return invoke<DbResult>('db_save_highscore', { highscoreJson: JSON.stringify(highscore) });
}

export async function dbLoadHighscores<T = unknown>(options?: {
  playerId?: string;
  songId?: string;
  limit?: number;
}): Promise<T[]> {
  return invoke<T[]>('db_load_highscores', {
    playerId: options?.playerId ?? null,
    songId: options?.songId ?? null,
    limit: options?.limit ?? null,
  });
}

// ============================================================================
// Playlists
// ============================================================================

export async function dbSavePlaylist(playlist: unknown): Promise<DbResult> {
  return invoke<DbResult>('db_save_playlist', { playlistJson: JSON.stringify(playlist) });
}

export async function dbLoadPlaylists<T = unknown>(): Promise<T[]> {
  return invoke<T[]>('db_load_playlists');
}

export async function dbDeletePlaylist(playlistId: string): Promise<DbResult> {
  return invoke<DbResult>('db_delete_playlist', { playlistId });
}

// ============================================================================
// Settings
// ============================================================================

export async function dbGetSetting(key: string): Promise<string | null> {
  return invoke<string | null>('db_get_setting', { key });
}

export async function dbSetSetting(key: string, value: string): Promise<DbResult> {
  return invoke<DbResult>('db_set_setting', { key, value });
}

export async function dbDeleteSetting(key: string): Promise<DbResult> {
  return invoke<DbResult>('db_delete_setting', { key });
}

export async function dbGetAllSettings(): Promise<Array<[string, string]>> {
  return invoke<Array<[string, string]>>('db_get_all_settings');
}

// ============================================================================
// Maintenance
// ============================================================================

export async function dbClearAll(): Promise<DbResult> {
  return invoke<DbResult>('db_clear_all');
}

export async function dbGetStats(): Promise<DbStats> {
  return invoke<DbStats>('db_get_stats');
}

// ============================================================================
// React Hook — convenient stateful wrapper
// ============================================================================

export interface UseSqliteDb {
  isReady: boolean;
  stats: DbStats | null;
  error: string | null;
  refreshStats: () => Promise<void>;
}

export function useSqliteDb(): UseSqliteDb {
  const [isReady, setIsReady] = useState(false);
  const [stats, setStats] = useState<DbStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const refreshStats = useCallback(async () => {
    try {
      const s = await dbGetStats();
      if (mountedRef.current) {
        setStats(s);
        setIsReady(true);
        setError(null);
      }
    } catch (e) {
      if (mountedRef.current) {
        setError(e instanceof Error ? e.message : String(e));
        setIsReady(false);
      }
    }
  }, []);

  // Initial stats fetch
  if (!stats && !error && !isReady) {
    refreshStats();
  }

  // Cleanup
  const prevRef = useRef(mountedRef);
  prevRef.current = mountedRef;

  // Simple mount/unmount tracking
  if (typeof window !== 'undefined') {
    if (!mountedRef.current) {
      mountedRef.current = true;
    }
  }

  return { isReady, stats, error, refreshStats };
}
