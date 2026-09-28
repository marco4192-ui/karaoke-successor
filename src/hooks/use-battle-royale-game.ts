'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  getActivePlayers,
  getPlayersByScore,
  getBattleRoyaleStats,
  getCurrentMedleySnippet,
} from '@/lib/game/battle-royale';
import type { Song, Note, LyricLine } from '@/types/game';
import type { PitchStats } from '@/lib/game/note-utils';
import { useBattleRoyaleSongMedia } from '@/hooks/use-battle-royale-song-media';
import { useBattleRoyaleCompanionPolling } from '@/hooks/use-battle-royale-companion-polling';
import { useBattleRoyaleRoundTimer } from '@/hooks/use-battle-royale-round-timer';
import { useMobileGameSync } from '@/hooks/use-mobile-game-sync';
import { usePartyStore } from '@/lib/game/party-store';
import { useBattleRoyaleRoundHandlers } from '@/hooks/use-battle-royale-round-handlers';
import { useBattleRoyaleBaseVolume } from './battle-royale/use-base-volume';
import { useBattleRoyalePitchDetection } from './battle-royale/use-pitch-detection';
import { useBattleRoyaleCountdown } from './battle-royale/use-countdown';
import { useBattleRoyaleTimingData } from './battle-royale/use-timing-data';
import { useBattleRoyaleSongPicker } from './battle-royale/song-picker';
import { useBattleRoyaleEliminationNotice } from './battle-royale/use-elimination-notice';
import { useBattleRoyaleMidRoundElimination } from './battle-royale/use-mid-round-elimination';
import { useBattleRoyalePlaybackInit } from './battle-royale/use-playback-init';
import { useBattleRoyaleSongPrefetch } from './battle-royale/use-song-prefetch';
import { useBattleRoyaleScoringLoop } from './battle-royale/use-scoring-loop';
import { useBattleRoyaleCompanionLiveFeed } from './battle-royale/use-companion-live-feed';
import type { UseBattleRoyaleGameParams, UseBattleRoyaleGameReturn } from './battle-royale/types';

export type { BrNotePerformanceSample } from './battle-royale/note-performance';

