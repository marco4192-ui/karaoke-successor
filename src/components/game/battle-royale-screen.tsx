'use client';

import React from 'react';
import { Song } from '@/types/game';
import { BattleRoyaleGame, getEliminationOrder } from '@/lib/game/battle-royale';
import { useBattleRoyaleGame } from '@/hooks/use-battle-royale-game';
import { BattleRoyaleSetupScreen } from './battle-royale/setup-screen';
import { WinnerView } from './battle-royale/winner-view';
import { EliminationView } from './battle-royale/elimination-view';
import { RoundSetupView } from './battle-royale/round-setup-view';
import { PlayingView } from './battle-royale/playing-view';

export { BattleRoyaleSetupScreen };

// Battle Royale Game View
interface BattleRoyaleGameViewProps {
  game: BattleRoyaleGame;
  songs: Song[];
  onUpdateGame: (game: BattleRoyaleGame) => void;
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
    audioRef,
    videoRef,
    handleRoundEnd,
    handleStartRound,
    setCurrentTime,
  } = useBattleRoyaleGame({ game, songs, onUpdateGame });

  // Winner celebration
  if (game.status === 'completed' && game.winner) {
    return <WinnerView winner={game.winner} eliminationOrder={getEliminationOrder(game)} onEndGame={onEndGame} />;
  }

  // Elimination animation with "look up and turn gray" effect
  if (showElimination) {
    const eliminatedPlayer = sortedPlayers[sortedPlayers.length - 1];
    return (
      <EliminationView
        eliminatedPlayer={eliminatedPlayer}
        remainingPlayersCount={activePlayers.length - 1}
      />
    );
  }

  // Setup phase (before round starts)
  if (game.status === 'setup') {
    return (
      <RoundSetupView
        game={game}
        stats={stats}
        activePlayers={activePlayers}
        onStartRound={handleStartRound}
        onBack={onBack}
      />
    );
  }

  // Playing phase
  return (
    <PlayingView
      game={game}
      stats={stats}
      sortedPlayers={sortedPlayers}
      activePlayers={activePlayers}
      currentSong={currentSong}
      currentTime={currentTime}
      roundTimeLeft={roundTimeLeft}
      roundDuration={game.rounds[game.rounds.length - 1]?.duration ?? 60}
      audioRef={audioRef}
      videoRef={videoRef}
      setCurrentTime={setCurrentTime}
      onRoundEnd={handleRoundEnd}
      onBack={onBack}
    />
  );
}
