'use client';

import { Button } from '@/components/ui/button';
import { useCallback } from 'react';
import { useTranslation } from '@/lib/i18n/translations';
import { PLAYER_COLORS } from '@/types/game';
import { NOTE_WINDOW, VISIBLE_TOP, VISIBLE_RANGE } from '@/lib/game/note-utils';
import { GameBackground } from '@/components/game/game-background';
import { NoteHighway } from '@/components/game/note-highway';
import { SinglePlayerLyrics } from '@/components/game/single-player-lyrics';
import { GameProgressBar } from '@/components/game/game-hud';
import { TimeDisplay } from '@/components/game/game-hud';
import { GameHudChrome } from '@/components/game/hud/game-hud-chrome';
import { PtmSongResults, PtmSeriesResults } from '@/components/game/ptm-song-results';
import { PtmPlayerRanking } from '@/components/game/ptm-player-ranking';
import { PtmHudPlayerScore } from '@/components/game/ptm-hud-player-score';
import { useCptmGameLogic } from '@/components/game/cptm-game-hook';
import { usePartyStore } from '@/lib/game/party-store';
import type { PtmPlayer } from '@/components/game/ptm-types';

// Re-export types for backward compatibility
export type { CptmPlayer, CptmSegment, CptmSettings, CptmRoundResult } from '@/components/game/cptm-types';

// ===================== HELPERS =====================

/**
 * Map CptmPlayer[] → PtmPlayer[] for reuse of PtM UI components.
 * CptmPlayer is structurally compatible minus `isActive` and `micId`.
 */
function toPtmPlayers(players: Parameters<typeof useCptmGameLogic>[0]['players']): PtmPlayer[] {
  return players.map(p => ({
    id: p.id,
    name: p.name,
    avatar: p.avatar,
    color: p.color,
    score: p.score,
    notesHit: p.notesHit,
    notesMissed: p.notesMissed,
    combo: p.combo,
    maxCombo: p.maxCombo,
    isActive: false,
    segmentsSung: p.segmentsSung,
  }));
}

// ===================== MAIN COMPONENT =====================

