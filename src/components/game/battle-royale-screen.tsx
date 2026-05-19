'use client';

import { Song } from '@/types/game';
import {
  BattleRoyaleGame,
  getEliminationOrder,
  getActivePlayers,
} from '@/lib/game/battle-royale';
import { useBattleRoyaleGame } from '@/hooks/use-battle-royale-game';
import { BattleRoyaleSetupScreen } from './battle-royale/setup-screen';
import { WinnerView } from './battle-royale/winner-view';
import { EliminationView } from './battle-royale/elimination-view';
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
    previousRoundScores,
    bountyPlayerId,
    bountyMultiplier,
    pitchStats,
    visibleNotes,
    detectedPitch,
    songProgress,
    countdown,
    playerPitchMap,
    multiPitchErrors,
  } = useBattleRoyaleGame({ game, songs, onUpdateGame });

  // Winner celebration
  if (game.status === 'completed' && game.winner) {
    return (
      <WinnerView
        winner={game.winner}
        eliminationOrder={getEliminationOrder(game)}
        gameStats={game.gameStats}
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
        />
      );
    }
  }

  // Elimination animation
  if (showElimination) {
    const lastRound = game.rounds[game.rounds.length - 1];
    const eliminatedPlayer = (lastRound?.eliminatedPlayerId
      ? game.players.find(p => p.id === lastRound.eliminatedPlayerId)
          || sortedPlayers.find(p => p.id === lastRound.eliminatedPlayerId)
      : null) || sortedPlayers.find(p => p.eliminated);
    const bountyClaimed = lastRound?.bountyClaimed ?? false;
    const bountyClaimedById = lastRound?.bountyClaimedById;

    return (
      <EliminationView
        eliminatedPlayer={eliminatedPlayer}
        remainingPlayersCount={activePlayers.length - (eliminatedPlayer ? 1 : 0)}
        bountyClaimed={bountyClaimed}
        bountyClaimedById={bountyClaimedById}
        players={game.players}
        roundScoreDeltas={lastRound?.roundScoreDeltas ?? {}}
        isGrandFinale={game.isGrandFinale}
        grandFinaleWins={game.finalWins}
        bestOf={game.settings.grandFinaleBestOf}
      />
    );
  }

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
  if (game.status === 'countdown' || countdown > 0) {
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
        setCurrentTime={setCurrentTime}
        onRoundEnd={handleRoundEnd}
        previousRoundScores={previousRoundScores}
        bountyPlayerId={bountyPlayerId}
        bountyMultiplier={bountyMultiplier}
        pitchStats={pitchStats}
        visibleNotes={visibleNotes}
        detectedPitch={detectedPitch}
        songProgress={songProgress}
        countdown={countdown}
        playerPitchMap={playerPitchMap}
        multiPitchErrors={multiPitchErrors}
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
      setCurrentTime={setCurrentTime}
      onRoundEnd={handleRoundEnd}
      previousRoundScores={previousRoundScores}
      bountyPlayerId={bountyPlayerId}
      bountyMultiplier={bountyMultiplier}
      pitchStats={pitchStats}
      visibleNotes={visibleNotes}
      detectedPitch={detectedPitch}
      songProgress={songProgress}
      countdown={countdown}
      playerPitchMap={playerPitchMap}
      multiPitchErrors={multiPitchErrors}
    />
  );
}
