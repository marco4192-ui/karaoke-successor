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
  isRemoteLocked?: boolean;
  remoteLockedBy?: string | null;
  lockedByMe?: boolean;
  onAcquireRemote?: () => void;
  onReleaseRemote?: () => void;
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
    onSendDesktopCommand,
    isRemoteLocked,
    remoteLockedBy,
    lockedByMe,
    onAcquireRemote,
    onReleaseRemote,
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
      <div className="flex flex-col gap-3 px-4 pb-8 pt-2">
        {/* ===== Kein Song aktiv ===== */}
        {!gameState.currentSong && (
          <div className="flex items-center justify-center rounded-xl p-4 bg-white/5 border border-white/10">
            <p className="text-sm text-white/40">{t('mobile.mirrorNoSong')}</p>
          </div>
        )}

        {/* ===== Queue Preview ===== */}
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

        {previewQueue.length === 0 && gameState.currentSong && (
          <div className="text-center py-4">
            <p className="text-xs text-white/30">{t('mobile.mirrorQueueEmptyHint')}</p>
          </div>
        )}

        {/* ===== Remote-Kontrolle (Punkt 8) ===== */}
        <div className="flex flex-col gap-2 mt-2">
          {lockedByMe ? (
            <button
              onClick={() => { haptic(); onReleaseRemote?.(); }}
              className="w-full flex items-center justify-center gap-2.5 rounded-xl p-3.5 text-sm font-semibold bg-red-500/20 border border-red-400/30 text-red-400 active:scale-[0.97] transition-all"
            >
              <span className="text-base">{'🔓'}</span>
              <span>{t('companion.releaseControl') || t('remoteControl.releaseControl') || 'Release Control'}</span>
            </button>
          ) : isRemoteLocked ? (
            <button
              onClick={() => { haptic(); onAcquireRemote?.(); }}
              className="w-full flex items-center justify-center gap-2.5 rounded-xl p-3.5 text-sm font-semibold bg-amber-500/15 border border-amber-400/30 text-amber-400 active:scale-[0.97] transition-all"
            >
              <span className="text-base">{'🔓'}</span>
              <span>{t('companion.acquireControl') || t('remoteControl.acquireControl') || 'Take Control'}</span>
            </button>
          ) : (
            <button
              onClick={() => { haptic(); onAcquireRemote?.(); }}
              className="w-full flex items-center justify-center gap-2.5 rounded-xl p-3.5 text-sm font-semibold bg-amber-500/15 border border-amber-400/30 text-amber-400 active:scale-[0.97] transition-all"
            >
              <span className="text-base">{'🔒'}</span>
              <span>{t('companion.acquireControl') || t('remoteControl.acquireControl') || 'Take Control'}</span>
            </button>
          )}
        </div>
      </div>
    );
  },
);
