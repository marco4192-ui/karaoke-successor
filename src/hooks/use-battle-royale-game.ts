'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  getActivePlayers,
  getPlayersByScore,
  getBattleRoyaleStats,
  updatePlayerScore,
  BattleRoyaleGame,
  BattleRoyalePlayer,
  BattleRoyaleRound,
} from '@/lib/game/battle-royale';
import { Song, Note, Difficulty } from '@/types/game';
import { usePitchDetector } from '@/hooks/use-pitch-detector';
import { calculateScoringMetadata } from '@/lib/game/scoring';
import { evaluateAndScoreTick } from '@/lib/game/party-scoring';
import { useBattleRoyaleSongMedia } from '@/hooks/use-battle-royale-song-media';
import { useBattleRoyaleCompanionPolling } from '@/hooks/use-battle-royale-companion-polling';
import { useBattleRoyaleRoundTimer } from '@/hooks/use-battle-royale-round-timer';
import { useBattleRoyaleRoundHandlers } from '@/hooks/use-battle-royale-round-handlers';

/**
 * Find all notes active at a given time using binary search.
 * Notes are sorted by startTime — this is O(log n + k) instead of O(n)
 * where k = number of active notes (typically 2-5).
 */
function getActiveNotesAtTime(notes: Note[], timeMs: number): Note[] {
  if (notes.length === 0) return [];

  // Binary search for the first note whose startTime + duration >= timeMs
  let lo = 0;
  let hi = notes.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (notes[mid].startTime + notes[mid].duration < timeMs) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }

  const result: Note[] = [];
  // Scan forward from the found index (notes starting before or at timeMs)
  // and collect all notes whose time window includes timeMs
  for (let i = lo; i < notes.length; i++) {
    const note = notes[i];
    if (note.startTime > timeMs) break; // past all possible active notes
    if (timeMs >= note.startTime && timeMs <= note.startTime + note.duration) {
      result.push(note);
    }
  }
  return result;
}

interface UseBattleRoyaleGameParams {
  game: BattleRoyaleGame;
  songs: Song[];
  onUpdateGame: (game: BattleRoyaleGame) => void;
}

interface UseBattleRoyaleGameReturn {
  showElimination: boolean;
  stats: ReturnType<typeof getBattleRoyaleStats>;
  sortedPlayers: BattleRoyalePlayer[];
  activePlayers: BattleRoyalePlayer[];
  currentRound: BattleRoyaleRound | undefined;
  difficulty: Difficulty;
  currentSong: Song | null;
  currentTime: number;
  roundTimeLeft: number;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  handleRoundEnd: () => void;
  handleStartRound: () => void;
  setCurrentTime: (time: number) => void;
}

