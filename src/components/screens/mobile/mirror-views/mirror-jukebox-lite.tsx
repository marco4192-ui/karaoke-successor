'use client';

import React, { useCallback, useState } from 'react';
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

type RepeatMode = 'all' | 'none' | 'one';

// ===================== Component =====================

export function MirrorJukeboxLite({ jukeboxWishlist, onRemoveFromJukebox, onSendDesktopCommand, gameState }: MirrorJukeboxLiteProps) {
    const { t } = useTranslation();

    // Local UI state for toggle buttons (optimistic)
    const [shuffleOn, setShuffleOn] = useState(true);
    const [repeatMode, setRepeatMode] = useState<RepeatMode>('all');
    const [lyricsOn, setLyricsOn] = useState(false);

    const handleRemove = useCallback(
      (id: string) => { onRemoveFromJukebox(id); },
      [onRemoveFromJukebox],
    );

    const handleCommand = useCallback(
      (cmd: string) => { haptic(); onSendDesktopCommand(cmd); },
      [onSendDesktopCommand],
    );

    // DO-NOT-CHANGE: Jukebox starten - wenn Playlist leer, wird auf dem
    // Desktop Random-Musik aus der gesamten Bibliothek abgespielt.
    const handleJukeboxStart = useCallback(() => {
      haptic();
      onSendDesktopCommand('jukebox');
      setTimeout(() => { onSendDesktopCommand('jukebox_play'); }, 300);
    }, [onSendDesktopCommand]);

    const handleShuffle = useCallback(() => {
      haptic();
      setShuffleOn(s => !s);
      onSendDesktopCommand('jukebox_shuffle');
    }, [onSendDesktopCommand]);

    const handleRepeat = useCallback(() => {
      haptic();
      const modes: RepeatMode[] = ['all', 'none', 'one'];
      setRepeatMode(prev => {
        const idx = modes.indexOf(prev);
        return modes[(idx + 1) % modes.length];
      });
      onSendDesktopCommand('jukebox_repeat');
    }, [onSendDesktopCommand]);

    const handleLyricsToggle = useCallback(() => {
      haptic();
      setLyricsOn(s => !s);
      onSendDesktopCommand('jukebox_lyrics_toggle');
    }, [onSendDesktopCommand]);

    const repeatLabel = repeatMode === 'all'
      ? t('mobile.mirrorJukeboxRepeatAll')
      : repeatMode === 'one'
        ? t('mobile.mirrorJukeboxRepeatOne')
        : t('mobile.mirrorJukeboxRepeatOff');

    // Current song info from game state
    const currentSong = gameState?.currentSong;
    const isPlaying = gameState?.isPlaying ?? false;

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

        {/* Now Playing */}
        {currentSong && (
          <div className="flex items-center gap-3 rounded-xl bg-gradient-to-r from-cyan-500/15 to-purple-500/15 border border-cyan-400/20 px-4 py-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500/30 to-purple-500/30 flex items-center justify-center text-lg shrink-0">
              {'\u{1F3B5}'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">{currentSong.title}</p>
              <p className="truncate text-xs text-white/40">{currentSong.artist}</p>
            </div>
            {isPlaying && (
              <div className="shrink-0 w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            )}
          </div>
        )}

        {/* Start / Stop */}
        <div className="flex gap-2">
          <button
            onClick={handleJukeboxStart}
            className={
              'flex-1 flex items-center justify-center gap-2 rounded-xl p-3 text-sm font-semibold ' +
              'bg-gradient-to-r from-cyan-500/25 to-purple-500/25 border border-cyan-400/30 text-white ' +
              'active:scale-[0.97] transition-transform'
            }
          >
            <span>{'📻'}</span>
            <span>{t('mobile.mirrorJukeboxStart')}</span>
            {jukeboxWishlist.length === 0 && (
              <span className="text-xs text-white/40 font-normal ml-1">(Random)</span>
            )}
          </button>
          <button
            onClick={() => handleCommand('jukebox_stop')}
            className={
              'flex items-center justify-center gap-2 rounded-xl p-3 px-4 text-sm font-medium ' +
              'bg-red-500/10 border border-red-500/30 text-red-400 ' +
              'active:scale-[0.97] transition-transform'
            }
          >
            <span>{'⏹'}</span>
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

        {/* Fullscreen & Playback Controls */}
        <div className="flex gap-2">
          <button
            onClick={() => handleCommand('fullscreen')}
            className="flex items-center justify-center gap-2 rounded-xl p-3 bg-white/5 border border-white/10 active:scale-95 transition-transform"
          >
            <span className="text-base">{'\u{1F4FA}'}</span>
            <span className="text-xs font-medium text-white/70">{t('mobile.mirrorJukeboxFullscreen')}</span>
          </button>
          <button
            onClick={() => handleCommand('jukebox_prev')}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl p-3 bg-white/5 border border-white/10 active:scale-95 transition-transform"
          >
            <span className="text-base">{'\u23EE'}</span>
            <span className="text-xs font-medium text-white/70">{t('mobile.mirrorJukeboxPrev')}</span>
          </button>
          <button
            onClick={() => handleCommand('jukebox_toggle_play')}
            className={
              'flex-1 flex items-center justify-center gap-2 rounded-xl p-3 active:scale-95 transition-transform ' +
              (isPlaying
                ? 'bg-yellow-500/15 border border-yellow-400/30 text-yellow-400'
                : 'bg-green-500/15 border border-green-400/30 text-green-400')
            }
          >
            <span className="text-base">{isPlaying ? '\u23F8' : '\u25B6'}</span>
            <span className="text-xs font-medium">{isPlaying ? t('mobile.mirrorJukeboxPause') : t('mobile.mirrorJukeboxPlay')}</span>
          </button>
          <button
            onClick={() => handleCommand('jukebox_next')}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl p-3 bg-white/5 border border-white/10 active:scale-95 transition-transform"
          >
            <span className="text-base">{'\u23ED'}</span>
            <span className="text-xs font-medium text-white/70">{t('mobile.mirrorJukeboxNext')}</span>
          </button>
        </div>

        {/* Volume Controls */}
        <div className="flex gap-2">
          <button
            onClick={() => handleCommand('jukebox_volume_down')}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl p-3 bg-white/5 border border-white/10 active:scale-95 transition-transform"
          >
            <span className="text-base">{'\u{1F509}'}</span>
            <span className="text-xs font-medium text-white/70">{t('mobile.mirrorJukeboxVolume')} -</span>
          </button>
          <button
            onClick={() => handleCommand('jukebox_volume_up')}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl p-3 bg-white/5 border border-white/10 active:scale-95 transition-transform"
          >
            <span className="text-base">{'\u{1F50A}'}</span>
            <span className="text-xs font-medium text-white/70">{t('mobile.mirrorJukeboxVolume')} +</span>
          </button>
        </div>

        {/* Toggle Buttons: Shuffle / Repeat / Lyrics / Playlist */}
        <div className="grid grid-cols-4 gap-2">
          <button
            onClick={handleShuffle}
            className={
              'flex flex-col items-center justify-center gap-1 rounded-xl p-2.5 active:scale-95 transition-all ' +
              (shuffleOn
                ? 'bg-cyan-500/20 border border-cyan-400/40 text-cyan-300'
                : 'bg-white/5 border border-white/10 text-white/40')
            }
          >
            <span className="text-base">{'\u{1F500}'}</span>
            <span className="text-[10px] font-medium">{t('mobile.mirrorJukeboxShuffle')}</span>
          </button>
          <button
            onClick={handleRepeat}
            className={
              'flex flex-col items-center justify-center gap-1 rounded-xl p-2.5 active:scale-95 transition-all ' +
              (repeatMode !== 'none'
                ? 'bg-purple-500/20 border border-purple-400/40 text-purple-300'
                : 'bg-white/5 border border-white/10 text-white/40')
            }
          >
            <span className="text-base">{repeatMode === 'one' ? '\u{1F502}' : '\u{1F501}'}</span>
            <span className="text-[10px] font-medium">{repeatLabel}</span>
          </button>
          <button
            onClick={handleLyricsToggle}
            className={
              'flex flex-col items-center justify-center gap-1 rounded-xl p-2.5 active:scale-95 transition-all ' +
              (lyricsOn
                ? 'bg-green-500/20 border border-green-400/40 text-green-300'
                : 'bg-white/5 border border-white/10 text-white/40')
            }
          >
            <span className="text-base">{'\u{1F4DC}'}</span>
            <span className="text-[10px] font-medium">{t('mobile.mirrorJukeboxLyrics')}</span>
          </button>
          <button
            onClick={() => handleCommand('jukebox_playlist_toggle')}
            className="flex flex-col items-center justify-center gap-1 rounded-xl p-2.5 bg-white/5 border border-white/10 text-white/40 active:scale-95 transition-all"
          >
            <span className="text-base">{'\u{1F3BC}'}</span>
            <span className="text-[10px] font-medium">{t('mobile.mirrorJukeboxPlaylist')}</span>
          </button>
        </div>

        {/* Up Next / Wishlist Section */}
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-2">
            {t('mobile.mirrorJukeboxUpNext')}
          </h3>
          {jukeboxWishlist.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 rounded-xl bg-white/5 border border-white/10 p-6">
              <span className="text-2xl">{'📻'}</span>
              <p className="text-xs text-white/30">
                {t('mobile.mirrorJukeboxNoWishlist')}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {jukeboxWishlist.map((item, index) => (
                <div
                  key={item.id}
                  className={
                    'flex items-center gap-3 rounded-xl p-3 ' +
                    'bg-white/5 border border-white/10'
                  }
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-white/60">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">{item.songTitle}</p>
                    <p className="truncate text-xs text-white/40">{item.songArtist}</p>
                  </div>
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
          )}
        </div>
      </div>
    );
}