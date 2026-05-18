// Battle Royale Mode - All players sing simultaneously, lowest score eliminated
// Supports 2-24 players with real-time score tracking and elimination
// 4 local microphone players + 20 companion app players
//
// Features:
// - Medley Mode: Multiple song snippets per round
// - Song Voting: Players vote on next song (3 options)
// - No-Repeat Protection: Songs don't repeat within N rounds
// - Grand Finale: Best-of-N for final 2 players
// - Bounty System: Bonus multiplier for hunting the leader
// - Dynamic Difficulty: Escalating difficulty over rounds
// - Shrinking Timer: Rounds get shorter over time
// - Live Ranking: Trend arrows showing score changes between rounds
// - Elimination Camera: Dramatic elimination effects (UI-driven)
// - Spectator View: Eliminated players predict next elimination
// - Statistics & Hall of Fame: Track and persist top performances

import { TournamentPlayer } from './tournament';
import { Difficulty } from '@/types/game';
import { shuffleArray, generateCode, FULL_CODE_CHARS } from '@/lib/utils';

// ==================== TYPES ====================

export type PlayerType = 'microphone' | 'companion';

export interface BattleRoyalePlayer extends TournamentPlayer {
  score: number;
  accuracy: number; // Running average accuracy (0.0 to 1.0)
  totalEvaluatedTicks: number; // Total ticks evaluated this round
  notesHit: number;
  notesMissed: number;
  currentCombo: number;
  maxCombo: number;
  eliminated: boolean;
  eliminationRound: number | null;
  active: boolean;
  playerType: PlayerType;
  microphoneId?: string;
  connectionCode?: string;
  lastPing?: number;
}

export interface MedleySnippet {
  songId: string;
  songName: string;
  duration: number; // seconds allocated to this snippet
}

export interface SongVoteOption {
  songId: string;
  songName: string;
  votes: number;
  votedPlayerIds: string[];
}

export interface BattleRoyaleRound {
  roundNumber: number;
  songId: string;
  songName: string;
  duration: number; // Duration of this round in seconds
  startTime: number | null;
  endTime: number | null;
  eliminatedPlayerId: string | null;
  roundType: 'full' | 'short' | 'medley' | 'grand-finale';
  // Bounty info
  bountyPlayerId: string | null;
  bountyClaimed: boolean;
  bountyClaimedById: string | null;
  // Effective difficulty at time of round
  effectiveDifficulty: Difficulty;
  // Score deltas for trend tracking (playerId -> points gained this round)
  roundScoreDeltas: Record<string, number>;
}

export interface RoundHighlight {
  roundNumber: number;
  eliminatedPlayerId: string;
  eliminatedPlayerName: string;
  topScorerId: string;
  topScorerName: string;
  topScoreDelta: number;
  bountyClaimed: boolean;
  bountyClaimedById: string | null;
}

export interface BattleRoyaleGameStats {
  highestCombo: number;
  highestComboPlayerId: string | null;
  longestSurvival: number; // in rounds
  longestSurvivalPlayerId: string | null;
  bestSingleRoundDelta: number;
  bestSingleRoundDeltaPlayerId: string | null;
  bestSingleRoundDeltaRound: number;
  totalNotesHit: number;
  totalNotesMissed: number;
  roundHighlights: RoundHighlight[];
}

export interface HallOfFameEntry {
  playerId: string;
  playerName: string;
  playerAvatar?: string;
  playerColor: string;
  playerType: PlayerType;
  wins: number;
  totalGames: number;
  bestScore: number;
  longestWinStreak: number;
  currentWinStreak: number;
  averageSurvivalRounds: number;
  lastWinDate: number;
}

export type BattleRoyaleStatus =
  | 'setup'
  | 'countdown'
  | 'voting'
  | 'playing'
  | 'elimination'
  | 'grand-finale-intro'
  | 'completed';

export interface BattleRoyaleGame {
  id: string;
  players: BattleRoyalePlayer[];
  rounds: BattleRoyaleRound[];
  currentRound: number;
  status: BattleRoyaleStatus;
  winner: BattleRoyalePlayer | null;
  settings: BattleRoyaleSettings;
  createdAt: number;
  songQueue: string[];
  connectionCode: string;
  connectedCompanions: number;

  // Song no-repeat protection (#3)
  recentlyPlayedSongIds: string[];

  // Previous round scores for trend arrows (#9)
  // Snapshot of each player's score at the START of the current round
  previousRoundScores: Record<string, number>;

  // Bounty system (#6)
  bountyPlayerId: string | null;

  // Grand Finale (#4)
  isGrandFinale: boolean;
  finalWins: Record<string, number>; // playerId -> wins in final rounds
  grandFinaleIntroShown: boolean;

  // Dynamic difficulty (#7)
  effectiveDifficulty: Difficulty;

  // Medley snippet tracking (#1)
  medleySnippetList: MedleySnippet[];
  currentSnippetIndex: number;

  // Song voting (#2)
  voteOptions: SongVoteOption[];

