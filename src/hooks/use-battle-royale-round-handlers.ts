'use client';

import { useCallback, useEffect, useRef } from 'react';
import {
  startRound,
  endRoundAndEliminate,
  advanceToNextRound,
  advanceToNextSnippet,
  enterGrandFinale,
  startVotingPhase,
  resolveVote,
  submitVote,
  BattleRoyaleGame,
  BattleRoyalePlayer,
} from '@/lib/game/battle-royale';
import { Song } from '@/types/game';

interface UseBattleRoyaleRoundHandlersParams {
  game: BattleRoyaleGame;
  activePlayers: BattleRoyalePlayer[];
  onUpdateGame: (_game: BattleRoyaleGame) => void;
  stopPitch: () => void;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  audioHasPlayedRef: React.RefObject<boolean>;
  getRandomSong: (_excludeIds?: string[]) => Song | null;
  getRandomSongs: (_count: number, _excludeIds?: string[]) => Song[];
  setShowElimination: (_show: boolean) => void;
}

interface UseBattleRoyaleRoundHandlersReturn {
  handleRoundEnd: () => void;
  handleStartRound: () => void;
  handleVoteSubmit: (_playerId: string, _songIndex: number) => void;
  handleStartRoundAfterVote: () => void;
  handleGrandFinaleIntroComplete: () => void;
  handleRoundEndRef: React.RefObject<() => void>;
  handleStartRoundRef: React.RefObject<() => void>;
  /** Ref to medley snippet transition handler for use by round timer */
  onSnippetEndRef: React.RefObject<(() => void) | null>;
  activePlayersRef: React.RefObject<BattleRoyalePlayer[]>;
  gameRef: React.RefObject<BattleRoyaleGame>;
  /** Set to true while round is ending to signal game loop to stop immediately */
  roundEndingRef: React.RefObject<boolean>;
}

/**
 * Manages round lifecycle: starting rounds, ending rounds with elimination,
 * voting phase, grand finale intro, and the elimination animation timer.
 */
