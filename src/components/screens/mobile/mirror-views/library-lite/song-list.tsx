'use client';

// ===================== Library-Lite-Mirror — Song-Liste =====================
//
// Loading-Spinner, Error-Block, leerer Zustand (Motto-Party-Variante) und
// die Songliste inkl. Desktop-Preview-Button (span[role=button] — kein
// <button> im <button>, siehe Hydration-Kommentar). R27a-Auslagerung aus
// mirror-library-lite.tsx — JSX byte-identisch übernommen.

import { useTranslation } from '@/lib/i18n/translations';
import { formatDurationSec, haptic, tOr } from './helpers';
import type { GameState, MobileSong } from '../../mobile-types';

export interface SongListProps {
  songsLoading: boolean;
  songsError: string | null;
  onRefreshSongs: () => void;
  displaySongs: MobileSong[];
  gameState: GameState;
  desktopPreviewSongId: string | null;
  handleDesktopPreview: (songId: string) => void;
  handleStopDesktopPreview: () => void;
  openOverlayWithPreviewStop: (song: MobileSong) => void;
}

export function SongList({
  songsLoading,
  songsError,
  onRefreshSongs,
  displaySongs,
  gameState,
  desktopPreviewSongId,
  handleDesktopPreview,
  handleStopDesktopPreview,
  openOverlayWithPreviewStop,
}: SongListProps) {
  const { t } = useTranslation();
  return (
    <>
      {/* Loading */}
      {songsLoading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full" />
        </div>
      )}

      {/* Error */}
      {songsError && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-4">
          <p className="text-sm text-red-400">{songsError}</p>
          <button onClick={onRefreshSongs} className="mt-2 text-xs text-red-300 underline">Erneut laden</button>
        </div>
      )}

      {/* Leerer Zustand */}
      {!songsLoading && !songsError && displaySongs.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-xl bg-white/5 border border-white/10 p-8">
          <span className="text-3xl" aria-hidden="true">{gameState.mottoParty?.enabled ? '🎉' : '🎵'}</span>
          <p className="text-sm text-white/40 text-center">
            {gameState.mottoParty?.enabled
              ? tOr(t, 'library.mottoNoSongs', 'Kein Song passt zum Motto — passe das Motto in den Settings an')
              : (t('mobile.mirrorNoSongs') || 'Keine Songs gefunden')}
          </p>
        </div>
      )}

      {/* Songliste - Tap oeffnet Overlay */}
      <div className="flex flex-col gap-1.5">
        {displaySongs.map((song) => (
          <button
            key={song.id}
            onClick={() => openOverlayWithPreviewStop(song)}
            className={'flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all active:scale-[0.98] ' +
              'bg-white/5 border border-white/10 active:bg-white/10'}
          >
            {/* Song-Icon */}
            <div className="shrink-0 w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center text-base">
              {'\u{1F3B5}'}
            </div>
            {/* Song-Info */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="truncate text-sm font-medium text-white">{song.title}</p>
                {gameState.viralSongIds?.includes(song.id) && (
                  <span className="shrink-0 text-xs">{'\uD83D\uDD25'}</span>
                )}
              </div>
              <p className="truncate text-xs text-white/40">{song.artist}</p>
            </div>
            {/* Desktop-Preview Button (nur kontrollierender Companion) —
                span[role=button] instead of <button>: a button inside the
                song-row <button> is invalid HTML (hydration error). */}
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                haptic();
                if (desktopPreviewSongId === song.id) {
                  handleStopDesktopPreview();
                } else {
                  handleDesktopPreview(song.id);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  e.stopPropagation();
                  haptic();
                  if (desktopPreviewSongId === song.id) {
                    handleStopDesktopPreview();
                  } else {
                    handleDesktopPreview(song.id);
                  }
                }
              }}
              className={
                'shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90 cursor-pointer ' +
                (desktopPreviewSongId === song.id
                  ? 'bg-cyan-500/30 text-cyan-400'
                  : 'bg-white/5 text-white/30 active:text-white/60')
              }
              aria-label={desktopPreviewSongId === song.id
                ? (t('mobilePreview.stopPreview') || 'Stop Preview')
                : (t('mobilePreview.playOnDesktop') || 'Preview on Desktop')}
            >
              <span className="text-sm" aria-hidden="true">{desktopPreviewSongId === song.id ? '\u23F9' : '\u{1F50A}'}</span>
            </span>
            {/* Dauer */}
            <span className="shrink-0 text-[10px] font-mono text-white/30 w-8 text-right">{formatDurationSec(song.duration)}</span>
            {/* Chevron */}
            <span className="shrink-0 text-white/20 text-xs">{'\u203A'}</span>
          </button>
        ))}
      </div>
    </>
  );
}
