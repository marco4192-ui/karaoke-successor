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
import { Song, Note, LyricLine } from '@/types/game';
import { calculatePitchStats, getVisibleNotes, PitchStats, NOTE_WINDOW, SING_LINE_POSITION } from '@/lib/game/note-utils';
import { usePitchDetector } from '@/hooks/use-pitch-detector';
import { calculateScoringMetadata } from '@/lib/game/scoring';
import { evaluateAndScoreTick } from '@/lib/game/party-scoring';
import { useBattleRoyaleSongMedia } from '@/hooks/use-battle-royale-song-media';
import { useBattleRoyaleCompanionPolling } from '@/hooks/use-battle-royale-companion-polling';
import { useBattleRoyaleRoundTimer } from '@/hooks/use-battle-royale-round-timer';
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
  detectedPitch: number | null; // smoothed MIDI note from pitch detector
  songProgress: number; // 0-100
  countdown: number;
}

export function useBattleRoyaleGame({ game, songs, onUpdateGame }: UseBattleRoyaleGameParams): UseBattleRoyaleGameReturn {
  const onUpdateGameRef = useRef(onUpdateGame);
  onUpdateGameRef.current = onUpdateGame;

  const [showElimination, setShowElimination] = useState(false);
  const stats = getBattleRoyaleStats(game);

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

  // ── Pitch Detection (local microphone) ────────────────────────────
  const { isInitialized: pitchInitialized, pitchResult, initialize: initPitch, start: startPitch, stop: stopPitch } = usePitchDetector();
  const pitchResultRef = useRef(pitchResult);
  pitchResultRef.current = pitchResult;

  // ── Game State ─────────────────────────────────────────────────────
  const [currentTime, setCurrentTime] = useState(0);
  const gameLoopRef = useRef<number | null>(null);
  const lastCurrentTimeUpdateRef = useRef(0);

  // ── Countdown state (V3) ───────────────────────────────────────────
  const [countdown, setCountdown] = useState(0);
  useEffect(() => {
    if (game.status === 'countdown') {
      setCountdown(game.settings.countdownDuration);
    } else {
      setCountdown(0);
    }
  }, [game.status, game.settings.countdownDuration]);
  useEffect(() => {
    if (countdown <= 0 || game.status !== 'countdown') return;
    const timer = setTimeout(() => {
      const next = countdown - 1;
      if (next <= 0) {
        onUpdateGame({ ...gameRef.current, status: 'playing' });
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
    const shuffled = [...playableSongs].sort(() => Math.random() - 0.5);
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
    onSnippetEndRef,
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
    getRandomSongs,
    setShowElimination,
  });

  // ── Round Timer ────────────────────────────────────────────────────
  const { roundTimeLeft, snippetTimeLeft } = useBattleRoyaleRoundTimer({
    gameStatus: game.status,
    roundDuration: currentRound?.duration,
    gameCurrentRound: game.currentRound,
    handleRoundEndRef,
    medleySnippetList: game.medleySnippetList,
    currentSnippetIndex: game.currentSnippetIndex,
    onSnippetEndRef,
  });

  // ── Game Initialization & Playback ─────────────────────────────────
  useEffect(() => {
    if (game.status === 'playing' && mediaLoaded && currentSong) {
      let cancelled = false;
      const initGame = async () => {
        if (!pitchInitialized) {
          await initPitch();
        }
        if (cancelled) return;
        startPitch();

        const audio = audioRef.current;
        if (audio && resolvedAudioUrlRef.current) {
          if (audio.readyState >= 3) {
            audio.play()
              .then(() => { audioHasPlayedRef.current = true; })
              // eslint-disable-next-line no-console
              .catch(e => console.error('Audio play error:', e));
          } else {
            const onCanPlay = () => {
              audio.removeEventListener('canplay', onCanPlay);
              if (!cancelled) {
                audio.play()
                  .then(() => { audioHasPlayedRef.current = true; })
                  // eslint-disable-next-line no-console
                  .catch(e => console.error('Audio play error:', e));
              }
            };
            audio.addEventListener('canplay', onCanPlay);
          }
        } else {
          // eslint-disable-next-line no-console
          console.warn('[BattleRoyale] No audio URL resolved');
        }
        if (videoRef.current && resolvedVideoUrlRef.current) {
          videoRef.current.play().catch(e => console.error('Video play error:', e));
        }

        startGameLoopRef.current();
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.status, mediaLoaded, currentSong, pitchInitialized, initPitch, startPitch, stopPitch]);

  // ── Game Loop for simultaneous scoring ─────────────────────────────
  const startGameLoopRef = useRef<() => void>(() => {});

  const startGameLoop = useCallback(() => {
    const TICK_INTERVAL = 100;
    let lastTickTime = performance.now();

    const gameLoop = (timestamp: number) => {
      if (gameRef.current.status !== 'playing') return;

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

        const currentPitchResult = pitchResultRef.current;
        const detectedPitch = currentPitchResult?.note;
        const isSinging = currentPitchResult?.isSinging;

        const currentAudioTime = audioRef.current ? audioRef.current.currentTime * 1000 : currentTime;

        let batchedGame = gameRef.current;
        let scoreChanged = false;

        const activeNotes = getActiveNotesAtTime(td.allNotes, currentAudioTime);
        const activeNote = activeNotes.length > 0 ? activeNotes[0] : null;

        if (activeNote) {
          const micPlayers = activePlayersRef.current.filter(p => p.playerType === 'microphone');
          const companionPlayers = activePlayersRef.current.filter(p => p.playerType === 'companion');

          const comboMap = new Map(batchedGame.players.map(p => [p.id, p.currentCombo]));

          // Score all active MICROPHONE players (shared pitch)
          for (const player of micPlayers) {
            if (isSinging === false) continue;
            if (detectedPitch == null) continue;

            const tick = evaluateAndScoreTick(detectedPitch, activeNote, difficultyRef.current, td.scoringMetadata);

            if (tick.hit) {
              // #6 Bounty: Apply multiplier for non-bounty players
              const bountyMult = getBountyMultiplier(batchedGame, player.id);
              const adjustedPoints = Math.round(tick.points * bountyMult);
              batchedGame = updatePlayerScore(
                batchedGame,
                player.id,
                adjustedPoints,
                tick.accuracy,
                1, 0, 1
              );
              scoreChanged = true;
            } else {
              const currentCombo = comboMap.get(player.id) || 0;
              if (currentCombo > 0) {
                batchedGame = updatePlayerScore(
                  batchedGame,
                  player.id,
                  0, 0, 0, 0,
                  -currentCombo
                );
                scoreChanged = true;
              }
            }
          }

          // Score all active COMPANION players
          for (const player of companionPlayers) {
            const cachedPitch = player.connectionCode
              ? companionPitchCacheRef.current.get(player.connectionCode)
              : null;

            if (cachedPitch && cachedPitch.note > 0 && cachedPitch.isSinging === true) {
              const tick = evaluateAndScoreTick(cachedPitch.note, activeNote, difficultyRef.current, td.scoringMetadata);

              if (tick.hit) {
                // #6 Bounty: Apply multiplier for non-bounty players
                const bountyMult = getBountyMultiplier(batchedGame, player.id);
                const adjustedPoints = Math.round(tick.points * bountyMult);
                batchedGame = updatePlayerScore(
                  batchedGame,
                  player.id,
                  adjustedPoints,
                  tick.accuracy,
                  1, 0, 1
                );
                scoreChanged = true;
              } else {
                const currentCombo = comboMap.get(player.id) || 0;
                if (currentCombo > 0) {
                  batchedGame = updatePlayerScore(
                    batchedGame,
                    player.id,
                    0, 0, 0, 0,
                    -currentCombo
                  );
                  scoreChanged = true;
                }
              }
            }
          }
        }

        if (scoreChanged) {
          onUpdateGameRef.current(batchedGame);
        }
      }

      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };

    gameLoopRef.current = requestAnimationFrame(gameLoop);
  }, []);

  useEffect(() => { startGameLoopRef.current = startGameLoop; }, [startGameLoop]);

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
    detectedPitch: pitchResult?.note ?? null,
    songProgress: currentSong && currentSong.duration > 0
      ? Math.min(100, Math.max(0, (currentTime / currentSong.duration) * 100))
      : 0,
    countdown,
  };
}
