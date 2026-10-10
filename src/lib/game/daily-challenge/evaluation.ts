// Daily Challenge — target scaling & attempt evaluation
//
// Part of the daily-challenge module (see ./index.ts).

import type { DailyDifficulty } from '../challenge-pools';
import { checkDailyGates, extractDailyMetric } from './gates';
import { DAILY_DIFFICULTIES, getDailyType } from './registry';
import type { DailyAttemptEvaluation, DailyResultMetrics } from './types';

/**
 * Compute the effective target for a daily type at a given difficulty,
 * including the slight level scaling (max +25 % at level 100).
 * 'min' types (missed notes) tighten with level instead of loosening.
 * Percent metrics (accuracy / tickAccuracy) keep their fixed anchors
 * (easy 30 % → insane 75 %) and do NOT scale with level.
 */
export function getDailyTargetFor(type: string, difficulty: DailyDifficulty, level?: number): number {
  const def = getDailyType(type);
  const base = def.targets[difficulty] ?? def.targets.normal;
  const isPercent = def.metricKey === 'accuracy' || def.metricKey === 'tickAccuracy';
  if (isPercent || level === undefined || level <= 1) return base;
  const scale = 1 + Math.min(0.25, level * 0.0025);
  if (def.direction === 'min') {
    return Math.max(1, Math.round(base / scale));
  }
  const scaled = Math.round(base * scale);
  return def.cap !== undefined ? Math.min(def.cap, scaled) : scaled;
}

/** Evaluate an attempt against a daily type: metric, gates, and met difficulties. */
export function evaluateDailyAttempt(type: string, m: DailyResultMetrics, level?: number): DailyAttemptEvaluation {
  const def = getDailyType(type);
  const metric = extractDailyMetric(type, m);
  const gatesPass = checkDailyGates(type, m);
  const met: DailyDifficulty[] = [];
  if (gatesPass && Number.isFinite(metric)) {
    for (const d of DAILY_DIFFICULTIES) {
      const target = getDailyTargetFor(type, d.id, level);
      if (def.direction === 'min' ? metric <= target : metric >= target) {
        met.push(d.id);
      }
    }
  }
  return { metric, gatesPass, met };
}

/** XP multiplier of a difficulty level (unknown → 1). */
export function getDailyDifficultyMultiplier(difficulty?: string): number {
  return DAILY_DIFFICULTIES.find(d => d.id === difficulty)?.xpMultiplier ?? 1;
}
