// Battle Royale Mode - All players sing simultaneously, lowest score eliminated
// Supports 2-24 players with real-time score tracking and elimination
// 4 local microphone players + 20 companion app players

import { TournamentPlayer } from './tournament';

// Player type enum
export type PlayerType = 'microphone' | 'companion';

export interface BattleRoyalePlayer extends TournamentPlayer {
  score: number;
  accuracy: number;
  notesHit: number;
  notesMissed: number;
  currentCombo: number;
  maxCombo: number;
  eliminated: boolean;
  eliminationRound: number | null;
  active: boolean; // Currently singing (microphone active)
  playerType: PlayerType; // 'microphone' for local, 'companion' for app
  microphoneId?: string; // Device ID for multi-mic support (local players only)
  connectionCode?: string; // Connection code for companion players
  lastPing?: number; // Last heartbeat timestamp for companions
}

export interface BattleRoyaleRound {
  roundNumber: number;
  songId: string;
  songName: string;
  duration: number; // Duration of this round in seconds
  startTime: number | null;
  endTime: number | null;
  eliminatedPlayerId: string | null;
  roundType: 'full' | 'short' | 'medley';
}

export interface BattleRoyaleGame {
  id: string;
  players: BattleRoyalePlayer[];
  rounds: BattleRoyaleRound[];
  currentRound: number;
  status: 'setup' | 'countdown' | 'playing' | 'elimination' | 'completed';
  winner: BattleRoyalePlayer | null;
  settings: BattleRoyaleSettings;
  createdAt: number;
  songQueue: string[]; // Song IDs for upcoming rounds
  // Companion connection management
  connectionCode: string; // Code for companions to join
  connectedCompanions: number; // Count of connected companion apps
}

export interface BattleRoyaleSettings {
  roundDuration: number; // Seconds per elimination round (e.g., 30, 60)
  finalRoundDuration: number; // Longer duration for final 2
  randomSongs: boolean;
  medleyMode: boolean; // Multiple song snippets in one round
  medleySnippets: number; // How many songs per medley
  difficulty: 'easy' | 'medium' | 'hard';
  eliminationAnimation: boolean; // Show dramatic elimination animation
}

// Player limits
export const MAX_LOCAL_MIC_PLAYERS = 4;    // Direct microphone at device
export const MAX_COMPANION_PLAYERS = 20;   // Via companion app
export const MAX_BATTLE_ROYALE_PLAYERS = MAX_LOCAL_MIC_PLAYERS + MAX_COMPANION_PLAYERS; // 24 total
export const MIN_BATTLE_ROYALE_PLAYERS = 2;

// Default settings
export const DEFAULT_BATTLE_ROYALE_SETTINGS: BattleRoyaleSettings = {
  roundDuration: 60, // 1 minute per round
  finalRoundDuration: 120, // 2 minutes for final
  randomSongs: true,
  medleyMode: false,
  medleySnippets: 3,
  difficulty: 'medium',
  eliminationAnimation: true,
};

// Generate a unique connection code for the game
function generateConnectionCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Create a new Battle Royale game
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
  // Validate player counts
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
    score: 0,
    accuracy: 0,
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

  // Shuffle songs for random selection
  const songQueue = settings.randomSongs 
    ? shuffleArray([...availableSongIds])
    : [...availableSongIds];

  return {
    id: `battleroyale_${Date.now()}`,
    players: battleRoyalePlayers,
    rounds: [],
    currentRound: 0,
    status: 'setup',
    winner: null,
    settings,
    createdAt: Date.now(),
    songQueue,
    connectionCode: generateConnectionCode(),
    connectedCompanions: companionPlayers.length,
  };
}

// Shuffle array
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Get active (non-eliminated) players
export function getActivePlayers(game: BattleRoyaleGame): BattleRoyalePlayer[] {
  return game.players.filter(p => !p.eliminated);
}

// Get active players by type
export function getActivePlayersByType(game: BattleRoyaleGame, type: PlayerType): BattleRoyalePlayer[] {
  return game.players.filter(p => !p.eliminated && p.playerType === type);
}

