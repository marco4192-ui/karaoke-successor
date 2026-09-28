'use client';

import { Card } from '@/components/ui/card';
import { MusicIcon } from '@/components/icons';
import { useTranslation } from '@/lib/i18n/translations';
import type { UseJukeboxReturn } from './jukebox-types';
import { EqualizerBars, VinylDisc } from './jukebox-visuals';
import { FullscreenHeader } from './player/fullscreen-header';
import { PoolSelector } from './player/pool-selector';
import { ControlsBar } from './player/controls-bar';
import { PlaylistSidebar } from './player/playlist-sidebar';
import { SongDisplay } from './player/song-display';

// ==================== MAIN PLAYER VIEW ====================

/**
 * Main player view component (orchestrator, R10): composes the section
 * components under ./player/ (fullscreen header, pool selector, song
 * display incl. platform video/lyrics/video overlay, controls bar and
 * playlist sidebar).  Export surface unchanged.
 */
export function JukeboxPlayerView({ j, videoRef, audioRef }: { j: UseJukeboxReturn; videoRef: React.RefObject<HTMLVideoElement | null>; audioRef: React.RefObject<HTMLAudioElement | null> }) {
  const { t } = useTranslation();

  return (
    <>
      {j.isFullscreen && <FullscreenHeader j={j} />}

      {/* Normal mode header — mini vinyl + title */}
      {!j.isFullscreen && (
        <div className="mb-6 flex items-center gap-5">
          <VinylDisc
            cover={j.currentSong?.coverImage ?? null}
            spinning={j.isPlaying && !j.isAdPlaying}
            size={72}
            label={t('jukeboxPlayer.vinylLabel')}
          />
          <div className="min-w-0">
            <h1 className="text-2xl md:text-3xl font-black bg-gradient-to-r from-cyan-300 via-purple-300 to-fuchsia-300 bg-clip-text text-transparent">
              {t('jukeboxPlayer.jukeboxMode')}
            </h1>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <p className="text-white/60">
                {j.isPlaying ? t('jukeboxPlayer.songsInPlaylist').replace('{n}', String(j.playlist.length)) : t('jukeboxPlayer.sitBackEnjoy')}
              </p>
              {j.songsPlayed > 0 && (
                <span className="text-white/40 text-sm tabular-nums">({j.songsPlayed} {t('jukeboxPlayer.songsPlayed')})</span>
              )}
            </div>
            <div className="mt-2.5">
              <PoolSelector j={j} />
            </div>
          </div>
        </div>
      )}

      <div className={`flex-1 flex min-h-0 ${j.isFullscreen ? 'flex-row' : 'flex-col lg:flex-row space-y-6 lg:space-y-0 lg:gap-6'}`}>
        {/* Left column: video + controls (stacked) */}
        <div className="flex-1 flex flex-col min-w-0 space-y-6">
          {/* Video Player — #6 FIX: No more IIFE */}
          {!j.currentSong ? (
            <div className={j.isFullscreen ? 'flex-1 min-h-0' : 'flex-1'}>
              <Card className={`bg-black/50 border-white/10 overflow-hidden ${j.isFullscreen ? 'h-full rounded-none' : ''}`}>
                <div className={`relative ${j.isFullscreen ? 'h-full' : 'aspect-video'} flex items-center justify-center`}>
                  {j.isLoading ? (
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-12 h-12 border-[3px] border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
                      <EqualizerBars active={false} bars={5} label={t('jukeboxPlayer.equalizerLabel')} />
                    </div>
                  ) : (
                    <MusicIcon className="w-32 h-32 text-white/30" />
                  )}
                </div>
              </Card>
            </div>
          ) : (
            <SongDisplay j={j} videoRef={videoRef} audioRef={audioRef} />
          )}

          {/* Controls Bar (normal mode) */}
          {!j.isFullscreen && <ControlsBar j={j} />}
        </div>

        {/* Playlist Sidebar */}
        <PlaylistSidebar j={j} />
      </div>
    </>
  );
}
