'use client';

import { useCallback, useEffect, useRef } from 'react';
import {
  startRound,
  endRoundAndEliminate,
  advanceToNextRound,
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
  activePlayersRef: React.RefObject<BattleRoyalePlayer[]>;
  gameRef: React.RefObject<BattleRoyaleGame>;
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
  useEffect(() => {
    activePlayersRef.current = activePlayers;
    gameRef.current = game;
  }, [activePlayers, game]);

  const roundEndTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleRoundEndRef = useRef<() => void>(() => {});

  const handleRoundEnd = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    if (videoRef.current) {
      videoRef.current.pause();
    }
    audioHasPlayedRef.current = false;
    stopPitch();

    if (activePlayers.length <= 1) return;

    const updatedGame = endRoundAndEliminate(game);

    // Check if we just entered grand finale (2 players remain + bestOf > 1)
    if (
      !game.isGrandFinale &&
      updatedGame.isGrandFinale &&
      updatedGame.settings.grandFinaleBestOf > 1
    ) {
      const withFinale = enterGrandFinale(updatedGame);
      onUpdateGame(withFinale);
      setShowElimination(true);

      if (roundEndTimerRef.current !== null) {
        clearTimeout(roundEndTimerRef.current);
      }
      roundEndTimerRef.current = setTimeout(() => {
        roundEndTimerRef.current = null;
        setShowElimination(false);
        const advanced = advanceToNextRound(withFinale);
        onUpdateGame(advanced);
      }, 4000);
      return;
    }

    onUpdateGame(updatedGame);
    setShowElimination(true);

    if (roundEndTimerRef.current !== null) {
      clearTimeout(roundEndTimerRef.current);
    }
    roundEndTimerRef.current = setTimeout(() => {
      roundEndTimerRef.current = null;
      setShowElimination(false);
      if (updatedGame.winner) return;
      const nextGame = advanceToNextRound(updatedGame);
      onUpdateGame(nextGame);
    }, 4000);
  }, [activePlayers.length, onUpdateGame, stopPitch, audioRef, videoRef, audioHasPlayedRef, setShowElimination, game]);

  useEffect(() => {
    handleRoundEndRef.current = handleRoundEnd;
  }, [handleRoundEnd]);

  useEffect(() => {
    return () => {
      if (roundEndTimerRef.current !== null) {
        clearTimeout(roundEndTimerRef.current);
        roundEndTimerRef.current = null;
      }
    };
  }, []);

  const handleStartRound = useCallback(() => {
    if (game.status === 'grand-finale-intro') {
      const advanced = advanceToNextRound(game);
      onUpdateGame(advanced);
      return;
    }

    // Build exclusion list for no-repeat protection
    const excludeIds = game.settings.noRepeatProtection
      ? game.recentlyPlayedSongIds.slice(-game.settings.noRepeatCount)
      : [];

    // #2 Song Voting: enter voting phase
    if (game.settings.songSelection === 'vote') {
      const voteSongs = getRandomSongs(3, excludeIds);
      if (voteSongs.length >= 2) {
        const options = voteSongs.map(s => ({ songId: s.id, songName: s.title }));
        const updatedGame = startVotingPhase(game, options);
        onUpdateGame(updatedGame);
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
    if (game.settings.medleyMode && game.settings.medleySnippets > 1) {
      const medleyExcludes = [...excludeIds, song.id];
      const medleySongs = getRandomSongs(game.settings.medleySnippets - 1, medleyExcludes);
      const allSnippets = [
        { songId: song.id, songName: song.title },
        ...medleySongs.map(s => ({ songId: s.id, songName: s.title })),
      ];
      const updatedGame = startRound(game, song.id, song.title, allSnippets);
      onUpdateGame(updatedGame);
    } else {
      const updatedGame = startRound(game, song.id, song.title);
      onUpdateGame(updatedGame);
    }
  }, [game, onUpdateGame, getRandomSong, getRandomSongs]);

  const handleVoteSubmit = useCallback((playerId: string, songIndex: number) => {
    if (game.status !== 'voting') return;
    const updatedGame = submitVote(game, playerId, songIndex);
    onUpdateGame(updatedGame);
  }, [game, onUpdateGame]);

  const handleStartRoundAfterVote = useCallback(() => {
    const result = resolveVote(game);
    if (!result) return;
    const { game: updatedGame, songId, songName } = result;

    if (game.settings.medleyMode && game.settings.medleySnippets > 1) {
      const excludeIds = game.settings.noRepeatProtection
        ? [...game.recentlyPlayedSongIds.slice(-game.settings.noRepeatCount), songId]
        : [songId];
      const medleySongs = getRandomSongs(game.settings.medleySnippets - 1, excludeIds);
      const allSnippets = [
        { songId, songName },
        ...medleySongs.map(s => ({ songId: s.id, songName: s.title })),
      ];
      const started = startRound(updatedGame, songId, songName, allSnippets);
      onUpdateGame(started);
    } else {
      const started = startRound(updatedGame, songId, songName);
      onUpdateGame(started);
    }
  }, [game, onUpdateGame, getRandomSongs]);

  const handleGrandFinaleIntroComplete = useCallback(() => {
    const advanced = advanceToNextRound(game);
    onUpdateGame(advanced);
  }, [game, onUpdateGame]);

  return {
    handleRoundEnd,
    handleStartRound,
    handleVoteSubmit,
    handleStartRoundAfterVote,
    handleGrandFinaleIntroComplete,
    handleRoundEndRef,
    activePlayersRef,
    gameRef,
  };
}
