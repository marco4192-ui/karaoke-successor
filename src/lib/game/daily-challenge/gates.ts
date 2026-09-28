// Daily Challenge — gates & metric extraction
//
// Part of the daily-challenge module (see ./index.ts).
// Gates are the (difficulty-independent) side conditions + category
// requirements a daily/weekly type checks besides the scaled target.

import { matchesDailyCategory } from '../challenge-pools';
import { getDailyType, getWeeklyType } from './registry';
import type { DailyMetricKey, DailyResultMetrics } from './types';

/** Extract the challenge-relevant metric from a result. */
export function extractDailyMetric(type: string, m: DailyResultMetrics): number {
  return metricByKey(getDailyType(type).metricKey, m);
}

/** Read a single metric off a result by its key (tick accuracy falls back to note accuracy). */
function metricByKey(key: DailyMetricKey, m: DailyResultMetrics): number {
  switch (key) {
    case 'score': return m.score;
    case 'accuracy': return m.accuracy;
    case 'tickAccuracy': return m.tickAccuracy ?? m.accuracy;
    case 'maxCombo': return m.combo;
    case 'perfectNotesCount': return m.perfectNotesCount ?? 0;
    case 'goldenNotesCount': return m.goldenNotesCount ?? 0;
    case 'notesHit': return m.notesHit ?? 0;
    case 'notesMissed': return m.notesMissed ?? 0;
    case 'category_match': return m.categoryMatch ?? (m.song ? 0 : 0);
    case 'songsCompleted': return 1;
  }
}

/** Check the (difficulty-independent) gate + category conditions of a daily type. */
export function checkDailyGates(type: string, m: DailyResultMetrics): boolean {
  const def = getDailyType(type);
  // Category requirement: the sung song's metadata must match.
  if (def.category) {
    const matched = m.categoryMatch !== undefined
      ? m.categoryMatch >= 1
      : matchesDailyCategory(def.category, m.song, m.appLanguage);
    if (!matched) return false;
  }
  const gates = def.gates;
  if (!gates) return true;
  return gates.every(g => {
    const value = metricByKey(g.metricKey, m);
    return g.op === '>=' ? value >= g.value : value <= g.value;
  });
}

/** Check gates for a weekly type (same semantics as daily gates). */
export function checkWeeklyGates(type: string, m: DailyResultMetrics): boolean {
  const def = getWeeklyType(type);
  if (def.category) {
    const matched = m.categoryMatch !== undefined
      ? m.categoryMatch >= 1
      : matchesDailyCategory(def.category, m.song, m.appLanguage);
    if (!matched) return false;
  }
  const gates = def.gates;
  if (!gates) return true;
  return gates.every(g => {
    const value = metricByKey(g.metricKey, m);
    return g.op === '>=' ? value >= g.value : value <= g.value;
  });
}

/** Extract the challenge-relevant metric for a weekly type. */
export function extractWeeklyMetric(type: string, m: DailyResultMetrics): number {
  const def = getWeeklyType(type);
  if (def.metricKey === 'category_match') {
    if (m.categoryMatch !== undefined) return m.categoryMatch;
    return def.category ? (matchesDailyCategory(def.category, m.song, m.appLanguage) ? 1 : 0) : 0;
  }
  return metricByKey(def.metricKey, m);
}
