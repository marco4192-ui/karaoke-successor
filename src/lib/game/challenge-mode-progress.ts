// Challenge Mode completion tracking (per player).
//
// A challenge mode counts as COMPLETED when its optional `completionTarget`
// is met during a playthrough (e.g. "hit 100+ correct notes"). Modes without
// a completionTarget are completed by finishing a song in that mode.
// Completed modes unlock chained follow-up challenges
// (`{ type: 'challenge_completed', value: '<modeId>' }` requirements).

import { getJson, setJson } from '@/lib/storage';
import { CHALLENGE_MODES, type ChallengeCompletionTarget } from './progression-levels';
import { matchesDailyCategory, type DailySongContext } from './challenge-pools';

const STORAGE_KEY_PREFIX = 'karaoke_completed_challenge_modes_';

function storageKey(playerId?: string): string {
  return playerId ? `${STORAGE_KEY_PREFIX}${playerId}` : STORAGE_KEY_PREFIX;
}

/** All challenge mode ids the player has completed (sorted by completion time). */
export function getCompletedChallengeModes(playerId?: string): string[] {
  const stored = getJson<{ modes: string[] } | null>(storageKey(playerId), null);
  return stored?.modes ?? [];
}

/** Whether the player has completed a specific challenge mode. */
export function isChallengeModeCompleted(modeId: string, playerId?: string): boolean {
  return getCompletedChallengeModes(playerId).includes(modeId);
}

/**
 * Evaluate whether a finished game completes the given challenge mode.
 *
 * `result` carries the performance metrics; `song` the sung song's metadata
 * (for category-based modes like "sing a Country song").
 */
export function evaluateChallengeModeCompletion(
  modeId: string,
  result: {
    score: number;
    accuracy: number;
    maxCombo: number;
    perfectNotes: number;
    goldenNotes: number;
    notesHit: number;
    notesMissed: number;
  },
  song?: DailySongContext,
  appLanguage?: string,
): boolean {
  const mode = CHALLENGE_MODES.find(m => m.id === modeId);
  if (!mode) return false;

  // Category requirement (genre / language / decade / …)
  if (mode.category) {
    if (!matchesDailyCategory(mode.category as { field: never; value?: string | number }, song, appLanguage)) {
      return false;
    }
  }

  // No explicit target → finishing the song in this mode completes it
  const target: ChallengeCompletionTarget | undefined = mode.completionTarget;
  if (!target) return true;

  const value = metricValue(target.metric, result);
  return target.direction === 'min' ? value >= target.value : value <= target.value;
}

function metricValue(
  metric: ChallengeCompletionTarget['metric'],
  result: {
    score: number;
    accuracy: number;
    maxCombo: number;
    perfectNotes: number;
    goldenNotes: number;
    notesHit: number;
    notesMissed: number;
  },
): number {
  switch (metric) {
    case 'score': return result.score;
    case 'accuracy': return result.accuracy;
    case 'maxCombo': return result.maxCombo;
    case 'perfectNotes': return result.perfectNotes;
    case 'goldenNotes': return result.goldenNotes;
    case 'notesHit': return result.notesHit;
    case 'notesMissed': return result.notesMissed;
    case 'categoryMatch': return 1;
  }
}

/**
 * Record a challenge mode completion (idempotent).
 * Returns true when this was a NEW completion.
 */
export function markChallengeModeCompleted(modeId: string, playerId?: string): boolean {
  const modes = getCompletedChallengeModes(playerId);
  if (modes.includes(modeId)) return false;
  modes.push(modeId);
  setJson(storageKey(playerId), { modes });
  return true;
}

/**
 * Process a finished game: when a challenge mode was active, evaluate and
 * record its completion. Returns the newly completed mode id (or null).
 */
export function processChallengeModeResult(
  modeId: string | undefined,
  result: {
    score: number;
    accuracy: number;
    maxCombo: number;
    perfectNotes: number;
    goldenNotes: number;
    notesHit: number;
    notesMissed: number;
  },
  playerId?: string,
  song?: DailySongContext,
  appLanguage?: string,
): string | null {
  if (!modeId || !CHALLENGE_MODES.some(m => m.id === modeId)) return null;
  if (evaluateChallengeModeCompletion(modeId, result, song, appLanguage)) {
    const isNew = markChallengeModeCompleted(modeId, playerId);
    return isNew ? modeId : null;
  }
  return null;
}
