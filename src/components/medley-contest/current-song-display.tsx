'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { MedleyPlayer, MedleySong } from './use-medley-setup';

type GamePhase = 'countdown' | 'playing' | 'transition' | 'ended';

interface CurrentSongDisplayProps {
  currentMedleySong: MedleySong;
  players: MedleyPlayer[];
  phase: GamePhase;
  countdown: number;
  transitionCountdown: number;
  songTime: number;
  snippetProgress: number;
  onStartGame: () => void;
  onEndGame: () => void;
}

export function CurrentSongDisplay({
  currentMedleySong,
  players,
  phase,
  countdown,
  transitionCountdown,
  songTime,
  snippetProgress,
  onStartGame,
  onEndGame,
}: CurrentSongDisplayProps) {
  return (
    <Card className={`bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/30 mb-4 ${
      phase === 'playing' ? '' : 'opacity-50'
    }`}>
      <CardContent className="py-6">
        {phase === 'countdown' && countdown > 0 ? (
          <div className="text-center">
            <div className="text-6xl font-bold text-purple-400 animate-pulse">{countdown}</div>
            <div className="text-lg text-white/60 mt-2">Get ready for Medley!</div>
          </div>
        ) : phase === 'countdown' && countdown === 0 ? (
          <div className="text-center">
            <div className="text-4xl mb-4">🎵</div>
            <h3 className="text-xl font-bold mb-2">Medley Contest</h3>
            <p className="text-white/60 mb-4">Song snippets await!</p>
            <Button onClick={onStartGame} className="bg-gradient-to-r from-purple-500 to-pink-500 px-8 py-4 text-xl">
              🎤 Start Medley!
            </Button>
          </div>
        ) : phase === 'transition' ? (
          <div className="text-center">
            <div className="text-4xl mb-4 animate-pulse">🔄</div>
            <h3 className="text-2xl font-bold mb-2">Next Song Coming...</h3>
            <div className="text-4xl font-bold text-pink-400">{transitionCountdown}</div>
            <div className="text-white/60 mt-2">Get ready!</div>
          </div>
        ) : phase === 'ended' ? (
          <div className="text-center">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-2xl font-bold mb-4">Medley Complete!</h2>
            <Button onClick={onEndGame} className="bg-gradient-to-r from-purple-500 to-pink-500 px-8">
              Return to Menu
            </Button>
          </div>
        ) : (
          <>
            {/* Current Song Info */}
            <div className="text-center mb-4">
              <div className="text-sm text-white/60 mb-1">NOW SINGING</div>
              <h3 className="text-2xl font-bold">{currentMedleySong.song.title}</h3>
              <p className="text-white/60">{currentMedleySong.song.artist}</p>
            </div>

            {/* Snippet Progress */}
            <div className="mb-4">
              <div className="flex justify-between text-xs text-white/40 mb-1">
                <span>Snippet Progress</span>
                <span>{Math.floor(songTime / 1000)}s / {Math.floor(currentMedleySong.duration / 1000)}s</span>
              </div>
              <Progress value={snippetProgress} className="h-3 bg-white/10" />
            </div>

            {/* Player Scores */}
            <div className="flex justify-center gap-6">
              {players.map(player => (
                <div key={player.id} className="text-center">
                  {player.avatar ? (
                    <img src={player.avatar} alt={player.name} className="w-12 h-12 rounded-full object-cover mx-auto border-2 border-purple-500" />
                  ) : (
                    <div 
                      className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold mx-auto border-2 border-purple-500"
                      style={{ backgroundColor: player.color }}
                    >
                      {player.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="font-medium mt-1">{player.name}</div>
                  <div className="text-purple-400 font-bold">{player.score.toLocaleString()}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