  // Spectator predictions (#11)
  spectatorPredictions: Record<string, string | null>; // spectatorId -> predicted eliminated player id
  correctPredictions: Record<string, number>; // spectatorId -> correct prediction count

  // Game statistics (#12)
  gameStats: BattleRoyaleGameStats;
}

export interface BattleRoyaleSettings {
  roundDuration: number;
  finalRoundDuration: number;
  randomSongs: boolean;
  medleyMode: boolean;
  medleySnippets: number;
  difficulty: Difficulty;
  eliminationAnimation: boolean;

  // Song selection (#2)
  songSelection: 'random' | 'vote';

  // No-repeat protection (#3)
  noRepeatProtection: boolean;
  noRepeatCount: number;

  // Grand Finale (#4)
  grandFinaleBestOf: 1 | 3 | 5;

  // Bounty system (#6)
  bountyEnabled: boolean;
  bountyMultiplier: number;

  // Dynamic difficulty (#7)
  escalatingDifficulty: boolean;

  // Shrinking timer (#8)
  shrinkingTimer: boolean;
  shrinkFactor: number; // seconds to reduce per round
  minRoundDuration: number;
}

// ==================== CONSTANTS ====================

export const MAX_LOCAL_MIC_PLAYERS = 4;
export const MAX_COMPANION_PLAYERS = 20;
export const MAX_BATTLE_ROYALE_PLAYERS = MAX_LOCAL_MIC_PLAYERS + MAX_COMPANION_PLAYERS;
const MIN_BATTLE_ROYALE_PLAYERS = 2;

export const DEFAULT_BATTLE_ROYALE_SETTINGS: BattleRoyaleSettings = {
  roundDuration: 60,
  finalRoundDuration: 120,
  randomSongs: true,
  medleyMode: false,
  medleySnippets: 3,
  difficulty: 'medium',
  eliminationAnimation: true,

  // #2 Song voting
  songSelection: 'random',

  // #3 No-repeat protection
  noRepeatProtection: true,
  noRepeatCount: 10,

  // #4 Grand Finale
  grandFinaleBestOf: 1,

  // #6 Bounty system
  bountyEnabled: true,
  bountyMultiplier: 1.5,

  // #7 Dynamic difficulty
  escalatingDifficulty: false,

  // #8 Shrinking timer
  shrinkingTimer: false,
  shrinkFactor: 5,
  minRoundDuration: 30,
};

const DIFFICULTY_ORDER: Difficulty[] = ['easy', 'medium', 'hard'];
const ESCALATION_INTERVAL = 3; // rounds between difficulty increases
const HALL_OF_FAME_KEY = 'karaoke-battle-royale-hall-of-fame';
const MAX_HALL_OF_FAME_ENTRIES = 50;

// ==================== HALL OF FAME PERSISTENCE ====================

export function getHallOfFame(): HallOfFameEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(HALL_OF_FAME_KEY);
    if (!stored) return [];
    return JSON.parse(stored) as HallOfFameEntry[];
  } catch {
    return [];
  }
}

function saveHallOfFame(entries: HallOfFameEntry[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(HALL_OF_FAME_KEY, JSON.stringify(entries));
  } catch {
    // localStorage might be full or unavailable
  }
}

export function recordHallOfFame(game: BattleRoyaleGame): void {
  if (!game.winner) return;

  const winner = game.winner;
  const survivalRounds = game.currentRound; // winner survived all rounds
  const existing = getHallOfFame();

  // Find existing entry for this player
  const existingIndex = existing.findIndex(e => e.playerId === winner.id);

  if (existingIndex >= 0) {
    const entry = existing[existingIndex];
    entry.wins += 1;
    entry.totalGames += 1;
    entry.currentWinStreak += 1;
    entry.longestWinStreak = Math.max(entry.longestWinStreak, entry.currentWinStreak);
    entry.bestScore = Math.max(entry.bestScore, winner.score);
    entry.lastWinDate = Date.now();
    // Update average survival: (oldAvg * (totalGames-1) + newSurvival) / totalGames
    entry.averageSurvivalRounds = Math.round(
      (entry.averageSurvivalRounds * (entry.totalGames - 1) + survivalRounds) / entry.totalGames
    );
    existing[existingIndex] = entry;
  } else {
    existing.push({
      playerId: winner.id,
      playerName: winner.name,
      playerAvatar: winner.avatar,
      playerColor: winner.color,
      playerType: winner.playerType,
      wins: 1,
      totalGames: 1,
      bestScore: winner.score,
      longestWinStreak: 1,
      currentWinStreak: 1,
      averageSurvivalRounds: survivalRounds,
      lastWinDate: Date.now(),
    });
  }

  // Reset win streak for all players who participated but didn't win
  const participantIds = new Set(game.players.map(p => p.id));
  for (const entry of existing) {
    if (participantIds.has(entry.playerId) && entry.playerId !== winner.id) {
      entry.currentWinStreak = 0;
      entry.totalGames += 1;
      // Update average survival
      const playerSurvival = game.players.find(p => p.id === entry.playerId);
      const rounds = playerSurvival?.eliminationRound ?? survivalRounds;
      entry.averageSurvivalRounds = Math.round(
        (entry.averageSurvivalRounds * (entry.totalGames - 1) + rounds) / entry.totalGames
      );
    }
  }

  // Sort by wins (desc), then best score (desc), then last win date (desc)
  existing.sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (b.bestScore !== a.bestScore) return b.bestScore - a.bestScore;
    return b.lastWinDate - a.lastWinDate;
  });

  // Keep only top entries
  saveHallOfFame(existing.slice(0, MAX_HALL_OF_FAME_ENTRIES));
}

