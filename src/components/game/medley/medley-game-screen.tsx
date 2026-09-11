'use client';

/**
 * Medley Contest — Game Screen (Orchestrator)
 *
 * Thin wrapper that wires the useMedleyGame hook to phase-specific UI
 * components.  No game logic lives here — only JSX routing.
 */

import { useCallback, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useMedleyGame, type MedleyGameScreenProps } from './medley-game-hook';
import { PlayerIntroCard } from './medley-game-components';
import { MedleyPlayingUI } from './medley-game-playing';
import { MedleyRoundResults, MedleyFinalResults } from './medley-game-results';
import { GameBackground } from '@/components/game/game-background';
import { GameHudChrome } from '@/components/game/hud/game-hud-chrome';
import { usePartyStore } from '@/lib/game/party-store';
import { useTranslation } from '@/lib/i18n/translations';
import type { MedleySong } from './medley-types';

// ===================== COMPONENT =====================

export function MedleyGameScreen(props: MedleyGameScreenProps) {
  const { t } = useTranslation();
  const setPauseDialogAction = usePartyStore(s => s.setPauseDialogAction);
  const {
    players: initialPlayers,
    songs: medleySongs,
    settings,
    matchups,
    _seriesHistory: seriesHistory = [],
    onRoundComplete,
    onEndGame,
    onPrepareNextRoundSongs,
  } = props;

  // ── Next round songs (Fix 7): lifted song-list state ──
  // `songs` from the party store is the CURRENT round's snippet list. When
  // the next round is prepared, the fresh list is swapped in here (the
  // store is updated by the handler too) so the hook and all totals/
  // previews switch to the new songs in the same commit as the round reset.
  const [activeSongs, setActiveSongs] = useState<MedleySong[]>(medleySongs);

  // Wrap the parent's preparer: swap the returned songs into local state so
  // the hook (and every medleySongs-derived total below) sees them
  // immediately. Returns null on failure → the old songs are replayed.
  const prepareNextRoundSongs = useCallback(async (): Promise<MedleySong[] | null> => {
    if (!onPrepareNextRoundSongs) return null;
    try {
      const fresh = await onPrepareNextRoundSongs();
      if (fresh && fresh.length > 0) {
        setActiveSongs(fresh);
      }
      return fresh ?? null;
    } catch {
      return null;
    }
  }, [onPrepareNextRoundSongs]);

  const state = useMedleyGame({
    players: initialPlayers,
    songs: activeSongs,
    settings,
    matchups,
    _seriesHistory: seriesHistory,
    onRoundComplete,
    onEndGame,
    onPrepareNextRoundSongs: prepareNextRoundSongs,
  });

  const {
    phase,
    currentSnippet, currentSnippetIdx, snippetNotes,
    audioRef, videoRef, fallbackVideoRef, audioError,
    playersDisplay, multiPitch,
    snippetProgress, totalProgress, currentMatchup, currentLyricLine,
    isTeam,
    currentDynamicDifficulty,
    isPlaying,
    restoredSong,
    showBackgroundVideo,
    useAnimatedBackground,
    notePerformance,
    mediaReady,
    isPreparingNextRound,
    handleStart, handleNextRound, handleEndEarly, handleRoundComplete, handleShowFinalResults,
  } = state;

  const handleTogglePause = () => {
    if (isPlaying) {
      setPauseDialogAction('song-pause');
    } else {
      setPauseDialogAction(null);
    }
  };

  // Total medley runtime (user item 6.4: "Gesamtlaufzeit" — one line)
  const medleyTotalMs = useMemo(
    () => activeSongs.reduce((s, m) => s + m.duration, 0),
    [activeSongs],
  );
  const medleyElapsedMs = useMemo(() => {
    let t = 0;
    for (let i = 0; i < currentSnippetIdx && i < activeSongs.length; i++) {
      t += activeSongs[i].duration;
    }
    return t + state.currentTimeMs;
  }, [activeSongs, currentSnippetIdx, state.currentTimeMs]);

  // ===================== INTRO PHASE =====================
  if (phase === 'intro') {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6">
        {/* Audio- und Video-Elemente IMMER rendern, damit der Hook sie auf dem Mount findet.
           Bei Phase 'intro' existiert das Element sonst nicht → audioRef.current === null → kein Laden möglich. */}
        <audio
          ref={audioRef}
          className="hidden"
          preload="auto"
          onError={() => { /* error handled via state */ }}
        />

        <video
          key={`medley-fallback-video-${restoredSong?.id ?? currentSnippet?.song.id ?? 'none'}`}
          ref={fallbackVideoRef}
          src={restoredSong?.videoBackground ?? undefined}
          className="hidden"
          muted={false}
          playsInline
          preload="auto"
        />

        <div className="text-5xl mb-6">🎵</div>
        <h2 className="text-3xl font-bold mb-2">{t('medley.gameTitle')}</h2>
        <p className="text-white/60 mb-6">
          {activeSongs.length} {t('medley.snippets')} · {settings.snippetDuration}s {t('medley.proSong')}
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
    );
  }

  // ===================== FULLSCREEN GAMEPLAY (countdown, playing, transition) =====================

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-black">
      {/* Audio Element — always present for the hook to attach to */}
      <audio
        ref={audioRef}
        className="hidden"
        preload="auto"
        onError={() => { /* error handled via state */ }}
      />

      {/* Video Element — audio fallback, NOT shared with GameBackground */}
      <video
        key={`medley-fallback-video-${restoredSong?.id ?? currentSnippet?.song.id ?? 'none'}`}
        ref={fallbackVideoRef}
        src={restoredSong?.videoBackground ?? undefined}
        className="hidden"
        muted={false}
        playsInline
        preload="auto"
      />

      {/* Game Area - Full Screen */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Background (video / image / animated / music-reactive) */}
        <GameBackground
          effectiveSong={restoredSong}
          showBackgroundVideo={showBackgroundVideo}
          useAnimatedBackground={useAnimatedBackground}
          isYouTube={false}
          youtubeVideoId={null}
          useYouTubeAudio={false}
          isPlaying={isPlaying}
          isAdPlaying={false}
          songEnergy={0.5}
          volume={0.8}
          videoRef={videoRef}
          onYoutubeTimeUpdate={() => {}}
          onAdStart={() => {}}
          onAdEnd={() => {}}
          onVideoEnded={() => {}}
           
          onVideoCanPlay={() => {}}
          onYoutubeError={() => {}}
        />

        {/* Dark overlay for better text/note visibility */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/50 z-[5]" />

        {/* ── COUNTDOWN (removed — song starts directly) ── */}

        {/* ── PLAYING ── */}
        {phase === 'playing' && currentSnippet && (
          <MedleyPlayingUI
            currentSnippet={currentSnippet}
            currentSnippetIdx={currentSnippetIdx}
            snippetCount={activeSongs.length}
            snippetNotes={snippetNotes}
            snippetLyrics={state.snippetLyrics}
            currentLyricLine={currentLyricLine}
            currentTimeMs={state.currentTimeMs}
            playersDisplay={playersDisplay}
            snippetProgress={snippetProgress}
            totalProgress={totalProgress}
            totalDurationMs={medleyTotalMs}
            totalElapsedMs={medleyElapsedMs}
            currentMatchup={currentMatchup}
            isTeam={isTeam}
            multiPitch={multiPitch}
            handleEndEarly={handleEndEarly}
            notePerformance={notePerformance}
            notePerformanceByPlayer={state.notePerformanceByPlayer}
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

        {/* ── Item 5/7: snippet loading overlay ──
            While the current snippet's media is still loading (right after a
            transition or round start), show a clear spinner instead of a
            frozen/blank stage — uniform feedback on EVERY snippet switch. */}
        {phase === 'playing' && currentSnippet && !mediaReady && !audioError && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm" data-testid="medley-snippet-loading">
            <div className="animate-spin w-10 h-10 border-2 border-purple-400 border-t-transparent rounded-full mb-4" />
            <p className="text-white/70 text-sm font-medium">{t('medley.loadingSnippet')}</p>
            <p className="text-white/40 text-xs mt-1">
              {currentSnippetIdx + 1}/{activeSongs.length} · {currentSnippet.song.title}
            </p>
          </div>
        )}

        {/* ── Item 5: next-round preparation overlay ──
            "Nächste Runde" builds the whole next round's snippets (URLs +
            lyrics) — visible feedback while that runs. */}
        {isPreparingNextRound && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm" data-testid="medley-next-round-loading">
            <div className="animate-spin w-10 h-10 border-2 border-pink-400 border-t-transparent rounded-full mb-4" />
            <p className="text-white/70 text-sm font-medium">{t('medley.preparingNextRound')}</p>
          </div>
        )}

        {/* ── TRANSITION ── */}
        {phase === 'transition' && currentSnippet && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center">
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
              const nextSong = activeSongs[currentSnippetIdx + 1]?.song;
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

            {!isTeam && currentSnippetIdx + 1 < activeSongs.length && (
              <div className="bg-black/30 rounded-xl p-4 text-center">
                <p className="text-sm text-white/40 mb-1">{t('medley.nextSong')}</p>
                {settings.mysteryMode ? (
                  <>
                    <h3 className="text-lg font-bold">🎰 ???</h3>
                    <p className="text-white/60 text-sm">{t('medley.mysterySong')}</p>
                  </>
                ) : (
                  <>
                    <h3 className="text-lg font-bold">{activeSongs[currentSnippetIdx + 1]?.song.title}</h3>
                    <p className="text-white/60 text-sm">{activeSongs[currentSnippetIdx + 1]?.song.artist}</p>
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
      </div>

      {/* HUD Controls — unified chrome: song banner (top-center), Pause + End Song (top-left), Difficulty + Webcam + Fullscreen (top-right) */}
      {phase === 'playing' && (
        <GameHudChrome
          isPlaying={isPlaying}
          onTogglePause={handleTogglePause}
          onEndSong={handleEndEarly}
          difficulty={currentDynamicDifficulty ?? settings.difficulty ?? 'medium'}
          // User item 6.3: the SongTitleBanner is the ONLY title display in
          // the medley in-game screen (the playing UI no longer renders its
          // own centered title). Hidden while mystery mode is unrevealed.
          songTitle={settings.mysteryMode && !state.mysteryReveal ? null : currentSnippet?.song?.title ?? null}
          songArtist={settings.mysteryMode && !state.mysteryReveal ? null : currentSnippet?.song?.artist ?? null}
        />
      )}

      {/* ── ROUND RESULTS ── */}
      {phase === 'round-results' && (
        <div className="absolute inset-0 z-20 overflow-y-auto p-4">
          <MedleyRoundResults
            players={playersDisplay}
            settings={settings}
            seriesHistory={seriesHistory}
            roundNumber={seriesHistory.length + 1}
            // User item 6.2: "Next Round" continues the series DIRECTLY with
            // the next round (round result is recorded by the button handler
            // via onRecordAndEnd before this callback fires).
            onNextRound={() => {
              handleNextRound();
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
        <div className="absolute inset-0 z-20 overflow-y-auto p-4">
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
      {audioError && phase === 'playing' && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 bg-red-500/20 border border-red-500/30 px-4 py-2 rounded-lg text-red-400 text-sm">
          {audioError}
        </div>
      )}
    </div>
  );
}