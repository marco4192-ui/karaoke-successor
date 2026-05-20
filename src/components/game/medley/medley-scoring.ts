/**
 * Medley Contest — Pure Scoring Helpers
 *
 * Stateless helper functions for dynamic difficulty ramping
 * and random voice modifier selection.
 */

import type { Difficulty } from '@/types/game';
import type { VoiceModifier } from './medley-types';
import { VOICE_MODIFIERS } from './medley-types';

/**
 * Compute the dynamic difficulty for a given snippet index.
 * Ramps from 'easy' on the first snippet to 'hard' on the last.
 */
export function getDynamicDifficulty(
  snippetIdx: number,
  totalSnippets: number,
): Difficulty {
  if (totalSnippets <= 1) return 'medium';
  const ratio = snippetIdx / (totalSnippets - 1); // 0→1
  if (ratio < 0.33) return 'easy';
  if (ratio < 0.66) return 'medium';
  return 'hard';
}

/**
 * Pick a random voice modifier.
 * ~35% chance of 'none' (no effect).
 */
export function pickRandomModifier(): VoiceModifier {
  if (Math.random() < 0.35) return 'none';
  const nonNone = VOICE_MODIFIERS.filter(m => m.id !== 'none');
  const pick = nonNone[Math.floor(Math.random() * nonNone.length)];
  return pick.id;
}
