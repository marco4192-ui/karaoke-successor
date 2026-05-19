/**
 * Medley Contest — Team Bonus Logic (Pure Functions)
 *
 * All team bonus computations (synergy, comeback, MVP) as pure
 * functions that accept their dependencies and return results.
 * The main hook applies these results to state.
 */

import type {
  MedleyPlayer, MedleySong, SnippetMatchup, TeamBonusResult,
} from './medley-types';

// ── Synergy ──

export interface SynergyCheckInput {
  isTeam: boolean;
  teamBonusesEnabled: boolean;
  snippetIdx: number;
  matchups: SnippetMatchup[];
  players: MedleyPlayer[];
  currentBonusResult: TeamBonusResult;
}

export interface SynergyCheckOutput {
  /** Per-team points to add */
  synergyPoints: Record<string, number>;
  /** Per-player bonus to add directly */
  playerBonuses: Array<{ playerId: string; points: number }>;
}

/**
 * Check whether both players in the current matchup achieved >80% accuracy.
 * Returns point additions or null if no synergy.
 */
export function computeSynergy(input: SynergyCheckInput): SynergyCheckOutput | null {
  const { isTeam, teamBonusesEnabled, snippetIdx, matchups, players, currentBonusResult } = input;
  if (!isTeam || !teamBonusesEnabled) return null;
  if (snippetIdx >= matchups.length) return null;

  const matchup = matchups[snippetIdx];
  const playerA = players.find(p => p.id === matchup.playerA.id);
  const playerB = players.find(p => p.id === matchup.playerB.id);
  if (!playerA || !playerB) return null;

  const accA = playerA.notesHit + playerA.notesMissed > 0
    ? playerA.notesHit / (playerA.notesHit + playerA.notesMissed)
    : 0;
  const accB = playerB.notesHit + playerB.notesMissed > 0
    ? playerB.notesHit / (playerB.notesHit + playerB.notesMissed)
    : 0;

  if (accA > 0.8 && accB > 0.8) {
    const SYNERGY_BONUS = 300;
    const teamAId = String(playerA.team);
    const teamBId = String(playerB.team);

    return {
      synergyPoints: {
        [teamAId]: (currentBonusResult.synergyPoints[teamAId] || 0) + SYNERGY_BONUS,
        [teamBId]: (currentBonusResult.synergyPoints[teamBId] || 0) + SYNERGY_BONUS,
      },
      playerBonuses: [
        { playerId: playerA.id, points: SYNERGY_BONUS },
        { playerId: playerB.id, points: SYNERGY_BONUS },
      ],
    };
  }

  return null;
}

// ── Comeback (pre-check) ──

export interface ComebackPreCheckInput {
  isTeam: boolean;
  teamBonusesEnabled: boolean;
  snippetIdx: number;
  totalSnippets: number;
  players: MedleyPlayer[];
}

export interface ComebackPreCheckOutput {
  /** The underdog team number (0 or 1) */
  underdogTeam: number;
  /** Team ID as string for storage */
  teamId: string;
  /** Multiplier to apply (1.5) */
  multiplier: number;
}

/**
 * Check whether the underdog team should get a comeback boost
 * on the last snippet.  Returns null if not applicable.
 */
export function computeComebackPreCheck(input: ComebackPreCheckInput): ComebackPreCheckOutput | null {
  const { isTeam, teamBonusesEnabled, snippetIdx, totalSnippets, players } = input;
  if (!isTeam || !teamBonusesEnabled) return null;
  const isLastSnippet = snippetIdx === totalSnippets - 1;
  if (!isLastSnippet) return null;

  const teamAScore = players.filter(p => p.team === 0).reduce((s, p) => s + p.score, 0);
  const teamBScore = players.filter(p => p.team === 1).reduce((s, p) => s + p.score, 0);

  const underdogTeam = teamAScore < teamBScore ? 0 : teamBScore < teamAScore ? 1 : null;
  if (underdogTeam === null) return null;

  return {
    underdogTeam,
    teamId: String(underdogTeam),
    multiplier: 1.5,
  };
}

// ── Comeback (finalize) ──

export interface ComebackFinalizeInput {
  isTeam: boolean;
  teamBonusesEnabled: boolean;
  comebackTeamId: string | null;
  players: MedleyPlayer[];
  /** Score snapshots taken at snippet start: playerId -> { score, combo } */
  snippetScoreSnapshots: Record<string, { score: number; combo: number }>;
}

/**
 * After the last snippet ends, compute the extra bonus that was applied
 * during scoring via the 1.5x multiplier.  Returns the bonus amount
 * to add to the team total, or 0 if not applicable.
 */
export function computeComebackFinalize(input: ComebackFinalizeInput): number {
  const { isTeam, teamBonusesEnabled, comebackTeamId, players, snippetScoreSnapshots } = input;
  if (!isTeam || !teamBonusesEnabled || !comebackTeamId) return 0;

  const underdogTeam = parseInt(comebackTeamId, 10);
  const teamPlayers = players.filter(p => p.team === underdogTeam);
  const snippetScores = teamPlayers.map(p => {
    const start = snippetScoreSnapshots[p.id];
    return start ? p.score - start.score : 0;
  });
  const totalSnippetScore = snippetScores.reduce((s, v) => s + v, 0);
  // Since we multiplied by 1.5 during scoring, the bonus is the 0.5x extra
  return Math.round(totalSnippetScore / 3);
}

// ── MVP ──

/**
 * Determine the MVP (highest scorer) among all players.
 * Returns the player ID or null if no players.
 */
export function computeMVP(players: MedleyPlayer[]): string | null {
  if (players.length === 0) return null;
  const best = players.reduce((best, p) => p.score > best.score ? p : best, players[0]);
  return best.id;
}
