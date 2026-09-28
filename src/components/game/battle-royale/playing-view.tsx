'use client';

/**
 * Battle Royale PlayingView — orchestrator (task R12).
 *
 * Public surface unchanged (PlayingView + PlayingViewProps, imported from
 * battle-royale-screen.tsx). The component keeps the media effects
 * (pause/resume, 3s fade-out, GO overlay, auto-end), the root layout and the
 * fixed corner pieces (hidden audio, GameBackground, HUD chrome, countdown
 * overlays, round progress bar). The cohesive sections were extracted 1:1
 * (byte-identical bodies) to battle-royale/playing/:
 *
 * - playing/animated-number.tsx       — inline AnimatedNumber (React.memo)
 * - playing/use-blink-eliminated.ts   — 6.4 blinking-X marker logic
 * - playing/use-elimination-clock.ts  — R16/R19 elimination clock + danger zone
 * - playing/use-lyric-lines.ts        — current/next lyric line selection (R15)
 * - playing/elimination-hud.tsx       — vignette, alarm frame, countdown, banner
 * - playing/elimination-overlay.tsx   — eliminating / survivor-flash overlay
 * - playing/timer-bar.tsx             — layout 1: timer bar + round info
 * - playing/player-cards-strip.tsx    — layout 2: player cards strip
 * - playing/note-highway-section.tsx  — layout 3: note highway + ghost strips
 * - playing/bottom-hud.tsx            — bottom badges + playtime display
 * - playing/lyrics-block.tsx          — layout 4: lyrics block
 */

import React, { useEffect, useState } from 'react';
import { GameHudChrome } from '@/components/game/hud/game-hud-chrome';
import { GameCountdown } from '@/components/game/game-countdown';
import { GameBackground } from '@/components/game/game-background';
import { Song, Note, LyricLine, PitchDetectionResult } from '@/types/game';
import { PitchStats } from '@/lib/game/note-utils';
import {
  BattleRoyaleGame,
  BattleRoyalePlayer,
  getCurrentMedleySnippet,
  TieBreakState,
} from '@/lib/game/battle-royale';
import { loadWebcamConfig } from '@/components/game/webcam-background';
import { usePartyStore } from '@/lib/game/party-store';
import { useTranslation } from '@/lib/i18n/translations';
import { EliminationHud } from './playing/elimination-hud';
import { EliminationOverlay } from './playing/elimination-overlay';
import { PlayerCardsStrip } from './playing/player-cards-strip';
import { TimerBar } from './playing/timer-bar';
import { NoteHighwaySection } from './playing/note-highway-section';
import { BottomHud } from './playing/bottom-hud';
import { LyricsBlock } from './playing/lyrics-block';
import { useBlinkEliminated } from './playing/use-blink-eliminated';
import { useEliminationClock } from './playing/use-elimination-clock';
import { useLyricLines } from './playing/use-lyric-lines';

// ===================== Main Component =====================

interface PlayingViewProps {
  game: BattleRoyaleGame;
  sortedPlayers: BattleRoyalePlayer[];
  activePlayers: BattleRoyalePlayer[];
  currentSong: Song | null;
  currentTime: number;
  roundTimeLeft: number;
  snippetTimeLeft: number | null;
  currentSnippetIndex: number;
  totalSnippets: number;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  /** Base audio volume (master volume × per-song loudness gain) that all fades run toward/from. */
  baseVolumeRef: React.MutableRefObject<number>;
  setCurrentTime: (_time: number) => void;
  onRoundEnd: () => void;
  /** R19 tie-break showdown (active while tied players battle the 10s
   *  extension) — drives the amber ⚔️ HUD, the amber frame and the amber
   * card highlight of the tied players. */
  tieBreak?: TieBreakState | null;
  // New props
  pitchStats: PitchStats | null;
  visibleNotes: Array<Note & { lineIndex: number; line: LyricLine }>;
  countdown: number;
  // Multi-pitch detection
  playerPitchMap: Map<string, PitchDetectionResult | null>;
  multiPitchErrors: Map<string, string>;
  eliminationPhase?: null | 'eliminating' | 'survivor-flash';
  /** Seconds until the next mid-round elimination (null = none scheduled).
   *  During a tie-break showdown it counts down the SHOWDOWN deadline. */
  nextEliminationIn?: number | null;
  /** Latest mid-round elimination for the non-blocking HUD banner.
   *  byCoinFlip = the showdown ended in a coin flip (R19). */
  midRoundEliminationNotice?: { id: string; name: string; byCoinFlip?: boolean } | null;
  /** Per-player note performance samples (ghost notes): playerId → noteKey → samples. */
  brNotePerformance?: Map<string, Map<string, Array<{ time: number; accuracy: number; hit: boolean; sungPitch?: number | null }>>>;
}

