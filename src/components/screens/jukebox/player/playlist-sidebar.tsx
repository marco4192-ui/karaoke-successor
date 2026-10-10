'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MusicIcon } from '@/components/icons';
import { getSongByIdWithLyrics } from '@/lib/game/song-library';
import { ensureSongUrls } from '@/lib/game/song-url-restore';
import { useTranslation } from '@/lib/i18n/translations';
import type { UseJukeboxReturn } from '../jukebox-types';
import { isVideoBreak, parseVideoLinkInput, videoBreakPlatform, platformDisplayName } from '../video-break';
import { EqualizerBars } from '../jukebox-visuals';
import { formatDuration } from './format-utils';

// ==================== PLAYLIST SIDEBAR ====================

export function PlaylistSidebar({ j }: { j: UseJukeboxReturn }) {
  const { t } = useTranslation();
  const [loadingSongId, setLoadingSongId] = useState<string | null>(null);
  // Compact video-link quick-add while the jukebox is running
  // (supports the "URL | Title" syntax too)
  const [quickUrl, setQuickUrl] = useState('');
  const [quickError, setQuickError] = useState(false);

  const handleQuickAdd = useCallback(() => {
    const raw = quickUrl.trim();
    if (!raw) return;
    const link = parseVideoLinkInput(raw)[0];
    if (!link) {
      setQuickError(true);
      return;
    }
    setQuickError(false);
    setQuickUrl('');
    j.addVideoToQueue(link.url, link.label);
  }, [quickUrl, j]);

  // #3 FIX: Song click with loading state and error handling
  // (declared before the empty-state early return below so the hook order
  // stays identical when the playlist transitions empty <-> non-empty)
  const handleSongClick = useCallback(async (songId: string) => {
    if (loadingSongId) return;
    setLoadingSongId(songId);
    try {
      const songIndex = j.playlist.findIndex(s => s.id === songId);
      if (songIndex !== -1) {
        const target = j.playlist[songIndex];
        // Video breaks are synthetic songs — never look them up in the library
        const preparedSong = isVideoBreak(target)
          ? target
          : (await getSongByIdWithLyrics(songId) || await ensureSongUrls(target));
        j.setCurrentIndex(songIndex);
        j.setCurrentSong(preparedSong);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.debug('[JukeboxPlayerView] handleSongClick failed:', error);
    } finally {
      setLoadingSongId(null);
    }
  }, [j, loadingSongId]);

  // #4 FIX: Never return null — an empty queue still shows the sidebar with
  // the video-link quick-add and an empty-state hint (CSS width transition
  // avoids React #300 DOM mismatch when toggling in fullscreen flex layout).
  const sidebarWrapperClass = j.isFullscreen
    ? 'h-full flex flex-col bg-black/80 pt-16 transition-all duration-300'
    : j.hidePlaylist
      ? 'hidden'
      : 'lg:w-[21rem] xl:w-88 shrink-0 lg:h-full';

  return (
    <div
      className={sidebarWrapperClass}
      style={j.isFullscreen ? { width: j.hidePlaylist ? '0px' : '25%', overflow: 'hidden' } : undefined}
    >
      <Card className={`bg-white/[0.04] backdrop-blur-sm border-white/10 ${j.isFullscreen ? 'flex-1 rounded-none border-0 flex flex-col bg-black/50' : 'lg:h-full flex flex-col'}`}>
        <CardHeader className={j.isFullscreen ? 'pb-2 border-b border-white/10' : 'pb-3'}>
          <CardTitle className="text-lg flex items-center justify-between">
            <span className="flex items-center gap-2">
              <EqualizerBars
                active={j.isMediaPlaying && !j.isAdPlaying}
                bars={3}
                className="h-3.5"
                label={t('jukeboxPlayer.equalizerLabel')}
              />
              {t('jukeboxPlayer.upNext')}
            </span>
            <span className="text-cyan-400/80 text-sm font-normal tabular-nums bg-cyan-500/10 border border-cyan-500/20 rounded-full px-2.5 py-0.5">
              {j.playlist.length - j.currentIndex - 1} {t('jukeboxPlayer.remaining')}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className={`${j.isFullscreen ? 'flex-1 overflow-y-auto p-2 jukebox-queue-scroll' : 'pb-4 lg:flex-1 lg:overflow-y-auto lg:max-h-[24rem] xl:max-h-[28rem] jukebox-queue-scroll'}`}>
          {/* Video-Link Schnell-Hinzufügen (auch während der Jukebox läuft) */}
          <div className="flex gap-1.5 mb-3">
            <input
              type="url"
              inputMode="url"
              value={quickUrl}
              onChange={(e) => { setQuickUrl(e.target.value); setQuickError(false); }}
              onKeyDown={(e) => { if (e.key === 'Enter') handleQuickAdd(); }}
              placeholder={t('jukeboxPlayer.videoLinkPlaceholder')}
              aria-label={t('jukeboxPlayer.videoLinkTitle')}
              title={t('jukeboxPlayer.videoLinkHint')}
              className={`min-w-0 flex-1 bg-white/5 border rounded-lg px-2.5 py-2 text-xs text-white placeholder:text-white/30 outline-none transition-colors ${
                quickError ? 'border-red-400/60 focus:border-red-400' : 'border-white/10 focus:border-fuchsia-400/60'
              }`}
            />
            <button
              onClick={handleQuickAdd}
              disabled={!quickUrl.trim()}
              className="shrink-0 px-2.5 py-2 rounded-lg bg-fuchsia-500/15 border border-fuchsia-400/30 text-fuchsia-300 hover:bg-fuchsia-500/25 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label={t('jukeboxPlayer.videoLinkAdd')}
              title={t('jukeboxPlayer.videoLinkAdd')}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <polygon points="6 3 20 12 6 21 6 3" />
              </svg>
            </button>
          </div>
          {quickError && (
            <p className="text-red-400 text-xs mb-2 -mt-1.5" role="alert">{t('jukeboxPlayer.videoLinkInvalid')}</p>
          )}
          <div className="space-y-1.5">
            {j.upNext.length === 0 && (
              <div className="flex flex-col items-center gap-2 py-8 text-white/30">
                <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                  <path d="M3 5h18v14H3z" rx="2" /><polygon points="10 9 15 12 10 15 10 9" fill="currentColor" stroke="none" />
                </svg>
                <p className="text-xs">{t('jukeboxPlayer.queueEmpty')}</p>
              </div>
            )}
            {j.upNext.map((song, index) => {
              const isNext = index === 0;
              const videoBreak = isVideoBreak(song);
              return (
                <button
                  key={song.id}
                  onClick={() => handleSongClick(song.id)}
                  disabled={loadingSongId === song.id}
                  className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-all duration-200 text-left disabled:opacity-50 group ${
                    isNext
                      ? videoBreak
                        ? 'bg-fuchsia-500/10 border border-fuchsia-400/30 hover:bg-fuchsia-500/15'
                        : 'bg-cyan-500/10 border border-cyan-500/25 hover:bg-cyan-500/15'
                      : 'border border-transparent hover:bg-white/[0.07] hover:border-white/10 hover:translate-x-0.5'
                  }`}
                >
                  <span className={`w-6 text-center text-sm tabular-nums shrink-0 ${isNext ? (videoBreak ? 'text-fuchsia-400 font-bold' : 'text-cyan-400 font-bold') : 'text-white/30 font-medium'}`}>
                    {index + 1}
                  </span>
                  <div className={`relative w-11 h-11 rounded-lg overflow-hidden shrink-0 ring-1 ${videoBreak ? 'ring-fuchsia-500/40 bg-gradient-to-br from-fuchsia-600/40 to-purple-600/40' : isNext ? 'ring-cyan-500/40' : 'ring-white/10'}`}>
                    {song.coverImage ? (
                      <img src={song.coverImage} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                    ) : (
                      <div className={`w-full h-full flex items-center justify-center ${videoBreak ? '' : 'bg-gradient-to-br from-cyan-600/40 to-purple-600/40'}`}>
                        {loadingSongId === song.id ? (
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : videoBreak ? (
                          /* Video break: play badge instead of a music note */
                          <svg className="w-5 h-5 text-fuchsia-300" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                            <polygon points="6 3 20 12 6 21 6 3" />
                          </svg>
                        ) : (
                          <MusicIcon className="w-5 h-5 text-white/40" />
                        )}
                      </div>
                    )}
                    {isNext && !videoBreak && (
                      <span className="absolute inset-0 bg-cyan-400/10 border border-cyan-400/30 rounded-lg pointer-events-none" aria-hidden />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`truncate text-sm font-medium ${isNext ? (videoBreak ? 'text-fuchsia-100' : 'text-cyan-100') : 'text-white'}`}>{song.title}</p>
                    <p className="text-white/50 text-xs truncate flex items-center gap-1">
                      <span>{videoBreak ? `${platformDisplayName(videoBreakPlatform(song))} · ${t('jukeboxPlayer.videoChip')}` : song.artist}</span>
                    </p>
                  </div>
                  {/* #24: Use centralized duration formatter */}
                  <span className={`text-xs tabular-nums shrink-0 ${isNext ? (videoBreak ? 'text-fuchsia-400/70' : 'text-cyan-400/70') : 'text-white/35'}`}>
                    {formatDuration(song.duration)}
                  </span>
                  {/* Remove queued video breaks directly from the queue */}
                  {videoBreak && (
                    <span
                      role="button"
                      tabIndex={0}
                      aria-label={t('jukeboxPlayer.queueVideoRemove')}
                      title={t('jukeboxPlayer.queueVideoRemove')}
                      onClick={(e) => {
                        e.stopPropagation();
                        j.removeQueueVideo(song.id);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.stopPropagation();
                          e.preventDefault();
                          j.removeQueueVideo(song.id);
                        }
                      }}
                      className="shrink-0 p-1 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>

        {/* #14 FIX: Fullscreen controls — no duplicate volume */}
        {j.isFullscreen && (
          <div className="p-3 border-t border-white/10 space-y-3">
            <Button variant="outline" onClick={j.stopJukebox} className="w-full border-red-500/40 text-red-400 hover:bg-red-500/10">
              {t('jukeboxPlayer.stopJukebox')}
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
