'use client';

import { useCallback, useRef, useEffect } from 'react';
import type { Song, GameMode, GameResult } from '@/types/game';
import { generateGameResults } from '@/lib/game/game-results-generator';

// ── Types ──

export interface PlayerScoreSnapshot {
  id: string;
  score: number;
  notesHit: number;
  notesMissed: number;
  combo: number;
  maxCombo: number;
  goldenNotesHit?: number;
}

export interface P2ScoringSnapshot {
  score: number;
  notesHit: number;
  notesMissed: number;
  maxCombo: number;
  perfectNotesCount?: number;
  goldenNotesHit?: number;
}

export interface UseGameResultsOptions {
  song: Song | null;
  gameMode: GameMode;
  isDuetMode: boolean;
  playbackRate?: number;
  players: PlayerScoreSnapshot[];
  p2ScoringState?: P2ScoringSnapshot | null;
  p1PerfectNotesCount?: number;
  setResults: (_results: GameResult) => void;
  comebackRef: React.MutableRefObject<boolean>;
}

// ── Hook ──

/**
 * Encapsulates game result generation at song end.
 *
 * Uses refs for `players` and `p1PerfectNotesCount` so the callback
 * always reads the latest scoring snapshot — avoids stale closure
 * values when `endGameAndCleanup` fires between scoring ticks.
 */
export function useGameResults(options: UseGameResultsOptions) {
  const {
    song,
    gameMode,
    isDuetMode,
    playbackRate = 1.0,
    players,
    p2ScoringState,
    p1PerfectNotesCount = 0,
    setResults,
    comebackRef,
  } = options;

  // Refs for frequently-changing values (players update ~10 Hz from scoring)
  const playersRef = useRef(players);
  const p1PerfectNotesCountRef = useRef(p1PerfectNotesCount);

  useEffect(() => {
    playersRef.current = players;
    p1PerfectNotesCountRef.current = p1PerfectNotesCount;
  }, [players, p1PerfectNotesCount]);

  const generateResults = useCallback(() => {
    const results = generateGameResults({
      song,
      gameMode,
      isDuetMode,
      playbackRate,
      players: playersRef.current,
      p2ScoringState: p2ScoringState || null,
      p1PerfectNotesCount: p1PerfectNotesCountRef.current || 0,
      hadComeback: comebackRef.current ?? false,
    });

    if (!results) return;

    setResults(results);

    // Send results to mobile clients for social features
    const activePlayer = playersRef.current[0];
    const p1Accuracy = results.players[0]?.accuracy ?? 0;
    fetch('/api/mobile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'results',
        payload: {
          songId: song?.id,
          songTitle: song?.title,
          songArtist: song?.artist,
          score: activePlayer?.score,
          accuracy: p1Accuracy,
          maxCombo: activePlayer?.maxCombo,
          rating: results.players[0]?.rating,
          playedAt: results.playedAt,
        },
      }),
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps -- players read via ref; gameMode changes should not restart the init effect (handled separately)
  }, [song, setResults, isDuetMode, p2ScoringState, gameMode, playbackRate, comebackRef]);

  return { generateResults, playersRef, p1PerfectNotesCountRef };
}
