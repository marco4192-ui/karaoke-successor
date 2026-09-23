// Battle Royale – elimination logic, round transitions, and Grand Finale

import type {
  BattleRoyaleGame,
  BattleRoyalePlayer,
  RoundHighlight,
} from './battle-royale-types';
import { getActivePlayers, updateGameStats } from './battle-royale-stats';
import { recordHallOfFame } from './battle-royale-hall-of-fame';

// ==================== SHARED ELIMINATION CORE (R19) ====================

/** Mark a player as eliminated + bookkeeping (spectator predictions, round
 *  highlight, stats, last-man-standing completion incl. Hall of Fame).
 *  Shared by the mid-round elimination, the round-end elimination and the
 *  tie-break showdown resolution — one code path, consistent behavior. */
function applyElimination(
  game: BattleRoyaleGame,
  playerId: string,
  byCoinFlip: boolean,
): { game: BattleRoyaleGame; eliminatedId: string } {
  const activePlayers = getActivePlayers(game);
  const eliminated = activePlayers.find(p => p.id === playerId);
  if (!eliminated) return { game, eliminatedId: playerId };

  const topScorer = [...activePlayers].sort((a, b) => b.score - a.score)[0];

  // Resolve spectator predictions (#11) for this elimination
  const updatedPredictions = { ...game.correctPredictions };
  for (const [spectatorId, predictedId] of Object.entries(game.spectatorPredictions)) {
    if (predictedId === eliminated.id) {
      updatedPredictions[spectatorId] = (updatedPredictions[spectatorId] || 0) + 1;
    }
  }

  const updatedPlayers = game.players.map(p =>
    p.id === eliminated.id
      ? { ...p, eliminated: true, eliminationRound: game.currentRound }
      : p
  );
  const remainingPlayers = updatedPlayers.filter(p => !p.eliminated);

  // Round highlight (mid-round eliminations appear in the winner screen too)
  const roundHighlight: RoundHighlight = {
    roundNumber: game.currentRound,
    eliminatedPlayerId: eliminated.id,
    eliminatedPlayerName: eliminated.name,
    topScorerId: topScorer?.id ?? eliminated.id,
    topScorerName: topScorer?.name ?? eliminated.name,
    topScoreDelta: topScorer?.score ?? 0,
    byCoinFlip,
  };

  // Last man standing → game over mid-song
  if (remainingPlayers.length === 1) {
    const completed: BattleRoyaleGame = {
      ...game,
      players: updatedPlayers,
      status: 'completed',
      winner: remainingPlayers[0],
      correctPredictions: updatedPredictions,
      tieBreak: null,
      gameStats: {
        ...game.gameStats,
        roundHighlights: [...game.gameStats.roundHighlights, roundHighlight],
      },
    };
    const withStats = updateGameStats(completed);
    recordHallOfFame(withStats);
    return { game: withStats, eliminatedId: eliminated.id };
  }

  return {
    game: updateGameStats({
      ...game,
      players: updatedPlayers,
      correctPredictions: updatedPredictions,
      tieBreak: null,
      gameStats: {
        ...game.gameStats,
        roundHighlights: [...game.gameStats.roundHighlights, roundHighlight],
      },
    }),
    eliminatedId: eliminated.id,
  };
}

// ==================== MID-ROUND ELIMINATION ====================

/** Tie signal: the elimination would hit TIED players — the caller starts a
 *  tie-break showdown (R19 user rule: 10s extension, then coin flip)
 *  instead of eliminating arbitrarily. */
export interface EliminationTieSignal {
  tie: true;
  tiedIds: string[];
}

/**
 * Mid-round elimination for full-song rounds (songSelection random/vote —
 * user rule 6.1): eliminates the weakest active player WHILE THE SONG KEEPS
 * PLAYING. The song is never interrupted — only the player is out.
 *
 * R19 (user rule): if the threatened players are TIED on round points, no
 * arbitrary tiebreaker decides — a tie signal is returned and the caller
 * starts the 10-second showdown extension (coin flip if still tied).
 *
 * Stops at 2 active players when the grand finale is enabled (the finale
 * decides the winner between the last two); without a finale it plays down
 * to the last man standing (status 'completed' + winner mid-song).
 * Returns null when no elimination applies (grand finale rounds, too few
 * players, wrong status).
 */
export function eliminateWeakestMidRound(
  game: BattleRoyaleGame,
): { game: BattleRoyaleGame; eliminatedId: string } | EliminationTieSignal | null {
  if (game.status !== 'playing' || game.isGrandFinale) return null;
  const activePlayers = getActivePlayers(game);

  const finaleEnabled = game.settings.grandFinaleBestOf > 1;
  // Never eliminate below 2 while the grand finale decides the last two.
  if (finaleEnabled && activePlayers.length <= 2) return null;
  if (activePlayers.length <= 1) return null;

  // R19: tie at the bottom → showdown instead of arbitrary elimination.
  // (Imported from the barrel to keep a single tie definition.)
  const tiedIds = findEliminationTieImpl(game);
  if (tiedIds) {
    return { tie: true, tiedIds };
  }

  const sorted = [...activePlayers].sort((a, b) => a.score - b.score);
  const lowestScorer = sorted[0];

  return applyElimination(game, lowestScorer.id, false);
}

