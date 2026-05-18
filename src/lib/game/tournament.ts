// Tournament Mode - Single & Double Elimination Bracket System
// Supports 2-32 players with BYE handling for odd numbers
// Double Elimination: Winners Bracket + Losers Bracket + Grand Finals

import { shuffleArray } from '@/lib/utils';

export type BracketType = 'winners' | 'losers' | 'grand_finals';

export interface TournamentPlayer {
  id: string;
  name: string;
  avatar?: string;
  color: string;
  eliminated: boolean;
  seed: number;
  /** #4 Double Elimination: number of losses (0 = fresh, 1 = in losers bracket, 2 = eliminated) */
  lossCount: number;
}

export interface TournamentMatch {
  id: string;
  round: number;
  position: number;
  /** #4 Which bracket this match belongs to */
  bracketType: BracketType;
  player1: TournamentPlayer | null;
  player2: TournamentPlayer | null;
  winner: TournamentPlayer | null;
  loser: TournamentPlayer | null;
  score1: number;
  score2: number;
  completed: boolean;
  isBye: boolean; // True if player advances without playing (odd number of players)
  // Extended match statistics for tournament summaries & Hall of Fame
  accuracy1?: number;
  accuracy2?: number;
  maxCombo1?: number;
  maxCombo2?: number;
  songTitle?: string;
  songArtist?: string;
  isTiebreak?: boolean; // True if this match was decided by tiebreak rules
  /** #4 True if this is the Grand Finals reset match (GF2) */
  isReset?: boolean;
}

export interface TournamentBracket {
  id: string;
  name: string;
  players: TournamentPlayer[];
  matches: TournamentMatch[];
  currentRound: number;
  totalRounds: number; // Winners bracket rounds
  /** #4 Total rounds in the losers bracket (2*totalRounds - 2, or 0 for single elim) */
  losersTotalRounds: number;
  champion: TournamentPlayer | null;
  status: 'setup' | 'in_progress' | 'completed';
  createdAt: number;
  settings: TournamentSettings;
  /** #4 True if GF1 was won by the LB champion → GF2 (reset) is needed */
  grandFinalsResetNeeded: boolean;
}

export interface TournamentSettings {
  maxPlayers: 2 | 4 | 8 | 16 | 32;
  songDuration: number; // in seconds (60 for short mode, full song duration otherwise)
  randomSongs: boolean;
  difficulty: 'easy' | 'medium' | 'hard';
  // #4 Double-Elimination
  tournamentType: 'single' | 'double';
  // #3 Tiebreak
  tiebreakMode: 'coinflip' | 'accuracy' | 'combo' | 'goldenmic';
  // #6 Dynamic difficulty (optional, per user request)
  dynamicDifficulty: boolean;
  // #8 Song selection mode
  songSelectionMode: 'random' | 'vote';
  // #9 Seeding
  seedingMode: 'random' | 'strength';
  // #5 Genre/Language filter
  filterGenre: string;
  filterLanguage: string;
}

// ─── Match ID Generation ──────────────────────────────────────────

function generateMatchId(round: number, position: number, bracketType?: BracketType): string {
  if (bracketType === 'grand_finals') {
    return `GF${round}`; // GF1, GF2
  }
  const prefix = bracketType === 'losers' ? 'LR' : bracketType === 'winners' ? 'WR' : 'R';
  return `${prefix}${round}M${position}`;
}

// ─── Utility Functions ────────────────────────────────────────────

function calculateRounds(numPlayers: number): number {
  return Math.ceil(Math.log2(numPlayers));
}

function calculateByes(numPlayers: number): number {
  const nextPowerOfTwo = Math.pow(2, Math.ceil(Math.log2(numPlayers)));
  return nextPowerOfTwo - numPlayers;
}

// ─── Build Lookup Map ─────────────────────────────────────────────

/** Build an ID-based lookup for O(1) match access */
function buildMatchMap(matches: TournamentMatch[]): Map<string, TournamentMatch> {
  const map = new Map<string, TournamentMatch>();
  for (const m of matches) {
    map.set(m.id, m);
  }
  return map;
}

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

