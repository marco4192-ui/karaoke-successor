'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Song, PlayerProfile, LyricLine } from '@/types/game';
import {
  useMedleySetup,
  useMedleyGame,
  MedleySettingsCard,
  MedleyPlayerSelector,
  SongQueueDisplay,
  CurrentSongDisplay,
  MedleyPlayer,
  MedleySong,
  MedleySettings,
} from '@/components/medley-contest';

// ===================== SETUP SCREEN =====================
interface MedleySetupProps {
  profiles: PlayerProfile[];
  songs: Song[];
  onStartGame: (players: MedleyPlayer[], medleySongs: MedleySong[], settings: MedleySettings) => void;
  onBack: () => void;
}

export function MedleySetupScreen({ profiles, songs, onStartGame, onBack }: MedleySetupProps) {
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
    generateMedleySongs,
    validateSelection,
    getFinalSettings,
  } = useMedleySetup(profiles, songs);

  const handleStartGame = () => {
    const validation = validateSelection();
    if (!validation.valid) return;

    const players = createPlayers();
    const medleySongs = generateMedleySongs();
    
    if (medleySongs.length === 0) {
      return;
    }

    onStartGame(players, medleySongs, getFinalSettings());
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={onBack} className="text-white/60">
          ← Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold">🎵 Medley Contest</h1>
          <p className="text-white/60">Sing short snippets of multiple songs in a row!</p>
        </div>
      </div>

      {/* How it works */}
      <Card className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/30 mb-6">
        <CardContent className="py-4">
          <h3 className="font-bold text-lg mb-2 text-purple-400">🎮 How it works</h3>
          <ul className="text-sm text-white/70 space-y-2">
            <li>🎵 Random song snippets will play one after another</li>
            <li>⏱️ Each snippet is {settings.snippetDuration} seconds long</li>
            <li>🎤 Sing as many snippets as you can!</li>
            <li>🏆 Score is calculated across all snippets</li>
          </ul>
        </CardContent>
      </Card>

      {error && (
        <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 mb-6 text-red-400">
          {error}
        </div>
      )}

      {/* Settings */}
      <MedleySettingsCard
        settings={settings}
        globalDifficulty={globalDifficulty}
        onUpdateSettings={updateSettings}
        onSetDifficulty={setGlobalDifficulty}
      />

      {/* Player Selection */}
      <MedleyPlayerSelector
        profiles={activeProfiles}
        selectedPlayers={selectedPlayers}
        onTogglePlayer={togglePlayer}
      />

      {/* Preview */}
      <Card className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/30 mb-6">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-lg">Medley Preview</h3>
              <p className="text-sm text-white/60">
                {settings.snippetCount} songs × {settings.snippetDuration}s = {Math.ceil(settings.snippetCount * settings.snippetDuration / 60)} min total
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-purple-400">{settings.snippetCount * settings.snippetDuration}s</div>
              <div className="text-xs text-white/40">total duration</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Start Button */}
      <Button
        onClick={handleStartGame}
        disabled={selectedPlayers.length < 1}
        className="w-full py-6 text-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400"
      >
        🎵 Start Medley Contest ({selectedPlayers.length} Players)
      </Button>
    </div>
  );
}

// ===================== MEDLEY GAME VIEW =====================
interface MedleyGameViewProps {
  players: MedleyPlayer[];
  medleySongs: MedleySong[];
  settings: MedleySettings;
  onUpdatePlayers: (players: MedleyPlayer[]) => void;
  onEndGame: () => void;
}

export function MedleyGameView({ players, medleySongs, settings, onUpdatePlayers, onEndGame }: MedleyGameViewProps) {
  const {
    currentSongIndex,
    isPlaying,
    countdown,
    phase,
    transitionCountdown,
    currentMedleySong,
    songTime,
    totalProgress,
    snippetProgress,
    currentLyrics,
    startGame,
    endGameEarly,
  } = useMedleyGame(players, medleySongs, settings, onEndGame);

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Badge className="bg-purple-500/20 text-purple-400 text-lg px-3 py-1">🎵 MEDLEY CONTEST</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-pink-500/20 text-pink-400">
            Song {currentSongIndex + 1}/{medleySongs.length}
          </Badge>
        </div>
      </div>

      {/* Current Song Display */}
      <CurrentSongDisplay
        currentMedleySong={currentMedleySong}
        players={players}
        phase={phase}
        countdown={countdown}
        transitionCountdown={transitionCountdown}
        songTime={songTime}
        snippetProgress={snippetProgress}
        onStartGame={startGame}
        onEndGame={onEndGame}
      />

      {/* Total Progress */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-white/40 mb-1">
          <span>Total Progress</span>
          <span>Song {currentSongIndex + 1} of {medleySongs.length}</span>
        </div>
        <Progress value={totalProgress} className="h-2 bg-white/10" />
      </div>

      {/* Song Queue Preview */}
      <SongQueueDisplay
        medleySongs={medleySongs}
        currentSongIndex={currentSongIndex}
        isPlaying={isPlaying}
      />

      {/* Lyrics Display */}
      {phase === 'playing' && currentLyrics && (
        <Card className="bg-black/30 border-white/10 mb-4">
          <CardContent className="py-6">
            <div className="text-center text-2xl font-bold text-white">
              {currentLyrics.text}
            </div>
          </CardContent>
        </Card>
      )}

      {/* End Game Button */}
      {isPlaying && (
        <Button
          onClick={endGameEarly}
          variant="outline"
          className="w-full border-white/20 text-white/60 hover:text-white"
        >
          End Game Early
        </Button>
      )}
    </div>
  );
}
