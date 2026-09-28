'use client';

/**
 * Mid-round elimination HUD notice (2.2-R3 + R19 coin-flip variant).
 * Non-blocking banner: WHO just went out (and whether a coin flip decided
 * it). Extracted from use-battle-royale-game.ts (R4) — logic byte-identical.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

interface UseBattleRoyaleEliminationNoticeReturn {
  /** Latest mid-round elimination notice ({name} + id) for the non-blocking
   *  HUD banner; auto-clears after a few seconds. byCoinFlip = the showdown
   *  ended in a coin flip (R19). */
  midRoundEliminationNotice: { id: string; name: string; byCoinFlip?: boolean } | null;
  notifyElimination: (_info: { id: string; name: string; byCoinFlip?: boolean }) => void;
}

export function useBattleRoyaleEliminationNotice(): UseBattleRoyaleEliminationNoticeReturn {
  // ── Mid-round elimination HUD notice (2.2-R3 + R19 coin-flip variant) ──
  // Non-blocking banner: WHO just went out (and whether a coin flip decided
  // it). Defined BEFORE the round handlers so they can surface forced
  // showdown resolutions (song ending mid-showdown) on the same banner.
  const [midRoundEliminationNotice, setMidRoundEliminationNotice] = useState<{ id: string; name: string; byCoinFlip?: boolean } | null>(null);
  const elimNoticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (elimNoticeTimerRef.current !== null) clearTimeout(elimNoticeTimerRef.current);
  }, []);

  const notifyElimination = useCallback((info: { id: string; name: string; byCoinFlip?: boolean }) => {
    setMidRoundEliminationNotice({ id: info.id, name: info.name, byCoinFlip: info.byCoinFlip });
    if (elimNoticeTimerRef.current !== null) {
      clearTimeout(elimNoticeTimerRef.current);
    }
    elimNoticeTimerRef.current = setTimeout(() => {
      elimNoticeTimerRef.current = null;
      setMidRoundEliminationNotice(null);
    }, 3500);
  }, []);

  return { midRoundEliminationNotice, notifyElimination };
}