// ==================== UTILITY ====================

function generateConnectionCode(): string {
  return generateCode(6, FULL_CODE_CHARS);
}

// ==================== GAME CREATION ====================

export function createBattleRoyale(
  players: Array<{
    id: string;
    name: string;
    avatar?: string;
    color: string;
    playerType: PlayerType;
    microphoneId?: string;
    connectionCode?: string;
  }>,
  settings: BattleRoyaleSettings = DEFAULT_BATTLE_ROYALE_SETTINGS,
  availableSongIds: string[] = []
): BattleRoyaleGame {
  // Merge with defaults so new fields are always present
  const mergedSettings: BattleRoyaleSettings = {
    ...DEFAULT_BATTLE_ROYALE_SETTINGS,
    ...settings,
  };

  const micPlayers = players.filter(p => p.playerType === 'microphone');
  const companionPlayers = players.filter(p => p.playerType === 'companion');

  if (players.length < MIN_BATTLE_ROYALE_PLAYERS) {
    throw new Error(`Battle Royale requires at least ${MIN_BATTLE_ROYALE_PLAYERS} players`);
  }
  if (players.length > MAX_BATTLE_ROYALE_PLAYERS) {
    throw new Error(`Battle Royale supports maximum ${MAX_BATTLE_ROYALE_PLAYERS} players`);
  }
  if (micPlayers.length > MAX_LOCAL_MIC_PLAYERS) {
    throw new Error(`Maximum ${MAX_LOCAL_MIC_PLAYERS} local microphone players allowed`);
  }
  if (companionPlayers.length > MAX_COMPANION_PLAYERS) {
    throw new Error(`Maximum ${MAX_COMPANION_PLAYERS} companion players allowed`);
  }

  const battleRoyalePlayers: BattleRoyalePlayer[] = players.map((p) => ({
    id: p.id,
    name: p.name,
    avatar: p.avatar,
    color: p.color,
    seed: 1,
    eliminated: false,
    lossCount: 0,
    score: 0,
    accuracy: 0,
    totalEvaluatedTicks: 0,
    notesHit: 0,
    notesMissed: 0,
    currentCombo: 0,
    maxCombo: 0,
    eliminationRound: null,
    active: true,
    playerType: p.playerType,
    microphoneId: p.microphoneId,
    connectionCode: p.connectionCode,
    lastPing: p.playerType === 'companion' ? Date.now() : undefined,
  }));

  const songQueue = mergedSettings.randomSongs
    ? shuffleArray([...availableSongIds])
    : [...availableSongIds];

  const emptyStats: BattleRoyaleGameStats = {
    highestCombo: 0,
    highestComboPlayerId: null,
    longestSurvival: 0,
    longestSurvivalPlayerId: null,
    bestSingleRoundDelta: 0,
    bestSingleRoundDeltaPlayerId: null,
    bestSingleRoundDeltaRound: 0,
    totalNotesHit: 0,
    totalNotesMissed: 0,
    roundHighlights: [],
  };

  return {
    id: `battleroyale_${Date.now()}`,
    players: battleRoyalePlayers,
    rounds: [],
    currentRound: 0,
    status: 'setup',
    winner: null,
    settings: mergedSettings,
    createdAt: Date.now(),
    songQueue,
    connectionCode: generateConnectionCode(),
    connectedCompanions: companionPlayers.length,

    // #3 No-repeat
    recentlyPlayedSongIds: [],

    // #9 Trend tracking
    previousRoundScores: {},

    // #6 Bounty
    bountyPlayerId: null,

    // #4 Grand Finale
    isGrandFinale: false,
    finalWins: {},
    grandFinaleIntroShown: false,

    // #7 Dynamic difficulty
    effectiveDifficulty: mergedSettings.difficulty,

    // #1 Medley
    medleySnippetList: [],
    currentSnippetIndex: 0,

    // #2 Song voting
    voteOptions: [],

    // #11 Spectator
    spectatorPredictions: {},
    correctPredictions: {},

    // #12 Stats
    gameStats: emptyStats,
  };
}

// ==================== PLAYER QUERIES ====================

export function getActivePlayers(game: BattleRoyaleGame): BattleRoyalePlayer[] {
  return game.players.filter(p => !p.eliminated);
}

