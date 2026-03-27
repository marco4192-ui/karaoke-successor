'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Song, PlayerProfile, LyricLine } from '@/types/game';
import {
  usePassTheMicSetup,
  usePassTheMicGame,
  PassTheMicSettingsCard,
  PassTheMicPlayerSelector,
  PassTheMicPlayerQueue,
  PassTheMicPlayer,
  PassTheMicSettings,
} from '@/components/pass-the-mic';

export interface PassTheMicSegment {
  startTime: number;
  endTime: number;
  playerId: string | null;
}

// ===================== SETUP SCREEN =====================
interface PassTheMicSetupProps {
  profiles: PlayerProfile[];
  onSelectSong: (players: PassTheMicPlayer[], settings: PassTheMicSettings) => void;
  onBack: () => void;
}

export function PassTheMicSetupScreen({ profiles, onSelectSong, onBack }: PassTheMicSetupProps) {
  const {
    selectedPlayers,
    settings,
    error,
    activeProfiles,
    globalDifficulty,
    togglePlayer,
    updateSettings,
    setGlobalDifficulty,
    createPlayers,
    validateSelection,
    getFinalSettings,
  } = usePassTheMicSetup(profiles);

  const handleSelectSong = () => {
    const validation = validateSelection();
    if (!validation.valid) return;

    const players = createPlayers();
    onSelectSong(players, getFinalSettings());
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={onBack} className="text-white/60">
          ← Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold">🎤 Pass the Mic</h1>
          <p className="text-white/60">Take turns singing parts of a song!</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 mb-6 text-red-400">
          {error}
        </div>
      )}

      {/* Settings */}
      <PassTheMicSettingsCard
        settings={settings}
        globalDifficulty={globalDifficulty}
        onUpdateSettings={updateSettings}
        onSetDifficulty={setGlobalDifficulty}
      />

      {/* Player Selection */}
      <PassTheMicPlayerSelector
        profiles={activeProfiles}
        selectedPlayers={selectedPlayers}
        onTogglePlayer={togglePlayer}
      />

      {/* Summary */}
      <Card className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 mb-6">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-lg">Ready to Play!</h3>
              <p className="text-sm text-white/60">{selectedPlayers.length} players selected</p>
              <p className="text-xs text-white/40 mt-1">
                Segment duration: {settings.segmentDuration}s • Random switches: {settings.randomSwitches ? 'On' : 'Off'}
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-cyan-400">{selectedPlayers.length}</div>
              <div className="text-xs text-white/40">players</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Select Song Button */}
      <Button
        onClick={handleSelectSong}
        disabled={selectedPlayers.length < 2}
        className="w-full py-6 text-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400"
      >
        🎵 Select Song ({selectedPlayers.length} Players)
      </Button>
    </div>
  );
}

// ===================== PASS THE MIC GAME VIEW =====================
interface PassTheMicGameViewProps {
  players: PassTheMicPlayer[];
  song: Song;
  segments: PassTheMicSegment[];
  settings: PassTheMicSettings;
  onUpdateGame: (players: PassTheMicPlayer[], segments: PassTheMicSegment[]) => void;
  onEndGame: () => void;
}

export function PassTheMicGameView({ players, song, segments, settings, onUpdateGame, onEndGame }: PassTheMicGameViewProps) {
  const {
    currentSegmentIndex,
    currentPlayerIndex,
    currentTime,
    isPlaying,
    countdown,
    switchCountdown,
    currentPlayer,
    audioRef,
    progress,
    currentLyrics,
    startGame,
    endGameEarly,
    formatTime,
  } = usePassTheMicGame(players, song, segments, settings, onEndGame);

  return (
    <div className="max-w-6xl mx-auto">
      {/* Audio Element */}
      {song.audioUrl && (
        <audio
          ref={audioRef}
          src={song.audioUrl}
          onTimeUpdate={(e) => {}}
          onEnded={() => {}}
          className="hidden"
        />
      )}

      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Badge className="bg-cyan-500/20 text-cyan-400 text-lg px-3 py-1">🎤 PASS THE MIC</Badge>
          <span className="text-white/60 text-sm">{song.title}</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-purple-500/20 text-purple-400">
            Segment {currentSegmentIndex + 1}/{segments.length}
          </Badge>
        </div>
      </div>

      {/* Current Player Display */}
      <Card className="bg-gradient-to-br from-white/5 border-white/10 mb-4">
        <CardContent className="py-6">
          <div className="text-center">
            {switchCountdown !== null && (
              <div className="mb-4 text-2xl text-yellow-400 animate-pulse">
                🔄 Switching in {switchCountdown}...
              </div>
            )}
            
            {!isPlaying && countdown > 0 ? (
              <div className="text-6xl font-bold text-cyan-400 animate-pulse">{countdown}</div>
            ) : !isPlaying && countdown === 0 ? (
              <Button onClick={startGame} className="bg-gradient-to-r from-cyan-500 to-blue-500 px-8 py-4 text-xl">
                🎤 Start Singing!
              </Button>
            ) : (
              <>
                <div className="text-sm text-white/60 mb-2">NOW SINGING</div>
                <div className="flex items-center justify-center gap-4 mb-4">
                  {currentPlayer?.avatar ? (
                    <img src={currentPlayer.avatar} alt={currentPlayer.name} className="w-16 h-16 rounded-full object-cover border-4 border-cyan-500" />
                  ) : (
                    <div 
                      className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold border-4 border-cyan-500"
                      style={{ backgroundColor: currentPlayer?.color }}
                    >
                      {currentPlayer?.name?.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="text-4xl font-bold">{currentPlayer?.name}</span>
                </div>
                <div className="text-2xl font-bold text-cyan-400">{currentPlayer?.score.toLocaleString()} pts</div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Progress */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-white/40 mb-1">
          <span>Song Progress</span>
          <span>{formatTime(currentTime)} / {formatTime(song.duration)}</span>
        </div>
        <Progress value={progress} className="h-2 bg-white/10" />
      </div>

      {/* Lyrics Display */}
      {currentLyrics && (
        <Card className="bg-black/30 border-white/10 mb-4">
          <CardContent className="py-6">
            <div className="text-center text-2xl font-bold text-white">
              {currentLyrics.text}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Player Queue */}
      <PassTheMicPlayerQueue
        players={players}
        currentPlayerIndex={currentPlayerIndex}
      />

      {/* End Game Button */}
      {isPlaying && (
        <Button
          onClick={endGameEarly}
          variant="outline"
          className="w-full mt-4 border-white/20 text-white/60 hover:text-white"
        >
          End Game Early
        </Button>
      )}

      {/* Game Over */}
      {!isPlaying && countdown === 0 && (
        <Card className="bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-500/30 mt-6">
          <CardContent className="py-8">
            <div className="text-center">
              <div className="text-6xl mb-4">🎉</div>
              <h2 className="text-2xl font-bold mb-4">Game Complete!</h2>
              <Button onClick={onEndGame} className="bg-gradient-to-r from-amber-500 to-yellow-500 px-8">
                Return to Menu
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
