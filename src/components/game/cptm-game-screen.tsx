'use client';

import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n/translations';
import { PLAYER_COLORS } from '@/types/game';
import { NOTE_WINDOW, VISIBLE_TOP, VISIBLE_RANGE } from '@/lib/game/note-utils';
import { GameBackground } from '@/components/game/game-background';
import { NoteHighway } from '@/components/game/note-highway';
import { SinglePlayerLyrics } from '@/components/game/single-player-lyrics';
import { GameProgressBar } from '@/components/game/game-hud';
import { TimeDisplay } from '@/components/game/game-hud';
import { PauseButton } from '@/components/game/hud/pause-button';
import { FullscreenButton } from '@/components/game/hud/fullscreen-button';
import { PtmSongResults, PtmSeriesResults } from '@/components/game/ptm-song-results';
import { PtmPlayerRanking } from '@/components/game/ptm-player-ranking';
import { useCptmGameLogic } from '@/components/game/cptm-game-hook';
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
    return (
      <div className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-gradient-to-b from-zinc-900 via-black to-zinc-900 px-4">
        <div className="flex flex-col items-center max-w-md w-full animate-in fade-in zoom-in-95 duration-500">
          {/* CPtM Icon */}
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center mb-6 shadow-2xl">
            <span className="text-5xl">📱</span>
          </div>

          {/* Title */}
          <h1 className="text-3xl sm:text-4xl font-black text-white mb-2 text-center">
            Companion
          </h1>
          <h2 className="text-2xl sm:text-3xl font-bold text-cyan-400 mb-1 text-center">
            Pass-the-Mic
          </h2>
          <p className="text-white/40 text-sm mb-8 text-center">
            {t('passTheMic.everyoneSingsOnTheirPhone')}
          </p>

          {/* Player count indicator (no individual player names in CPTM) */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 w-full mb-8 flex items-center justify-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🎤</span>
              <span className="text-lg font-medium text-white/60">
                {g.players.length} {t('passTheMic.players') || 'players'}
              </span>
            </div>
          </div>

          {/* Media loaded indicator */}
          {!g.mediaLoaded && (
            <div className="flex items-center gap-2 text-white/40 text-sm mb-4">
              <div className="w-4 h-4 border-2 border-white/30 border-t-cyan-400 rounded-full animate-spin" />
              {t('gameScreen.loadingMedia')}
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
            detectedPitch={null}
            noteShapeStyle={g.noteShapeStyle}
            noteDisplayStyle={g.noteDisplayStyle as 'classic' | 'fill-level' | 'color-feedback' | 'glow-intensity'}
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
            noteDisplayStyle={g.noteDisplayStyle as 'classic' | 'fill-level' | 'color-feedback' | 'glow-intensity'}
            notePerformance={undefined}
            gameMode="companion-singalong"
          />
        )}
      </div>

      {/* ═══════ HUD OVERLAYS ═══════ */}

      {/* Controls — Pause (top-left) + End Song (top-left, after pause) + Fullscreen (top-right) */}
      {g.phase === 'playing' && (
        <div className="fixed inset-0 z-50 pointer-events-none">
          <div className="absolute top-4 left-4 z-20 flex items-center gap-2 pointer-events-auto">
            <PauseButton
              isPlaying={g.isPlaying}
              onTogglePause={g.showPauseDialog}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={g.handleEndSong}
              className="text-white/40 hover:text-white/70 hover:bg-white/10 text-xs px-3 py-1.5"
            >
              {t('cptm.endSongEarly')}
            </Button>
          </div>
          <div className="absolute top-4 right-4 z-20 pointer-events-auto">
            <FullscreenButton />
          </div>
        </div>
      )}

      {/* Player Ranking — vertical left side, sorted by score (no active-player highlight for CPTM) */}
      {g.phase === 'playing' && (
        <PtmPlayerRanking
          players={ptmPlayers}
          currentPlayerIndex={-1}
        />
      )}

      {/* Progress Bar (bottom) */}
      <GameProgressBar currentTime={g.currentTime} duration={g.displayDuration} />
      <TimeDisplay currentTime={g.currentTime} duration={g.displayDuration} />
    </div>
  );
}