export function PlayingView({
  game,
  sortedPlayers,
  activePlayers,
  currentSong,
  currentTime,
  roundTimeLeft,
  snippetTimeLeft,
  currentSnippetIndex,
  totalSnippets,
  audioRef,
  videoRef,
  baseVolumeRef,
  setCurrentTime,
  onRoundEnd,
  tieBreak,
  pitchStats,
  visibleNotes,
  countdown,
  playerPitchMap,
  multiPitchErrors,
  eliminationPhase,
  nextEliminationIn,
  midRoundEliminationNotice,
  brNotePerformance,
}: PlayingViewProps) {
  const { t } = useTranslation();
  const currentRound = game.rounds[game.rounds.length - 1];
  const audioStartedRef = React.useRef(false);
  const setIsSongPlaying = usePartyStore(s => s.setIsSongPlaying);
  const pauseDialogAction = usePartyStore(s => s.pauseDialogAction);
  const setPauseDialogAction = usePartyStore(s => s.setPauseDialogAction);

  const currentSnippet = getCurrentMedleySnippet(game);

  // V3: "GO!" overlay state
  const [showGoOverlay, setShowGoOverlay] = useState(false);

  // ── User rule 6.4: recently eliminated player — blinking red X marker on
  // the player card (full rationale + effect bodies extracted 1:1 to
  // playing/use-blink-eliminated.ts)
  const { blinkEliminatedId } = useBlinkEliminated(game);

  // Fix 15 (webcam): BR does not render the webcam background layer (or its
  // quick controls) by default — a live webcam feed + processing costs real
  // CPU during 4-player rounds. It is only mounted when the user explicitly
  // enabled the webcam globally (persisted config from other modes).
  // Lazy initializer — same pattern GameHudChrome itself uses for this config;
  // PlayingView only mounts mid-game (never part of SSR HTML), so reading the
  // persisted config during first render is safe.
  const [webcamEnabled] = useState(() => loadWebcamConfig().enabled);

  // Report song playing status
  useEffect(() => {
    setIsSongPlaying(true);
    return () => { setIsSongPlaying(false); };
  }, [setIsSongPlaying]);

  // Pause / Resume — pause BOTH audio AND video (video was missing before)
  // R20-2 (user report "Video läuft bei Abort weiter"): ANY open dialog
  // freezes the media — Abort swaps 'song-pause' → 'party-leave' in one
  // batched store write (null is never rendered), so a check for
  // 'song-pause' alone left the video running behind the leave dialog while
  // the audio stayed paused → the video ran ahead and was async after Back.
  useEffect(() => {
    if (pauseDialogAction !== null) {
      if (audioRef.current && !audioRef.current.paused) {
        audioRef.current.pause();
      }
      if (videoRef.current && !videoRef.current.paused) {
        videoRef.current.pause();
      }
    } else {
      if (audioRef.current && audioRef.current.paused && game.status === 'playing' && audioStartedRef.current) {
        audioRef.current.play().catch(() => {});
      }
      if (videoRef.current && videoRef.current.paused && game.status === 'playing' && audioStartedRef.current) {
        videoRef.current.play().catch(() => {});
      }
    }
  }, [pauseDialogAction, game.status, audioRef, videoRef]);

  // Audio fade-out in last 3 seconds of round — toward the normalized base
  // volume (master × per-song loudness gain), never a literal 1.
  useEffect(() => {
    const base = baseVolumeRef.current;
    if (roundTimeLeft > 3 || roundTimeLeft === 0 || game.status !== 'playing') {
      // Reset volume (back up to the base) when not in the fade zone
      if (audioRef.current && audioRef.current.volume < base) {
        audioRef.current.volume = base;
      }
      return;
    }
    const volume = (roundTimeLeft / 3) * base;
    if (audioRef.current) {
      audioRef.current.volume = Math.max(0, volume);
    }
  }, [roundTimeLeft, game.status, audioRef, baseVolumeRef]);

  // V3: Show "GO!" when countdown reaches 0
  useEffect(() => {
    if (countdown === 0 && game.status === 'playing') {
      // Use queueMicrotask to avoid synchronous setState in effect
      queueMicrotask(() => setShowGoOverlay(true));
      const timer = setTimeout(() => setShowGoOverlay(false), 500);
      return () => clearTimeout(timer);
    }
    // Hide when countdown is active
    if (countdown > 0) {
      queueMicrotask(() => setShowGoOverlay(false));
    }
  }, [countdown, game.status]);

  // Auto-end round when timer hits 0
  useEffect(() => {
    if (roundTimeLeft === 0 && game.status === 'playing') {
      const timer = setTimeout(() => {
        onRoundEnd();
      }, 500); // Brief delay for last scoring tick
      return () => clearTimeout(timer);
    }
  }, [roundTimeLeft, game.status, onRoundEnd]);

  // R16/R19: elimination clock, danger-zone + showdown flags (extracted 1:1
  // to playing/use-elimination-clock.ts)
  const {
    showdownActive,
    elimCountdownSec,
    elimFromRoundTimer,
    isElimCritical,
    isDangerZone,
    isDanger,
    isInShowdown,
    isLowest,
    isEliminationCamera,
    eliminationAnimationEnabled,
  } = useEliminationClock({ sortedPlayers, tieBreak, nextEliminationIn, game, currentRound, roundTimeLeft });

  // Current + next lyric line selection (extracted 1:1 to
  // playing/use-lyric-lines.ts)
  const { currentLyricLine, nextLyricLine } = useLyricLines(currentSong, currentTime);

  return (
    <div className={`fixed inset-0 z-40 flex flex-col overflow-hidden ${isEliminationCamera ? 'elimination-camera-active' : ''}`}>
      {/* Hidden Audio Element */}
      <audio
        ref={audioRef}
        onTimeUpdate={(e) => {
          setCurrentTime(e.currentTarget.currentTime * 1000);
          audioStartedRef.current = true;
        }}
        onEnded={() => {
          if (audioStartedRef.current) {
            onRoundEnd();
          }
        }}
        onError={(e) => {
          // eslint-disable-next-line no-console
          console.error('[BattleRoyale] Audio error:', e);
        }}
        className="hidden"
        preload="auto"
      />

      {/* V2: GameBackground (replaces raw <video> and dark overlay) */}
      <div className="absolute inset-0 overflow-hidden" style={{ zIndex: -10 }}>
        <GameBackground
          effectiveSong={currentSong}
          showBackgroundVideo={game.settings.showVideoBackground}
          useAnimatedBackground={false}
          isYouTube={false}
          youtubeVideoId={null}
          useYouTubeAudio={false}
          isPlaying={game.status === 'playing' && pauseDialogAction === null}
          isAdPlaying={false}
          songEnergy={0}
          volume={1}
          videoRef={videoRef}
          onYoutubeTimeUpdate={() => {}}
          onAdStart={() => {}}
          onAdEnd={() => {}}
          onVideoEnded={() => {}}
          onVideoCanPlay={() => {}}
          onYoutubeError={() => {}}
        />
      </div>

      {/* Dark overlay on top of background */}
      <div className="absolute inset-0 bg-black/30 pointer-events-none" style={{ zIndex: -5 }} />

      {/* Elimination HUD: #10 red vignette, R16/R19 alarm frame, the prominent
          elimination/showdown countdown and the mid-round elimination banner —
          extracted 1:1 to playing/elimination-hud.tsx */}
      <EliminationHud
        isEliminationCamera={isEliminationCamera}
        elimCountdownSec={elimCountdownSec}
        showdownActive={showdownActive}
        isElimCritical={isElimCritical}
        midRoundEliminationNotice={midRoundEliminationNotice}
      />

      {/* ─────────── Unified HUD chrome (top-center: song; top-left: Pause + End Round; top-right: Difficulty + Webcam + Fullscreen) ─────────── */}
      <GameHudChrome
        isPlaying={game.status === 'playing' && pauseDialogAction === null}
        onTogglePause={() => {
          if (pauseDialogAction === 'song-pause') {
            setPauseDialogAction(null);
          } else {
            if (audioRef.current && !audioRef.current.paused) {
              audioRef.current.pause();
            }
            setPauseDialogAction('song-pause');
          }
        }}
        onEndSong={onRoundEnd}
        difficulty={game.effectiveDifficulty}
        songTitle={currentSnippet?.songName ?? currentRound?.songName ?? null}
        songArtist={currentSong?.artist ?? null}
        renderWebcamBackground={webcamEnabled}
        showWebcamControls={webcamEnabled}
      />

      {/* Inline Elimination Overlay (phases: eliminating / survivor-flash) —
          extracted 1:1 to playing/elimination-overlay.tsx */}
      <EliminationOverlay
        eliminationPhase={eliminationPhase}
        game={game}
        sortedPlayers={sortedPlayers}
      />

      {/* ─────────── Pause is handled by the app-level SongPauseDialog ─────────── */}

      {/* ─────────── V3: Countdown Overlay ─────────── */}      {countdown > 0 && <GameCountdown countdown={countdown} />}

      {/* V3: "GO!" / "LOS!" overlay when countdown finishes */}
      {showGoOverlay && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-30 pointer-events-none">
          <div
            className="text-8xl font-black text-white drop-shadow-2xl"
            style={{ animation: 'countdownPop 0.3s ease-out' }}
          >
            {t('game.go')}
          </div>
        </div>
      )}
      {/* B3.2: Multi-Pitch mic status pill removed (redundant with per-player
          mic indicators in the player cards + volume meters) */}

      {/* ══════════════════════════════════════════════════════════
          LAYOUT (top to bottom):
          1. Timer bar + round info (~40px, below the fixed corner buttons)
          2. Player cards strip (scrollable, ~60px — clear of corner buttons)
          3. Note Highway (flex-1, majority of space)
          4. Lyrics (bottom, ~80px — BR-style background, clear of the
             bottom-corner time displays)
          5. Round progress bar (very bottom edge, h-1 like other modes)
      ══════════════════════════════════════════════════════════ */}

      {/* 1. Timer bar + round info — extracted 1:1 to playing/timer-bar.tsx */}
      <TimerBar
        game={game}
        activePlayers={activePlayers}
        totalSnippets={totalSnippets}
        snippetTimeLeft={snippetTimeLeft}
        currentSnippet={currentSnippet}
        currentSnippetIndex={currentSnippetIndex}
      />

      {/* 2. Player cards strip — extracted 1:1 to playing/player-cards-strip.tsx */}
      <PlayerCardsStrip
        sortedPlayers={sortedPlayers}
        activePlayers={activePlayers}
        blinkEliminatedId={blinkEliminatedId}
        isDanger={isDanger}
        isInShowdown={isInShowdown}
        isLowest={isLowest}
        playerPitchMap={playerPitchMap}
        multiPitchErrors={multiPitchErrors}
      />

      {/* 3. Note highway (flex-1, majority of space) — extracted 1:1 to
          playing/note-highway-section.tsx */}
      <NoteHighwaySection
        game={game}
        pitchStats={pitchStats}
        visibleNotes={visibleNotes}
        currentTime={currentTime}
        activePlayers={activePlayers}
        brNotePerformance={brNotePerformance}
      />

      {/* Unified bottom HUD: round countdown + snippet timer (bottom-left) +
          playtime/duration (bottom-right) — extracted 1:1 to playing/bottom-hud.tsx */}
      <BottomHud
        elimFromRoundTimer={elimFromRoundTimer}
        showdownActive={showdownActive}
        roundTimeLeft={roundTimeLeft}
        totalSnippets={totalSnippets}
        currentSnippetIndex={currentSnippetIndex}
        snippetTimeLeft={snippetTimeLeft}
        currentTime={currentTime}
        currentSong={currentSong}
      />

      {/* 4. Lyrics (bottom) — extracted 1:1 to playing/lyrics-block.tsx */}
      <LyricsBlock
        currentSong={currentSong}
        currentLyricLine={currentLyricLine}
        nextLyricLine={nextLyricLine}
        currentTime={currentTime}
      />

      {/* ─────────── 5. ROUND PROGRESS BAR (very bottom edge, h-1 like other modes — B3.4) ─────────── */}
      <div className="flex-shrink-0 w-full h-1 bg-white/10" data-testid="br-round-progress">
        <div
          className="h-full transition-all duration-300"
          style={{
            width: `${Math.min(100, Math.max(0, (roundTimeLeft / (currentRound?.duration || 60)) * 100))}%`,
            background: roundTimeLeft <= 5
              ? 'linear-gradient(90deg, #ef4444, #f97316)'
              : 'linear-gradient(90deg, #06b6d4, #a855f7)',
          }}
        />
      </div>

      {/* Danger Warning Overlay */}
      {eliminationAnimationEnabled && isDangerZone && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-red-500/20 to-transparent pointer-events-none transition-opacity duration-500" />
      )}

      {/* Difficulty now lives in the unified top-right HUD chrome (GameHudChrome) */}
    </div>
  );
}
