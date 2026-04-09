// Tournament Mode - Single Elimination Bracket System
// Supports 4-32 players with BYE handling for odd numbers

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
}

// Generate a unique match ID
function generateMatchId(round: number, position: number): string {
  return `R${round}M${position}`;
}

// Shuffle array using Fisher-Yates algorithm
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Calculate number of rounds needed
export function calculateRounds(numPlayers: number): number {
  return Math.ceil(Math.log2(numPlayers));
}

// Calculate number of BYEs needed for bracket balance
export function calculateByes(numPlayers: number): number {
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

  const totalRounds = calculateRounds(settings.maxPlayers);
  const byesNeeded = calculateByes(players.length);
  
  // Shuffle and seed players
  const shuffledPlayers = shuffleArray(players).map((p, i) => ({
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

// Get matches for a specific round
export function getMatchesForRound(bracket: TournamentBracket, round: number): TournamentMatch[] {
  return bracket.matches.filter(m => m.round === round);
}

// Get all matches that are ready to play (any round where both players are assigned)
// This allows clicking on any match in the bracket to start it out of order,
// as long as both feeder matches have completed and assigned their winners.
export function getPlayableMatches(bracket: TournamentBracket): TournamentMatch[] {
  return bracket.matches.filter(
    m =>
      !m.completed &&
      m.player1 &&
      m.player2 &&
      !m.isBye
  );
}

// Get the next match a winner advances to
function getNextMatch(bracket: TournamentBracket, currentMatch: TournamentMatch): TournamentMatch | null {
  if (currentMatch.round >= bracket.totalRounds) return null;
  
  const nextRound = currentMatch.round + 1;
  const nextPosition = Math.floor(currentMatch.position / 2);
  
  return bracket.matches.find(
    m => m.round === nextRound && m.position === nextPosition
  ) || null;
}

// Record match result and advance winner
export function recordMatchResult(
  bracket: TournamentBracket,
  matchId: string,
  score1: number,
  score2: number
): TournamentBracket {
  const matchIndex = bracket.matches.findIndex(m => m.id === matchId);
  if (matchIndex === -1) return bracket;
  
  const match = { ...bracket.matches[matchIndex] };
  
  if (!match.player1 || !match.player2 || match.completed) {
    return bracket;
  }
  
  // Determine winner (Sudden Death - higher score wins)
  const winner = score1 >= score2 ? match.player1 : match.player2;
  const loser = score1 >= score2 ? match.player2 : match.player1;
  
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

// Generate bracket tree for visualization
export interface BracketNode {
  match: TournamentMatch | null;
  children: [BracketNode | null, BracketNode | null];
  depth: number;
  position: number;
}

export function buildBracketTree(bracket: TournamentBracket): BracketNode | null {
  if (bracket.matches.length === 0) return null;
  
  const finalMatch = bracket.matches.find(
    m => m.round === bracket.totalRounds && m.position === 0
  );
  
  if (!finalMatch) return null;
  
  function buildNode(match: TournamentMatch | null, depth: number, position: number): BracketNode {
    const round = match ? match.round - 1 : depth;
    const prevRound = round + 1;
    
    let child1: BracketNode | null = null;
    let child2: BracketNode | null = null;
    
    if (match && match.round > 1) {
      const prevMatches = bracket.matches.filter(m => m.round === prevRound);
      const pos1 = match.position * 2;
      const pos2 = match.position * 2 + 1;
      
      child1 = buildNode(prevMatches.find(m => m.position === pos1) || null, depth - 1, pos1);
      child2 = buildNode(prevMatches.find(m => m.position === pos2) || null, depth - 1, pos2);
    }
    
    return {
      match,
      children: [child1, child2],
      depth,
      position,
    };
  }
  
  return buildNode(finalMatch, bracket.totalRounds - 1, 0);
}

// Export tournament state for saving
export function serializeTournament(bracket: TournamentBracket): string {
  return JSON.stringify(bracket);
}

// Import tournament state
export function deserializeTournament(data: string): TournamentBracket | null {
  try {
    return JSON.parse(data) as TournamentBracket;
  } catch {
    return null;
  }
}
