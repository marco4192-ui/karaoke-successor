'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { createDuelMatch, DuelMatch } from '@/lib/game/multiplayer';
import { useGameStore } from '@/lib/game/store';
import type { Song, Note, LyricLine } from '@/types/game';
import type { NoteProgress } from '@/lib/game/scoring';

export interface UseDuelModeOptions {
  song: Song | null;
  timingData: {
    p1Notes: Array<Note & { lineIndex: number; line: LyricLine }>;
    p2Notes: Array<Note & { lineIndex: number; line: LyricLine }>;
    p1ScoringMetadata: Map<string, { totalTicks: number; maxPoints: number }>;
    p2ScoringMetadata: Map<string, { totalTicks: number; maxPoints: number }>;
    beatDuration: number;
  } | null;
}

export interface DuelModeState {
  isDuelMode: boolean;
  isDuetMode: boolean;
  duelMatch: DuelMatch | null;
  player2Pitch: number | null;
  player2Score: number;
  p2Volume: number;
  p2Combo: number;
  p2MaxCombo: number;
  p2NotesHit: number;
  p2NotesMissed: number;
  p1ScoreEvents: Array<{ type: string; displayType: 'Perfect' | 'Great' | 'Good' | 'Okay' | 'Miss'; points: number; time: number }>;
  p2ScoreEvents: Array<{ type: string; displayType: 'Perfect' | 'Great' | 'Good' | 'Okay' | 'Miss'; points: number; time: number }>;
}

export function useDuelMode({ song, timingData }: UseDuelModeOptions): DuelModeState & {
  setPlayer2Pitch: (pitch: number | null) => void;
  setP2Volume: (volume: number) => void;
  addP1ScoreEvent: (event: { type: string; displayType: 'Perfect' | 'Great' | 'Good' | 'Okay' | 'Miss'; points: number; time: number }) => void;
  addP2ScoreEvent: (event: { type: string; displayType: 'Perfect' | 'Great' | 'Good' | 'Okay' | 'Miss'; points: number; time: number }) => void;
  updateP2Score: (points: number) => void;
  incrementP2Combo: () => void;
  resetP2Combo: () => void;
  incrementP2NotesHit: () => void;
  incrementP2NotesMissed: () => void;
  p2NoteProgressRef: React.RefObject<Map<string, NoteProgress>>;
  clearScoreEvents: () => void;
} {
  const gameState = useGameStore(state => state.gameState);

  // Check if this is a duet or duel mode
  const isDuetMode = song?.isDuet || gameState.gameMode === 'duet' || gameState.gameMode === 'duel';
  const isDuelMode = gameState.gameMode === 'duel';

  // Duel mode state
  const [duelMatch, setDuelMatch] = useState<DuelMatch | null>(null);
  const [player2Pitch, setPlayer2Pitch] = useState<number | null>(null);
  const [player2Score, setPlayer2Score] = useState(0);
  const [p2Volume, setP2Volume] = useState(0);
  const [p2Combo, setP2Combo] = useState(0);
  const [p2MaxCombo, setP2MaxCombo] = useState(0);
  const [p2NotesHit, setP2NotesHit] = useState(0);
  const [p2NotesMissed, setP2NotesMissed] = useState(0);
  const [p1ScoreEvents, setP1ScoreEvents] = useState<Array<{ type: string; displayType: 'Perfect' | 'Great' | 'Good' | 'Okay' | 'Miss'; points: number; time: number }>>([]);
  const [p2ScoreEvents, setP2ScoreEvents] = useState<Array<{ type: string; displayType: 'Perfect' | 'Great' | 'Good' | 'Okay' | 'Miss'; points: number; time: number }>>([]);

  // Note progress refs for P2
  const p2NoteProgressRef = useRef<Map<string, NoteProgress>>(new Map());

  // Initialize duel match
  const duelMatchValue = useMemo(() => {
    if (gameState.gameMode === 'duel' && song && gameState.players.length >= 2) {
      return createDuelMatch(song, gameState.players[0], gameState.players[1]);
    }
    return null;
  }, [gameState.gameMode, song, gameState.players]);

  useEffect(() => {
    setDuelMatch(duelMatchValue);
  }, [duelMatchValue]);

  // Add P1 score event
  const addP1ScoreEvent = useCallback((event: { type: string; displayType: 'Perfect' | 'Great' | 'Good' | 'Okay' | 'Miss'; points: number; time: number }) => {
    setP1ScoreEvents(prev => [...prev.slice(-20), event]);
  }, []);

  // Add P2 score event
  const addP2ScoreEvent = useCallback((event: { type: string; displayType: 'Perfect' | 'Great' | 'Good' | 'Okay' | 'Miss'; points: number; time: number }) => {
    setP2ScoreEvents(prev => [...prev.slice(-20), event]);
  }, []);

  // Update P2 score
  const updateP2Score = useCallback((points: number) => {
    setPlayer2Score(prev => prev + points);
  }, []);

  // Increment P2 combo
  const incrementP2Combo = useCallback(() => {
    setP2Combo(prev => {
      const newCombo = prev + 1;
      setP2MaxCombo(max => Math.max(max, newCombo));
      return newCombo;
    });
  }, []);

  // Reset P2 combo
  const resetP2Combo = useCallback(() => {
    setP2Combo(0);
  }, []);

  // Increment P2 notes hit
  const incrementP2NotesHit = useCallback(() => {
    setP2NotesHit(prev => prev + 1);
  }, []);

  // Increment P2 notes missed
  const incrementP2NotesMissed = useCallback(() => {
    setP2NotesMissed(prev => prev + 1);
  }, []);

  // Clear all score events
  const clearScoreEvents = useCallback(() => {
    setP1ScoreEvents([]);
    setP2ScoreEvents([]);
    setPlayer2Score(0);
    setP2Combo(0);
    setP2MaxCombo(0);
    setP2NotesHit(0);
    setP2NotesMissed(0);
  }, []);

  return {
    isDuelMode,
    isDuetMode,
    duelMatch,
    player2Pitch,
    player2Score,
    p2Volume,
    p2Combo,
    p2MaxCombo,
    p2NotesHit,
    p2NotesMissed,
    p1ScoreEvents,
    p2ScoreEvents,
    setPlayer2Pitch,
    setP2Volume,
    addP1ScoreEvent,
    addP2ScoreEvent,
    updateP2Score,
    incrementP2Combo,
    resetP2Combo,
    incrementP2NotesHit,
    incrementP2NotesMissed,
    p2NoteProgressRef,
    clearScoreEvents,
  };
}
