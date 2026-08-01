/**
 * Core scoring pass — pure function that iterates notes, evaluates ticks,
 * applies challenge modifiers, tracks combo, and computes deltas.
 *
 * Used by both P1 (checkNoteHits) and P2+ (checkPlayerNoteHits).
 * This module has no React dependency; all state is passed in via params.
 */

import { Difficulty, Note, LyricLine } from '@/types/game';
import {
  evaluateTick,
  calculateTickPoints,
  NoteProgress,
  ScoringMetadata,
} from '@/lib/game/scoring';
import type { ScoreEvent, ScoringPassResult } from '@/lib/game/scoring-types';

// ---------------------------------------------------------------------------
// Blind state passed from the hook layer
// ---------------------------------------------------------------------------

/** Mutable blind karaoke tracking state (persists across scoring passes). */
export interface BlindScoringState {
  /** Whether the current passage is a blind section. */
  isBlindSection: boolean;
  /** Running count of consecutive blind notes hit (reset on miss). */
  blindStreakRef: { current: number };
  /** Whether the previous blind note was missed (for comeback bonus). */
  blindLastWasMissRef: { current: boolean };
}

// ---------------------------------------------------------------------------
// Shared scoring pass
// ---------------------------------------------------------------------------

export function runScoringPass(
  currentTime: number,
  detectedNote: number,
  notesToCheck: Array<Note & { lineIndex: number; line: LyricLine }>,
  scoringMeta: ScoringMetadata,
  beatDurationMs: number,
  difficulty: Difficulty,
  noteProgressMap: Map<string, NoteProgress>,
  searchStartRef: { current: number },
  noteIdPrefix: string,
  hasPerfectOnly: boolean,
  hasGoldenOnly: boolean,
  comboRef: { current: number },
  maxComboRef: { current: number },
  blindState?: BlindScoringState,
): ScoringPassResult {
  // Batch accumulator
  let scoreDelta = 0;
  let comboUpdate: number | undefined;
  let maxComboUpdate: number | undefined;
  let notesHitDelta = 0;
  let notesMissedDelta = 0;
  let perfectNotesDelta = 0;
  let goldenNotesDelta = 0;
  let hasUpdates = false;
  const pendingEvents: ScoreEvent[] = [];
  let blindBonusDelta = 0;

  // P1 visual tracking — filled during tick evaluation inside the loop
  let activeNoteId: string | undefined;
  let activeNoteIsGolden = false;
  let lastTickAccuracy = 0;
  let lastTickHit = false;

  // Clamp index to array bounds — notesToCheck may shrink if timingData changes
  if (searchStartRef.current >= notesToCheck.length) {
    searchStartRef.current = 0;
  } else if (searchStartRef.current > 0 &&
      notesToCheck[searchStartRef.current].startTime > currentTime) {
    searchStartRef.current = 0;
  }

  for (let ni = searchStartRef.current; ni < notesToCheck.length; ni++) {
    const note = notesToCheck[ni];
    const noteEnd = note.startTime + note.duration;
    const noteId = note.id || `${noteIdPrefix}-${note.startTime}`;

    // Check if we're in the note's time window
    if (currentTime >= note.startTime && currentTime <= noteEnd) {
      searchStartRef.current = ni;
      let noteProgress = noteProgressMap.get(noteId);

      if (!noteProgress) {
        const totalTicks = Math.max(1, Math.round(note.duration / beatDurationMs));
        noteProgress = {
          noteId,
          totalTicks,
          ticksHit: 0,
          ticksEvaluated: 0,
          isGolden: note.isGolden,
          isBlindNote: blindState?.isBlindSection ?? false,
          // DO-NOT-CHANGE: Subtract one tick interval so the first tick is
          // evaluated immediately on the next frame.  Without this, notes
          // shorter than beatDuration never get a tick evaluated (the
          // interval never elapses before the note ends), causing them to
          // always be counted as missed — a major source of artificially
          // low scores on songs with short / rhythmic notes.
          lastEvaluatedTime: currentTime - beatDurationMs,
          isComplete: false,
          wasPerfect: false,
          accumulatedPoints: 0,
        };
        noteProgressMap.set(noteId, noteProgress);
      }

      const timeSinceLastEval = currentTime - noteProgress.lastEvaluatedTime;
      const tickInterval = beatDurationMs;

      if (timeSinceLastEval >= tickInterval) {
        const tickResult = evaluateTick(detectedNote, note.pitch, difficulty);

        noteProgress.ticksEvaluated++;
        noteProgress.lastEvaluatedTime = currentTime;

        // Record active note info for P1 performance sample recording
        activeNoteId = noteId;
        activeNoteIsGolden = note.isGolden;
        lastTickAccuracy = tickResult.accuracy;
        lastTickHit = tickResult.isHit;

        if (tickResult.isHit) {
          noteProgress.ticksHit++;

          let tickPoints = calculateTickPoints(tickResult.accuracy, note.isGolden, scoringMeta.pointsPerTick);

          // Challenge modifier: perfect_only — only "Perfect" hits score
          if (hasPerfectOnly && tickResult.displayType !== 'Perfect') {
            tickPoints = 0;
          }
          // Challenge modifier: golden_only — only golden notes score
          if (hasGoldenOnly && !note.isGolden) {
            tickPoints = 0;
          }

          if (tickPoints > 0) {
            const newCombo = comboRef.current + 1;

            scoreDelta += tickPoints;
            noteProgress.accumulatedPoints += tickPoints;
            comboUpdate = newCombo;
            maxComboUpdate = Math.max(maxComboRef.current, newCombo);
            comboRef.current = newCombo;
            maxComboRef.current = maxComboUpdate;
            hasUpdates = true;
          }
        } else {
          comboUpdate = 0;
          comboRef.current = 0;
          hasUpdates = true;
        }
      }

      break;
    }

    // Check if we just passed a note — emit ONE aggregated score event
    if (currentTime > noteEnd) {
      const progress = noteProgressMap.get(noteId);

      if (progress && !progress.isComplete) {
        progress.isComplete = true;

        if (progress.ticksHit > 0) {
          notesHitDelta++;
        } else {
          notesMissedDelta++;
        }
        hasUpdates = true;

        if (progress.ticksHit >= progress.totalTicks) {
          progress.wasPerfect = true;
          perfectNotesDelta++;
        }
        // Track golden notes hit (note was golden and at least one tick hit)
        if (progress.isGolden && progress.ticksHit > 0) {
          goldenNotesDelta++;
        }



        // Determine aggregated displayType based on hit ratio across all ticks
        const hitRatio = progress.ticksEvaluated > 0
          ? progress.ticksHit / progress.ticksEvaluated
          : 0;
        let aggregatedDisplayType: ScoreEvent['displayType'];
        if (hitRatio >= 1) {
          aggregatedDisplayType = 'Perfect';
        } else if (hitRatio >= 0.8) {
          aggregatedDisplayType = 'Great';
        } else if (hitRatio >= 0.5) {
          aggregatedDisplayType = 'Good';
        } else if (hitRatio > 0) {
          aggregatedDisplayType = 'Okay';
        } else {
          aggregatedDisplayType = 'Miss';
        }

        pendingEvents.push({
          displayType: aggregatedDisplayType,
          points: progress.accumulatedPoints,
          time: noteEnd,
        });
      }
    }
  }

  return {
    scoreDelta,
    comboUpdate,
    maxComboUpdate,
    notesHitDelta,
    notesMissedDelta,
    perfectNotesDelta,
    goldenNotesDelta,
    hasUpdates,
    pendingEvents,
    blindBonusDelta,
    activeNoteId,
    activeNoteIsGolden,
    lastTickAccuracy,
    lastTickHit,
  };
}
