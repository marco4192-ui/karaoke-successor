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
  /** Send a navigation command to the desktop */
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

    const handleDesktopNav = useCallback(
      (screen: string) => {
        haptic();
        onSendDesktopCommand(screen);
      },
      [onSendDesktopCommand],
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
          <div
            className={
              'flex items-center justify-center rounded-xl p-6 ' +
              'bg-white/5 border border-white/10'
            }
          >
            <p className="text-sm text-white/40">{t('mobile.mirrorNoSong')}</p>
          </div>
        )}

        {/* ===== 2. Remote Control Lock ===== */}
        {!isRemoteLocked ? (
          <button
            onClick={handleAcquireRemote}
            className={
              'w-full rounded-xl p-3 text-center text-sm font-semibold ' +
              'bg-cyan-500/15 border border-cyan-400/30 text-cyan-400 ' +
              'active:scale-[0.97] transition-transform'
            }
          >
            {t('mobile.mirrorAcquireRemote')}
          </button>
        ) : remoteLockedBy ? (
          <div
            className={
              'flex items-center justify-between rounded-xl p-3 ' +
              'bg-white/5 border border-white/10'
            }
          >
            <span className="text-sm text-white/60">
              {t('mobile.mirrorRemoteActive')}
            </span>
            <button
              onClick={handleReleaseRemote}
              className={
                'rounded-lg px-3 py-1.5 text-xs font-medium ' +
                'bg-white/10 text-white/70 active:scale-95 transition-transform'
              }
            >
              {t('mobile.mirrorReleaseControl')}
            </button>
          </div>
        ) : (
          <div
            className={
              'flex items-center justify-center rounded-xl p-3 ' +
              'bg-white/5 border border-white/10'
            }
          >
            <span className="text-sm text-white/40">
              {t('mobile.mirrorRemoteLockedBy').replace('{name}', remoteLockedBy || '')}
            </span>
          </div>
        )}

        {/* ===== 3. Queue Preview ===== */}
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
                    <p className="truncate text-sm font-medium text-white">{item.songTitle}</p>
                    <p className="truncate text-xs text-white/40">{item.songArtist}</p>
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

        {/* ===== 4. Navigation Grid – Alle Menüpunkte ===== */}
        <div className="grid grid-cols-3 gap-2.5">
          <NavButton
            icon="🎵"
            label={t('mobile.mirrorSongs')}
            color="cyan"
            onPress={() => handleDesktopNav('library')}
          />
          <NavButton
            icon="🎉"
            label={t('mobile.mirrorPartyMode')}
            color="pink"
            onPress={() => handleDesktopNav('party')}
          />
          <NavButton
            icon="📋"
            label={t('mobile.mirrorQueue')}
            color="purple"
            onPress={() => handleDesktopNav('queue')}
          />
          <NavButton
            icon="🏆"
            label={t('mobile.mirrorHighscores')}
            color="yellow"
            onPress={() => handleDesktopNav('highscores')}
          />
          <NavButton
            icon="📅"
            label={t('mobile.mirrorDailyChallenge')}
            color="orange"
            onPress={() => handleDesktopNav('dailyChallenge')}
          />
          <NavButton
            icon="🏅"
            label={t('mobile.mirrorAchievements')}
            color="green"
            onPress={() => handleDesktopNav('achievements')}
          />
          <NavButton
            icon="📻"
            label={t('mobile.mirrorJukebox')}
            color="teal"
            onPress={() => handleDesktopNav('jukebox')}
          />
          <NavButton
            icon="⚙️"
            label={t('mobile.mirrorSettings')}
            color="gray"
            onPress={() => handleDesktopNav('settings')}
          />
          <NavButton
            icon="👤"
            label={t('mobile.mirrorProfile')}
            color="indigo"
            onPress={() => handleDesktopNav('profile')}
          />
        </div>

        {/* ===== 5. Companion-Exklusiv ===== */}
        <div className="grid grid-cols-2 gap-2.5">
          <button
            onClick={() => handleNavigate('mic')}
            className={
              'flex items-center justify-center gap-2 rounded-xl p-3.5 ' +
              'bg-emerald-500/10 border border-emerald-400/20 active:scale-95 transition-transform'
            }
          >
            <span className="text-lg">🎤</span>
            <span className="text-sm font-medium text-emerald-400">{t('mobile.mirrorSing')}</span>
          </button>
          <button
            onClick={onOpenChat}
            className={
              'flex items-center justify-center gap-2 rounded-xl p-3.5 ' +
              'bg-white/5 border border-white/10 active:scale-95 transition-transform'
            }
          >
            <span className="text-lg">💬</span>
            <span className="text-sm font-medium text-white/70">{t('mobile.mirrorChat')}</span>
          </button>
        </div>
      </div>
    );
  },
);

// ===================== Nav Button Sub-Komponente =====================

const COLOR_MAP: Record<string, string> = {
  cyan:   'bg-cyan-500/10 border-cyan-400/20 text-cyan-400',
  pink:   'bg-pink-500/10 border-pink-400/20 text-pink-400',
  purple: 'bg-purple-500/10 border-purple-400/20 text-purple-400',
  yellow: 'bg-yellow-500/10 border-yellow-400/20 text-yellow-400',
  orange: 'bg-orange-500/10 border-orange-400/20 text-orange-400',
  green:  'bg-green-500/10 border-green-400/20 text-green-400',
  teal:   'bg-teal-500/10 border-teal-400/20 text-teal-400',
  gray:   'bg-white/5 border-white/10 text-white/70',
  indigo: 'bg-indigo-500/10 border-indigo-400/20 text-indigo-400',
};

interface NavButtonProps {
  icon: string;
  label: string;
  color: string;
  onPress: () => void;
}

const NavButton = React.memo<NavButtonProps>(function NavButton({ icon, label, color, onPress }) {
  return (
    <button
      onClick={onPress}
      className={
        'flex flex-col items-center justify-center gap-1.5 rounded-xl p-3 ' +
        'border active:scale-95 transition-transform ' +
        (COLOR_MAP[color] || COLOR_MAP.gray)
      }
    >
      <span className="text-xl leading-none">{icon}</span>
      <span className="text-[11px] font-medium leading-tight text-center">{label}</span>
    </button>
  );
});
