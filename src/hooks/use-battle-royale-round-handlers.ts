'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  startRound,
  endRoundAndEliminate,
  endRoundWithoutElimination,
  advanceToNextRound,
  advanceToNextSnippet,
  enterGrandFinale,
  getActivePlayers,
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
  /** Resolve a song by id (used for the host-voted first-round song) */
  getSongById: (_id: string) => Song | null;
  /** Consumes the pre-fetched next song (warmed during the last seconds of
   *  the previous round) so the round transition needs no loading pause. */
  consumePrefetchedSong: () => Song | null;
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
  /** Current inline elimination animation phase */
  eliminationPhase: null | 'eliminating' | 'survivor-flash';
}

/**
 * Manages round lifecycle: starting rounds, ending rounds with elimination,
 * voting phase and grand finale intro.
 *
 * User rule 6.4: eliminations NO LONGER interrupt the game — no fullscreen
 * black overlay, no new countdown. The eliminated player is marked inline on
 * their player card (blinking red X → grayed out, rendered by PlayingView)
 * and the next round starts immediately.
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
  getSongById,
  consumePrefetchedSong,
}: UseBattleRoyaleRoundHandlersParams): UseBattleRoyaleRoundHandlersReturn {
  const activePlayersRef = useRef(activePlayers);
  const [eliminationPhase] = useState<null | 'eliminating' | 'survivor-flash'>(null);
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
  const survivorFlashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoStartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
        audioRef.current.src = '';
      }
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.src = '';
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

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.src = '';
    }
    audioHasPlayedRef.current = false;
    stopPitch();

    // Do NOT early-return when activePlayers <= 1; let endRoundAndEliminate
    // handle it gracefully (returns game unchanged) and advanceToNextRound
    // transition the game to its next state (e.g. declare winner).

    // ── R9 (user request 2.2): rhythm-only elimination for full-song rounds ──
    // In random/vote mode the elimination cadence is the CONFIGURED RHYTHM
    // interval (mid-round eliminations, user rule 6.1) — the song ending is
    // NOT an extra elimination. The song simply ran out: close the round
    // bookkeeping and start the NEXT song with the same settings. Exceptions
    // that keep the classic endRoundAndEliminate path (it eliminates NOBODY
    // in these cases):
    //  • exactly 2 players left + grand finale enabled → enter the finale
    //  • safety net: ≤ 1 active player (mid-round elim already handles this,
    //    but never let an inconsistent state hang)
    const lastRound = currentGame.rounds[currentGame.rounds.length - 1];
    const isFullSongRhythmRound =
      lastRound?.roundType === 'full' &&
      !currentGame.isGrandFinale &&
      currentGame.status === 'playing';
    if (isFullSongRhythmRound) {
      const activeCount = getActivePlayers(currentGame).length;
      const finaleEntryPending =
        activeCount === 2 &&
        !currentGame.isGrandFinale &&
        currentGame.settings.grandFinaleBestOf > 1;
      if (activeCount > 2 || (!finaleEntryPending && activeCount === 2)) {
        const closed = endRoundWithoutElimination(currentGame);
        gameRef.current = closed;
        const advanced = advanceToNextRound(closed);
        gameRef.current = advanced;
        roundEndingRef.current = false;
        handleStartRoundRef.current();
        return;
      }
    }

    const updatedGame = endRoundAndEliminate(currentGame);
    gameRef.current = updatedGame; // Update ref immediately so game loop sees new status

    // Game over → winner view (no further rounds)
    if (updatedGame.winner || updatedGame.status === 'completed') {
      onUpdateGameRef.current(updatedGame);
      roundEndingRef.current = false;
      return;
    }

    // Check if we just entered grand finale (2 players remain + bestOf > 1):
    // keep the finale intro flow (its own full-screen presentation).
    if (
      !currentGame.isGrandFinale &&
      updatedGame.isGrandFinale &&
      updatedGame.settings.grandFinaleBestOf > 1
    ) {
      const withFinale = enterGrandFinale(updatedGame);
      gameRef.current = withFinale; // Update ref immediately so game loop sees new status
      onUpdateGameRef.current(withFinale);

      if (roundEndTimerRef.current !== null) {
        clearTimeout(roundEndTimerRef.current);
      }
      // Brief pause so the eliminated player's card can blink (6.4), then
      // the grand finale intro takes over.
      roundEndTimerRef.current = setTimeout(() => {
        roundEndTimerRef.current = null;
        if (!mountedRef.current) return;
        const advanced = advanceToNextRound(withFinale);
        gameRef.current = advanced;
        // DO-NOT-CHANGE: Skip intermediate 'setup' status — same fix as normal flow.
        // handleStartRound sets status directly to 'playing'/'countdown'.
        roundEndingRef.current = false;
        handleStartRoundRef.current();
      }, 2500);
      return;
    }

    // ── Normal elimination (user rule 6.4): NO interruption ──
    // No fullscreen overlay, no 2.5s wait, no new countdown. The eliminated
    // player is marked on their card by PlayingView (blinking red X →
    // grayed out) while the next round starts immediately. Only the store
    // commit from handleStartRound renders — the intermediate 'elimination'
    // and 'setup' statuses never hit the screen (no RoundSetupView flash).
    const advanced = advanceToNextRound(updatedGame);
    gameRef.current = advanced;
    roundEndingRef.current = false;
    handleStartRoundRef.current();
  // Stable deps: removed game, activePlayers.length, onUpdateGame — read from refs instead
  }, [stopPitch, audioRef, videoRef, audioHasPlayedRef]);

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
      if (survivorFlashTimerRef.current !== null) {
        clearTimeout(survivorFlashTimerRef.current);
        survivorFlashTimerRef.current = null;
      }
      if (autoStartTimerRef.current) {
        clearTimeout(autoStartTimerRef.current);
        autoStartTimerRef.current = null;
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

    // Host-voted song from the unified party setup (setup-level "Vote"):
    // round 1 always uses this song — the host already decided, so skip
    // the in-game voting phase for round 1.
    const hostVotedFirstSong =
      currentGame.currentRound === 0 && currentGame.settings.firstRoundSongId
        ? getSongById(currentGame.settings.firstRoundSongId)
        : null;

    // #2 Song Voting: enter voting phase (skipped for round 1 with a host-voted song)
    if (!hostVotedFirstSong && currentGame.settings.songSelection === 'vote') {
      const voteSongs = getRandomSongs(3, excludeIds);
      if (voteSongs.length >= 2) {
        const options = voteSongs.map(s => ({ songId: s.id, songName: s.title }));
        const updatedGame = startVotingPhase(currentGame, options);
        onUpdateGameRef.current(updatedGame);
        return;
      }
      // Fall through to random if not enough songs for voting
    }

    // Prefer the pre-fetched song (warmed in the last seconds of the previous
    // round — same exclusion rules) so the transition needs no loading pause.
    const song = hostVotedFirstSong ?? consumePrefetchedSong() ?? getRandomSong(excludeIds);
    if (!song) {
      // eslint-disable-next-line no-console
      console.error('[BattleRoyale] No playable songs found.');
      return;
    }

    // #1 Medley Mode: pick additional songs for snippets (fixed 30s each —
    // startRound derives the snippet count from the round budget)
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
      // Full-song round (user rule 6.3): pass the song length so the round
      // timer follows the song, not the configured roundDuration.
      const updatedGame = startRound(currentGame, song.id, song.title, undefined, song.duration / 1000);
      onUpdateGameRef.current(updatedGame);
    }
  // Stable deps: removed game and onUpdateGame — read from refs instead
  }, [getRandomSong, getRandomSongs, getSongById, consumePrefetchedSong]);

  useEffect(() => {
    handleStartRoundRef.current = handleStartRound;
  }, [handleStartRound]);

  const handleVoteSubmit = useCallback((playerId: string, songIndex: number) => {
    const currentGame = gameRef.current;
    if (currentGame.status !== 'voting') return;
    const updatedGame = submitVote(currentGame, playerId, songIndex);
    // Update the ref SYNCHRONOUSLY: rapid consecutive votes (host click +
    // companion votes arriving in the same poll batch) would otherwise all
    // read the same stale base and overwrite each other — dropping votes.
    gameRef.current = updatedGame;
    onUpdateGameRef.current(updatedGame);
  }, []);

  // ── Companion-app votes (6.2) ──
  // Mirror apps send br_vote:<songIndex>:<profileId> (dispatched as
  // 'remote-br-vote' by the global remote control). Companion players are
  // built from profiles, so the player id IS the profile id. Only ACTIVE
  // (non-eliminated) players may vote; submitVote dedupes per player.
  useEffect(() => {
    const handleRemoteBrVote = (e: Event) => {
      const { songIndex, playerId } = (e as CustomEvent).detail || {};
      if (typeof playerId !== 'string' || !playerId) return;
      if (typeof songIndex !== 'number' || !Number.isFinite(songIndex)) return;
      const currentGame = gameRef.current;
      if (currentGame.status !== 'voting') return;
      const isActiveVoter = currentGame.players.some(p => p.id === playerId && !p.eliminated);
      if (!isActiveVoter) return;
      handleVoteSubmit(playerId, songIndex);
    };
    window.addEventListener('remote-br-vote', handleRemoteBrVote);
    return () => window.removeEventListener('remote-br-vote', handleRemoteBrVote);
  }, [handleVoteSubmit]);

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
      // Full-song round (user rule 6.3) — timer follows the song length.
      const votedSong = getSongById(songId);
      const started = startRound(updatedGame, songId, songName, undefined, votedSong?.duration
        ? votedSong.duration / 1000
        : undefined);
      onUpdateGameRef.current(started);
    }
  }, [getRandomSongs, getSongById]);

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
    eliminationPhase,
  };
}
