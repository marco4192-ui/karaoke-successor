'use client';

import { Button } from '@/components/ui/button';
import { MusicIcon } from '@/components/icons';
import { useTranslation } from '@/lib/i18n/translations';
import type { UseJukeboxReturn } from '../jukebox-types';
import { JukeboxPlaylistBrowser } from '../jukebox-playlist-browser';
import { setJukeboxPool, useJukeboxPoolId } from '../jukebox-pool';
import { VolumeControl } from './volume-control';
import { formatTimer } from './format-utils';

// ==================== CONTROLS BAR ====================

export function ControlsBar({ j }: { j: UseJukeboxReturn }) {
  const { t } = useTranslation();
  // Active pool for the browser's "Als Pool setzen" highlight — kept in sync
  // with all other jukebox surfaces through the shared pool state.
  const activePoolId = useJukeboxPoolId();
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-2xl px-4 py-3 shadow-[0_0_30px_rgba(0,0,0,0.25)]">
      <div className="flex items-center gap-2">
        {/* Shuffle */}
        <button
          onClick={() => j.setShuffle(!j.shuffle)}
          className={`p-2.5 rounded-xl transition-all duration-200 ${
            j.shuffle
              ? 'bg-gradient-to-br from-cyan-500 to-cyan-400 text-white shadow-[0_0_14px_rgba(34,211,238,0.4)]'
              : 'text-white/50 hover:text-white hover:bg-white/10'
          }`}
          aria-label={t('jukeboxA11y.shuffle')}
          title={t('jukeboxA11y.shuffle')}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />
          </svg>
        </button>

        {/* Repeat */}
        <button
          onClick={() => j.setRepeat(j.repeat === 'none' ? 'all' : j.repeat === 'all' ? 'one' : 'none')}
          className={`p-2.5 rounded-xl transition-all duration-200 relative ${
            j.repeat !== 'none'
              ? 'bg-gradient-to-br from-cyan-500 to-cyan-400 text-white shadow-[0_0_14px_rgba(34,211,238,0.4)]'
              : 'text-white/50 hover:text-white hover:bg-white/10'
          }`}
          aria-label={t('jukeboxA11y.repeat')}
          title={j.repeat === 'one' ? t('jukeboxPlayer.repeatOne') : j.repeat === 'all' ? t('jukeboxPlayer.repeatAll') : t('jukeboxPlayer.noRepeat')}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 1l4 4-4 4" />
            <path d="M3 11V9a4 4 0 0 1 4-4h14" />
            <path d="M7 23l-4-4 4-4" />
            <path d="M21 13v2a4 4 0 0 1-4 4H3" />
          </svg>
          {j.repeat === 'one' && (
            <span className="absolute -top-0.5 -right-0.5 text-[10px] font-bold bg-cyan-400 text-black w-4 h-4 rounded-full flex items-center justify-center">1</span>
          )}
        </button>

        <span className="w-px h-6 bg-white/10 mx-1" aria-hidden />

        {/* Lyrics */}
        <button
          onClick={() => j.setShowLyrics(!j.showLyrics)}
          className={`p-2.5 rounded-xl transition-all duration-200 flex items-center gap-1.5 ${
            j.showLyrics
              ? 'bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-[0_0_14px_rgba(168,85,247,0.4)]'
              : 'text-white/50 hover:text-white hover:bg-white/10'
          }`}
          title={t('jukeboxPlayer.singAlongMode')}
        >
          <MusicIcon className="w-5 h-5" />
          <span className="text-xs hidden sm:inline">{t('jukeboxPlayer.lyricsShort')}</span>
        </button>

        {/* Playlist toggle */}
        <button
          onClick={() => j.setHidePlaylist(!j.hidePlaylist)}
          className={`p-2.5 rounded-xl transition-all duration-200 flex items-center gap-1.5 ${
            !j.hidePlaylist
              ? 'bg-gradient-to-br from-cyan-500 to-cyan-400 text-white shadow-[0_0_14px_rgba(34,211,238,0.4)]'
              : 'text-white/50 hover:text-white hover:bg-white/10'
          }`}
          title={j.hidePlaylist ? t('jukeboxPlayer.showPlaylist') : t('jukeboxPlayer.hidePlaylist')}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
            <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
          </svg>
          <span className="text-xs hidden sm:inline">{t('jukeboxPlayer.playlist')}</span>
        </button>

        {/* Playlists ansehen — the playlist browser right inside the jukebox
            menu, so existing playlists can be inspected / enqueued / set as
            pool without detouring through the library. */}
        <JukeboxPlaylistBrowser
          songs={j.songs}
          onEnqueue={j.enqueueLibraryPlaylist}
          onSelectPool={setJukeboxPool}
          activePlaylistId={activePoolId}
          triggerClassName="p-2.5 rounded-xl h-auto px-2.5 text-white/50 hover:text-white hover:bg-white/10 border-0 border-transparent hover:border-cyan-400/40 bg-transparent"
        />

        {/* N9: Songs played indicator */}
        {j.songsPlayed > 0 && (
          <span className="text-white/40 text-xs ml-1 tabular-nums">
            {j.songsPlayed} {t('jukeboxPlayer.songsPlayed')}
          </span>
        )}
      </div>

      <div className="flex items-center gap-3 ml-auto">
        {/* N4: Timer display */}
        {j.timerRemaining !== null && j.timerRemaining > 0 && (
          <span className="text-white/60 text-xs font-mono bg-white/5 border border-white/10 px-2.5 py-1 rounded-lg tabular-nums">
            {formatTimer(j.timerRemaining)}
          </span>
        )}

        {/* #14 FIX: Single Volume control with mute */}
        <VolumeControl j={j} />

        <Button variant="outline" onClick={j.stopJukebox} className="border-red-500/40 text-red-400 hover:bg-red-500/10 hover:border-red-500/60">
          {t('jukeboxPlayer.stopJukebox')}
        </Button>
      </div>
    </div>
  );
}