export function getPlayersByScore(game: BattleRoyaleGame): BattleRoyalePlayer[] {
  return [...game.players].sort((a, b) => {
    if (a.eliminated && !b.eliminated) return 1;
    if (!a.eliminated && b.eliminated) return -1;
    return b.score - a.score;
  });
}

// ==================== ROUND DURATION & DIFFICULTY ====================

/** Calculate effective round duration considering shrinking timer, grand finale, etc. */
export function getEffectiveRoundDuration(
  settings: BattleRoyaleSettings,
  roundNumber: number,
  activePlayerCount: number,
  isGrandFinale: boolean
): number {
  // Grand finale always uses final round duration
  if (isGrandFinale || activePlayerCount === 2) {
    return settings.finalRoundDuration;
  }

  let duration = settings.roundDuration;

  // #8 Shrinking timer: reduce by shrinkFactor per round
  if (settings.shrinkingTimer && settings.shrinkFactor > 0) {
    const reduction = (roundNumber - 1) * settings.shrinkFactor;
    duration = Math.max(duration - reduction, settings.minRoundDuration);
  }

  return duration;
}

/** Calculate effective difficulty considering escalating setting */
export function getEffectiveDifficulty(
  settings: BattleRoyaleSettings,
  roundNumber: number
): Difficulty {
  if (!settings.escalatingDifficulty) {
    return settings.difficulty;
  }

  const baseIndex = DIFFICULTY_ORDER.indexOf(settings.difficulty);
  const levelsToAdvance = Math.floor((roundNumber - 1) / ESCALATION_INTERVAL);
  const newIndex = Math.min(baseIndex + levelsToAdvance, DIFFICULTY_ORDER.length - 1);
  return DIFFICULTY_ORDER[newIndex];
}

// ==================== BOUNTY SYSTEM (#6) ====================

/** Determine who should have the bounty (current score leader among active players) */
export function calculateBountyTarget(game: BattleRoyaleGame): string | null {
  if (!game.settings.bountyEnabled) return null;

  const activePlayers = getActivePlayers(game);
  if (activePlayers.length < 3) return null; // No bounty with 2 players (grand finale)

  const sorted = [...activePlayers].sort((a, b) => b.score - a.score);
  return sorted[0]?.id ?? null;
}

/** Get bounty multiplier for a specific player */
export function getBountyMultiplier(game: BattleRoyaleGame, playerId: string): number {
  if (!game.settings.bountyEnabled) return 1;
  if (!game.bountyPlayerId) return 1;
  if (playerId === game.bountyPlayerId) return 1; // No bonus for bounty target
  return game.settings.bountyMultiplier;
}

// ==================== SONG SELECTION HELPERS ====================

/** Filter out recently played songs for no-repeat protection (#3) */
export function filterRecentSongs(
  songIds: string[],
  recentlyPlayedIds: string[],
  noRepeatProtection: boolean,
  noRepeatCount: number
): string[] {
  if (!noRepeatProtection) return songIds;
  const recentSet = new Set(recentlyPlayedIds.slice(-noRepeatCount));
  return songIds.filter(id => !recentSet.has(id));
}

/** Add a song ID to the recent plays list */
export function addToRecentPlays(game: BattleRoyaleGame, songId: string): string[] {
  const updated = [...game.recentlyPlayedSongIds, songId];
  // Keep only the last noRepeatCount entries
  return updated.slice(-game.settings.noRepeatCount);
}

// ==================== SONG VOTING (#2) ====================

/** Enter voting phase with 3 song options */
export function startVotingPhase(
  game: BattleRoyaleGame,
  options: Array<{ songId: string; songName: string }>
): BattleRoyaleGame {
  if (game.settings.songSelection !== 'vote') return game;

  const voteOptions: SongVoteOption[] = options.map(opt => ({
    songId: opt.songId,
    songName: opt.songName,
    votes: 0,
    votedPlayerIds: [],
  }));

  return {
    ...game,
    status: 'voting',
    voteOptions,
  };
}

/** Submit a vote from a player */
export function submitVote(
  game: BattleRoyaleGame,
  playerId: string,
  songIndex: number
): BattleRoyaleGame {
  if (game.status !== 'voting') return game;
  if (songIndex < 0 || songIndex >= game.voteOptions.length) return game;

  // Check if player already voted
  for (const opt of game.voteOptions) {
    if (opt.votedPlayerIds.includes(playerId)) return game;
  }

  const updatedOptions = game.voteOptions.map((opt, i) => {
    if (i === songIndex) {
      return {
        ...opt,
        votes: opt.votes + 1,
        votedPlayerIds: [...opt.votedPlayerIds, playerId],
      };
    }
    return opt;
  });

  return { ...game, voteOptions: updatedOptions };
}

/** Resolve vote: select the song with the most votes, random tiebreaker */
export function resolveVote(game: BattleRoyaleGame): { game: BattleRoyaleGame; songId: string; songName: string } | null {
  if (game.status !== 'voting' || game.voteOptions.length === 0) return null;

  const maxVotes = Math.max(...game.voteOptions.map(o => o.votes));
  const topOptions = game.voteOptions.filter(o => o.votes === maxVotes);
  const winner = topOptions[Math.floor(Math.random() * topOptions.length)];

  return {
    game: { ...game, status: 'setup', voteOptions: [] },
    songId: winner.songId,
    songName: winner.songName,
  };
}

