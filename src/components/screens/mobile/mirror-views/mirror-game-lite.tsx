'use client';

import React from 'react';
import type { GameState, MobileView } from '../mobile-types';
import { useTranslation } from '@/lib/i18n/translations';

// ===================== Props =====================

interface MirrorGameLiteProps {
  gameState: GameState;
  clientId: string | null;
  profileName: string;
  onNavigate: (v: MobileView) => void;
}

// ===================== Component =====================

export const MirrorGameLite = React.memo<MirrorGameLiteProps>(
  function MirrorGameLite({ gameState, profileName }) {
    const { t } = useTranslation();

    return (
      <div className="flex flex-col gap-4 px-4 pb-8">
        {/* Current song card */}
        {gameState.currentSong ? (
          <div
            className={
              'relative overflow-hidden rounded-xl p-5 ' +
              'bg-gradient-to-br from-cyan-500/20 via-purple-500/15 to-purple-600/20 ' +
              'border border-cyan-400/20'
            }
          >
            {/* Subtle glow overlay */}
            <div className="pointer-events-none absolute -inset-4 rounded-xl bg-gradient-to-br from-cyan-400/5 to-purple-500/5 blur-xl" />

            <div className="relative flex items-start gap-3">
              {/* Pulsing indicator when playing */}
              {gameState.isPlaying && (
                <span className="mt-2 flex h-3 w-3 shrink-0">
                  <span className="absolute inline-flex h-3 w-3 animate-ping rounded-full bg-cyan-400 opacity-75" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-cyan-400" />
                </span>
              )}
              {!gameState.isPlaying && gameState.currentSong && (
                <span className="mt-2 flex h-3 w-3 shrink-0 rounded-full bg-yellow-400" />
              )}

              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium uppercase tracking-wider text-white/40">
                  {gameState.isPlaying
                    ? (t('mobile.mirrorNowPlaying') || 'Now Playing')
                    : (t('mobile.mirrorPaused') || 'Paused')}
                </p>
                <p className="mt-1 truncate text-xl font-bold leading-tight text-white">
                  {gameState.currentSong.title}
                </p>
                <p className="mt-0.5 truncate text-base text-white/60">
                  {gameState.currentSong.artist}
                </p>
              </div>

              {/* Game mode badge */}
              {gameState.gameMode && (
                <span
                  className={
                    'shrink-0 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider ' +
                    'bg-purple-500/25 text-purple-300 border border-purple-400/20'
                  }
                >
                  {gameState.gameMode}
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center rounded-xl bg-white/5 border border-white/10 p-8">
            <p className="text-sm text-white/40">
              {t('mobile.mirrorNoSong') || 'No song playing'}
            </p>
          </div>
        )}

        {/* Score placeholder area */}
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl bg-white/5 border border-white/10 p-6">
          <span className="text-3xl">🎤</span>
          <p className="text-sm font-medium text-white/60">
            {t('mobile.mirrorScoreComingSoon') || 'Live scoring coming soon'}
          </p>
          <p className="text-xs text-white/30">
            {t('mobile.mirrorScoreHint') || 'Your score will appear here during the song'}
          </p>
        </div>

        {/* Companion scores leaderboard (if available) */}
        {gameState.companionScores && gameState.companionScores.length > 0 && (
          <div className="flex flex-col gap-2 rounded-xl bg-white/5 border border-white/10 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-white/40">
              {t('mobile.mirrorLiveScores') || 'Live Scores'}
            </p>
            {gameState.companionScores.map((entry) => (
              <div key={entry.profileId} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block h-3 w-3 rounded-full"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-sm text-white/80">{entry.name}</span>
                </div>
                <span className="text-sm font-semibold tabular-nums text-white">
                  {entry.score.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  },
);
