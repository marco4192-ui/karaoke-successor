'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Song, PlayerProfile, LyricLine, PLAYER_COLORS } from '@/types/game';
import {
  usePassTheMicSetup,
  usePassTheMicGame,
  PassTheMicSettingsCard,
  PassTheMicPlayerSelector,
  PassTheMicPlayerQueue,
  PassTheMicPlayer,
  PassTheMicSettings,
} from '@/components/pass-the-mic';
import { NoteHighway } from '@/components/game/note-highway';

export interface PassTheMicSegment {
  startTime: number;
  endTime: number;
  playerId: string | null;
}

// Constants
const SING_LINE_POSITION = 25;
const NOTE_WINDOW = 4000;
const VISIBLE_TOP = 8;
const VISIBLE_RANGE = 77;

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
    playerScores,
    currentPlayerScore,
    currentPlayerCombo,
    visibleNotes,
    pitchStats,
    pitchResult,
    startGame,
    endGameEarly,
    formatTime,
  } = usePassTheMicGame(players, song, segments, settings, onEndGame);

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-black">
      {/* Audio Element */}
      {song.audioUrl && (
        <audio
          ref={audioRef}
          src={song.audioUrl}
          className="hidden"
        />
      )}

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-30 bg-gradient-to-b from-black/80 to-transparent p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Badge className="bg-cyan-500/20 text-cyan-400 text-lg px-3 py-1">🎤 PASS THE MIC</Badge>
            <span className="text-white/60 text-sm">{song.title}</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-purple-500/20 text-purple-400">
              Segment {currentSegmentIndex + 1}/{segments.length}
            </Badge>
            <Button onClick={endGameEarly} variant="outline" size="sm" className="border-white/20">
              End
            </Button>
          </div>
        </div>
      </div>

      {/* Current Player Display */}
      <div className="absolute top-16 left-0 right-0 z-20 px-4">
        <Card className="bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border-cyan-500/30 backdrop-blur-sm">
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {currentPlayer?.avatar ? (
                  <img src={currentPlayer.avatar} alt={currentPlayer.name} className="w-12 h-12 rounded-full object-cover border-2 border-cyan-500" />
                ) : (
                  <div 
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-bold border-2 border-cyan-500"
                    style={{ backgroundColor: currentPlayer?.color }}
                  >
                    {currentPlayer?.name?.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="text-xs text-white/60">NOW SINGING</div>
                  <div className="text-xl font-bold">{currentPlayer?.name}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-cyan-400">{currentPlayerScore.toLocaleString()}</div>
                <div className="text-xs text-white/60">Combo: {currentPlayerCombo}x</div>
              </div>
            </div>
            
            {switchCountdown !== null && switchCountdown > 0 && (
              <div className="mt-2 text-center text-yellow-400 animate-pulse text-sm">
                🔄 Switching in {switchCountdown}...
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Game Area with Note Highway */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/50 z-5" />

        {/* Countdown */}
        {countdown > 0 && (
          <div key={countdown} className="absolute inset-0 flex items-center justify-center bg-black/60 z-30">
            <div className="text-9xl font-black text-white drop-shadow-2xl">
              {countdown}
            </div>
          </div>
        )}

        {/* Start Button */}
        {!isPlaying && countdown === 0 && progress === 0 && (
          <div className="absolute inset-0 flex items-center justify-center z-30">
            <Button onClick={startGame} className="bg-gradient-to-r from-cyan-500 to-blue-500 px-8 py-6 text-xl">
              🎤 Start Singing!
            </Button>
          </div>
        )}

        {/* Note Highway - Show during gameplay */}
        {isPlaying && pitchStats && (
          <NoteHighway
            visibleNotes={visibleNotes}
            currentTime={currentTime}
            pitchStats={pitchStats}
            detectedPitch={pitchResult?.note ?? null}
            noteShapeStyle="rounded"
            singLinePosition={SING_LINE_POSITION}
            noteWindow={NOTE_WINDOW}
            playerColor={PLAYER_COLORS[0]}
            showPlayerLabel={false}
            visibleTop={VISIBLE_TOP}
            visibleRange={VISIBLE_RANGE}
          />
        )}

        {/* Lyrics Display */}
        {isPlaying && currentLyrics && (
          <div className="absolute bottom-24 left-0 right-0 z-20 px-4">
            <div className="max-w-4xl mx-auto">
              <Card className="bg-black/50 backdrop-blur-sm border-white/10">
                <CardContent className="py-4">
                  <div className="text-center text-2xl font-bold text-white">
                    {currentLyrics.text}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Player Queue */}
        <div className="absolute bottom-48 left-4 right-4 z-20">
          <PassTheMicPlayerQueue
            players={players.map(p => ({
              ...p,
              score: playerScores.get(p.id) || 0,
            }))}
            currentPlayerIndex={currentPlayerIndex}
          />
        </div>

        {/* Progress Bar */}
        <div className="absolute bottom-0 left-0 right-0 z-20 h-1 bg-white/10">
          <div 
            className="h-full bg-gradient-to-r from-cyan-500 to-purple-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        
        {/* Time Display */}
        <div className="absolute bottom-2 right-4 z-20 text-white/60 text-sm font-mono">
          {formatTime(currentTime)} / {formatTime(song.duration)}
        </div>
      </div>

      {/* Game Over */}
      {!isPlaying && countdown === 0 && progress > 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-30">
          <Card className="bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-500/30 max-w-lg w-full mx-4">
            <CardContent className="py-8">
              <div className="text-center">
                <div className="text-6xl mb-4">🎉</div>
                <h2 className="text-2xl font-bold mb-4">Game Complete!</h2>
                
                {/* Final Scores */}
                <div className="space-y-2 mb-6">
                  {players.map((player, idx) => {
                    const score = playerScores.get(player.id) || 0;
                    return (
                      <div key={player.id} className="flex items-center justify-between bg-white/5 rounded-lg px-4 py-2">
                        <div className="flex items-center gap-3">
                          <div className="text-lg font-bold">{idx + 1}.</div>
                          <div>{player.name}</div>
                        </div>
                        <div className="text-xl font-bold text-cyan-400">{score.toLocaleString()}</div>
                      </div>
                    );
                  })}
                </div>
                
                <Button onClick={onEndGame} className="bg-gradient-to-r from-amber-500 to-yellow-500 px-8">
                  Return to Menu
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