// ==================== MEDLEY MODE (#1) ====================

/** Get the current medley snippet (if in medley mode) */
export function getCurrentMedleySnippet(game: BattleRoyaleGame): MedleySnippet | null {
  if (game.medleySnippetList.length === 0) return null;
  return game.medleySnippetList[game.currentSnippetIndex] ?? null;
}

/** Advance to the next medley snippet */
export function advanceToNextSnippet(game: BattleRoyaleGame): BattleRoyaleGame {
  if (game.medleySnippetList.length === 0) return game;

  const nextIndex = game.currentSnippetIndex + 1;
  if (nextIndex >= game.medleySnippetList.length) return game;

  return {
    ...game,
    currentSnippetIndex: nextIndex,
  };
}

/** Calculate snippet duration from total round duration and number of snippets */
export function calculateSnippetDuration(totalDuration: number, snippetCount: number): number {
  return Math.floor(totalDuration / snippetCount);
}

// ==================== ROUND MANAGEMENT ====================

export function startRound(
  game: BattleRoyaleGame,
  songId: string,
  songName: string,
  medleySnippets?: Array<{ songId: string; songName: string }>
): BattleRoyaleGame {
  const activePlayers = getActivePlayers(game);
  if (activePlayers.length < 2) return game;

  const isFinalRound = activePlayers.length === 2 && !game.isGrandFinale;
  const isGrandFinaleRound = game.isGrandFinale;

  // Calculate effective difficulty (#7)
  const effectiveDifficulty = getEffectiveDifficulty(game.settings, game.currentRound + 1);

  // Calculate effective round duration (#8)
  const duration = getEffectiveRoundDuration(
    game.settings,
    game.currentRound + 1,
    activePlayers.length,
    isGrandFinaleRound
  );

  // Determine round type
  let roundType: BattleRoyaleRound['roundType'] = 'short';
  if (isGrandFinaleRound) {
    roundType = 'grand-finale';
  } else if (game.settings.medleyMode && medleySnippets && medleySnippets.length > 1) {
    roundType = 'medley';
  } else if (isFinalRound) {
    roundType = 'full';
  }

  // Build medley snippet list if applicable (#1)
  const snippetList: MedleySnippet[] = [];
  let currentSnippetIndex = 0;
  if (roundType === 'medley' && medleySnippets) {
    const snippetDuration = calculateSnippetDuration(duration, medleySnippets.length);
    for (const snippet of medleySnippets) {
      snippetList.push({
        songId: snippet.songId,
        songName: snippet.songName,
        duration: snippetDuration,
      });
    }
  }

  // Calculate bounty target (#6)
  const bountyPlayerId = calculateBountyTarget(game);

  // Snapshot current scores for trend tracking (#9)
  const previousRoundScores: Record<string, number> = {};
  for (const player of game.players) {
    previousRoundScores[player.id] = player.score;
  }

  // For grand finale rounds, reset active players' scores for fair per-round comparison
  const resetScores = isGrandFinaleRound;
  const updatedPlayers = game.players.map(p => {
    if (!p.eliminated) {
      return {
        ...p,
        currentCombo: 0,
        accuracy: 0,
        totalEvaluatedTicks: 0,
        ...(resetScores ? { score: 0 } : {}),
      };
    }
    return p;
  });

  // Track the played song for no-repeat protection (#3)
  const updatedRecentSongs = addToRecentPlays(game, songId);

  const round: BattleRoyaleRound = {
    roundNumber: game.currentRound + 1,
    songId,
    songName,
    duration,
    startTime: Date.now(),
    endTime: null,
    eliminatedPlayerId: null,
    roundType,
    bountyPlayerId,
    bountyClaimed: false,
    bountyClaimedById: null,
    effectiveDifficulty,
    roundScoreDeltas: {},
  };

  return {
    ...game,
    players: updatedPlayers,
    rounds: [...game.rounds, round],
    currentRound: game.currentRound + 1,
    status: 'playing',
    effectiveDifficulty,
    bountyPlayerId,

    // #3 No-repeat
    recentlyPlayedSongIds: updatedRecentSongs,

    // #9 Trend tracking
    previousRoundScores,

    // #1 Medley
    medleySnippetList: snippetList,
    currentSnippetIndex,
  };
}

// ==================== SCORING ====================

