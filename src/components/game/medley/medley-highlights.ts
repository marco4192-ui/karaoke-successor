/**
 * Medley Contest — Highlight Building (Pure Function)
 *
 * Computes a per-snippet highlight summary for the highlight reel.
 */

import type {
  MedleyPlayer, MedleySong, SnippetMatchup, MedleyHighlight,
} from './medley-types';

interface HighlightBuildInput {
  snippetIdx: number;
  song: MedleySong;
  players: MedleyPlayer[];
  isEliminationMode: boolean;
  isTeam: boolean;
  matchups: SnippetMatchup[];
  /** Score snapshots taken at snippet start: playerId -> { score, combo } */
  snippetScoreSnapshots: Record<string, { score: number; combo: number }>;
}

/**
 * Build a highlight record for a snippet that just ended.
 *
 * Determines best/worst scorer and highest combo among the
 * players who were active during that snippet.
 */
export function buildSnippetHighlight(input: HighlightBuildInput): MedleyHighlight {
  const { snippetIdx, song, players, isEliminationMode, isTeam, matchups, snippetScoreSnapshots } = input;

  const activeIds = isEliminationMode
    ? players.filter(p => !p.isEliminated).map(p => p.id)
    : isTeam && snippetIdx < matchups.length
      ? [matchups[snippetIdx].playerA.id, matchups[snippetIdx].playerB.id]
      : players.map(p => p.id);

  let bestPlayerId: string | undefined;
  let bestPlayerScore = -Infinity;
  let worstPlayerId: string | undefined;
  let worstPlayerScore = Infinity;
  let highestComboPlayerId: string | undefined;
  let highestComboValue = 0;

  for (const pid of activeIds) {
    const player = players.find(p => p.id === pid);
    if (!player) continue;
    const start = snippetScoreSnapshots[pid];
    const snippetScore = start ? player.score - start.score : player.score;

    if (snippetScore > bestPlayerScore) {
      bestPlayerScore = snippetScore;
      bestPlayerId = pid;
    }
    if (snippetScore < worstPlayerScore) {
      worstPlayerScore = snippetScore;
      worstPlayerId = pid;
    }
    // Compute per-snippet max combo (not cumulative) using snapshots
    const comboAtStart = start?.combo ?? 0;
    const snippetMaxCombo = player.maxCombo - comboAtStart;
    if (snippetMaxCombo > highestComboValue) {
      highestComboValue = snippetMaxCombo;
      highestComboPlayerId = pid;
    }
  }

  return {
    snippetIdx,
    songTitle: song.song.title,
    songArtist: song.song.artist,
    bestPlayerId,
    bestPlayerScore: bestPlayerScore > -Infinity ? bestPlayerScore : undefined,
    worstPlayerId,
    worstPlayerScore: worstPlayerScore < Infinity ? worstPlayerScore : undefined,
    highestComboPlayerId,
    highestComboValue: highestComboValue > 0 ? highestComboValue : undefined,
  };
}
