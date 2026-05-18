'use client';

import React, { useEffect, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { PauseButton } from '@/components/game/hud/pause-button';
import { FullscreenButton } from '@/components/game/hud/fullscreen-button';
import { Song } from '@/types/game';
import {
  BattleRoyaleGame,
  BattleRoyalePlayer,
  getCurrentMedleySnippet,
} from '@/lib/game/battle-royale';
import { LyricsDisplay } from './lyrics-display';
import { usePartyStore } from '@/lib/game/party-store';
import { useTranslation } from '@/lib/i18n/translations';

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
}: PlayingViewProps) {
  const { t } = useTranslation();
  const currentRound = game.rounds[game.rounds.length - 1];
  const audioStartedRef = React.useRef(false);
  const setIsSongPlaying = usePartyStore(s => s.setIsSongPlaying);
  const pauseDialogAction = usePartyStore(s => s.pauseDialogAction);
  const setPauseDialogAction = usePartyStore(s => s.setPauseDialogAction);

  const currentSnippet = getCurrentMedleySnippet(game);

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

  const isDanger = (player: BattleRoyalePlayer) =>
    isDangerZone && !player.eliminated && dangerZone.some(d => d.id === player.id);

  const isLowest = (player: BattleRoyalePlayer) =>
    !player.eliminated && activeSorted.length > 0 && activeSorted[activeSorted.length - 1].id === player.id;

  // #10 Elimination camera: dramatic effects in last 10 seconds
  const isEliminationCamera = roundTimeLeft <= 10 && roundTimeLeft > 0;

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

      {/* Video Background */}
      <video
        ref={videoRef}
        className="fixed inset-0 w-full h-full object-cover -z-10"
        style={{ opacity: 0.7 }}
        muted
        playsInline
        loop
        preload="auto"
      />
      <div className="fixed inset-0 bg-black/30 -z-10" />

      {/* #10 Elimination Camera: Red vignette overlay in last 10 seconds */}
      {isEliminationCamera && (
        <div className="fixed inset-0 pointer-events-none z-30 transition-opacity duration-1000"
          style={{
            background: `radial-gradient(ellipse at center, transparent 40%, rgba(220, 38, 38, ${0.3 * (1 - roundTimeLeft / 10)}) 100%)`,
          }}
        />
      )}

      {/* #10 Elimination Camera: Pulsing border in last 5 seconds */}
      {isDangerZone && (
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

      {/* ─────────── UPPER THIRD: Player Cards ─────────── */}
      <div className="flex-shrink-0 pt-3 px-3">
        {/* Round Info Bar */}
        <div className="flex items-center justify-between mb-3 pl-16 pr-2">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold">
              {game.isGrandFinale
                ? `🏆 ${t('battleRoyale.grandFinaleRound').replace('{n}', String(game.currentRound))}`
                : t('battleRoyale.round').replace('{n}', String(game.currentRound))
              }
            </h1>
            <span className="text-sm text-white/50">
              {currentSnippet?.songName ?? currentRound?.songName ?? '...'}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {/* #1 Medley snippet indicator */}
            {totalSnippets > 1 && (
              <Badge variant="outline" className="border-purple-500 text-purple-400 text-xs">
                🎵 {currentSnippetIndex + 1}/{totalSnippets}
                {snippetTimeLeft !== null && ` (${snippetTimeLeft}s)`}
              </Badge>
            )}
            <Badge variant="outline" className="border-red-500 text-red-400">
              {t('battleRoyale.playersLeft').replace('{n}', String(activePlayers.length))}
            </Badge>
            <Badge className={`font-mono text-base ${roundTimeLeft <= 5 ? 'bg-red-500 text-white animate-pulse' : 'bg-purple-500/20 text-purple-400'}`}>
              {roundTimeLeft}s
            </Badge>
          </div>
        </div>

        {/* Timer Progress Bar */}
        <Progress
          value={(roundTimeLeft / (currentRound?.duration || 60)) * 100}
          className="h-2 bg-white/10 mb-3"
        />

        {/* #1 Medley: Snippet progress bar */}
        {totalSnippets > 1 && snippetTimeLeft !== null && currentSnippet && (
          <div className="flex gap-1 mb-3">
            {game.medleySnippetList.map((_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full transition-all ${
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

        {/* ── Player Cards Grid ── */}
        <div className="flex flex-wrap gap-2 justify-center">
          {sortedPlayers.map((player) => {
            const danger = isDanger(player);
            const lowest = isLowest(player);
            const eliminated = player.eliminated;
            const isBounty = bountyPlayerId === player.id; // #6
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
                  relative flex flex-col items-center rounded-xl p-2 transition-all duration-500
                  ${eliminated
                    ? 'bg-white/5 grayscale opacity-30 scale-75 pointer-events-none'
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
                  width: `${Math.max(70, Math.min(110, 1000 / Math.max(activePlayers.length, 4)))}px`,
                }}
              >
                {/* Avatar */}
                <div className="relative mb-1">
                  {player.avatar ? (
                    <img
                      src={player.avatar}
                      alt={player.name}
                      className={`rounded-full object-cover border-2 ${
                        isBounty ? 'border-amber-400' : lowest ? 'border-red-400' : eliminated ? 'border-white/10' : 'border-white/20'
                      }`}
                      style={{ width: '40px', height: '40px' }}
                    />
                  ) : (
                    <div
                      className={`rounded-full flex items-center justify-center text-white font-bold border-2 ${
                        isBounty ? 'border-amber-400' : lowest ? 'border-red-400' : eliminated ? 'border-white/10' : 'border-white/20'
                      }`}
                      style={{
                        width: '40px',
                        height: '40px',
                        backgroundColor: eliminated ? '#444' : player.color,
                        fontSize: '16px',
                      }}
                    >
                      {player.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-black/60 flex items-center justify-center"
                    style={{ fontSize: '10px' }}>
                    {player.playerType === 'microphone' ? '🎤' : '📱'}
                  </div>
                  {/* #6 Bounty target indicator */}
                  {isBounty && !eliminated && (
                    <div className="absolute -top-1 -left-1 text-sm animate-bounce">🎯</div>
                  )}
                </div>

                {/* Name */}
                <div className={`text-[11px] font-medium text-center truncate w-full ${
                  eliminated ? 'text-white/30' : 'text-white/80'
                }`}>
                  {player.name}
                </div>

                {/* Score + #9 Trend arrow */}
                <div className="flex items-center gap-0.5">
                  <div className={`w-full px-1 py-0.5 rounded text-center font-bold text-sm ${
                    eliminated
                      ? 'text-white/20'
                      : lowest
                        ? 'text-red-300'
                        : 'text-white'
                  }`}
                  style={isLeader && !isBounty ? { textShadow: '0 0 10px rgba(250,204,21,0.5)' } : undefined}
                  >
                    {player.score.toLocaleString()}
                    {isLeader && !isBounty && <span className="ml-1 text-yellow-400 text-[10px]">👑</span>}
                  </div>
                  {/* #9 Trend arrow */}
                  {trendArrow && (
                    <span className={`text-[10px] font-bold ${trendColor}`} style={{ marginTop: '-2px' }}>
                      {trendArrow}
                    </span>
                  )}
                </div>

                {/* #9 Score delta this round */}
                {delta > 0 && !eliminated && (
                  <div className="text-[8px] text-green-400">+{delta.toLocaleString()}</div>
                )}

                {/* #6 Bounty multiplier indicator */}
                {isBounty && !eliminated && (
                  <div className="text-[8px] text-amber-400">🎯 BOUNTY</div>
                )}
                {!isBounty && !eliminated && bountyPlayerId && (
                  <div className="text-[8px] text-amber-400/60">×{bountyMultiplier}</div>
                )}

                {/* Combo indicator */}
                {!eliminated && player.currentCombo > 2 && (
                  <div className="text-[9px] text-amber-400">
                    🔥{player.currentCombo}
                  </div>
                )}

                {/* Eliminated overlay */}
                {eliminated && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-2xl text-red-500/60">✕</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ─────────── NOTE HIGHWAY ─────────── */}
      {currentSong?.lyrics && currentSong.lyrics.length > 0 && (
        <div className="flex-shrink-0 px-3 pb-1">
          <div className="w-full max-w-2xl mx-auto bg-black/20 rounded-lg p-1 overflow-hidden h-20 flex items-end">
            {(() => {
              const allNotes: Array<{ startTime: number; duration: number; pitch: number; isGolden: boolean }> = [];
              for (const line of currentSong.lyrics) {
                for (const note of line.notes) {
                  allNotes.push(note);
                }
              }
              if (allNotes.length === 0) return null;
              allNotes.sort((a, b) => a.startTime - b.startTime);
              const lastNote = allNotes[allNotes.length - 1];
              const totalDuration = (lastNote.startTime + lastNote.duration) - allNotes[0].startTime;
              if (totalDuration <= 0) return null;
              const firstNoteStart = allNotes[0].startTime;

              return (
                <div className="flex gap-0.5 w-full">
                  {allNotes.map((note, i) => {
                    const isActive = currentTime >= note.startTime && currentTime <= note.startTime + note.duration;
                    const isPast = currentTime > note.startTime + note.duration;
                    const isUpcoming = !isPast && currentTime >= note.startTime - 3000;
                    const relStart = ((note.startTime - firstNoteStart) / totalDuration) * 100;
                    const width = Math.max(1.5, (note.duration / totalDuration) * 100);
                    const height = 15 + (note.pitch % 36) * 1.2;

                    return (
                      <div
                        key={`${note.startTime}-${i}`}
                        className={`flex-shrink-0 rounded-sm transition-all ${isActive ? 'opacity-100 scale-105' : isPast ? 'opacity-20' : isUpcoming ? 'opacity-60' : 'opacity-30'}`}
                        style={{
                          height: `${height}px`,
                          width: `${width}%`,
                          backgroundColor: isActive
                            ? (note.isGolden ? '#fbbf24' : '#a855f7')
                            : isPast
                              ? (note.isGolden ? '#92400e' : '#581c87')
                              : (note.isGolden ? '#fbbf2430' : '#a855f730'),
                          marginLeft: i === 0 ? `${relStart}%` : '0',
                        }}
                      />
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ─────────── LOWER AREA: Lyrics ─────────── */}
      <div className="flex-1 flex items-end pb-4 px-4 min-h-0">
        {currentSong ? (
          <div className="w-full bg-black/40 backdrop-blur-sm rounded-xl p-4 border border-white/10">
            {currentSong.lyrics && currentSong.lyrics.length > 0 ? (
              <LyricsDisplay
                lyrics={currentSong.lyrics}
                currentTime={currentTime}
              />
            ) : (
              <p className="text-white/30 text-center text-lg">{t('battleRoyale.loadingLyrics')}</p>
            )}
          </div>
        ) : (
          <div className="w-full bg-black/30 rounded-xl p-4 border border-white/10 text-center">
            <p className="text-white/30 text-lg">{t('battleRoyale.loadingSong')}</p>
          </div>
        )}
      </div>

      {/* ─────────── Eliminate Button ─────────── */}
      {roundTimeLeft === 0 && game.status === 'playing' && (
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
      {isDangerZone && (
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