// Get sorted players by score (descending)
export function getPlayersByScore(game: BattleRoyaleGame): BattleRoyalePlayer[] {
  return [...game.players].sort((a, b) => {
    // Eliminated players go to the bottom
    if (a.eliminated && !b.eliminated) return 1;
    if (!a.eliminated && b.eliminated) return -1;
    // Sort by score descending
    return b.score - a.score;
  });
}

// Start a new round
export function startRound(
  game: BattleRoyaleGame,
  songId: string,
  songName: string
): BattleRoyaleGame {
  const activePlayers = getActivePlayers(game);
  const isFinalRound = activePlayers.length === 2;
  
  const round: BattleRoyaleRound = {
    roundNumber: game.currentRound + 1,
    songId,
    songName,
    duration: isFinalRound ? game.settings.finalRoundDuration : game.settings.roundDuration,
    startTime: Date.now(),
    endTime: null,
    eliminatedPlayerId: null,
    roundType: game.settings.medleyMode ? 'medley' : 'short',
  };

  // Reset active players' round stats
  const updatedPlayers = game.players.map(p => {
    if (!p.eliminated) {
      return {
        ...p,
        currentCombo: 0,
      };
    }
    return p;
  });

  return {
    ...game,
    players: updatedPlayers,
    rounds: [...game.rounds, round],
    currentRound: game.currentRound + 1,
    status: 'playing',
  };
}

