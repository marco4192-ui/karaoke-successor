'use client';

import { useState } from 'react';
import { useTranslation } from '@/lib/i18n/translations';
import { getPlaylists } from '@/lib/playlist-manager';
import type { UseJukeboxReturn } from '../jukebox-types';
import { JukeboxPlaylistBrowser } from '../jukebox-playlist-browser';
import { setJukeboxPool, useJukeboxPoolId } from '../jukebox-pool';

// ==================== POOL SELECTOR (desktop player view) ====================

/** Inline pool/playlist switcher for the jukebox player view */
export function PoolSelector({ j }: { j: UseJukeboxReturn }) {
  const { t } = useTranslation();
  // Shared pool state — stays in sync with every other jukebox surface
  // (controls bar, fullscreen header, setup view) via the pool-changed event.
  const selectedPlaylistId = useJukeboxPoolId();
  const [enqueueState, setEnqueueState] = useState<'idle' | 'busy' | 'done'>('idle');

  const handleChange = (playlistId: string) => {
    setJukeboxPool(playlistId);
  };

  // Queue the selected library playlist directly into the running jukebox queue
  const handleEnqueue = async () => {
    if (!selectedPlaylistId || enqueueState === 'busy') return;
    setEnqueueState('busy');
    try {
      const ok = await j.enqueueLibraryPlaylist(selectedPlaylistId);
      setEnqueueState(ok ? 'done' : 'idle');
      if (ok) {
        setTimeout(() => setEnqueueState('idle'), 2000);
      }
    } catch {
      setEnqueueState('idle');
    }
  };

  const playlists = getPlaylists().filter(p => !p.isSystem);

  // Always render the browser button (user item 8) — even with zero playlists
  // the dialog explains that none exist yet. The pool select only makes sense
  // when there is something to select.
  return (
    <div className="flex items-center gap-2">
      {/* Playlist-Browser (user item 8): view existing playlists incl. their
          songs and add them to the jukebox queue — next to the pool select. */}
      <JukeboxPlaylistBrowser
        songs={j.songs}
        onEnqueue={j.enqueueLibraryPlaylist}
        onSelectPool={handleChange}
        activePlaylistId={selectedPlaylistId}
        triggerClassName="h-9 px-3 rounded-xl"
      />
      {/* NOTE: the same browser is also available in the controls bar
          ("Jukebox-Menü") and in the fullscreen header. */}
      {playlists.length > 0 && (
        <>
      <select
        value={selectedPlaylistId}
        onChange={(e) => handleChange(e.target.value)}
        className="bg-white/10 border border-white/20 rounded-xl px-3.5 py-1.5 text-sm text-white appearance-none cursor-pointer hover:border-cyan-500/50 focus:border-cyan-500/60 outline-none transition-all pr-8"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='white'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 6px center',
          backgroundSize: '14px',
        }}
      >
        <option value="" className="bg-gray-800 text-white">{t('jukeboxPlayer.allSongs')}</option>
        {playlists.map(pl => (
          <option key={pl.id} value={pl.id} className="bg-gray-800 text-white">
            {pl.name}
          </option>
        ))}
      </select>
      {/* Playlist → queue: appends the playlist songs after the last user song */}
      <button
        onClick={handleEnqueue}
        disabled={!selectedPlaylistId || enqueueState === 'busy'}
        title={t('jukeboxPlayer.enqueuePlaylistRunning')}
        aria-label={t('jukeboxPlayer.enqueuePlaylistRunning')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
          enqueueState === 'done'
            ? 'bg-green-500/20 border-green-400/40 text-green-300'
            : 'bg-cyan-500/10 border-cyan-400/30 text-cyan-300 hover:bg-cyan-500/20 hover:border-cyan-400/50'
        }`}
      >
        {enqueueState === 'done' ? (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        )}
        <span className="hidden sm:inline">{enqueueState === 'done' ? t('jukeboxPlayer.playlistQueued') : t('jukeboxPlayer.enqueuePlaylistRunning')}</span>
      </button>
        </>
      )}
    </div>
  );
}
