'use client';

/**
 * Medley Contest — Game Screen (Orchestrator)
 *
 * Thin wrapper that wires the useMedleyGame hook to phase-specific UI
 * components.  No game logic lives here — only JSX routing.
 */

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useMedleyGame, type MedleyGameScreenProps } from './medley-game-hook';
import { PlayerIntroCard } from './medley-game-components';
import { MedleyPlayingUI } from './medley-game-playing';
import { MedleyRoundResults, MedleyFinalResults } from './medley-game-results';
import { useTranslation } from '@/lib/i18n/translations';

// ===================== COMPONENT =====================

export function MedleyGameScreen(props: MedleyGameScreenProps) {
  const { t } = useTranslation();
  const {
    players: initialPlayers,
    songs: medleySongs,
    settings,
    matchups,
    seriesHistory,
    onRoundComplete,
    onEndGame,
  } = props;

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
    lastScoringEvents, currentDynamicDifficulty,
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
          <h2 className="text-3xl font-bold mb-2">{t('medley.gameTitle')}</h2>
          <p className="text-white/60 mb-6">
            {medleySongs.length} {t('medley.snippets')} · {settings.snippetDuration}s {t('medley.proSong')}
            {isTeam && ` · ${settings.teamSize} ${t('medley.vs')} ${settings.teamSize}`}
            {state.isEliminationMode && ` · ${t('medley.elimination')}`}
          </p>

          {/* Player cards */}
          <div className="w-full max-w-3xl space-y-3 mb-8">
            {isTeam ? (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Badge className="bg-blue-500/30 text-blue-300 mb-2">{t('medley.teamA')}</Badge>
                  <div className="space-y-2">
                    {playersDisplay.filter(p => p.team === 0).map(p => (
                      <PlayerIntroCard key={p.id} player={p} inputLabel={p.inputType === 'local' ? (p.micName || t('medley.localMic')) : t('medley.companionMode')} />
                    ))}
                  </div>
                </div>
                <div>
                  <Badge className="bg-red-500/30 text-red-300 mb-2">{t('medley.teamB')}</Badge>
                  <div className="space-y-2">
                    {playersDisplay.filter(p => p.team === 1).map(p => (
                      <PlayerIntroCard key={p.id} player={p} inputLabel={p.inputType === 'local' ? (p.micName || t('medley.localMic')) : t('medley.companionMode')} />
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {playersDisplay.map(p => (
                  <PlayerIntroCard key={p.id} player={p} inputLabel={p.inputType === 'local' ? (p.micName || t('medley.localMic')) : t('medley.companionMode')} />
                ))}
              </div>
            )}
          </div>

          {/* Mic init errors */}
          {multiPitch.errors.size > 0 && (
            <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-3 mb-4 max-w-lg text-center">
              <p className="text-yellow-400 text-sm">
                ⚠️ {t('medley.micWarning').replace('...', Array.from(multiPitch.errors.values()).join(', '))}
              </p>
            </div>
          )}

          {seriesHistory.length > 0 && (
            <p className="text-white/40 mb-4">{t('medley.round').replace('{n}', String(seriesHistory.length + 1))}</p>
          )}

          <Button onClick={handleStart}
            className="px-12 py-4 text-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400">
            {t('medley.start')}
          </Button>
        </div>
      )}

      {/* ── COUNTDOWN ── */}
      {phase === 'countdown' && (
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="text-8xl font-bold text-purple-400 animate-pulse">{countdown}</div>
          <p className="text-white/60 mt-4">{t('medley.getReady')}</p>
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
          lastScoringEvents={lastScoringEvents}
          currentDynamicDifficulty={currentDynamicDifficulty}
          // Feature #10
          isEliminationMode={state.isEliminationMode}
          activePlayerCount={state.activePlayerCount}
          totalPlayerCount={state.totalPlayerCount}
          // Feature #15
          activeModifier={state.activeModifier}
          modifierJustRevealed={state.modifierJustRevealed}
          // Feature #16
          isMysteryMode={state.isMysteryMode}
          mysteryReveal={state.mysteryReveal}
          mysteryRevealSong={state.mysteryRevealSong}
          // Feature #18
          synergyTriggered={state.synergyTriggered}
          comebackTriggered={state.comebackTriggered}
          comebackTeamId={state.comebackTeamId}
          settings={settings}
        />
      )}

      {/* ── TRANSITION (pulse) ── */}
      {phase === 'transition' && currentSnippet && (
        <div className="flex-1 flex flex-col items-center justify-center animate-pulse">
          <div className="text-5xl mb-4">🔄</div>
          <div className="text-3xl font-bold text-pink-400 mb-2">{transitionCount}</div>
          <p className="text-white/60 mb-4">{t('medley.nextSnippet')}</p>

          {/* Feature #16: Mystery reveal during transition (show previous song) */}
          {settings.mysteryMode && currentSnippet && (
            <div className="bg-gradient-to-b from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-xl p-6 text-center mb-4 animate-pulse">
              <div className="text-2xl text-white/60 mb-2">{t('medley.songReveal')}</div>
              <div className="text-3xl font-bold text-purple-400">{currentSnippet.song.title}</div>
              <div className="text-xl text-white/80">{currentSnippet.song.artist}</div>
              {currentSnippet.song.genre && (
                <div className="mt-2">
                  <span className="bg-purple-500/30 text-purple-300 text-xs px-3 py-1 rounded-full">{currentSnippet.song.genre}</span>
                </div>
              )}
            </div>
          )}

          {/* Preview next players */}
          {isTeam && currentSnippetIdx + 1 < matchups.length && (() => {
            const next = matchups[currentSnippetIdx + 1];
            const nextSong = medleySongs[currentSnippetIdx + 1]?.song;
            return nextSong ? (
              <div className="bg-black/30 rounded-xl p-4 text-center">
                <p className="text-sm text-white/40 mb-1">{t('medley.nextSong')}</p>
                {settings.mysteryMode ? (
                  <>
                    <h3 className="text-lg font-bold">🎰 ???</h3>
                    <p className="text-white/60 text-sm">{t('medley.mysterySong')}</p>
                  </>
                ) : (
                  <>
                    <h3 className="text-lg font-bold">{nextSong.title}</h3>
                    <p className="text-white/60 text-sm">{nextSong.artist}</p>
                  </>
                )}
                <div className="flex items-center justify-center gap-3 mt-2">
                  <span className="text-sm" style={{ color: next.playerA.color }}>{next.playerA.name}</span>
                  <span className="text-white/40">{t('medley.vs')}</span>
                  <span className="text-sm" style={{ color: next.playerB.color }}>{next.playerB.name}</span>
                </div>
              </div>
            ) : null;
          })()}

          {!isTeam && currentSnippetIdx + 1 < medleySongs.length && (
            <div className="bg-black/30 rounded-xl p-4 text-center">
              <p className="text-sm text-white/40 mb-1">{t('medley.nextSong')}</p>
              {settings.mysteryMode ? (
                <>
                  <h3 className="text-lg font-bold">🎰 ???</h3>
                  <p className="text-white/60 text-sm">{t('medley.mysterySong')}</p>
                </>
              ) : (
                <>
                  <h3 className="text-lg font-bold">{medleySongs[currentSnippetIdx + 1]?.song.title}</h3>
                  <p className="text-white/60 text-sm">{medleySongs[currentSnippetIdx + 1]?.song.artist}</p>
                </>
              )}
              <p className="text-xs text-white/40 mt-2">{t('medley.allPlayersContinue')}</p>
            </div>
          )}

          {/* Feature #10: Elimination announcement in transition */}
          {state.isEliminationMode && state.eliminationOrder.length > 0 && (
            <div className="mt-4 bg-red-500/20 border border-red-500/30 rounded-lg px-4 py-2">
              {(() => {
                const lastEliminatedId = state.eliminationOrder[state.eliminationOrder.length - 1];
                const lastEliminated = playersDisplay.find(p => p.id === lastEliminatedId);
                if (!lastEliminated) return null;
                return (
                  <p className="text-red-400 font-bold">
                    {t('medley.eliminatedPlayer').replace('{name}', lastEliminated.name)}
                  </p>
                );
              })()}
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
              onEndGame();
            }}
            onEndSeries={handleShowFinalResults}
            onRecordAndEnd={handleRoundComplete}
            // Feature #10
            eliminationOrder={state.eliminationOrder}
            // Feature #17
            highlights={state.highlights}
            // Feature #18
            teamBonusResult={settings.playMode === 'team' && settings.teamBonusesEnabled ? state.teamBonusResult : undefined}

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
            // Feature #10
            eliminationOrder={state.eliminationOrder}
            // Feature #13
            showLeaderboard={true}
            // Feature #17
            highlights={state.highlights}
            // Feature #18
            teamBonusResult={settings.playMode === 'team' && settings.teamBonusesEnabled ? state.teamBonusResult : undefined}
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
