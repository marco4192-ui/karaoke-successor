/**
 * Sub-hook: scoring RAF loop for Companion Pass-the-Mic mode.
 * Uses a per-segment fixed pool (PTM_MAX_SEGMENT_POINTS = 2000) so every
 * segment is worth the same maximum regardless of note count or golden notes.
 * Gold notes are displayed visually but carry no scoring bonus.
 * The accuracy^0.6 power curve is kept for a forgiving feel.
 */
'use client';

import { useEffect, useRef, useCallback } from 'react';
import type { Song } from '@/types/game';
import type { Difficulty } from '@/types/game';
import { findActiveNote, shouldSkipPitch, evaluateAndScoreTick } from '@/lib/game/party-scoring';
import { evaluateTick, scaleAccuracy } from '@/lib/game/scoring';
import type { CptmPlayer } from './cptm-types';
import type { CompanionPitchEntry } from './cptm-companion-polling';

// ===================== CONSTANTS =====================

/** Maximum points per segment — every segment is normalized to this value. */
const PTM_MAX_SEGMENT_POINTS = 2000;

/** Minimum interval (ms) between scoring evaluations to avoid excessive recalculation */
const SCORING_THROTTLE_MS = 250;

// ===================== HOOK PARAMS =====================

export interface CptmScoringParams {
  phase: string;
  isPlaying: boolean;
  playersRef: React.MutableRefObject<CptmPlayer[]>;
  currentPlayerIndex: number;
  companionPitchCacheRef: React.MutableRefObject<Map<string, CompanionPitchEntry>>;
  notesSource: Song | null;
  currentTime: number;
  difficulty: Difficulty;
  /** Points per tick for the current segment (PTM_MAX_SEGMENT_POINTS / segmentTotalTicks). 0 means use fallback. */
  segmentPointsPerTick: number;
  forceRender: () => void;
}

// ===================== HOOK =====================

/**
 * Runs a scoring RAF loop that evaluates the current player's pitch
 * (from the companion pitch cache) against active notes.
 * Pure side-effect hook — no return value.
 */
export function useCptmScoring(params: CptmScoringParams): void {
  const {
    phase,
    isPlaying,
    playersRef,
    currentPlayerIndex,
    companionPitchCacheRef,
    notesSource,
    currentTime,
    difficulty,
    segmentPointsPerTick,
    forceRender,
  } = params;

  const lastEvalTimeRef = useRef(0);

  const currentTimeRef = useRef(currentTime);
  currentTimeRef.current = currentTime;

  const scoreCurrentPlayer = useCallback(() => {
    const time = currentTimeRef.current;

    const player = playersRef.current[currentPlayerIndex];
    if (!player) return;

    const cachedPitch = companionPitchCacheRef.current.get(player.id);
    if (!cachedPitch || cachedPitch.note == null) return;

    // Build a fake pitchResult from cached data.
    // IMPORTANT: Use null (not 0) as the frequency fallback so that
    // shouldSkipPitch can distinguish "no frequency data" from a valid
    // but unexpectedly-zero frequency. Using 0 would make !frequency
    // truthy and incorrectly skip scoring even when note is present.
    const pitchResult = {
      note: cachedPitch.note,
      rawNote: cachedPitch.note,
      frequency: cachedPitch.frequency ?? null,
      clarity: cachedPitch.clarity,
      volume: cachedPitch.volume,
      isSinging: cachedPitch.isSinging,
    };

    if (shouldSkipPitch(pitchResult, difficulty)) return;

    const activeNote = findActiveNote(notesSource?.lyrics, time);
    if (!activeNote) return;

    if (time - lastEvalTimeRef.current < SCORING_THROTTLE_MS) return;
    lastEvalTimeRef.current = time;

    const note = pitchResult.note;
    if (note == null) return;

    const p = playersRef.current[currentPlayerIndex];
    const idx = currentPlayerIndex;

    let hit: boolean;
    let points: number;

    if (segmentPointsPerTick > 0) {
      // CPTM per-segment scoring: fixed pool, no gold bonus, accuracy curve
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
  }, [notesSource, difficulty, currentPlayerIndex, segmentPointsPerTick, forceRender, playersRef, companionPitchCacheRef]);

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