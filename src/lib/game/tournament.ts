// Tournament Mode - Single & Double Elimination Bracket System
// Barrel file: re-exports all sub-modules + core bracket creation & match recording

// ─── Re-exports from sub-modules ──────────────────────────────────

// Types & Interfaces
export type {
  BracketType,
  TournamentPlayer,
  TournamentMatch,
  TournamentBracket,
  TournamentSettings,
} from './tournament-types';

// Stats, Placements, Hall of Fame, Crowd Votes, Difficulty
export {
  getTournamentStats,
  getPlayerPlacements,
  getHallOfFame,
  addToHallOfFame,
  clearHallOfFame,
  getEffectiveDifficulty,
  getFanFavorites,
  isSpectator,
} from './tournament-stats';
export type { HallOfFameEntry, CrowdVoteMatch } from './tournament-stats';

// Double Elimination helpers
export {
  getLBRoundName,
  isInLosersBracket,
} from './tournament-double-elim';

// ─── Core Imports ─────────────────────────────────────────────────

import { shuffleArray } from '@/lib/utils';
import type { TournamentPlayer, TournamentMatch, TournamentBracket, TournamentSettings, BracketType } from './tournament-types';
import {
  generateMatchId,
  calculateRounds,
  calculateByes,
  buildMatchMap,
  selectByePositions,
  findWBNextMatch,
  resolveTie,
} from './tournament-utils';
import {
  generateLosersBracket,
  generateGrandFinals,
  recordDoubleEliminationResult,
  getPlayableMatchesDoubleElim,
} from './tournament-double-elim';

// ─── Create Tournament ────────────────────────────────────────────

export function createTournament(
  players: TournamentPlayer[],
  settings: TournamentSettings
): TournamentBracket {
  if (players.length < 2) {
    throw new Error('Tournament requires at least 2 players');
  }
  if (players.length > settings.maxPlayers) {
    throw new Error(`Tournament supports maximum ${settings.maxPlayers} players`);
  }

  const totalRounds = calculateRounds(players.length);
  const byesNeeded = calculateByes(players.length);

  // #4 Double Elimination requires exact power-of-2 players (no BYEs)
  if (settings.tournamentType === 'double' && byesNeeded > 0) {
    throw new Error('Double Elimination requires exactly 2, 4, 8, 16, or 32 players');
  }

  // #9 Seed players: random shuffle or by strength
  let seededPlayers: typeof players;
  if (settings.seedingMode === 'strength') {
    seededPlayers = [...players].sort((a, b) => a.seed - b.seed);
  } else {
    seededPlayers = shuffleArray(players);
  }
  const shuffledPlayers = seededPlayers.map((p, i) => ({
    ...p,
    seed: i + 1,
    eliminated: false,
    lossCount: 0, // #4 Initialize loss count for double elimination
  }));

  // Generate winners bracket structure (same for single and double elimination)
  const matches = generateWinnersBracket(shuffledPlayers, totalRounds, byesNeeded);

  // #4 Generate losers bracket and grand finals for double elimination
  const losersTotalRounds = settings.tournamentType === 'double' ? (totalRounds <= 1 ? 0 : 2 * totalRounds - 2) : 0;

  if (settings.tournamentType === 'double' && losersTotalRounds > 0) {
    const lbMatches = generateLosersBracket(totalRounds, players.length);
    const gfMatches = generateGrandFinals();
    matches.push(...lbMatches, ...gfMatches);
  }

  return {
    id: `tournament_${Date.now()}`,
    name: `Tournament ${new Date().toLocaleDateString()}`,
    players: shuffledPlayers,
    matches,
    currentRound: 1,
    totalRounds,
    losersTotalRounds,
    champion: null,
    status: 'in_progress',
    createdAt: Date.now(),
    settings,
    grandFinalsResetNeeded: false,
  };
}

// ─── Winners Bracket Generation ───────────────────────────────────

function generateWinnersBracket(
  players: TournamentPlayer[],
  totalRounds: number,
  byesNeeded: number
): TournamentMatch[] {
  const matches: TournamentMatch[] = [];
  const firstRoundMatches = Math.pow(2, totalRounds - 1);

  const playerQueue = [...players];
  const byePositions = selectByePositions(firstRoundMatches, byesNeeded);

  // Create first round matches
  for (let i = 0; i < firstRoundMatches; i++) {
    const isByeMatch = byePositions.includes(i);
    let player1: TournamentPlayer | null = null;
    let player2: TournamentPlayer | null = null;

    if (!isByeMatch && playerQueue.length > 0) {
      player1 = playerQueue.shift() || null;
    }
    if (!isByeMatch && playerQueue.length > 0) {
      player2 = playerQueue.shift() || null;
    } else if (isByeMatch && playerQueue.length > 0) {
      player1 = playerQueue.shift() || null;
    }

    matches.push({
      id: generateMatchId(1, i + 1, 'winners'),
      round: 1,
      position: i,
      bracketType: 'winners',
      player1,
      player2,
      winner: isByeMatch && player1 ? player1 : null,
      loser: null,
      score1: 0,
      score2: 0,
      completed: isByeMatch && !!player1,
      isBye: isByeMatch && !player2,
    });
  }

  // Create subsequent round matches (empty placeholders)
  for (let round = 2; round <= totalRounds; round++) {
    const roundMatches = Math.pow(2, totalRounds - round);
    for (let i = 0; i < roundMatches; i++) {
      matches.push({
        id: generateMatchId(round, i + 1, 'winners'),
        round,
        position: i,
        bracketType: 'winners',
        player1: null,
        player2: null,
        winner: null,
        loser: null,
        score1: 0,
        score2: 0,
        completed: false,
        isBye: false,
      });
    }
  }

  // Advance BYE winners into their next-round match slots
  for (const match of matches) {
    if (match.isBye && match.winner) {
      const nextMatch = findWBNextMatch(matches, match);
      if (nextMatch) {
        if (match.position % 2 === 0) {
          nextMatch.player1 = match.winner;
        } else {
          nextMatch.player2 = match.winner;
        }
      }
    }
  }

  return matches;
}

