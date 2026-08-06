'use client';

import React, { useCallback } from 'react';
import type { GameState, MobileView } from '../mobile-types';
import { useTranslation } from '@/lib/i18n/translations';

// ===================== Props =====================

interface MirrorGameLiteProps {
  gameState: GameState;
  clientId: string | null;
  profileName: string;
  onNavigate: (v: MobileView) => void;
  onSendDesktopCommand: (screen: string) => void;
}

// ===================== Hilfsfunktionen =====================

function haptic() {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(10);
  }
}

// ===================== Component =====================

export const MirrorGameLite = React.memo<MirrorGameLiteProps>(
  function MirrorGameLite({ gameState, profileName, onSendDesktopCommand }) {
    const { t } = useTranslation();

    const handleCmd = useCallback(
      (cmd: string) => {
        haptic();
        onSendDesktopCommand(cmd);
      },
      [onSendDesktopCommand],
    );

    return (
      <div className="flex flex-col gap-4 px-4 pb-8">
        {/* Current song card */}
        {gameState.currentSong ? (
          <div
            className={
              'relative overflow-hidden rounded-xl p-4 ' +
              'bg-gradient-to-br from-cyan-500/20 via-purple-500/15 to-purple-600/20 ' +
              'border border-cyan-400/20'
            }
          >
            <div className="pointer-events-none absolute -inset-4 rounded-xl bg-gradient-to-br from-cyan-400/5 to-purple-500/5 blur-xl" />
            <div className="relative flex items-start gap-3">
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
                    ? t('mobile.mirrorNowPlaying')
                    : t('mobile.mirrorPaused')}
                </p>
                <p className="mt-1 truncate text-lg font-bold leading-tight text-white">
                  {gameState.currentSong.title}
                </p>
                <p className="mt-0.5 truncate text-sm text-white/60">
                  {gameState.currentSong.artist}
                </p>
              </div>
              {gameState.gameMode && (
                <span
                  className={
                    'shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ' +
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
            <p className="text-sm text-white/40">{t('mobile.mirrorNoSong')}</p>
          </div>
        )}

        {/* Playback Controls */}
        {gameState.currentSong && (
          <div className="flex gap-2">
            <button
              onClick={() => handleCmd('restart')}
              className={
                'flex-1 flex items-center justify-center gap-2 rounded-xl p-3 ' +
                'bg-white/5 border border-white/10 active:scale-95 transition-transform'
              }
            >
              <span className="text-base">⏮</span>
              <span className="text-xs font-medium text-white/70">{t('mobile.mirrorRestart') || 'Restart'}</span>
            </button>
            <button
              onClick={() => handleCmd(gameState.isPlaying ? 'pause' : 'play')}
              className={
                'flex-1 flex items-center justify-center gap-2 rounded-xl p-3 ' +
                (gameState.isPlaying
                  ? 'bg-yellow-500/15 border border-yellow-400/30 text-yellow-400'
                  : 'bg-green-500/15 border border-green-400/30 text-green-400') +
                ' active:scale-95 transition-transform'
              }
            >
              <span className="text-base">{gameState.isPlaying ? '⏸' : '▶'}</span>
              <span className="text-xs font-medium">{gameState.isPlaying ? (t('mobile.mirrorPause') || 'Pause') : (t('mobile.mirrorPlay') || 'Play')}</span>
            </button>
            <button
              onClick={() => handleCmd('skip')}
              className={
                'flex-1 flex items-center justify-center gap-2 rounded-xl p-3 ' +
                'bg-white/5 border border-white/10 active:scale-95 transition-transform'
              }
            >
              <span className="text-base">⏭</span>
              <span className="text-xs font-medium text-white/70">{t('mobile.mirrorSkip') || 'Skip'}</span>
            </button>
          </div>
        )}

        {/* Volume Controls */}
        {gameState.currentSong && (
          <div className="flex gap-2">
            <button
              onClick={() => handleCmd('volume_down')}
              className={
                'flex-1 flex items-center justify-center gap-2 rounded-xl p-3 ' +
                'bg-white/5 border border-white/10 active:scale-95 transition-transform'
              }
            >
              <span className="text-base">🔉</span>
              <span className="text-xs font-medium text-white/70">Vol -</span>
            </button>
            <button
              onClick={() => handleCmd('volume_up')}
              className={
                'flex-1 flex items-center justify-center gap-2 rounded-xl p-3 ' +
                'bg-white/5 border border-white/10 active:scale-95 transition-transform'
              }
            >
              <span className="text-base">🔊</span>
              <span className="text-xs font-medium text-white/70">Vol +</span>
            </button>
          </div>
        )}

        {/* Companion scores leaderboard */}
        {gameState.companionScores && gameState.companionScores.length > 0 && (
          <div className="flex flex-col gap-2 rounded-xl bg-white/5 border border-white/10 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-white/40">
              {t('mobile.mirrorLiveScores')}
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

        {/* Navigation Buttons */}
        <div className="grid grid-cols-2 gap-2.5">
          <button
            onClick={() => handleCmd('home')}
            className={
              'flex items-center justify-center gap-2 rounded-xl p-3 ' +
              'bg-white/5 border border-white/10 active:scale-95 transition-transform'
            }
          >
            <span className="text-base">🏠</span>
            <span className="text-xs font-medium text-white/70">{t('mobile.mirrorHome') || 'Home'}</span>
          </button>
          <button
            onClick={() => handleCmd('fullscreen')}
            className={
              'flex items-center justify-center gap-2 rounded-xl p-3 ' +
              'bg-white/5 border border-white/10 active:scale-95 transition-transform'
            }
          >
            <span className="text-base">🖥</span>
            <span className="text-xs font-medium text-white/70">{t('mobile.mirrorFullscreen') || 'Fullscreen'}</span>
          </button>
        </div>
      </div>
    );
  },
);
