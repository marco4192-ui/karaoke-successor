// Tournament Mode - Statistics, Placements, Hall of Fame, Crowd Votes, Effective Difficulty
// Read-only tournament data queries and side-effectful localStorage operations

import type { TournamentPlayer, TournamentBracket, TournamentMatch } from './tournament-types';

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

export function isSpectator(
  companionProfileId: string,
  bracket: TournamentBracket
): boolean {
  return !bracket.players.some(p => p.id === companionProfileId);
}