export function useBattleRoyaleRoundHandlers({
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
}: UseBattleRoyaleRoundHandlersParams): UseBattleRoyaleRoundHandlersReturn {
  const activePlayersRef = useRef(activePlayers);
  const gameRef = useRef(game);
  const mountedRef = useRef(true);
  /** Guard: true while handleRoundEnd is processing or during the elimination timeout.
   *  The game loop checks this ref and skips all onUpdateGame calls when true. */
  const roundEndingRef = useRef(false);
  /** Ref for onUpdateGame so callbacks can read the latest without re-creating. */
  const onUpdateGameRef = useRef(onUpdateGame);
  onUpdateGameRef.current = onUpdateGame;
  useEffect(() => {
    activePlayersRef.current = activePlayers;
    gameRef.current = game;
  }, [activePlayers, game]);

  const roundEndTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleRoundEndRef = useRef<() => void>(() => {});
  const onSnippetEndRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Medley snippet transition: advance to next snippet when timer reaches zero
  const handleSnippetEnd = useCallback(() => {
    const currentGame = gameRef.current;
    if (currentGame.status !== 'playing' || currentGame.medleySnippetList.length <= 1) return;
    const updated = advanceToNextSnippet(currentGame);
    if (updated.currentSnippetIndex !== currentGame.currentSnippetIndex) {
      // Fully stop current media before switching snippet to prevent audio bleeding
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.removeAttribute('src');
        audioRef.current.load();
      }
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.removeAttribute('src');
        videoRef.current.load();
      }
      audioHasPlayedRef.current = false;
      onUpdateGameRef.current(updated);
    }
  }, [audioRef, videoRef, audioHasPlayedRef]);

  useEffect(() => {
    onSnippetEndRef.current = handleSnippetEnd;
  }, [handleSnippetEnd]);

  const handleRoundEnd = useCallback(() => {
    // Guard: prevent double-fire from rapid state changes (e.g. game loop reverting status)
    if (roundEndingRef.current) return;
    roundEndingRef.current = true;

    // Read latest values from refs to avoid stale closures.
    // Using game/activePlayers as deps would recreate this callback ~10x/sec
    // during gameplay (every scoring tick), which can cause infinite re-render
    // loops when combined with React effect chains during round transitions.
    const currentGame = gameRef.current;
    const currentActivePlayers = activePlayersRef.current;

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeAttribute('src');
      audioRef.current.load();
    }
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.removeAttribute('src');
      videoRef.current.load();
    }
    audioHasPlayedRef.current = false;
    stopPitch();

    if (currentActivePlayers.length <= 1) {
      roundEndingRef.current = false;
      return;
    }

    const updatedGame = endRoundAndEliminate(currentGame);
    gameRef.current = updatedGame; // Update ref immediately so game loop sees new status

    // Check if we just entered grand finale (2 players remain + bestOf > 1)
    if (
      !currentGame.isGrandFinale &&
      updatedGame.isGrandFinale &&
      updatedGame.settings.grandFinaleBestOf > 1
    ) {
      const withFinale = enterGrandFinale(updatedGame);
      gameRef.current = withFinale; // Update ref immediately so game loop sees new status
      onUpdateGameRef.current(withFinale);
      setShowElimination(true);

      if (roundEndTimerRef.current !== null) {
        clearTimeout(roundEndTimerRef.current);
      }
      roundEndTimerRef.current = setTimeout(() => {
        roundEndTimerRef.current = null;
        if (!mountedRef.current) return;
        setShowElimination(false);
        const advanced = advanceToNextRound(withFinale);
        gameRef.current = advanced;
        onUpdateGameRef.current(advanced);
        roundEndingRef.current = false;
        // Auto-start grand finale round (will show GrandFinaleIntro then auto-advance)
        setTimeout(() => {
          if (!mountedRef.current) return;
          handleStartRoundRef.current();
        }, 300);
      }, 4000);
      return;
    }

    onUpdateGameRef.current(updatedGame);
    setShowElimination(true);

    if (roundEndTimerRef.current !== null) {
      clearTimeout(roundEndTimerRef.current);
    }
    roundEndTimerRef.current = setTimeout(() => {
      roundEndTimerRef.current = null;
      if (!mountedRef.current) return;
      setShowElimination(false);
      if (updatedGame.winner) return;
      // Auto-advance to next round setup, then auto-start
      const nextGame = advanceToNextRound(updatedGame);
      gameRef.current = nextGame;
      onUpdateGameRef.current(nextGame);
      roundEndingRef.current = false;
      // Auto-start next round after a brief pause for transition
      setTimeout(() => {
        if (!mountedRef.current) return;
        handleStartRoundRef.current();
      }, 300);
    }, 4000);
  // Stable deps: removed game, activePlayers.length, onUpdateGame — read from refs instead
  }, [stopPitch, audioRef, videoRef, audioHasPlayedRef, setShowElimination]);

  useEffect(() => {
    handleRoundEndRef.current = handleRoundEnd;
  }, [handleRoundEnd]);

  const handleStartRoundRef = useRef<() => void>(() => {});

  useEffect(() => {
    return () => {
      if (roundEndTimerRef.current !== null) {
        clearTimeout(roundEndTimerRef.current);
        roundEndTimerRef.current = null;
      }
    };
  }, []);

  const handleStartRound = useCallback(() => {
    roundEndingRef.current = false;
    // Read latest game from ref to avoid stale closure.
    // game changes every scoring tick (~100ms), so using it as a dep
    // would recreate this callback constantly.
    const currentGame = gameRef.current;

    if (currentGame.status === 'grand-finale-intro') {
      const advanced = advanceToNextRound(currentGame);
      onUpdateGameRef.current(advanced);
      return;
    }

    // Build exclusion list for no-repeat protection
    const excludeIds = currentGame.settings.noRepeatProtection
      ? currentGame.recentlyPlayedSongIds.slice(-currentGame.settings.noRepeatCount)
      : [];

    // #2 Song Voting: enter voting phase
    if (currentGame.settings.songSelection === 'vote') {
      const voteSongs = getRandomSongs(3, excludeIds);
      if (voteSongs.length >= 2) {
        const options = voteSongs.map(s => ({ songId: s.id, songName: s.title }));
        const updatedGame = startVotingPhase(currentGame, options);
        onUpdateGameRef.current(updatedGame);
        return;
      }
      // Fall through to random if not enough songs for voting
    }

    const song = getRandomSong(excludeIds);
    if (!song) {
      // eslint-disable-next-line no-console
      console.error('[BattleRoyale] No playable songs found.');
      return;
    }

    // #1 Medley Mode: pick additional songs for snippets
    if (currentGame.settings.medleyMode && currentGame.settings.medleySnippets > 1) {
      const medleyExcludes = [...excludeIds, song.id];
      const medleySongs = getRandomSongs(currentGame.settings.medleySnippets - 1, medleyExcludes).filter(s => s.lyrics && s.lyrics.length > 0);
      const allSnippets = [
        { songId: song.id, songName: song.title },
        ...medleySongs.map(s => ({ songId: s.id, songName: s.title })),
      ];
      const updatedGame = startRound(currentGame, song.id, song.title, allSnippets);
      onUpdateGameRef.current(updatedGame);
    } else {
      const updatedGame = startRound(currentGame, song.id, song.title);
      onUpdateGameRef.current(updatedGame);
    }
  // Stable deps: removed game and onUpdateGame — read from refs instead
  }, [getRandomSong, getRandomSongs]);

  useEffect(() => {
    handleStartRoundRef.current = handleStartRound;
  }, [handleStartRound]);

  const handleVoteSubmit = useCallback((playerId: string, songIndex: number) => {
    const currentGame = gameRef.current;
    if (currentGame.status !== 'voting') return;
    const updatedGame = submitVote(currentGame, playerId, songIndex);
    onUpdateGameRef.current(updatedGame);
  }, []);

  const handleStartRoundAfterVote = useCallback(() => {
    const currentGame = gameRef.current;
    const result = resolveVote(currentGame);
    if (!result) return;
    const { game: updatedGame, songId, songName } = result;

    if (currentGame.settings.medleyMode && currentGame.settings.medleySnippets > 1) {
      const excludeIds = currentGame.settings.noRepeatProtection
        ? [...currentGame.recentlyPlayedSongIds.slice(-currentGame.settings.noRepeatCount), songId]
        : [songId];
      const medleySongs = getRandomSongs(currentGame.settings.medleySnippets - 1, excludeIds).filter(s => s.lyrics && s.lyrics.length > 0);
      const allSnippets = [
        { songId, songName },
        ...medleySongs.map(s => ({ songId: s.id, songName: s.title })),
      ];
      const started = startRound(updatedGame, songId, songName, allSnippets);
      onUpdateGameRef.current(started);
    } else {
      const started = startRound(updatedGame, songId, songName);
      onUpdateGameRef.current(started);
    }
  }, [getRandomSongs]);

  const handleGrandFinaleIntroComplete = useCallback(() => {
    const advanced = advanceToNextRound(gameRef.current);
    onUpdateGameRef.current(advanced);
  }, []);

  return {
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
  };
}
