'use client';

/**
 * Mid-round eliminations (user request 2.2-R2) + R19 tie-break showdown
 * clock for Battle Royale. Extracted from use-battle-royale-game.ts (R4) —
 * logic byte-identical (effects, dep arrays, re-arm/self-heal behaviour).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  eliminateWeakestMidRound,
  resolveTieBreakElimination,
  startTieBreak,
  getEffectiveRoundDuration,
} from '@/lib/game/battle-royale';
import type { BattleRoyaleGame } from '@/lib/game/battle-royale';
import type { UseMultiPitchDetectorReturn } from '@/hooks/use-multi-pitch-detector';

interface UseBattleRoyaleMidRoundEliminationParams {
  game: BattleRoyaleGame;
  onUpdateGame: (_game: BattleRoyaleGame) => void;
  pauseDialogAction: null | 'song-pause' | 'party-leave' | 'song-end-early';
  gameRef: React.RefObject<BattleRoyaleGame>;
  roundEndingRef: React.RefObject<boolean>;
  handleRoundEndRef: React.RefObject<() => void>;
  /** Not-yet-flushed score accumulation of the scoring loop (sees the very latest scores). */
  pendingScoredGameRef: React.RefObject<BattleRoyaleGame | null>;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  audioHasPlayedRef: React.RefObject<boolean>;
  multiPitch: UseMultiPitchDetectorReturn;
  notifyElimination: (_info: { id: string; name: string; byCoinFlip?: boolean }) => void;
}

interface UseBattleRoyaleMidRoundEliminationReturn {
  /** Seconds until the next mid-round elimination (full-song rhythm rounds
   *  only; null when no rhythm elimination is scheduled). Drives the HUD
   *  badge so the configured interval is VISIBLE while playing. During a
   *  tie-break showdown it counts down the SHOWDOWN deadline instead. */
  nextEliminationIn: number | null;
}

