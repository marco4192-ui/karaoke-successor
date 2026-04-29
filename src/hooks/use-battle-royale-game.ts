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
import { evaluateTick, calculateTickPoints, calculateScoringMetadata } from '@/lib/game/scoring';
import { useBattleRoyaleSongMedia } from '@/hooks/use-battle-royale-song-media';
import { useBattleRoyaleCompanionPolling } from '@/hooks/use-battle-royale-companion-polling';
import { useBattleRoyaleRoundTimer } from '@/hooks/use-battle-royale-round-timer';
import { useBattleRoyaleRoundHandlers } from '@/hooks/use-battle-royale-round-handlers';

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
  const noteProgressRef = useRef<Map<string, { ticksHit: number; ticksTotal: number }>>(new Map());

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

      // Update current time from audio
      if (audioRef.current) {
        setCurrentTime(audioRef.current.currentTime * 1000);
      }

      // Evaluate scoring for all active players simultaneously
      const td = timingDataRef.current;
      if (deltaTime >= TICK_INTERVAL && td && currentSong) {
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

        td.allNotes.forEach(note => {
          // Check if note is currently active (within its time window)
          if (currentAudioTime >= note.startTime && currentAudioTime <= note.startTime + note.duration) {
            // Score all active MICROPHONE players (local mic, shared pitch)
            // Skip scoring if vocal detection classifies input as humming/noise
            const micPlayers = activePlayersRef.current.filter(p => p.playerType === 'microphone' && !p.eliminated);

            micPlayers.forEach(player => {
              if (isSinging === false) return; // Humming/noise detected
              const tickResult = evaluateTick(detectedPitch || 0, note.pitch, difficulty);

              if (tickResult.isHit) {
                const points = calculateTickPoints(
                  tickResult.accuracy,
                  note.isGolden,
                  td.scoringMetadata.pointsPerTick,
                  difficulty
                );

                batchedGame = updatePlayerScore(
                  batchedGame,
                  player.id,
                  points,
                  tickResult.accuracy,
                  1, 0, 1
                );
              }
            });

            // Score all active COMPANION players (pitch from their phones)
            const companionPlayers = activePlayersRef.current.filter(p => p.playerType === 'companion' && !p.eliminated);

            companionPlayers.forEach(player => {
              // Look up companion's submitted pitch from cache
              const cachedPitch = player.connectionCode
                ? companionPitchCacheRef.current.get(player.connectionCode)
                : null;

              if (cachedPitch && cachedPitch.note > 0 && cachedPitch.isSinging === true) {
                const tickResult = evaluateTick(cachedPitch.note, note.pitch, difficulty);

                if (tickResult.isHit) {
                  const points = calculateTickPoints(
                    tickResult.accuracy,
                    note.isGolden,
                    td.scoringMetadata.pointsPerTick,
                    difficulty
                  );

                  batchedGame = updatePlayerScore(
                    batchedGame,
                    player.id,
                    points,
                    tickResult.accuracy,
                    1, 0, 1
                  );
                }
              }
            });
          }
        });

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
