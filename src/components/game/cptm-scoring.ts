'use client';

import { useEffect, useRef, useCallback } from 'react';
import type { Song } from '@/types/game';
import type { Difficulty } from '@/types/game';
import { findActiveNote, shouldSkipPitch, evaluateAndScoreTick } from '@/lib/game/party-scoring';
import { calculateScoringMetadata } from '@/lib/game/scoring';
import type { CptmPlayer } from './cptm-types';
import type { CompanionPitchEntry } from './cptm-companion-polling';

// ===================== CONSTANTS =====================

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
  scoringMeta: ReturnType<typeof calculateScoringMetadata> | null;
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
    scoringMeta,
    forceRender,
  } = params;

  const lastEvalTimeRef = useRef(0);

  const scoreCurrentPlayer = useCallback(() => {
    const player = playersRef.current[currentPlayerIndex];
    if (!player) return;

    const cachedPitch = companionPitchCacheRef.current.get(player.id);
    if (!cachedPitch || cachedPitch.note == null) return;

    // Build a fake pitchResult from cached data
    const pitchResult = {
      note: cachedPitch.note,
      frequency: cachedPitch.frequency ?? 0,
      clarity: cachedPitch.clarity,
      volume: cachedPitch.volume,
      isSinging: cachedPitch.isSinging,
    };

    if (shouldSkipPitch(pitchResult, difficulty)) return;

    const activeNote = findActiveNote(notesSource?.lyrics, currentTime);
    if (!activeNote) return;

    if (currentTime - lastEvalTimeRef.current < SCORING_THROTTLE_MS) return;
    lastEvalTimeRef.current = currentTime;

    const note = pitchResult.note;
    if (note == null) return;
    const tick = evaluateAndScoreTick(note, activeNote, difficulty, scoringMeta);
    const p = playersRef.current[currentPlayerIndex];
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
  }, [currentTime, notesSource, difficulty, currentPlayerIndex, scoringMeta, forceRender, playersRef, companionPitchCacheRef]);

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
