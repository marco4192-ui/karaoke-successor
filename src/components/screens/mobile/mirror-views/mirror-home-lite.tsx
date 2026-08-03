'use client';

import React, { useCallback } from 'react';
import type { GameState, QueueItem, MobileView } from '../mobile-types';
import { useTranslation } from '@/lib/i18n/translations';

// ===================== Props =====================

interface MirrorHomeLiteProps {
  clientId: string | null;
  profileName: string;
  gameState: GameState;
  queue: QueueItem[];
  onNavigate: (v: MobileView) => void;
  onOpenChat: () => void;
  isRemoteLocked: boolean;
  remoteLockedBy: string | null;
  onAcquireRemote: () => void;
  onReleaseRemote: () => void;
  /** Send a navigation command to the desktop (for screen mirroring) */
  onSendDesktopCommand: (screen: string) => void;
}

// ===================== Hilfsfunktionen =====================

/** Triggert haptisches Feedback, falls die Vibration API verfügbar ist. */
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
    onNavigate,
    onOpenChat,
    isRemoteLocked,
    remoteLockedBy,
    onAcquireRemote,
    onReleaseRemote,
    onSendDesktopCommand,
  }) {
    const { t } = useTranslation();

    const handleNavigate = useCallback(
      (view: MobileView) => {
        haptic();
        onNavigate(view);
      },
      [onNavigate],
    );

    const handleAcquireRemote = useCallback(() => {
      haptic();
      onAcquireRemote();
    }, [onAcquireRemote]);

    const handleReleaseRemote = useCallback(() => {
      haptic();
      onReleaseRemote();
    }, [onReleaseRemote]);

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
            {/* Subtle glow overlay */}
            <div className="pointer-events-none absolute -inset-4 rounded-xl bg-gradient-to-br from-cyan-400/5 to-purple-500/5 blur-xl" />

            <div className="relative flex items-start gap-3">
              {/* Pulsing dot when playing */}
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
              {/* Game mode badge */}
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
          <div
            className={
              'flex items-center justify-center rounded-xl p-6 ' +
              'bg-white/5 border border-white/10'
            }
          >
            <p className="text-sm text-white/40">{t('mobile.mirrorQueueEmpty') || 'Kein Song aktiv'}</p>
          </div>
        )}

        {/* ===== 2. Remote Control Lock Banner ===== */}
        {!isRemoteLocked ? (
          /* Niemand hat die Steuerung – großen Button anzeigen */
          <button
            onClick={handleAcquireRemote}
            className={
              'w-full rounded-xl p-3.5 text-center font-semibold ' +
              'bg-cyan-500/15 border border-cyan-400/30 text-cyan-400 ' +
              'active:scale-[0.97] transition-transform'
            }
          >
            {t('mobile.mirrorAcquireRemote') || 'Steuerung übernehmen'}
          </button>
        ) : remoteLockedBy ? (
          /* Jemand hat die Steuerung */
          <div
            className={
              'flex items-center justify-between rounded-xl p-3.5 ' +
              'bg-white/5 border border-white/10'
            }
          >
            <span className="text-sm text-white/60">
              {t('mobile.mirrorRemoteActive') || 'Steuerung aktiv'}
            </span>
            <button
              onClick={handleReleaseRemote}
              className={
                'rounded-lg px-3 py-1.5 text-xs font-medium ' +
                'bg-white/10 text-white/70 active:scale-95 transition-transform'
              }
            >
              Freigeben
            </button>
          </div>
        ) : (
          /* Jemand anderes hat die Steuerung */
          <div
            className={
              'flex items-center justify-center rounded-xl p-3.5 ' +
              'bg-white/5 border border-white/10'
            }
          >
            <span className="text-sm text-white/40">
              {t('mobile.mirrorRemoteLockedBy') || `Steuerung von ${remoteLockedBy}`}
            </span>
          </div>
        )}

        {/* ===== 3. Quick Stats Row ===== */}
        <div className="grid grid-cols-3 gap-2.5">
          {/* Queue count */}
          <button
            onClick={() => { haptic(); onSendDesktopCommand('queue'); }}
            className={
              'flex flex-col items-center gap-1 rounded-xl p-3 ' +
              'bg-white/5 border border-white/10 active:scale-95 transition-transform'
            }
          >
            <span className="text-lg leading-none">📋</span>
            <span className="text-xs font-semibold tabular-nums text-white">
              {queue.length}
            </span>
            <span className="text-[10px] text-white/40">
              {t('mobile.mirrorQueue') || 'Warteschlange'}
            </span>
          </button>

          {/* Game mode */}
          <div
            className={
              'flex flex-col items-center gap-1 rounded-xl p-3 ' +
              'bg-white/5 border border-white/10'
            }
          >
            <span className="text-lg leading-none">🎮</span>
            <span className="text-xs font-semibold text-white">
              {gameState.gameMode || '–'}
            </span>
            <span className="text-[10px] text-white/40">
              {t('mobile.mirrorGameMode') || 'Spielmodus'}
            </span>
          </div>

          {/* Chat */}
          <button
            onClick={onOpenChat}
            className={
              'flex flex-col items-center gap-1 rounded-xl p-3 ' +
              'bg-white/5 border border-white/10 active:scale-95 transition-transform'
            }
          >
            <span className="text-lg leading-none">💬</span>
            <span className="text-xs font-semibold text-white">Chat</span>
            <span className="text-[10px] text-white/40">
              {t('mobile.mirrorChat') || 'Chat'}
            </span>
          </button>
        </div>

        {/* ===== 4. Queue Preview ===== */}
        {previewQueue.length > 0 && (
          <div>
            <div className="mb-2 flex items-center justify-between px-1">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-white/40">
                {t('mobile.mirrorQueue') || 'Als Nächstes'}
              </h3>
              <button
                onClick={() => { haptic(); onSendDesktopCommand('queue'); }}
                className="text-xs font-medium text-cyan-400/80 active:opacity-70 transition-opacity"
              >
                Alle anzeigen →
              </button>
            </div>

            <div className="flex flex-col gap-2">
              {previewQueue.map((item, idx) => (
                <button
                  key={item.id}
                  onClick={() => { haptic(); onSendDesktopCommand('queue'); }}
                  className={
                    'flex items-center gap-3 rounded-xl p-3 text-left ' +
                    'bg-white/5 border border-white/10 ' +
                    'active:scale-[0.98] transition-transform'
                  }
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-[10px] font-bold text-white/60">
                    {idx + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">
                      {item.songTitle}
                    </p>
                    <p className="truncate text-xs text-white/40">
                      {item.songArtist}
                    </p>
                  </div>
                  {item.gameMode && (
                    <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase text-purple-300/80 bg-purple-500/20">
                      {item.gameMode}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ===== 5. Action Grid ===== */}
        <div className="grid grid-cols-2 gap-3">
          <ActionButton
            icon="🎤"
            label={t('mobile.mirrorSing') || 'Singen'}
            onPress={() => handleNavigate('mic')}
          />
          <ActionButton
            icon="🎵"
            label={t('mobile.mirrorSongs') || 'Lieder'}
            onPress={() => handleNavigate('songs')}
          />
          <ActionButton
            icon="📋"
            label={t('mobile.mirrorQueue') || 'Warteschlange'}
            onPress={() => { haptic(); onSendDesktopCommand('queue'); }}
          />
          <ActionButton
            icon="📻"
            label={t('mobile.mirrorJukebox') || 'Jukebox'}
            onPress={() => { haptic(); onSendDesktopCommand('jukebox'); }}
          />
        </div>
      </div>
    );
  },
);

// ===================== Action Button Sub-Komponente =====================

interface ActionButtonProps {
  icon: string;
  label: string;
  onPress: () => void;
}

const ActionButton = React.memo<ActionButtonProps>(function ActionButton({
  icon,
  label,
  onPress,
}) {
  return (
    <button
      onClick={onPress}
      className={
        'flex flex-col items-center justify-center gap-2 rounded-xl p-4 ' +
        'bg-white/5 border border-white/10 ' +
        'active:scale-95 transition-transform'
      }
    >
      <span className="text-2xl leading-none">{icon}</span>
      <span className="text-xs font-medium text-white/80">{label}</span>
    </button>
  );
});
