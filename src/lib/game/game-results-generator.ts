import type { Song, GameResult, GameMode } from '@/types/game';
import { accuracyToRating } from '@/lib/game/rating-utils';

interface GenerateResultsParams {
  song: Song | null;
  gameMode: GameMode;
  isDuetMode: boolean;
  playbackRate: number;
  players: Array<{
    id: string;
    score: number;
    notesHit: number;
    notesMissed: number;
    combo: number;
    maxCombo: number;
    goldenNotesHit?: number;
  }>;
  p2ScoringState?: {
    score: number;
    notesHit: number;
    notesMissed: number;
    maxCombo: number;
    perfectNotesCount?: number;
    goldenNotesHit?: number;
  } | null;
  p1PerfectNotesCount: number;
  hadComeback: boolean;
}

/**
 * Generate game results from current player state.
 * Pure function — no side effects, no React dependencies.
 * Extracted from useGameLoop to reduce complexity and improve testability.
 */
export function generateGameResults(params: GenerateResultsParams): GameResult | null {
  const {
    song,
    gameMode,
    isDuetMode,
    playbackRate,
    players,
    p2ScoringState,
    p1PerfectNotesCount,
    hadComeback,
  } = params;

  const activePlayer = players[0];
  if (!activePlayer || !song) return null;

  // Count total notes for each player.
  // In duet mode with P1/P2 assignment, each player only sings their assigned
  // notes, so accuracy should be calculated against their own subset.
  // In duel mode (no assignment), both players sing all notes.
  const totalNotes = song.lyrics.reduce((acc, line) => acc + line.notes.length, 0);
  const p1AssignedNotes = song.lyrics.reduce((acc, line) =>
    acc + line.notes.filter(n => n.player === 'P1' || n.player === undefined || n.player === null).length, 0);
  const hasDuetAssignment = song.lyrics.reduce((acc, line) =>
    acc + line.notes.filter(n => n.player === 'P2').length, 0) > 0;
  const p1TotalNotes = hasDuetAssignment ? p1AssignedNotes : totalNotes;
  const p1Accuracy = p1TotalNotes > 0 ? (activePlayer.notesHit / p1TotalNotes) * 100 : 0;

  // Estimate tick-based accuracy for transparency.
  // Note accuracy counts a note as "hit" with just 1 tick, but scoring is tick-based.
  // We estimate: tickAccuracy ≈ noteAccuracy * avgTickHitRatioPerHitNote.
  // A typical "hit" note has ~50-65% of its ticks actually hit.
  // This gives players a more honest picture of their actual pitch coverage.
  const estimatedTickAccuracy = p1Accuracy > 0
    ? Math.round(p1Accuracy * 0.58 * 10) / 10
    : 0;

  const playerResults = [{
    playerId: activePlayer.id,
    score: activePlayer.score,
    notesHit: activePlayer.notesHit,
    notesMissed: activePlayer.notesMissed,
    accuracy: p1Accuracy,
    tickAccuracy: estimatedTickAccuracy,
    maxCombo: activePlayer.maxCombo,
    perfectNotesCount: p1PerfectNotesCount || 0,
    goldenNotesCount: activePlayer.goldenNotesHit || 0,
    rating: accuracyToRating(p1Accuracy),
  }];

  // Add P2 results for duel/duet mode if P2 scoring data is available
  const p2 = p2ScoringState || null;
  const p2Player = players[1] || null;
  if ((isDuetMode || gameMode === 'duel') && p2 && (p2.notesHit > 0 || p2.notesMissed > 0)) {
    // For P2, count only notes assigned to P2 in duet mode.
    // In duel mode (no player assignment), P2 sings the same notes as P1.
    const p2AssignedNotes = song.lyrics.reduce((acc, line) =>
      acc + line.notes.filter(n => n.player === 'P2').length, 0);
    const p2TotalNotes = hasDuetAssignment ? p2AssignedNotes : totalNotes;
    const p2Accuracy = p2TotalNotes > 0 ? (p2.notesHit / p2TotalNotes) * 100 : 0;
    const p2TickAccuracy = p2Accuracy > 0
      ? Math.round(p2Accuracy * 0.58 * 10) / 10
      : 0;
    playerResults.push({
      playerId: p2Player?.id || 'p2',
      score: p2.score,
      notesHit: p2.notesHit,
      notesMissed: p2.notesMissed,
      accuracy: p2Accuracy,
      tickAccuracy: p2TickAccuracy,
      maxCombo: p2.maxCombo,
      perfectNotesCount: p2.perfectNotesCount || 0,
      goldenNotesCount: p2.goldenNotesHit || 0,
      rating: accuracyToRating(p2Accuracy),
    });
  }

  return {
    songId: song.id,
    players: playerResults,
    playedAt: Date.now(),
    duration: song.duration,
    isBlindMode: gameMode === 'blind',
    playbackRate,
    hadComeback,
  };
}
