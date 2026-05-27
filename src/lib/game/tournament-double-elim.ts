// Tournament Mode - Double Elimination Specific Logic
// Losers bracket generation, Grand Finals, drop/advance routing, DE result handling, DE helpers

import type { TournamentPlayer, TournamentMatch, TournamentBracket } from './tournament-types';
import { generateMatchId, buildMatchMap, findWBNextMatch } from './tournament-utils';

// ─── Losers Bracket Generation (#4 Double Elimination) ───────────

/**
 * Losers Bracket Structure for N players with R = log2(N) WB rounds:
 *
 * The LB has (2*R - 2) rounds. It alternates between:
 * - "WB drop" rounds (even): WB losers enter and face LB winners from previous round
 * - "Consolidation" rounds (odd, >1): LB winners face each other
 * - Round 1 (special): WB R1 losers face each other, paired adjacently
 *
 * For 8 players (R=3): LB R1->R2->R3->R4 (4 rounds)
 * For 16 players (R=4): LB R1->R2->R3->R4->R5->R6 (6 rounds)
 */
export function generateLosersBracket(
  wbRounds: number,
  numPlayers: number
): TournamentMatch[] {
  const lbMatches: TournamentMatch[] = [];
  const lbTotalRounds = 2 * wbRounds - 2;

  for (let lbRound = 1; lbRound <= lbTotalRounds; lbRound++) {
    const matchesCount = getLBMatchesCount(lbRound, wbRounds, numPlayers);

    for (let pos = 0; pos < matchesCount; pos++) {
      lbMatches.push({
        id: generateMatchId(lbRound, pos, 'losers'),
        round: lbRound,
        position: pos,
        bracketType: 'losers',
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

  return lbMatches;
}

/** Calculate the number of matches in a given losers bracket round */
function getLBMatchesCount(lbRound: number, wbRounds: number, numPlayers: number): number {
  const N = Math.pow(2, wbRounds); // Use power-of-2 size (DE always uses exact Po2)

  if (lbRound === 1) {
    // WB R1 losers face each other: N/4 matches
    return N / 4;
  }
  if (lbRound % 2 === 0) {
    // WB drop round: WB R(lbRound/2+1) has N/(2^(lbRound/2+1)) matches
    return Math.pow(2, wbRounds - lbRound / 2 - 1);
  }
  // Consolidation round (odd, >1): half of previous round's matches
  return Math.pow(2, wbRounds - Math.floor(lbRound / 2) - 2);
}

// ─── Grand Finals Generation (#4) ─────────────────────────────────

export function generateGrandFinals(): TournamentMatch[] {
  return [
    {
      id: 'GF1',
      round: 1,
      position: 0,
      bracketType: 'grand_finals',
      player1: null,
      player2: null,
      winner: null,
      loser: null,
      score1: 0,
      score2: 0,
      completed: false,
      isBye: false,
    },
    {
      id: 'GF2',
      round: 2,
      position: 0,
      bracketType: 'grand_finals',
      player1: null,
      player2: null,
      winner: null,
      loser: null,
      score1: 0,
      score2: 0,
      completed: false,
      isBye: false,
      isReset: true,
    },
  ];
}

// ─── Double Elimination: Drop to Losers Bracket ───────────────────

/**
 * When a player loses in the winners bracket, they drop to the losers bracket.
 * This function finds the correct LB match and assigns the loser to it.
 *
 * - WB R1 losers: paired adjacently -> LB R1 M(floor(pos/2))
 * - WB R(r) losers (r>1): drop to LB R(2*(r-1)) M(pos) as player1
 */
function dropToLosersBracket(
  matches: TournamentMatch[],
  wbMatch: TournamentMatch,
  loser: TournamentPlayer
): TournamentMatch[] {
  const updated = [...matches];

  let targetLBMatch: TournamentMatch | null = null;
  let assignAs: 'player1' | 'player2';

  if (wbMatch.round === 1) {
    // WB R1 losers are paired adjacently
    const lbPosition = Math.floor(wbMatch.position / 2);
    targetLBMatch = updated.find(m => m.round === 1 && m.position === lbPosition && m.bracketType === 'losers') || null;
    assignAs = wbMatch.position % 2 === 0 ? 'player1' : 'player2';
  } else {
    // WB R(r) losers (r>1) drop to LB R(2*(r-1))
    const lbRound = 2 * (wbMatch.round - 1);
    const lbPosition = wbMatch.position;
    targetLBMatch = updated.find(m => m.round === lbRound && m.position === lbPosition && m.bracketType === 'losers') || null;
    assignAs = 'player1'; // WB losers are always player1 in drop rounds
  }

  if (targetLBMatch) {
    const idx = updated.findIndex(m => m.id === targetLBMatch.id);
    if (idx !== -1) {
      updated[idx] = { ...updated[idx], [assignAs]: loser };
    }
  }

  return updated;
}

// ─── Double Elimination: Advance in Losers Bracket ────────────────

/**
 * When a player wins in the losers bracket, they advance to the next LB round.
 *
 * - After LB R(k) where k is odd (consolidation): winner goes to LB R(k+1) M(pos) as player2
 *   (next round is a WB drop round, and LB winners are always player2)
 * - After LB R(k) where k is even (WB drop): winner goes to LB R(k+1) M(floor(pos/2))
 *   (next round is consolidation, paired adjacently)
 * - After last LB round (2R-2): winner goes to Grand Finals as player2
 */
function advanceInLosersBracket(
  matches: TournamentMatch[],
  lbMatch: TournamentMatch,
  winner: TournamentPlayer,
  losersTotalRounds: number
): TournamentMatch[] {
  const updated = [...matches];

  // Check if this is the last LB round -> advance to Grand Finals
  if (lbMatch.round >= losersTotalRounds) {
    const gf1Idx = updated.findIndex(m => m.id === 'GF1');
    if (gf1Idx !== -1) {
      updated[gf1Idx] = { ...updated[gf1Idx], player2: winner };
    }
    return updated;
  }

  const nextRound = lbMatch.round + 1;
  let nextPosition: number;
  let assignAs: 'player1' | 'player2';

  if (lbMatch.round % 2 === 1) {
    // Current round is odd (consolidation) -> next is even (WB drop)
    // Winner goes to next round same position as player2
    nextPosition = lbMatch.position;
    assignAs = 'player2';
  } else {
    // Current round is even (WB drop) -> next is odd (consolidation)
    // Winners are paired adjacently
    nextPosition = Math.floor(lbMatch.position / 2);
    assignAs = lbMatch.position % 2 === 0 ? 'player1' : 'player2';
  }

  const nextMatch = updated.find(
    m => m.round === nextRound && m.position === nextPosition && m.bracketType === 'losers'
  );
  if (nextMatch) {
    const idx = updated.findIndex(m => m.id === nextMatch.id);
    if (idx !== -1) {
      updated[idx] = { ...updated[idx], [assignAs]: winner };
    }
  }

  return updated;
}

// ─── Double Elimination: Grand Finals Logic ───────────────────────

function handleGrandFinalsResult(
  matches: TournamentMatch[],
  gfMatch: TournamentMatch,
  winner: TournamentPlayer,
  loser: TournamentPlayer,
  grandFinalsResetNeeded: boolean,
  players: TournamentPlayer[]
): { matches: TournamentMatch[]; players: TournamentPlayer[]; champion: TournamentPlayer | null; status: 'in_progress' | 'completed'; grandFinalsResetNeeded: boolean } {
  const updated = [...matches];
  let updatedPlayers = [...players];

  if (gfMatch.isReset) {
    // GF2 (reset match): whoever wins is champion, loser is eliminated
    updatedPlayers = updatedPlayers.map(p =>
      p.id === loser.id ? { ...p, eliminated: true, lossCount: p.lossCount + 1 } : p
    );
    return {
      matches: updated,
      players: updatedPlayers,
      champion: winner,
      status: 'completed',
      grandFinalsResetNeeded: false,
    };
  }

  // GF1
  // Check if the WB champion (lossCount === 0) won
  const winnerLossCount = players.find(p => p.id === winner.id)?.lossCount ?? 0;
  const loserLossCount = players.find(p => p.id === loser.id)?.lossCount ?? 0;

  if (winnerLossCount === 0) {
    // WB champion won GF1 -> tournament over, eliminate LB champion (2nd loss)
    updatedPlayers = updatedPlayers.map(p =>
      p.id === loser.id ? { ...p, eliminated: true, lossCount: p.lossCount + 1 } : p
    );
    return {
      matches: updated,
      players: updatedPlayers,
      champion: winner,
      status: 'completed',
      grandFinalsResetNeeded: false,
    };
  }

  // LB champion (1 loss) won GF1 -> WB champion gets first loss -> need reset
  updatedPlayers = updatedPlayers.map(p =>
    p.id === loser.id ? { ...p, lossCount: p.lossCount + 1 } : p
  );

  // Set up GF2 with the same two players
  const gf2Idx = updated.findIndex(m => m.id === 'GF2');
  if (gf2Idx !== -1) {
    // In GF2, the WB champion (who just got their first loss) is player1, LB champ is player2
    updated[gf2Idx] = {
      ...updated[gf2Idx],
      player1: loser,   // WB champion (now with 1 loss)
      player2: winner,  // LB champion (still with 1 loss)
    };
  }

  return {
    matches: updated,
    players: updatedPlayers,
    champion: null,
    status: 'in_progress',
    grandFinalsResetNeeded: true,
  };
}

// ─── Double Elimination Result Handling ───────────────────────────

export function recordDoubleEliminationResult(
  bracket: TournamentBracket,
  match: TournamentMatch,
  winner: TournamentPlayer,
  loser: TournamentPlayer,
): TournamentBracket {
  let updatedMatches = [...bracket.matches];
  let updatedPlayers = [...bracket.players];

  if (match.bracketType === 'winners') {
    // ── Winners Bracket Match ──
    // Advance winner in WB (same as single elimination)
    const nextMatch = findWBNextMatch(updatedMatches, match);
    if (nextMatch) {
      const nextMatchIndex = updatedMatches.findIndex(m => m.id === nextMatch.id);
      if (match.position % 2 === 0) {
        updatedMatches[nextMatchIndex] = { ...updatedMatches[nextMatchIndex], player1: winner };
      } else {
        updatedMatches[nextMatchIndex] = { ...updatedMatches[nextMatchIndex], player2: winner };
      }
    } else {
      // This is the WB final (no next WB match) - route winner to GF1 as player1
      const gf1Index = updatedMatches.findIndex(m => m.id === 'GF1');
      if (gf1Index >= 0) {
        updatedMatches[gf1Index] = { ...updatedMatches[gf1Index], player1: winner };
      }
    }

    // Drop loser to losers bracket (first loss)
    updatedPlayers = updatedPlayers.map(p =>
      p.id === loser.id ? { ...p, lossCount: p.lossCount + 1 } : p
    );
    updatedMatches = dropToLosersBracket(updatedMatches, match, loser);

    // Check if WB round is complete -> advance currentRound for display
    const wbRoundMatches = updatedMatches.filter(
      m => m.round === bracket.currentRound && m.bracketType === 'winners'
    );
    const wbRoundComplete = wbRoundMatches.every(m => m.completed);
    let newCurrentRound = bracket.currentRound;
    if (wbRoundComplete && bracket.currentRound < bracket.totalRounds) {
      newCurrentRound = bracket.currentRound + 1;
    }

    return {
      ...bracket,
      matches: updatedMatches,
      players: updatedPlayers,
      currentRound: newCurrentRound,
    };
  }

  if (match.bracketType === 'losers') {
    // ── Losers Bracket Match ──
    // Advance winner in LB
    updatedMatches = advanceInLosersBracket(updatedMatches, match, winner, bracket.losersTotalRounds);

    // Eliminate loser (second loss)
    updatedPlayers = updatedPlayers.map(p =>
      p.id === loser.id ? { ...p, eliminated: true, lossCount: p.lossCount + 1 } : p
    );

    return {
      ...bracket,
      matches: updatedMatches,
      players: updatedPlayers,
    };
  }

  if (match.bracketType === 'grand_finals') {
    // ── Grand Finals ──
    const gfResult = handleGrandFinalsResult(
      updatedMatches,
      match,
      winner,
      loser,
      bracket.grandFinalsResetNeeded,
      updatedPlayers,
    );

    return {
      ...bracket,
      matches: gfResult.matches,
      players: gfResult.players,
      champion: gfResult.champion,
      status: gfResult.status,
      grandFinalsResetNeeded: gfResult.grandFinalsResetNeeded,
    };
  }

  return bracket;
}

// ─── Playable Matches (Double Elimination) ────────────────────────

/** Get playable matches for double elimination */
export function getPlayableMatchesDoubleElim(bracket: TournamentBracket): TournamentMatch[] {
  const matchMap = buildMatchMap(bracket.matches);
  const wbRounds = bracket.totalRounds;
  const lbTotalRounds = bracket.losersTotalRounds;

  return bracket.matches.filter(m => {
    if (m.completed || !m.player1 || !m.player2 || m.isBye) return false;

    if (m.bracketType === 'winners') {
      // WB matches: same feeder logic as single elimination
      if (m.round === 1) return true;
      // Match IDs use 1-based position (generateMatchId uses pos + 1 in generation)
      // but position field is 0-based, so we need +1 offset
      const feeder1 = matchMap.get(generateMatchId(m.round - 1, m.position * 2 + 1, 'winners'));
      const feeder2 = matchMap.get(generateMatchId(m.round - 1, m.position * 2 + 2, 'winners'));
      return !!(feeder1 && feeder1.completed) && !!(feeder2 && feeder2.completed);
    }

    if (m.bracketType === 'losers') {
      return isLBMatchPlayable(m, matchMap);
    }

    if (m.bracketType === 'grand_finals') {
      if (m.isReset) {
        // GF2: playable only if GF1 is completed
        const gf1 = matchMap.get('GF1');
        return !!(gf1 && gf1.completed && bracket.grandFinalsResetNeeded);
      }
      // GF1: playable when WB champion and LB champion are determined
      const wbFinal = matchMap.get(generateMatchId(wbRounds, 1, 'winners'));
      const lbFinal = lbTotalRounds > 0
        ? matchMap.get(generateMatchId(lbTotalRounds, 0, 'losers'))
        : null;
      return !!(wbFinal && wbFinal.completed) &&
        (lbTotalRounds === 0 || !!(lbFinal && lbFinal.completed));
    }

    return false;
  });
}

/** Check if a losers bracket match has all its feeders completed */
function isLBMatchPlayable(
  lbMatch: TournamentMatch,
  matchMap: Map<string, TournamentMatch>,
): boolean {
  const lbRound = lbMatch.round;

  if (lbRound === 1) {
    // LB R1: feeders are WB R1 matches (paired adjacently)
    // Match IDs use 1-based position (generateMatchId uses pos + 1 in generation)
    // but position field is 0-based, so we need +1 offset
    const feeder1 = matchMap.get(generateMatchId(1, lbMatch.position * 2 + 1, 'winners'));
    const feeder2 = matchMap.get(generateMatchId(1, lbMatch.position * 2 + 2, 'winners'));
    return !!(feeder1 && feeder1.completed) && !!(feeder2 && feeder2.completed);
  }

  if (lbRound % 2 === 0) {
    // WB drop round: feeder1 = WB R(lbRound/2+1) M(pos), feeder2 = LB R(lbRound-1) M(pos)
    const wbRound = lbRound / 2 + 1;
    const feeder1 = matchMap.get(generateMatchId(wbRound, lbMatch.position + 1, 'winners'));
    const feeder2 = matchMap.get(generateMatchId(lbRound - 1, lbMatch.position, 'losers'));
    return !!(feeder1 && feeder1.completed) && !!(feeder2 && feeder2.completed);
  }

  // Consolidation round (odd, >1): feeder1 = LB R(lbRound-1) M(2*pos), feeder2 = LB R(lbRound-1) M(2*pos+1)
  const feeder1 = matchMap.get(generateMatchId(lbRound - 1, lbMatch.position * 2, 'losers'));
  const feeder2 = matchMap.get(generateMatchId(lbRound - 1, lbMatch.position * 2 + 1, 'losers'));
  return !!(feeder1 && feeder1.completed) && !!(feeder2 && feeder2.completed);
}

// ─── #4 Double Elimination Helpers ────────────────────────────────

/** Get the losers bracket round name (for display) */
export function getLBRoundName(
  lbRound: number,
  wbRounds: number,
  totalLB: number,
  t: (_key: string) => string,
): string {
  if (lbRound === totalLB) {
    return t('tournament.losersFinal');
  }
  if (lbRound === totalLB - 1) {
    return t('tournament.losersSemiFinals');
  }
  return t('tournament.losersRound').replace('{n}', String(lbRound));
}

/** Check if a player is in the losers bracket (has exactly 1 loss) */
export function isInLosersBracket(
  player: TournamentPlayer,
  bracket: TournamentBracket,
): boolean {
  if (bracket.settings.tournamentType !== 'double') return false;
  return (player.lossCount || 0) === 1 && !player.eliminated;
}