export function updatePlayerScore(
  game: BattleRoyaleGame,
  playerId: string,
  scoreDelta: number,
  tickAccuracy: number,
  notesHitDelta: number = 0,
  notesMissedDelta: number = 0,
  comboDelta: number = 0
): BattleRoyaleGame {
  const playerIndex = game.players.findIndex(p => p.id === playerId);
  if (playerIndex === -1 || game.players[playerIndex].eliminated) {
    return game;
  }

  const player = game.players[playerIndex];
  const newTickCount = player.totalEvaluatedTicks + 1;
  const newAccuracy = player.totalEvaluatedTicks === 0
    ? tickAccuracy
    : player.accuracy + (tickAccuracy - player.accuracy) / newTickCount;

  const updatedPlayer = {
    ...player,
    score: player.score + scoreDelta,
    accuracy: newAccuracy,
    totalEvaluatedTicks: newTickCount,
    notesHit: player.notesHit + notesHitDelta,
    notesMissed: player.notesMissed + notesMissedDelta,
    currentCombo: player.currentCombo + comboDelta,
    maxCombo: Math.max(player.maxCombo, player.currentCombo + comboDelta),
  };

  const updatedPlayers = [...game.players];
  updatedPlayers[playerIndex] = updatedPlayer;

  return {
    ...game,
    players: updatedPlayers,
  };
}

// ==================== ELIMINATION ====================

