'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { GameHudChrome } from '@/components/game/hud/game-hud-chrome';
import { TimeDisplay } from '@/components/game/game-hud';
import { NoteHighway, NotePlayerStrip } from '@/components/game/note-highway';
import { GameBackground } from '@/components/game/game-background';
import { GameCountdown } from '@/components/game/game-countdown';
import { Song, Note, LyricLine, PitchDetectionResult } from '@/types/game';
import { PitchStats } from '@/lib/game/note-utils';
import { VISIBLE_TOP, VISIBLE_RANGE, SING_LINE_POSITION, NOTE_WINDOW } from '@/lib/game/note-utils';
import {
  BattleRoyaleGame,
  BattleRoyalePlayer,
  getCurrentMedleySnippet,
  TieBreakState,
} from '@/lib/game/battle-royale';
import { LyricLineDisplay } from '@/components/game/lyric-line-display';
import { loadWebcamConfig } from '@/components/game/webcam-background';
import { usePartyStore } from '@/lib/game/party-store';
import { useTranslation } from '@/lib/i18n/translations';

// ===================== Inline AnimatedNumber =====================

/** Lightweight animated number counter — counts from previous to current over 500ms.
 *  Fix 15.4: React.memo so the ~20Hz pitch-state re-renders of the parent
 *  don't re-render counters whose value didn't change. */
const AnimatedNumber = React.memo(function AnimatedNumber({ value, className }: { value: number; className?: string }) {
  const [displayed, setDisplayed] = useState(value);
  const prevRef = useRef(value);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const from = prevRef.current;
    const to = value;
    if (from === to) {
      prevRef.current = to;
      return;
    }

    const duration = 500;
    const start = performance.now();

    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayed(Math.round(from + (to - from) * eased));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayed(to);
        prevRef.current = to;
      }
    };

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [value]);

  return <span className={className}>{displayed.toLocaleString()}</span>;
});

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

