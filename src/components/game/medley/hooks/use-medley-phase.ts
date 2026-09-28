import { useState, useCallback, useEffect, useRef } from 'react';
import type { MedleyGamePhase } from '../medley-types';

// ===================== RETURN =====================

export interface UseMedleyPhaseReturn {
  phase: MedleyGamePhase;
  /** Plain setter alias (no side effects — the ptm-phase-changed event is dispatched from an effect). */
  setPhase: (newPhase: MedleyGamePhase | ((prev: MedleyGamePhase) => MedleyGamePhase)) => void;
  /** Mirror of `phase` for async callbacks (avoid stale closures). */
  phaseRef: React.MutableRefObject<MedleyGamePhase>;
  /** Transition countdown counter (seconds left in the current transition). */
  transitionCount: number;
  setTransitionCount: React.Dispatch<React.SetStateAction<number>>;
  /** Guard: snippet index already advanced out of its transition (idempotency). */
  lastTransitionAdvanceRef: React.MutableRefObject<number>;
}

// ===================== HOOK =====================

/**
 * Phase management for the Medley game: phase state + guarded setter alias,
 * the phase ref for async callbacks, the transition countdown counter, and
 * the snippet-advance idempotency guard.  Dispatches the `ptm-phase-changed`
 * event for companion mirroring whenever the phase commits.
 */
export function useMedleyPhase(): UseMedleyPhaseReturn {
  // ── Phase ──
  const [phase, setPhaseRaw] = useState<MedleyGamePhase>('intro');
  // Plain setter alias — the ptm-phase-changed event for companion mirroring
  // is dispatched from the [phase] effect below, AFTER the phase commits.
  // (Previously it was dispatched synchronously inside setPhase, which — when
  // called from a state-updater function — fired listener setStates during
  // this component's render, triggering React's
  // "Cannot update a component while rendering a different component" warning.)
  const setPhase = useCallback((newPhase: MedleyGamePhase | ((prev: MedleyGamePhase) => MedleyGamePhase)) => {
    setPhaseRaw(newPhase);
}, []);
  const phaseRef = useRef<MedleyGamePhase>('intro');
  const [transitionCount, setTransitionCount] = useState(3);
  // Guard: snippet index already advanced out of its transition (idempotency)
  const lastTransitionAdvanceRef = useRef<number>(-1);
  // Keep phaseRef in sync (used in async callbacks to avoid stale closures)
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  // ── Dispatch phase for companion mirroring whenever it commits ──
  // Covers the initial 'intro' phase on mount AND every later transition.
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('ptm-phase-changed', { detail: { phase } }));
  }, [phase]);

  return {
    phase,
    setPhase,
    phaseRef,
    transitionCount,
    setTransitionCount,
    lastTransitionAdvanceRef,
  };
}
