'use client';

import { Button } from '@/components/ui/button';
import { PLAYER_COLORS } from '@/types/game';
import { SING_LINE_POSITION, NOTE_WINDOW, VISIBLE_TOP, VISIBLE_RANGE } from '@/lib/game/note-utils';
import { useTranslation } from '@/lib/i18n/translations';
import { WebcamBackground, WebcamQuickControls } from '@/components/game/webcam-background';
import { FullscreenButton } from '@/components/game/hud/fullscreen-button';
import { ScoreEventsDisplay } from '@/components/game/score-events-display';
import { PitchGraphDisplay } from '@/components/game/pitch-graph-display';
import { PracticePanel } from '@/components/game/practice-panel';
import { ProminentScoreDisplay } from '@/components/game/prominent-score-display';
import { ParticleSystem, ComboFireEffect } from '@/components/game/visual-effects';
import { SpectrogramDisplay } from '@/components/game/spectrogram-display';
import { GameBackground } from '@/components/game/game-background';
import { DuetNoteHighway } from '@/components/game/duet-note-highway';
import { NoteHighway } from '@/components/game/note-highway';
import { NoteLane } from '@/components/game/note-lane';
import { SinglePlayerLyrics } from '@/components/game/single-player-lyrics';
import { GameCountdown } from '@/components/game/game-countdown';
import { GameScoreDisplay } from '@/components/game/game-score-display';
import {
  VolumeMeter,
  AudioEffectsButton,
  AudioEffectsPanel,
  AdIndicator,
  GameProgressBar,
  TimeDisplay,
} from '@/components/game/game-hud';
import { MicIndicator } from '@/components/game/mic-indicator';
import { useGameScreenLogic } from '@/components/screens/game-screen-hook';

