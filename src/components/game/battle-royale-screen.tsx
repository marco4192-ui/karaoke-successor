'use client';

import { useEffect } from 'react';
import type { Song } from '@/types/game';
import { usePartyStore } from '@/lib/game/party-store';
import {
  BattleRoyaleGame,
  getEliminationOrder,
  getActivePlayers,
} from '@/lib/game/battle-royale';
import { useBattleRoyaleGame } from '@/hooks/use-battle-royale-game';
import { BattleRoyaleSetupScreen } from './battle-royale/setup-screen';
import { WinnerView } from './battle-royale/winner-view';
import { RoundSetupView } from './battle-royale/round-setup-view';
import { PlayingView } from './battle-royale/playing-view';
import { VotingView } from './battle-royale/voting-view';
import { GrandFinaleIntro } from './battle-royale/grand-finale-intro';

export { BattleRoyaleSetupScreen };

interface BattleRoyaleGameViewProps {
  game: BattleRoyaleGame;
  songs: Song[];
  onUpdateGame: (_game: BattleRoyaleGame) => void;
  onEndGame: () => void;
  onBack?: () => void;
}

export function BattleRoyaleGameView({ game, songs, onUpdateGame, onEndGame, onBack }: BattleRoyaleGameViewProps) {
  const {
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
    previousRoundScores,
    bountyPlayerId,
    bountyMultiplier,
    pitchStats,
    visibleNotes,
    countdown,
    playerPitchMap,
    multiPitchErrors,
    eliminationPhase,
    brNotePerformance,
  } = useBattleRoyaleGame({ game, songs, onUpdateGame });

  // DO-NOT-CHANGE: Clear pause state on round transitions to prevent the pause overlay
  // from leaking into the next round's PlayingView. Without this, if a user paused during
  // a round and the round ended (timer expired), the pause overlay would flash on the
  // next round because pauseDialogAction is never cleared by the round transition logic.
  const setPauseDialogAction = usePartyStore(s => s.setPauseDialogAction);
  useEffect(() => {
    if (game.status === 'setup' || game.status === 'countdown') {
      setPauseDialogAction(null);
    }
  }, [game.status, setPauseDialogAction]);

  // ── Dispatch phase events for companion mirroring ──
  useEffect(() => {
    if (game.status === 'setup' || game.status === 'grand-finale-intro') {
      window.dispatchEvent(new CustomEvent('ptm-phase-changed', { detail: { phase: 'intro' } }));
    } else if (game.status === 'playing' || game.status === 'voting' || game.status === 'countdown') {
      window.dispatchEvent(new CustomEvent('ptm-phase-changed', { detail: { phase: 'playing' } }));
    } else if (game.status === 'completed') {
      window.dispatchEvent(new CustomEvent('ptm-phase-changed', { detail: { phase: 'series-results' } }));
    }
  }, [game.status]);

  // Winner celebration
  if (game.status === 'completed' && game.winner) {
    return (
      <WinnerView
        winner={game.winner}
        eliminationOrder={getEliminationOrder(game)}
        gameStats={game.gameStats}
        finaleSongTitle={game.rounds[game.rounds.length - 1]?.songName}
        onEndGame={onEndGame}
      />
    );
  }

  // Grand Finale intro (#4)
  if (game.status === 'grand-finale-intro') {
    const finalists = getActivePlayers(game);
    if (finalists.length === 2) {
      return (
        <GrandFinaleIntro
          player1={finalists[0]}
          player2={finalists[1]}
          bestOf={game.settings.grandFinaleBestOf}
          finalWins={game.finalWins}
          onComplete={handleGrandFinaleIntroComplete}
          autoAdvance
        />
      );
    }
  }

  // NOTE (user rule 6.4): the fullscreen elimination overlay is GONE —
  // eliminations no longer interrupt the game. The eliminated player is
  // marked INLINE on their player card inside PlayingView (blinking red X
  // for ~2.5s, then grayed out) while the next round starts immediately
  // (no blackscreen, no new countdown).

  // Voting phase (#2)
  if (game.status === 'voting') {
    return (
      <VotingView
        voteOptions={game.voteOptions}
        activePlayers={activePlayers}
        onVoteSubmit={handleVoteSubmit}
        onStartRound={handleStartRoundAfterVote}
      />
    );
  }

  // Countdown phase (V3)
  if (game.status === 'countdown' && countdown > 0) {
    return (
      <PlayingView
        game={game}
        sortedPlayers={sortedPlayers}
        activePlayers={activePlayers}
        currentSong={currentSong}
        currentTime={currentTime}
        roundTimeLeft={roundTimeLeft}
        snippetTimeLeft={snippetTimeLeft}
        currentSnippetIndex={currentSnippetIndex}
        totalSnippets={totalSnippets}
        audioRef={audioRef}
        videoRef={videoRef}
        baseVolumeRef={baseVolumeRef}
        setCurrentTime={setCurrentTime}
        onRoundEnd={handleRoundEnd}
        previousRoundScores={previousRoundScores}
        bountyPlayerId={bountyPlayerId}
        bountyMultiplier={bountyMultiplier}
        pitchStats={pitchStats}
        visibleNotes={visibleNotes}
        countdown={countdown}
        playerPitchMap={playerPitchMap}
        multiPitchErrors={multiPitchErrors}
        eliminationPhase={eliminationPhase}
        brNotePerformance={brNotePerformance}
      />
    );
  }

  // Setup phase
  if (game.status === 'setup') {
    return (
      <RoundSetupView
        game={game}
        stats={stats}
        activePlayers={activePlayers}
        onStartRound={handleStartRound}
        onUpdateGame={onUpdateGame}
        onBack={onBack}
      />
    );
  }

  // Playing phase
  return (
    <PlayingView
      game={game}
      sortedPlayers={sortedPlayers}
      activePlayers={activePlayers}
      currentSong={currentSong}
      currentTime={currentTime}
      roundTimeLeft={roundTimeLeft}
      snippetTimeLeft={snippetTimeLeft}
      currentSnippetIndex={currentSnippetIndex}
      totalSnippets={totalSnippets}
      audioRef={audioRef}
      videoRef={videoRef}
      baseVolumeRef={baseVolumeRef}
      setCurrentTime={setCurrentTime}
      onRoundEnd={handleRoundEnd}
      previousRoundScores={previousRoundScores}
      bountyPlayerId={bountyPlayerId}
      bountyMultiplier={bountyMultiplier}
      pitchStats={pitchStats}
      visibleNotes={visibleNotes}
      countdown={countdown}
      playerPitchMap={playerPitchMap}
      multiPitchErrors={multiPitchErrors}
      eliminationPhase={eliminationPhase}
      brNotePerformance={brNotePerformance}
    />
  );
}