export function endRoundAndEliminate(game: BattleRoyaleGame): BattleRoyaleGame {
  const activePlayers = getActivePlayers(game);

  if (activePlayers.length <= 1) {
    return game;
  }

  // Calculate score deltas for this round (#9, #12)
  const roundScoreDeltas: Record<string, number> = {};
  for (const player of game.players) {
    const prevScore = game.previousRoundScores[player.id] ?? 0;
    roundScoreDeltas[player.id] = player.score - prevScore;
  }

  // Check bounty (#6): was the bounty target overtaken?
  let bountyClaimed = false;
  let bountyClaimedById: string | null = null;
  if (game.bountyPlayerId) {
    const bountyPlayer = activePlayers.find(p => p.id === game.bountyPlayerId);
    if (bountyPlayer) {
      // Find the player with the highest round delta
      const sortedByDelta = [...activePlayers]
        .filter(p => p.id !== game.bountyPlayerId)
        .sort((a, b) => (roundScoreDeltas[b.id] ?? 0) - (roundScoreDeltas[a.id] ?? 0));
      const topChallenger = sortedByDelta[0];
      const bountyDelta = roundScoreDeltas[game.bountyPlayerId] ?? 0;
      const challengerDelta = topChallenger ? (roundScoreDeltas[topChallenger.id] ?? 0) : 0;
      if (topChallenger && challengerDelta > bountyDelta && challengerDelta > 0) {
        bountyClaimed = true;
        bountyClaimedById = topChallenger.id;
      }
    }
  }

  // ---- Grand Finale logic (#4) ----
  if (game.isGrandFinale) {
    const winsNeeded = Math.ceil(game.settings.grandFinaleBestOf / 2);

    // Determine round winner (highest round delta)
    const sorted = [...activePlayers].sort((a, b) => {
      const deltaA = roundScoreDeltas[a.id] ?? 0;
      const deltaB = roundScoreDeltas[b.id] ?? 0;
      if (deltaB !== deltaA) return deltaB - deltaA;
      // Tiebreaker: notes hit
      return b.notesHit - a.notesHit;
    });
    const roundWinner = sorted[0];

    // Update final wins
    const updatedFinalWins = { ...game.finalWins };
    updatedFinalWins[roundWinner.id] = (updatedFinalWins[roundWinner.id] || 0) + 1;

    // Check for champion
    if (updatedFinalWins[roundWinner.id] >= winsNeeded) {
      // Update round
      const updatedRounds = [...game.rounds];
      if (updatedRounds.length > 0) {
        updatedRounds[updatedRounds.length - 1] = {
          ...updatedRounds[updatedRounds.length - 1],
          endTime: Date.now(),
          roundScoreDeltas,
          bountyClaimed,
          bountyClaimedById,
        };
      }

      // Record Hall of Fame
      const gameWithStats = updateGameStats({
        ...game,
        rounds: updatedRounds,
        finalWins: updatedFinalWins,
        winner: roundWinner,
        status: 'completed',
        gameStats: { ...game.gameStats, roundHighlights: [...game.gameStats.roundHighlights] },
      });
      recordHallOfFame(gameWithStats);

      return {
        ...gameWithStats,
        rounds: updatedRounds,
        finalWins: updatedFinalWins,
        winner: roundWinner,
        status: 'completed',
      };
    }

    // Update round (no elimination in grand finale)
    const updatedRounds = [...game.rounds];
    if (updatedRounds.length > 0) {
      updatedRounds[updatedRounds.length - 1] = {
        ...updatedRounds[updatedRounds.length - 1],
        endTime: Date.now(),
        roundScoreDeltas,
        bountyClaimed,
        bountyClaimedById,
      };
    }

    // Add round highlight for grand finale
    const roundHighlight: RoundHighlight = {
      roundNumber: game.currentRound,
      eliminatedPlayerId: '', // No elimination in grand finale
      eliminatedPlayerName: '',
      topScorerId: roundWinner.id,
      topScorerName: roundWinner.name,
      topScoreDelta: roundScoreDeltas[roundWinner.id] ?? 0,
      bountyClaimed,
      bountyClaimedById,
    };

    return {
      ...game,
      rounds: updatedRounds,
      finalWins: updatedFinalWins,
      status: 'elimination',
      gameStats: {
        ...game.gameStats,
        roundHighlights: [...game.gameStats.roundHighlights, roundHighlight],
      },
    };
  }

  // ---- Normal elimination logic ----

  // Find player with lowest score; tiebreaker: fewest notesHit, lowest maxCombo, player ID
  const sorted = [...activePlayers].sort((a, b) => {
    if (a.score !== b.score) return a.score - b.score;
    if (a.notesHit !== b.notesHit) return a.notesHit - b.notesHit;
    if (a.maxCombo !== b.maxCombo) return a.maxCombo - b.maxCombo;
    return a.id.localeCompare(b.id);
  });
  const lowestScorer = sorted[0];

  // Resolve spectator predictions (#11)
  const updatedPredictions = { ...game.correctPredictions };
  for (const [spectatorId, predictedId] of Object.entries(game.spectatorPredictions)) {
    if (predictedId === lowestScorer.id) {
      updatedPredictions[spectatorId] = (updatedPredictions[spectatorId] || 0) + 1;
    }
  }

  // Mark as eliminated
  const updatedPlayers = game.players.map(p =>
    p.id === lowestScorer.id
      ? { ...p, eliminated: true, eliminationRound: game.currentRound, active: false }
      : p
  );

  // Update round
  const updatedRounds = [...game.rounds];
  if (updatedRounds.length > 0) {
    updatedRounds[updatedRounds.length - 1] = {
      ...updatedRounds[updatedRounds.length - 1],
      endTime: Date.now(),
      eliminatedPlayerId: lowestScorer.id,
      roundScoreDeltas,
      bountyClaimed,
      bountyClaimedById,
    };
  }

  // Add round highlight (#12)
  const topScorer = [...activePlayers].sort((a, b) => b.score - a.score)[0];
  const roundHighlight: RoundHighlight = {
    roundNumber: game.currentRound,
    eliminatedPlayerId: lowestScorer.id,
    eliminatedPlayerName: lowestScorer.name,
    topScorerId: topScorer.id,
    topScorerName: topScorer.name,
    topScoreDelta: roundScoreDeltas[topScorer.id] ?? 0,
    bountyClaimed,
    bountyClaimedById,
  };

  // Check remaining players
  const remainingPlayers = updatedPlayers.filter(p => !p.eliminated);

  // Check if we should enter Grand Finale (#4)
  if (
    remainingPlayers.length === 2 &&
    !game.isGrandFinale &&
    game.settings.grandFinaleBestOf > 1
  ) {
    // Enter grand finale mode instead of completing
    const gameWithStats = updateGameStats({
      ...game,
      players: updatedPlayers,
      rounds: updatedRounds,
      gameStats: {
        ...game.gameStats,
        roundHighlights: [...game.gameStats.roundHighlights, roundHighlight],
      },
    });

    return {
      ...gameWithStats,
      players: updatedPlayers,
      rounds: updatedRounds,
      status: 'elimination', // Will transition to grand-finale-intro after animation
      isGrandFinale: true,
      bountyPlayerId: null, // No bounty in grand finale
      correctPredictions: updatedPredictions,
    };
  }

  const isGameComplete = remainingPlayers.length === 1;
  const winner = isGameComplete ? remainingPlayers[0] : null;

  const updatedGame: BattleRoyaleGame = {
    ...game,
    players: updatedPlayers,
    rounds: updatedRounds,
    status: isGameComplete ? 'completed' : 'elimination',
    winner,
    correctPredictions: updatedPredictions,
    gameStats: {
      ...game.gameStats,
      roundHighlights: [...game.gameStats.roundHighlights, roundHighlight],
    },
  };

  // Record Hall of Fame and update stats if game is complete
  if (isGameComplete) {
    const gameWithStats = updateGameStats(updatedGame);
    recordHallOfFame(gameWithStats);
    return gameWithStats;
  }

  return updateGameStats(updatedGame);
}

/** Enter grand finale mode (called when 2 players remain) */
export function enterGrandFinale(game: BattleRoyaleGame): BattleRoyaleGame {
  return {
    ...game,
    isGrandFinale: true,
    grandFinaleIntroShown: true,
    bountyPlayerId: null, // No bounty in grand finale
    finalWins: {},
  };
}

// ==================== ROUND TRANSITIONS ====================

export function advanceToNextRound(game: BattleRoyaleGame): BattleRoyaleGame {
  if (game.status === 'completed' || game.winner) {
    return game;
  }

  // Clear spectator predictions for next round
  const clearedPredictions: Record<string, string | null> = {};
  for (const id of Object.keys(game.spectatorPredictions)) {
    clearedPredictions[id] = null;
  }

  // If we just entered grand finale, show intro first
  if (game.isGrandFinale && !game.grandFinaleIntroShown) {
    return {
      ...game,
      status: 'grand-finale-intro',
      spectatorPredictions: clearedPredictions,
    };
  }

  // If grand finale intro was shown, go to setup
  if (game.status === 'grand-finale-intro') {
    return {
      ...game,
      status: 'setup',
      spectatorPredictions: clearedPredictions,
    };
  }

  return {
    ...game,
    status: 'setup',
    spectatorPredictions: clearedPredictions,
  };
}