// ===================== GAME SCREEN =====================
function GameScreen(props: Parameters<typeof useGameScreenLogic>[0]) {
  const { t } = useTranslation();
  const g = useGameScreenLogic(props);

  if (!g.song) {
    return (
      <div className="max-w-4xl mx-auto text-center py-20">
        <p className="text-white/60 mb-4">{t('gameScreen.noSongSelected')}</p>
        <Button onClick={props.onBack} className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-white">{t('gameScreen.backToLibrary')}</Button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-black">
      {/* Header Overlay */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 py-2 bg-gradient-to-b from-black/70 to-transparent">
        {/* Left: Back / Pause Button */}
        <Button variant="ghost" onClick={() => {
          if (props.onPause) {
            props.onPause();
          } else {
            g.abortGameLoop();
            g.stop();
            if (g.audioEffects) g.audioEffects.disconnect();
            /* eslint-disable react-hooks/immutability -- imperative DOM cleanup: pause and rewind media refs */
            if (g.audioRef.current) { g.audioRef.current.pause(); g.audioRef.current.currentTime = 0; }
            if (g.videoRef.current) { g.videoRef.current.pause(); g.videoRef.current.currentTime = 0; }
            /* eslint-enable react-hooks/immutability */
            g.nativeAudio.stop().catch(() => {});
            g.setIsPlaying(false);
            g.resetScoring();
            props.onBack();
          }
        }} className="text-white/80 hover:text-white hover:bg-white/10">
          {t('gameScreen.pause')}
        </Button>

        {/* Center: Low-perf indicator only */}
        {g.isLowPerf && (
          <span className="text-xs text-orange-400/80 font-medium px-2 py-1 bg-orange-500/10 rounded">{t('gameScreen.lowPerf')}</span>
        )}

        {/* Right: Fullscreen > Difficulty > Webcam (right to left) */}
        <div className="flex items-center gap-2">
          <GameScoreDisplay
            difficulty={g.gameState.difficulty}
            activeChallenge={g.activeChallenge}
            timeRemaining={g.timeRemaining}
          />
          {!g.isLowPerf && (
            <WebcamQuickControls
              config={g.webcamConfig}
              onConfigChange={g.updateWebcamConfig}
            />
          )}
          <FullscreenButton />
        </div>
      </div>

      {/* Pitch Graph Display — disabled in low-performance mode and no_pitch_guide challenge */}
      {g.isPlaying && g.showPitchGuide && !g.isLowPerf && !g.hasChallengeNoPitchGuide && (
        <div className="absolute top-44 left-4 z-20 w-64">
          <PitchGraphDisplay
            currentPitch={g.smoothedPitch}
            targetPitch={null}
            currentTime={g.gameState.currentTime}
            isPlaying={g.isPlaying}
            accuracy={undefined}
            width={280}
            height={80}
            colorScheme="neon"
            showTargetLine={false}
            minPitch={g.pitchStats.minPitch}
            maxPitch={g.pitchStats.maxPitch}
          />
        </div>
      )}

      {/* Audio Element - Primary audio source for songs with separate audio file */}
      {/* key=song.id forces React to create a fresh DOM element per song,
          preventing "already connected to different MediaElementSourceNode" errors
          when SpectrogramDisplay / useSongEnergy call createMediaElementSource */}
      {g.effectiveSong?.audioUrl && (
        <audio
          key={g.effectiveSong.id}
          ref={g.audioElRefCallback}
          src={g.effectiveSong.audioUrl}
          className="hidden"
          onEnded={g.endGameAndCleanup}
          onError={(e) => {
            const audio = e.currentTarget;
            // eslint-disable-next-line no-console
            console.error('[GameScreen] Audio element error:', {
              error: audio.error,
              networkState: audio.networkState,
              readyState: audio.readyState,
              src: audio.src?.substring(0, 50)
            });
          }}
          // eslint-disable-next-line react-hooks/immutability -- event callback: set ref flag for imperative tracking
          onCanPlay={() => { g.audioLoadedRef.current = true; }}
          preload="auto"
        />
      )}

      {/* Hidden Video Element for embedded audio (when video has audio but we don't show it) */}
      {g.effectiveSong?.hasEmbeddedAudio && g.effectiveSong?.videoBackground && !g.showBackgroundVideo && !g.isYouTube && !g.effectiveSong?.audioUrl && (
        <video
          key={`video-${g.effectiveSong.id}`}
          ref={g.videoRef}
          src={g.effectiveSong.videoBackground}
          className="hidden"
          muted={false}
          playsInline
          onEnded={g.endGameAndCleanup}
          preload="auto"
        />
      )}

      {/* Game Area - Full Screen */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Background layer — in low-perf mode: no video, no animated bg, no song energy */}
        <GameBackground
          effectiveSong={g.effectiveSong}
          showBackgroundVideo={!g.isLowPerf && g.showBackgroundVideo}
          useAnimatedBackground={!g.isLowPerf && g.useAnimatedBackground}
          isYouTube={g.isYouTube}
          youtubeVideoId={g.youtubeVideoId}
          useYouTubeAudio={g.useYouTubeAudio}
          isPlaying={g.isPlaying}
          isAdPlaying={g.isAdPlaying}
          songEnergy={g.isLowPerf ? 0 : (g.songEnergy ?? 0)}
          volume={g.volume}
          videoRef={g.videoRef}
          onYoutubeTimeUpdate={g.setYoutubeTime}
          onAdStart={g.handleAdStart}
          onAdEnd={g.handleAdEnd}
          onVideoEnded={g.endGameAndCleanup}
          // eslint-disable-next-line react-hooks/immutability -- event callback: set ref flag for imperative tracking
          onVideoCanPlay={() => { g.videoLoadedRef.current = true; }}
          onYoutubeError={(errorCode) => {
            const messages: Record<number, string> = {
              100: t('gameScreen.youtubeErrorDeleted'),
              101: t('gameScreen.youtubeErrorEmbed'),
              150: t('gameScreen.youtubeErrorVevo'),
              2: t('gameScreen.youtubeErrorInvalid'),
              5: t('gameScreen.youtubeErrorHtml5'),
            };
            g.setYoutubeError(messages[errorCode] || t('gameScreen.youtubeErrorCode').replace('{n}', String(errorCode)));
            // eslint-disable-next-line no-console
            console.error('[GameScreen] YouTube error:', errorCode);
          }}
        />

        {/* Webcam Background — disabled in low-performance mode */}
        {!g.isLowPerf && (
          <WebcamBackground
            config={g.webcamConfig}
            onConfigChange={g.updateWebcamConfig}
          />
        )}

        {/* Countdown */}
        <GameCountdown countdown={g.countdown} />

        {/* Ad Indicator */}
        <AdIndicator isAdPlaying={g.isAdPlaying} adCountdown={g.adCountdown ?? 0} />

        {/* YouTube Error Indicator */}
        {g.youtubeError && (
          <div className="absolute top-14 left-1/2 -translate-x-1/2 z-30 bg-red-500/90 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-lg max-w-md text-center">
            ⚠️ {g.youtubeError}
          </div>
        )}

        {/* Dark Overlay for better note visibility */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/50 z-5" />

        {/* Note Highway — use lightweight NoteLane in low-performance mode */}
        {g.isLowPerf ? (
          <NoteLane
            lyrics={g.timingData?.sortedLines || []}
            currentTime={g.gameState.currentTime}
            difficulty={g.gameState.difficulty}
            detectedPitch={g.pitchResult?.frequency ?? null}
          />
        ) : g.isDuetMode ? (
          <DuetNoteHighway
            p1VisibleNotes={g.p1VisibleNotes}
            p2VisibleNotes={g.p2VisibleNotes}
            p1PitchStats={g.p1PitchStats}
            p2PitchStats={g.p2PitchStats}
            currentTime={g.gameState.currentTime}
            p1DetectedPitch={g.smoothedPitch}
            p2DetectedPitch={g.p2DetectedPitch}
            p1State={g.gameState.players[0]}
            p2State={g.p2State}
            p2Player={g.gameState.players[1]}
            noteShapeStyle={g.noteShapeStyle}
            p1Lines={g.timingData?.p1Lines}
            p2Lines={g.timingData?.p2Lines}
            singLinePosition={SING_LINE_POSITION}
            noteWindow={NOTE_WINDOW}
            notePerformance={g.notePerformance}
            p2NotePerformance={g.p2NotePerformance}
            gameMode={g.gameState.gameMode}
            missingWordsIndices={g.gameState.missingWordsIndices}
            isBlindSection={g.gameState.isBlindSection}
            isBlindHardcore={g.gameState.blindHardcore}
            hardcoreMissingWords={g.gameState.hardcoreMissingWords}
            p1PlayerName={g.song?.duetPlayerNames?.[0] || g.gameState.players[0]?.name || t('prominentScore.player1')}
            p2PlayerName={g.song?.duetPlayerNames?.[1] || g.gameState.players[1]?.name || t('prominentScore.player2')}
            noteDisplayStyle={g.noteDisplayStyle as 'classic' | 'fill-level' | 'color-feedback' | 'glow-intensity'}
          />
        ) : (
          <NoteHighway
            visibleNotes={g.visibleNotes}
            currentTime={g.gameState.currentTime}
            pitchStats={g.pitchStats}
            detectedPitch={g.smoothedPitch}
            noteShapeStyle={g.noteShapeStyle}
            noteDisplayStyle={g.noteDisplayStyle as 'classic' | 'fill-level' | 'color-feedback' | 'glow-intensity'}
            notePerformance={g.notePerformance}
            singLinePosition={SING_LINE_POSITION}
            noteWindow={NOTE_WINDOW}
            playerColor={PLAYER_COLORS[0]}
            showPlayerLabel={false}
            visibleTop={VISIBLE_TOP}
            visibleRange={VISIBLE_RANGE}
            isBlindSection={g.gameState.isBlindSection}
            missingWordsIndices={g.gameState.missingWordsIndices}
            gameMode={g.gameState.gameMode}
          />
        )}

        {/* Lyrics Display — NoteLane has built-in lyrics in low-perf mode */}
        {!g.isDuetMode && !g.isLowPerf && g.timingData && (
          <SinglePlayerLyrics
            sortedLines={g.timingData.sortedLines}
            currentTime={g.gameState.currentTime}
            playerColor={PLAYER_COLORS[0]}
            noteDisplayStyle={g.noteDisplayStyle as 'classic' | 'fill-level' | 'color-feedback' | 'glow-intensity'}
            notePerformance={g.notePerformance}
            gameMode={g.gameState.gameMode}
            missingWordsIndices={g.gameState.missingWordsIndices}
            isBlindSection={g.gameState.isBlindSection}
            isBlindHardcore={g.gameState.blindHardcore}
            hardcoreMissingWords={g.gameState.hardcoreMissingWords}
            lyricsSize={g.lyricsSize}
          />
        )}

        {/* Mic Indicator — shows assigned mic + player during gameplay */}
        <MicIndicator
          currentTime={g.gameState.currentTime}
          isPlaying={g.isPlaying}
          isDuetMode={g.isDuetMode}
          gameMode={g.gameState.gameMode}
        />

        {/* Volume Meter */}
        <VolumeMeter volume={g.volume} />

        {/* Audio Effects Button */}
        <AudioEffectsButton onClick={g.toggleAudioEffects} />

        {/* Audio Effects Panel */}
        <AudioEffectsPanel
          show={g.showAudioEffects}
          audioEffects={g.audioEffects}
          reverbAmount={g.reverbAmount}
          echoAmount={g.echoAmount}
          onReverbChange={g.setReverbAmount}
          onEchoChange={g.setEchoAmount}
          onApplyPreset={g.applyEffectPreset}
        />

        {/* Progress Bar — uses actual media duration when available */}
        <GameProgressBar
          currentTime={g.gameState.currentTime}
          duration={g.displayDuration}
        />

        {/* Time Display — uses actual media duration when available */}
        <TimeDisplay
          currentTime={g.gameState.currentTime}
          duration={g.displayDuration}
        />
      </div>

      <PracticePanel
        practiceMode={g.practiceMode}
        showControls={g.showPracticeControls}
        onToggleControls={() => g.setShowPracticeControls(!g.showPracticeControls)}
        onPracticeModeChange={(config) => g.setPracticeMode(p => ({ ...p, ...config }))}
      />

      {/* Score Events & Particles — disabled in low-performance mode */}
      {!g.isLowPerf && g.showParticles !== false && <ScoreEventsDisplay events={g.scoreEvents} maxVisible={3} isDuetMode={g.isDuetMode} />}
      {!g.isLowPerf && g.showParticles !== false && <ParticleSystem particles={g.particles} />}

      {/* Spectrogram Display / Equalizer — left side, below pitch detection */}
      {g.showPitchGuide && g.isPlaying && !g.isLowPerf && !g.hasChallengeNoPitchGuide && (
        <SpectrogramDisplay
          audioElement={g.spectrogramAudioEl}
          isActive={g.isPlaying && !!g.spectrogramAudioEl}
          mode="bars"
          position={{ x: 50, y: 50 }}
          size={{ width: 256, height: 40 }}
          colorScheme="neon"
          numBars={24}
          className="!absolute !left-4 !top-[17.5rem] !transform-none"
        />
      )}

      {/* Combo Fire Effect — disabled in low-performance mode */}
      {!g.isLowPerf && g.showCombo !== false && g.gameState.players[0]?.combo && g.gameState.players[0].combo >= 5 && (
        <div className="fixed bottom-32 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
          <ComboFireEffect combo={g.gameState.players[0].combo} isLarge={g.gameState.players[0].combo >= 20} />
        </div>
      )}

      {/* Prominent Score Display - Only for Single Player Mode */}
      {!g.isDuetMode && g.showScore !== false && <ProminentScoreDisplay player={g.gameState.players[0]} showCombo={g.showCombo !== false} />}
    </div>
  );
}

export { GameScreen };
