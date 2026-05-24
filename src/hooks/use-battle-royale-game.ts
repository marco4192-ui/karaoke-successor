'use client';

import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  getActivePlayers,
  getPlayersByScore,
  getBattleRoyaleStats,
  updatePlayerScore,
  getBountyMultiplier,
  getCurrentMedleySnippet,
  BattleRoyaleGame,
  BattleRoyalePlayer,
} from '@/lib/game/battle-royale';
import { Song, Note, LyricLine, PitchDetectionResult } from '@/types/game';
import { calculatePitchStats, getVisibleNotes, PitchStats, NOTE_WINDOW } from '@/lib/game/note-utils';
import { useMultiPitchDetector, type PlayerPitchConfig } from '@/hooks/use-multi-pitch-detector';
import { shuffleArray } from '@/lib/utils';
import { calculateScoringMetadata } from '@/lib/game/scoring';
import { evaluateAndScoreTick } from '@/lib/game/party-scoring';
import { useBattleRoyaleSongMedia } from '@/hooks/use-battle-royale-song-media';
import { useBattleRoyaleCompanionPolling } from '@/hooks/use-battle-royale-companion-polling';
import { useBattleRoyaleRoundTimer } from '@/hooks/use-battle-royale-round-timer';
import { usePartyStore } from '@/lib/game/party-store';
import { useBattleRoyaleRoundHandlers } from '@/hooks/use-battle-royale-round-handlers';

function getActiveNotesAtTime(notes: Note[], timeMs: number): Note[] {
  if (notes.length === 0) return [];
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
  for (let i = lo; i < notes.length; i++) {
    const note = notes[i];
    if (note.startTime > timeMs) break;
    if (timeMs >= note.startTime && timeMs <= note.startTime + note.duration) {
      result.push(note);
    }
  }
  return result;
}

interface UseBattleRoyaleGameParams {
  game: BattleRoyaleGame;
  songs: Song[];
  onUpdateGame: (_game: BattleRoyaleGame) => void;
}

interface UseBattleRoyaleGameReturn {
  showElimination: boolean;
  stats: ReturnType<typeof getBattleRoyaleStats>;
  sortedPlayers: BattleRoyalePlayer[];
  activePlayers: BattleRoyalePlayer[];
  currentSong: Song | null;
  currentTime: number;
  roundTimeLeft: number;
  snippetTimeLeft: number | null; // #1 Medley: time left in current snippet
  currentSnippetIndex: number; // #1 Medley
  totalSnippets: number; // #1 Medley
  audioRef: React.RefObject<HTMLAudioElement | null>;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  handleRoundEnd: () => void;
  handleStartRound: () => void;
  handleVoteSubmit: (_playerId: string, _songIndex: number) => void;
  handleStartRoundAfterVote: () => void;
  handleGrandFinaleIntroComplete: () => void;
  setCurrentTime: (_time: number) => void;
  previousRoundScores: Record<string, number>; // #9 Trend tracking
  bountyPlayerId: string | null; // #6 Bounty
  bountyMultiplier: number; // #6 Bounty
  pitchStats: PitchStats | null;
  visibleNotes: Array<Note & { lineIndex: number; line: LyricLine }>;
  detectedPitch: number | null; // Leading player's MIDI note for NoteHighway
  playerPitchMap: Map<string, PitchDetectionResult | null>; // Per-player pitch data
  multiPitchErrors: Map<string, string>; // Per-player pitch errors
  songProgress: number; // 0-100
  countdown: number;
  notePerformance: Map<string, Array<{ time: number; accuracy: number; hit: boolean }>>;
  eliminationPhase: null | 'eliminating' | 'survivor-flash';
}

