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
 *   (a missing word is "correctly sung" when the player scores >= "Good" on that note)
 * - BLIND BONUS: Extra 30 points per note hit during a blind section
 *
 * Enhanced Features:
 * - Swiss-System pairing: similar-strength players face each other
 * - Dynamic difficulty: escalating frequency multiplier per round
 * - Advanced bonus: streak, perfect, comeback bonuses
 * - Smart song selection: no repeats, already-played tracking
 * - Solo mode support (1 player)
 */

import { Difficulty, PLAYER_COLORS } from '@/types/game';
import { shuffleArray } from '@/lib/utils';

// ===================== TYPES =====================

export type CompetitiveModeType = 'missing-words' | 'blind';
export type PlayMode = 'competitive' | 'solo' | 'coop';
type BestOfSetting = 1 | 3 | 5 | 7;

export interface CompetitiveSettings {
  difficulty: Difficulty;
  modeType: CompetitiveModeType;
  playMode: PlayMode;
  bestOf: BestOfSetting;
  /** Missing words: percentage of passages to hide (0.15 - 0.90) */
  missingWordFrequency: number;
  /** Blind: percentage of sections that go blind (0.15 - 0.90) */
  blindFrequency: number;
  /** Hardcore blind: text hidden when notes visible, and vice versa */
  hardcore: boolean;
  /** Hardcore missing words: hidden words stay hidden until song ends */
  hardcoreMissingWords: boolean;
  /** Missing words granularity: 'word' | 'passage' | 'both' */
  missingWordsGranularity: 'word' | 'passage' | 'both';
  /** Escalating mode: frequency increases per round */
  escalating: boolean;
  /** Song selection mode */
  // TODO: Implement distinct 'random' selection logic (currently same as 'smart')
  songSelection: 'random' | 'smart';
}

// TODO: The following fields need to be updated during gameplay:
// totalNotesHit, totalNotesMissed, currentStreak, maxStreak,
// lastHiddenMiss, streakBonusTotal, perfectBonusTotal, comebackBonusTotal
interface CompetitivePlayer {
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
  /** Current streak of consecutive hidden word hits (for bonus calc) */
  currentStreak: number;
  /** Max streak achieved in any round */
  maxStreak: number;
  /** Whether player missed their last hidden/blind note (for comeback bonus) */
  lastHiddenMiss: boolean;
  /** Total streak bonus points earned */
  streakBonusTotal: number;
  /** Total perfect bonus points earned */
  perfectBonusTotal: number;
  /** Total comeback bonus points earned */
  comebackBonusTotal: number;
  /** Songs already played by this player (for smart selection) */
  playedSongIds: string[];
}

export interface CompetitiveRound {
  roundNumber: number;
  songId: string;
  songTitle: string;
  /** Which two players are singing this round (empty string = no player for solo) */
  player1Id: string;
  player2Id: string;
  /** Results after the round finishes */
  player1Score: number;
  player1Bonus: number;
  player2Score: number;
  player2Bonus: number;
  /** Effective frequency multiplier for this round */
  frequencyMultiplier: number;
  completed: boolean;
}

export interface CompetitiveGame {
  settings: CompetitiveSettings;
  players: CompetitivePlayer[];
  rounds: CompetitiveRound[];
  currentRoundIndex: number;
  status: 'setup' | 'playing' | 'round-end' | 'game-over';
  winner: CompetitivePlayer | null;
  /** Total songs needed */
  totalRounds: number;
  /** All song IDs already used in any round (for no-repeat) */
  usedSongIds: string[];
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
    currentStreak: 0,
    maxStreak: 0,
    lastHiddenMiss: false,
    streakBonusTotal: 0,
    perfectBonusTotal: 0,
    comebackBonusTotal: 0,
    playedSongIds: [],
  }));

  // Calculate total rounds needed
  const n = players.length;
  const x = settings.bestOf;

  let totalRounds: number;
  if (settings.playMode === 'solo') {
    // Solo: just bestOf rounds
    totalRounds = x;
  } else if (settings.playMode === 'coop') {
    // Coop: bestOf rounds, all play together
    totalRounds = x;
  } else {
    // Competitive: ceil(n * bestOf / 2)
    totalRounds = Math.ceil((n * x) / 2);
  }

  return {
    settings,
    players,
    rounds: [],
    currentRoundIndex: 0,
    status: 'setup',
    winner: null,
    totalRounds,
    usedSongIds: [],
  };
}

// ===================== ESCALATING DIFFICULTY =====================

/**
 * Calculate the frequency multiplier for a given round number.
 * Starts at 0.7x for round 1 and increases to 1.5x for later rounds.
 */
function getEscalatingMultiplier(roundNumber: number, totalRounds: number): number {
  if (totalRounds <= 1) return 1.0;
  // Linear interpolation from 0.7 to 1.5 over total rounds
  const minMult = 0.7;
  const maxMult = 1.5;
  const progress = (roundNumber - 1) / (totalRounds - 1);
  return minMult + progress * (maxMult - minMult);
}

