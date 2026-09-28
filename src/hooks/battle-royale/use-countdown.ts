'use client';

/**
 * Countdown state (V3) for Battle Royale round transitions. Extracted from
 * use-battle-royale-game.ts (R4) — logic byte-identical.
 */
import { useEffect, useRef, useState } from 'react';
import type { BattleRoyaleGame } from '@/lib/game/battle-royale';

interface UseBattleRoyaleCountdownParams {
  game: BattleRoyaleGame;
  onUpdateGame: (_game: BattleRoyaleGame) => void;
  mountedRef: React.RefObject<boolean>;
}

interface UseBattleRoyaleCountdownReturn {
  countdown: number;
  /** Indirection ref that is kept in sync with the round handlers' gameRef. */
  gameRefRef: React.RefObject<{ current: BattleRoyaleGame }>;
}

export function useBattleRoyaleCountdown({ game, onUpdateGame, mountedRef }: UseBattleRoyaleCountdownParams): UseBattleRoyaleCountdownReturn {
  // ── Countdown state (V3) ───────────────────────────────────────────
  // DO-NOT-CHANGE: countdown is derived synchronously from game.status to avoid
  // a one-frame gap where game.status='countdown' but countdown=0 (from stale useState).
  // This gap caused the raw PlayingView (with pause overlay) to flash briefly during
  // round transitions before the countdown overlay could cover it.
  const targetCountdown = game.status === 'countdown' ? game.settings.countdownDuration : 0;
  const [countdown, setCountdown] = useState(targetCountdown);
  useEffect(() => { setCountdown(targetCountdown); }, [targetCountdown]);
  const gameRefRef = useRef<{ current: BattleRoyaleGame }>({ current: game } as { current: BattleRoyaleGame });
  // gameRef is provided by round handlers below, but we need a placeholder here

  useEffect(() => {
    if (countdown <= 0 || game.status !== 'countdown') return;
    const timer = setTimeout(() => {
      if (!mountedRef.current) return;
      const next = countdown - 1;
      if (next <= 0) {
        onUpdateGame({ ...gameRefRef.current.current, status: 'playing' });
      }
      setCountdown(next);
    }, 1000);
    return () => clearTimeout(timer);
  }, [countdown, game.status]);

  return { countdown, gameRefRef };
}