// ─── Query Functions ──────────────────────────────────────────────

/** Get matches for a specific round, optionally filtered by bracket type */
export function getMatchesForRound(
  bracket: TournamentBracket,
  round: number,
  bracketType?: BracketType
): TournamentMatch[] {
  return bracket.matches.filter(m =>
    m.round === round && (!bracketType || m.bracketType === bracketType)
  );
}

/** Get all matches of a specific bracket type */
export function getMatchesByBracketType(
  bracket: TournamentBracket,
  bracketType: BracketType
): TournamentMatch[] {
  return bracket.matches.filter(m => m.bracketType === bracketType);
}

/**
 * Get all matches that are ready to play.
 * For single elimination: same logic as before.
 * For double elimination: includes WB, LB, and GF matches that have both players
 * and all feeder matches completed.
 */
export function getPlayableMatches(bracket: TournamentBracket): TournamentMatch[] {
  if (bracket.settings.tournamentType === 'double') {
    return getPlayableMatchesDoubleElim(bracket);
  }

  // Single elimination: original logic
  const lookup = buildMatchMap(bracket.matches);
  return bracket.matches.filter(
    m => {
      if (m.completed || !m.player1 || !m.player2 || m.isBye) return false;
      if (m.round === 1) return true;
      // Match IDs use 1-based position (generateMatchId uses pos + 1 in generation)
      // but position field is 0-based, so we need +1 offset
      const pos = m.position;
      const feeder1 = lookup.get(generateMatchId(m.round - 1, pos * 2 + 1, 'winners'));
      const feeder2 = lookup.get(generateMatchId(m.round - 1, pos * 2 + 2, 'winners'));
      return !!(feeder1 && feeder1.completed) && !!(feeder2 && feeder2.completed);
    }
  );
}

// ─── Record Match Result ─────────────────────────────────────────

export function recordMatchResult(
  bracket: TournamentBracket,
  matchId: string,
  score1: number,
  score2: number,
  stats?: {
    accuracy1?: number;
    accuracy2?: number;
    maxCombo1?: number;
    maxCombo2?: number;
    songTitle?: string;
    songArtist?: string;
  }
): TournamentBracket {
  const matchIndex = bracket.matches.findIndex(m => m.id === matchId);
  if (matchIndex === -1) return bracket;

  const match = { ...bracket.matches[matchIndex] };

  if (!match.player1 || !match.player2 || match.completed) {
    return bracket;
  }

  // Store extended stats
  match.accuracy1 = stats?.accuracy1;
  match.accuracy2 = stats?.accuracy2;
  match.maxCombo1 = stats?.maxCombo1;
  match.maxCombo2 = stats?.maxCombo2;
  match.songTitle = stats?.songTitle;
  match.songArtist = stats?.songArtist;

  // Determine winner
  let winner: TournamentPlayer;
  let isTiebreak = false;

  if (score1 > score2) {
    winner = match.player1;
  } else if (score2 > score1) {
    winner = match.player2;
  } else {
    isTiebreak = true;
    winner = resolveTie(match, bracket.settings.tiebreakMode, stats);
  }
  match.isTiebreak = isTiebreak;

  const loser = winner.id === match.player1.id ? match.player2 : match.player1;

  match.score1 = score1;
  match.score2 = score2;
  match.winner = winner;
  match.loser = loser;
  match.completed = true;

  // Update matches array
  const updatedMatches = [...bracket.matches];
  updatedMatches[matchIndex] = match;

  // Route based on tournament type and bracket type
  if (bracket.settings.tournamentType === 'double') {
    return recordDoubleEliminationResult(
      { ...bracket, matches: updatedMatches },
      match,
      winner,
      loser,
    );
  }

  // ── Single Elimination ──
  // Mark loser as eliminated
  const updatedPlayers = bracket.players.map(p =>
    p.id === loser.id ? { ...p, eliminated: true } : p
  );

  // Advance winner in WB
  const nextMatch = findWBNextMatch(updatedMatches, match);
  if (nextMatch) {
    const nextMatchIndex = updatedMatches.findIndex(m => m.id === nextMatch!.id);
    if (match.position % 2 === 0) {
      updatedMatches[nextMatchIndex] = { ...updatedMatches[nextMatchIndex], player1: winner };
    } else {
      updatedMatches[nextMatchIndex] = { ...updatedMatches[nextMatchIndex], player2: winner };
    }
  }

  // Check round completion
  const currentRoundMatches = updatedMatches.filter(
    m => m.round === bracket.currentRound && m.bracketType === 'winners'
  );
  const roundComplete = currentRoundMatches.every(m => m.completed);

  let newStatus = bracket.status;
  let champion = bracket.champion;
  let newCurrentRound = bracket.currentRound;

  if (roundComplete) {
    if (bracket.currentRound === bracket.totalRounds) {
      newStatus = 'completed';
      champion = winner;
    } else {
      newCurrentRound = bracket.currentRound + 1;
    }
  }

  return {
    ...bracket,
    matches: updatedMatches,
    players: updatedPlayers,
    currentRound: newCurrentRound,
    champion,
    status: newStatus,
  };
}