// ===================== SWISS-SYSTEM PAIRING =====================

/**
 * Swiss-System pairing: players with similar scores face each other.
 * First round is random, subsequent rounds pair adjacent players in score ranking.
 */
function getNextRoundPairing(game: CompetitiveGame): { player1Id: string; player2Id: string } | null {
  const eligiblePlayers = game.players.filter(p => !isPlayerFinished(game, p.id));
  const n = eligiblePlayers.length;

  if (n < 2) return null;

  if (game.rounds.length === 0) {
    // First round: random pairing
    const shuffled = shuffleArray(eligiblePlayers);
    return { player1Id: shuffled[0].id, player2Id: shuffled[1].id };
  }

  // Swiss System: sort by total score, pair adjacent players
  // Alternate pairing direction each round to avoid same matchups
  const ranked = [...eligiblePlayers].sort((a, b) => b.totalScore - a.totalScore);
  const direction = game.rounds.length % 2 === 0 ? 1 : -1;
  if (direction === -1) ranked.reverse();

  // Try to pair 1st with 2nd, 3rd with 4th, etc.
  for (let i = 0; i < ranked.length - 1; i += 2) {
    const p1 = ranked[i];
    const p2 = ranked[i + 1];

    // Check if this pair already played against each other
    const alreadyPaired = game.rounds.some(r =>
      (r.player1Id === p1.id && r.player2Id === p2.id) ||
      (r.player1Id === p2.id && r.player2Id === p1.id)
    );

    if (!alreadyPaired) {
      return { player1Id: p1.id, player2Id: p2.id };
    }
  }

  // Fallback: if all adjacent pairs already played, try cross-pairing
  if (ranked.length >= 4) {
    // Pair 1st with 3rd, 2nd with 4th
    for (let offset = 1; offset < ranked.length - 1; offset++) {
      const p1 = ranked[0];
      const p2 = ranked[offset];
      const alreadyPaired = game.rounds.some(r =>
        (r.player1Id === p1.id && r.player2Id === p2.id) ||
        (r.player1Id === p2.id && r.player2Id === p1.id)
      );
      if (!alreadyPaired) {
        return { player1Id: p1.id, player2Id: p2.id };
      }
    }
  }

  // Last resort: just pair the two with fewest rounds
  const byRounds = [...eligiblePlayers].sort((a, b) => a.roundsPlayed - b.roundsPlayed);
  return { player1Id: byRounds[0].id, player2Id: byRounds[1].id };
}

// ===================== SMART SONG SELECTION =====================

/**
 * Pick a random song that hasn't been played yet.
 * Returns null if no unplayed songs remain.
 */
export function pickSmartSong(
  songs: { id: string; title: string }[],
  usedSongIds: string[]
): { id: string; title: string } | null {
  const unplayed = songs.filter(s => !usedSongIds.includes(s.id));
  if (unplayed.length === 0) return null;
  const pick = unplayed[Math.floor(Math.random() * unplayed.length)];
  return { id: pick.id, title: pick.title };
}

// ===================== ROUND MANAGEMENT =====================

/**
 * Start a new round with a song.
 */
export function startCompetitiveRound(
  game: CompetitiveGame,
  songId: string,
  songTitle: string
): CompetitiveGame {
  const roundNumber = game.rounds.length + 1;

  // Calculate escalating multiplier
  const frequencyMultiplier = game.settings.escalating
    ? getEscalatingMultiplier(roundNumber, game.totalRounds)
    : 1.0;

  let player1Id: string;
  let player2Id: string;

  if (game.settings.playMode === 'solo') {
    player1Id = game.players[0]?.id ?? '';
    player2Id = '';
  } else if (game.settings.playMode === 'coop') {
    player1Id = game.players[0]?.id ?? '';
    player2Id = game.players[1]?.id ?? game.players[0]?.id ?? '';
  } else {
    const pairing = getNextRoundPairing(game);
    if (!pairing) return game;
    player1Id = pairing.player1Id;
    player2Id = pairing.player2Id;
  }

  const newRound: CompetitiveRound = {
    roundNumber,
    songId,
    songTitle,
    player1Id,
    player2Id,
    player1Score: 0,
    player1Bonus: 0,
    player2Score: 0,
    player2Bonus: 0,
    frequencyMultiplier,
    completed: false,
  };

  // Track used songs and per-player played songs
  const newUsedSongIds = [...game.usedSongIds, songId];

  return {
    ...game,
    rounds: [...game.rounds, newRound],
    currentRoundIndex: game.rounds.length,
    status: 'playing',
    usedSongIds: newUsedSongIds,
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
  if (game.currentRoundIndex < 0 || game.currentRoundIndex >= game.rounds.length) return game;

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
      updated.playedSongIds = [...updated.playedSongIds, currentRound.songId];
    } else if (player.id === currentRound.player2Id && currentRound.player2Id) {
      updated.totalScore += player2Score + player2Bonus;
      updated.totalBonusPoints += player2Bonus;
      updated.roundsPlayed += 1;
      updated.roundScores = [...updated.roundScores, player2Score];
      updated.roundBonuses = [...updated.roundBonuses, player2Bonus];
      updated.playedSongIds = [...updated.playedSongIds, currentRound.songId];
    }

    return updated;
  });

  // Check if game is over
  const allRoundsComplete = updatedRounds.length >= game.totalRounds && updatedRounds.every(r => r.completed);
  const isSoloOrCoop = game.settings.playMode === 'solo' || game.settings.playMode === 'coop';
  const canFormNextPair = isSoloOrCoop
    ? updatedRounds.length < game.totalRounds
    : getNextRoundPairing({
        ...game,
        rounds: updatedRounds,
        players: updatedPlayers,
      }) !== null;

  const isGameOver = allRoundsComplete || !canFormNextPair;

  // Determine winner
  let winner: CompetitivePlayer | null = null;
  if (isGameOver) {
    const sorted = [...updatedPlayers].sort((a, b) => b.totalScore - a.totalScore);
    winner = sorted[0] || null;
  }

  return {
    ...game,
    rounds: updatedRounds,
    players: updatedPlayers,
    status: isGameOver ? 'game-over' : 'round-end',
    winner,
  };
}

