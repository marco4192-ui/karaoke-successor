'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Song } from '@/types/game';
import { BattleRoyaleGame, BattleRoyalePlayer, getBattleRoyaleStats } from '@/lib/game/battle-royale';
import { LyricsDisplay } from './lyrics-display';
import { PlayerCard } from './player-card';

interface PlayingViewProps {
  game: BattleRoyaleGame;
  stats: ReturnType<typeof getBattleRoyaleStats>;
  sortedPlayers: BattleRoyalePlayer[];
  activePlayers: BattleRoyalePlayer[];
  currentSong: Song | null;
  currentTime: number;
  roundTimeLeft: number;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  setCurrentTime: (time: number) => void;
  onRoundEnd: () => void;
}

export function PlayingView({
  game,
  stats,
  sortedPlayers,
  activePlayers,
  currentSong,
  currentTime,
  roundTimeLeft,
  audioRef,
  videoRef,
  setCurrentTime,
  onRoundEnd,
}: PlayingViewProps) {
  const currentRound = game.rounds[game.rounds.length - 1];

  return (
    <div className="max-w-6xl mx-auto">
      {/* Hidden Audio Element */}
      {currentSong?.audioUrl && (
        <audio
          ref={audioRef}
          onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime * 1000)}
          onEnded={() => onRoundEnd()}
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
          <LyricsDisplay 
            lyrics={currentSong.lyrics} 
            currentTime={currentTime} 
          />
        </div>
      )}

      {/* Player Display - Evenly distributed rows with profile, name, and score box */}
      <div className="flex flex-col gap-4 mb-6">
        {/* Calculate how many players per row based on count */}
        {(() => {
          const activePlayerCount = sortedPlayers.filter(p => !p.eliminated).length;
          const playersPerRow = activePlayerCount <= 4 ? activePlayerCount : Math.ceil(activePlayerCount / 2);
          const firstRow = sortedPlayers.filter(p => !p.eliminated).slice(0, playersPerRow);
          const secondRow = sortedPlayers.filter(p => !p.eliminated).slice(playersPerRow);
          const eliminatedPlayers = sortedPlayers.filter(p => p.eliminated);

          return (
            <>
              {/* Active Players - Row 1 */}
              <div className={`grid gap-3 ${firstRow.length <= 4 ? 'grid-cols-' + firstRow.length : 'grid-cols-4'}`}
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

              {/* Active Players - Row 2 (if needed) */}
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

              {/* Eliminated Players - Grayed out at bottom */}
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
            onClick={onRoundEnd}
            className="px-12 py-6 text-xl bg-gradient-to-r from-red-500 to-pink-500 animate-pulse"
          >
            💔 Eliminate Lowest Scorer
          </Button>
        </div>
      )}
    </div>
  );
}
