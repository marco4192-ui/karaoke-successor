'use client';

import { invoke } from '@tauri-apps/api/core';

// ============================================================================
// Types
// ============================================================================

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
// Stats — used by offline-banner.tsx to show DB status
// ============================================================================

export async function dbGetStats(): Promise<DbStats> {
  return invoke<DbStats>('db_get_stats');
}
