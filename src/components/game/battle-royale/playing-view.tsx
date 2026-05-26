'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle } from 'lucide-react';
import { PauseButton } from '@/components/game/hud/pause-button';
import { FullscreenButton } from '@/components/game/hud/fullscreen-button';
import { NoteHighway } from '@/components/game/note-highway';
import { GameBackground } from '@/components/game/game-background';
import { GameCountdown } from '@/components/game/game-countdown';
import { Song, Note, LyricLine, PitchDetectionResult } from '@/types/game';
import { PitchStats } from '@/lib/game/note-utils';
import { VISIBLE_TOP, VISIBLE_RANGE, SING_LINE_POSITION, NOTE_WINDOW } from '@/lib/game/note-utils';
import {
  BattleRoyaleGame,
  BattleRoyalePlayer,
  getCurrentMedleySnippet,
} from '@/lib/game/battle-royale';
import { LyricLineDisplay } from '@/components/game/lyric-line-display';
import { usePartyStore } from '@/lib/game/party-store';
import { useTranslation } from '@/lib/i18n/translations';

// ===================== Inline AnimatedNumber =====================

/** Lightweight animated number counter — counts from previous to current over 500ms */
function AnimatedNumber({ value, className }: { value: number; className?: string }) {
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
}

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
  setCurrentTime: (_time: number) => void;
  onRoundEnd: () => void;
  previousRoundScores: Record<string, number>;
  bountyPlayerId: string | null;
  bountyMultiplier: number;
  // New props
  pitchStats: PitchStats | null;
  visibleNotes: Array<Note & { lineIndex: number; line: LyricLine }>;
  detectedPitch: number | null;
  songProgress: number;
  countdown: number;
  // Multi-pitch detection
  playerPitchMap: Map<string, PitchDetectionResult | null>;
  multiPitchErrors: Map<string, string>;
  notePerformance?: Map<string, Array<{ time: number; accuracy: number; hit: boolean }>>;
  eliminationPhase?: null | 'eliminating' | 'survivor-flash';
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
  setCurrentTime,
  onRoundEnd,
  previousRoundScores,
  bountyPlayerId,
  bountyMultiplier,
  pitchStats,
  visibleNotes,
  detectedPitch,
  songProgress,
  countdown,
  playerPitchMap,
  multiPitchErrors,
  notePerformance,
  eliminationPhase,
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

  // Audio fade-out in last 3 seconds of round
  useEffect(() => {
    if (roundTimeLeft > 3 || roundTimeLeft === 0 || game.status !== 'playing') {
      // Reset volume when not in fade zone
      if (audioRef.current && audioRef.current.volume < 1) {
        audioRef.current.volume = 1;
      }
      return;
    }
    const volume = roundTimeLeft / 3;
    if (audioRef.current) {
      audioRef.current.volume = Math.max(0, volume);
    }
  }, [roundTimeLeft, game.status, audioRef]);

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

  // #9 Trend: Calculate score deltas from previous round
  const scoreDeltas = useMemo(() => {
    const deltas: Record<string, number> = {};
    for (const player of game.players) {
      const prev = previousRoundScores[player.id] ?? 0;
      deltas[player.id] = player.score - prev;
    }
    return deltas;
  }, [game.players, previousRoundScores]);

  // Rank change calculation for trend arrows
  const prevRanks = useMemo(() => {
    const entries = Object.entries(previousRoundScores);
    if (entries.length === 0) return {};
    const sorted = [...entries].sort((a, b) => b[1] - a[1]);
    const ranks: Record<string, number> = {};
    sorted.forEach(([id], i) => { ranks[id] = i + 1; });
    return ranks;
  }, [previousRoundScores]);

  const currentRanks = useMemo(() => {
    const sorted = [...game.players].sort((a, b) => {
      if (a.eliminated && !b.eliminated) return 1;
      if (!a.eliminated && b.eliminated) return -1;
      return b.score - a.score;
    });
    const ranks: Record<string, number> = {};
    sorted.forEach((p, i) => { ranks[p.id] = i + 1; });
    return ranks;
  }, [game.players]);

  // Danger zone detection
  const activeSorted = sortedPlayers.filter(p => !p.eliminated);
  const dangerZone = activeSorted.length > 3 ? activeSorted.slice(-3) : activeSorted;
  const isDangerZone = roundTimeLeft <= 5 && roundTimeLeft > 0;

  const isDanger = useCallback((player: BattleRoyalePlayer) =>
    isDangerZone && !player.eliminated && dangerZone.some(d => d.id === player.id),
    [isDangerZone, dangerZone]
  );

  const isLowest = (player: BattleRoyalePlayer) =>
    !player.eliminated && activeSorted.length > 0 && activeSorted[activeSorted.length - 1].id === player.id;

  // #10 Elimination camera: dramatic effects in last 10 seconds
  const eliminationAnimationEnabled = game.settings.eliminationAnimation;
  const isEliminationCamera = eliminationAnimationEnabled && roundTimeLeft <= 10 && roundTimeLeft > 0;

  // Standard lyrics display: find current and next lyric lines using LyricLineDisplay
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
    // No active line: show next upcoming line within 2s preview window
    for (let i = 0; i < lyrics.length; i++) {
      if (currentTime < lyrics[i].startTime && lyrics[i].startTime - currentTime < 2000) {
        return {
          currentLyricLine: lyrics[i],
          nextLyricLine: i < lyrics.length - 1 ? lyrics[i + 1] : null,
        };
      }
    }
    return { currentLyricLine: null, nextLyricLine: null };
  }, [currentSong, currentTime]);

  // V5: Multi-pitch mic status — count players whose pitch detector is initialized
  const activeMicPlayers = activePlayers.filter(p => p.playerType === 'microphone');
  // Count mic players that have been initialized (present in pitch map) without errors.
  // This reflects the number of working mics, not just those currently singing.
  // Per-player singing indicators on the cards already show real-time singing status.
  const activePitchCount = activeMicPlayers.filter(p =>
    playerPitchMap.has(p.id) && !multiPitchErrors.has(p.id)
  ).length;
  const hasPitchErrors = multiPitchErrors.size > 0;

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

      {/* #10 Elimination Camera: Red vignette overlay in last 10 seconds */}
      {isEliminationCamera && (
        <div className="absolute inset-0 pointer-events-none z-30 transition-opacity duration-1000"
          style={{
            background: `radial-gradient(ellipse at center, transparent 40%, rgba(220, 38, 38, ${0.3 * (1 - roundTimeLeft / 10)}) 100%)`,
          }}
        />
      )}

      {/* #10 Elimination Camera: Pulsing border in last 5 seconds */}
      {eliminationAnimationEnabled && isDangerZone && (
        <div className="absolute inset-0 border-4 border-red-500/0 animate-elimination-pulse pointer-events-none z-30" />
      )}

      {/* ─────────── Pause + Fullscreen ─────────── */}
      <div className="absolute top-3 left-3 z-20 pointer-events-auto">
        <PauseButton
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
        />
      </div>
      <div className="absolute top-3 right-3 z-20 pointer-events-auto">
        <FullscreenButton />
      </div>

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

      {/* ─────────── Pause Overlay ─────────── */}
      {pauseDialogAction === 'song-pause' && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md">
          <div className="text-center animate-in fade-in duration-300">
            <div className="text-8xl mb-4">⏸</div>
            <h2 className="text-3xl font-bold text-white/90">PAUSED</h2>
          </div>
        </div>
      )}

      {/* ─────────── V3: Countdown Overlay ─────────── */}
      {countdown > 0 && <GameCountdown countdown={countdown} />}

      {/* V3: "GO!" / "LOS!" overlay when countdown finishes */}
      {showGoOverlay && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-30 pointer-events-none">
          <div
            className="text-8xl font-black text-white drop-shadow-2xl"
            style={{ animation: 'countdownPop 0.3s ease-out' }}
          >
            {game.isGrandFinale ? 'LOS!' : 'GO!'}
          </div>
        </div>
      )}

      {/* ─────────── V5: Multi-Pitch Mic Status ─────────── */}
      {activeMicPlayers.length >= 2 && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
          <div className={`flex items-center gap-1.5 rounded-full px-3 py-1 backdrop-blur-sm ${
            hasPitchErrors
              ? 'bg-amber-500/20 border border-amber-500/40'
              : 'bg-green-500/20 border border-green-500/40'
          }`}>
            {hasPitchErrors ? (
              <AlertTriangle className="w-3 h-3 text-amber-400" />
            ) : (
              <span className="text-[10px] text-green-400">●</span>
            )}
            <span className={`text-[10px] font-medium whitespace-nowrap ${
              hasPitchErrors ? 'text-amber-300' : 'text-green-300'
            }`}>
              {activePitchCount}/{activeMicPlayers.length} {t('battleRoyale.multiPitchActive')}
            </span>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          LAYOUT (top to bottom):
          1. Timer bar + round info (~40px)
          2. Player cards strip (scrollable horizontal, ~60px)
          3. Note Highway (flex-1, majority of space)
          4. Song progress bar (2px)
          5. Lyrics (bottom, ~80px)
      ══════════════════════════════════════════════════════════ */}

      {/* ─────────── 1. TIMER BAR + ROUND INFO ─────────── */}
      <div className="flex-shrink-0 px-3 pt-3 pb-1">
        <div className="flex items-center justify-between mb-1.5 pl-16 pr-14">
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-bold">
              {game.isGrandFinale
                ? `🏆 ${t('battleRoyale.grandFinaleRound').replace('{n}', String(game.currentRound))}`
                : t('battleRoyale.round').replace('{n}', String(game.currentRound))
              }
            </h1>
            <span className="text-[11px] text-white/40 truncate max-w-[120px] sm:max-w-[200px]">
              {currentSnippet?.songName ?? currentRound?.songName ?? '...'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {/* #1 Medley snippet indicator */}
            {totalSnippets > 1 && (
              <Badge variant="outline" className="border-purple-500 text-purple-400 text-[10px] px-1.5 py-0">
                🎵 {currentSnippetIndex + 1}/{totalSnippets}
                {snippetTimeLeft !== null && ` (${snippetTimeLeft}s)`}
              </Badge>
            )}
            <Badge variant="outline" className="border-red-500 text-red-400 text-[10px] px-1.5 py-0">
              {t('battleRoyale.playersLeft').replace('{n}', String(activePlayers.length))}
            </Badge>
            <Badge className={`font-mono text-sm ${roundTimeLeft <= 5 ? 'bg-red-500 text-white animate-pulse' : 'bg-purple-500/20 text-purple-400'}`}>
              {roundTimeLeft}s
            </Badge>
          </div>
        </div>

        {/* Timer Progress Bar */}
        <Progress
          value={(roundTimeLeft / (currentRound?.duration || 60)) * 100}
          className="h-1.5 bg-white/10"
        />

        {/* #1 Medley: Snippet progress bar */}
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
      <div className="flex-shrink-0 px-3 pb-1 overflow-y-auto max-h-[140px]">
        <div className="flex flex-wrap gap-1.5">
          {sortedPlayers.map((player) => {
            const danger = isDanger(player);
            const lowest = isLowest(player);
            const eliminated = player.eliminated;
            const isBounty = bountyPlayerId === player.id;
            const isLeader = !eliminated && sortedPlayers[0]?.id === player.id && sortedPlayers[0]?.score > 0;

            // #9 Trend arrow
            const prevRank = prevRanks[player.id];
            const curRank = currentRanks[player.id];
            const delta = scoreDeltas[player.id] ?? 0;
            let trendArrow: string | null = null;
            let trendColor = 'text-white/40';
            if (prevRank !== undefined && curRank !== undefined && !eliminated) {
              if (curRank < prevRank) { trendArrow = '▲'; trendColor = 'text-green-400'; }
              else if (curRank > prevRank) { trendArrow = '▼'; trendColor = 'text-red-400'; }
              else { trendArrow = '●'; trendColor = 'text-white/40'; }
            }

            return (
              <div
                key={player.id}
                className={`
                  relative flex items-center gap-1.5 rounded-lg p-1.5 transition-all duration-500
                  ${eliminated
                    ? 'bg-white/5 grayscale opacity-30 scale-90 pointer-events-none'
                    : danger
                      ? 'bg-red-500/20 border-2 border-red-500 animate-pulse scale-105 shadow-lg shadow-red-500/30'
                      : lowest
                        ? 'bg-gradient-to-br from-red-500/15 to-pink-500/15 border border-red-500/40'
                        : isBounty
                          ? 'bg-gradient-to-br from-amber-500/20 to-yellow-500/20 border-2 border-amber-500/60 shadow-lg shadow-amber-500/20'
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
                        isBounty ? 'border-amber-400' : lowest ? 'border-red-400' : eliminated ? 'border-white/10' : 'border-white/20'
                      }`}
                      style={{ width: '32px', height: '32px' }}
                    />
                  ) : (
                    <div
                      className={`rounded-full flex items-center justify-center text-white font-bold border-2 ${
                        isBounty ? 'border-amber-400' : lowest ? 'border-red-400' : eliminated ? 'border-white/10' : 'border-white/20'
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
                  {/* #6 Bounty target indicator */}
                  {isBounty && !eliminated && (
                    <div className="absolute -top-1 -left-1 text-[10px] animate-bounce">🎯</div>
                  )}
                </div>

                {/* Name + Score column */}
                <div className="flex flex-col min-w-0 flex-1">
                  {/* Name */}
                  <div className={`text-[10px] font-medium truncate ${
                    eliminated ? 'text-white/30' : 'text-white/80'
                  }`}>
                    {player.name}
                  </div>

                  {/* Score + #9 Trend arrow */}
                  <div className="flex items-center gap-0.5">
                    <div className={`font-bold text-xs ${
                      eliminated
                        ? 'text-white/20'
                        : lowest
                          ? 'text-red-300'
                          : 'text-white'
                    }`}
                    style={isLeader && !isBounty ? { textShadow: '0 0 10px rgba(250,204,21,0.5)' } : undefined}
                    >
                      <AnimatedNumber value={player.score} />
                      {isLeader && !isBounty && <span className="ml-0.5 text-yellow-400 text-[9px]">👑</span>}
                    </div>
                    {/* #9 Trend arrow */}
                    {trendArrow && (
                      <span className={`text-[9px] font-bold ${trendColor}`} style={{ marginTop: '-2px' }}>
                        {trendArrow}
                      </span>
                    )}
                  </div>

                  {/* Bottom info row */}
                  <div className="flex items-center gap-1">
                    {/* #9 Score delta this round */}
                    {delta > 0 && !eliminated && (
                      <span className="text-[8px] text-green-400">+{delta.toLocaleString()}</span>
                    )}

                    {/* #6 Bounty multiplier indicator */}
                    {isBounty && !eliminated && (
                      <span className="text-[8px] text-amber-400">🎯 BOUNTY</span>
                    )}
                    {!isBounty && !eliminated && bountyPlayerId && (
                      <span className="text-[8px] text-amber-400/60">×{bountyMultiplier}</span>
                    )}

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
                      if (hasError) return <span className="text-[8px] text-red-400">⚠ Mic</span>;
                      if (pp && pp.isSinging && pp.note != null) return <span className="text-[8px] text-green-400">🎤●</span>;
                      if (pp && pp.volume > 0.01) return <span className="text-[8px] text-yellow-400">🎤○</span>;
                      return <span className="text-[8px] text-white/20">🎤</span>;
                    })()}
                  </div>
                </div>

                {/* Eliminated overlay */}
                {eliminated && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-xl text-red-500/60">✕</div>
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
            detectedPitch={detectedPitch}
            noteShapeStyle={game.settings.noteShapeStyle}
            noteDisplayStyle={game.settings.noteDisplayStyle}
            singLinePosition={SING_LINE_POSITION}
            noteWindow={NOTE_WINDOW}
            visibleTop={VISIBLE_TOP}
            visibleRange={VISIBLE_RANGE}
            notePerformance={notePerformance}
          />
        </div>
      )}

      {/* If highway is hidden, this spacer pushes lyrics down */}
      {!showNoteHighway && <div className="flex-1" />}

      {/* ─────────── 4. SONG PROGRESS BAR (2px) ─────────── */}
      {currentSong && songProgress > 0 && (
        <div className="flex-shrink-0 w-full h-[2px] bg-white/5">
          <div
            className="h-full transition-all duration-300"
            style={{
              width: `${Math.min(100, Math.max(0, songProgress * 100))}%`,
              background: 'linear-gradient(90deg, #06b6d4, #a855f7)',
            }}
          />
        </div>
      )}

      {/* ─────────── 5. LYRICS (bottom) — uses standard LyricLineDisplay ─────────── */}
      <div className="flex-shrink-0 px-4 pb-4 min-h-0">
        {currentSong ? (
          <div className="w-full bg-black/40 backdrop-blur-sm rounded-xl px-4 py-2 border border-white/10">
            {currentLyricLine ? (
              <div className="text-center">
                <LyricLineDisplay
                  line={currentLyricLine}
                  currentTime={currentTime}
                  playerColor="#22d3ee"
                  noteDisplayStyle={game.settings.noteDisplayStyle || 'classic'}
                  notePerformance={notePerformance}
                  lyricsSize="small"
                />
                {nextLyricLine && (
                  <p className="text-white/30 text-xs mt-1 text-center">
                    {nextLyricLine.notes.map(n => n.lyric).join('')}
                  </p>
                )}
              </div>
            ) : currentSong.lyrics && currentSong.lyrics.length > 0 ? (
              <p className="text-white/40 text-center text-sm">
                {currentSong.lyrics[0].notes.map(n => n.lyric).join('')}
              </p>
            ) : (
              <p className="text-white/30 text-center text-sm">{t('battleRoyale.loadingLyrics')}</p>
            )}
          </div>
        ) : (
          <div className="w-full bg-black/30 rounded-xl px-4 py-2 border border-white/10 text-center">
            <p className="text-white/30 text-sm">{t('battleRoyale.loadingSong')}</p>
          </div>
        )}
      </div>

      {/* Danger Warning Overlay */}
      {eliminationAnimationEnabled && isDangerZone && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-red-500/20 to-transparent pointer-events-none transition-opacity duration-500" />
      )}

      {/* #7 Difficulty indicator */}
      {game.settings.escalatingDifficulty && (
        <div className="absolute bottom-3 left-3 z-20 pointer-events-none">
          <Badge variant="outline" className="border-white/20 text-white/40 text-xs">
            {t('battleRoyale.difficulty').toLowerCase()}: {game.effectiveDifficulty.toUpperCase()}
          </Badge>
        </div>
      )}
    </div>
  );
}
