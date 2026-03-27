'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  getActivePlayers,
  getPlayersByScore,
  startRound,
  endRoundAndEliminate,
  advanceToNextRound,
  getBattleRoyaleStats,
  BattleRoyaleGame,
} from '@/lib/game/battle-royale';
import { Song } from '@/types/game';
import { logger } from '@/lib/logger';

// Re-export Setup Screen from separate file
export { BattleRoyaleSetupScreen } from './battle-royale-setup';
export { PlayerCard } from './battle-royale-player-card';

// Import extracted components
import { PlayerCard } from './battle-royale-player-card';
import { BattleRoyaleWinner } from './battle-royale-winner';
import { BattleRoyaleElimination } from './battle-royale-elimination';
import { BattleRoyaleRoundSetup } from './battle-royale-round-setup';
import { BattleRoyaleLyrics } from './battle-royale-lyrics';
import { useBattleRoyaleGame } from '@/hooks/use-battle-royale-game';

// Battle Royale Game View
interface BattleRoyaleGameViewProps {
  game: BattleRoyaleGame;
  songs: Song[];
  onUpdateGame: (game: BattleRoyaleGame) => void;
  onEndGame: () => void;
}

export function BattleRoyaleGameView({ game, songs, onUpdateGame, onEndGame }: BattleRoyaleGameViewProps) {
  const [showElimination, setShowElimination] = useState(false);
  const stats = getBattleRoyaleStats(game);

  const sortedPlayers = useMemo(() => getPlayersByScore(game), [game]);
  const activePlayers = useMemo(() => getActivePlayers(game), [game]);
  const currentRound = game.rounds[game.rounds.length - 1];
  
  // Use custom hook for game logic
  const {
    currentSong,
    currentTime,
    roundTimeLeft,
    setRoundTimeLeft,
    activePlayers: hookActivePlayers,
    audioRef,
    videoRef,
    stopMedia,
  } = useBattleRoyaleGame({
    game,
    songs,
    currentRound,
    onUpdateGame,
  });
  
  // Get random song for the round
  const getRandomSong = useCallback((): Song | null => {
    if (songs.length === 0) return null;
    return songs[Math.floor(Math.random() * songs.length)];
  }, [songs]);
  
  // Handle round end - eliminates lowest scoring player
  const handleRoundEnd = useCallback(() => {
    stopMedia();
    
    if (activePlayers.length <= 1) return;

    const updatedGame = endRoundAndEliminate(game);
    onUpdateGame(updatedGame);
    setShowElimination(true);

    setTimeout(() => {
      setShowElimination(false);
      
      if (updatedGame.winner) {
        return;
      }
      
      const nextGame = advanceToNextRound(updatedGame);
      onUpdateGame(nextGame);
    }, 4000); // 4 seconds to show elimination animation
  }, [activePlayers.length, game, onUpdateGame, stopMedia]);
  
  // Auto elimination when time runs out
  useEffect(() => {
    if (roundTimeLeft === 0 && game.status === 'playing') {
      handleRoundEnd();
    }
  }, [roundTimeLeft, game.status, handleRoundEnd]);

  // Start next round
  const handleStartRound = () => {
    const song = getRandomSong();
    if (!song) return;

    const updatedGame = startRound(game, song.id, song.title);
    onUpdateGame(updatedGame);
  };

  // Winner celebration
  if (game.status === 'completed' && game.winner) {
    return (
      <BattleRoyaleWinner
        game={game}
        sortedPlayers={sortedPlayers}
        onEndGame={onEndGame}
      />
    );
  }

  // Elimination animation
  if (showElimination) {
    const eliminatedPlayer = sortedPlayers[sortedPlayers.length - 1];
    return (
      <BattleRoyaleElimination
        eliminatedPlayer={eliminatedPlayer}
        remainingCount={activePlayers.length - 1}
      />
    );
  }

  // Setup phase (before round starts)
  if (game.status === 'setup') {
    return (
      <BattleRoyaleRoundSetup
        game={game}
        activeMicPlayers={stats.activeMicPlayers}
        activeCompanionPlayers={stats.activeCompanionPlayers}
        activePlayersCount={activePlayers.length}
        onStartRound={handleStartRound}
      />
    );
  }

  // Playing phase
  return (
    <div className="max-w-6xl mx-auto">
      {/* Hidden Audio Element */}
      {currentSong?.audioUrl && (
        <audio
          ref={audioRef}
          onTimeUpdate={(e) => currentTime}
          onEnded={() => handleRoundEnd()}
          className="hidden"
          preload="auto"
        />
      )}
      
      {/* Video Background - More visible with overlay */}
      {currentSong?.videoBackground && (
        <>
          <video
            ref={videoRef}
            className="fixed inset-0 w-full h-full object-cover -z-10"
            style={{ opacity: 0.5 }}
            muted
            playsInline
            loop
            preload="auto"
          />
          {/* Dark overlay to ensure text readability */}
          <div className="fixed inset-0 bg-black/40 -z-10" />
        </>
      )}

      {/* Round Info */}
      <div className="text-center mb-4">
        <h1 className="text-2xl font-bold">Round {game.currentRound}</h1>
        <p className="text-white/60">{currentRound?.songName || currentSong?.title || 'Loading...'}</p>
        <div className="flex items-center justify-center gap-4 mt-2">
          <Badge variant="outline" className="border-red-500 text-red-400">
            {activePlayers.length} Remaining
          </Badge>
          <Badge className="bg-purple-500/20 text-purple-400">
            {roundTimeLeft}s Left
          </Badge>
          <Badge variant="outline" className="border-green-500 text-green-400">
            🎤 {stats.activeMicPlayers} | 📱 {stats.activeCompanionPlayers}
          </Badge>
        </div>
      </div>

      {/* Timer Progress */}
      <div className="mb-4">
        <Progress 
          value={(roundTimeLeft / (currentRound?.duration || 60)) * 100} 
          className="h-3 bg-white/10"
        />
      </div>
      
      {/* Lyrics Display */}
      {currentSong && (
        <div className="mb-4 bg-black/30 rounded-lg p-3">
          <BattleRoyaleLyrics 
            lyrics={currentSong.lyrics} 
            currentTime={currentTime} 
          />
        </div>
      )}

      {/* Player Display */}
      <div className="flex flex-col gap-4 mb-6">
        {(() => {
          const activePlayerCount = sortedPlayers.filter(p => !p.eliminated).length;
          const playersPerRow = activePlayerCount <= 4 ? activePlayerCount : Math.ceil(activePlayerCount / 2);
          const firstRow = sortedPlayers.filter(p => !p.eliminated).slice(0, playersPerRow);
          const secondRow = sortedPlayers.filter(p => !p.eliminated).slice(playersPerRow);
          const eliminatedPlayers = sortedPlayers.filter(p => p.eliminated);

          return (
            <>
              {/* Active Players - Row 1 */}
              <div className="grid gap-3"
                   style={{ gridTemplateColumns: `repeat(${Math.min(firstRow.length, 6)}, 1fr)` }}>
                {firstRow.map((player, index) => (
                  <PlayerCard
                    key={player.id}
                    player={player}
                    rank={index + 1}
                    isLeading={index === 0}
                  />
                ))}
              </div>

              {/* Active Players - Row 2 */}
              {secondRow.length > 0 && (
                <div className="grid gap-3"
                     style={{ gridTemplateColumns: `repeat(${Math.min(secondRow.length, 6)}, 1fr)` }}>
                  {secondRow.map((player, index) => (
                    <PlayerCard
                      key={player.id}
                      player={player}
                      rank={playersPerRow + index + 1}
                      isLeading={false}
                    />
                  ))}
                </div>
              )}

              {/* Eliminated Players */}
              {eliminatedPlayers.length > 0 && (
                <div className="flex flex-wrap gap-2 justify-center pt-4 border-t border-white/10">
                  {eliminatedPlayers.map((player) => (
                    <div
                      key={player.id}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 grayscale opacity-50"
                    >
                      {player.avatar ? (
                        <img src={player.avatar} alt={player.name} className="w-6 h-6 rounded-full object-cover" />
                      ) : (
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold bg-gray-500"
                        >
                          {player.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="text-sm text-white/60">{player.name}</span>
                      <span className="text-xs text-red-400">Out</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          );
        })()}
      </div>

      {/* End Round Button */}
      {roundTimeLeft === 0 && game.status === 'playing' && (
        <div className="text-center">
          <Button
            onClick={handleRoundEnd}
            className="px-12 py-6 text-xl bg-gradient-to-r from-red-500 to-pink-500 animate-pulse"
          >
            💔 Eliminate Lowest Scorer
          </Button>
        </div>
      )}
    </div>
  );
}