// ==================== TIE-BREAK SHOWDOWN (R19) ====================

/** Shared tie detection: ≥ 2 active players share the LOWEST score. */
function findEliminationTieImpl(game: BattleRoyaleGame): string[] | null {
  const activePlayers = getActivePlayers(game);
  if (activePlayers.length < 2) return null;
  const sorted = [...activePlayers].sort((a, b) => a.score - b.score);
  const lowest = sorted[0].score;
  const tied = sorted.filter(p => p.score === lowest);
  return tied.length >= 2 ? tied.map(p => p.id) : null;
}

/** Detect a tie at ROUND END (the round-timer path — medley rounds eliminate
 *  at round end, grand finale rounds decide a round win):
 *  • grand finale → both duelists tied on round points (sudden death)
 *  • medley / last-duel rounds → ≥ 2 players tied at the lowest score
 *  Returns null for full-song rhythm rounds (their eliminations run on the
 *  mid-round ticker, song end is just a song change) and when no elimination
 *  or round-win decision is pending at all. */
export function detectRoundEndTie(
  game: BattleRoyaleGame,
): { tiedIds: string[]; kind: 'elimination' | 'finale' } | null {
  if (game.status !== 'playing') return null;
  const lastRound = game.rounds[game.rounds.length - 1];
  if (!lastRound) return null;
  // Full-song rhythm rounds never eliminate at song end.
  if (lastRound.roundType === 'full' && !game.isGrandFinale) return null;

  const activePlayers = getActivePlayers(game);

  // Grand finale duel: round win decided by round points — a tie is sudden
  // death (extension, then coin flip for the ROUND WIN, not an elimination).
  if (game.isGrandFinale) {
    if (activePlayers.length === 2 && activePlayers[0].score === activePlayers[1].score) {
      return { tiedIds: [activePlayers[0].id, activePlayers[1].id], kind: 'finale' };
    }
    return null;
  }

  // Medley / last-duel round end: is an elimination pending at all?
  const finaleEnabled = game.settings.grandFinaleBestOf > 1;
  if (activePlayers.length < 2) return null;
  if (activePlayers.length === 2 && finaleEnabled) return null; // finale entry, no elimination

  const tiedIds = findEliminationTieImpl(game);
  return tiedIds ? { tiedIds, kind: 'elimination' as const } : null;
}

/** Resolve an EXPIRED tie-break showdown (rhythm rounds): among the tied
 *  players, the lowest round score loses; if they are STILL tied, a coin
 *  flip decides (R19 user rule). Callers fire this at the showdown
 *  deadline. `force` resolves even before the deadline (used when the song
 *  ends mid-showdown — the next round's score reset would wipe the
 *  evidence, so the tie is settled with the scores of the song where it
 *  happened). */
export function resolveTieBreakElimination(
  game: BattleRoyaleGame,
  force: boolean = false,
): { game: BattleRoyaleGame; eliminatedId: string | null; byCoinFlip: boolean } | null {
  const tieBreak = game.tieBreak;
  if (!tieBreak) return null;
  if (!force && Date.now() < tieBreak.until) return null;

  const contenders = getActivePlayers(game).filter(p => tieBreak.playerIds.includes(p.id));
  if (contenders.length === 0) {
    // Nobody left to eliminate — just clear the stale showdown state.
    return { game: { ...game, tieBreak: null }, eliminatedId: null, byCoinFlip: false };
  }
  if (contenders.length === 1) {
    // Everyone else was eliminated in the meantime — the survivor is SAFE,
    // nobody else goes out (eliminatedId = null signals "no elimination").
    return { game: { ...game, tieBreak: null }, eliminatedId: null, byCoinFlip: false };
  }

  const sorted = [...contenders].sort((a, b) => a.score - b.score);
  const lowest = sorted[0].score;
  const stillTied = sorted.filter(p => p.score === lowest);

  if (stillTied.length === 1) {
    // The extension broke the tie — the lowest scorer goes out, fairly.
    const res = applyElimination(game, stillTied[0].id, false);
    return { ...res, byCoinFlip: false };
  }

  // Still tied → coin flip (R19 user rule: "Münzwurf")
  const flipped = stillTied[Math.floor(Math.random() * stillTied.length)];
  const res = applyElimination(game, flipped.id, true);
  return { ...res, byCoinFlip: true };
}

// ==================== ROUND END ====================

