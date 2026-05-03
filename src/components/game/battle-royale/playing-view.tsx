'use client';

import React, { useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Song } from '@/types/game';
import { BattleRoyaleGame, BattleRoyalePlayer, getBattleRoyaleStats } from '@/lib/game/battle-royale';
import { LyricsDisplay } from './lyrics-display';
import { usePartyStore } from '@/lib/game/party-store';

interface PlayingViewProps {
  game: BattleRoyaleGame;
  stats: ReturnType<typeof getBattleRoyaleStats>;
  sortedPlayers: BattleRoyalePlayer[];
  activePlayers: BattleRoyalePlayer[];
  currentSong: Song | null;
  currentTime: number;
  roundTimeLeft: number;
  roundDuration: number;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  setCurrentTime: (time: number) => void;
  onRoundEnd: () => void;
  onBack?: () => void;
}

export function PlayingView({
  game,
  stats,
  sortedPlayers,
  activePlayers,
  currentSong,
  currentTime,
  roundTimeLeft,
  roundDuration,
  audioRef,
  videoRef,
  setCurrentTime,
  onRoundEnd,
  onBack,
}: PlayingViewProps) {
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
  }, [pauseDialogAction, game.status]);

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
          console.error('[BattleRoyale] Audio error:', e);
        }}
        className="hidden"
        preload="auto"
      />

      {/* Video Background — always rendered so the hook can set src dynamically */}
      <video
        ref={videoRef}
        className="fixed inset-0 w-full h-full object-cover -z-10"
        style={{ opacity: 0.4 }}
        muted
        playsInline
        loop
        preload="auto"
      />
      <div className="fixed inset-0 bg-black/50 -z-10" />

      {/* ─────────── Pause Button ─────────── */}
      <div className="absolute top-3 left-3 z-20">
        <Button
          variant="ghost"
          onClick={() => {
            // Pause audio immediately
            if (audioRef.current && !audioRef.current.paused) {
              audioRef.current.pause();
            }
            // Trigger the song-pause dialog in page.tsx
            setPauseDialogAction('song-pause');
          }}
          className="text-white/60 hover:text-white hover:bg-white/10"
        >
          ⏸ Pause
        </Button>
      </div>

      {/* ─────────── UPPER THIRD: Player Cards ─────────── */}
      <div className="flex-shrink-0 pt-3 px-3">
        {/* Round Info Bar — offset left to avoid overlapping Back button */}
        <div className="flex items-center justify-between mb-3 pl-16 pr-2">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold">Round {game.currentRound}</h1>
            <span className="text-sm text-white/50">{currentRound?.songName || '...'}</span>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="border-red-500 text-red-400">
              {activePlayers.length} Left
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

                {/* Score */}
                <div className={`w-full px-1 py-0.5 rounded text-center font-bold text-sm ${
                  eliminated
                    ? 'text-white/20'
                    : lowest
                      ? 'text-red-300'
                      : 'text-white'
                }`}>
                  {player.score.toLocaleString()}
                </div>

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
              <p className="text-white/30 text-center text-lg">Loading lyrics...</p>
            )}
          </div>
        ) : (
          <div className="w-full bg-black/30 rounded-xl p-4 border border-white/10 text-center">
            <p className="text-white/30 text-lg">Loading song...</p>
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
            💔 Eliminate Lowest Scorer
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
