/**
 * Competitive Words & Blind — Multi-round competitive mode for
 * Missing Words and Blind Karaoke party modes.
 *
 * Concept:
 * - All players sing the SAME song (fair comparison)
 * - Each round, 2 players sing simultaneously
 * - After all players have sung, a round ranking is shown
 * - Points accumulate across rounds (Best-of-3 / Best-of-5 / Best-of-7)
 * - Bonus points for correctly hitting hidden/blind words
 *
 * Scoring:
 * - Standard tick-based scoring (same as normal mode)
 * - MISSING WORDS BONUS: Extra 50 points per correctly sung missing word
 *   (a missing word is "correctly sung" when the player scores ≥ "Good" on that note)
 * - BLIND BONUS: Extra 30 points per note hit during a blind section
 */

import { Difficulty, PLAYER_COLORS } from '@/types/game';

// ===================== TYPES =====================

export type CompetitiveModeType = 'missing-words' | 'blind';
export type BestOfSetting = 1 | 3 | 5 | 7;

export interface CompetitiveSettings {
  difficulty: Difficulty;
  modeType: CompetitiveModeType;
  bestOf: BestOfSetting;
  /** Missing words: percentage of words to hide (0.15 - 0.50) */
  missingWordFrequency: number;
  /** Blind: how often sections go blind (0.10 - 0.60) */
  blindFrequency: number;
}

export interface CompetitivePlayer {
  id: string;
  name: string;
  avatar?: string;
  color: string;
  // Cumulative stats
  totalScore: number;
  totalNotesHit: number;
  totalNotesMissed: number;
  totalBonusPoints: number;
  roundsPlayed: number;
  /** Per-round scores for the scoreboard */
  roundScores: number[];
  /** Per-round bonus points */
  roundBonuses: number[];
}

export interface CompetitiveRound {
  roundNumber: number;
  songId: string;
  songTitle: string;
  /** Which two players are singing this round */
  player1Id: string;
  player2Id: string;
  /** Results after the round finishes */
  player1Score: number;
  player1Bonus: number;
  player2Score: number;
  player2Bonus: number;
  completed: boolean;
}

export interface CompetitiveGame {
  settings: CompetitiveSettings;
  players: CompetitivePlayer[];
  rounds: CompetitiveRound[];
  currentRoundIndex: number;
  status: 'setup' | 'playing' | 'round-end' | 'game-over';
  winner: CompetitivePlayer | null;
  /** Total songs needed (ceil of bestOf / 2 for each player pair) */
  totalRounds: number;
}

// ===================== GAME CREATION =====================

export function createCompetitiveGame(
  playerIds: string[],
  playerNames: string[],
  playerAvatars: (string | undefined)[],
  settings: CompetitiveSettings
): CompetitiveGame {
  const players: CompetitivePlayer[] = playerIds.map((id, i) => ({
    id,
    name: playerNames[i] || `Player ${i + 1}`,
    avatar: playerAvatars[i],
    color: PLAYER_COLORS[i % PLAYER_COLORS.length],
    totalScore: 0,
    totalNotesHit: 0,
    totalNotesMissed: 0,
    totalBonusPoints: 0,
    roundsPlayed: 0,
    roundScores: [],
    roundBonuses: [],
  }));

  // Calculate total rounds needed
  // With N players, each round has 2 players singing simultaneously.
  // For Best-of-X, each player sings X rounds minimum.
  // Total rounds = ceil(N * X / 2)
  const n = players.length;
  const x = settings.bestOf;
  const totalRounds = Math.ceil((n * x) / 2);

  return {
    settings,
    players,
    rounds: [],
    currentRoundIndex: 0,
    status: 'setup',
    winner: null,
    totalRounds,
  };
}

// ===================== ROUND MANAGEMENT =====================

/**
 * Get the pairings for the current round.
 * Tries to distribute singing time evenly: rotate through players.
 */
export function getNextRoundPairing(game: CompetitiveGame): { player1Id: string; player2Id: string } | null {
  // Filter out players who have already finished all their rounds
  const eligiblePlayers = game.players.filter(p => !isPlayerFinished(game, p.id));
  const n = eligiblePlayers.length;

  if (n < 2) return null;

  // Track how many times each player has sung
  const singCounts: Map<string, number> = new Map();
  for (const player of eligiblePlayers) {
    singCounts.set(player.id, player.roundsPlayed);
  }

  // Find the two players who have sung the least
  const sorted = [...eligiblePlayers].sort((a, b) => {
    const countA = singCounts.get(a.id) || 0;
    const countB = singCounts.get(b.id) || 0;
    return countA - countB;
  });

  // Pair the two with the fewest rounds
  const player1Id = sorted[0].id;
  // Second player should be the one with the next fewest rounds
  // (avoid pairing the same two players consecutively if possible)
  let player2Id = sorted[1].id;

  // Check if this pair sang in the previous round — try to avoid repeats
  const lastRound = game.rounds[game.rounds.length - 1];
  if (lastRound && lastRound.player1Id === player1Id && lastRound.player2Id === player2Id && n >= 3) {
    player2Id = sorted[2]?.id || player2Id;
  }
  if (lastRound && lastRound.player1Id === player2Id && lastRound.player2Id === player1Id && n >= 3) {
    player2Id = sorted[2]?.id || player2Id;
  }

  return { player1Id, player2Id };
}

