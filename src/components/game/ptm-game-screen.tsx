'use client';

import { Button } from '@/components/ui/button';
import { PLAYER_COLORS } from '@/types/game';
import { NOTE_WINDOW, VISIBLE_TOP, VISIBLE_RANGE } from '@/lib/game/note-utils';
import { GameBackground } from '@/components/game/game-background';
import { NoteHighway } from '@/components/game/note-highway';
import { SinglePlayerLyrics } from '@/components/game/single-player-lyrics';
import { GameCountdown } from '@/components/game/game-countdown';
import { GameProgressBar } from '@/components/game/game-hud';
import { TimeDisplay } from '@/components/game/game-hud';
import { PtmTransitionOverlay } from '@/components/game/ptm-transition-overlay';
import { PtmSongResults, PtmSeriesResults } from '@/components/game/ptm-song-results';
import { PtmIntroScreen } from '@/components/game/ptm-intro-screen';
import { PtmPlayerRanking } from '@/components/game/ptm-player-ranking';
import { PtmHudPlayerScore } from '@/components/game/ptm-hud-player-score';
import { PtmHudControls } from '@/components/game/ptm-hud-controls';
import { usePtmGameLogic } from '@/components/game/ptm-game-hook';

// Re-export types for backward compatibility
export type { PassTheMicPlayer, PassTheMicSegment, PassTheMicSettings } from '@/components/game/ptm-types';

// ===================== MAIN COMPONENT =====================