/**
 * R9 (user request 2.2): close a full-song round WITHOUT eliminating anyone.
 *
 * For songSelection random/vote the elimination cadence is the configured
 * rhythm interval (mid-round eliminations) — the song ending is NOT an
 * elimination event, it just means the NEXT song starts (same settings).
 * This performs the round bookkeeping only: endTime, round score deltas and
 * the bounty resolution (same rules as endRoundAndEliminate), and sets
 * status 'elimination' so advanceToNextRound can transition.
 */
export function endRoundWithoutElimination(game: BattleRoyaleGame): BattleRoyaleGame {
  const activePlayers = getActivePlayers(game);
  if (game.rounds.length === 0) return game;

  // Score deltas for this round (R19: scores are per-round — the snapshot
  // after the reset is 0 for active players, so delta = round points;
  // eliminated players keep their frozen score → delta 0)
  const roundScoreDeltas: Record<string, number> = {};
  for (const player of game.players) {
    const prevScore = game.previousRoundScores[player.id] ?? 0;
    roundScoreDeltas[player.id] = player.score - prevScore;
  }

  // NOTE: an active tie-break showdown deliberately SURVIVES this call —
  // in rhythm rounds the song may end while the showdown runs; the next
  // song continues it (the round-handlers hook force-resolves it with the
  // scores of the song where the tie happened, before the next reset).

  const updatedRounds = [...game.rounds];
  updatedRounds[updatedRounds.length - 1] = {
    ...updatedRounds[updatedRounds.length - 1],
    endTime: Date.now(),
    roundScoreDeltas,
  };

  return updateGameStats({
    ...game,
    rounds: updatedRounds,
    status: 'elimination',
  });
}