/**
 * Start a new round with a song.
 */
export function startCompetitiveRound(
  game: CompetitiveGame,
  songId: string,
  songTitle: string
): CompetitiveGame {
  const pairing = getNextRoundPairing(game);
  if (!pairing) return game;

  const newRound: CompetitiveRound = {
    roundNumber: game.rounds.length + 1,
    songId,
    songTitle,
    player1Id: pairing.player1Id,
    player2Id: pairing.player2Id,
    player1Score: 0,
    player1Bonus: 0,
    player2Score: 0,
    player2Bonus: 0,
    completed: false,
  };

  return {
    ...game,
    rounds: [...game.rounds, newRound],
    currentRoundIndex: game.rounds.length,
    status: 'playing',
  };
}

/**
 * Record results for the current round and advance the game.
 */
export function finishCompetitiveRound(
  game: CompetitiveGame,
  player1Score: number,
  player1Bonus: number,
  player2Score: number,
  player2Bonus: number
): CompetitiveGame {
  const updatedRounds = [...game.rounds];
  const currentRound = { ...updatedRounds[game.currentRoundIndex] };

  currentRound.player1Score = player1Score;
  currentRound.player1Bonus = player1Bonus;
  currentRound.player2Score = player2Score;
  currentRound.player2Bonus = player2Bonus;
  currentRound.completed = true;
  updatedRounds[game.currentRoundIndex] = currentRound;

  // Update player cumulative stats
  const updatedPlayers = game.players.map(player => {
    const updated = { ...player };

    if (player.id === currentRound.player1Id) {
      updated.totalScore += player1Score + player1Bonus;
      updated.totalBonusPoints += player1Bonus;
      updated.roundsPlayed += 1;
      updated.roundScores = [...updated.roundScores, player1Score];
      updated.roundBonuses = [...updated.roundBonuses, player1Bonus];
    } else if (player.id === currentRound.player2Id) {
      updated.totalScore += player2Score + player2Bonus;
      updated.totalBonusPoints += player2Bonus;
      updated.roundsPlayed += 1;
      updated.roundScores = [...updated.roundScores, player2Score];
      updated.roundBonuses = [...updated.roundBonuses, player2Bonus];
    }

    return updated;
  });

  // Check if all rounds are complete
  const allRoundsComplete = updatedRounds.length >= game.totalRounds && updatedRounds.every(r => r.completed);

  // Determine winner
  let winner: CompetitivePlayer | null = null;
  if (allRoundsComplete) {
    const sorted = [...updatedPlayers].sort((a, b) => b.totalScore - a.totalScore);
    winner = sorted[0] || null;
  }

  return {
    ...game,
    rounds: updatedRounds,
    players: updatedPlayers,
    status: allRoundsComplete ? 'game-over' : 'round-end',
    winner,
  };
}

// ===================== HELPERS =====================

/** Get players sorted by total score (descending) */
export function getRankedPlayers(game: CompetitiveGame): CompetitivePlayer[] {
  return [...game.players].sort((a, b) => b.totalScore - a.totalScore);
}

/** Get the current round (or null if none) */
export function getCurrentRound(game: CompetitiveGame): CompetitiveRound | null {
  return game.rounds[game.currentRoundIndex] || null;
}

/** Check if a player has sung in all their required rounds */
export function isPlayerFinished(game: CompetitiveGame, playerId: string): boolean {
  return (game.players.find(p => p.id === playerId)?.roundsPlayed ?? 0) >= game.settings.bestOf;
}

/** Calculate bonus points for missing words: 50 per correct hidden word hit */
export function calculateMissingWordsBonus(
  notesHitOnMissingWords: number
): number {
  return notesHitOnMissingWords * 50;
}

/** Calculate bonus points for blind sections: 30 per note hit during blind */
export function calculateBlindBonus(
  notesHitInBlindSections: number
): number {
  return notesHitInBlindSections * 30;
}