export function PtmGameScreen(props: Parameters<typeof usePtmGameLogic>[0]) {
  const g = usePtmGameLogic(props);

  // Guard: no song
  if (!g.effectiveSong) {
    return (
      <div className="max-w-4xl mx-auto text-center py-20">
        <p className="text-white/60 mb-4">No song loaded</p>
        <Button onClick={g.onEndGame}>Back</Button>
      </div>
    );
  }

  // ===================== INTRO PHASE =====================
  if (g.phase === 'intro') {
    return (
      <PtmIntroScreen
        currentPlayer={g.currentPlayer}
        isMedleyMode={g.isMedleyMode}
        medleySnippetCount={g.medleySnippetCount}
        safeSettings={g.safeSettings}
        seriesHistory={g.passTheMicSeriesHistory}
        mediaLoaded={g.mediaLoaded}
        startGame={g.startGame}
        audioSong={g.audioSong ?? undefined}
        isYouTube={g.isYouTube}
        audioRef={g.audioRef}
        videoRef={g.videoRef}
        playersCount={g.players.length}
      />
    );
  }

  // ===================== SONG RESULTS PHASE =====================
  if (g.phase === 'song-results') {
    return (
      <PtmSongResults
        songTitle={g.isMedleyMode ? `Medley` : g.effectiveSong.title}
        songArtist={g.isMedleyMode ? '' : g.effectiveSong.artist}
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
        seriesHistory={g.passTheMicSeriesHistory}
        roundNumber={g.passTheMicSeriesHistory.length + 1}
        onNextSong={g.handleContinue}
        onEndSeries={g.handleEndSeries}
      />
    );
  }

  // ===================== SERIES RESULTS PHASE =====================
  if (g.phase === 'series-results') {
    return (
      <PtmSeriesResults
        seriesHistory={g.passTheMicSeriesHistory}
        players={g.players.map(p => ({
          id: p.id,
          name: p.name,
          avatar: p.avatar,
          color: p.color,
        }))}
        onContinue={g.handleContinueWithPlayers}
        onBackToSetup={g.handleEndSeriesComplete}
      />
    );
  }

  // ===================== FULLSCREEN GAMEPLAY =====================

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-black">
      {/* Audio Element */}
      {g.audioSong?.audioUrl && (
        <audio
          key={g.audioSong.id}
          ref={g.audioRef}
          src={g.audioSong.audioUrl}
          className="hidden"
          onEnded={g.handleMediaEnded}
          preload="auto"
        />
      )}

      {/* Hidden Video Element for embedded audio (fallback when no separate audio) */}
      {!g.audioSong?.audioUrl && g.audioSong?.videoBackground && !g.isYouTube && (
        <video
          key={`video-${g.audioSong.id}`}
          ref={g.videoRef}
          src={g.audioSong.videoBackground}
          className="hidden"
          muted={false}
          playsInline
          onEnded={g.handleMediaEnded}
          preload="auto"
        />
      )}

      {/* Game Area - Full Screen */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Background */}
        <GameBackground
          effectiveSong={g.audioSong}
          showBackgroundVideo={g.showBackgroundVideo}
          useAnimatedBackground={g.useAnimatedBackground}
          isYouTube={g.isYouTube}
          youtubeVideoId={g.youtubeVideoId}
          useYouTubeAudio={g.useYouTubeAudio}
          isPlaying={g.isPlaying}
          isAdPlaying={g.isAdPlaying}
          songEnergy={g.songEnergy}
          volume={0.8}
          videoRef={g.videoRef}
          onYoutubeTimeUpdate={g.onYoutubeTimeUpdate}
          onAdStart={g.handleAdStart}
          onAdEnd={g.handleAdEnd}
          onVideoEnded={g.handleMediaEnded}
          onVideoCanPlay={() => { g.videoLoadedRef.current = true; }}
          onYoutubeError={() => {}}
        />

        {/* Dark Overlay for visibility */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/50 z-5" />

        {/* Countdown */}
        {g.phase === 'countdown' && (
          <GameCountdown countdown={g.countdown} />
        )}

        {/* Note Highway — single lane with current player color */}
        {(g.phase === 'playing' || g.phase === 'transitioning') && g.allNotes.length > 0 && (
          <NoteHighway
            visibleNotes={g.visibleNotes}
            currentTime={g.currentTime}
            pitchStats={g.pitchStats}
            detectedPitch={g.smoothedPitch}
            noteShapeStyle={g.noteShapeStyle}
            noteDisplayStyle={g.noteDisplayStyle as 'classic' | 'fill-level' | 'color-feedback' | 'glow-intensity'}
            notePerformance={undefined}
            singLinePosition={20}
            noteWindow={NOTE_WINDOW}
            playerColor={g.currentPlayer?.color || PLAYER_COLORS[0]}
            showPlayerLabel={false}
            visibleTop={VISIBLE_TOP}
            visibleRange={VISIBLE_RANGE}
          />
        )}

        {/* Lyrics Display */}
        {(g.phase === 'playing' || g.phase === 'transitioning') && g.sortedLines.length > 0 && (
          <SinglePlayerLyrics
            sortedLines={g.sortedLines}
            currentTime={g.currentTime}
            playerColor={g.currentPlayer?.color || PLAYER_COLORS[0]}
            noteDisplayStyle={g.noteDisplayStyle as 'classic' | 'fill-level' | 'color-feedback' | 'glow-intensity'}
            notePerformance={undefined}
            gameMode="pass-the-mic"
          />
        )}
      </div>

      {/* ═══════ PTM HUD OVERLAYS ═══════ */}

      {/* Player score (top-left) */}
      {(g.phase === 'playing' || g.phase === 'transitioning') && (
        <PtmHudPlayerScore
          players={g.players}
          currentPlayer={g.currentPlayer}
        />
      )}

      {/* Controls (top-right) */}
      {g.phase === 'playing' && (
        <PtmHudControls
          safeSettings={g.safeSettings}
          isPlaying={g.isPlaying}
          onTogglePause={g.togglePause}
          activeWebcamStreamsRef={g.activeWebcamStreamsRef}
          onEndSong={g.handleEndSong}
        />
      )}

      {/* Player Ranking — vertical left side, sorted by score (active player on top) */}
      {(g.phase === 'playing' || g.phase === 'transitioning') && (
        <PtmPlayerRanking
          players={g.players}
          currentPlayerIndex={g.currentPlayerIndex}
        />
      )}

      {/* Progress Bar (bottom) */}
      <GameProgressBar currentTime={g.currentTime} duration={g.displayDuration} />
      <TimeDisplay currentTime={g.currentTime} duration={g.displayDuration} />

      {/* ═══════ TRANSITION OVERLAY ═══════ */}
      <PtmTransitionOverlay
        visible={g.transitionVisible}
        nextPlayer={g.transitionNextPlayer}
        segmentLabel={`Nächster Spieler`}
        onComplete={g.completeTransition}
        onSkip={g.completeTransition}
      />
    </div>
  );
}