// ==================== SPECTATOR PREDICTIONS (#11) ====================

/** Submit a prediction from an eliminated player */
export function submitPrediction(
  game: BattleRoyaleGame,
  spectatorPlayerId: string,
  predictedEliminatedId: string | null
): BattleRoyaleGame {
  const spectator = game.players.find(p => p.id === spectatorPlayerId);
  if (!spectator || !spectator.eliminated) return game;

  return {
    ...game,
    spectatorPredictions: {
      ...game.spectatorPredictions,
      [spectatorPlayerId]: predictedEliminatedId,
    },
  };
}

/** Get all eliminated players (spectators) */
export function getSpectators(game: BattleRoyaleGame): BattleRoyalePlayer[] {
  return game.players.filter(p => p.eliminated);
}

// ==================== STATISTICS (#12) ====================

export function getEliminationOrder(game: BattleRoyaleGame): BattleRoyalePlayer[] {
  return [...game.players]
    .filter(p => p.eliminated || p.id === game.winner?.id)
    .sort((a, b) => {
      if (a.id === game.winner?.id) return 1;
      if (b.id === game.winner?.id) return -1;
      return (a.eliminationRound || 0) - (b.eliminationRound || 0);
    });
}

/** Update game statistics based on current state */
export function updateGameStats(game: BattleRoyaleGame): BattleRoyaleGame {
  const stats = { ...game.gameStats };

  // Track highest combo
  for (const player of game.players) {
    if (player.maxCombo > stats.highestCombo) {
      stats.highestCombo = player.maxCombo;
      stats.highestComboPlayerId = player.id;
    }
  }

  // Track longest survival (most rounds before elimination)
  for (const player of game.players) {
    const survival = player.eliminationRound ?? game.currentRound;
    if (survival > stats.longestSurvival) {
      stats.longestSurvival = survival;
      stats.longestSurvivalPlayerId = player.id;
    }
  }

  // Track best single round delta
  for (const round of game.rounds) {
    for (const [playerId, delta] of Object.entries(round.roundScoreDeltas)) {
      if (delta > stats.bestSingleRoundDelta) {
        stats.bestSingleRoundDelta = delta;
        stats.bestSingleRoundDeltaPlayerId = playerId;
        stats.bestSingleRoundDeltaRound = round.roundNumber;
      }
    }
  }

  // Track total notes
  stats.totalNotesHit = game.players.reduce((sum, p) => sum + p.notesHit, 0);
  stats.totalNotesMissed = game.players.reduce((sum, p) => sum + p.notesMissed, 0);

  return { ...game, gameStats: stats };
}

export function getBattleRoyaleStats(game: BattleRoyaleGame) {
  const activePlayers = getActivePlayers(game);
  const micPlayers = game.players.filter(p => p.playerType === 'microphone');
  const companionPlayers = game.players.filter(p => p.playerType === 'companion');

  // Find the wins needed for grand finale
  const winsNeeded = game.isGrandFinale
    ? Math.ceil(game.settings.grandFinaleBestOf / 2)
    : 0;

  return {
    totalPlayers: game.players.length,
    activePlayers: activePlayers.length,
    eliminatedPlayers: game.players.filter(p => p.eliminated).length,
    roundsPlayed: game.rounds.length,
    currentRound: game.currentRound,
    totalScore: game.players.reduce((sum, p) => sum + p.score, 0),
    isComplete: game.status === 'completed',
    topPlayer: getPlayersByScore(game)[0] ?? null,
    micPlayers: micPlayers.length,
    companionPlayers: companionPlayers.length,
    activeMicPlayers: activePlayers.filter(p => p.playerType === 'microphone').length,
    activeCompanionPlayers: activePlayers.filter(p => p.playerType === 'companion').length,
    maxMicPlayers: MAX_LOCAL_MIC_PLAYERS,
    maxCompanionPlayers: MAX_COMPANION_PLAYERS,
    maxTotalPlayers: MAX_BATTLE_ROYALE_PLAYERS,

    // #4 Grand Finale
    isGrandFinale: game.isGrandFinale,
    finalWins: game.finalWins,
    winsNeeded,

    // #7 Dynamic difficulty
    effectiveDifficulty: game.effectiveDifficulty,

    // #6 Bounty
    bountyPlayerId: game.bountyPlayerId,

    // #1 Medley
    isMedleyRound: game.medleySnippetList.length > 0,
    currentSnippetIndex: game.currentSnippetIndex,
    totalSnippets: game.medleySnippetList.length,

    // #12 Game stats
    gameStats: game.gameStats,
  };
}
