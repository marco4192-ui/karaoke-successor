// Tournament Mode - Shared Utility Functions
// Match ID generation, round calculations, BYE handling, match lookups, tiebreak resolution

import type { BracketType, TournamentMatch, TournamentSettings, TournamentPlayer } from './tournament-types';

// ─── Match ID Generation ──────────────────────────────────────────

export function generateMatchId(round: number, position: number, bracketType?: BracketType): string {
  if (bracketType === 'grand_finals') {
    return `GF${round}`; // GF1, GF2
  }
  const prefix = bracketType === 'losers' ? 'LR' : bracketType === 'winners' ? 'WR' : 'R';
  return `${prefix}${round}M${position}`;
}

// ─── Utility Functions ────────────────────────────────────────────

export function calculateRounds(numPlayers: number): number {
  return Math.ceil(Math.log2(numPlayers));
}

export function calculateByes(numPlayers: number): number {
  const nextPowerOfTwo = Math.pow(2, Math.ceil(Math.log2(numPlayers)));
  return nextPowerOfTwo - numPlayers;
}

// ─── Build Lookup Map ─────────────────────────────────────────────

/** Build an ID-based lookup for O(1) match access */
export function buildMatchMap(matches: TournamentMatch[]): Map<string, TournamentMatch> {
  const map = new Map<string, TournamentMatch>();
  for (const m of matches) {
    map.set(m.id, m);
  }
  return map;
}

// ─── Select Bye Positions ─────────────────────────────────────────

export function selectByePositions(totalMatches: number, byesNeeded: number): number[] {
  const positions: number[] = [];
  const available = [...Array(totalMatches).keys()];
  const halfSize = Math.floor(totalMatches / 2);

  for (let i = 0; i < byesNeeded && available.length > 0; i++) {
    const half = i % 2 === 0 ? 0 : 1;
    const halfPositions = available.filter(p =>
      half === 0 ? p < halfSize : p >= halfSize
    );

    if (halfPositions.length > 0) {
      const randomIndex = Math.floor(Math.random() * halfPositions.length);
      const position = halfPositions[randomIndex];
      positions.push(position);
      available.splice(available.indexOf(position), 1);
    } else {
      const randomIndex = Math.floor(Math.random() * available.length);
      positions.push(available[randomIndex]);
      available.splice(randomIndex, 1);
    }
  }

  return positions;
}

// ─── Find Next Winners Bracket Match ──────────────────────────────

export function findWBNextMatch(matches: TournamentMatch[], currentMatch: TournamentMatch): TournamentMatch | null {
  const nextRound = currentMatch.round + 1;
  const nextPosition = Math.floor(currentMatch.position / 2);
  return matches.find(m => m.round === nextRound && m.position === nextPosition && m.bracketType === 'winners') || null;
}

// ─── Tiebreak Resolution (#3) ────────────────────────────────────

export function resolveTie(
  match: TournamentMatch,
  mode: TournamentSettings['tiebreakMode'],
  stats?: { accuracy1?: number; accuracy2?: number; maxCombo1?: number; maxCombo2?: number }
): TournamentPlayer {
  if (!match.player1 || !match.player2) return match.player1 ?? match.player2!;

  switch (mode) {
    case 'accuracy': {
      const a1 = stats?.accuracy1 ?? 0;
      const a2 = stats?.accuracy2 ?? 0;
      if (a1 !== a2) return a1 > a2 ? match.player1 : match.player2;
      return Math.random() < 0.5 ? match.player1 : match.player2;
    }
    case 'combo': {
      const c1 = stats?.maxCombo1 ?? 0;
      const c2 = stats?.maxCombo2 ?? 0;
      if (c1 !== c2) return c1 > c2 ? match.player1 : match.player2;
      const a1 = stats?.accuracy1 ?? 0;
      const a2 = stats?.accuracy2 ?? 0;
      if (a1 !== a2) return a1 > a2 ? match.player1 : match.player2;
      return Math.random() < 0.5 ? match.player1 : match.player2;
    }
    case 'goldenmic': {
      const a1 = stats?.accuracy1 ?? 0;
      const a2 = stats?.accuracy2 ?? 0;
      if (a1 !== a2) return a1 > a2 ? match.player1 : match.player2;
      const c1 = stats?.maxCombo1 ?? 0;
      const c2 = stats?.maxCombo2 ?? 0;
      if (c1 !== c2) return c1 > c2 ? match.player1 : match.player2;
      return Math.random() < 0.5 ? match.player1 : match.player2;
    }
    case 'coinflip':
    default:
      return Math.random() < 0.5 ? match.player1 : match.player2;
  }
}
