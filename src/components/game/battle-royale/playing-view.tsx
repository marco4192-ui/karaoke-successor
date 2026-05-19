'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import { LyricsDisplay } from './lyrics-display';
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
}: PlayingViewProps) {
  const { t } = useTranslation();
  const currentRound = game.rounds[game.rounds.length - 1];
  const audioStartedRef = React.useRef(false);
  const setIsSongPlaying = usePartyStore(s => s.setIsSongPlaying);
  const pauseDialogAction = usePartyStore(s => s.pauseDialogAction);
  const setPauseDialogAction = usePartyStore(s => s.setPauseDialogAction);

  const currentSnippet = getCurrentMedleySnippet(game);

  // V6: Round-end scoreboard state
  const [showScoreboard, setShowScoreboard] = useState(false);
  const scoreboardTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // V3: "GO!" overlay state
  const [showGoOverlay, setShowGoOverlay] = useState(false);

  // Report song playing status
  useEffect(() => {
    setIsSongPlaying(true);
    return () => { setIsSongPlaying(false); };
  }, [setIsSongPlaying]);

  // Pause / Resume
  useEffect(() => {
    if (pauseDialogAction === 'song-pause') {
      if (audioRef.current && !audioRef.current.paused) {
        audioRef.current.pause();
      }
    } else if (pauseDialogAction === null) {
      if (audioRef.current && audioRef.current.paused && game.status === 'playing' && audioStartedRef.current) {
        audioRef.current.play().catch(() => {});
      }
    }
  }, [pauseDialogAction, game.status, audioRef]);

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

  // V6: Show scoreboard when round timer hits 0
  useEffect(() => {
    if (roundTimeLeft === 0 && game.status === 'playing' && !showScoreboard) {
      // Use queueMicrotask to avoid synchronous setState in effect
      queueMicrotask(() => setShowScoreboard(true));
      scoreboardTimeoutRef.current = setTimeout(() => {
        setShowScoreboard(false);
      }, 3000);
    }
    return () => {
      if (scoreboardTimeoutRef.current) {
        clearTimeout(scoreboardTimeoutRef.current);
      }
    };
  }, [roundTimeLeft, game.status, showScoreboard]);

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

  // V5: Multi-pitch mic status — count players with active pitch detection
  const activeMicPlayers = activePlayers.filter(p => p.playerType === 'microphone');
  const activePitchCount = activeMicPlayers.filter(p => {
    const pitch = playerPitchMap.get(p.id);
    return pitch && pitch.isSinging !== false;
  }).length;
  const hasPitchErrors = multiPitchErrors.size > 0;

  // V1: Note highway visibility
  const showNoteHighway = game.settings.showNoteHighway && pitchStats !== null && visibleNotes.length > 0;

  return (
    <div className={`h-screen flex flex-col relative overflow-hidden ${isEliminationCamera ? 'elimination-camera-active' : ''}`}>
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
      <div className="fixed inset-0 -z-10">
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
      <div className="fixed inset-0 bg-black/30 -z-[5] pointer-events-none" />

      {/* #10 Elimination Camera: Red vignette overlay in last 10 seconds */}
      {isEliminationCamera && (
        <div className="fixed inset-0 pointer-events-none z-30 transition-opacity duration-1000"
          style={{
            background: `radial-gradient(ellipse at center, transparent 40%, rgba(220, 38, 38, ${0.3 * (1 - roundTimeLeft / 10)}) 100%)`,
          }}
        />
      )}

      {/* #10 Elimination Camera: Pulsing border in last 5 seconds */}
      {eliminationAnimationEnabled && isDangerZone && (
        <div className="fixed inset-0 border-4 border-red-500/0 animate-elimination-pulse pointer-events-none z-30" />
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

      {/* ─────────── V3: Countdown Overlay ─────────── */}
      {countdown > 0 && <GameCountdown countdown={countdown} />}

      {/* V3: "GO!" / "LOS!" overlay when countdown finishes */}
      {showGoOverlay && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-30 pointer-events-none">
          <div
            className="text-8xl font-black text-white drop-shadow-2xl"
            style={{ animation: 'countdownPop 0.3s ease-out' }}
          >
            {t('battleRoyale.grandFinaleRound') ? 'LOS!' : 'GO!'}
          </div>
        </div>
      )}

      {/* ─────────── V5: Multi-Pitch Mic Status ─────────── */}
      {activeMicPlayers.length >= 2 && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
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
        <div className="flex items-center justify-between mb-1.5 pl-16 pr-2">
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

      {/* ─────────── 2. PLAYER CARDS STRIP (horizontal scrollable) ─────────── */}
      <div className="flex-shrink-0 px-3 pb-1 overflow-x-auto">
        <div className="flex gap-1.5 min-w-max">
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
                style={{
                  minWidth: `${Math.max(120, Math.min(160, 1200 / Math.max(activePlayers.length, 4)))}px`,
                }}
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

      {/* ─────────── 5. LYRICS (bottom, ~80px) ─────────── */}
      <div className="flex-shrink-0 px-4 pb-4 min-h-0 max-h-[80px]">
        {currentSong ? (
          <div className="w-full bg-black/40 backdrop-blur-sm rounded-xl px-4 py-2 border border-white/10">
            {currentSong.lyrics && currentSong.lyrics.length > 0 ? (
              <LyricsDisplay
                lyrics={currentSong.lyrics}
                currentTime={currentTime}
              />
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

      {/* ─────────── V6: Round End Scoreboard ─────────── */}
      {showScoreboard && roundTimeLeft === 0 && game.status === 'playing' && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-black/80 border border-white/20 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl">
            <h2 className="text-center text-white/60 text-sm font-medium mb-4 uppercase tracking-wider">
              {t('battleRoyale.round')} {game.currentRound}
            </h2>
            <div className="space-y-2">
              {[...activePlayers]
                .sort((a, b) => b.score - a.score)
                .map((player, index) => {
                  const delta = scoreDeltas[player.id] ?? 0;
                  return (
                    <div
                      key={player.id}
                      className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-white/5"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`text-sm font-bold w-5 text-center ${
                          index === 0 ? 'text-yellow-400' : index === 1 ? 'text-gray-300' : 'text-amber-600'
                        }`}>
                          {index + 1}
                        </span>
                        {player.avatar ? (
                          <img src={player.avatar} alt={player.name} className="w-6 h-6 rounded-full object-cover" />
                        ) : (
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                            style={{ backgroundColor: player.color }}
                          >
                            {player.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span className="text-sm text-white font-medium truncate">{player.name}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`text-xs font-bold ${delta > 0 ? 'text-green-400' : 'text-white/40'}`}>
                          {delta > 0 ? '+' : ''}{delta.toLocaleString()}
                        </span>
                        <span className="text-sm text-white font-bold">{player.score.toLocaleString()}</span>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* ─────────── Eliminate Button ─────────── */}
      {roundTimeLeft === 0 && game.status === 'playing' && !showScoreboard && (
        <div className="flex-shrink-0 pb-4 text-center">
          <Button
            onClick={onRoundEnd}
            className="px-12 py-4 text-xl bg-gradient-to-r from-red-500 to-pink-500 animate-pulse"
          >
            {t('battleRoyale.eliminateLowest')}
          </Button>
        </div>
      )}

      {/* Danger Warning Overlay */}
      {eliminationAnimationEnabled && isDangerZone && (
        <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-red-500/20 to-transparent pointer-events-none transition-opacity duration-500" />
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
