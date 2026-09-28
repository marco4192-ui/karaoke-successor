'use client';

import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n/translations';
import type { UseJukeboxReturn } from '../jukebox-types';
import { JukeboxPlaylistBrowser } from '../jukebox-playlist-browser';
import { setJukeboxPool, useJukeboxPoolId } from '../jukebox-pool';
import { EqualizerBars } from '../jukebox-visuals';
import { formatTimer } from './format-utils';

// ==================== FULLSCREEN HEADER ====================

export function FullscreenHeader({ j }: { j: UseJukeboxReturn }) {
  const { t } = useTranslation();
  const fullscreenPoolId = useJukeboxPoolId();
  return (
    <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/90 via-black/60 to-transparent p-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <EqualizerBars
          active={j.isMediaPlaying && !j.isAdPlaying}
          bars={4}
          className="h-5"
          label={t('jukeboxPlayer.equalizerLabel')}
        />
        <span className="text-cyan-400 text-sm font-medium tracking-wide shrink-0">{t('jukeboxPlayer.nowPlaying')}</span>
        <h2 className="text-xl font-bold text-white truncate">{j.currentSong?.title}</h2>
        <span className="text-white/60 truncate hidden sm:inline">{j.currentSong?.artist}</span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {/* N4: Timer display */}
        {j.timerRemaining !== null && j.timerRemaining > 0 && (
          <span className="text-white/70 text-sm font-mono bg-white/10 rounded-lg px-2.5 py-1 border border-white/10">{formatTimer(j.timerRemaining)}</span>
        )}
        {/* Playlists ansehen — also reachable in fullscreen mode */}
        <JukeboxPlaylistBrowser
          songs={j.songs}
          onEnqueue={j.enqueueLibraryPlaylist}
          onSelectPool={setJukeboxPool}
          activePlaylistId={fullscreenPoolId}
          triggerClassName="h-9 px-3 rounded-xl bg-white/10 border-white/20 text-white/80 hover:bg-white/20 hover:text-white"
        />
        <Button
          variant="outline"
          onClick={() => j.setShowLyrics(!j.showLyrics)}
          className={`border-white/20 ${j.showLyrics ? 'bg-purple-500/60 border-purple-500 text-white shadow-[0_0_16px_rgba(168,85,247,0.35)]' : 'text-white hover:bg-white/10'}`}
        >
          {t('jukeboxPlayer.lyricsToggle')}
        </Button>
        <Button
          variant="outline"
          onClick={() => j.setHidePlaylist(!j.hidePlaylist)}
          className="border-white/20 text-white hover:bg-white/10"
        >
          {j.hidePlaylist ? t('jukeboxPlayer.showPlaylist') : t('jukeboxPlayer.hidePlaylist')}
        </Button>
        <Button variant="outline" onClick={j.toggleFullscreen} className="border-white/20 text-white hover:bg-white/10">
          {t('jukeboxPlayer.exitFullscreen')}
        </Button>
      </div>
    </div>
  );
}
