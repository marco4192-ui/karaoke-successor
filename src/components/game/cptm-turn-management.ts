'use client';

import { useState, useEffect, useRef } from 'react';
import type { CptmPlayer, CptmSegment, GamePhase } from './cptm-types';
import { postGameState } from '@/lib/desktop-instance';

// ===================== TYPES =====================

/** Maps a segment index to the player index who sings that segment. */
interface CptmScheduleEntry {
  segmentIndex: number;
  playerIndex: number;
}

/** Player roster entry sent to companion mirrors for the CPTM game view. */
export interface CptmCompanionPlayerInfo {
  profileId: string;
  name: string;
  color: string;
  score: number;
  segmentsSung: number;
}

/** Extra context so companion mirrors can render names, colors and scores. */
export interface CptmTurnContext {
  currentPlayerName?: string;
  currentPlayerColor?: string;
  /** R60: Profil-ID des aktuell singenden Spielers. Während der Blink-Warnung
   * (profileId null) weiß das Handy des Sängers sonst nicht, dass es weiter
   * singt — Mikro-/Wake-Lock-Logik flackerte in jedem Blink-Fenster. */
  currentPlayerId?: string;
  nextPlayerName?: string;
  players?: CptmCompanionPlayerInfo[];
}

// ===================== STANDALONE FUNCTIONS =====================

/**
 * Send a cptm turn signal to the companion app.
 * Fire-and-forget — errors are silently ignored since the companion may not be connected.
 * R43: unified postGameState helper (senderId + 409 single-writer backoff).
 */
export function sendCompanionTurnSignal(
  profileId: string | null,
  nextProfileId: string | null,
  countdown: number | null,
  isActive: boolean,
  context?: CptmTurnContext,
): void {
  try {
    void postGameState({
      cptmTurn: { profileId, nextProfileId, countdown, isActive, ...context },
    });
  } catch {
    // Ignore
  }
}

/** Builds the companion roster from the mutable players ref (names/colors/scores). */
export function buildCptmPlayerInfo(
  players: CptmPlayer[],
): CptmCompanionPlayerInfo[] {
  return players.map(p => ({
    profileId: p.id,
    name: p.name,
    color: p.color,
    score: p.score,
    segmentsSung: p.segmentsSung,
  }));
}

// ===================== HOOK PARAMS =====================

interface CptmTurnManagementParams {
  initialPlayers: CptmPlayer[];
  initialSegments: CptmSegment[];
  playersRef: React.MutableRefObject<CptmPlayer[]>;
  phase: GamePhase;
  isPlaying: boolean;
  currentTime: number;
  blinkLeadTime: number;
  onUpdateGame: (_players: CptmPlayer[], _segments: CptmSegment[]) => void;
  recordRound: () => void;
  setIsPlaying: (v: boolean) => void;
  setPhase: (p: GamePhase) => void;
}

interface CptmTurnManagementReturn {
  currentPlayerIndex: number;
  currentSegmentIndex: number;
  currentPlayer: CptmPlayer | undefined;
  currentPlayerIndexRef: React.MutableRefObject<number>;
}

// ===================== HOOK =====================

/**
 * Manages the player-to-segment schedule, segment switching logic,
 * blink warnings before segment transitions, and companion turn signals.
 */
