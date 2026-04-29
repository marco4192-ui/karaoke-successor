'use client';

import { useCallback } from 'react';
import type { Screen } from '@/types/screens';
import type { GameResult, GameState, Player } from '@/types/game';
import type { PartyStore } from '@/lib/game/party-store';
import { recordMatchResult } from '@/lib/game/tournament';
import { finishCompetitiveRound } from '@/lib/game/competitive-words-blind';

/**
 * Extracts a GameResult from the current game state if one hasn't
 * been persisted to the store yet.
 */
function buildGameResultFromState(
  players: Player[],
  currentSong: { id: string } | null,
  currentTime: number,
): GameResult | null {
  if (players.length < 2) return null;
  return {
    players: players.map(p => {
      let rating: GameResult['players'][0]['rating'];
      if (p.accuracy >= 95) rating = 'perfect';
      else if (p.accuracy >= 85) rating = 'excellent';
      else if (p.accuracy >= 70) rating = 'good';
      else if (p.accuracy >= 50) rating = 'okay';
      else rating = 'poor';
      return {
        playerId: p.id, score: p.score, accuracy: p.accuracy,
        notesHit: p.notesHit, notesMissed: p.notesMissed, maxCombo: p.maxCombo, rating,
      };
    }),
    songId: currentSong?.id || '',
    playedAt: Date.now(),
    duration: currentTime,
  };
}

/**
 * Encapsulates game flow handlers that determine what happens when a
 * game round ends (handleGameEnd) or a tournament match concludes
 * (handleTournamentGameEnd).
 *
 * These handlers are responsible for dispatching to the correct party
 * mode flow (tournament bracket update, medley score accumulation,
 * competitive round finalization, PTM/companion cleanup, etc.)
 * and navigating to the appropriate next screen.
 */
export function useGameFlowHandlers(
  party: PartyStore,
  gameState: GameState,
  actions: {
    setResults: (results: GameResult) => void;
    resetGame: () => void;
  },
  setScreen: (s: Screen) => void,
) {
  const handleTournamentGameEnd = useCallback(() => {
    if (!party.tournamentBracket || !party.currentTournamentMatch) {
      setScreen('results');
      return;
    }

    let results = gameState.results;
    if (!results || results.players.length < 2) {
      const players = gameState.players;
      if (players.length < 2) {
        setScreen('results');
        return;
      }

      const gameResult = buildGameResultFromState(players, gameState.currentSong, gameState.currentTime);
      if (!gameResult) {
        setScreen('results');
        return;
      }
      actions.setResults(gameResult);
      results = gameResult;
    }

    if (!results || results.players.length < 2) {
      setScreen('results');
      return;
    }

    const score1 = results.players[0]?.score || 0;
    const score2 = results.players[1]?.score || 0;

    const updatedBracket = recordMatchResult(
      party.tournamentBracket as Parameters<typeof recordMatchResult>[0],
      party.currentTournamentMatch.id,
      score1,
      score2,
    );

    party.setTournamentBracket(updatedBracket);
    party.setCurrentTournamentMatch(null);
    setScreen('tournament-game');
  }, [party.tournamentBracket, party.currentTournamentMatch, party.setTournamentBracket, party.setCurrentTournamentMatch, gameState.results, gameState.players, gameState.currentSong, gameState.currentTime, actions.setResults, setScreen]);

  const handleGameEnd = useCallback(() => {
    // Medley / Duel snippet end — accumulate scores and return to medley flow
    if ((gameState.gameMode === 'medley' || gameState.gameMode === 'duel') && party.medleySongs.length > 0 && party.medleySettings) {
      const results = gameState.results;
      const players = gameState.players;

      const updatedPlayers = party.medleyPlayers.map(p => {
        const gamePlayer = players?.find(gp => gp.id === p.id);
        const resultPlayer = results?.players?.find(rp => rp.playerId === p.id);
        if (!gamePlayer && !resultPlayer) return p;

        const score = resultPlayer?.score || gamePlayer?.score || 0;
        const notesHit = resultPlayer?.notesHit || gamePlayer?.notesHit || 0;
        const notesMissed = resultPlayer?.notesMissed || gamePlayer?.notesMissed || 0;
        const maxCombo = resultPlayer?.maxCombo || gamePlayer?.maxCombo || 0;

        return {
          ...p,
          score: p.score + score,
          notesHit: p.notesHit + notesHit,
          notesMissed: p.notesMissed + notesMissed,
          maxCombo: Math.max(p.maxCombo, maxCombo),
          snippetsSung: p.snippetsSung + 1,
        };
      });
      party.setMedleyPlayers(updatedPlayers);
      setScreen('medley-game');
      return;
    }

    // Competitive Missing Words / Blind match end
    if (party.competitiveGame && (gameState.gameMode === 'missing-words' || gameState.gameMode === 'blind')) {
      const results = gameState.results;
      const players = gameState.players;

      const score1 = results?.players?.[0]?.score || players?.[0]?.score || 0;
      const score2 = results?.players?.[1]?.score || players?.[1]?.score || 0;

      const updatedGame = finishCompetitiveRound(
        party.competitiveGame as Parameters<typeof finishCompetitiveRound>[0],
        score1, 0, score2, 0,
      );
      party.setCompetitiveGame(updatedGame);

      const modeScreen = gameState.gameMode === 'missing-words' ? 'missing-words-game' : 'blind-game';
      setScreen(modeScreen as Screen);
      return;
    }

    // Tournament match end
    if (party.currentTournamentMatch && party.tournamentBracket) {
      handleTournamentGameEnd();
    } else if (gameState.gameMode === 'pass-the-mic' || gameState.gameMode === 'companion-singalong') {
      if (gameState.gameMode === 'pass-the-mic') {
        party.setPassTheMicSong(null);
        party.setPassTheMicSegments([]);
      } else {
        party.setCompanionSong(null);
      }
      actions.resetGame();
      setScreen('party-setup');
    } else if (gameState.gameMode === 'rate-my-song') {
      setScreen('rate-my-song-rating');
    } else {
      setScreen('results');
    }
  }, [party, gameState, actions.resetGame, handleTournamentGameEnd, setScreen]);

  return {
    handleTournamentGameEnd,
    handleGameEnd,
  } as const;
}
