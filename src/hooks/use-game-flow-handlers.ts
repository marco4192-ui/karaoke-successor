'use client';

import { useCallback } from 'react';
import type { Screen } from '@/types/screens';
import type { GameResult, GameState, Player } from '@/types/game';
import type { PartyStore } from '@/lib/game/party-store';
import { recordMatchResult } from '@/lib/game/tournament';
import { finishCompetitiveRound, calculateMissingWordsBonus, calculateBlindBonus } from '@/lib/game/competitive-words-blind';

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
      // Calculate accuracy from notesHit/notesMissed instead of reading p.accuracy
      // which is never updated during gameplay (always 0), causing tournament
      // ratings to always be 'poor'.
      const totalNotes = p.notesHit + p.notesMissed;
      const accuracy = totalNotes > 0 ? (p.notesHit / totalNotes) * 100 : 0;
      let rating: GameResult['players'][0]['rating'];
      if (accuracy >= 95) rating = 'perfect';
      else if (accuracy >= 85) rating = 'excellent';
      else if (accuracy >= 70) rating = 'good';
      else if (accuracy >= 50) rating = 'okay';
      else rating = 'poor';
      // Estimate perfect notes from accuracy-based rating — the Player interface
      // does not carry per-note quality, so we apply the same ratio used by
      // results-screen.tsx to stay consistent.
      const perfectNotes = totalNotes > 0 ? Math.floor(p.notesHit * (
        rating === 'perfect' ? 0.85
        : rating === 'excellent' ? 0.55
        : rating === 'good' ? 0.25
        : rating === 'okay' ? 0.08
        : 0.02
      )) : 0;
      return {
        playerId: p.id, score: p.score, accuracy: Math.round(accuracy * 10) / 10,
        notesHit: p.notesHit, notesMissed: p.notesMissed, maxCombo: p.maxCombo,
        perfectNotesCount: perfectNotes, rating,
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
      const p1NotesHit = results?.players?.[0]?.notesHit || players?.[0]?.notesHit || 0;
      const p2NotesHit = results?.players?.[1]?.notesHit || players?.[1]?.notesHit || 0;

      // Estimate bonus points based on game mode and player accuracy:
      // - Missing Words: ~25% of words hidden, accuracy on hidden words ≈ overall accuracy
      //   Estimate: 25% of hit notes are on hidden words → bonus = hitNotes * 0.25 * 50
      // - Blind: ~40% of time in blind sections, accuracy during blind ≈ overall accuracy
      //   Estimate: 40% of hit notes are during blind → bonus = hitNotes * 0.40 * 30
      let bonus1 = 0;
      let bonus2 = 0;
      if (gameState.gameMode === 'missing-words') {
        bonus1 = calculateMissingWordsBonus(Math.round(p1NotesHit * 0.25));
        bonus2 = calculateMissingWordsBonus(Math.round(p2NotesHit * 0.25));
      } else if (gameState.gameMode === 'blind') {
        bonus1 = calculateBlindBonus(Math.round(p1NotesHit * 0.40));
        bonus2 = calculateBlindBonus(Math.round(p2NotesHit * 0.40));
      }

      const updatedGame = finishCompetitiveRound(
        party.competitiveGame as Parameters<typeof finishCompetitiveRound>[0],
        score1, bonus1, score2, bonus2,
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
