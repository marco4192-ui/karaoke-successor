/**
 * Sub-hook: scoring RAF loop for Pass-the-Mic mode.
 * Evaluates pitch accuracy on each animation frame and updates player scores.
 */
'use client';

import { useEffect, useRef, useCallback } from 'react';
import { Song, PitchDetectionResult, Difficulty } from '@/types/game';
import type { PtmPlayer } from './ptm-types';
import { findActiveNote, shouldSkipPitch, evaluateAndScoreTick } from '@/lib/game/party-scoring';

/** Minimum interval (ms) between scoring evaluations to avoid excessive recalculation */
export const SCORING_THROTTLE_MS = 250;

interface UsePtmScoringOptions {
  phase: string;
  isPlaying: boolean;
  pitchResult: PitchDetectionResult | null;
  notesSource: Song | null;
  currentTime: number;
  difficulty: Difficulty;
  currentPlayerIndex: number;
  scoringMeta: ReturnType<typeof import('@/lib/game/scoring').calculateScoringMetadata> | null;
  playersRef: React.RefObject<PtmPlayer[]>;
  forceRender: () => void;
}

export function usePtmScoring({
  phase,
  isPlaying,
  pitchResult,
  notesSource,
  currentTime,
  difficulty,
  currentPlayerIndex,
  scoringMeta,
  playersRef,
  forceRender,
}: UsePtmScoringOptions): void {
  const lastEvalTimeRef = useRef(0);

  const scoreCurrentPlayer = useCallback(() => {
    if (!pitchResult) return;
    if (shouldSkipPitch(pitchResult, difficulty)) return;

    const activeNote = findActiveNote(notesSource?.lyrics, currentTime);
    if (!activeNote) return;

    if (currentTime - lastEvalTimeRef.current < SCORING_THROTTLE_MS) return;
    lastEvalTimeRef.current = currentTime;

    const note = pitchResult.note;
    if (note == null) return;
    const tick = evaluateAndScoreTick(note, activeNote, difficulty, scoringMeta);
    const p = playersRef.current![currentPlayerIndex];
    const idx = currentPlayerIndex;

    if (tick.hit) {
      p.score += tick.points;
      p.notesHit++;
      p.combo++;
      if (p.combo > p.maxCombo) p.maxCombo = p.combo;
    } else {
      p.combo = 0;
      p.notesMissed++;
    }

    playersRef.current![idx] = { ...p };
    forceRender();
  }, [currentTime, pitchResult, notesSource, difficulty, currentPlayerIndex, scoringMeta, forceRender]);

  // ── Game loop: score during playing ──
  useEffect(() => {
    if (phase !== 'playing' || !isPlaying) return;
    let rafId: number;
    const loop = () => {
      scoreCurrentPlayer();
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [phase, isPlaying, scoreCurrentPlayer]);
}
