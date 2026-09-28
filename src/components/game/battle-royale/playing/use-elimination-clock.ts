'use client';

/**
 * R16/R19 elimination clock + danger-zone/showdown logic — extracted 1:1 from
 * battle-royale/playing-view.tsx (task R12): the ONE clock that decides who
 * drops out next (rhythm interval in full-song rounds / round timer in medley
 * rounds / showdown deadline during a R19 tie-break), the danger-zone helpers
 * for the player cards and the #10 elimination-camera flag.
 */
import { useCallback } from 'react';
import type {
  BattleRoyaleGame,
  BattleRoyalePlayer,
  BattleRoyaleRound,
  TieBreakState,
} from '@/lib/game/battle-royale';

export interface UseEliminationClockParams {
  sortedPlayers: BattleRoyalePlayer[];
  tieBreak?: TieBreakState | null;
  nextEliminationIn?: number | null;
  game: BattleRoyaleGame;
  currentRound: BattleRoyaleRound | undefined;
  roundTimeLeft: number;
}

export interface UseEliminationClockReturn {
  showdownActive: boolean;
  elimCountdownSec: number | null;
  elimFromRoundTimer: boolean;
  isElimCritical: boolean;
  isDangerZone: boolean;
  isDanger: (player: BattleRoyalePlayer) => boolean;
  isInShowdown: (player: BattleRoyalePlayer) => boolean;
  isLowest: (player: BattleRoyalePlayer) => boolean;
  isEliminationCamera: boolean;
  eliminationAnimationEnabled: boolean;
}

export function useEliminationClock({
  sortedPlayers,
  tieBreak,
  nextEliminationIn,
  game,
  currentRound,
  roundTimeLeft,
}: UseEliminationClockParams): UseEliminationClockReturn {
  // Danger zone detection
  const activeSorted = sortedPlayers.filter(p => !p.eliminated);
  const dangerZone = activeSorted.length > 3 ? activeSorted.slice(-3) : activeSorted;

  // ── R16 (user request 1): the ELIMINATION countdown ──────────────────
  // The ONE clock that decides who drops out next — shown prominently at
  // the top edge (big, red, centered):
  //  • rhythm rounds (random/vote, no medley, no finale) → nextEliminationIn
  //    (mid-round eliminations; carries across song changes since R15/1.3)
  //  • medley rounds → the round timer (round end = elimination there)
  //  • grand finale → none (the duel decides a WIN, nobody is eliminated)
  // R19: during a tie-break SHOWDOWN the same HUD turns amber (⚔️ Stechen!)
  // and counts down the showdown deadline — including medley/finale rounds.
  const showdownActive = !!tieBreak;
  const elimCountdownSec: number | null =
    nextEliminationIn != null
      ? nextEliminationIn
      : game.isGrandFinale
        ? null
        : currentRound?.roundType === 'medley'
          ? roundTimeLeft
          : null;
  // True when the elimination clock IS the round timer (medley rounds) —
  // the bottom-left round badge then hides to avoid showing the same
  // number twice (a numeric equality check would misfire in rhythm rounds
  // when both clocks coincidentally hold the same value). Hidden during a
  // showdown too (its countdown owns the display, the round timer is at 0).
  const elimFromRoundTimer =
    !showdownActive && nextEliminationIn == null && !game.isGrandFinale && currentRound?.roundType === 'medley';
  // Critical: last 5 seconds of EVERY countdown → alarm frame + beating number
  const isElimCritical = elimCountdownSec != null && elimCountdownSec <= 5 && elimCountdownSec > 0;
  const isDangerZone = isElimCritical && !showdownActive;

  const isDanger = useCallback((player: BattleRoyalePlayer) =>
    isDangerZone && !player.eliminated && dangerZone.some(d => d.id === player.id),
    [isDangerZone, dangerZone]
  );

  // R19: the tied players battling the showdown glow amber on their cards.
  const isInShowdown = useCallback((player: BattleRoyalePlayer) =>
    showdownActive && !player.eliminated && !!tieBreak && tieBreak.playerIds.includes(player.id),
    [showdownActive, tieBreak]);

  const isLowest = (player: BattleRoyalePlayer) =>
    !player.eliminated && activeSorted.length > 0 && activeSorted[activeSorted.length - 1].id === player.id;

  // #10 Elimination camera: dramatic effects in the last 10 seconds of the
  // ELIMINATION countdown (R16: re-keyed from the round timer — in rhythm
  // rounds the round timer merely ends the SONG, the elimination clock is
  // what puts the bottom players at risk; medley rounds keep the identical
  // behaviour since their round timer IS the elimination clock).
  const eliminationAnimationEnabled = game.settings.eliminationAnimation;
  // R19: the amber showdown frame replaces the red elimination drama while
  // the showdown runs (the tied players get their own visual language).
  const isEliminationCamera = eliminationAnimationEnabled && !showdownActive && elimCountdownSec != null && elimCountdownSec <= 10 && elimCountdownSec > 0;

  return {
    showdownActive,
    elimCountdownSec,
    elimFromRoundTimer,
    isElimCritical,
    isDangerZone,
    isDanger,
    isInShowdown,
    isLowest,
    isEliminationCamera,
    eliminationAnimationEnabled,
  };
}