export function CptmGameScreen(props: Parameters<typeof useCptmGameLogic>[0]) {
  const { t } = useTranslation();
  const g = useCptmGameLogic(props);
  const cptmSongSelection = usePartyStore((s) => s.cptmSongSelection);
  const cptmSettings = usePartyStore((s) => s.cptmSettings);
  const setCptmSettings = usePartyStore((s) => s.setCptmSettings);
  const cptmDifficulty = cptmSettings?.difficulty ?? 'medium';
  const cycleCptmDifficulty = useCallback(() => {
    const levels: Array<'easy' | 'medium' | 'hard'> = ['easy', 'medium', 'hard'];
    const next = levels[(levels.indexOf(cptmDifficulty) + 1) % levels.length];
    setCptmSettings({ ...(cptmSettings ?? { difficulty: next, blinkWarning: 3 }), difficulty: next });
  }, [cptmDifficulty, cptmSettings, setCptmSettings]);

  // ── Guard: no effective song ──
  if (!g.effectiveSong) {
    return (
      <div className="max-w-4xl mx-auto text-center py-20">
        <p className="text-white/60 mb-4">{t('gameScreen.noSongLoaded')}</p>
        <Button onClick={g.onEndGame}>{t('common.back')}</Button>
      </div>
    );
  }

  // ── Map current players for PtM UI components ──
  const ptmPlayers = toPtmPlayers(g.players);

  // ===================== INTRO PHASE =====================
  if (g.phase === 'intro') {
    // Song name shown only when explicitly chosen (library/vote) — hidden for random
    const songSelectionMethod = cptmSongSelection;
    const showSong = songSelectionMethod === 'library' || songSelectionMethod === 'vote';
    // The player who starts singing (first turn) — highlighted as start player
    const startPlayer = g.players[0];
    return (
      <div className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-gradient-to-b from-zinc-900 via-black to-zinc-900 px-4 overflow-y-auto">
        <div className="flex flex-col items-center max-w-md w-full animate-in fade-in zoom-in-95 duration-500 py-8">
          {/* CPtM Icon */}
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center mb-6 shadow-2xl">
            <span className="text-5xl">📱</span>
          </div>

          {/* Title */}
          <h1 className="text-3xl sm:text-4xl font-black text-white mb-2 text-center">
            {t('companionSingalong.introTitle')}
          </h1>
          <h2 className="text-2xl sm:text-3xl font-bold text-cyan-400 mb-1 text-center">
            {t('companionSingalong.introSubtitle')}
          </h2>
          <p className="text-white/40 text-sm mb-6 text-center">
            {t('companionSingalong.introDescription')}
          </p>

          {/* Song — name hidden when randomly selected */}
          <div className={`w-full rounded-xl px-6 py-4 mb-6 text-center border ${
            showSong
              ? 'bg-gradient-to-r from-cyan-500/20 to-emerald-500/20 border-cyan-500/30'
              : 'bg-white/5 border-white/10'
          }`}>
            <div className="text-xs text-white/60 uppercase tracking-wider mb-1">{t('partyStarting.song')}</div>
            {showSong ? (
              <>
                <div className="text-lg font-bold text-white truncate">🎵 {g.effectiveSong.title}</div>
                <div className="text-sm text-white/60 truncate">{g.effectiveSong.artist}</div>
              </>
            ) : (
              <div className="text-base font-medium text-white/70">🎲 {t('unifiedSetup.randomSongDesc')}</div>
            )}
          </div>

          {/* Participants (small boxes) with start-player highlight */}
          <div className="flex flex-wrap justify-center gap-2 mb-4 max-w-md">
            {g.players.map((p, idx) => (
              <div
                key={p.id}
                className={`relative flex flex-col items-center w-20 rounded-xl p-2 ${
                  idx === 0
                    ? 'bg-gradient-to-br from-cyan-500 to-emerald-500 border-2 border-white/50 shadow-lg scale-105'
                    : 'bg-white/5 border border-white/10'
                }`}
                data-testid={`cptm-starting-player-${p.name}`}
              >
                {idx === 0 && (
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-white text-black text-[9px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap shadow">
                    ▶ {t('partyStarting.startPlayer')}
                  </span>
                )}
                {p.avatar ? (
                  <img src={p.avatar} alt={p.name} className="w-10 h-10 rounded-full object-cover border-2 border-white/30 mb-1" />
                ) : (
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white border-2 border-white/30 mb-1" style={{ backgroundColor: p.color }}>
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="text-xs font-semibold text-white truncate w-full text-center">{p.name}</span>
                <span className="text-[9px] text-white/50">📱 {t('partyStarting.companion')}</span>
              </div>
            ))}
          </div>
          <div className="text-white/40 text-xs mb-6 flex items-center gap-1.5">
            <span className="text-base">🎤</span>
            {g.players.length} {t('passTheMic.players')}
          </div>

          {/* Media loaded indicator */}
          {!g.mediaLoaded && (
            <div className="flex items-center gap-2 text-white/40 text-sm mb-4">
              <div className="w-4 h-4 border-2 border-white/30 border-t-cyan-400 rounded-full animate-spin" />
              {t('gameScreen.loadingMedia') || t('gameScreen.loading')}
            </div>
          )}

          {/* Start Button */}
          <Button
            onClick={g.startGame}
            disabled={!g.mediaLoaded}
            className="w-full py-4 text-lg bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {g.mediaLoaded
              ? t('passTheMic.startSinging')
              : t('gameScreen.loading')}
          </Button>
          {startPlayer && (
            <p className="text-white/30 text-xs mt-3 text-center">
              {t('partyStarting.startPlayerHint').replace('{name}', startPlayer.name)}
            </p>
          )}
        </div>
      </div>
    );
  }

  // ===================== SONG RESULTS PHASE =====================
  if (g.phase === 'song-results') {
    return (
      <PtmSongResults
        songTitle={g.effectiveSong.title}
        songArtist={g.effectiveSong.artist}
        playerScores={g.players.map(p => ({
          id: p.id,
          name: p.name,
          avatar: p.avatar,
          color: p.color,
          score: p.score,
          notesHit: p.notesHit,
          notesMissed: p.notesMissed,
          combo: p.combo,
          maxCombo: p.maxCombo,
          segmentsSung: p.segmentsSung,
        }))}
        seriesHistory={g.cptmSeriesHistory.slice(0, -1)}
        roundNumber={g.cptmSeriesHistory.length}
        onNextSong={g.handleContinue}
        onEndSeries={g.handleEndSeries}
      />
    );
  }

  // ===================== SERIES RESULTS PHASE =====================
  if (g.phase === 'series-results') {
    return (
      <PtmSeriesResults
        seriesHistory={g.cptmSeriesHistory}
        players={g.players.map(p => ({
          id: p.id,
          name: p.name,
          avatar: p.avatar,
          color: p.color,
        }))}
        onContinue={g.handleContinue}
        onBackToSetup={g.handleEndSeriesComplete}
      />
    );
  }

  // ===================== FULLSCREEN GAMEPLAY (countdown + playing) =====================
  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-black">
      {/* ── Audio Element ── */}
      {g.effectiveSong.audioUrl && (
        <audio
          key={g.effectiveSong.id}
          ref={g.audioRef}
          src={g.effectiveSong.audioUrl}
          className="hidden"
          onEnded={g.handleMediaEnded}
          onError={() => {}}
          preload="auto"
        />
      )}

      {/* ── Hidden Video Element for embedded audio (fallback) ── */}
      {!g.effectiveSong.audioUrl && g.effectiveSong.videoBackground && (
        <video
          key={`video-${g.effectiveSong.id}`}
          ref={g.videoRef}
          src={g.effectiveSong.videoBackground}
          className="hidden"
          muted={false}
          playsInline
          onEnded={g.handleMediaEnded}
          onError={() => {}}
          preload="auto"
        />
      )}

      {/* ── Game Area — Full Screen ── */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Background */}
        <GameBackground
          effectiveSong={g.effectiveSong}
          showBackgroundVideo={g.showBackgroundVideo}
          useAnimatedBackground={g.useAnimatedBackground}
          isYouTube={false}
          youtubeVideoId={null}
          useYouTubeAudio={false}
          isPlaying={g.isPlaying}
          isAdPlaying={false}
          songEnergy={0}
          volume={0.8}
          videoRef={g.videoRef}
          onYoutubeTimeUpdate={() => {}}
          onAdStart={() => {}}
          onAdEnd={() => {}}
          onVideoEnded={g.handleMediaEnded}
          onVideoCanPlay={() => {}}
          onYoutubeError={() => {}}
        />

        {/* Dark Overlay for visibility */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/50 z-5" />

        {/* DO-NOT-CHANGE: CPTM has no countdown overlay — players switch seamlessly via companion signals */}

        {/* Note Highway — single lane with current player color */}
        {g.phase === 'playing' && g.allNotes.length > 0 && (
          <NoteHighway
            visibleNotes={g.visibleNotes}
            currentTime={g.currentTime}
            pitchStats={{ minPitch: 40, maxPitch: 80, pitchRange: 40 }}
            notePerformance={undefined}
            singLinePosition={20}
            noteWindow={NOTE_WINDOW}
            playerColor={PLAYER_COLORS[0]}
            showPlayerLabel={false}
            visibleTop={VISIBLE_TOP}
            visibleRange={VISIBLE_RANGE}
          />
        )}

        {/* Lyrics Display */}
        {g.phase === 'playing' && g.sortedLines.length > 0 && (
          <SinglePlayerLyrics
            sortedLines={g.sortedLines}
            currentTime={g.currentTime}
            playerColor={PLAYER_COLORS[0]}
            notePerformance={undefined}
            gameMode="companion-singalong"
          />
        )}
      </div>

      {/* ═══════ HUD OVERLAYS (unified layout: PTM as model) ═══════ */}

      {/* Top-left: Pause + End Song • Top-right: Webcam + Difficulty + Fullscreen */}
      {g.phase === 'playing' && (
        <GameHudChrome
          isPlaying={g.isPlaying}
          onTogglePause={g.showPauseDialog}
          onEndSong={g.handleEndSong}
          difficulty={cptmDifficulty}
          onCycleDifficulty={cycleCptmDifficulty}
        />
      )}

      {/* Now Singing — prominent top-center card incl. live score (pattern C) */}
      {g.phase === 'playing' && g.currentPlayer && (
        <PtmHudPlayerScore
          players={ptmPlayers}
          currentPlayer={ptmPlayers.find(p => p.id === g.currentPlayer?.id)}
        />
      )}

      {/* Player Ranking — vertical left side with live ranking; active singer highlighted */}
      {g.phase === 'playing' && (
        <PtmPlayerRanking
          players={ptmPlayers}
          currentPlayerIndex={g.currentPlayerIndex}
        />
      )}

      {/* Progress Bar (bottom) */}
      <GameProgressBar currentTime={g.currentTime} duration={g.displayDuration} />
      <TimeDisplay currentTime={g.currentTime} duration={g.displayDuration} />
    </div>
  );
}
