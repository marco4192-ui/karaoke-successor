'use client';

/**
 * rAF scoring game loop for simultaneous per-player Battle Royale scoring
 * (mic + companion players, R14 pitch hold, R9 60ms cadence, ghost-note
 * samples, store-write throttling 6.1). Extracted from
 * use-battle-royale-game.ts (R4) — logic byte-identical.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { updatePlayerScore } from '@/lib/game/battle-royale';
import type { BattleRoyaleGame, BattleRoyalePlayer } from '@/lib/game/battle-royale';
import { getVisibleNotes, NOTE_WINDOW } from '@/lib/game/note-utils';
import { evaluateAndScoreTick } from '@/lib/game/party-scoring';
import type { Song, Note, LyricLine, Difficulty } from '@/types/game';
import type { UseMultiPitchDetectorReturn } from '@/hooks/use-multi-pitch-detector';
import type { useBattleRoyaleCompanionPolling } from '@/hooks/use-battle-royale-companion-polling';
import { getActiveNotesAtTime, EMPTY_VISIBLE_NOTES } from './note-utils';
import { snapshotBrPerformance, MAX_BR_PERF_SAMPLES } from './note-performance';
import type { BrNotePerformanceSample } from './note-performance';
import type { BattleRoyaleTimingData } from './use-timing-data';

interface UseBattleRoyaleScoringLoopParams {
  gameRef: React.RefObject<BattleRoyaleGame>;
  roundEndingRef: React.RefObject<boolean>;
  activePlayersRef: React.RefObject<BattleRoyalePlayer[]>;
  pausedRef: React.RefObject<boolean>;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  multiPitchRef: React.RefObject<UseMultiPitchDetectorReturn>;
  companionPitchCacheRef: ReturnType<typeof useBattleRoyaleCompanionPolling>['companionPitchCacheRef'];
  difficultyRef: React.RefObject<Difficulty>;
  currentSongRef: React.RefObject<Song | null>;
  timingDataRef: React.RefObject<BattleRoyaleTimingData | null>;
  showNoteHighwaySettingRef: React.RefObject<boolean>;
  visibleNotesRef: React.RefObject<Array<Note & { lineIndex: number; line: LyricLine }>>;
  mountedRef: React.RefObject<boolean>;
  onUpdateGameRef: React.RefObject<(_game: BattleRoyaleGame) => void>;
}

interface UseBattleRoyaleScoringLoopReturn {
  currentTime: number;
  setCurrentTime: (_time: number) => void;
  /** rAF handle of the running scoring loop (cancelled by the playback-init cleanup). */
  gameLoopRef: React.RefObject<number | null>;
  startGameLoopRef: React.RefObject<() => void>;
  /** Not-yet-flushed score accumulation (read by the mid-round elimination
   *  path so elimination decisions see the very latest scores). */
  pendingScoredGameRef: React.RefObject<BattleRoyaleGame | null>;
  lastValidPitchRef: React.RefObject<Map<string, { note: number; at: number }>>;
  /** Per-player note performance samples (ghost notes): playerId → noteKey → samples. */
  brNotePerformanceRef: React.RefObject<Map<string, Map<string, BrNotePerformanceSample[]>>>;
  brNotePerformance: Map<string, Map<string, BrNotePerformanceSample[]>>;
  setBrNotePerformance: (_performance: Map<string, Map<string, BrNotePerformanceSample[]>>) => void;
}

