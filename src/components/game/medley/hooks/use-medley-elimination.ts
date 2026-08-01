import { useState, useCallback, useRef } from 'react';
import type { MedleyPlayer } from '../medley-types';
import { computeElimination } from '../medley-elimination';

// ===================== PARAMS =====================

export interface UseMedleyEliminationParams {
  isEliminationMode: boolean;
  playersRef: React.MutableRefObject<MedleyPlayer[]>;
  forceRender: () => void;
}

// ===================== RETURN =====================

export interface UseMedleyEliminationReturn {
  eliminationOrder: string[];
  finalFaceOff: boolean;
  eliminateLowestScorer: () => void;
  eliminationOrderRef: React.MutableRefObject<string[]>;
  resetFinalFaceOff: () => void;
}

// ===================== HOOK =====================

/**
 * Feature #10: Elimination mode — track eliminated players, end game early.
 * Delegates the elimination decision to the pure `computeElimination` function.
 */
export function useMedleyElimination({
  isEliminationMode,
  playersRef,
  forceRender,
}: UseMedleyEliminationParams): UseMedleyEliminationReturn {
  const [eliminationOrder, setEliminationOrder] = useState<string[]>([]);
  const eliminationOrderRef = useRef<string[]>([]);
  const [finalFaceOff, setFinalFaceOff] = useState(false);

  // ── Feature #10: Eliminate lowest scorer (delegates to pure function) ──
  const eliminateLowestScorer = useCallback(() => {
    const result = computeElimination({
      isEliminationMode,
      players: playersRef.current,
    });
    if (!result.toEliminateId) return;

    const pIdx = playersRef.current.findIndex(p => p.id === result.toEliminateId);
    if (pIdx !== -1) {
      playersRef.current[pIdx] = { ...playersRef.current[pIdx], isEliminated: true };
      eliminationOrderRef.current = [...eliminationOrderRef.current, result.toEliminateId];
      setEliminationOrder([...eliminationOrderRef.current]);
    }

    forceRender();

    // Check if only 2 remain — trigger final face-off flag
    if (result.remainingCount === 2) {
      setFinalFaceOff(true);
    }
  }, [isEliminationMode, forceRender]);

  const resetFinalFaceOff = useCallback(() => setFinalFaceOff(false), []);

  return {
    eliminationOrder,
    finalFaceOff,
    eliminateLowestScorer,
    eliminationOrderRef,
    resetFinalFaceOff,
  };
}
