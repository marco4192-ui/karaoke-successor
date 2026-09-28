/**
 * Medley Contest — Transition countdown (R7 extraction).
 *
 * Owns the snippet advance when phase === 'transition': counts down
 * `settings.transitionTime` seconds, then advances to the next snippet and
 * re-arms the audio pipeline for it.
 */

import { useEffect } from 'react';
import type { MedleyGamePhase, MedleySettings } from '../medley-types';
import type { MedleyNotePerfSample } from './medley-hook-types';
import type { UseMedleyAudioReturn } from './use-medley-audio';
import type { UseMedleyTeamBonusesReturn } from './use-medley-team-bonuses';
import type { UseMedleyPhaseReturn } from './use-medley-phase';

// ===================== PARAMS =====================

export interface UseMedleyTransitionParams {
  phase: MedleyGamePhase;
  currentSnippetIdx: number;
  settings: MedleySettings;
  lastTransitionAdvanceRef: React.MutableRefObject<number>;
  setTransitionCount: React.Dispatch<React.SetStateAction<number>>;
  setCurrentSnippetIdx: React.Dispatch<React.SetStateAction<number>>;
  setPhase: UseMedleyPhaseReturn['setPhase'];
  setIsPlaying: React.Dispatch<React.SetStateAction<boolean>>;
  setCurrentTimeMs: React.Dispatch<React.SetStateAction<number>>;
  notePerformanceRef: React.MutableRefObject<Map<string, MedleyNotePerfSample[]>>;
  notePerformanceByPlayerRef: React.MutableRefObject<Map<string, Map<string, MedleyNotePerfSample[]>>>;
  setNotePerformance: React.Dispatch<React.SetStateAction<Map<string, MedleyNotePerfSample[]>>>;
  setNotePerformanceByPlayer: React.Dispatch<React.SetStateAction<Map<string, Map<string, MedleyNotePerfSample[]>>>>;
  audio: UseMedleyAudioReturn;
  teamBonuses: UseMedleyTeamBonusesReturn;
}

// ===================== HOOK =====================

export function useMedleyTransition({
  phase,
  currentSnippetIdx,
  settings,
  lastTransitionAdvanceRef,
  setTransitionCount,
  setCurrentSnippetIdx,
  setPhase,
  setIsPlaying,
  setCurrentTimeMs,
  notePerformanceRef,
  notePerformanceByPlayerRef,
  setNotePerformance,
  setNotePerformanceByPlayer,
  audio,
  teamBonuses,
}: UseMedleyTransitionParams): void {
  // ── Transition: pulse then next snippet ──
  // Item 7: the countdown effect OWNS the advance. The previous split design
  // (countdown effect + separate advance effect reading the transitionCount
  // STATE) had a race: when phase flipped to 'transition', the advance effect
  // ran in the same commit with the STALE transitionCount (0 from the previous
  // countdown) and skipped the screen entirely — which made snippet switches
  // alternate between instant cuts and loading gaps. Keeping the counter in a
  // local closure removes the stale-state read: every transition now shows the
  // SAME short countdown before advancing.
  useEffect(() => {
    if (phase !== 'transition') return;
    const transitionTime = Math.max(0, settings.transitionTime ?? 3);
    let count = transitionTime;
    setTransitionCount(count);

    const advance = () => {
      // Idempotency guard (StrictMode remounts / late re-renders)
      if (lastTransitionAdvanceRef.current === currentSnippetIdx) return;
      lastTransitionAdvanceRef.current = currentSnippetIdx;

      const nextIdx = currentSnippetIdx + 1;
      setCurrentSnippetIdx(nextIdx);
      setPhase('playing');
      setIsPlaying(true); // CRITICAL: must re-enable playing for the next snippet
      setCurrentTimeMs(0);
      // Fresh note stream: clear the previous snippet's per-note performance
      // samples (fills + wrong-note marks) so they cannot bleed into the new
      // snippet's notes via repeated `note-{startTime}` keys.
      notePerformanceRef.current.clear();
      notePerformanceByPlayerRef.current.clear();
      setNotePerformance(new Map());
      setNotePerformanceByPlayer(new Map());
      audio.lastPlayPhaseRef.current = ''; // Reset so the play effect fires for new snippet
      // Feature #18: Pre-check comeback boost before the last snippet starts
      teamBonuses.preCheckComeback(nextIdx);
    };

    if (count <= 0) {
      // Zero-length transitions advance (almost) immediately — still on the
      // next tick so the phase change settles without a mid-render state storm.
      const t = setTimeout(advance, 50);
      return () => clearTimeout(t);
    }

    // Pure countdown tick — NO side effects inside the state updater.
    // (React may invoke updaters during render / twice in StrictMode; putting
    // setPhase / ref mutations / callbacks in there previously caused
    // "Cannot update a component while rendering a different component".)
    const interval = setInterval(() => {
      count -= 1;
      setTransitionCount(count);
      if (count <= 0) {
        clearInterval(interval);
        advance();
      }
    }, 1000);

    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- refs + stable callbacks
  }, [phase, currentSnippetIdx]);
}