export function endRoundAndEliminate(game: BattleRoyaleGame): BattleRoyaleGame {
  const activePlayers = getActivePlayers(game);

  if (activePlayers.length <= 1) {
    return game;
  }

  if (game.rounds.length === 0) return game;

  // R19: the round is closing — any showdown ends with it (resolved by the
  // caller or right here via the coin-flip paths below).
  const game0: BattleRoyaleGame = { ...game, tieBreak: null };

  // ── Round ends with exactly the last two players and the grand finale is
  // enabled (mid-round eliminations stop at 2): no further elimination —
  // the finale duel decides the game. Without this, the "uninterrupted song"
  // rule would let the game complete on a technicality (2→1 elimination at
  // song end) even though the user configured a best-of finale.
  if (
    activePlayers.length === 2 &&
    !game0.isGrandFinale &&
    game0.settings.grandFinaleBestOf > 1
  ) {
    return enterGrandFinale({
      ...game0,
      status: 'elimination',
    });
  }

  // Score deltas for this round (R19: per-round — delta = round points)
  const roundScoreDeltas: Record<string, number> = {};
  for (const player of game0.players) {
    const prevScore = game0.previousRoundScores[player.id] ?? 0;
    roundScoreDeltas[player.id] = player.score - prevScore;
  }

  // ---- Grand Finale logic (#4) ----
  if (game0.isGrandFinale) {
    const winsNeeded = Math.ceil(game0.settings.grandFinaleBestOf / 2);

    // Determine the round winner (highest round points). R19 user rule:
    // an exact tie is NOT decided by tiebreakers — after the showdown
    // extension ran out (or was cut short by the song ending), a COIN FLIP
    // decides the duel round.
    const sorted = [...activePlayers].sort((a, b) => {
      const deltaA = roundScoreDeltas[a.id] ?? 0;
      const deltaB = roundScoreDeltas[b.id] ?? 0;
      return deltaB - deltaA;
    });
    let roundWinner = sorted[0];
    let byCoinFlip = false;
    if (
      activePlayers.length === 2 &&
      (roundScoreDeltas[activePlayers[0].id] ?? 0) === (roundScoreDeltas[activePlayers[1].id] ?? 0)
    ) {
      roundWinner = activePlayers[Math.floor(Math.random() * activePlayers.length)];
      byCoinFlip = true;
    }

    // Update final wins
    const updatedFinalWins = { ...game0.finalWins };
    updatedFinalWins[roundWinner.id] = (updatedFinalWins[roundWinner.id] || 0) + 1;

    // Check for champion
    if (updatedFinalWins[roundWinner.id] >= winsNeeded) {
      // Update round
      const updatedRounds = [...game0.rounds];
      if (updatedRounds.length > 0) {
        updatedRounds[updatedRounds.length - 1] = {
          ...updatedRounds[updatedRounds.length - 1],
          endTime: Date.now(),
          roundScoreDeltas,
        };
      }

      // Add round highlight for the winning grand finale round
      const roundHighlight: RoundHighlight = {
        roundNumber: game0.currentRound,
        eliminatedPlayerId: '', // No elimination in grand finale
        eliminatedPlayerName: '',
        topScorerId: roundWinner.id,
        topScorerName: roundWinner.name,
        topScoreDelta: roundScoreDeltas[roundWinner.id] ?? 0,
        byCoinFlip,
      };

      // Record Hall of Fame
      const gameWithStats = updateGameStats({
        ...game0,
        rounds: updatedRounds,
        finalWins: updatedFinalWins,
        winner: roundWinner,
        status: 'completed',
        gameStats: { ...game0.gameStats, roundHighlights: [...game0.gameStats.roundHighlights, roundHighlight] },
      });
      recordHallOfFame(gameWithStats);

      return gameWithStats;
    }

    // Update round (no elimination in grand finale)
    const updatedRounds = [...game0.rounds];
    if (updatedRounds.length > 0) {
      updatedRounds[updatedRounds.length - 1] = {
        ...updatedRounds[updatedRounds.length - 1],
        endTime: Date.now(),
        roundScoreDeltas,
      };
    }

    // Add round highlight for grand finale
    const roundHighlight: RoundHighlight = {
      roundNumber: game0.currentRound,
      eliminatedPlayerId: '', // No elimination in grand finale
      eliminatedPlayerName: '',
      topScorerId: roundWinner.id,
      topScorerName: roundWinner.name,
      topScoreDelta: roundScoreDeltas[roundWinner.id] ?? 0,
      byCoinFlip,
    };

    return updateGameStats({
      ...game0,
      rounds: updatedRounds,
      finalWins: updatedFinalWins,
      status: 'elimination',
      gameStats: {
        ...game0.gameStats,
        roundHighlights: [...game0.gameStats.roundHighlights, roundHighlight],
      },
    });
  }

  // ---- Normal elimination logic ----

  // R19 user rule: the lowest round score loses. If the bottom is TIED, a
  // COIN FLIP decides among the tied players (normally the showdown
  // extension already ran; this is the final resolver at round end —
  // e.g. the medley round-timer path or a song ending mid-showdown).
  const sorted = [...activePlayers].sort((a, b) => a.score - b.score);
  const lowestScore = sorted[0].score;
  const tiedAtLowest = sorted.filter(p => p.score === lowestScore);
  const byCoinFlip = tiedAtLowest.length >= 2;
  const lowestScorer = byCoinFlip
    ? tiedAtLowest[Math.floor(Math.random() * tiedAtLowest.length)]
    : sorted[0];

  // Resolve spectator predictions (#11)
  const updatedPredictions = { ...game0.correctPredictions };
  for (const [spectatorId, predictedId] of Object.entries(game0.spectatorPredictions)) {
    if (predictedId === lowestScorer.id) {
      updatedPredictions[spectatorId] = (updatedPredictions[spectatorId] || 0) + 1;
    }
  }

  // Mark as eliminated
  const updatedPlayers = game0.players.map(p =>
    p.id === lowestScorer.id
      ? { ...p, eliminated: true, eliminationRound: game0.currentRound }
      : p
  );

  // Update round
  const updatedRounds = [...game0.rounds];
  if (updatedRounds.length > 0) {
    updatedRounds[updatedRounds.length - 1] = {
      ...updatedRounds[updatedRounds.length - 1],
      endTime: Date.now(),
      eliminatedPlayerId: lowestScorer.id,
      roundScoreDeltas,
    };
  }

  // Add round highlight (#12)
  const topScorer = [...activePlayers].sort((a, b) => b.score - a.score)[0];
  const roundHighlight: RoundHighlight = {
    roundNumber: game0.currentRound,
    eliminatedPlayerId: lowestScorer.id,
    eliminatedPlayerName: lowestScorer.name,
    topScorerId: topScorer.id,
    topScorerName: topScorer.name,
    topScoreDelta: roundScoreDeltas[topScorer.id] ?? 0,
    byCoinFlip,
  };

  // Check remaining players
  const remainingPlayers = updatedPlayers.filter(p => !p.eliminated);

  // Check if we should enter Grand Finale (#4)
  if (
    remainingPlayers.length === 2 &&
    !game0.isGrandFinale &&
    game0.settings.grandFinaleBestOf > 1
  ) {
    // Enter grand finale mode instead of completing
    const gameWithStats = updateGameStats({
      ...game0,
      players: updatedPlayers,
      rounds: updatedRounds,
      gameStats: {
        ...game0.gameStats,
        roundHighlights: [...game0.gameStats.roundHighlights, roundHighlight],
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
    ...game0,
    players: updatedPlayers,
    rounds: updatedRounds,
    status: isGameComplete ? 'completed' : 'elimination',
    winner,
    correctPredictions: updatedPredictions,
    gameStats: {
      ...game0.gameStats,
      roundHighlights: [...game0.gameStats.roundHighlights, roundHighlight],
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
    tieBreak: null, // no showdown spill-over into the finale
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