export function useBattleRoyaleGame({ game, songs, onUpdateGame }: UseBattleRoyaleGameParams): UseBattleRoyaleGameReturn {
  const onUpdateGameRef = useRef(onUpdateGame);
  onUpdateGameRef.current = onUpdateGame;

  const [showElimination, setShowElimination] = useState(false);
  const stats = useMemo(() => getBattleRoyaleStats(game), [game]);

  const sortedPlayers = useMemo(() => getPlayersByScore(game), [game]);
  const activePlayers = useMemo(() => getActivePlayers(game), [game]);
  const currentRound = game.rounds[game.rounds.length - 1];

  // Use effective difficulty (may be escalated) instead of base difficulty
  const difficulty = game.effectiveDifficulty;

  // #1 Medley: current snippet info
  const currentSnippetIndex = game.currentSnippetIndex;
  const totalSnippets = game.medleySnippetList.length;

  // ── Song & Media ───────────────────────────────────────────────────
  // Determine which song to load: medley snippet or main round song
  const currentMedleySnippet = getCurrentMedleySnippet(game);
  const currentRoundSongId = currentMedleySnippet?.songId ?? currentRound?.songId;

  const {
    currentSong,
    mediaLoaded,
    audioRef,
    videoRef,
    resolvedAudioUrlRef,
    resolvedVideoUrlRef,
    audioHasPlayedRef,
  } = useBattleRoyaleSongMedia({
    currentRoundSongId,
    songs,
    gameCurrentRound: game.currentRound,
    medleySnippetIndex: game.medleySnippetList.length > 0 ? game.currentSnippetIndex : undefined,
  });

  // ── Companion Pitch Polling ────────────────────────────────────────
  const { companionPitchCacheRef } = useBattleRoyaleCompanionPolling({
    gameStatus: game.status,
    players: game.players,
  });

  // ── Multi-Pitch Detection (one detector per local mic player) ─────
  // Build player configs from active mic players, each with their own microphoneId.
  // Use a stable key so this only recalculates when player IDs/types/devices change,
  // NOT on every scoring tick (which changes game.players every ~100ms).
  const playerConfigsKey = game.players.map(p => `${p.id}:${p.playerType}:${p.microphoneId ?? ''}`).join('|');
  const playerConfigs = useMemo<PlayerPitchConfig[]>(() =>
    game.players
      .filter(p => p.playerType === 'microphone')
      .map(p => ({
        playerId: p.id,
        type: 'local' as const,
        deviceId: p.microphoneId,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [playerConfigsKey],
  );

  const multiPitch = useMultiPitchDetector({
    players: playerConfigs,
    difficulty,
    autoStart: false,
  });

  // Ref to multiPitch for use in game loop callbacks (avoids stale closure)
  const multiPitchRef = useRef(multiPitch);
  multiPitchRef.current = multiPitch;

  // ── Game State ─────────────────────────────────────────────────────
  const [currentTime, setCurrentTime] = useState(0);
  const gameLoopRef = useRef<number | null>(null);
  const lastCurrentTimeUpdateRef = useRef(0);

  // Note performance tracking for display styles (fill-level, color-feedback, etc.)
  const notePerformanceRef = useRef<Map<string, Array<{ time: number; accuracy: number; hit: boolean }>>>(new Map());
  const prefetchAudioRef = useRef<HTMLAudioElement | null>(null);
  const [notePerformance, setNotePerformance] = useState<Map<string, Array<{ time: number; accuracy: number; hit: boolean }>>>(new Map());
  const lastNotePerfSyncRef = useRef(0);

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

  // ── Pre-compute timing data for scoring ────────────────────────────
  const timingData = useMemo(() => {
    if (!currentSong || currentSong.lyrics.length === 0) return null;
    const allNotes: Array<Note & { lineIndex: number; line: LyricLine }> = [];
    currentSong.lyrics.forEach((line, lineIndex) => {
      line.notes.forEach(note => {
        allNotes.push({ ...note, lineIndex, line });
      });
    });
    allNotes.sort((a, b) => a.startTime - b.startTime);
    const beatDurationMs = currentSong.bpm ? 15000 / currentSong.bpm : 500;
    const scoringMetadata = calculateScoringMetadata(allNotes, beatDurationMs);
    const pitchStats = calculatePitchStats(allNotes);
    return { allNotes, beatDuration: beatDurationMs, scoringMetadata, pitchStats };
  }, [currentSong]);

  // ── Visible notes ref (updated every frame) ────────────────────────
  const visibleNotesRef = useRef<Array<Note & { lineIndex: number; line: LyricLine }>>([]);
  const pitchStatsRef = useRef<PitchStats | null>(null);

  const timingDataRef = useRef(timingData);
  timingDataRef.current = timingData;
  pitchStatsRef.current = timingData?.pitchStats ?? null;
  const currentSongRef = useRef(currentSong);
  currentSongRef.current = currentSong;
  const difficultyRef = useRef(difficulty);
  difficultyRef.current = difficulty;

  // ── Random song picker ─────────────────────────────────────────────
  const getRandomSong = useCallback((excludeIds?: string[]): Song | null => {
    const playableSongs = songs.filter(s =>
      (s.audioUrl || s.relativeAudioPath || s.storedMedia) &&
      (!excludeIds || !excludeIds.includes(s.id))
    );
    if (playableSongs.length === 0) return null;
    return playableSongs[Math.floor(Math.random() * playableSongs.length)];
  }, [songs]);

  const getRandomSongs = useCallback((count: number, excludeIds?: string[]): Song[] => {
    const playableSongs = songs.filter(s =>
      (s.audioUrl || s.relativeAudioPath || s.storedMedia) &&
      (!excludeIds || !excludeIds.includes(s.id))
    );
    const shuffled = shuffleArray(playableSongs);
    return shuffled.slice(0, count);
  }, [songs]);

  // ── Round Handlers ────────────────────────────────────────────────
  const {
    handleRoundEnd,
    handleStartRound,
    handleVoteSubmit,
    handleStartRoundAfterVote,
    handleGrandFinaleIntroComplete,
    handleRoundEndRef,
    handleStartRoundRef,
    onSnippetEndRef,
    activePlayersRef,
    gameRef,
    roundEndingRef,
    eliminationPhase,
  } = useBattleRoyaleRoundHandlers({
    game,
    activePlayers,
    onUpdateGame,
    stopPitch: multiPitch.stop,
    audioRef,
    videoRef,
    audioHasPlayedRef,
    getRandomSong,
    getRandomSongs,
    setShowElimination,
  });

  // Keep gameRefRef in sync with gameRef from round handlers
  useEffect(() => {
    gameRefRef.current = gameRef;
  }, [gameRef]);

  // ── Pause state (read from store, used by game loop + round timer) ───
  const pauseDialogAction = usePartyStore(s => s.pauseDialogAction);
  const pausedRef = useRef(pauseDialogAction === 'song-pause');
  pausedRef.current = pauseDialogAction === 'song-pause';

  // Stop pitch detection while paused (like standard game mode does)
  useEffect(() => {
    if (pauseDialogAction === 'song-pause') {
      multiPitch.stop();
    } else if (pauseDialogAction === null && gameRef.current.status === 'playing') {
      // Restart pitch detection after unpause (game init effect won't re-fire)
      if (!multiPitch.isRunning) {
        multiPitch.start();
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- multiPitch is stable for .stop()/.start()
  }, [pauseDialogAction]);

  // ── Round Timer ────────────────────────────────────────────────────
  const { roundTimeLeft, snippetTimeLeft } = useBattleRoyaleRoundTimer({
    gameStatus: game.status,
    roundDuration: currentRound?.duration,
    gameCurrentRound: game.currentRound,
    handleRoundEndRef,
    medleySnippetList: game.medleySnippetList,
    currentSnippetIndex: game.currentSnippetIndex,
    onSnippetEndRef,
    isPaused: pauseDialogAction === 'song-pause',
  });

  // ── Game Initialization & Playback ─────────────────────────────────
  // Track which round last triggered a fade-in so we can skip the fade on
  // snippet transitions within the same round (Bug #3: audible volume dips).
  const lastFadeInRoundRef = useRef<number>(-1);

  useEffect(() => {
    if (game.status === 'playing' && mediaLoaded && currentSong) {
      let cancelled = false;
      const currentRoundNum = game.currentRound;
      const isNewRound = currentRoundNum !== lastFadeInRoundRef.current;
      // IMPORTANT: Don't fade in during snippet transitions within the same round.
      // Only fade in when a new round starts — snippet transitions should be seamless.
      // Do NOT remove this check — fading on every snippet causes audible volume dips.

      const initGame = async () => {
        // Initialize multi-pitch detector (one per local mic player)
        const ok = await multiPitch.initialize();
        if (cancelled) return;
        if (ok) {
          multiPitch.start();
        } else {
          // eslint-disable-next-line no-console
          console.warn('[BattleRoyale] Multi-pitch initialization failed – mic detection unavailable. Check microphone permissions and ensure at least one player has playerType="microphone".');
        }

        const audio = audioRef.current;
        const fadeInAudio = () => {
          if (!audio) return;
          audio.volume = 0;
          const fadeStart = performance.now();
          const FADE_DURATION = 800; // 800ms fade-in
          const fadeIn = (now: number) => {
            if (cancelled || !audio) return;
            const elapsed = now - fadeStart;
            const progress = Math.min(elapsed / FADE_DURATION, 1);
            audio.volume = Math.max(0, Math.min(1, progress));
            if (progress < 1) requestAnimationFrame(fadeIn);
          };
          requestAnimationFrame(fadeIn);
        };

        const startPlayback = (onReady: () => void) => {
          if (!audio || !resolvedAudioUrlRef.current) return;
          if (audio.readyState >= 3) {
            onReady();
          } else {
            const onCanPlay = () => {
              audio.removeEventListener('canplay', onCanPlay);
              onReady();
            };
            audio.addEventListener('canplay', onCanPlay);
          }
        };

        if (audio && resolvedAudioUrlRef.current) {
          startPlayback(() => {
            if (cancelled || pausedRef.current) return;
            if (isNewRound) {
              // New round: smooth 800ms fade-in from silence
              fadeInAudio();
              lastFadeInRoundRef.current = currentRoundNum;
            } else {
              // Snippet transition within same round: set volume to full immediately
              // so there's no audible dip between snippets.
              audio.volume = 1;
            }
            audio.play()
              .then(() => { audioHasPlayedRef.current = true; })
              // eslint-disable-next-line no-console
              .catch(e => console.error('Audio play error:', e));
          });
        } else {
          // eslint-disable-next-line no-console
          console.warn('[BattleRoyale] No audio URL resolved');
        }
        if (videoRef.current && resolvedVideoUrlRef.current && !pausedRef.current) {
          videoRef.current.play().catch(e => console.error('Video play error:', e));
        }

        startGameLoopRef.current();
      };
      initGame();

      return () => {
        cancelled = true;
        multiPitch.stop();
        if (gameLoopRef.current) {
          cancelAnimationFrame(gameLoopRef.current);
        }
        notePerformanceRef.current.clear();
        setNotePerformance(new Map());
      };
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.status, mediaLoaded, currentSong]);

  // ── Pre-fetch next song during last 5 seconds of round ──
  const prefetchedSongRef = useRef<Song | null>(null);
  const prefetchedMediaRef = useRef<{ audioUrl?: string; videoUrl?: string } | null>(null);

  useEffect(() => {
    if (
      game.status !== 'playing' ||
      roundTimeLeft > 5 ||
      roundTimeLeft === 0 ||
      game.settings.songSelection === 'vote' // can't pre-pick in voting mode
    ) return;

    // Only pre-fetch once per round
    if (prefetchedSongRef.current) return;

    const preFetch = async () => {
      try {
        // Pick a random song (same logic as handleStartRound)
        const recentlyPlayed = game.recentlyPlayedSongIds || [];
        const candidates = songs.filter(
          s => s.audioUrl && !recentlyPlayed.includes(s.id)
        );
        if (candidates.length === 0) return;

        const randomIndex = Math.floor(Math.random() * candidates.length);
        const nextSong = candidates[randomIndex];

        // Pre-resolve URLs
        let preparedSong = nextSong;
        try {
          const { ensureSongUrls } = await import('@/lib/game/song-url-restore');
          preparedSong = await ensureSongUrls(nextSong);
        } catch { /* non-critical */ }

        prefetchedSongRef.current = preparedSong;

        // Pre-warm audio element
        if (preparedSong.audioUrl && audioRef.current) {
          prefetchAudioRef.current = new Audio();
          prefetchAudioRef.current.preload = 'auto';
          prefetchAudioRef.current.src = preparedSong.audioUrl;
          prefetchedMediaRef.current = { audioUrl: preparedSong.audioUrl };
        }
      } catch {
        // eslint-disable-next-line no-console
        console.warn('[BattleRoyale] Pre-fetch failed');
      }
    };

    preFetch();

    return () => {
      // Clear pre-fetch when round ends (new game state)
      if (prefetchAudioRef.current) {
        prefetchAudioRef.current.pause();
        prefetchAudioRef.current.src = '';
        prefetchAudioRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.status, roundTimeLeft, songs, game.recentlyPlayedSongIds, game.settings.songSelection]);

  // Clear prefetch ref when round changes
  useEffect(() => {
    prefetchedSongRef.current = null;
    prefetchedMediaRef.current = null;
  }, [game.currentRound]);

  // ── Game Loop for simultaneous per-player scoring ──────────────────
  const startGameLoopRef = useRef<() => void>(() => {});

  const startGameLoop = useCallback(() => {
    const TICK_INTERVAL = 100;
    let lastTickTime = performance.now();

    const gameLoop = (timestamp: number) => {
      if (roundEndingRef.current) return; // Stop immediately when round is ending
      if (gameRef.current.status !== 'playing') return;
      // Skip scoring ticks while paused (audio is paused, don't score silence)
      if (pausedRef.current) { gameLoopRef.current = requestAnimationFrame(gameLoop); return; }

      const deltaTime = timestamp - lastTickTime;

      // Update visible notes every frame
      const tdForVis = timingDataRef.current;
      const currentAudioTimeForVis = audioRef.current ? audioRef.current.currentTime * 1000 : 0;
      if (tdForVis) {
        visibleNotesRef.current = getVisibleNotes(tdForVis.allNotes, currentAudioTimeForVis, NOTE_WINDOW);
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

        let batchedGame = gameRef.current;
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
              const bountyMult = getBountyMultiplier(currentGame, playerId);
              const adjustedPoints = Math.round(tick.points * bountyMult);
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

          // Score all active MICROPHONE players — each with THEIR OWN pitch detector
          for (const player of micPlayers) {
            const playerPitch = multiPitchRef.current.getPlayerPitch(player.id);
            if (!playerPitch) continue;
            if (playerPitch.isSinging === false) continue;
            if (playerPitch.note == null) continue;

            const { game: updatedGame, activeNote, tick } = scorePlayerTick(player.id, playerPitch.note, batchedGame);
            if (updatedGame !== batchedGame) {
              batchedGame = updatedGame;
              scoreChanged = true;
            }

            // Record performance sample for note display styles
            const perfNoteId = activeNote.id || `note-${activeNote.startTime}`;
            let perfSamples = notePerformanceRef.current.get(perfNoteId);
            if (!perfSamples) {
              perfSamples = [];
              notePerformanceRef.current.set(perfNoteId, perfSamples);
            }
            perfSamples.push({ time: currentAudioTime, accuracy: tick.accuracy, hit: tick.hit });
            if (perfSamples.length > 100) {
              notePerformanceRef.current.set(perfNoteId, perfSamples.slice(-100));
            }
          }

          // Score all active COMPANION players (uses polling cache)
          for (const player of companionPlayers) {
            const cachedPitch = player.connectionCode
              ? companionPitchCacheRef.current.get(player.connectionCode)
              : null;

            if (cachedPitch && cachedPitch.note > 0 && cachedPitch.isSinging === true) {
              const { game: updatedGame } = scorePlayerTick(player.id, cachedPitch.note, batchedGame);
              if (updatedGame !== batchedGame) {
                batchedGame = updatedGame;
                scoreChanged = true;
              }
            }
          }
        }

        // Sync note performance to state at ~60Hz for visual display
        const perfNow = performance.now();
        if (perfNow - lastNotePerfSyncRef.current >= 16) {
          lastNotePerfSyncRef.current = perfNow;
          setNotePerformance(new Map(notePerformanceRef.current));
        }

        if (scoreChanged && mountedRef.current && !roundEndingRef.current) {
          onUpdateGameRef.current(batchedGame);
        }
      }

      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };

    gameLoopRef.current = requestAnimationFrame(gameLoop);
  }, []);

  useEffect(() => { startGameLoopRef.current = startGameLoop; }, [startGameLoop]);

  // ── Derive detectedPitch for NoteHighway (leading active mic player) ─
  // The NoteHighway can only show one pitch line, so we use the leading
  // (highest-scoring) active mic player's pitch for visual feedback.
  const detectedPitch = useMemo(() => {
    const activeMicPlayers = game.players
      .filter(p => p.playerType === 'microphone' && !p.eliminated)
      .sort((a, b) => b.score - a.score);

    for (const player of activeMicPlayers) {
      const pitch = multiPitch.getPlayerPitch(player.id);
      // Use rawNote (un-stabilized) for responsive visual feedback.
      // Fall back to stabilized note if rawNote is unavailable.
      const visualPitch = pitch?.rawNote ?? pitch?.note;
      if (visualPitch != null && pitch?.isSinging !== false) {
        return visualPitch;
      }
    }
    return null;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.players, multiPitch.playerPitches]);

  // ── Cleanup on unmount ─────────────────────────────────────────────
  // Use empty deps + multiPitchRef to avoid re-firing every render.
  // multiPitch is a new object every render (playerPitches Map changes ~50Hz),
  // so [multiPitch] as dep would call stop() every render, which creates
  // a new empty Map via setPlayerPitches(new Map()), triggering another
  // render → infinite loop (React #185 "Maximum update depth exceeded").
  useEffect(() => {
    return () => {
      multiPitchRef.current.stop();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    showElimination,
    stats,
    sortedPlayers,
    activePlayers,
    currentSong,
    currentTime,
    roundTimeLeft,
    snippetTimeLeft,
    currentSnippetIndex,
    totalSnippets,
    audioRef,
    videoRef,
    handleRoundEnd,
    handleStartRound,
    handleVoteSubmit,
    handleStartRoundAfterVote,
    handleGrandFinaleIntroComplete,
    setCurrentTime,
    previousRoundScores: game.previousRoundScores,
    bountyPlayerId: game.bountyPlayerId,
    bountyMultiplier: game.settings.bountyMultiplier,
    pitchStats: pitchStatsRef.current,
    visibleNotes: visibleNotesRef.current,
    detectedPitch,
    playerPitchMap: multiPitch.playerPitches,
    multiPitchErrors: multiPitch.errors,
    songProgress: currentSong && currentSong.duration > 0
      ? Math.min(100, Math.max(0, (currentTime / currentSong.duration) * 100))
      : 0,
    countdown,
    notePerformance,
    eliminationPhase,
  };
}