// Update player score during round
export function updatePlayerScore(
  game: BattleRoyaleGame,
  playerId: string,
  scoreDelta: number,
  accuracyDelta: number,
  notesHitDelta: number = 0,
  notesMissedDelta: number = 0,
  comboDelta: number = 0
): BattleRoyaleGame {
  const playerIndex = game.players.findIndex(p => p.id === playerId);
  if (playerIndex === -1 || game.players[playerIndex].eliminated) {
    return game;
  }

  const player = game.players[playerIndex];
  const updatedPlayer = {
    ...player,
    score: player.score + scoreDelta,
    accuracy: player.accuracy + accuracyDelta,
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

// End round and eliminate lowest scorer
export function endRoundAndEliminate(game: BattleRoyaleGame): BattleRoyaleGame {
  const activePlayers = getActivePlayers(game);
  
  if (activePlayers.length <= 1) {
    // Game should already be complete
    return game;
  }

  // Find player with lowest score
  const lowestScorer = activePlayers.reduce((min, p) => 
    p.score < min.score ? p : min
  );

  // Mark as eliminated
  const updatedPlayers = game.players.map(p =>
    p.id === lowestScorer.id
      ? { ...p, eliminated: true, eliminationRound: game.currentRound, active: false }
      : p
  );

  // Update current round
  const updatedRounds = [...game.rounds];
  if (updatedRounds.length > 0) {
    updatedRounds[updatedRounds.length - 1] = {
      ...updatedRounds[updatedRounds.length - 1],
      endTime: Date.now(),
      eliminatedPlayerId: lowestScorer.id,
    };
  }

  // Check for winner
  const remainingPlayers = updatedPlayers.filter(p => !p.eliminated);
  const isGameComplete = remainingPlayers.length === 1;
  const winner = isGameComplete ? remainingPlayers[0] : null;

  return {
    ...game,
    players: updatedPlayers,
    rounds: updatedRounds,
    status: isGameComplete ? 'completed' : 'elimination',
    winner,
  };
}

// Advance to next round after elimination animation
export function advanceToNextRound(game: BattleRoyaleGame): BattleRoyaleGame {
  if (game.status === 'completed' || game.winner) {
    return game;
  }
  
  return {
    ...game,
    status: 'setup',
  };
}

// Get next song from queue
export function getNextSong(game: BattleRoyaleGame): string | null {
  if (game.songQueue.length === 0) return null;
  return game.songQueue[game.currentRound % game.songQueue.length] || null;
}

// Get elimination order (for final results display)
export function getEliminationOrder(game: BattleRoyaleGame): BattleRoyalePlayer[] {
  return [...game.players]
    .filter(p => p.eliminated || p.id === game.winner?.id)
    .sort((a, b) => {
      // Winner is last (best position)
      if (a.id === game.winner?.id) return 1;
      if (b.id === game.winner?.id) return -1;
      // Earlier elimination = lower position
      return (a.eliminationRound || 0) - (b.eliminationRound || 0);
    });
}

// Get game statistics
export function getBattleRoyaleStats(game: BattleRoyaleGame) {
  const activePlayers = getActivePlayers(game);
  const micPlayers = game.players.filter(p => p.playerType === 'microphone');
  const companionPlayers = game.players.filter(p => p.playerType === 'companion');
  
  return {
    totalPlayers: game.players.length,
    activePlayers: activePlayers.length,
    eliminatedPlayers: game.players.filter(p => p.eliminated).length,
    roundsPlayed: game.rounds.length,
    currentRound: game.currentRound,
    totalScore: game.players.reduce((sum, p) => sum + p.score, 0),
    isComplete: game.status === 'completed',
    topPlayer: getPlayersByScore(game)[0],
    // Player type breakdown
    micPlayers: micPlayers.length,
    companionPlayers: companionPlayers.length,
    activeMicPlayers: activePlayers.filter(p => p.playerType === 'microphone').length,
    activeCompanionPlayers: activePlayers.filter(p => p.playerType === 'companion').length,
    // Limits
    maxMicPlayers: MAX_LOCAL_MIC_PLAYERS,
    maxCompanionPlayers: MAX_COMPANION_PLAYERS,
    maxTotalPlayers: MAX_BATTLE_ROYALE_PLAYERS,
  };
}

// Disable a player's microphone (for companion app users or eliminated players)
export function setPlayerActive(
  game: BattleRoyaleGame,
  playerId: string,
  active: boolean
): BattleRoyaleGame {
  const updatedPlayers = game.players.map(p =>
    p.id === playerId && !p.eliminated
      ? { ...p, active }
      : p
  );

  return {
    ...game,
    players: updatedPlayers,
  };
}

// Add a companion player to the game
export function addCompanionPlayer(
  game: BattleRoyaleGame,
  player: {
    id: string;
    name: string;
    avatar?: string;
    color: string;
    connectionCode: string;
  }
): BattleRoyaleGame | null {
  // Check if game is still in setup
  if (game.status !== 'setup') {
    return null;
  }
  
  // Check limits
  const currentCompanions = game.players.filter(p => p.playerType === 'companion').length;
  if (currentCompanions >= MAX_COMPANION_PLAYERS) {
    return null;
  }
  
  // Check total players
  if (game.players.length >= MAX_BATTLE_ROYALE_PLAYERS) {
    return null;
  }
  
  // Check if player already exists
  if (game.players.some(p => p.id === player.id)) {
    return null;
  }
  
  const newPlayer: BattleRoyalePlayer = {
    id: player.id,
    name: player.name,
    avatar: player.avatar,
    color: player.color,
    seed: game.players.length + 1,
    eliminated: false,
    score: 0,
    accuracy: 0,
    notesHit: 0,
    notesMissed: 0,
    currentCombo: 0,
    maxCombo: 0,
    eliminationRound: null,
    active: true,
    playerType: 'companion',
    connectionCode: player.connectionCode,
    lastPing: Date.now(),
  };
  
  return {
    ...game,
    players: [...game.players, newPlayer],
    connectedCompanions: game.connectedCompanions + 1,
  };
}

// Remove a companion player (disconnected)
export function removeCompanionPlayer(
  game: BattleRoyaleGame,
  playerId: string
): BattleRoyaleGame {
  // Only allow removal during setup phase
  if (game.status !== 'setup') {
    return game;
  }
  
  const updatedPlayers = game.players.filter(p => p.id !== playerId);
  
  return {
    ...game,
    players: updatedPlayers,
    connectedCompanions: Math.max(0, game.connectedCompanions - 1),
  };
}

// Update companion heartbeat
export function updateCompanionHeartbeat(
  game: BattleRoyaleGame,
  playerId: string
): BattleRoyaleGame {
  const updatedPlayers = game.players.map(p =>
    p.id === playerId && p.playerType === 'companion'
      ? { ...p, lastPing: Date.now() }
      : p
  );
  
  return {
    ...game,
    players: updatedPlayers,
  };
}

// Export/import for saving
export function serializeBattleRoyale(game: BattleRoyaleGame): string {
  return JSON.stringify(game);
}

export function deserializeBattleRoyale(data: string): BattleRoyaleGame | null {
  try {
    return JSON.parse(data) as BattleRoyaleGame;
  } catch {
    return null;
  }
}
