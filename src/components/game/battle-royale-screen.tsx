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
import { useTranslation } from '@/lib/i18n/translations';
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
    notePerformance,
    eliminationPhase,
  } = useBattleRoyaleGame({ game, songs, onUpdateGame });
  const { t } = useTranslation();

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
          autoAdvance
        />
      );
    }
  }

  // DO-NOT-CHANGE: Lightweight elimination overlay replacing the previous
  // full-screen EliminationView. Shows only the eliminated player name + red X
  // for 2 seconds, then transitions to the next round countdown.
  // The old full-screen view (EliminationView component) was removed because it
  // showed too much information (survivors, bounty, score details) and made
  // the segment transition feel cluttered and slow.
  if (showElimination) {
    const lastRound = game.rounds[game.rounds.length - 1];
    const eliminatedPlayer = lastRound?.eliminatedPlayerId
      ? game.players.find(p => p.id === lastRound.eliminatedPlayerId)
      : null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm animate-[fadeIn_0.3s_ease-out_forwards]">
        <div className="text-center animate-[fadeInScale_0.4s_ease-out_forwards]">
          <div className="w-28 h-28 rounded-full bg-red-500/20 border-4 border-red-500 flex items-center justify-center mx-auto mb-4 shadow-[0_0_40px_rgba(239,68,68,0.3)]">
            <span className="text-6xl text-red-500">✕</span>
          </div>
          <p className="text-red-400 font-bold text-2xl">
            {eliminatedPlayer?.name || t('battleRoyale.playerFallback')}
          </p>
          <p className="text-white/40 text-sm mt-2">{t('battleRoyale.eliminatedLabel')}</p>
        </div>
      </div>
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
        notePerformance={notePerformance}
        eliminationPhase={eliminationPhase}
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
      notePerformance={notePerformance}
      eliminationPhase={eliminationPhase}
    />
  );
}
