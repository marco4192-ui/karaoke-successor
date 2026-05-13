'use client';

import React, { useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { PauseButton } from '@/components/game/hud/pause-button';
import { FullscreenButton } from '@/components/game/hud/fullscreen-button';
import { Song } from '@/types/game';
import { BattleRoyaleGame, BattleRoyalePlayer } from '@/lib/game/battle-royale';
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
  audioRef: React.RefObject<HTMLAudioElement | null>;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  setCurrentTime: (_time: number) => void;
  onRoundEnd: () => void;
}

export function PlayingView({
  game,
  sortedPlayers,
  activePlayers,
  currentSong,
  currentTime,
  roundTimeLeft,
  audioRef,
  videoRef,
  setCurrentTime,
  onRoundEnd,
}: PlayingViewProps) {
  const { t } = useTranslation();
  const currentRound = game.rounds[game.rounds.length - 1];
  // Guard: only allow onEnded to fire if audio actually started playing
  const audioStartedRef = React.useRef(false);
  // H7: Use individual selectors to avoid re-renders on unrelated party state changes
  const setIsSongPlaying = usePartyStore(s => s.setIsSongPlaying);
  const pauseDialogAction = usePartyStore(s => s.pauseDialogAction);
  const setPauseDialogAction = usePartyStore(s => s.setPauseDialogAction);

  // ── Report song playing status to page.tsx for Escape handler ──
  useEffect(() => {
    setIsSongPlaying(true);
    return () => { setIsSongPlaying(false); };
  }, [setIsSongPlaying]);

  // ── Pause / Resume when page.tsx shows/hides the song-pause dialog ──
  useEffect(() => {
    if (pauseDialogAction === 'song-pause') {
      // Pause audio
      if (audioRef.current && !audioRef.current.paused) {
        audioRef.current.pause();
      }
    } else if (pauseDialogAction === null) {
      // Resume audio (only if it was paused and we're still in playing state)
      if (audioRef.current && audioRef.current.paused && game.status === 'playing' && audioStartedRef.current) {
        audioRef.current.play().catch(() => {});
      }
    }
  }, [pauseDialogAction, game.status, audioRef]);

  // Determine the 3 lowest active players for danger pulsing (Fix 2f)
  const activeSorted = sortedPlayers.filter(p => !p.eliminated);
  const dangerZone = activeSorted.length > 3 ? activeSorted.slice(-3) : activeSorted;
  const isDangerZone = roundTimeLeft <= 5 && roundTimeLeft > 0;

  // Check if a player is in danger (bottom 3 when ≤5 seconds remain)
  const isDanger = (player: BattleRoyalePlayer) =>
    isDangerZone && !player.eliminated && dangerZone.some(d => d.id === player.id);

  // Check if a player is the lowest scorer (about to be eliminated)
  // sortedPlayers is sorted descending (highest first) by getPlayersByScore,
  // so the lowest active player is the last element of activeSorted.
  const isLowest = (player: BattleRoyalePlayer) =>
    !player.eliminated && activeSorted.length > 0 && activeSorted[activeSorted.length - 1].id === player.id;

  return (
    <div className="h-screen flex flex-col relative overflow-hidden">
      {/* Hidden Audio Element — always rendered so the hook can set src dynamically */}
      <audio
        ref={audioRef}
        onTimeUpdate={(e) => {
          setCurrentTime(e.currentTarget.currentTime * 1000);
          audioStartedRef.current = true; // Mark as playing once we receive time updates
        }}
        onEnded={() => {
          // Only trigger round end if audio actually played (prevents false triggers)
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

      {/* Video Background — always rendered so the hook can set src dynamically */}
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

      {/* ─────────── Pause + Fullscreen (universal HUD) ─────────── */}
      <div className="absolute top-3 left-3 z-20 pointer-events-auto">
        <PauseButton
          isPlaying={game.status === 'playing' && pauseDialogAction !== 'song-pause'}
          onTogglePause={() => {
            if (pauseDialogAction === 'song-pause') {
              // Currently paused → resume
              setPauseDialogAction(null);
            } else {
              // Currently playing → pause
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
        {/* Round Info Bar — offset left to avoid overlapping Back button */}
        <div className="flex items-center justify-between mb-3 pl-16 pr-2">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold">{t('battleRoyale.round').replace('{n}', String(game.currentRound))}</h1>
            <span className="text-sm text-white/50">{currentRound?.songName || '...'}</span>
          </div>
          <div className="flex items-center gap-3">
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

        {/* ── Player Cards Grid ── */}
        <div className="flex flex-wrap gap-2 justify-center">
          {sortedPlayers.map((player) => {
            const danger = isDanger(player);
            const lowest = isLowest(player);
            const eliminated = player.eliminated;

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
                        lowest ? 'border-red-400' : eliminated ? 'border-white/10' : 'border-white/20'
                      }`}
                      style={{ width: '40px', height: '40px' }}
                    />
                  ) : (
                    <div
                      className={`rounded-full flex items-center justify-center text-white font-bold border-2 ${
                        lowest ? 'border-red-400' : eliminated ? 'border-white/10' : 'border-white/20'
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
                  {/* Player type badge */}
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-black/60 flex items-center justify-center"
                    style={{ fontSize: '10px' }}>
                    {player.playerType === 'microphone' ? '🎤' : '📱'}
                  </div>
                </div>

                {/* Name */}
                <div className={`text-[11px] font-medium text-center truncate w-full ${
                  eliminated ? 'text-white/30' : 'text-white/80'
                }`}>
                  {player.name}
                </div>

                {/* Score — leader gets a glow */}
                {(() => {
                  const isLeader = !eliminated && sortedPlayers[0]?.id === player.id && sortedPlayers[0]?.score > 0;
                  return (
                    <div className={`w-full px-1 py-0.5 rounded text-center font-bold text-sm ${
                      eliminated
                        ? 'text-white/20'
                        : lowest
                          ? 'text-red-300'
                          : 'text-white'
                    }`}
                    style={isLeader ? { textShadow: '0 0 10px rgba(250,204,21,0.5)' } : undefined}
                    >
                      {player.score.toLocaleString()}
                      {isLeader && <span className="ml-1 text-yellow-400 text-[10px]">👑</span>}
                    </div>
                  );
                })()}

                {/* Combo indicator for active players */}
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
              // Collect all notes from all lyric lines
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

      {/* ─────────── Danger Warning Overlay (5 seconds before elimination) ─────────── */}
      {isDangerZone && (
        <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-red-500/20 to-transparent pointer-events-none transition-opacity duration-500" />
      )}
    </div>
  );
}
