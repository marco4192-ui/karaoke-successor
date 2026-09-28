/**
 * Medley Contest — Round lifecycle actions (R7 extraction).
 *
 * Start / next-round / round-complete / end-early handlers plus the
 * unmount cleanup for pitch detection and the fallback timer.  All state
 * stays owned by the orchestrator / sibling sub-hooks and is passed in
 * explicitly; callback dependency arrays are unchanged.
 */

import { useState, useCallback, useEffect } from 'react';
import { createMedleyTickScoringState, type MedleyTickScoringState } from '@/lib/game/party-scoring';
import type { ScoringMetadata } from '@/lib/game/scoring';
import type { UseMultiPitchDetectorReturn } from '@/hooks/use-multi-pitch-detector';
import type {
  MedleyPlayer, MedleySong, MedleySettings, MedleyRoundResult, MedleyScoringEvent,
} from '../medley-types';
import type { MedleyNotePerfSample } from './medley-hook-types';
import type { UseMedleyAudioReturn } from './use-medley-audio';
import type { UseMedleyFeaturesReturn } from './use-medley-features';
import type { UseMedleyTeamBonusesReturn } from './use-medley-team-bonuses';
import type { UseMedleyEliminationReturn } from './use-medley-elimination';
import type { UseMedleyPhaseReturn } from './use-medley-phase';

// ===================== PARAMS =====================

export interface UseMedleyRoundActionsParams {
  medleySongs: MedleySong[];
  settings: MedleySettings;
  isTeam: boolean;
  isEliminationMode: boolean;
  currentSnippetIdx: number;
  playersRef: React.MutableRefObject<MedleyPlayer[]>;
  onRoundComplete: (_result: MedleyRoundResult, _updatedPlayers: MedleyPlayer[]) => void;
  /** Ref holding the parent's next-round song preparer (Fix 7). */
  onPrepareNextRoundSongsRef: React.MutableRefObject<(() => Promise<MedleySong[] | null>) | undefined>;
  multiPitch: UseMultiPitchDetectorReturn;
  audio: UseMedleyAudioReturn;
  features: UseMedleyFeaturesReturn;
  teamBonuses: UseMedleyTeamBonusesReturn;
  elimination: UseMedleyEliminationReturn;
  getActivePlayerIds: () => string[];
  finalizeSnippetScores: (_activeIds: string[]) => void;
  setPhase: UseMedleyPhaseReturn['setPhase'];
  setIsPlaying: React.Dispatch<React.SetStateAction<boolean>>;
  setCurrentSnippetIdx: React.Dispatch<React.SetStateAction<number>>;
  setCurrentTimeMs: React.Dispatch<React.SetStateAction<number>>;
  setIsSongPlaying: (v: boolean) => void;
  nextRoundSongsArmedRef: React.MutableRefObject<boolean>;
  lastTransitionAdvanceRef: React.MutableRefObject<number>;
  scoringEventsRef: React.MutableRefObject<MedleyScoringEvent[]>;
  setLastScoringEvents: React.Dispatch<React.SetStateAction<MedleyScoringEvent[]>>;
  medleyTickScoringStatesRef: React.MutableRefObject<Map<string, MedleyTickScoringState>>;
  snippetScoringMetaRef: React.MutableRefObject<ScoringMetadata | null>;
  lastSnippetIdxForMetaRef: React.MutableRefObject<number>;
  notePerformanceRef: React.MutableRefObject<Map<string, MedleyNotePerfSample[]>>;
  notePerformanceByPlayerRef: React.MutableRefObject<Map<string, Map<string, MedleyNotePerfSample[]>>>;
  setNotePerformance: React.Dispatch<React.SetStateAction<Map<string, MedleyNotePerfSample[]>>>;
  setNotePerformanceByPlayer: React.Dispatch<React.SetStateAction<Map<string, Map<string, MedleyNotePerfSample[]>>>>;
  forceRender: () => void;
}

// ===================== RETURN =====================

export interface UseMedleyRoundActionsReturn {
  isPreparingNextRound: boolean;
  handleStart: () => Promise<void>;
  handleNextRound: () => Promise<void>;
  handleRoundComplete: () => void;
  handleEndEarly: () => void;
}

// ===================== HOOK =====================

