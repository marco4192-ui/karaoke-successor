// Tournament Mode - Single & Double Elimination Bracket System
// Supports 2-32 players with BYE handling for odd numbers

import { shuffleArray } from '@/lib/utils';

export interface TournamentPlayer {
  id: string;
  name: string;
  avatar?: string;
  color: string;
  eliminated: boolean;
  seed: number;
}

export interface TournamentMatch {
  id: string;
  round: number;
  position: number;
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
}

export interface TournamentBracket {
  id: string;
  name: string;
  players: TournamentPlayer[];
  matches: TournamentMatch[];
  currentRound: number;
  totalRounds: number;
  champion: TournamentPlayer | null;
  status: 'setup' | 'in_progress' | 'completed';
  createdAt: number;
  settings: TournamentSettings;
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

// Generate a unique match ID
function generateMatchId(round: number, position: number): string {
  return `R${round}M${position}`;
}

// Calculate number of rounds needed
function calculateRounds(numPlayers: number): number {
  return Math.ceil(Math.log2(numPlayers));
}

// Calculate number of BYEs needed for bracket balance
function calculateByes(numPlayers: number): number {
  const nextPowerOfTwo = Math.pow(2, Math.ceil(Math.log2(numPlayers)));
  return nextPowerOfTwo - numPlayers;
}

// Create initial bracket with seeded players
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

  // #9 Seed players: random shuffle or by strength
  let seededPlayers: typeof players;
  if (settings.seedingMode === 'strength') {
    // Sort by seed (strength) descending — highest strength = seed 1
    seededPlayers = [...players].sort((a, b) => a.seed - b.seed);
  } else {
    seededPlayers = shuffleArray(players);
  }
  const shuffledPlayers = seededPlayers.map((p, i) => ({
    ...p,
    seed: i + 1,
    eliminated: false,
  }));

  // Generate bracket structure
  const matches = generateBracket(shuffledPlayers, totalRounds, byesNeeded);

  return {
    id: `tournament_${Date.now()}`,
    name: `Tournament ${new Date().toLocaleDateString()}`,
    players: shuffledPlayers,
    matches,
    currentRound: 1,
    totalRounds,
    champion: null,
    status: 'in_progress',
    createdAt: Date.now(),
    settings,
  };
}

