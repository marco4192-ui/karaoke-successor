// Daily Challenge — (#1) per-player best results & metric helpers
//
// Part of the daily-challenge module (see ./index.ts).

import { getJson, setJson } from '@/lib/storage';
import { todayISO } from './date-utils';
import { PLAYER_BEST_RESULTS_KEY } from './storage-keys';
import { getDailyType } from './registry';
import type {
  DailyChallengeData,
  DailyChallengeEntry,
  DailyChallengeType,
  DailyResultMetrics,
  PlayerBestResult,
} from './types';

// ---------------------------------------------------------------------------
// (#1) Per-Player Best Results Tracking
// ---------------------------------------------------------------------------

/**
 * Retrieve the stored best result for a player on today's daily challenge.
 * Returns `null` if the player has no result for today or the stored date differs.
 */
export function getPlayerBestResult(playerId: string): PlayerBestResult | null {
  const today = todayISO();
  const all = getJson<Record<string, PlayerBestResult & { date: string }>>(PLAYER_BEST_RESULTS_KEY, {});
  const entry = all[playerId];
  if (!entry || entry.date !== today) return null;
  const { date: _date, ...best } = entry;
  return best;
}

/**
 * Save (or update) the best result for a player on today's daily challenge.
 * If the player already has a better result for today, the stored value is kept.
 */
export function savePlayerBestResult(playerId: string, result: PlayerBestResult): void {
  const today = todayISO();
  const all = getJson<Record<string, PlayerBestResult & { date: string }>>(PLAYER_BEST_RESULTS_KEY, {});
  all[playerId] = { ...result, date: today };
  setJson(PLAYER_BEST_RESULTS_KEY, all);
}

// ---------------------------------------------------------------------------
// (#1) Best-result metric helper
// ---------------------------------------------------------------------------

/** Extract the challenge-type metric from a PlayerBestResult for comparison. */
export function getBestMetric(best: PlayerBestResult, type: DailyChallengeData['type']): number {
  switch (getDailyType(type).metricKey) {
    case 'accuracy': return best.accuracy;
    case 'tickAccuracy': return best.tickAccuracy ?? best.accuracy;
    case 'maxCombo': return best.combo;
    case 'perfectNotesCount': return best.perfectNotes;
    case 'goldenNotesCount': return best.goldenNotes ?? 0;
    case 'notesHit': return best.notesHit ?? 0;
    case 'notesMissed': return best.notesMissed ?? 0;
    default: return best.score;
  }
}

/** Public variant of {@link getBestMetric} for UI rendering (best-attempt box). */
export function getBestResultMetric(best: PlayerBestResult, type: string): number {
  return getBestMetric(best, type as DailyChallengeType);
}

/** Adapt a leaderboard entry to the DailyResultMetrics shape (old entries default to 0). */
export function entryToMetrics(entry: DailyChallengeEntry): DailyResultMetrics {
  return {
    score: entry.score,
    accuracy: entry.accuracy,
    tickAccuracy: entry.tickAccuracy,
    combo: entry.combo,
    perfectNotesCount: entry.perfectNotesCount,
    goldenNotesCount: entry.goldenNotesCount,
    notesHit: entry.notesHit,
    notesMissed: entry.notesMissed,
  };
}
