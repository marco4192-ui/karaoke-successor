/**
 * R84: SESSION cache for the global (online) song boards.
 *
 * Problem it solves: the R81 song boards fetch the whole library's song
 * hashes in 200-hash chunks via `/scores/batch`. That cache used to live in
 * a `useRef` INSIDE the HighscoreScreen component — navigating to another
 * screen unmounted the component and threw the cache away, so every revisit
 * re-fetched every chunk (big libraries: dozens of requests per visit →
 * "Rate limit exceeded" although the boards were identical data).
 *
 * This module keeps the boards at MODULE level: they survive screen changes
 * for the whole app session (a browser reload clears it, which is the
 * intended "session" boundary). A manual refresh (button on the Highscores
 * screen) clears it explicitly.
 *
 * Keying: entries live under `${cacheKey}|${subkey}` where cacheKey is
 * (libraryVersion, mottoKey) — a library change (import/scan) or a
 * theme-party toggle changes the pool of eligible songs and invalidates the
 * boards. The subkey separates the two snapshot kinds:
 *   • 'perdiff'  — fetched with per_difficulty=1 (server v3.7.2+): every
 *                  player's best PER difficulty (up to 3 rows per player per
 *                  song). ONE snapshot answers ALL difficulty chips.
 *   • difficulty — legacy single-difficulty snapshot (old server): only
 *                  answers the difficulty it was fetched for.
 */

import type { BatchScoresResponse } from './types';

/** Difficulty chip values on the board (API naming). */
export type BoardDifficulty = 'all' | 'easy' | 'normal' | 'hard';

/** One cached global-board fetch: the solo ('s') and duet ('d') boards of
 *  every eligible song hash, plus how they were fetched. */
export interface GlobalBoardSnapshot {
  s: BatchScoresResponse;
  d: BatchScoresResponse;
  /** When the boards were fetched (Date.now()) — "last updated" label. */
  fetchedAt: number;
  /** true = fetched with per_difficulty=1 (server v3.7.2+): every player's
   *  best PER difficulty (up to 3 rows per player per song). All difficulty
   *  chips filter this snapshot client-side. */
  perDifficulty: boolean;
  /** Which difficulty the snapshot was fetched for — only meaningful when
   *  perDifficulty is false (legacy single-difficulty fetch). */
  difficulty: BoardDifficulty;
}

const cache = new Map<string, GlobalBoardSnapshot>();

/** Build the cache key: library version (bumped on every song mutation) +
 *  motto-party config — both change the pool of eligible songs. */
export function boardCacheKey(libraryVersion: number, mottoKey: string): string {
  return `v${libraryVersion}|${mottoKey}`;
}

/**
 * The cached snapshot that can answer the given difficulty chip, or null.
 * A per_difficulty snapshot (v3.7.2 server) answers every chip; a legacy
 * snapshot only answers the difficulty it was fetched for.
 */
export function getCachedGlobalBoards(cacheKey: string, difficulty: BoardDifficulty): GlobalBoardSnapshot | null {
  const perDiff = cache.get(`${cacheKey}|perdiff`);
  if (perDiff) return perDiff;
  return cache.get(`${cacheKey}|${difficulty}`) ?? null;
}

/** Store/replace a snapshot (perDifficulty snapshots land under the shared
 *  'perdiff' subkey, legacy ones under their difficulty). */
export function setCachedGlobalBoards(cacheKey: string, snapshot: GlobalBoardSnapshot): void {
  const subkey = snapshot.perDifficulty ? 'perdiff' : snapshot.difficulty;
  cache.set(`${cacheKey}|${subkey}`, snapshot);
}

/** Drop every cached snapshot (manual refresh button / "real" retry). */
export function clearGlobalBoardCache(): void {
  cache.clear();
}
