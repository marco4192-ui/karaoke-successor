// Battle Royale – player queries, statistics, and spectator predictions

import type {
  BattleRoyaleGame,
  BattleRoyalePlayer,
} from './battle-royale-types';
import {
  MAX_LOCAL_MIC_PLAYERS,
  MAX_COMPANION_PLAYERS,
  MAX_BATTLE_ROYALE_PLAYERS,
} from './battle-royale-types';

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