export function useMedleyRoundActions({
  medleySongs,
  settings,
  isTeam,
  isEliminationMode,
  currentSnippetIdx,
  playersRef,
  onRoundComplete,
  onPrepareNextRoundSongsRef,
  multiPitch,
  audio,
  features,
  teamBonuses,
  elimination,
  getActivePlayerIds,
  finalizeSnippetScores,
  setPhase,
  setIsPlaying,
  setCurrentSnippetIdx,
  setCurrentTimeMs,
  setIsSongPlaying,
  nextRoundSongsArmedRef,
  lastTransitionAdvanceRef,
  scoringEventsRef,
  setLastScoringEvents,
  medleyTickScoringStatesRef,
  snippetScoringMetaRef,
  lastSnippetIdxForMetaRef,
  notePerformanceRef,
  notePerformanceByPlayerRef,
  setNotePerformance,
  setNotePerformanceByPlayer,
  forceRender,
}: UseMedleyRoundActionsParams): UseMedleyRoundActionsReturn {
  // ── Start game ──
  const handleStart = useCallback(async () => {
    if (medleySongs.length === 0) return;
    elimination.resetFinalFaceOff();
    setCurrentTimeMs(0);

    // Initialize multi-pitch detection (non-blocking).
    try {
      const ok = await multiPitch.initialize();
      if (ok) multiPitch.start();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('[Medley] Multi-pitch init failed:', e);
    }

    // Start playing immediately (no countdown phase)
    audio.cancelFallbackTimer();
    audio.effectiveSnippetRef.current = null;
    setPhase('playing');
    setIsPlaying(true);
    setCurrentTimeMs(0);
    audio.lastPlayPhaseRef.current = ''; // Reset so the play effect fires
  }, [multiPitch, audio.cancelFallbackTimer, audio.effectiveSnippetRef, audio.lastPlayPhaseRef, elimination.resetFinalFaceOff]);

  // ── Next round (user item 6.2, Fix 7) ──
  // The "Next Round" button on the round-results screen previously called
  // onEndGame(), throwing the user back to the overall start screen. Instead,
  // reset the per-round state and jump DIRECTLY into the next round — only
  // the very first game start shows the intro screen.
  //
  // Fix 7: BEFORE resetting, the parent's `onPrepareNextRoundSongs` generates
  // a FRESH snippet list with DIFFERENT songs than the round just finished
  // (whenever the library pool allows) and swaps it into the party store +
  // the screen's `songs` state. The returned array arms the identity-based
  // reset effect above (belt-and-braces for late-arriving re-renders).
  // Item 5: isPreparingNextRound drives a visible loading overlay — preparing
  // URLs + lyrics for the whole next round takes a moment and previously
  // showed NO feedback at all.
  const [isPreparingNextRound, setIsPreparingNextRound] = useState(false);
  const handleNextRound = useCallback(async () => {
    if (medleySongs.length === 0) return;

    // ── Prepare the next round's songs BEFORE resetting anything ──
    let newSongs: MedleySong[] | null = null;
    setIsPreparingNextRound(true);
    try {
      if (onPrepareNextRoundSongsRef.current) {
        try {
          newSongs = await onPrepareNextRoundSongsRef.current();
        } catch {
          newSongs = null;
        }
      }
    } finally {
      setIsPreparingNextRound(false);
    }
    nextRoundSongsArmedRef.current = !!(newSongs && newSongs.length > 0);

    // Rewind to the first snippet
    setCurrentSnippetIdx(0);
    setCurrentTimeMs(0);

    // Re-arm the audio pipeline for snippet 0 (prepare + play effects).
    // useMedleyAudio re-prepares per snippet song id (its prepare effect is
    // keyed on [currentSnippet?.song.id, currentSnippetIdx]), so the new
    // round's snippet 0 gets loaded + played automatically.
    audio.cancelFallbackTimer();
    audio.effectiveSnippetRef.current = null;
    audio.lastPlayPhaseRef.current = '';

    // Reset the snippet-advance guard (transition idempotency)
    lastTransitionAdvanceRef.current = -1;

    // Clear per-round visuals: note fills / wrong-note marks / popup state
    notePerformanceRef.current = new Map();
    notePerformanceByPlayerRef.current = new Map();
    setNotePerformance(new Map());
    setNotePerformanceByPlayer(new Map());
    scoringEventsRef.current = [];
    setLastScoringEvents([]);

    // Reset per-player tick scoring states for the fresh round. Critical for
    // single-snippet medleys (e.g. team 1v1) where the snippet index does not
    // change and the [currentSnippetIdx] reset effect would never re-run.
    medleyTickScoringStatesRef.current.clear();
    for (const p of playersRef.current) {
      medleyTickScoringStatesRef.current.set(p.id, createMedleyTickScoringState());
    }
    snippetScoringMetaRef.current = null;
    lastSnippetIdxForMetaRef.current = -1; // force re-computation for snippet 0

    // Reset per-round features (highlights, mystery) + elimination state
    features.resetRound();
    if (isEliminationMode) elimination.resetRound();

    // Reset team-bonus bookkeeping for the fresh round
    teamBonuses.teamBonusResultRef.current = {
      synergyPoints: {},
      comebackTeamId: null,
      comebackMultiplier: 1,
      mvpPlayerId: null,
      teamBonusTotal: {},
    };
    teamBonuses.comebackActiveTeamIdRef.current = null;
    teamBonuses.syncTeamBonusResult();

    forceRender();

    // Go DIRECTLY into the next round — no intro screen, no re-setup.
    // Scores stay cumulative across rounds (series standings).
    setPhase('playing');
    setIsPlaying(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- refs + stable callbacks
  }, [medleySongs.length, audio.cancelFallbackTimer, audio.effectiveSnippetRef, audio.lastPlayPhaseRef, features.resetRound, elimination.resetRound, isEliminationMode, teamBonuses.syncTeamBonusResult, teamBonuses.teamBonusResultRef, teamBonuses.comebackActiveTeamIdRef, forceRender]);

  // ── Round complete ──
  const handleRoundComplete = useCallback(() => {
    // Final sync of team bonus result before recording
    teamBonuses.syncTeamBonusResult();
    teamBonuses.computeMVP();
    teamBonuses.syncTeamBonusResult(); // Sync again after MVP is computed

    const roundResult: MedleyRoundResult = {
      playedAt: Date.now(),
      snippetCount: medleySongs.length,
      playMode: settings.playMode,
      playerScores: {},
      teamScores: isTeam
        ? {
            teamA: playersRef.current.filter(p => p.team === 0).reduce((s, p) => s + p.score, 0),
            teamB: playersRef.current.filter(p => p.team === 1).reduce((s, p) => s + p.score, 0),
          }
        : undefined,
      eliminationOrder: isEliminationMode ? [...elimination.eliminationOrderRef.current] : undefined,
      snippetHighlights: features.highlightsRef.current.length > 0 ? [...features.highlightsRef.current] : undefined,
      teamBonusResult: isTeam && settings.teamBonusesEnabled ? { ...teamBonuses.teamBonusResultRef.current } : undefined,
    };
    for (const p of playersRef.current) {
      roundResult.playerScores[p.id] = {
        score: p.score,
        notesHit: p.notesHit,
        notesMissed: p.notesMissed,
        maxCombo: p.maxCombo,
        snippetsSung: p.snippetsSung,
      };
    }

    onRoundComplete(roundResult, [...playersRef.current]);
  }, [medleySongs.length, isTeam, isEliminationMode, onRoundComplete, settings.playMode, settings.teamBonusesEnabled, teamBonuses.computeMVP, teamBonuses.syncTeamBonusResult, teamBonuses.teamBonusResultRef, elimination.eliminationOrderRef, features.highlightsRef]);

  // ── End song early ──
  const handleEndEarly = useCallback(() => {
    if (audio.audioRef.current) {
      audio.audioRef.current.pause();
      audio.audioRef.current.playbackRate = 1.0; // Reset playback rate
    }
    if (audio.fallbackVideoRef.current) {
      audio.fallbackVideoRef.current.pause();
    }
    audio.cancelFallbackTimer();
    setIsPlaying(false);
    setIsSongPlaying(false);
    // NOTE: Do NOT call multiPitch.stop() here. Pitch detection must remain
    // alive across snippets — it is only started once in handleStart() and
    // cleaned up on unmount / full game end.

    // Count snippet as sung for active players
    const activeIds = getActivePlayerIds();
    // Finalize pending note scores for active players before transitioning
    finalizeSnippetScores(activeIds);
    activeIds.forEach(id => {
      const p = playersRef.current.find(p => p.id === id);
      if (p) p.snippetsSung++;
    });

    // Feature #17: Build highlight for this snippet
    features.buildSnippetHighlight(currentSnippetIdx);

    // Feature #18: Check team synergy at snippet end
    teamBonuses.checkSynergy();
    // Feature #18: Finalize comeback bonus (if active on last snippet)
    teamBonuses.finalizeComeback();
    // Sync team bonus result to state for UI
    teamBonuses.syncTeamBonusResult();

    forceRender();

    if (currentSnippetIdx < medleySongs.length - 1) {
      setPhase('transition');
    } else {
      setPhase('round-results');
    }
  }, [currentSnippetIdx, medleySongs.length, getActivePlayerIds, finalizeSnippetScores, features.buildSnippetHighlight, teamBonuses.checkSynergy, teamBonuses.finalizeComeback, teamBonuses.syncTeamBonusResult, setIsSongPlaying, forceRender, audio.cancelFallbackTimer, audio.audioRef, audio.fallbackVideoRef]);

  // ── Cleanup on unmount ──
  // DO-NOT-CHANGE: Dependency must be [] (not [multiPitch]).
  // useMultiPitchDetector returns a new object every render, so [multiPitch]
  // caused the cleanup to fire on every re-render, which cleared the
  // countdown interval mid-countdown (killing the game start).
  useEffect(() => {
    return () => {
      multiPitch.stop();
      audio.cancelFallbackTimer();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    isPreparingNextRound,
    handleStart,
    handleNextRound,
    handleRoundComplete,
    handleEndEarly,
  };
}