export function useBattleRoyaleGame({ game, songs, onUpdateGame }: UseBattleRoyaleGameParams): UseBattleRoyaleGameReturn {
  const [showElimination, setShowElimination] = useState(false);
  const stats = getBattleRoyaleStats(game);

  const sortedPlayers = useMemo(() => getPlayersByScore(game), [game]);
  const activePlayers = useMemo(() => getActivePlayers(game), [game]);
  const currentRound = game.rounds[game.rounds.length - 1];

  // Get difficulty from game settings
  const difficulty = game.settings.difficulty || 'medium';

  // ── Song & Media ───────────────────────────────────────────────────
  const {
    currentSong,
    mediaLoaded,
    audioRef,
    videoRef,
    resolvedAudioUrlRef,
    resolvedVideoUrlRef,
    audioHasPlayedRef,
  } = useBattleRoyaleSongMedia({
    currentRoundSongId: currentRound?.songId,
    songs,
    gameCurrentRound: game.currentRound,
  });

  // ── Companion Pitch Polling ────────────────────────────────────────
  const { companionPitchCacheRef } = useBattleRoyaleCompanionPolling({
    gameStatus: game.status,
    players: game.players,
  });

  // ── Pitch Detection (local microphone) ────────────────────────────
  const { isInitialized: pitchInitialized, pitchResult, initialize: initPitch, start: startPitch, stop: stopPitch } = usePitchDetector();

  // Ref for pitch result — avoids stale closure in game loop
  const pitchResultRef = useRef(pitchResult);
  pitchResultRef.current = pitchResult;

  // ── Game State ─────────────────────────────────────────────────────
  const [currentTime, setCurrentTime] = useState(0);
  const gameLoopRef = useRef<number | null>(null);
  // Throttle setCurrentTime to ~20fps (50ms) — UI display doesn't need 60fps.
  // Scoring uses audioRef.current.currentTime directly, not the state value.
  const lastCurrentTimeUpdateRef = useRef(0);

  // ── Pre-compute timing data for scoring when song is loaded ────────
  const timingData = useMemo(() => {
    if (!currentSong || currentSong.lyrics.length === 0) return null;

    // Create flat array of all notes
    const allNotes: Array<Note & { lineIndex: number }> = [];
    currentSong.lyrics.forEach((line, lineIndex) => {
      line.notes.forEach(note => {
        allNotes.push({ ...note, lineIndex });
      });
    });
    allNotes.sort((a, b) => a.startTime - b.startTime);

    // Calculate beat duration
    const beatDurationMs = currentSong.bpm ? 15000 / currentSong.bpm : 500;

    // Calculate scoring metadata
    const scoringMetadata = calculateScoringMetadata(allNotes, beatDurationMs);

    return { allNotes, beatDuration: beatDurationMs, scoringMetadata };
  }, [currentSong]);

  // Ref for timing data — placed after declaration so TS is happy
  const timingDataRef = useRef(timingData);
  timingDataRef.current = timingData;
  // Ref for currentSong — avoids stale closure in the game loop rAF
  const currentSongRef = useRef(currentSong);
  currentSongRef.current = currentSong;

  // ── Random song picker ─────────────────────────────────────────────
  const getRandomSong = useCallback((): Song | null => {
    const playableSongs = songs.filter(s =>
      s.audioUrl || s.relativeAudioPath || s.storedMedia
    );
    if (playableSongs.length === 0) return null;
    return playableSongs[Math.floor(Math.random() * playableSongs.length)];
  }, [songs]);

  // ── Round Handlers (start/end/elimination) ────────────────────────
  const {
    handleRoundEnd,
    handleStartRound,
    handleRoundEndRef,
    activePlayersRef,
    gameRef,
  } = useBattleRoyaleRoundHandlers({
    game,
    activePlayers,
    onUpdateGame,
    stopPitch,
    audioRef,
    videoRef,
    audioHasPlayedRef,
    getRandomSong,
    setShowElimination,
  });

  // ── Round Timer ────────────────────────────────────────────────────
  const { roundTimeLeft } = useBattleRoyaleRoundTimer({
    gameStatus: game.status,
    roundDuration: currentRound?.duration,
    gameCurrentRound: game.currentRound,
    handleRoundEndRef,
  });

  // ── Game Initialization & Playback ─────────────────────────────────
  useEffect(() => {
    if (game.status === 'playing' && mediaLoaded && currentSong) {
      // Cancellation flag — prevents the async body from continuing after cleanup
      let cancelled = false;

      // Initialize pitch detection
      const initGame = async () => {
        if (!pitchInitialized) {
          await initPitch();
        }
        // Guard: if the effect was cleaned up while awaiting initPitch(),
        // do NOT start pitch detection, playback, or the game loop.
        if (cancelled) return;

        startPitch();

        // Wait for audio element to be ready before playing
        const audio = audioRef.current;
        if (audio && resolvedAudioUrlRef.current) {
          if (audio.readyState >= 3) { // HAVE_FUTURE_DATA or higher
            audio.play()
              .then(() => { audioHasPlayedRef.current = true; })
              .catch(e => console.error('Audio play error:', e));
          } else {
            const onCanPlay = () => {
              audio.removeEventListener('canplay', onCanPlay);
              if (!cancelled) {
                audio.play()
                  .then(() => { audioHasPlayedRef.current = true; })
                  .catch(e => console.error('Audio play error:', e));
              }
            };
            audio.addEventListener('canplay', onCanPlay);
          }
        } else {
          console.warn('[BattleRoyale] No audio URL resolved — starting without audio');
        }
        if (videoRef.current && resolvedVideoUrlRef.current) {
          videoRef.current.play().catch(e => console.error('Video play error:', e));
        }

        // Start game loop for simultaneous scoring
        startGameLoop();
      };

      initGame();

      return () => {
        cancelled = true;
        stopPitch();
        if (gameLoopRef.current) {
          cancelAnimationFrame(gameLoopRef.current);
        }
      };
    }
  }, [game.status, mediaLoaded, currentSong, pitchInitialized, initPitch, startPitch, stopPitch]);

  // ── Game Loop for simultaneous scoring (Champions League) ──────────
  const startGameLoop = () => {
    const TICK_INTERVAL = 100; // 100ms between scoring evaluations
    let lastTickTime = performance.now();

    const gameLoop = (timestamp: number) => {
      if (gameRef.current.status !== 'playing') return;

      const deltaTime = timestamp - lastTickTime;

      // Update current time from audio (throttled to ~20fps)
      if (audioRef.current) {
        const now = performance.now();
        if (now - lastCurrentTimeUpdateRef.current >= 50) {
          setCurrentTime(audioRef.current.currentTime * 1000);
          lastCurrentTimeUpdateRef.current = now;
        }
      }

      // Evaluate scoring for all active players simultaneously
      const td = timingDataRef.current;
      if (deltaTime >= TICK_INTERVAL && td && currentSongRef.current) {
        lastTickTime = timestamp;

        // Get the detected pitch from local microphone (via ref — avoids stale closure)
        const currentPitchResult = pitchResultRef.current;
        const detectedPitch = currentPitchResult?.note; // MIDI note number
        const isSinging = currentPitchResult?.isSinging;

        // Find active notes at current time
        const currentAudioTime = audioRef.current ? audioRef.current.currentTime * 1000 : currentTime;

        // Accumulate all score updates into a single batch to avoid losing
        // intermediate results when multiple players score in the same tick.
        let batchedGame = gameRef.current;

        const activeNotes = getActiveNotesAtTime(td.allNotes, currentAudioTime);

        for (const note of activeNotes) {
          // Score all active MICROPHONE players (local mic, shared pitch)
          // Skip scoring if vocal detection classifies input as humming/noise
          const micPlayers = activePlayersRef.current.filter(p => p.playerType === 'microphone' && !p.eliminated);

          for (const player of micPlayers) {
            if (isSinging === false) continue; // Humming/noise detected
            // Skip scoring entirely when no pitch is detected - passing MIDI 0
            // would cause false misses and incorrect combo resets
            if (detectedPitch == null) continue;
            const tick = evaluateAndScoreTick(detectedPitch, note, difficulty, td.scoringMetadata);

            if (tick.hit) {
              batchedGame = updatePlayerScore(
                batchedGame,
                player.id,
                tick.points,
                tick.accuracy,
                1, 0, 1
              );
            } else {
              // Miss: reset combo (but don't inflate notesMissed per tick)
              const p = batchedGame.players.find(pl => pl.id === player.id);
              if (p && p.currentCombo > 0) {
                batchedGame = updatePlayerScore(
                  batchedGame,
                  player.id,
                  0, 0, 0, 0,
                  -(p.currentCombo) // Reset combo to 0
                );
              }
            }
          }

          // Score all active COMPANION players (pitch from their phones)
          const companionPlayers = activePlayersRef.current.filter(p => p.playerType === 'companion' && !p.eliminated);

          for (const player of companionPlayers) {
            // Look up companion's submitted pitch from cache
            const cachedPitch = player.connectionCode
              ? companionPitchCacheRef.current.get(player.connectionCode)
              : null;

            if (cachedPitch && cachedPitch.note > 0 && cachedPitch.isSinging === true) {
              const tick = evaluateAndScoreTick(cachedPitch.note, note, difficulty, td.scoringMetadata);

              if (tick.hit) {
                batchedGame = updatePlayerScore(
                  batchedGame,
                  player.id,
                  tick.points,
                  tick.accuracy,
                  1, 0, 1
                );
              } else {
                // Miss: reset combo (but don't inflate notesMissed per tick)
                const p = batchedGame.players.find(pl => pl.id === player.id);
                if (p && p.currentCombo > 0) {
                  batchedGame = updatePlayerScore(
                    batchedGame,
                    player.id,
                    0, 0, 0, 0,
                    -(p.currentCombo) // Reset combo to 0
                  );
                }
              }
            }
          }
        }

        // Single state update per tick — avoids lost intermediate scores
        if (batchedGame !== gameRef.current) {
          onUpdateGame(batchedGame);
        }
      }

      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };

    gameLoopRef.current = requestAnimationFrame(gameLoop);
  };

  return {
    showElimination,
    stats,
    sortedPlayers,
    activePlayers,
    currentRound,
    difficulty,
    currentSong,
    currentTime,
    roundTimeLeft,
    audioRef,
    videoRef,
    handleRoundEnd,
    handleStartRound,
    setCurrentTime,
  };
}
