/**
 * Medley Contest — Elimination Logic (Pure Function)
 *
 * Computes which player to eliminate after a snippet ends.
 */

import type { MedleyPlayer } from './medley-types';

export interface EliminationInput {
  isEliminationMode: boolean;
  players: MedleyPlayer[];
}

export interface EliminationOutput {
  /** ID of the player to eliminate, or null if no elimination should happen */
  toEliminateId: string | null;
  /** Number of players remaining active AFTER this elimination */
  remainingCount: number;
}

/**
 * Determine the lowest scorer among active (non-eliminated) players
 * and mark them for elimination.
 *
 * Rules:
 * - Only 1 player eliminated per snippet.
 * - Won't eliminate if ≤2 active players remain.
 * - Ties broken randomly.
 */
export function computeElimination(input: EliminationInput): EliminationOutput {
  const { isEliminationMode, players } = input;
  if (!isEliminationMode) {
    return { toEliminateId: null, remainingCount: players.length };
  }

  const activePlayers = players.filter(p => !p.isEliminated);
  if (activePlayers.length <= 2) {
    return { toEliminateId: null, remainingCount: activePlayers.length };
  }

  // Sort by score ascending
  const sorted = [...activePlayers].sort((a, b) => a.score - b.score);
  const lowestScore = sorted[0].score;

  // Find all players tied for lowest, randomly eliminate one
  const tied = sorted.filter(p => p.score === lowestScore);
  const toEliminate = tied[Math.floor(Math.random() * tied.length)];

  return {
    toEliminateId: toEliminate.id,
    remainingCount: activePlayers.length - 1,
  };
}