export function useBattleRoyaleScoringLoop({
  gameRef,
  roundEndingRef,
  activePlayersRef,
  pausedRef,
  audioRef,
  multiPitchRef,
  companionPitchCacheRef,
  difficultyRef,
  currentSongRef,
  timingDataRef,
  showNoteHighwaySettingRef,
  visibleNotesRef,
  mountedRef,
  onUpdateGameRef,
}: UseBattleRoyaleScoringLoopParams): UseBattleRoyaleScoringLoopReturn {
  const [currentTime, setCurrentTime] = useState(0);
  const gameLoopRef = useRef<number | null>(null);
  const lastCurrentTimeUpdateRef = useRef(0);

  /** Store-write throttling (user rule 6.1): scores accumulate here between
   *  throttled store writes — see the game loop for the full rationale. */
  const pendingScoredGameRef = useRef<BattleRoyaleGame | null>(null);
  const lastStoreWriteRef = useRef(0);

  // ── R14 (user request 6 — “Ausfälle bei der Wertung”): pitch hold ──
  // A single null detection frame (YIN miss on a note onset/vibrato turn,
  // momentary volume dip, rAF cadence mismatch with the 60ms scoring tick)
  // used to skip that scoring tick entirely — sustained singing regularly
  // produced gaps in the rating. We now bridge short dropouts: while the
  // microphone is still audible (volume above silence level) the last valid
  // pitch keeps scoring for up to PITCH_HOLD_MS. Real pauses (volume → 0)
  // are NOT bridged, and neither are long dropouts.
  const PITCH_HOLD_MS = 200;
  /** volume (0–1, amplified) above which a null-pitch frame counts as "still singing, detector just missed". */
  const PITCH_HOLD_MIN_VOLUME = 0.04;
  const lastValidPitchRef = useRef<Map<string, { note: number; at: number }>>(new Map());

  // ── Per-player note performance (ghost notes) ─────────────────────
  // Written on every scoring tick inside the rAF game loop (plain ref, no
  // render), synced into React state throttled at 200 ms — the same refs +
  // throttled-state pattern the store writes use (rule 6.1) so the party
  // tree doesn't re-render at tick rate.
  const brNotePerformanceRef = useRef<Map<string, Map<string, BrNotePerformanceSample[]>>>(new Map());
  const [brNotePerformance, setBrNotePerformance] = useState<Map<string, Map<string, BrNotePerformanceSample[]>>>(new Map());
  const lastPerfSyncRef = useRef(0);

  /** Push a visual sample for a player + note (stable key formula: note.id || `note-${startTime}`). */
  const pushPerformanceSample = useCallback((playerId: string, note: Note, sample: BrNotePerformanceSample) => {
    const noteKey = note.id || `note-${note.startTime}`;
    let playerMap = brNotePerformanceRef.current.get(playerId);
    if (!playerMap) {
      playerMap = new Map();
      brNotePerformanceRef.current.set(playerId, playerMap);
    }
    let samples = playerMap.get(noteKey);
    if (!samples) {
      samples = [];
      playerMap.set(noteKey, samples);
    }
    if (samples.length >= MAX_BR_PERF_SAMPLES) samples.splice(0, samples.length - MAX_BR_PERF_SAMPLES + 1);
    samples.push(sample);
  }, []);

  // ── Game Loop for simultaneous per-player scoring ──────────────────
  const startGameLoopRef = useRef<() => void>(() => {});

  // ── Store-write throttling (user rule 6.1: stutter even without 4 mics) ──
  // Every scoring tick used to push the whole game object into the party
  // store (~10 Hz), re-rendering the entire party tree — the visible hitch
  // of the note highway whenever singing was evaluated. Scores now
  // accumulate in a ref and the store is written at most every 400 ms.
  // gameRef is kept fresh on EVERY tick (plain ref assignment, no render),
  // so round-end handlers (elimination) still see the very latest scores.
  const STORE_WRITE_INTERVAL_MS = 400;

  const startGameLoop = useCallback(() => {
    // R9 (user request 2.3 — latency): 100 → 60 ms scoring cadence. The tick
    // only does light math per player (evaluate + score update), so the extra
    // 6-7 ticks/s cost nothing measurable while cutting the average
    // pitch→score latency by ~20 ms.
    const TICK_INTERVAL = 60;
    let lastTickTime = performance.now();

    const gameLoop = (timestamp: number) => {
      if (roundEndingRef.current) return; // Stop immediately when round is ending
      if (gameRef.current.status !== 'playing') return;
      // Skip scoring ticks while paused (audio is paused, don't score silence)
      if (pausedRef.current) { gameLoopRef.current = requestAnimationFrame(gameLoop); return; }

      const deltaTime = timestamp - lastTickTime;

      // Update visible notes every frame — but ONLY when the note highway is
      // shown (Fix 15). When hidden, pin a stable empty array so consumers see
      // a constant reference instead of per-frame recomputation.
      const tdForVis = timingDataRef.current;
      const currentAudioTimeForVis = audioRef.current ? audioRef.current.currentTime * 1000 : 0;
      if (tdForVis) {
        if (showNoteHighwaySettingRef.current) {
          visibleNotesRef.current = getVisibleNotes(tdForVis.allNotes, currentAudioTimeForVis, NOTE_WINDOW);
        } else {
          visibleNotesRef.current = EMPTY_VISIBLE_NOTES;
        }
      }

      if (audioRef.current) {
        const now = performance.now();
        if (now - lastCurrentTimeUpdateRef.current >= 25) {
          setCurrentTime(audioRef.current.currentTime * 1000);
          lastCurrentTimeUpdateRef.current = now;
        }
      }

      const td = timingDataRef.current;
      if (deltaTime >= TICK_INTERVAL && td && currentSongRef.current) {
        lastTickTime = timestamp;

        const currentAudioTime = audioRef.current ? audioRef.current.currentTime * 1000 : currentTime;

        // Resume from the not-yet-flushed accumulation (never lose scores
        // to a throttled store write), else from the latest game ref.
        let batchedGame = pendingScoredGameRef.current ?? gameRef.current;
        let scoreChanged = false;

        const activeNotes = getActiveNotesAtTime(td.allNotes, currentAudioTime);

        if (activeNotes.length > 0) {
          const micPlayers = activePlayersRef.current.filter(p => p.playerType === 'microphone');
          const companionPlayers = activePlayersRef.current.filter(p => p.playerType === 'companion');

          const comboMap = new Map(batchedGame.players.map(p => [p.id, p.currentCombo]));

          /** Pick the active note closest to the player's detected pitch. */
          const findClosestNote = (detectedNote: number) => {
            if (activeNotes.length === 1) return activeNotes[0];
            let best = activeNotes[0];
            let bestDist = Math.abs(detectedNote - best.pitch);
            for (let i = 1; i < activeNotes.length; i++) {
              const dist = Math.abs(detectedNote - activeNotes[i].pitch);
              if (dist < bestDist) { bestDist = dist; best = activeNotes[i]; }
            }
            return best;
          };

          /** Shared scoring tick for a single player (mic or companion).
           *  Returns [updatedGame, activeNote, tick] so callers can reuse evaluation results. */
          const scorePlayerTick = (
            playerId: string,
            detectedNote: number,
            currentGame: BattleRoyaleGame,
          ): { game: BattleRoyaleGame; activeNote: Note; tick: { accuracy: number; hit: boolean } } => {
            const activeNote = findClosestNote(detectedNote);
            const tick = evaluateAndScoreTick(detectedNote, activeNote, difficultyRef.current, td.scoringMetadata);

            let updatedGame: BattleRoyaleGame;
            if (tick.hit) {
              // R19: raw points — the bounty multiplier was removed together
              // with the bounty system (per-round scores, user decision).
              const adjustedPoints = Math.round(tick.points);
              updatedGame = updatePlayerScore(
                currentGame,
                playerId,
                adjustedPoints,
                tick.accuracy,
                1, 0, 1,
              );
            } else {
              const currentCombo = comboMap.get(playerId) || 0;
              if (currentCombo > 0) {
                updatedGame = updatePlayerScore(
                  currentGame,
                  playerId,
                  0, 0, 0, 1,
                  -currentCombo,
                );
              } else {
                updatedGame = currentGame;
              }
            }
            return { game: updatedGame, activeNote, tick };
          };

          // Score all active MICROPHONE players — each with THEIR OWN pitch detector.
          // R9 (user request 2.1 — "nur jeder zweite Ton wird gewertet"): the
          // isSinging gate is REMOVED from scoring. The VocalDetector classifies
          // sustained steady notes (low pitch variance, no fresh onset) as
          // "humming" — exactly what a held karaoke syllable looks like — so the
          // gate dropped ticks in a regular per-note rhythm (same fix the
          // single-player mode already made, see use-note-scoring.ts P1).
          // Pitch presence + the detector's own volume/noise gates filter noise.
          // R14 (user request 6): + pitch hold — see lastValidPitchRef above.
          for (const player of micPlayers) {
            const playerPitch = multiPitchRef.current.getPlayerPitch(player.id);

            let detectedNote: number | null = null;
            if (playerPitch && playerPitch.note != null) {
              detectedNote = playerPitch.note;
              lastValidPitchRef.current.set(player.id, { note: detectedNote, at: currentAudioTime });
            } else {
              const lastValid = lastValidPitchRef.current.get(player.id);
              const stillAudible = (playerPitch?.volume ?? 0) >= PITCH_HOLD_MIN_VOLUME;
              // diff >= 0 guards the round change: each round loads a new
              // <audio> element, so currentAudioTime resets to 0 and a bare
              // `diff <= PITCH_HOLD_MS` would bridge a stale pitch for the
              // whole following round.
              const diff = lastValid ? currentAudioTime - lastValid.at : -1;
              if (lastValid && stillAudible && diff >= 0 && diff <= PITCH_HOLD_MS) {
                detectedNote = lastValid.note; // bridge the dropout
              }
            }
            if (detectedNote == null) continue;

            const { game: updatedGame, activeNote, tick } = scorePlayerTick(player.id, detectedNote, batchedGame);
            // Ghost notes: record the visual sample (hit or wrong-pitch miss
            // at the player's actually-sung pitch) for this player + note.
            pushPerformanceSample(player.id, activeNote, {
              time: currentAudioTime,
              accuracy: tick.accuracy,
              hit: tick.hit,
              sungPitch: detectedNote,
            });
            if (updatedGame !== batchedGame) {
              batchedGame = updatedGame;
              scoreChanged = true;
            }
          }

          // Score all active COMPANION players (uses polling cache)
          // Item 8.1: cache is keyed by profile id (BR player ids ARE profile
          // ids), so companion pitch flows into BR scoring like CPTM/PTM.
          for (const player of companionPlayers) {
            const cachedPitch = companionPitchCacheRef.current.get(player.id);

            // R9 (2.1): isSinging gate removed for companions too (see mic
            // loop above) — score on detected pitch presence.
            // R14 (6): same pitch hold as mic players — the phone-side
            // detector misses frames just like the local YIN does.
            if (cachedPitch) {
              let detectedNote: number | null = null;
              if (cachedPitch.note != null) {
                detectedNote = cachedPitch.note;
                lastValidPitchRef.current.set(player.id, { note: detectedNote, at: currentAudioTime });
              } else {
                const lastValid = lastValidPitchRef.current.get(player.id);
                // Companions transmit no volume — the time window alone
                // bounds the bridge (phone-side staleness is handled by the
                // polling hook's eviction).
                const diff = lastValid ? currentAudioTime - lastValid.at : -1;
                if (lastValid && diff >= 0 && diff <= PITCH_HOLD_MS) {
                  detectedNote = lastValid.note;
                }
              }
              if (detectedNote != null) {
                const { game: updatedGame, activeNote, tick } = scorePlayerTick(player.id, detectedNote, batchedGame);
                // Ghost notes (companions too): same sample recording as the
                // mic players so their misses also render as ghost bars.
                pushPerformanceSample(player.id, activeNote, {
                  time: currentAudioTime,
                  accuracy: tick.accuracy,
                  hit: tick.hit,
                  sungPitch: detectedNote,
                });
                if (updatedGame !== batchedGame) {
                  batchedGame = updatedGame;
                  scoreChanged = true;
                }
              }
            }
          }
        }

        // ── Ghost-note state sync (throttled 200 ms) ──────────────────
        // Replaces the removed Item-3 sync: per-player samples exist again,
        // so the note highway can render strips + ghosts like the other
        // modes. Immutable snapshot → new Map identities → memo-safe.
        const nowPerfSync = performance.now();
        if (
          nowPerfSync - lastPerfSyncRef.current >= 200 &&
          brNotePerformanceRef.current.size > 0 &&
          mountedRef.current
        ) {
          lastPerfSyncRef.current = nowPerfSync;
          setBrNotePerformance(snapshotBrPerformance(brNotePerformanceRef.current, currentAudioTime));
        }

        if (scoreChanged) {
          // Accumulate + keep gameRef current WITHOUT re-rendering (plain ref
          // assignment) — round-end handlers read gameRef and must see these
          // scores even if the throttled store write hasn't happened yet.
          pendingScoredGameRef.current = batchedGame;
          gameRef.current = batchedGame;
        }
        // Throttled store write (6.1): at most every 400 ms — the party tree
        // re-renders ~2.5×/s instead of ~10×/s while singing is evaluated.
        const nowWrite = performance.now();
        if (
          pendingScoredGameRef.current &&
          nowWrite - lastStoreWriteRef.current >= STORE_WRITE_INTERVAL_MS &&
          mountedRef.current &&
          !roundEndingRef.current
        ) {
          lastStoreWriteRef.current = nowWrite;
          onUpdateGameRef.current(pendingScoredGameRef.current);
          pendingScoredGameRef.current = null;
        }
      }

      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };

    gameLoopRef.current = requestAnimationFrame(gameLoop);
  }, []);

  useEffect(() => { startGameLoopRef.current = startGameLoop; }, [startGameLoop]);

  return {
    currentTime,
    setCurrentTime,
    gameLoopRef,
    startGameLoopRef,
    pendingScoredGameRef,
    lastValidPitchRef,
    brNotePerformanceRef,
    brNotePerformance,
    setBrNotePerformance,
  };
}
