'use client';

import React, { useCallback } from 'react';
import type { GameState, QueueItem } from '../mobile-types';
import { useTranslation } from '@/lib/i18n/translations';

// ===================== Props =====================

interface MirrorHomeLiteProps {
  gameState: GameState;
  queue: QueueItem[];
  onOpenChat: () => void;
  onSendDesktopCommand: (screen: string) => void;
}

// ===================== Hilfsfunktionen =====================

function haptic() {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(10);
  }
}

// ===================== Komponente =====================

export const MirrorHomeLite = React.memo<MirrorHomeLiteProps>(
  function MirrorHomeLite({
    gameState,
    queue,
    onOpenChat,
    onSendDesktopCommand,
  }) {
    const { t } = useTranslation();

    const handleDesktopNav = useCallback(
      (screen: string) => {
        haptic();
        onSendDesktopCommand(screen);
      },
      [onSendDesktopCommand],
    );

    const previewQueue = queue.filter((q) => q.status !== 'completed').slice(0, 3);

    return (
      <div className="flex flex-col gap-4 px-4 pb-8">
        {/* ===== 1. Now Playing ===== */}
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
                <span className="mt-1.5 flex h-2.5 w-2.5 shrink-0">
                  <span className="absolute inline-flex h-2.5 w-2.5 animate-ping rounded-full bg-cyan-400 opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-cyan-400" />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium uppercase tracking-wider text-white/40">
                  {t('mobile.mirrorNowPlaying')}
                </p>
                <p className="mt-1 truncate text-base font-semibold leading-tight text-white">
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
          <div className="flex items-center justify-center rounded-xl p-6 bg-white/5 border border-white/10">
            <p className="text-sm text-white/40">{t('mobile.mirrorNoSong')}</p>
          </div>
        )}

        {/* ===== 2. Queue Preview ===== */}
        {previewQueue.length > 0 && (
          <div>
            <div className="mb-2 flex items-center justify-between px-1">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-white/40">
                {t('mobileViews.upNext')} ({queue.filter(q => q.status !== 'completed').length})
              </h3>
              <button
                onClick={() => handleDesktopNav('queue')}
                className="text-xs font-medium text-cyan-400/80 active:opacity-70 transition-opacity"
              >
                {t('mobile.mirrorShowAll')} →
              </button>
            </div>
            <div className="flex flex-col gap-2">
              {previewQueue.map((item, idx) => (
                <button
                  key={item.id}
                  onClick={() => handleDesktopNav('queue')}
                  className="flex items-center gap-3 rounded-xl p-3 text-left bg-white/5 border border-white/10 active:scale-[0.98] transition-transform"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-[10px] font-bold text-white/60">{idx + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">{item.songTitle}</p>
                    <p className="truncate text-xs text-white/40">{item.songArtist}</p>
                  </div>
                  {item.gameMode && (
                    <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase text-purple-300/80 bg-purple-500/20">{item.gameMode}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ===== 3. Chat ===== */}
        <button
          onClick={onOpenChat}
          className="flex items-center justify-center gap-2 rounded-xl p-3.5 bg-white/5 border border-white/10 active:scale-95 transition-transform"
        >
          <span className="text-lg">💬</span>
          <span className="text-sm font-medium text-white/70">{t('mobile.mirrorChat')}</span>
        </button>
      </div>
    );
  },
);