export function useBattleRoyaleGame({ game, songs, onUpdateGame }: UseBattleRoyaleGameParams): UseBattleRoyaleGameReturn {
  const onUpdateGameRef = useRef(onUpdateGame);
  onUpdateGameRef.current = onUpdateGame;

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

  // ── Loudness normalization: base volume for ALL BR audio fades ──
  // (see battle-royale/use-base-volume.ts)
  const { baseVolumeRef } = useBattleRoyaleBaseVolume({
    currentSong,
    mediaLoaded,
    audioRef,
    resolvedAudioUrlRef,
  });

  // ── Companion Pitch Polling ────────────────────────────────────────
  const { companionPitchCacheRef } = useBattleRoyaleCompanionPolling({
    gameStatus: game.status,
    players: game.players,
  });

  // ── Multi-Pitch Detection (see battle-royale/use-pitch-detection.ts) ──
  const { multiPitch, multiPitchRef } = useBattleRoyalePitchDetection({ game, difficulty });

  // ── Game State ─────────────────────────────────────────────────────
  const mountedRef = useRef(true);
  // Item 3 (BR perf): note-performance sampling removed entirely — the BR
  // note highway uses the flat single-colour fill driven purely by the sing
  // line, so no per-tick samples are collected or synced to state. This
  // saves per-tick array pushes AND a Map copy + setState every ~100ms (a
  // full PlayingView re-render) in the most performance-critical mode.
  /** Pre-fetched next song (warmed during the last seconds of a round) —
   *  consumed by handleStartRound via consumePrefetchedSong. Declared here
   *  (before the round handlers) because the consume callback closes over it. */
  const prefetchedSongRef = useRef<Song | null>(null);

  // ── Countdown state (V3) (see battle-royale/use-countdown.ts) ──
  const { countdown, gameRefRef } = useBattleRoyaleCountdown({ game, onUpdateGame, mountedRef });

  // ── Scoring window + timing data (see battle-royale/use-timing-data.ts) ──
  const { timingData } = useBattleRoyaleTimingData({ game, currentSong });

  // ── Visible notes ref (updated every frame) ────────────────────────
  const visibleNotesRef = useRef<Array<Note & { lineIndex: number; line: LyricLine }>>([]);
  const pitchStatsRef = useRef<PitchStats | null>(null);

  // ── Fix 15: note-highway work is gated on the showNoteHighway setting ──
  // BR doesn't need the singing visualization when the highway is hidden, so
  // the game loop skips visible-note recomputation and note-performance state
  // syncs entirely. The rAF loop reads it via ref (stable closure); the memo
  // below reads the plain value (proper dep).
  const showNoteHighwaySetting = game.settings.showNoteHighway;
  const showNoteHighwaySettingRef = useRef(showNoteHighwaySetting);
  useEffect(() => {
    showNoteHighwaySettingRef.current = game.settings.showNoteHighway;
  }, [game.settings.showNoteHighway]);

  const timingDataRef = useRef(timingData);
  timingDataRef.current = timingData;
  pitchStatsRef.current = timingData?.pitchStats ?? null;
  const currentSongRef = useRef(currentSong);
  currentSongRef.current = currentSong;
  const difficultyRef = useRef(difficulty);
  difficultyRef.current = difficulty;

  // ── Random song picker (see battle-royale/song-picker.ts) ──
  const { getRandomSong, getRandomSongs, getSongById } = useBattleRoyaleSongPicker({ songs });

  // ── Mid-round elimination HUD notice (see battle-royale/use-elimination-notice.ts) ──
  const { midRoundEliminationNotice, notifyElimination } = useBattleRoyaleEliminationNotice();

  // ── Round Handlers ────────────────────────────────────────────────
  // Consume the pre-fetched song so the next round starts without a loading
  // pause (the media was already warmed during the previous round's tail).
  const consumePrefetchedSong = useCallback((): Song | null => {
    const song = prefetchedSongRef.current;
    prefetchedSongRef.current = null;
    return song;
  }, []);

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
    getSongById,
    consumePrefetchedSong,
    notifyElimination,
  });

  // Keep gameRefRef in sync with gameRef from round handlers
  useEffect(() => {
    gameRefRef.current = gameRef;
  }, [gameRef]);

  // ── Pause state (read from store, used by game loop + round timer) ───
  // R20-2 (user report "Video läuft bei Abort weiter"): ANY open dialog
  // freezes the game — not just the pause menu. Abort swaps 'song-pause' →
  // 'party-leave' in one batched store write; React never renders the null
  // state in between, so checks for 'song-pause' alone left the round timer,
  // elimination ticker and the background VIDEO running behind the leave
  // dialog while the audio stayed paused → video desynced on Back.
  const pauseDialogAction = usePartyStore(s => s.pauseDialogAction);
  const pausedRef = useRef(pauseDialogAction !== null);
  pausedRef.current = pauseDialogAction !== null;

  // Stop pitch detection while paused (like standard game mode does)
  useEffect(() => {
    if (pauseDialogAction !== null) {
      multiPitch.stop();
    } else if (gameRef.current.status === 'playing') {
      // Restart pitch detection after unpause (game init effect won't re-fire)
      if (!multiPitch.isRunning) {
        multiPitch.start();
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- multiPitch is stable for .stop()/.start()
  }, [pauseDialogAction]);

  // ── Game Loop for simultaneous per-player scoring ──
  // (see battle-royale/use-scoring-loop.ts)
  const {
    currentTime,
    setCurrentTime,
    gameLoopRef,
    startGameLoopRef,
    pendingScoredGameRef,
    lastValidPitchRef,
    brNotePerformance,
    setBrNotePerformance,
    brNotePerformanceRef,
  } = useBattleRoyaleScoringLoop({
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
  });

  // ── Mid-round eliminations + R19 tie-break showdown ──
  // (see battle-royale/use-mid-round-elimination.ts)
  const { nextEliminationIn } = useBattleRoyaleMidRoundElimination({
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
  });

  // ── Item 8.1: Companion game-state sync ──────────────────────────
  // Same mechanism CPTM/PTM use (useMobileGameSync): pushes the current
  // (snippet) song + isPlaying to all companion apps so a participating
  // player's phone shows the BR in-game screen and streams pitch (the
  // mobile pitch loop only runs/sends while gameState.isPlaying is true).
  // R20-2: frozen during ANY open dialog (pause + leave confirmation).
  const brCompanionPlaying = game.status === 'playing' && pauseDialogAction === null;
  useMobileGameSync(
    currentSong,
    brCompanionPlaying,
    'battle-royale',
    game.status === 'completed',
    undefined,
    'battle-royale-game',
  );

  // Item 8.1: on unmount (game over / party left) tell the companions the BR
  // game is over — stops their microphone/pitch stream immediately instead of
  // relying on the next periodic sync.
  useEffect(() => {
    return () => {
      fetch('/api/mobile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'gamestate',
          payload: { isPlaying: false, songEnded: true, brGameData: null },
        }),
      }).catch(() => { /* best-effort */ });
    };
  }, []);

  // ── Round Timer ────────────────────────────────────────────────────
  const { roundTimeLeft, snippetTimeLeft } = useBattleRoyaleRoundTimer({
    gameStatus: game.status,
    roundDuration: currentRound?.duration,
    gameCurrentRound: game.currentRound,
    handleRoundEndRef,
    medleySnippetList: game.medleySnippetList,
    currentSnippetIndex: game.currentSnippetIndex,
    onSnippetEndRef,
    // R20-2: frozen during ANY open dialog — the leave confirmation must
    // not let the round (or a snippet) expire behind the user's back.
    isPaused: pauseDialogAction !== null,
  });

  // ── Game Initialization & Playback (see battle-royale/use-playback-init.ts) ──
  useBattleRoyalePlaybackInit({
    game,
    mediaLoaded,
    currentSong,
    multiPitch,
    audioRef,
    videoRef,
    resolvedAudioUrlRef,
    resolvedVideoUrlRef,
    audioHasPlayedRef,
    pausedRef,
    baseVolumeRef,
    startGameLoopRef,
    gameLoopRef,
  });

  // ── Pre-fetch next song (see battle-royale/use-song-prefetch.ts) ──
  const { prefetchedMediaRef } = useBattleRoyaleSongPrefetch({
    game,
    songs,
    roundTimeLeft,
    audioRef,
    prefetchedSongRef,
  });

  // Clear prefetch + pending score accumulation when the round changes —
  // a stale pendingScoredGameRef from the PREVIOUS round would otherwise be
  // resurrected by the next game-loop tick (old players/rounds bleeding
  // into the new round). The round handlers already committed the fresh
  // post-elimination game (including the final scores via gameRef).
  useEffect(() => {
    prefetchedSongRef.current = null;
    prefetchedMediaRef.current = null;
    pendingScoredGameRef.current = null;
    // Fresh round → fresh performance samples (ghosts must never bleed
    // across songs/rounds; the note keys would collide otherwise).
    brNotePerformanceRef.current = new Map();
    setBrNotePerformance(new Map());
    // R14 (6): pitch hold must not bridge across rounds either — the new
    // round's audio time restarts at 0, so a stale lastValidPitch entry
    // would look "fresh" to the diff check.
    lastValidPitchRef.current = new Map();
  }, [game.currentRound]);

  // ── Companion live-singing feed (see battle-royale/use-companion-live-feed.ts) ──
  useBattleRoyaleCompanionLiveFeed({
    game,
    audioRef,
    timingDataRef,
    activePlayersRef,
    gameRef,
    pausedRef,
    multiPitchRef,
    companionPitchCacheRef,
    brNotePerformanceRef,
  });

  // ── Cleanup on unmount ─────────────────────────────────────────────────
  // Use empty deps + multiPitchRef to avoid re-firing every render.
  // multiPitch is a new object every render (playerPitches Map changes ~50Hz),
  // so [multiPitch] as dep would call stop() every render, which creates
  // a new empty Map via setPlayerPitches(new Map()), triggering another
  // render → infinite loop (React #185 "Maximum update depth exceeded").
  useEffect(() => {
    return () => {
      multiPitchRef.current.stop();
    };
   
  }, []);

  return {
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
    baseVolumeRef,
    handleRoundEnd,
    handleStartRound,
    handleVoteSubmit,
    handleStartRoundAfterVote,
    handleGrandFinaleIntroComplete,
    setCurrentTime,
    tieBreak: game.tieBreak,
    pitchStats: pitchStatsRef.current,
    visibleNotes: visibleNotesRef.current,
    playerPitchMap: multiPitch.playerPitches,
    multiPitchErrors: multiPitch.errors,
    brNotePerformance,
    songProgress: currentSong && currentSong.duration > 0
      ? Math.min(100, Math.max(0, (currentTime / currentSong.duration) * 100))
      : 0,
    countdown,
    eliminationPhase,
    nextEliminationIn,
    midRoundEliminationNotice,
  };
}
