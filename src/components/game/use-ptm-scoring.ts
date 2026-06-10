/**
 * Sub-hook: scoring RAF loop for Pass-the-Mic mode.
 * Uses a per-segment fixed pool (PTM_MAX_SEGMENT_POINTS) so every segment
 * is worth the same maximum regardless of note count or golden notes.
 * Gold notes are displayed visually but carry no scoring bonus.
 * The accuracy^0.6 power curve is kept for a forgiving feel.
 */
'use client';

import { useEffect, useRef, useCallback } from 'react';
import { Song, PitchDetectionResult, Difficulty } from '@/types/game';
import type { PtmPlayer } from './ptm-types';
import { findActiveNote, shouldSkipPitch, evaluateAndScoreTick } from '@/lib/game/party-scoring';
import { evaluateTick, scaleAccuracy } from '@/lib/game/scoring';

/** Maximum points per segment — every segment is normalized to this value. */
const PTM_MAX_SEGMENT_POINTS = 2000;

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
  /** Points per tick for the current segment (PTM_MAX_SEGMENT_POINTS / segmentTotalTicks). 0 means use fallback. */
  segmentPointsPerTick: number;
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
  segmentPointsPerTick,
  playersRef,
  forceRender,
}: UsePtmScoringOptions): void {
  const lastEvalTimeRef = useRef(0);

  // Separate throttle counters for different log messages.
  const noPitchLogCooldownRef = useRef(0);
  const skipPitchLogCooldownRef = useRef(0);

  const currentTimeRef = useRef(currentTime);
  currentTimeRef.current = currentTime;

  const scoreCurrentPlayer = useCallback(() => {
    const time = currentTimeRef.current;

    if (!pitchResult) {
      noPitchLogCooldownRef.current++;
      if (noPitchLogCooldownRef.current <= 1) {
        // eslint-disable-next-line no-console
        console.warn('[PTM-Scoring] scoreCurrentPlayer() called but pitchResult is null — pitch detector may not be initialized');
      }
      return;
    }
    noPitchLogCooldownRef.current = 0;

    if (shouldSkipPitch(pitchResult, difficulty)) {
      if (skipPitchLogCooldownRef.current <= 0) {
        // eslint-disable-next-line no-console
        console.warn('[PTM-Scoring] shouldSkipPitch=true:',
          !pitchResult.frequency || pitchResult.note === null ? 'no frequency/note' :
          pitchResult.volume < (difficulty === 'easy' ? 0.02 : difficulty === 'medium' ? 0.04 : 0.06)
            ? `volume too low (${pitchResult.volume?.toFixed(4)})` :
          pitchResult.isSinging === false ? 'isSinging=false (vocal detector rejected)' :
          'unknown');
      }
      skipPitchLogCooldownRef.current = 1;
      return;
    }
    skipPitchLogCooldownRef.current = 0;

    const activeNote = findActiveNote(notesSource?.lyrics, time);
    if (!activeNote) return;

    if (time - lastEvalTimeRef.current < SCORING_THROTTLE_MS) return;
    lastEvalTimeRef.current = time;

    const note = pitchResult.note;
    if (note == null) return;

    const p = playersRef.current?.[currentPlayerIndex];
    if (!p) return;
    const idx = currentPlayerIndex;

    let hit: boolean;
    let points: number;

    if (segmentPointsPerTick > 0) {
      // PTM per-segment scoring: fixed pool, no gold bonus, accuracy curve
      const result = evaluateTick(note, activeNote.pitch, difficulty);
      hit = result.isHit;
      if (hit) {
        const scaledAccuracy = scaleAccuracy(result.accuracy);
        const tickPts = segmentPointsPerTick * scaledAccuracy;
        points = Math.max(1, Math.round(tickPts));
      } else {
        points = 0;
      }
    } else {
      // Fallback: use legacy party scoring (no segment data available)
      const tick = evaluateAndScoreTick(note, activeNote, difficulty, null);
      hit = tick.hit;
      points = tick.points;
    }

    if (hit) {
      p.score += points;
      p.notesHit++;
      p.combo++;
      if (p.combo > p.maxCombo) p.maxCombo = p.combo;
    } else {
      p.combo = 0;
      p.notesMissed++;
    }

    playersRef.current[idx] = { ...p };
    forceRender();
  }, [pitchResult, notesSource, difficulty, currentPlayerIndex, segmentPointsPerTick, forceRender, playersRef]);

  // Reset log cooldowns when scoring restarts
  useEffect(() => {
    noPitchLogCooldownRef.current = 0;
    skipPitchLogCooldownRef.current = 0;
  }, [phase, isPlaying]);

  // Game loop: score during playing
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