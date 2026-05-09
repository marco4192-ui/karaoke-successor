'use client';

/**
 * Medley Contest — Game Screen (Orchestrator)
 *
 * Thin wrapper that wires the useMedleyGame hook to phase-specific UI
 * components.  No game logic lives here — only JSX routing.
 */

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { usePartyStore } from '@/lib/game/party-store';
import { useMedleyGame, type MedleyGameScreenProps } from './medley-game-hook';
import { PlayerIntroCard } from './medley-game-components';
import { MedleyPlayingUI } from './medley-game-playing';
import { MedleyRoundResults, MedleyFinalResults } from './medley-game-results';

// ===================== COMPONENT =====================

export function MedleyGameScreen(props: MedleyGameScreenProps) {
  const {
    players: initialPlayers,
    songs: medleySongs,
    settings,
    matchups,
    seriesHistory,
    onRoundComplete,
    onEndGame,
  } = props;

  const setIsSongPlaying = usePartyStore(s => s.setIsSongPlaying);

  const state = useMedleyGame({
    players: initialPlayers,
    songs: medleySongs,
    settings,
    matchups,
    seriesHistory,
    onRoundComplete,
    onEndGame,
  });

  const {
    phase, countdown, transitionCount,
    currentSnippet, currentSnippetIdx, snippetNotes,
    audioRef, audioError,
    playersDisplay, multiPitch,
    snippetProgress, totalProgress, currentMatchup, currentLyricLine,
    isTeam,
    handleStart, handleEndEarly, handleRoundComplete, handleShowFinalResults,
  } = state;

  return (
    <div className="h-full flex flex-col relative overflow-hidden">
      {/* Audio Element */}
      <audio
        ref={audioRef}
        className="hidden"
        preload="auto"
        onError={() => { /* error handled via state */ }}
      />

      {/* ── INTRO ── */}
      {phase === 'intro' && (
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="text-5xl mb-6">🎵</div>
          <h2 className="text-3xl font-bold mb-2">Medley Contest</h2>
          <p className="text-white/60 mb-6">
            {medleySongs.length} Snippets · {settings.snippetDuration}s pro Song
            {isTeam && ` · ${settings.teamSize} vs ${settings.teamSize}`}
          </p>

          {/* Player cards */}
          <div className="w-full max-w-3xl space-y-3 mb-8">
            {isTeam ? (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Badge className="bg-blue-500/30 text-blue-300 mb-2">Team A</Badge>
                  <div className="space-y-2">
                    {playersDisplay.filter(p => p.team === 0).map(p => (
                      <PlayerIntroCard key={p.id} player={p} inputLabel={p.inputType === 'local' ? (p.micName || 'Mic') : 'Companion'} />
                    ))}
                  </div>
                </div>
                <div>
                  <Badge className="bg-red-500/30 text-red-300 mb-2">Team B</Badge>
                  <div className="space-y-2">
                    {playersDisplay.filter(p => p.team === 1).map(p => (
                      <PlayerIntroCard key={p.id} player={p} inputLabel={p.inputType === 'local' ? (p.micName || 'Mic') : 'Companion'} />
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {playersDisplay.map(p => (
                  <PlayerIntroCard key={p.id} player={p} inputLabel={p.inputType === 'local' ? (p.micName || 'Mic') : 'Companion'} />
                ))}
              </div>
            )}
          </div>

          {/* Mic init errors */}
          {multiPitch.errors.size > 0 && (
            <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-3 mb-4 max-w-lg text-center">
              <p className="text-yellow-400 text-sm">
                ⚠️ Mikrofon-Warnung: {Array.from(multiPitch.errors.values()).join(', ')}
              </p>
            </div>
          )}

          {seriesHistory.length > 0 && (
            <p className="text-white/40 mb-4">Runde {seriesHistory.length + 1}</p>
          )}

          <Button onClick={handleStart}
            className="px-12 py-4 text-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400">
            🎤 Start!
          </Button>
        </div>
      )}

      {/* ── COUNTDOWN ── */}
      {phase === 'countdown' && (
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="text-8xl font-bold text-purple-400 animate-pulse">{countdown}</div>
          <p className="text-white/60 mt-4">Macht euch bereit...</p>
        </div>
      )}

      {/* ── PLAYING ── */}
      {phase === 'playing' && currentSnippet && (
        <MedleyPlayingUI
          currentSnippet={currentSnippet}
          currentSnippetIdx={currentSnippetIdx}
          snippetCount={medleySongs.length}
          snippetNotes={snippetNotes}
          currentLyricLine={currentLyricLine}
          currentTimeMs={state.currentTimeMs}
          playersDisplay={playersDisplay}
          snippetProgress={snippetProgress}
          totalProgress={totalProgress}
          currentMatchup={currentMatchup}
          isTeam={isTeam}
          multiPitch={multiPitch}
          handleEndEarly={handleEndEarly}
        />
      )}

      {/* ── TRANSITION (pulse) ── */}
      {phase === 'transition' && currentSnippet && (
        <div className="flex-1 flex flex-col items-center justify-center animate-pulse">
          <div className="text-5xl mb-4">🔄</div>
          <div className="text-3xl font-bold text-pink-400 mb-2">{transitionCount}</div>
          <p className="text-white/60 mb-4">Nächstes Snippet...</p>

          {/* Preview next players */}
          {isTeam && currentSnippetIdx + 1 < matchups.length && (() => {
            const next = matchups[currentSnippetIdx + 1];
            const nextSong = medleySongs[currentSnippetIdx + 1]?.song;
            return nextSong ? (
              <div className="bg-black/30 rounded-xl p-4 text-center">
                <p className="text-sm text-white/40 mb-1">NÄCHSTER SONG</p>
                <h3 className="text-lg font-bold">{nextSong.title}</h3>
                <p className="text-white/60 text-sm">{nextSong.artist}</p>
                <div className="flex items-center justify-center gap-3 mt-2">
                  <span className="text-sm" style={{ color: next.playerA.color }}>{next.playerA.name}</span>
                  <span className="text-white/40">vs</span>
                  <span className="text-sm" style={{ color: next.playerB.color }}>{next.playerB.name}</span>
                </div>
              </div>
            ) : null;
          })()}

          {!isTeam && currentSnippetIdx + 1 < medleySongs.length && (
            <div className="bg-black/30 rounded-xl p-4 text-center">
              <p className="text-sm text-white/40 mb-1">NÄCHSTER SONG</p>
              <h3 className="text-lg font-bold">{medleySongs[currentSnippetIdx + 1]?.song.title}</h3>
              <p className="text-white/60 text-sm">{medleySongs[currentSnippetIdx + 1]?.song.artist}</p>
              <p className="text-xs text-white/40 mt-2">Alle Spieler singen weiter!</p>
            </div>
          )}
        </div>
      )}

      {/* ── ROUND RESULTS ── */}
      {phase === 'round-results' && (
        <div className="flex-1 overflow-y-auto p-4">
          <MedleyRoundResults
            players={playersDisplay}
            settings={settings}
            seriesHistory={seriesHistory}
            roundNumber={seriesHistory.length + 1}
            onNextRound={() => {
              setIsSongPlaying(false);
              onEndGame();
            }}
            onEndSeries={handleShowFinalResults}
            onRecordAndEnd={handleRoundComplete}
          />
        </div>
      )}

      {/* ── FINAL RESULTS ── */}
      {phase === 'final-results' && (
        <div className="flex-1 overflow-y-auto p-4">
          <MedleyFinalResults
            players={playersDisplay}
            settings={settings}
            seriesHistory={seriesHistory}
            onBack={onEndGame}
          />
        </div>
      )}

      {/* Audio error */}
      {audioError && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-red-500/20 border border-red-500/30 px-4 py-2 rounded-lg text-red-400 text-sm">
          {audioError}
        </div>
      )}
    </div>
  );
}