// Generate the complete bracket structure
function generateBracket(
  players: TournamentPlayer[],
  totalRounds: number,
  byesNeeded: number
): TournamentMatch[] {
  const matches: TournamentMatch[] = [];
  const firstRoundMatches = Math.pow(2, totalRounds - 1);
  
  // Distribute players and BYEs
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
      // BYE match - only one player advances
      player1 = playerQueue.shift() || null;
    }
    
    const match: TournamentMatch = {
      id: generateMatchId(1, i + 1),
      round: 1,
      position: i,
      player1,
      player2,
      winner: isByeMatch && player1 ? player1 : null, // BYE advances automatically
      loser: null,
      score1: 0,
      score2: 0,
      completed: isByeMatch && !!player1,
      isBye: isByeMatch && !player2,
    };
    
    matches.push(match);
  }
  
  // Create subsequent round matches (empty placeholders)
  for (let round = 2; round <= totalRounds; round++) {
    const roundMatches = Math.pow(2, totalRounds - round);
    for (let i = 0; i < roundMatches; i++) {
      matches.push({
        id: generateMatchId(round, i + 1),
        round,
        position: i,
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

  // Advance BYE winners into their next-round match slots.
  // Without this, BYE matches are marked completed with a winner, but the
  // winner is never placed into the round-2 match → tournament is permanently stuck.
  for (const match of matches) {
    if (match.isBye && match.winner) {
      const nextRound = match.round + 1;
      const nextPosition = Math.floor(match.position / 2);
      const nextMatch = matches.find(
        m => m.round === nextRound && m.position === nextPosition
      );
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

// Select random positions for BYEs in first round
function selectByePositions(totalMatches: number, byesNeeded: number): number[] {
  const positions: number[] = [];
  const available = [...Array(totalMatches).keys()];
  
  // Distribute BYEs evenly (top and bottom halves)
  const halfSize = Math.floor(totalMatches / 2);
  
  for (let i = 0; i < byesNeeded && available.length > 0; i++) {
    // Alternate between halves for fairness
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
      // Fallback to any available position
      const randomIndex = Math.floor(Math.random() * available.length);
      positions.push(available[randomIndex]);
      available.splice(randomIndex, 1);
    }
  }
  
  return positions;
}

// Build a lookup map for O(1) match access by round+position.
// Key format: "round-position" (e.g. "1-0", "2-1").
function buildMatchLookup(bracket: TournamentBracket): Map<string, TournamentMatch> {
  const map = new Map<string, TournamentMatch>();
  for (const m of bracket.matches) {
    map.set(`${m.round}-${m.position}`, m);
  }
  return map;
}

// Get matches for a specific round
export function getMatchesForRound(bracket: TournamentBracket, round: number): TournamentMatch[] {
  return bracket.matches.filter(m => m.round === round);
}

// Get all matches that are ready to play (both players assigned AND
// both feeder matches have completed so the winner has been determined).
// This allows clicking on any match in the bracket to start it out of order.
export function getPlayableMatches(bracket: TournamentBracket): TournamentMatch[] {
  const lookup = buildMatchLookup(bracket);
  return bracket.matches.filter(
    m => {
      if (m.completed || !m.player1 || !m.player2 || m.isBye) return false;
      // For round 1 matches, no feeder matches exist — always playable
      if (m.round === 1) return true;
      // For round 2+, check that both feeder matches are completed
      const pos = m.position;
      const feeder1 = lookup.get(`${m.round - 1}-${pos * 2}`);
      const feeder2 = lookup.get(`${m.round - 1}-${pos * 2 + 1}`);
      return !!(feeder1 && feeder1.completed) && !!(feeder2 && feeder2.completed);
    }
  );
}

// Get the next match a winner advances to
function getNextMatch(bracket: TournamentBracket, currentMatch: TournamentMatch): TournamentMatch | null {
  if (currentMatch.round >= bracket.totalRounds) return null;
  const lookup = buildMatchLookup(bracket);
  return lookup.get(`${currentMatch.round + 1}-${Math.floor(currentMatch.position / 2)}`) || null;
}

// Record match result and advance winner (supports tiebreak statistics)
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

  // Determine winner (Sudden Death - higher score wins)
  // Tiebreak based on settings (#3)
  let winner: TournamentPlayer;
  let isTiebreak = false;

  if (score1 > score2) {
    winner = match.player1;
  } else if (score2 > score1) {
    winner = match.player2;
  } else {
    // Tie! Apply tiebreak rules
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
  
  // Update bracket
  const updatedMatches = [...bracket.matches];
  updatedMatches[matchIndex] = match;
  
  // Mark loser as eliminated
  const updatedPlayers = bracket.players.map(p => 
    p.id === loser.id ? { ...p, eliminated: true } : p
  );
  
  // Advance winner to next round
  const nextMatch = getNextMatch({ ...bracket, matches: updatedMatches }, match);
  if (nextMatch) {
    const nextMatchIndex = updatedMatches.findIndex(m => m.id === nextMatch.id);
    
    // Winner goes to position 0 (player1) for even match positions, player2 for odd
    if (match.position % 2 === 0) {
      updatedMatches[nextMatchIndex] = {
        ...updatedMatches[nextMatchIndex],
        player1: winner,
      };
    } else {
      updatedMatches[nextMatchIndex] = {
        ...updatedMatches[nextMatchIndex],
        player2: winner,
      };
    }
  }
  
  // Check if round is complete
  const currentRoundMatches = updatedMatches.filter(m => m.round === bracket.currentRound);
  const roundComplete = currentRoundMatches.every(m => m.completed);
  
  // Check for tournament completion
  let newStatus = bracket.status;
  let champion = bracket.champion;
  let newCurrentRound = bracket.currentRound;
  
  if (roundComplete) {
    // Check if this was the final
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

// Get tournament statistics
export function getTournamentStats(bracket: TournamentBracket) {
  const completedMatches = bracket.matches.filter(m => m.completed && !m.isBye);
  const totalMatches = bracket.matches.filter(m => !m.isBye).length;
  
  return {
    totalPlayers: bracket.players.length,
    eliminatedPlayers: bracket.players.filter(p => p.eliminated).length,
    remainingPlayers: bracket.players.filter(p => !p.eliminated).length,
    matchesPlayed: completedMatches.length,
    totalMatches,
    currentRound: bracket.currentRound,
    totalRounds: bracket.totalRounds,
    isComplete: bracket.status === 'completed',
  };
}

// Resolve a tie between two players based on tiebreak mode (#3)
function resolveTie(
  match: TournamentMatch,
  mode: TournamentSettings['tiebreakMode'],
  stats?: { accuracy1?: number; accuracy2?: number; maxCombo1?: number; maxCombo2?: number }
): TournamentPlayer {
  if (!match.player1 || !match.player2) return match.player1!;

  switch (mode) {
    case 'accuracy': {
      // Higher accuracy wins; fallback to coinflip
      const a1 = stats?.accuracy1 ?? 0;
      const a2 = stats?.accuracy2 ?? 0;
      if (a1 !== a2) return a1 > a2 ? match.player1 : match.player2;
      return Math.random() < 0.5 ? match.player1 : match.player2;
    }
    case 'combo': {
      // Higher max combo wins; fallback to accuracy; then coinflip
      const c1 = stats?.maxCombo1 ?? 0;
      const c2 = stats?.maxCombo2 ?? 0;
      if (c1 !== c2) return c1 > c2 ? match.player1 : match.player2;
      const a1 = stats?.accuracy1 ?? 0;
      const a2 = stats?.accuracy2 ?? 0;
      if (a1 !== a2) return a1 > a2 ? match.player1 : match.player2;
      return Math.random() < 0.5 ? match.player1 : match.player2;
    }
    case 'goldenmic': {
      // Golden Mic: compare accuracy first, then combo, then coinflip.
      // In a full implementation this would trigger a 10s sing-off.
      // For now, it uses the same cascading tiebreak as 'combo'.
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

// #9 Get player placement order (1st, 2nd, 3rd, etc.) after tournament completion
// Uses elimination round as tiebreaker (later elimination = better placement)
export function getPlayerPlacements(bracket: TournamentBracket): Array<{
  player: TournamentPlayer;
  placement: number;
  totalScore: number;
  totalAccuracy: number;
  matchesWon: number;
  matchesLost: number;
}> {
  const placements: Array<{
    player: TournamentPlayer;
    placement: number;
    totalScore: number;
    totalAccuracy: number;
    matchesWon: number;
    matchesLost: number;
    eliminationRound: number;
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
    let eliminationRound = 0;

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
        eliminationRound = Math.max(eliminationRound, m.round);
      }
    }

    // Champion never lost, so eliminationRound stays 0
    if (bracket.champion?.id === player.id) {
      eliminationRound = bracket.totalRounds + 1; // Highest possible
    }

    placements.push({
      player,
      placement: 0,
      totalScore,
      totalAccuracy: accuracyCount > 0 ? totalAccuracy / accuracyCount : 0,
      matchesWon,
      matchesLost,
      eliminationRound,
    });
  }

  // Sort: by elimination round (desc), then totalScore (desc), then totalAccuracy (desc)
  placements.sort((a, b) => {
    if (b.eliminationRound !== a.eliminationRound) return b.eliminationRound - a.eliminationRound;
    if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
    return b.totalAccuracy - a.totalAccuracy;
  });

  // Assign placements
  placements.forEach((p, i) => {
    p.placement = i + 1;
  });

  return placements;
}

// #7 Hall of Fame — stored in localStorage
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
  // Keep max 50 entries
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

// #6 Get the effective difficulty for a given tournament round
export function getEffectiveDifficulty(
  baseDifficulty: 'easy' | 'medium' | 'hard',
  currentRound: number,
  totalRounds: number,
  dynamicDifficulty: boolean
): 'easy' | 'medium' | 'hard' {
  if (!dynamicDifficulty) return baseDifficulty;
  const progression: Array<'easy' | 'medium' | 'hard'> = ['easy', 'medium', 'hard', 'hard'];
  // First round = base difficulty, then escalate
  const idx = Math.min(currentRound - 1 + progression.indexOf(baseDifficulty), progression.length - 1);
  return progression[Math.max(0, idx)];
}

// #10 Crowd vote result type
export interface CrowdVoteMatch {
  matchId: string;
  player1Votes: number;
  player2Votes: number;
  totalVoters: number;
}

// #10 Compute fan favorite from crowd votes across all completed matches
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

// #10 Check if a companion client is a spectator (not a tournament player)
export function isSpectator(
  companionProfileId: string,
  bracket: TournamentBracket
): boolean {
  return !bracket.players.some(p => p.id === companionProfileId);
}
