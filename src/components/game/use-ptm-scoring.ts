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

  // Track how many consecutive frames had no pitchResult (for logging)
  const noPitchLogCooldownRef = useRef(0);

  // Read currentTime from a ref inside the callback to avoid recreating
  // the RAF loop ~40 times/sec (currentTime changes every frame).
  const currentTimeRef = useRef(currentTime);
  currentTimeRef.current = currentTime;

  const scoreCurrentPlayer = useCallback(() => {
    const time = currentTimeRef.current;

    if (!pitchResult) {
      // Log at most once every ~2 seconds (250ms throttle * ~8 frames)
      noPitchLogCooldownRef.current++;
      if (noPitchLogCooldownRef.current <= 1) {
        // eslint-disable-next-line no-console
        console.warn('[PTM-Scoring] scoreCurrentPlayer() called but pitchResult is null — pitch detector may not be initialized');
      }
      return;
    }
    noPitchLogCooldownRef.current = 0;

    if (shouldSkipPitch(pitchResult, difficulty)) {
      // Log the skip reason (throttled: only once per sustained skip streak)
      if (noPitchLogCooldownRef.current <= 0) {
        // eslint-disable-next-line no-console
        console.warn('[PTM-Scoring] shouldSkipPitch=true:',
          !pitchResult.frequency || pitchResult.note === null ? 'no frequency/note' :
          pitchResult.volume < (difficulty === 'easy' ? 0.02 : difficulty === 'medium' ? 0.04 : 0.06)
            ? `volume too low (${pitchResult.volume?.toFixed(4)})` :
          pitchResult.isSinging === false ? 'isSinging=false (vocal detector rejected)' :
          'unknown');
      }
      noPitchLogCooldownRef.current = 1;
      return;
    }
    noPitchLogCooldownRef.current = 0;

    const activeNote = findActiveNote(notesSource?.lyrics, time);
    if (!activeNote) return;

    if (time - lastEvalTimeRef.current < SCORING_THROTTLE_MS) return;
    lastEvalTimeRef.current = time;

    const note = pitchResult.note;
    if (note == null) return;
    const tick = evaluateAndScoreTick(note, activeNote, difficulty, scoringMeta);
    const p = playersRef.current?.[currentPlayerIndex];
    if (!p) return;
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

    playersRef.current[idx] = { ...p };
    forceRender();
  }, [pitchResult, notesSource, difficulty, currentPlayerIndex, scoringMeta, forceRender, playersRef]);

  // Reset skip-log cooldown when scoring restarts (e.g., phase or isPlaying changes)
  useEffect(() => {
    noPitchLogCooldownRef.current = 0;
  }, [phase, isPlaying]);

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