export function useCptmTurnManagement(
  params: CptmTurnManagementParams,
): CptmTurnManagementReturn {
  const {
    initialSegments,
    playersRef,
    phase,
    isPlaying,
    currentTime,
    blinkLeadTime,
    onUpdateGame,
    recordRound,
    setIsPlaying,
    setPhase,
  } = params;

  // ── Schedule ref ──
  const scheduleRef = useRef<CptmScheduleEntry[]>([]);

  // ── Player / segment index state ──
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const currentPlayerIndexRef = useRef(currentPlayerIndex);
  currentPlayerIndexRef.current = currentPlayerIndex;
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);

  const currentPlayer = playersRef.current[currentPlayerIndex];
  const currentSegment = initialSegments[currentSegmentIndex];

  // ── Segment-switch guards ──
  const segmentSwitchHandledRef = useRef(false);
  const transitionHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Blink warning refs ──
  const blinkWarningSentRef = useRef(false);
  const blinkCountdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const blinkCountdownValueRef = useRef(0);

  // ── Build pre-computed player schedule on mount ──
  useEffect(() => {
    const players = playersRef.current;
    const segCount = initialSegments.length;

    // R60 — CRASH-FIX: Leeres Spieler-Roster (z. B. Start über die Companion-
    // Song-Vote vor dem Setup-Abschluss) erzeugte bisher baseRepeats=Infinity /
    // NaN-Pools und Schedule-Einträge auf playerIndex 0 — der erste Segment-
    // Wechsel crashte mit „Cannot read properties of undefined (reading
    // 'segmentsSung')". Ohne Spieler: leerer Schedule, Game-Loop idled sicher.
    if (players.length === 0) {
      scheduleRef.current = [];
      onUpdateGame(players, initialSegments);
      return;
    }

    if (segCount <= 1) {
      const randomIdx = Math.floor(Math.random() * players.length);
      scheduleRef.current = [{ segmentIndex: 0, playerIndex: randomIdx }];
      const randomPlayer = players[randomIdx];
      const assigned = initialSegments.map(seg => ({ ...seg, playerId: randomPlayer.id }));
      setCurrentPlayerIndex(randomIdx);
      onUpdateGame(players, assigned);
      return;
    }

    // Build a pool with equal appearances per player, then shuffle.
    //
    // Fairness: the +1 extras (when segCount % players !== 0) go to a RANDOM
    // subset of players — previously players[0..remainder-1] (always the
    // first-listed players) systematically received the extra segment, so
    // the same players were "up" more often in every single round.
    const baseRepeats = Math.floor(segCount / players.length);
    const remainder = segCount % players.length;
    const extraFor = new Set<number>();
    if (remainder > 0) {
      const indices = players.map((_, i) => i);
      for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
      }
      for (let i = 0; i < remainder; i++) extraFor.add(indices[i]);
    }
    const pool: number[] = [];
    for (let p = 0; p < players.length; p++) {
      const count = baseRepeats + (extraFor.has(p) ? 1 : 0);
      for (let r = 0; r < count; r++) pool.push(p);
    }

    // Fisher-Yates shuffle
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    // Avoid consecutive same-player assignments where possible
    for (let i = 1; i < pool.length; i++) {
      if (pool[i] === pool[i - 1]) {
        for (let j = i + 1; j < pool.length; j++) {
          if (pool[j] !== pool[i]) {
            [pool[i], pool[j]] = [pool[j], pool[i]];
            break;
          }
        }
      }
    }

    const schedule: CptmScheduleEntry[] = initialSegments.map((_, i) => ({
      segmentIndex: i,
      playerIndex: pool[i] ?? 0,
    }));
    scheduleRef.current = schedule;

    const assigned = initialSegments.map((seg, i) => ({
      ...seg,
      playerId: players[schedule[i]?.playerIndex ?? 0]?.id,
    }));

    setCurrentPlayerIndex(schedule[0]?.playerIndex ?? 0);
    onUpdateGame(players, assigned);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Reset transition refs when segment changes ──
  useEffect(() => {
    segmentSwitchHandledRef.current = false;
    blinkWarningSentRef.current = false;
    if (transitionHideTimerRef.current) {
      clearTimeout(transitionHideTimerRef.current);
      transitionHideTimerRef.current = null;
    }
  }, [currentSegmentIndex]);

  // ── Blink warning countdown management ──

  // Clean up blink countdown interval on unmount
  useEffect(() => {
    return () => {
      if (blinkCountdownRef.current) {
        clearInterval(blinkCountdownRef.current);
        blinkCountdownRef.current = null;
      }
    };
  }, []);

  // ── Segment switching with companion turn signals ──
  useEffect(() => {
    if (phase !== 'playing' || !isPlaying || !currentSegment) return;

    const schedule = scheduleRef.current;
    if (!schedule.length) return;

    const isLastSegment = currentSegmentIndex >= initialSegments.length - 1;

    // Send blink warning to NEXT player before segment ends
    if (!isLastSegment && !blinkWarningSentRef.current &&
        currentTime >= currentSegment.endTime - (blinkLeadTime * 1000)) {
      blinkWarningSentRef.current = true;

      const nextEntry = schedule[currentSegmentIndex + 1];
      if (nextEntry) {
        const nextPlayer = playersRef.current[nextEntry.playerIndex];
        if (nextPlayer) {
          const currentCtx = {
            currentPlayerId: playersRef.current[currentPlayerIndexRef.current]?.id,
            currentPlayerName: playersRef.current[currentPlayerIndexRef.current]?.name,
            currentPlayerColor: playersRef.current[currentPlayerIndexRef.current]?.color,
          };
          // Send blink warning with countdown starting at blinkLeadTime
          blinkCountdownValueRef.current = blinkLeadTime;
          sendCompanionTurnSignal(null, nextPlayer.id, blinkLeadTime, true, {
            ...currentCtx,
            nextPlayerName: nextPlayer.name,
            players: buildCptmPlayerInfo(playersRef.current),
          });

          // Countdown every second: 3 → 2 → 1
          if (blinkCountdownRef.current) clearInterval(blinkCountdownRef.current);
          blinkCountdownRef.current = setInterval(() => {
            blinkCountdownValueRef.current--;
            const remaining = blinkCountdownValueRef.current;
            if (remaining > 0) {
              sendCompanionTurnSignal(null, nextPlayer.id, remaining, true, {
                ...currentCtx,
                nextPlayerName: nextPlayer.name,
                players: buildCptmPlayerInfo(playersRef.current),
              });
            } else {
              // Countdown finished — clear interval (turn signal sent at segment switch)
              if (blinkCountdownRef.current) {
                clearInterval(blinkCountdownRef.current);
                blinkCountdownRef.current = null;
              }
            }
          }, 1000);
        }
      }
    }

    // Switch player at segment end (deterministic)
    if (currentTime >= currentSegment.endTime && !segmentSwitchHandledRef.current) {
      segmentSwitchHandledRef.current = true;

      // Clean up blink countdown
      if (blinkCountdownRef.current) {
        clearInterval(blinkCountdownRef.current);
        blinkCountdownRef.current = null;
      }

      if (!isLastSegment) {
        const currentEntry = schedule[currentSegmentIndex];
        const nextSegIdx = currentSegmentIndex + 1;
        const nextEntry = schedule[nextSegIdx];

        // Count segment as sung for the current player
        // R60 — CRASH-FIX: Roster-Eintrag absichern (leeres/partielles Roster
        // darf niemals den Segment-Wechsel-Effekt zum Reißen bringen).
        if (currentEntry && playersRef.current[currentEntry.playerIndex]) {
          playersRef.current[currentEntry.playerIndex].segmentsSung++;
        }

        setCurrentSegmentIndex(nextSegIdx);

        const nextPlayerIdx = nextEntry?.playerIndex ?? currentPlayerIndexRef.current;
        setCurrentPlayerIndex(nextPlayerIdx);

        // Send "YOUR TURN" signal to the next player
        const nextPlayer = playersRef.current[nextPlayerIdx];
        if (nextPlayer) {
          sendCompanionTurnSignal(nextPlayer.id, null, null, true, {
            currentPlayerName: nextPlayer.name,
            currentPlayerColor: nextPlayer.color,
            players: buildCptmPlayerInfo(playersRef.current),
          });
        }

      } else {
        // Song finished — count the last segment for the current player
        const lastEntry = schedule[currentSegmentIndex];
        if (lastEntry && playersRef.current[lastEntry.playerIndex]) {
          playersRef.current[lastEntry.playerIndex].segmentsSung++;
        }
        setIsPlaying(false);
        recordRound();
        setPhase('song-results');
        // Clear all turn signals
        sendCompanionTurnSignal(null, null, null, false, {
          players: buildCptmPlayerInfo(playersRef.current),
        });
      }
    }
  }, [phase, isPlaying, currentTime, currentSegment, currentSegmentIndex, initialSegments, blinkLeadTime, recordRound, setIsPlaying, setPhase]);

  return {
    currentPlayerIndex,
    currentSegmentIndex,
    currentPlayer,
    currentPlayerIndexRef,
  };
}