function findWBNextMatch(matches: TournamentMatch[], currentMatch: TournamentMatch): TournamentMatch | null {
  const nextRound = currentMatch.round + 1;
  const nextPosition = Math.floor(currentMatch.position / 2);
  return matches.find(m => m.round === nextRound && m.position === nextPosition && m.bracketType === 'winners') || null;
}

// ─── Losers Bracket Generation (#4 Double Elimination) ───────────

/**
 * Losers Bracket Structure for N players with R = log2(N) WB rounds:
 *
 * The LB has (2*R - 2) rounds. It alternates between:
 * - "WB drop" rounds (even): WB losers enter and face LB winners from previous round
 * - "Consolidation" rounds (odd, >1): LB winners face each other
 * - Round 1 (special): WB R1 losers face each other, paired adjacently
 *
 * For 8 players (R=3): LB R1→2→3→4 (4 rounds)
 * For 16 players (R=4): LB R1→2→3→4→5→6 (6 rounds)
 */
function generateLosersBracket(
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

function generateGrandFinals(): TournamentMatch[] {
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
 * - WB R1 losers: paired adjacently → LB R1 M(floor(pos/2))
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
    const idx = updated.findIndex(m => m.id === targetLBMatch!.id);
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

  // Check if this is the last LB round → advance to Grand Finals
  if (lbMatch.round >= losersTotalRounds) {
    const gf1 = updated.find(m => m.id === 'GF1');
    if (gf1) {
      const idx = updated.findIndex(m => m.id === 'GF1');
      updated[idx] = { ...gf1, player2: winner };
    }
    return updated;
  }

  const nextRound = lbMatch.round + 1;
  let nextPosition: number;
  let assignAs: 'player1' | 'player2';

  if (lbMatch.round % 2 === 1) {
    // Current round is odd (consolidation) → next is even (WB drop)
    // Winner goes to next round same position as player2
    nextPosition = lbMatch.position;
    assignAs = 'player2';
  } else {
    // Current round is even (WB drop) → next is odd (consolidation)
    // Winners are paired adjacently
    nextPosition = Math.floor(lbMatch.position / 2);
    assignAs = lbMatch.position % 2 === 0 ? 'player1' : 'player2';
  }

  const nextMatch = updated.find(
    m => m.round === nextRound && m.position === nextPosition && m.bracketType === 'losers'
  );
  if (nextMatch) {
    const idx = updated.findIndex(m => m.id === nextMatch!.id);
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
      p.id === loser.id ? { ...p, eliminated: true, lossCount: (p.lossCount || 0) + 1 } : p
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
  const winnerLossCount = players.find(p => p.id === winner.id)?.lossCount || 0;
  const loserLossCount = players.find(p => p.id === loser.id)?.lossCount || 0;

  if (winnerLossCount === 0) {
    // WB champion won GF1 → tournament over
    return {
      matches: updated,
      players: updatedPlayers,
      champion: winner,
      status: 'completed',
      grandFinalsResetNeeded: false,
    };
  }

  // LB champion (1 loss) won GF1 → WB champion gets first loss → need reset
  updatedPlayers = updatedPlayers.map(p =>
    p.id === loser.id ? { ...p, lossCount: (p.lossCount || 0) + 1 } : p
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

// ─── Select Bye Positions ─────────────────────────────────────────

function selectByePositions(totalMatches: number, byesNeeded: number): number[] {
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

/** Get playable matches for double elimination */
function getPlayableMatchesDoubleElim(bracket: TournamentBracket): TournamentMatch[] {
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
      return isLBMatchPlayable(m, matchMap, wbRounds);
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
  wbRounds: number
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

// ─── Double Elimination Result Handling ───────────────────────────

function recordDoubleEliminationResult(
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
      const nextMatchIndex = updatedMatches.findIndex(m => m.id === nextMatch!.id);
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
      p.id === loser.id ? { ...p, lossCount: (p.lossCount || 0) + 1 } : p
    );
    updatedMatches = dropToLosersBracket(updatedMatches, match, loser);

    // Check if WB round is complete → advance currentRound for display
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
      p.id === loser.id ? { ...p, eliminated: true, lossCount: (p.lossCount || 0) + 1 } : p
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

// ─── Tournament Statistics ────────────────────────────────────────

export function getTournamentStats(bracket: TournamentBracket) {
  const completedMatches = bracket.matches.filter(m => m.completed && !m.isBye);
  const totalNonByeMatches = bracket.matches.filter(m => !m.isBye && !m.isReset).length;
  const isDouble = bracket.settings.tournamentType === 'double';

  return {
    totalPlayers: bracket.players.length,
    eliminatedPlayers: bracket.players.filter(p => p.eliminated).length,
    remainingPlayers: bracket.players.filter(p => !p.eliminated).length,
    matchesPlayed: completedMatches.length,
    totalMatches: totalNonByeMatches,
    currentRound: bracket.currentRound,
    totalRounds: bracket.totalRounds,
    losersTotalRounds: bracket.losersTotalRounds,
    isDoubleElimination: isDouble,
    grandFinalsResetNeeded: bracket.grandFinalsResetNeeded,
    isComplete: bracket.status === 'completed',
  };
}

// ─── Tiebreak Resolution (#3) ────────────────────────────────────

function resolveTie(
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

// ─── Player Placements (#9) ──────────────────────────────────────

export function getPlayerPlacements(bracket: TournamentBracket): Array<{
  player: TournamentPlayer;
  placement: number;
  totalScore: number;
  totalAccuracy: number;
  matchesWon: number;
  matchesLost: number;
}> {
  const isDouble = bracket.settings.tournamentType === 'double';
  const placements: Array<{
    player: TournamentPlayer;
    placement: number;
    totalScore: number;
    totalAccuracy: number;
    matchesWon: number;
    matchesLost: number;
    /** Higher = better placement. For DE: combines WB progress + LB survival */
    survivalScore: number;
  }> = [];

  for (const player of bracket.players) {
    const playerMatches = bracket.matches.filter(
      m => !m.isBye && (m.player1?.id === player.id || m.player2?.id === player.id) && m.completed
    );

    let totalScore = 0;
    let totalAccuracy = 0;
    let accuracyCount = 0;
    let matchesWon = 0;
    let matchesLost = 0;
    let survivalScore = 0;

    for (const m of playerMatches) {
      const isPlayer1 = m.player1?.id === player.id;
      const score = isPlayer1 ? m.score1 : m.score2;
      const accuracy = isPlayer1 ? m.accuracy1 : m.accuracy2;
      totalScore += score;
      if (accuracy !== undefined) {
        totalAccuracy += accuracy;
        accuracyCount++;
      }
      if (m.winner?.id === player.id) {
        matchesWon++;
      } else {
        matchesLost++;
      }
    }

    // Survival score: how deep the player went
    if (isDouble) {
      // For DE: WB round reached + LB round reached (if applicable)
      const wbMatches = playerMatches.filter(m => m.bracketType === 'winners');
      const lbMatches = playerMatches.filter(m => m.bracketType === 'losers');
      const gfMatches = playerMatches.filter(m => m.bracketType === 'grand_finals');

      let wbDepth = 0;
      for (const m of wbMatches) {
        wbDepth = Math.max(wbDepth, m.round);
        if (m.winner?.id === player.id) {
          wbDepth += 0.5; // Bonus for winning in WB (went deeper)
        }
      }

      let lbDepth = 0;
      for (const m of lbMatches) {
        lbDepth = Math.max(lbDepth, m.round);
        if (m.winner?.id === player.id) {
          lbDepth += 0.5;
        }
      }

      // GF matches add significant survival score
      const gfBonus = gfMatches.length * (bracket.totalRounds * 2);

      survivalScore = wbDepth * 2 + lbDepth + gfBonus;
    } else {
      // Single elimination: use max round reached
      const maxRound = Math.max(...playerMatches.map(m => m.round), 0);
      survivalScore = maxRound * 2;
    }

    if (bracket.champion?.id === player.id) {
      survivalScore = 999; // Highest possible
    }

    placements.push({
      player,
      placement: 0,
      totalScore,
      totalAccuracy: accuracyCount > 0 ? totalAccuracy / accuracyCount : 0,
      matchesWon,
      matchesLost,
      survivalScore,
    });
  }

  // Sort: by survivalScore (desc), then totalScore (desc), then totalAccuracy (desc)
  placements.sort((a, b) => {
    if (b.survivalScore !== a.survivalScore) return b.survivalScore - a.survivalScore;
    if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
    return b.totalAccuracy - a.totalAccuracy;
  });

  placements.forEach((p, i) => {
    p.placement = i + 1;
  });

  return placements;
}

// ─── Hall of Fame (#7) ────────────────────────────────────────────

export interface HallOfFameEntry {
  id: string;
  champion: TournamentPlayer;
  runnerUp: TournamentPlayer;
  tournamentName: string;
  playerCount: number;
  totalRounds: number;
  tournamentType: 'single' | 'double';
  championScore: number;
  championAccuracy: number;
  createdAt: number;
}

const HOF_KEY = 'karaoke_tournament_hall_of_fame';

export function getHallOfFame(): HallOfFameEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(HOF_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addToHallOfFame(bracket: TournamentBracket, placements: ReturnType<typeof getPlayerPlacements>): void {
  if (!bracket.champion) return;
  const championPlacement = placements.find(p => p.placement === 1);
  const runnerUpPlacement = placements.find(p => p.placement === 2);
  if (!championPlacement || !runnerUpPlacement) return;

  const entry: HallOfFameEntry = {
    id: `hof_${Date.now()}`,
    champion: bracket.champion,
    runnerUp: runnerUpPlacement.player,
    tournamentName: bracket.name,
    playerCount: bracket.players.length,
    totalRounds: bracket.totalRounds,
    tournamentType: bracket.settings.tournamentType,
    championScore: championPlacement.totalScore,
    championAccuracy: championPlacement.totalAccuracy,
    createdAt: Date.now(),
  };

  const existing = getHallOfFame();
  existing.unshift(entry);
  if (existing.length > 50) existing.length = 50;

  try {
    localStorage.setItem(HOF_KEY, JSON.stringify(existing));
  } catch {
    // Silently fail if localStorage is full
  }
}

export function clearHallOfFame(): void {
  try {
    localStorage.removeItem(HOF_KEY);
  } catch {
    // Silently fail
  }
}

// ─── #6 Effective Difficulty ──────────────────────────────────────

export function getEffectiveDifficulty(
  baseDifficulty: 'easy' | 'medium' | 'hard',
  currentRound: number,
  totalRounds: number,
  dynamicDifficulty: boolean
): 'easy' | 'medium' | 'hard' {
  if (!dynamicDifficulty) return baseDifficulty;
  const progression: Array<'easy' | 'medium' | 'hard'> = ['easy', 'medium', 'hard', 'hard'];
  const idx = Math.min(currentRound - 1 + progression.indexOf(baseDifficulty), progression.length - 1);
  return progression[Math.max(0, idx)];
}

// ─── #10 Crowd Votes & Spectators ─────────────────────────────────

export interface CrowdVoteMatch {
  matchId: string;
  player1Votes: number;
  player2Votes: number;
  totalVoters: number;
}

export function getFanFavorites(
  bracket: TournamentBracket,
  crowdVotes: CrowdVoteMatch[]
): Array<{ playerId: string; playerName: string; totalVotes: number; matchesVoted: number }> {
  const playerVotes: Record<string, { total: number; matches: number; name: string }> = {};

  for (const cv of crowdVotes) {
    const match = bracket.matches.find(m => m.id === cv.matchId);
    if (!match || !match.completed) continue;
    if (!match.player1 || !match.player2) continue;

    for (const [player, votes] of [
      [match.player1, cv.player1Votes],
      [match.player2, cv.player2Votes],
    ] as const) {
      if (!playerVotes[player.id]) {
        playerVotes[player.id] = { total: 0, matches: 0, name: player.name };
      }
      playerVotes[player.id].total += votes;
      playerVotes[player.id].matches += 1;
    }
  }

  return Object.entries(playerVotes)
    .map(([playerId, data]) => ({
      playerId,
      playerName: data.name,
      totalVotes: data.total,
      matchesVoted: data.matches,
    }))
    .sort((a, b) => b.totalVotes - a.totalVotes);
}

function isSpectator(
  companionProfileId: string,
  bracket: TournamentBracket
): boolean {
  return !bracket.players.some(p => p.id === companionProfileId);
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
