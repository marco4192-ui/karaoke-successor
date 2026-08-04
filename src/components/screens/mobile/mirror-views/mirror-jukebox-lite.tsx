'use client';

import React, { useCallback } from 'react';
import type { JukeboxWishlistItem, GameState, MobileView } from '../mobile-types';
import { useTranslation } from '@/lib/i18n/translations';

// ===================== Props =====================

interface MirrorJukeboxLiteProps {
  jukeboxWishlist: JukeboxWishlistItem[];
  onRemoveFromJukebox: (id: string) => void;
  onRefreshJukebox: () => void;
  gameState: GameState;
  onNavigate: (v: MobileView) => void;
  /** Sendet einen Command an den Desktop */
  onSendDesktopCommand: (command: string) => void;
}

// ===================== Hilfsfunktionen =====================

function haptic() {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(10);
  }
}

// ===================== Component =====================

export const MirrorJukeboxLite = React.memo<MirrorJukeboxLiteProps>(
  function MirrorJukeboxLite({ jukeboxWishlist, onRemoveFromJukebox, onSendDesktopCommand }) {
    const { t } = useTranslation();

    const handleRemove = useCallback(
      (id: string) => { onRemoveFromJukebox(id); },
      [onRemoveFromJukebox],
    );

    const handleCommand = useCallback(
      (cmd: string) => { haptic(); onSendDesktopCommand(cmd); },
      [onSendDesktopCommand],
    );

    return (
      <div className="flex flex-col gap-4 px-4 pb-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">
            {t('mobile.mirrorJukebox')}
          </h2>
          {jukeboxWishlist.length > 0 && (
            <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-medium text-white/60">
              {jukeboxWishlist.length} {jukeboxWishlist.length === 1 ? t('mobile.mirrorSong') : t('mobile.mirrorSongsplural')}
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => handleCommand('jukebox')}
            className={
              'flex-1 flex items-center justify-center gap-2 rounded-xl p-3 text-sm font-semibold ' +
              'bg-gradient-to-r from-cyan-500/25 to-purple-500/25 border border-cyan-400/30 text-white ' +
              'active:scale-[0.97] transition-transform'
            }
          >
            <span>{'📻'}</span>
            <span>{t('mobile.mirrorJukeboxStart')}</span>
          </button>
          {jukeboxWishlist.length > 0 && (
            <button
              onClick={() => handleCommand('jukebox_clear')}
              className={
                'flex items-center justify-center gap-2 rounded-xl p-3 px-4 text-sm font-medium ' +
                'bg-red-500/10 border border-red-500/30 text-red-400 ' +
                'active:scale-[0.97] transition-transform'
              }
            >
              <span>{'🗑'}</span>
            </button>
          )}
        </div>

        {/* Empty state */}
        {jukeboxWishlist.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl bg-white/5 border border-white/10 p-8">
            <span className="text-3xl">{'📻'}</span>
            <p className="text-sm text-white/40">
              {t('mobile.mirrorJukeboxEmpty')}
            </p>
            <p className="text-xs text-white/25">
              {t('mobile.mirrorJukeboxEmptyHint')}
            </p>
          </div>
        )}

        {/* Wishlist items */}
        <div className="flex flex-col gap-2">
          {jukeboxWishlist.map((item, index) => (
            <div
              key={item.id}
              className={
                'flex items-center gap-3 rounded-xl p-3 ' +
                'bg-white/5 border border-white/10'
              }
            >
              {/* Position */}
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-white/60">
                {index + 1}
              </span>

              {/* Song info */}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">
                  {item.songTitle}
                </p>
                <p className="truncate text-xs text-white/40">
                  {item.songArtist}
                </p>
              </div>

              {/* Remove button */}
              <button
                onClick={() => handleRemove(item.id)}
                className={
                  'shrink-0 rounded-lg px-2 py-1 text-xs font-medium ' +
                  'bg-red-500/15 text-red-400/80 ' +
                  'active:scale-95 transition-transform'
                }
              >
                {'\u2715'}
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  },
);
