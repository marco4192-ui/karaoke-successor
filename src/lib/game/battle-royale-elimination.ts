// Battle Royale – elimination logic, round transitions, and Grand Finale

import type {
  BattleRoyaleGame,
  RoundHighlight,
} from './battle-royale-types';
import { getActivePlayers, updateGameStats } from './battle-royale-stats';
import { recordHallOfFame } from './battle-royale-hall-of-fame';

// ==================== ELIMINATION ====================

export function endRoundAndEliminate(game: BattleRoyaleGame): BattleRoyaleGame {
  const activePlayers = getActivePlayers(game);

  if (activePlayers.length <= 1) {
    return game;
  }

  if (game.rounds.length === 0) return game;

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

      // Add round highlight for the winning grand finale round
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

      // Record Hall of Fame
      const gameWithStats = updateGameStats({
        ...game,
        rounds: updatedRounds,
        finalWins: updatedFinalWins,
        winner: roundWinner,
        status: 'completed',
        gameStats: { ...game.gameStats, roundHighlights: [...game.gameStats.roundHighlights, roundHighlight] },
      });
      recordHallOfFame(gameWithStats);

      return gameWithStats;
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

    return updateGameStats({
      ...game,
      rounds: updatedRounds,
      finalWins: updatedFinalWins,
      status: 'elimination',
      gameStats: {
        ...game.gameStats,
        roundHighlights: [...game.gameStats.roundHighlights, roundHighlight],
      },
    });
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
      ? { ...p, eliminated: true, eliminationRound: game.currentRound }
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

    return enterGrandFinale({
      ...gameWithStats,
      players: updatedPlayers,
      rounds: updatedRounds,
      status: 'elimination',
      correctPredictions: updatedPredictions,
    });
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
    grandFinaleIntroShown: false,
    bountyPlayerId: null, // No bounty in grand finale
    finalWins: {},
  };
}

// ==================== ROUND TRANSITIONS ====================

export function advanceToNextRound(game: BattleRoyaleGame): BattleRoyaleGame {
  if (game.status === 'completed' || game.winner) {
    return game;
  }

  if (game.status !== 'elimination' && game.status !== 'grand-finale-intro') {
    return game;
  }

  // Clear spectator predictions for next round
  const clearedPredictions: Record<string, string | null> = {};
  for (const id of Object.keys(game.spectatorPredictions)) {
    clearedPredictions[id] = null;
  }

  // If we just entered grand finale, show intro first
  if (game.isGrandFinale && !game.grandFinaleIntroShown && game.status !== 'grand-finale-intro') {
    return {
      ...game,
      status: 'grand-finale-intro',
      grandFinaleIntroShown: true,
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
