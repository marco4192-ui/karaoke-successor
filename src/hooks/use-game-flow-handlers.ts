'use client';

import { useCallback } from 'react';
import type { Screen } from '@/types/screens';
import type { GameResult, GameState, Player } from '@/types/game';
import type { PartyStore } from '@/lib/game/party-store';
import { accuracyToRating } from '@/lib/game/rating-utils';
import { recordMatchResult } from '@/lib/game/tournament';
import { finishCompetitiveRound, calculateMissingWordsBonusLegacy, calculateBlindBonusLegacy } from '@/lib/game/competitive-words-blind';
import { estimatePerfectNotes } from '@/lib/game/scoring';

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
      const rating = accuracyToRating(accuracy);
      // Estimate perfect notes from accuracy-based rating — the Player interface
      // does not carry per-note quality, so we use the shared heuristic.
      const perfectNotes = estimatePerfectNotes(p.notesHit, rating);
      return {
        playerId: p.id, score: p.score, accuracy: Math.round(accuracy * 10) / 10,
        notesHit: p.notesHit, notesMissed: p.notesMissed, maxCombo: p.maxCombo,
        perfectNotesCount: perfectNotes,
        goldenNotesCount: p.goldenNotesHit || 0,
        rating,
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
    setResults: (_results: GameResult) => void;
    resetGame: () => void;
  },
  setScreen: (_s: Screen) => void,
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

    // #3 Pass extended stats for tiebreak resolution
    const accuracy1 = results.players[0]?.accuracy ?? 0;
    const accuracy2 = results.players[1]?.accuracy ?? 0;
    const maxCombo1 = results.players[0]?.maxCombo ?? 0;
    const maxCombo2 = results.players[1]?.maxCombo ?? 0;

    const updatedBracket = recordMatchResult(
      party.tournamentBracket as Parameters<typeof recordMatchResult>[0],
      party.currentTournamentMatch.id,
      score1,
      score2,
      { accuracy1, accuracy2, maxCombo1, maxCombo2 },
    );

    party.setTournamentBracket(updatedBracket);
    party.setCurrentTournamentMatch(null);

    // #10 Poll crowd votes from companion spectators and store in party store
    (async () => {
      try {
        const res = await fetch('/api/mobile?action=get_crowd_votes');
        if (res.ok) {
          const data = await res.json();
          const allVotes: Array<{ matchId: string; playerSide: 1 | 2 }> = data.votes || [];
          const matchVotes = allVotes.filter((v: { matchId: string }) => v.matchId === party.currentTournamentMatch?.id);
          if (matchVotes.length > 0) {
            const p1Votes = matchVotes.filter((v: { playerSide: number }) => v.playerSide === 1).length;
            const p2Votes = matchVotes.filter((v: { playerSide: number }) => v.playerSide === 2).length;
            party.addTournamentCrowdVote({
              matchId: party.currentTournamentMatch!.id,
              player1Votes: p1Votes,
              player2Votes: p2Votes,
              totalVoters: matchVotes.length,
            });
          }
        }
      } catch {
        // Silently fail — crowd votes are optional
      }
    })();

    setScreen('tournament-game');
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

        const score = resultPlayer?.score ?? gamePlayer?.score ?? 0;
        const notesHit = resultPlayer?.notesHit ?? gamePlayer?.notesHit ?? 0;
        const notesMissed = resultPlayer?.notesMissed ?? gamePlayer?.notesMissed ?? 0;
        const maxCombo = resultPlayer?.maxCombo ?? gamePlayer?.maxCombo ?? 0;

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
        bonus1 = calculateMissingWordsBonusLegacy(Math.round(p1NotesHit * 0.25));
        bonus2 = calculateMissingWordsBonusLegacy(Math.round(p2NotesHit * 0.25));
      } else if (gameState.gameMode === 'blind') {
        bonus1 = calculateBlindBonusLegacy(Math.round(p1NotesHit * 0.40));
        bonus2 = calculateBlindBonusLegacy(Math.round(p2NotesHit * 0.40));
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
  }, [party, gameState, actions, handleTournamentGameEnd, setScreen]);

  return {
    handleTournamentGameEnd,
    handleGameEnd,
  } as const;
}