export function useBattleRoyaleMidRoundElimination({
  game,
  onUpdateGame,
  pauseDialogAction,
  gameRef,
  roundEndingRef,
  handleRoundEndRef,
  pendingScoredGameRef,
  audioRef,
  videoRef,
  audioHasPlayedRef,
  multiPitch,
  notifyElimination,
}: UseBattleRoyaleMidRoundEliminationParams): UseBattleRoyaleMidRoundEliminationReturn {
  // ── Mid-round eliminations (user request 2.2-R2) ─────────────────
  // Full-song rounds (songSelection random/vote) eliminate the weakest
  // player in the CONFIGURED rhythm while the song keeps playing — only
  // the player is out, the round is never interrupted. The interval comes
  // from getEffectiveRoundDuration (the same settings value the setup
  // slider shows; the shrinking-timer setting reduces it in later rounds) —
  // there are NO hardcoded intervals. Timestamp-based instead of
  // setInterval so the rhythm survives pause/unpause (the deadline shifts
  // by the paused time) and is frozen per round.
  // Medley keeps its snippet-based budget; grand finale rounds decide via
  // round wins, not eliminations.

  const [nextEliminationIn, setNextEliminationIn] = useState<number | null>(null);

  const handleMidRoundElimination = useCallback(() => {
    if (roundEndingRef.current) return;
    // Base on the not-yet-flushed accumulation so the elimination decision
    // sees the very latest scores (same rationale as the game loop).
    const base = pendingScoredGameRef.current ?? gameRef.current;

    // ── R19 showdown: the deadline of an ACTIVE showdown has come —
    // resolve it (lowest of the tied players goes out; STILL tied → coin
    // flip; nobody goes out when only one contender remains). ──
    if (base.tieBreak) {
      const res = resolveTieBreakElimination(base);
      if (res) {
        const updated = res.game;
        gameRef.current = updated;
        pendingScoredGameRef.current = updated;
        if (res.eliminatedId) {
          const eliminated = updated.players.find(p => p.id === res.eliminatedId);
          if (eliminated) {
            notifyElimination({ id: eliminated.id, name: eliminated.name, byCoinFlip: res.byCoinFlip });
          }
        }
        if (updated.status === 'completed') {
          // Coin flip decided the last man standing: stop media + pitch,
          // then commit — the screen router switches to the WinnerView.
          if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ''; }
          if (videoRef.current) { videoRef.current.pause(); videoRef.current.src = ''; }
          audioHasPlayedRef.current = false;
          multiPitch.stop();
          roundEndingRef.current = true; // game loop stops touching the game
        }
        onUpdateGame(updated);
      }
      return;
    }

    const result = eliminateWeakestMidRound(base);
    if (!result) return;

    // ── R19 user rule: TIE at the bottom → start the 10-second showdown
    // instead of eliminating arbitrarily. The song keeps playing; the
    // ticker counts down the showdown and fires this handler again at its
    // deadline (resolution branch above). ──
    if ('tie' in result) {
      const showdown = startTieBreak(base, result.tiedIds);
      gameRef.current = showdown;
      pendingScoredGameRef.current = showdown;
      onUpdateGame(showdown);
      return;
    }

    const updated = result.game;
    gameRef.current = updated;
    // Keep the loop's pending base consistent so the throttled store write
    // can never revert the elimination.
    pendingScoredGameRef.current = updated;

    // Non-blocking HUD notice (user follow-up 2.2-R3: the inline ✕ on the
    // player card is easy to miss — surface WHO just went out so the
    // configured rhythm is unmissable).
    const eliminated = updated.players.find(p => p.id === result.eliminatedId);
    if (eliminated) {
      notifyElimination({ id: eliminated.id, name: eliminated.name });
    }

    if (updated.status === 'completed') {
      // Last man standing mid-song: stop media + pitch, then commit — the
      // screen router switches to the WinnerView.
      if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ''; }
      if (videoRef.current) { videoRef.current.pause(); videoRef.current.src = ''; }
      audioHasPlayedRef.current = false;
      multiPitch.stop();
      roundEndingRef.current = true; // game loop stops touching the game
    }
    onUpdateGame(updated);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- stable refs + stable multiPitch object + stable notifyElimination
  }, [notifyElimination]);

  const handleMidRoundElimRef = useRef(handleMidRoundElimination);
  useEffect(() => {
    handleMidRoundElimRef.current = handleMidRoundElimination;
  }, [handleMidRoundElimination]);

  // Full-song rhythm rounds: random/vote, no medley, no grand finale.
  const isFullSongRound =
    (game.settings.songSelection === 'random' || game.settings.songSelection === 'vote') &&
    !game.settings.medleyMode &&
    !game.isGrandFinale;

  // Elimination clock: deadline timestamp (ms) or null when disarmed.
  const nextElimAtRef = useRef<number | null>(null);
  const elimPausedAtRef = useRef<number | null>(null);
  // R15 (user request 1.3): remaining elimination time carried across a
  // round transition (song ended before the deadline). The rhythm is a
  // GAME clock, not a per-round timer — the next song CONTINUES the
  // countdown instead of restarting the full interval ("ein neuer Song
  // startete wieder mit 120 Sekunden Countdown").
  const elimCarryMsRef = useRef<number | null>(null);
  // Minimum carried-over countdown when the next round starts (seconds) — a
  // fresh song gets a fair start before a due/overdue elimination fires.
  const ELIM_CARRY_MIN_SEC = 5;

  // Effective rhythm for the given game state — always from the settings
  // (roundDuration / finalRoundDuration / shrinking timer).
  const elimIntervalSec = useCallback((g: BattleRoyaleGame): number =>
    Math.max(5, getEffectiveRoundDuration(
      g.settings,
      g.currentRound,
      g.players.filter(p => !p.eliminated).length,
      g.isGrandFinale,
    )), []);

  // Arm the clock at the START of each full-song round (playing transition
  // or round change). Frozen afterwards — in-round eliminations only
  // re-arm AFTER firing (see the ticker), never mid-interval.
  // R15 (user request 1.3): when the previous round's SONG ended before the
  // deadline (song shorter than the remaining elimination countdown), the
  // next round CONTINUES the leftover countdown (min 5s) instead of
  // re-arming the full interval — an elimination that was 8s away stays
  // 8s away, regardless of how long the next song is.
  // R19: an ACTIVE tie-break showdown owns the clock while it runs (the
  // ticker derives its deadline from game.tieBreak.until) — leave the ref
  // alone so the showdown resolution path can re-arm it cleanly.
  useEffect(() => {
    if (gameRef.current?.tieBreak) {
      nextElimAtRef.current = null;
      return;
    }
    if (game.status !== 'playing' || !isFullSongRound) {
      // Leaving a rhythm round (song ended → voting / finale / game over):
      // remember the remaining elimination time so the NEXT round can
      // continue the rhythm instead of restarting it.
      if (nextElimAtRef.current !== null) {
        const remainingMs = nextElimAtRef.current - Date.now();
        elimCarryMsRef.current = remainingMs > 0 ? remainingMs : null;
      }
      nextElimAtRef.current = null;
      elimPausedAtRef.current = null;
      return;
    }
    // Direct round change while staying in 'playing' (song ended → next
    // song starts immediately, no intermediate render): the old deadline
    // is still armed — continue it.
    const prevDeadline = nextElimAtRef.current;
    if (prevDeadline !== null) {
      const remainingMs = prevDeadline - Date.now();
      // Overdue (< 0.5s: the song ended right at the deadline before the
      // 500ms ticker could fire) → fire shortly into the next song instead
      // of wiping a due elimination.
      nextElimAtRef.current = Date.now() + Math.max(ELIM_CARRY_MIN_SEC * 1000, remainingMs);
      elimCarryMsRef.current = null;
      return;
    }
    // Re-entering 'playing' after an intermediate phase (voting): continue
    // the carried-over countdown, else the full configured interval.
    const carried = elimCarryMsRef.current;
    elimCarryMsRef.current = null;
    if (carried != null) {
      nextElimAtRef.current = Date.now() + Math.max(ELIM_CARRY_MIN_SEC * 1000, carried);
      return;
    }
    nextElimAtRef.current = Date.now() + elimIntervalSec(gameRef.current) * 1000;
  // eslint-disable-next-line react-hooks/exhaustive-deps -- reads gameRef.current on purpose (freeze the interval at round start)
  }, [game.status, game.currentRound, isFullSongRound]);

  // Pause: shift the deadline by the paused duration — the rhythm rests
  // during the pause and resumes where it was, never firing while paused.
  // R19: an active showdown deadline rests during the pause too (the tied
  // players must not lose extension time while the game stands still).
  // R20-2: ANY open dialog rests the clock (pause menu AND the leave
  // confirmation that opens on top of it) — only latch the pause start ONCE
  // so the full dialog duration shifts the deadline when it finally closes.
  useEffect(() => {
    if (pauseDialogAction !== null) {
      if (elimPausedAtRef.current === null) {
        elimPausedAtRef.current = Date.now();
      }
    } else if (elimPausedAtRef.current !== null) {
      const pausedFor = Date.now() - elimPausedAtRef.current;
      if (nextElimAtRef.current !== null) {
        nextElimAtRef.current += pausedFor;
      }
      const gBase = pendingScoredGameRef.current ?? gameRef.current;
      if (gBase?.tieBreak) {
        const shifted: BattleRoyaleGame = {
          ...gBase,
          tieBreak: { ...gBase.tieBreak, until: gBase.tieBreak.until + pausedFor },
        };
        gameRef.current = shifted;
        pendingScoredGameRef.current = shifted;
        onUpdateGame(shifted);
      }
      elimPausedAtRef.current = null;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- reads refs on purpose; onUpdateGame is stable from the screen
  }, [pauseDialogAction]);

  // R19: the ticker also runs during a showdown in NON-rhythm rounds (medley
  // / grand finale) — it counts the showdown down and resolves it.
  const hasTieBreak = !!game.tieBreak;

  // Ticker: cheap 500ms check that fires the elimination when the deadline
  // passes, then re-arms with a freshly computed interval (player count may
  // have changed) or disarms when the finale duel / game end takes over.
  // Also SELF-HEALING (2.2-R3): if the deadline is null while a rhythm round
  // is still running (e.g. a missed transition after an unexpected state
  // change), re-arm instead of silently staying disarmed — the rhythm must
  // never stop mid-round.
  // R19: an ACTIVE tie-break showdown takes precedence — countdown to its
  // deadline; at expiry, rhythm showdowns resolve directly (elimination /
  // coin flip), medley & finale showdowns end the round (the round-end path
  // holds the final resolver: coin flip on a still-standing tie).
  useEffect(() => {
    if (game.status !== 'playing' || (!isFullSongRound && !hasTieBreak)) {
      setNextEliminationIn(null);
      return;
    }
    const iv = setInterval(() => {
      if (pauseDialogAction !== null) return; // dialog open — the clock is shifted, not ticking

      // ── R19: active showdown — its deadline IS the clock ──
      const tie = gameRef.current.tieBreak;
      if (tie) {
        setNextEliminationIn(Math.max(0, Math.ceil((tie.until - Date.now()) / 1000)));
        if (Date.now() < tie.until) return;

        const g0 = gameRef.current;
        const lastRound0 = g0.rounds[g0.rounds.length - 1];
        if (lastRound0?.roundType === 'full' && !g0.isGrandFinale) {
          // Rhythm showdown: resolve the elimination directly.
          handleMidRoundElimRef.current();
        } else {
          // Medley / grand-finale showdown: the round ends NOW — the
          // round-end path resolves the tie (coin flip if still tied).
          handleRoundEndRef.current();
        }

        // Re-arm the rhythm clock after the resolution (or disarm at game
        // end / when another showdown took over)
        const g = gameRef.current;
        const active = g.players.filter(p => !p.eliminated).length;
        const finaleEnabled = g.settings.grandFinaleBestOf > 1;
        if (g.status === 'completed' || g.tieBreak || (finaleEnabled ? active <= 2 : active <= 1)) {
          nextElimAtRef.current = null;
          setNextEliminationIn(null);
        } else {
          nextElimAtRef.current = Date.now() + elimIntervalSec(g) * 1000;
        }
        return;
      }

      let next = nextElimAtRef.current;

      // Self-heal: re-arm a lost deadline (never extend an armed one).
      if (next === null) {
        const g0 = gameRef.current;
        const active0 = g0.players.filter(p => !p.eliminated).length;
        const finaleEnabled0 = g0.settings.grandFinaleBestOf > 1;
        const rhythmApplies = g0.status === 'playing' && !g0.isGrandFinale &&
          (finaleEnabled0 ? active0 > 2 : active0 > 1);
        if (rhythmApplies) {
          next = Date.now() + elimIntervalSec(g0) * 1000;
          nextElimAtRef.current = next;
        }
      }

      if (next === null) {
        setNextEliminationIn(null);
        return;
      }
      setNextEliminationIn(Math.max(0, Math.ceil((next - Date.now()) / 1000)));
      if (Date.now() < next) return;

      handleMidRoundElimRef.current();

      // Re-arm or disarm based on the post-elimination state. R19: a
      // freshly STARTED showdown (tie signal) owns the clock now — its
      // deadline comes from game.tieBreak.until, so disarm the rhythm ref.
      const g = gameRef.current;
      const active = g.players.filter(p => !p.eliminated).length;
      const finaleEnabled = g.settings.grandFinaleBestOf > 1;
      if (g.status === 'completed' || g.tieBreak || (finaleEnabled ? active <= 2 : active <= 1)) {
        // The finale duel decides between the last two / last man standing
        // won / a showdown is running — no further rhythm eliminations.
        nextElimAtRef.current = null;
        setNextEliminationIn(null);
      } else {
        nextElimAtRef.current = Date.now() + elimIntervalSec(g) * 1000;
      }
    }, 500);
    return () => clearInterval(iv);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- refs + primitives only
  }, [game.status, isFullSongRound, hasTieBreak, pauseDialogAction]);

  return { nextEliminationIn };
}