/** Stable empty performance map for players without samples yet. */
const EMPTY_PLAYER_PERF: Map<string, Array<{ time: number; accuracy: number; hit: boolean; sungPitch?: number | null }>> = new Map();

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

  // ── User rule 6.4: recently eliminated player ──
  // A newly eliminated player gets a blinking red X on their card for ~2.7s
  // (CSS brElimBlink), then stays permanently grayed out. No fullscreen
  // overlay, no countdown. Diffs the eliminated set on every players update,
  // so it fires for BOTH round-end eliminations AND mid-round eliminations
  // (user rule 6.1: full-song rounds eliminate at intervals while the song
  // keeps playing).
  // NOTE: the blink timer lives in a ref (NOT effect cleanup) — game.players
  // changes on every scoring tick (~10×/s) and a cleanup-based timer would
  // be cancelled immediately.
  const [blinkEliminatedId, setBlinkEliminatedId] = useState<string | null>(null);
  const prevEliminatedIdsRef = useRef<Set<string>>(
    new Set(game.players.filter(p => p.eliminated).map(p => p.id)),
  );
  const blinkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const eliminatedNow = new Set(
      game.players.filter(p => p.eliminated).map(p => p.id),
    );
    const prev = prevEliminatedIdsRef.current;
    prevEliminatedIdsRef.current = eliminatedNow;

    let newly: string | null = null;
    for (const id of eliminatedNow) {
      if (!prev.has(id)) { newly = id; break; }
    }
    if (!newly) return;
    setBlinkEliminatedId(newly);
    if (blinkTimerRef.current) clearTimeout(blinkTimerRef.current);
    blinkTimerRef.current = setTimeout(() => setBlinkEliminatedId(null), 2700);
  }, [game.players]);
  useEffect(() => {
    return () => {
      if (blinkTimerRef.current) clearTimeout(blinkTimerRef.current);
    };
  }, []);

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
  useEffect(() => {
    if (pauseDialogAction === 'song-pause') {
      if (audioRef.current && !audioRef.current.paused) {
        audioRef.current.pause();
      }
      if (videoRef.current && !videoRef.current.paused) {
        videoRef.current.pause();
      }
    } else if (pauseDialogAction === null) {
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

  // Danger zone detection
  const activeSorted = sortedPlayers.filter(p => !p.eliminated);
  const dangerZone = activeSorted.length > 3 ? activeSorted.slice(-3) : activeSorted;

  // ── R16 (user request 1): the ELIMINATION countdown ──────────────────
  // The ONE clock that decides who drops out next — shown prominently at
  // the top edge (big, red, centered):
  //  • rhythm rounds (random/vote, no medley, no finale) → nextEliminationIn
  //    (mid-round eliminations; carries across song changes since R15/1.3)
  //  • medley rounds → the round timer (round end = elimination there)
  //  • grand finale → none (the duel decides a WIN, nobody is eliminated)
  // R19: during a tie-break SHOWDOWN the same HUD turns amber (⚔️ Stechen!)
  // and counts down the showdown deadline — including medley/finale rounds.
  const showdownActive = !!tieBreak;
  const elimCountdownSec: number | null =
    nextEliminationIn != null
      ? nextEliminationIn
      : game.isGrandFinale
        ? null
        : currentRound?.roundType === 'medley'
          ? roundTimeLeft
          : null;
  // True when the elimination clock IS the round timer (medley rounds) —
  // the bottom-left round badge then hides to avoid showing the same
  // number twice (a numeric equality check would misfire in rhythm rounds
  // when both clocks coincidentally hold the same value). Hidden during a
  // showdown too (its countdown owns the display, the round timer is at 0).
  const elimFromRoundTimer =
    !showdownActive && nextEliminationIn == null && !game.isGrandFinale && currentRound?.roundType === 'medley';
  // Critical: last 5 seconds of EVERY countdown → alarm frame + beating number
  const isElimCritical = elimCountdownSec != null && elimCountdownSec <= 5 && elimCountdownSec > 0;
  const isDangerZone = isElimCritical && !showdownActive;

  const isDanger = useCallback((player: BattleRoyalePlayer) =>
    isDangerZone && !player.eliminated && dangerZone.some(d => d.id === player.id),
    [isDangerZone, dangerZone]
  );

  // R19: the tied players battling the showdown glow amber on their cards.
  const isInShowdown = useCallback((player: BattleRoyalePlayer) =>
    showdownActive && !player.eliminated && !!tieBreak && tieBreak.playerIds.includes(player.id),
    [showdownActive, tieBreak]);

  const isLowest = (player: BattleRoyalePlayer) =>
    !player.eliminated && activeSorted.length > 0 && activeSorted[activeSorted.length - 1].id === player.id;

  // #10 Elimination camera: dramatic effects in the last 10 seconds of the
  // ELIMINATION countdown (R16: re-keyed from the round timer — in rhythm
  // rounds the round timer merely ends the SONG, the elimination clock is
  // what puts the bottom players at risk; medley rounds keep the identical
  // behaviour since their round timer IS the elimination clock).
  const eliminationAnimationEnabled = game.settings.eliminationAnimation;
  // R19: the amber showdown frame replaces the red elimination drama while
  // the showdown runs (the tied players get their own visual language).
  const isEliminationCamera = eliminationAnimationEnabled && !showdownActive && elimCountdownSec != null && elimCountdownSec <= 10 && elimCountdownSec > 0;

  // Standard lyrics display: find current and next lyric lines using LyricLineDisplay
  // R15 (user request 1.2): 3s preview window — the lyric block fades back in
  // ~3 seconds before the next vocal phrase starts (was 2s).
  const { currentLyricLine, nextLyricLine } = useMemo(() => {
    if (!currentSong?.lyrics || currentSong.lyrics.length === 0) {
      return { currentLyricLine: null, nextLyricLine: null };
    }
    const lyrics = currentSong.lyrics;
    // Find active line (currently being sung)
    const activeLine = lyrics.find(line =>
      currentTime >= line.startTime && currentTime <= line.endTime
    );
    if (activeLine) {
      const idx = lyrics.indexOf(activeLine);
      return {
        currentLyricLine: activeLine,
        nextLyricLine: idx >= 0 && idx < lyrics.length - 1 ? lyrics[idx + 1] : null,
      };
    }
    // No active line: show next upcoming line within 3s preview window
    for (let i = 0; i < lyrics.length; i++) {
      if (currentTime < lyrics[i].startTime && lyrics[i].startTime - currentTime < 3000) {
        return {
          currentLyricLine: lyrics[i],
          nextLyricLine: i < lyrics.length - 1 ? lyrics[i + 1] : null,
        };
      }
    }
    // Long instrumental pause: NO line — the block fades out entirely
    // (R15, user request 1.2: like the other modes, no stale text during
    // pauses — and no misleading "first line of the song" fallback either).
    return { currentLyricLine: null, nextLyricLine: null };
  }, [currentSong, currentTime]);

  // V5: Multi-pitch mic status — count players whose pitch detector is initialized
  const activeMicPlayers = activePlayers.filter(p => p.playerType === 'microphone');

  // ── Ghost notes: per-player strips for the note highway ─────────────
  // ≥2 active players → Medley-style per-player strips (hits fill the
  // strip in the player colour, wrong-pitch misses become ghost bars at
  // the sung pitch in the player colour + live miss dots).
  // Exactly 1 active player (late-game survivor) → single-player modern
  // pipeline (ghosts like Single/Duell). No data yet → flat fill fallback.
  const playerStrips = useMemo<NotePlayerStrip[]>(() => {
    if (!brNotePerformance) return [];
    return activePlayers.map(p => ({
      id: p.id,
      color: p.color,
      performance: brNotePerformance.get(p.id) ?? EMPTY_PLAYER_PERF,
    }));
    // activePlayers is memoised upstream; brNotePerformance identity only
    // changes on the throttled (200 ms) snapshot sync.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePlayers, brNotePerformance]);

  const stripsActive = playerStrips.length >= 2;
  const soloStrip = playerStrips.length === 1 ? playerStrips[0] : null;
  // (B3.2) The central "x/x mics active" pill was removed — per-player
  // singing indicators on the cards already show real-time mic status.

  // V1: Note highway visibility
  const showNoteHighway = game.settings.showNoteHighway && pitchStats !== null && visibleNotes.length > 0;

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
          isPlaying={game.status === 'playing' && pauseDialogAction !== 'song-pause'}
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

      {/* #10 Elimination Camera: Red vignette overlay — last 10 seconds of the
          ELIMINATION countdown (R16: intensity follows the elimination clock) */}
      {isEliminationCamera && elimCountdownSec != null && (
        <div className="absolute inset-0 pointer-events-none z-30 transition-opacity duration-1000"
          style={{
            background: `radial-gradient(ellipse at center, transparent 40%, rgba(220, 38, 38, ${0.3 * (1 - elimCountdownSec / 10)}) 100%)`,
          }}
        />
      )}

      {/* ─────────── R16 (user request 1): ALARM FRAME ───────────
          During the last 5 seconds of EVERY elimination countdown a narrow
          red frame around the ENTIRE screen blinks like an alarm beacon —
          hard on/off, ~1.05s cycle (dramatic, not frantic). Always on: this
          is the core elimination warning, not an optional camera effect.
          R19: while a tie-break SHOWDOWN runs, the frame blinks AMBER for
          its entire duration (⚔️ — the tied players get their own visual
          language, distinct from the red elimination warning). */}
      {showdownActive ? (
        <div
          data-testid="br-showdown-frame"
          className="fixed inset-0 z-40 pointer-events-none animate-br-alarm-frame border-[6px] border-amber-400"
          style={{ boxShadow: 'inset 0 0 70px rgba(251, 191, 36, 0.30), 0 0 26px rgba(251, 191, 36, 0.45)' }}
        />
      ) : isElimCritical ? (
        <div
          data-testid="br-alarm-frame"
          className="fixed inset-0 z-40 pointer-events-none animate-br-alarm-frame border-[6px] border-red-500"
          style={{ boxShadow: 'inset 0 0 70px rgba(239, 68, 68, 0.35), 0 0 26px rgba(239, 68, 68, 0.5)' }}
        />
      ) : null}

      {/* ─────────── R16/R19: ELIMINATION COUNTDOWN / SHOWDOWN ───────────
          Prominent, large, centered at the top edge. Shows the ONE clock
          that decides who drops out next (rhythm interval in full-song
          rounds / round timer in medley rounds; hidden in the grand finale).
          Critical (≤ 5s): the number beats in sync with the alarm frame.
          R19 showdown: amber ⚔️ variant counting down the 10s extension —
          "sing now or the coin decides!" */}
      {elimCountdownSec != null && (
        <div
          data-testid={showdownActive ? 'br-showdown-countdown' : 'br-elim-countdown'}
          className="absolute top-2.5 left-1/2 -translate-x-1/2 z-30 pointer-events-none"
          role="timer"
          aria-label={showdownActive
            ? t('battleRoyale.showdownAria').replace('{n}', String(elimCountdownSec))
            : t('battleRoyale.nextEliminationIn').replace('{n}', String(elimCountdownSec))}
        >
          <div
            className={`flex items-center gap-3 rounded-2xl border px-5 py-1.5 backdrop-blur-md shadow-xl transition-all duration-300 ${
              showdownActive
                ? isElimCritical
                  ? 'bg-amber-950/90 border-amber-300 shadow-amber-400/40'
                  : 'bg-amber-950/70 border-amber-500/70 shadow-amber-950/50'
                : isElimCritical
                  ? 'bg-red-950/85 border-red-500 shadow-red-600/40'
                  : 'bg-black/55 border-red-500/50 shadow-red-950/50'
            }`}
          >
            <span
              aria-hidden="true"
              className={`text-2xl select-none ${isElimCritical ? 'animate-br-countdown-critical' : ''}`}
            >
              {showdownActive ? '⚔️' : '💀'}
            </span>
            <span
              className={`font-mono font-black tabular-nums leading-none select-none ${
                isElimCritical
                  ? showdownActive
                    ? 'text-5xl text-amber-300 animate-br-countdown-critical drop-shadow-[0_0_16px_rgba(252,211,77,0.9)]'
                    : 'text-5xl text-red-400 animate-br-countdown-critical drop-shadow-[0_0_16px_rgba(248,113,113,0.9)]'
                  : showdownActive
                    ? 'text-4xl text-amber-400'
                    : 'text-4xl text-red-500'
              }`}
            >
              {elimCountdownSec}
            </span>
            <span className={`max-w-[110px] text-[10px] font-bold uppercase tracking-widest leading-tight text-left ${
              showdownActive ? 'text-amber-200/90' : 'text-red-300/80'
            }`}>
              {showdownActive
                ? t('battleRoyale.showdownLabel')
                : t('battleRoyale.eliminationCountdownLabel')}
            </span>
          </div>
        </div>
      )}

      {/* ─────────── 2.2-R3 / R19: Mid-round elimination banner (non-blocking) ───────────
          Surfaces WHO just went out in the configured rhythm — the inline ✕ on
          the player card alone was easy to miss (user follow-up: "keine
          Veränderung im Spiel"). Auto-clears after a few seconds (hook-side).
          R19: coin-flip eliminations get their own amber 🪙 variant. */}
      {midRoundEliminationNotice && (
        <div
          className="absolute top-16 left-1/2 -translate-x-1/2 z-40 pointer-events-none animate-in fade-in slide-in-from-top-2 duration-300"
          role="status"
          aria-live="polite"
        >
          <div
            data-testid={midRoundEliminationNotice.byCoinFlip ? 'br-coinflip-notice' : 'br-elimination-notice'}
            className={`flex items-center gap-2 rounded-full px-4 py-2 shadow-lg backdrop-blur-sm border ${
              midRoundEliminationNotice.byCoinFlip
                ? 'bg-amber-950/90 border-amber-400/60 shadow-amber-950/50'
                : 'bg-red-950/85 border-red-500/50 shadow-red-950/50'
            }`}
          >
            <span
              aria-hidden="true"
              className="text-lg inline-block"
              style={midRoundEliminationNotice.byCoinFlip ? { animation: 'brCoinFlip 0.9s ease-out' } : undefined}
            >
              {midRoundEliminationNotice.byCoinFlip ? '🪙' : '💀'}
            </span>
            <span className={`text-sm font-semibold ${
              midRoundEliminationNotice.byCoinFlip ? 'text-amber-200' : 'text-red-200'
            }`}>
              {midRoundEliminationNotice.byCoinFlip
                ? t('battleRoyale.coinFlipEliminated').replace('{name}', midRoundEliminationNotice.name)
                : t('battleRoyale.midRoundEliminated').replace('{name}', midRoundEliminationNotice.name)}
            </span>
          </div>
        </div>
      )}

      {/* ─────────── Unified HUD chrome (top-center: song; top-left: Pause + End Round; top-right: Difficulty + Webcam + Fullscreen) ─────────── */}
      <GameHudChrome
        isPlaying={game.status === 'playing' && pauseDialogAction !== 'song-pause'}
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

      {/* ─────────── Inline Elimination Overlay ─────────── */}
      {eliminationPhase && (
        <div className="absolute inset-0 z-40 pointer-events-none">
          {/* Dim background */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-500" />

          {/* Phase 1: Eliminated player badge with red X */}
          {eliminationPhase === 'eliminating' && (() => {
            const lastRound = game.rounds[game.rounds.length - 1];
            const eliminatedPlayerId = lastRound?.eliminatedPlayerId;
            if (!eliminatedPlayerId) return null;
            return (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center animate-in fade-in zoom-in duration-300">
                  <div className="w-24 h-24 rounded-full bg-red-500/20 border-4 border-red-500 flex items-center justify-center mx-auto mb-3">
                    <span className="text-5xl">✕</span>
                  </div>
                  <p className="text-red-400 font-bold text-lg">
                    {sortedPlayers.find(p => p.id === eliminatedPlayerId)?.name || 'Player'}
                  </p>
                  <p className="text-white/50 text-sm mt-1">Eliminated</p>
                </div>
              </div>
            );
          })()}

          {/* Phase 2: Survivor flash - green borders on surviving players */}
          {eliminationPhase === 'survivor-flash' && (() => {
            const lastRound = game.rounds[game.rounds.length - 1];
            const eliminatedPlayerId = lastRound?.eliminatedPlayerId;
            return (
              <div className="absolute bottom-0 left-0 right-0 pb-2 px-3">
                <div className="flex gap-2 overflow-x-auto justify-center">
                  {sortedPlayers
                    .filter(p => !p.eliminated && p.id !== eliminatedPlayerId)
                    .map(player => (
                      <div
                        key={player.id}
                        className="flex-shrink-0 px-3 py-2 rounded-lg bg-green-500/20 border-2 border-green-400 animate-in fade-in slide-in-from-bottom duration-300"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-green-500/30 flex items-center justify-center text-green-400 text-xs font-bold">
                            {player.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-green-300 text-sm font-medium whitespace-nowrap">{player.name}</span>
                          <span className="text-green-400 text-xs">✓</span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            );
          })()}
        </div>
      )}

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

      {/* ─────────── 1. TIMER BAR + ROUND INFO (pt-24: below the fixed top HUD chrome) ─────────── */}
      {/* Item 8: pb-2 (was pb-1) — extra clearance so the player badges below
          sit a bit lower and no longer crowd the top HUD. */}
      {/* Fix 17: pt-24 (was pt-16) — clears the GameHudChrome top-left pause
          panel + song banner (~68px) AND the top-right difficulty/webcam/fullscreen
          cluster so the Round badge and PlayersLeft badge are fully visible. */}
      <div className="flex-shrink-0 px-3 pt-24 pb-2">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-sm font-bold shrink-0">
              {game.isGrandFinale
                ? `🏆 ${t('battleRoyale.grandFinaleRound').replace('{n}', String(game.currentRound))}`
                : t('battleRoyale.round').replace('{n}', String(game.currentRound))
              }
            </h1>
            {/* Fix 16: duplicate song-title span removed — the HUD song banner
                (top-left, next to the pause panel) already shows "Title — Artist"
                exactly once. */}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-red-500 text-red-400 text-[10px] px-1.5 py-0">
              {t('battleRoyale.playersLeft').replace('{n}', String(activePlayers.length))}
            </Badge>
          </div>
        </div>

        {/* #1 Medley: Snippet progress bar (medley-only segment info, not the round countdown) */}
        {totalSnippets > 1 && snippetTimeLeft !== null && currentSnippet && (
          <div className="flex gap-1 mt-1.5">
            {game.medleySnippetList.map((_, i) => (
              <div
                key={i}
                className={`h-0.5 flex-1 rounded-full transition-all ${
                  i < currentSnippetIndex
                    ? 'bg-purple-500/40'
                    : i === currentSnippetIndex
                      ? 'bg-purple-400 animate-pulse'
                      : 'bg-white/10'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* ─────────── 2. PLAYER CARDS STRIP (flex-wrap) ─────────── */}
      {/* Item 8: pt-4 (added) — moves the player badges bar slightly DOWN,
          away from the top HUD (timer bar + round info). */}
      <div className="flex-shrink-0 px-3 pt-4 pb-1 overflow-y-auto max-h-[140px]">
        <div className="flex flex-wrap gap-1.5">
          {sortedPlayers.map((player) => {
            const danger = isDanger(player);
            const lowest = isLowest(player);
            const eliminated = player.eliminated;
            // 6.4: blinking-X phase right after the elimination became visible
            const justEliminated = eliminated && blinkEliminatedId === player.id;
            // R19: this player is battling the tie-break showdown
            const inShowdown = isInShowdown(player);
            const isLeader = !eliminated && sortedPlayers[0]?.id === player.id && sortedPlayers[0]?.score > 0;

            return (
              <div
                key={player.id}
                className={`
                  relative flex items-center gap-1.5 rounded-lg p-1.5 transition-all duration-500
                  ${justEliminated
                    ? 'bg-red-500/25 border-2 border-red-500 shadow-lg shadow-red-500/30'
                    : eliminated
                    ? 'bg-white/5 grayscale opacity-30 scale-90 pointer-events-none'
                    : inShowdown
                      ? 'bg-amber-500/20 border-2 border-amber-400 animate-pulse scale-105 shadow-lg shadow-amber-500/30'
                      : danger
                        ? 'bg-red-500/20 border-2 border-red-500 animate-pulse scale-105 shadow-lg shadow-red-500/30'
                        : lowest
                          ? 'bg-gradient-to-br from-red-500/15 to-pink-500/15 border border-red-500/40'
                          : 'bg-gradient-to-br from-white/10 to-white/5 border border-white/10'
                  }
                `}
                style={{ minWidth: '100px', flex: '1 1 120px', maxWidth: '180px' }}
              >
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  {player.avatar ? (
                    <img
                      src={player.avatar}
                      alt={player.name}
                      className={`rounded-full object-cover border-2 ${
                        inShowdown ? 'border-amber-400' : lowest ? 'border-red-400' : eliminated ? 'border-white/10' : 'border-white/20'
                      }`}
                      style={{ width: '32px', height: '32px' }}
                    />
                  ) : (
                    <div
                      className={`rounded-full flex items-center justify-center text-white font-bold border-2 ${
                        inShowdown ? 'border-amber-400' : lowest ? 'border-red-400' : eliminated ? 'border-white/10' : 'border-white/20'
                      }`}
                      style={{
                        width: '32px',
                        height: '32px',
                        backgroundColor: eliminated ? '#444' : player.color,
                        fontSize: '13px',
                      }}
                    >
                      {player.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-black/60 flex items-center justify-center"
                    style={{ fontSize: '8px' }}>
                    {player.playerType === 'microphone' ? '🎤' : '📱'}
                  </div>
                  {/* R19: showdown contender indicator */}
                  {inShowdown && (
                    <div className="absolute -top-1 -left-1 text-[10px] animate-bounce">⚔️</div>
                  )}
                </div>

                {/* Name + Score column */}
                <div className="flex flex-col min-w-0 flex-1">
                  {/* Name */}
                  <div className={`text-[10px] font-medium truncate ${
                    inShowdown ? 'text-amber-200' : eliminated ? 'text-white/30' : 'text-white/80'
                  }`}>
                    {player.name}
                  </div>

                  {/* Score (R19: round points — every round starts at 0) */}
                  <div className="flex items-center gap-0.5">
                    <div className={`font-bold text-xs ${
                      eliminated
                        ? 'text-white/20'
                        : inShowdown
                          ? 'text-amber-300'
                          : lowest
                            ? 'text-red-300'
                            : 'text-white'
                    }`}
                    style={isLeader ? { textShadow: '0 0 10px rgba(250,204,21,0.5)' } : undefined}
                    >
                      <AnimatedNumber value={player.score} />
                      {isLeader && <span className="ml-0.5 text-yellow-400 text-[9px]">👑</span>}
                    </div>
                  </div>

                  {/* Bottom info row */}
                  <div className="flex items-center gap-1">
                    {/* Combo indicator */}
                    {!eliminated && player.currentCombo > 2 && (
                      <span className="text-[8px] text-amber-400">
                        🔥{player.currentCombo}
                      </span>
                    )}

                    {/* Multi-pitch: per-player mic singing indicator */}
                    {!eliminated && player.playerType === 'microphone' && activeMicPlayers.length >= 2 && (() => {
                      const pp = playerPitchMap.get(player.id);
                      const hasError = multiPitchErrors.has(player.id);
                      if (hasError) return <span className="text-[8px] text-red-400">{t('battleRoyale.micError')}</span>;
                      if (pp && pp.isSinging && pp.note != null) return <span className="text-[8px] text-green-400">🎤●</span>;
                      if (pp && pp.volume > 0.01) return <span className="text-[8px] text-yellow-400">🎤○</span>;
                      return <span className="text-[8px] text-white/20">🎤</span>;
                    })()}
                  </div>
                </div>

                {/* Eliminated overlay — 6.4: blinking red X right after the
                    elimination (brElimBlink keyframes, 6 × 0.45s), static
                    faded X afterwards. */}
                {eliminated && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div
                      className={justEliminated
                        ? 'text-3xl font-black text-red-500 drop-shadow-[0_0_12px_rgba(239,68,68,0.9)]'
                        : 'text-xl text-red-500/60'}
                      style={justEliminated ? { animation: 'brElimBlink 0.45s ease-in-out 6' } : undefined}
                      aria-label={justEliminated ? `${player.name}: Eliminated` : undefined}
                    >
                      ✕
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ─────────── 3. NOTE HIGHWAY (flex-1, majority of space) ─────────── */}
      {showNoteHighway && (
        <div className="flex-1 min-h-0 px-3">
          <NoteHighway
            visibleNotes={visibleNotes}
            currentTime={currentTime}
            pitchStats={pitchStats ?? { minPitch: 48, maxPitch: 72, pitchRange: 24 }}
            singLinePosition={SING_LINE_POSITION}
            noteWindow={NOTE_WINDOW}
            visibleTop={VISIBLE_TOP}
            visibleRange={VISIBLE_RANGE}
            // Ghost notes (user request): per-player strips / single-player
            // performance pipeline — wrong-pitch misses render as ghost bars
            // at the sung pitch (per-player colour), hits fill the strips.
            // Flat fill only as long as no samples exist at all.
            playerStrips={stripsActive ? playerStrips : undefined}
            playerNames={stripsActive ? activePlayers.map(p => ({ id: p.id, name: p.name })) : undefined}
            notePerformance={soloStrip ? soloStrip.performance : undefined}
            playerColor={soloStrip ? soloStrip.color : undefined}
            flatNoteFill={!stripsActive && !soloStrip ? '#22d3ee' : undefined}
          />
        </div>
      )}

      {/* If highway is hidden, this spacer pushes lyrics down */}
      {!showNoteHighway && <div className="flex-1" />}

      {/* ─────────── Unified bottom HUD: round countdown + snippet timer (bottom-left, above the progress bar) + playtime/duration (bottom-right, ONE LINE) ─────────── */}
      <div className="absolute bottom-2 left-3 z-30 pointer-events-none flex items-center gap-2">
        {/* Round/song countdown — bottom-left (unified HUD spec, Muster F).
            R16: hidden when it would duplicate the prominent top elimination
            countdown (medley rounds — round timer IS the elimination clock;
            showdown — the ⚔️ countdown owns the display, round timer is 0). */}
        {!elimFromRoundTimer && !showdownActive && (
          <Badge
            className={`font-mono text-xs ${
              roundTimeLeft <= 5
                ? 'bg-red-500 text-white animate-pulse'
                : roundTimeLeft <= 10
                  ? 'bg-orange-500/25 text-orange-300 border border-orange-400/40'
                  : 'bg-purple-500/20 text-purple-400'
            }`}
            aria-label={t('battleRoyale.timeLeft').replace('{n}', String(roundTimeLeft))}
          >
            {roundTimeLeft}s
          </Badge>
        )}
        {/* #1 Medley snippet indicator — bottom-left (unified HUD spec) */}
        {totalSnippets > 1 && (
          <Badge variant="outline" className="border-purple-500 text-purple-400 text-[10px] px-1.5 py-0 bg-black/40">
            🎵 {currentSnippetIndex + 1}/{totalSnippets}
            {snippetTimeLeft !== null && ` (${snippetTimeLeft}s)`}
          </Badge>
        )}
        {/* 2.2-R3 / R16: the elimination countdown moved to the prominent
            top-center display (br-elim-countdown) — no duplicate badge here. */}
      </div>
      {/* B3.5: playtime/duration — single line, right-aligned, no wrapping */}
      <div className="absolute bottom-2 right-3 z-30 pointer-events-none whitespace-nowrap text-right">
        <TimeDisplay currentTime={currentTime} duration={currentSong?.duration ?? 0} inline />
      </div>

      {/* ─────────── 4. LYRICS (bottom) — BR-style background, lifted above the bottom-corner time displays (B3.6) ─────────── */}
      {/* Item 8: pb-7 (was pb-3) — lifts the lyrics bar slightly UP, clear of
          the bottom-corner time displays; badges + lyrics now sit closer
          together around the note highway. */}
      {/* 6.3: FIXED height reservation — the note highway is a flex-1 sibling,
          so a lyrics band that grows/shrinks (1 line vs. current+next preview,
          fallbacks during instrumental pauses) resized the Tonleiter on every
          change and made it visibly jump up/down. The card now always occupies
          the same height (fits current line + next-line preview) with the
          content vertically centered — the highway geometry stays constant. */}
      {/* R15 (user request 1.2): during LONG instrumental pauses the block now
          FADES OUT completely (opacity-0) instead of showing stale text —
          it fades back in ~3s before the next vocal phrase. The fixed height
          is kept so the note highway geometry never jumps. */}
      {currentSong ? (
        <div
          data-testid="br-lyrics-block"
          className={`flex-shrink-0 px-4 pb-7 transition-opacity duration-300 ${
            currentLyricLine || !(currentSong.lyrics && currentSong.lyrics.length > 0)
              ? 'opacity-100'
              : 'opacity-0'
          }`}
          aria-hidden={!currentLyricLine && !!(currentSong.lyrics && currentSong.lyrics.length > 0)}
        >
          <div className="w-full h-[72px] bg-black/40 backdrop-blur-sm rounded-xl px-4 py-2 border border-white/10 flex flex-col items-center justify-center">
            {currentLyricLine ? (
              <div className="text-center">
                <LyricLineDisplay
                  line={currentLyricLine}
                  currentTime={currentTime}
                  playerColor="#22d3ee"
                  lyricsSize="small"
                />
                {nextLyricLine && (
                  <p className="text-white/30 text-xs mt-1 text-center">
                    {nextLyricLine.notes.map(n => n.lyric).join('')}
                  </p>
                )}
              </div>
            ) : currentSong.lyrics && currentSong.lyrics.length > 0 ? (
              /* Long pause — block is faded out via opacity-0 (nothing to show). */
              <span className="sr-only">&nbsp;</span>
            ) : (
              <p className="text-white/30 text-center text-sm">{t('battleRoyale.loadingLyrics')}</p>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-shrink-0 px-4 pb-7">
          <div className="w-full h-[72px] bg-black/30 rounded-xl px-4 py-2 border border-white/10 text-center flex items-center justify-center">
            <p className="text-white/30 text-sm">{t('battleRoyale.loadingSong')}</p>
          </div>
        </div>
      )}

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