// ===================== ADVANCED BONUS CALCULATIONS =====================

/** Base bonus per missing word */
const MW_BASE_BONUS = 50;

/** Base bonus per blind note */
const BLIND_BASE_BONUS = 30;

/** Bonus multiplier for 3+ streak */
const STREAK_MULTIPLIER = 1.5;

/** Bonus multiplier for comeback (miss then hit) */
const COMEBACK_MULTIPLIER = 1.5;

/** Minimum streak length for streak bonus */
const STREAK_THRESHOLD = 3;

// TODO: Wire calculateMissingWordsBonus into game flow handlers
/**
 * Calculate bonus points for a missing word hit.
 * @param isPerfect - Whether the hit was "Perfect" (not just "Good")
 * @param currentStreak - Consecutive hidden word hits before this one
 * @param lastWasMiss - Whether the previous hidden word was missed
 */
export function calculateMissingWordsBonus(
  isPerfect: boolean,
  currentStreak: number,
  lastWasMiss: boolean
): { base: number; perfect: number; streak: number; comeback: number; total: number } {
  let base = MW_BASE_BONUS;
  let perfect = 0;
  let streak = 0;
  let comeback = 0;

  // Perfect bonus: double the base
  if (isPerfect) {
    perfect = base; // same as base, so total from base+perfect = 2x
  }

  // Streak bonus: after STREAK_THRESHOLD consecutive hits, 1.5x for the threshold hit
  if (currentStreak > 0 && (currentStreak + 1) >= STREAK_THRESHOLD && (currentStreak + 1) % STREAK_THRESHOLD === 0) {
    streak = Math.round(base * (STREAK_MULTIPLIER - 1));
  }

  // Comeback bonus: after a miss, the next hit gets +50%
  if (lastWasMiss) {
    comeback = Math.round(base * (COMEBACK_MULTIPLIER - 1));
  }

  const total = base + perfect + streak + comeback;
  return { base, perfect, streak, comeback, total };
}

// TODO: Wire calculateBlindBonus into game flow handlers
/**
 * Calculate bonus points for a blind note hit.
 * @param isPerfect - Whether the hit was "Perfect"
 * @param currentStreak - Consecutive blind note hits
 * @param lastWasMiss - Whether the previous blind note was missed
 */
export function calculateBlindBonus(
  isPerfect: boolean,
  currentStreak: number,
  lastWasMiss: boolean
): { base: number; perfect: number; streak: number; comeback: number; total: number } {
  let base = BLIND_BASE_BONUS;
  let perfect = 0;
  let streak = 0;
  let comeback = 0;

  if (isPerfect) {
    perfect = base;
  }

  if (currentStreak > 0 && (currentStreak + 1) >= STREAK_THRESHOLD && (currentStreak + 1) % STREAK_THRESHOLD === 0) {
    streak = Math.round(base * (STREAK_MULTIPLIER - 1));
  }

  if (lastWasMiss) {
    comeback = Math.round(base * (COMEBACK_MULTIPLIER - 1));
  }

  const total = base + perfect + streak + comeback;
  return { base, perfect, streak, comeback, total };
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

/** Check if a player has sung in all their required rounds. */
function isPlayerFinished(game: CompetitiveGame, playerId: string): boolean {
  const player = game.players.find(p => p.id === playerId);
  if (!player) return true;
  return player.roundsPlayed > game.settings.bestOf;
}

// ===================== DEFAULT SETTINGS =====================

export const DEFAULT_COMPETITIVE_SETTINGS: CompetitiveSettings = {
  difficulty: 'medium',
  modeType: 'missing-words',
  playMode: 'competitive',
  bestOf: 3,
  missingWordFrequency: 0.30,
  blindFrequency: 0.30,
  hardcore: false,
  hardcoreMissingWords: false,
  missingWordsGranularity: 'passage',
  escalating: false,
  songSelection: 'smart',
};
