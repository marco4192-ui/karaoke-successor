'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Song, PlayerProfile, LyricLine } from '@/types/game';
import {
  useCompanionSetup,
  useCompanionGame,
  GameSettingsCard,
  PlayerSelector,
  CurrentPlayerDisplay,
  PlayerQueue,
  GameOverDisplay,
  CompanionPlayer,
  CompanionSingAlongSettings,
} from '@/components/companion-singalong';

// ===================== SETUP SCREEN =====================
interface CompanionSingAlongSetupProps {
  profiles: PlayerProfile[];
  onSelectSong: (players: CompanionPlayer[], settings: CompanionSingAlongSettings) => void;
  onBack: () => void;
}

export function CompanionSingAlongSetupScreen({ profiles, onSelectSong, onBack }: CompanionSingAlongSetupProps) {
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
  } = useCompanionSetup(profiles);

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
          <h1 className="text-3xl font-bold">📱 Companion Sing-A-Long</h1>
          <p className="text-white/60">Your phone randomly lights up - that's your cue to sing!</p>
        </div>
      </div>

      {/* How it works */}
      <Card className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/30 mb-6">
        <CardContent className="py-4">
          <h3 className="font-bold text-lg mb-2 text-emerald-400">🎮 How it works</h3>
          <ul className="text-sm text-white/70 space-y-2">
            <li>📱 Everyone keeps their phone nearby</li>
            <li>⚡ When your phone screen flashes, it's YOUR turn to sing!</li>
            <li>🎤 No one knows who's next until the blink</li>
            <li>🏆 Score points for your team while you sing!</li>
          </ul>
        </CardContent>
      </Card>

      {error && (
        <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 mb-6 text-red-400">
          {error}
        </div>
      )}

      {/* Settings */}
      <GameSettingsCard
        settings={settings}
        globalDifficulty={globalDifficulty}
        onUpdateSettings={updateSettings}
        onSetDifficulty={setGlobalDifficulty}
      />

      {/* Player Selection */}
      <PlayerSelector
        profiles={activeProfiles}
        selectedPlayers={selectedPlayers}
        onTogglePlayer={togglePlayer}
      />

      {/* Summary */}
      <Card className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/30 mb-6">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-lg">Ready to Play!</h3>
              <p className="text-sm text-white/60">{selectedPlayers.length} players selected</p>
              <p className="text-xs text-white/40 mt-1">
                Turn duration: {settings.minTurnDuration}-{settings.maxTurnDuration}s • Blink warning: {settings.blinkWarning}s
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-emerald-400">{selectedPlayers.length}</div>
              <div className="text-xs text-white/40">players</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Select Song Button */}
      <Button
        onClick={handleSelectSong}
        disabled={selectedPlayers.length < 2}
        className="w-full py-6 text-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400"
      >
        🎵 Select Song ({selectedPlayers.length} Players)
      </Button>
    </div>
  );
}

// ===================== COMPANION GAME VIEW =====================
interface CompanionGameViewProps {
  players: CompanionPlayer[];
  song: Song;
  settings: CompanionSingAlongSettings;
  onUpdatePlayers: (players: CompanionPlayer[]) => void;
  onEndGame: () => void;
}

export function CompanionGameView({ players, song, settings, onUpdatePlayers, onEndGame }: CompanionGameViewProps) {
  const {
    currentPlayerIndex,
    nextPlayerIndex,
    currentTime,
    isPlaying,
    countdown,
    switchWarning,
    timeUntilSwitch,
    gamePhase,
    currentPlayer,
    audioRef,
    progress,
    switchProgress,
    currentLyrics,
    startGame,
    endGameEarly,
    formatTime,
  } = useCompanionGame(players, song, settings, onEndGame);

  return (
    <div className="max-w-6xl mx-auto">
      {/* Audio Element */}
      {song.audioUrl && (
        <audio
          ref={audioRef}
          src={song.audioUrl}
          onTimeUpdate={(e) => {}}
          onEnded={() => { }}
          className="hidden"
        />
      )}

      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Badge className="bg-emerald-500/20 text-emerald-400 text-lg px-3 py-1">📱 COMPANION SING-A-LONG</Badge>
          <span className="text-white/60 text-sm">{song.title}</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-purple-500/20 text-purple-400">
            {formatTime(currentTime)}
          </Badge>
        </div>
      </div>

      {/* Current Player Display */}
      <CurrentPlayerDisplay
        currentPlayer={currentPlayer}
        players={players}
        nextPlayerIndex={nextPlayerIndex}
        gamePhase={gamePhase}
        isPlaying={isPlaying}
        countdown={countdown}
        switchWarning={switchWarning}
        onStartGame={startGame}
      />

      {/* Progress */}
      <div className="mb-4 space-y-2">
        <div>
          <div className="flex justify-between text-xs text-white/40 mb-1">
            <span>Song Progress</span>
            <span>{formatTime(currentTime)} / {formatTime(song.duration)}</span>
          </div>
          <Progress value={progress} className="h-2 bg-white/10" />
        </div>
        
        {isPlaying && gamePhase === 'playing' && (
          <div>
            <div className="flex justify-between text-xs text-white/40 mb-1">
              <span>Next Switch</span>
              <span>{Math.ceil(timeUntilSwitch / 1000)}s</span>
            </div>
            <Progress 
              value={switchProgress} 
              className={`h-1 ${switchWarning ? 'bg-red-500/30' : 'bg-white/10'}`}
            />
          </div>
        )}
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
      <PlayerQueue
        players={players}
        currentPlayerIndex={currentPlayerIndex}
        nextPlayerIndex={nextPlayerIndex}
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
      {gamePhase === 'ended' && (
        <GameOverDisplay players={players} onReturnToMenu={onEndGame} />
      )}
    </div>
  );
}
