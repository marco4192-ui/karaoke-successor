'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getSongByIdWithLyrics } from '@/lib/game/song-library';
import { ensureSongUrls } from '@/lib/game/song-url-restore';
import { YouTubePlayer, extractYouTubeId } from '@/components/game/youtube-player';
import { PlayIcon, PauseIcon, MusicIcon } from '@/components/icons';
import { useTranslation } from '@/lib/i18n/translations';
import type { UseJukeboxReturn } from './jukebox-types';

// ==================== UTILITIES ====================

/** #24: Centralized duration formatter */
function formatDuration(ms: number): string {
  if (!ms || ms <= 0) return '0:00';
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function formatDurationSec(seconds: number): string {
  if (!seconds || seconds <= 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/** Format timer remaining as MM:SS or HH:MM:SS */
function formatTimer(seconds: number): string {
  if (seconds >= 3600) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// ==================== FULLSCREEN HEADER ====================

function FullscreenHeader({ j }: { j: UseJukeboxReturn }) {
  const { t } = useTranslation();
  return (
    <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/80 to-transparent p-4 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <span className="text-cyan-400 text-sm font-medium">{t('jukeboxPlayer.nowPlaying')}</span>
        <h2 className="text-xl font-bold text-white">{j.currentSong?.title}</h2>
        <span className="text-white/60">{j.currentSong?.artist}</span>
      </div>
      <div className="flex items-center gap-2">
        {/* N4: Timer display */}
        {j.timerRemaining !== null && j.timerRemaining > 0 && (
          <span className="text-white/60 text-sm font-mono">{formatTimer(j.timerRemaining)}</span>
        )}
        <Button
          variant="outline"
          onClick={() => j.setShowLyrics(!j.showLyrics)}
          className={`border-white/20 ${j.showLyrics ? 'bg-purple-500/50 border-purple-500' : 'text-white'}`}
        >
          {t('jukeboxPlayer.lyricsToggle')}
        </Button>
        <Button
          variant="outline"
          onClick={() => j.setHidePlaylist(!j.hidePlaylist)}
          className="border-white/20 text-white"
        >
          {j.hidePlaylist ? t('jukeboxPlayer.showPlaylist') : t('jukeboxPlayer.hidePlaylist')}
        </Button>
        <Button variant="outline" onClick={j.toggleFullscreen} className="border-white/20 text-white">
          {t('jukeboxPlayer.exitFullscreen')}
        </Button>
      </div>
    </div>
  );
}

// ==================== LYRICS OVERLAY ====================

function LyricsOverlay({ j }: { j: UseJukeboxReturn }) {
  if (!j.showLyrics) return null;
  if (!j.currentSong?.lyrics?.length) return null;
  const lyrics = j.currentSong.lyrics;
  const currentText = lyrics[j.currentLyricIndex]?.text;
  const prevText = j.currentLyricIndex > 0 ? lyrics[j.currentLyricIndex - 1]?.text : null;
  const nextText = j.currentLyricIndex < lyrics.length - 1 ? lyrics[j.currentLyricIndex + 1]?.text : null;

  if (!currentText && !prevText && !nextText) return null;

  return (
    <div className="absolute inset-0 flex items-end justify-center pb-24 pointer-events-none z-10">
      <div className="text-center max-w-4xl px-8">
        {prevText && (
          <p className="text-white/40 text-lg md:text-xl mb-2 transition-opacity">
            {prevText}
          </p>
        )}
        <p className="text-white text-2xl md:text-4xl font-bold drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
          {currentText}
        </p>
        {nextText && (
          <p className="text-white/40 text-lg md:text-xl mt-2 transition-opacity">
            {nextText}
          </p>
        )}
      </div>
    </div>
  );
}

// ==================== PROGRESS BAR (F1, F2) ====================

function ProgressBar({ j }: { j: UseJukeboxReturn }) {
  if (j.customYoutubeId && !j.currentSong) return null;
  const progress = j.duration > 0 ? j.currentTime / j.duration : 0;

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const fraction = (e.clientX - rect.left) / rect.width;
    j.seekTo(fraction);
  };

  return (
    <div className="flex items-center gap-3 w-full">
      <span className="text-white/60 text-xs font-mono w-10 text-right">
        {formatDurationSec(j.currentTime)}
      </span>
      <div
        className="flex-1 h-1.5 bg-white/20 rounded-full cursor-pointer group relative"
        onClick={handleSeek}
        role="slider"
        aria-label="Song progress"
        aria-valuenow={Math.round(progress * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') j.seekTo(Math.min(1, progress + 0.05));
          if (e.key === 'ArrowLeft') j.seekTo(Math.max(0, progress - 0.05));
        }}
      >
        <div
          className="absolute inset-y-0 left-0 bg-cyan-500 rounded-full group-hover:bg-cyan-400 transition-colors"
          style={{ width: `${Math.max(0, Math.min(100, progress * 100))}%` }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-cyan-400 rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ left: `calc(${Math.max(0, Math.min(100, progress * 100))}% - 6px)` }}
        />
      </div>
      <span className="text-white/60 text-xs font-mono w-10">
        {formatDurationSec(j.duration)}
      </span>
    </div>
  );
}

// ==================== VOLUME CONTROL (F3 Mute) ====================

function VolumeControl({ j }: { j: UseJukeboxReturn }) {
  return (
    <div className="flex items-center gap-2">
      {/* F3: Mute toggle button */}
      <button
        onClick={j.toggleMute}
        className="p-1.5 rounded-lg text-white/60 hover:text-white transition-colors"
        aria-label={j.isMuted ? 'Unmute' : 'Mute'}
        title={j.isMuted ? 'Unmute' : 'Mute'}
      >
        {j.isMuted || j.volume === 0 ? (
          /* Muted icon */
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            <line x1="23" y1="9" x2="17" y2="15" />
            <line x1="17" y1="9" x2="23" y2="15" />
          </svg>
        ) : j.volume < 0.5 ? (
          /* Low volume icon */
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
          </svg>
        ) : (
          /* Full volume icon */
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
          </svg>
        )}
      </button>
      <input
        type="range" min="0" max="1" step="0.05"
        value={j.volume}
        onChange={(e) => j.setVolume(parseFloat(e.target.value))}
        className="w-20 accent-cyan-500"
        aria-label="Volume"
      />
    </div>
  );
}

// ==================== VIDEO OVERLAY ====================

function VideoOverlay({ j }: { j: UseJukeboxReturn }) {
  const { t } = useTranslation();
  return (
    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-6">
      {/* N8: Requester attribution */}
      {j.currentSongRequestedBy && (
        <p className="text-cyan-300/60 text-xs mb-1">
          {t('jukeboxPlayer.requestedBy').replace('{name}', j.currentSongRequestedBy)}
        </p>
      )}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-cyan-400 text-sm font-medium">{t('jukeboxPlayer.nowPlaying')}</p>
          <h2 className="text-3xl font-bold text-white">{j.currentSong?.title ?? ''}</h2>
          <p className="text-white/70 text-lg">{j.currentSong?.artist ?? ''}</p>
        </div>
        <div className="flex items-center gap-3">
          {/* #19: Transition animation via opacity */}
          <button onClick={j.playPrevious} className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all duration-200 hover:scale-110">
            <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
            </svg>
          </button>
          <button onClick={j.togglePlayPause} className="w-16 h-16 rounded-full bg-cyan-500 hover:bg-cyan-400 flex items-center justify-center transition-all duration-200 hover:scale-110">
            {j.isLoading ? (
              <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : j.isPlaying ? (
              <PauseIcon className="w-8 h-8 text-white" />
            ) : (
              <PlayIcon className="w-8 h-8 text-white ml-1" />
            )}
          </button>
          <button onClick={j.playNext} className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all duration-200 hover:scale-110">
            <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
            </svg>
          </button>
        </div>
      </div>
      {/* F1+F2: Progress bar in overlay */}
      <div className="mt-4">
        <ProgressBar j={j} />
      </div>
    </div>
  );
}

// ==================== CONTROLS BAR ====================

function ControlsBar({ j }: { j: UseJukeboxReturn }) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-between bg-white/5 rounded-xl p-4">
      <div className="flex items-center gap-4">
        {/* Shuffle */}
        <button
          onClick={() => j.setShuffle(!j.shuffle)}
          className={`p-2 rounded-lg transition-colors ${j.shuffle ? 'bg-cyan-500 text-white' : 'text-white/60 hover:text-white'}`}
          aria-label="Shuffle"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />
          </svg>
        </button>

        {/* Repeat */}
        <button
          onClick={() => j.setRepeat(j.repeat === 'none' ? 'all' : j.repeat === 'all' ? 'one' : 'none')}
          className={`p-2 rounded-lg transition-colors relative ${j.repeat !== 'none' ? 'bg-cyan-500 text-white' : 'text-white/60 hover:text-white'}`}
          aria-label="Repeat"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 1l4 4-4 4" />
            <path d="M3 11V9a4 4 0 0 1 4-4h14" />
            <path d="M7 23l-4-4 4-4" />
            <path d="M21 13v2a4 4 0 0 1-4 4H3" />
          </svg>
          {j.repeat === 'one' && <span className="absolute -top-0.5 -right-0.5 text-[10px] font-bold">1</span>}
        </button>

        {/* Lyrics */}
        <button
          onClick={() => j.setShowLyrics(!j.showLyrics)}
          className={`p-2 rounded-lg transition-colors flex items-center gap-1 ${j.showLyrics ? 'bg-purple-500 text-white' : 'text-white/60 hover:text-white'}`}
          title={t('jukeboxPlayer.singAlongMode')}
        >
          <MusicIcon className="w-5 h-5" />
          <span className="text-xs">{t('jukeboxPlayer.lyricsShort')}</span>
        </button>

        {/* Playlist toggle */}
        <button
          onClick={() => j.setHidePlaylist(!j.hidePlaylist)}
          className={`p-2 rounded-lg transition-colors flex items-center gap-1 ${!j.hidePlaylist ? 'bg-cyan-500 text-white' : 'text-white/60 hover:text-white'}`}
          title={j.hidePlaylist ? t('jukeboxPlayer.showPlaylist') : t('jukeboxPlayer.hidePlaylist')}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
            <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
          </svg>
        </button>

        {/* N9: Songs played indicator */}
        {j.songsPlayed > 0 && (
          <span className="text-white/40 text-xs">
            {j.songsPlayed} {t('jukeboxPlayer.songsPlayed')}
          </span>
        )}
      </div>

      {/* #14 FIX: Single Volume control with mute */}
      <VolumeControl j={j} />

      {/* N4: Timer display */}
      {j.timerRemaining !== null && j.timerRemaining > 0 && (
        <span className="text-white/60 text-xs font-mono bg-white/5 px-2 py-1 rounded">
          {formatTimer(j.timerRemaining)}
        </span>
      )}

      <Button variant="outline" onClick={j.stopJukebox} className="border-red-500/50 text-red-400 hover:bg-red-500/10">
        {t('jukeboxPlayer.stopJukebox')}
      </Button>
    </div>
  );
}

// ==================== PLAYLIST SIDEBAR ====================

function PlaylistSidebar({ j }: { j: UseJukeboxReturn }) {
  const { t } = useTranslation();
  const [loadingSongId, setLoadingSongId] = useState<string | null>(null);

  if (j.upNext.length === 0 || j.hidePlaylist) return null;

  // #3 FIX: Song click with loading state and error handling
  const handleSongClick = useCallback(async (songId: string) => {
    if (loadingSongId) return;
    setLoadingSongId(songId);
    try {
      const songIndex = j.playlist.findIndex(s => s.id === songId);
      if (songIndex !== -1) {
        const preparedSong = await getSongByIdWithLyrics(songId) || await ensureSongUrls(j.playlist[songIndex]);
        j.setCurrentIndex(songIndex);
        j.setCurrentSong(preparedSong);
      }
    } catch (error) {
      console.debug('[JukeboxPlayerView] handleSongClick failed:', error);
    } finally {
      setLoadingSongId(null);
    }
  }, [j, loadingSongId]);

  return (
    <div className={`${j.isFullscreen ? 'w-[25%] h-full flex flex-col bg-black/80 pt-14' : ''}`}>
      <Card className={`bg-white/5 border-white/10 ${j.isFullscreen ? 'flex-1 rounded-none border-0 flex flex-col' : ''}`}>
        <CardHeader className={j.isFullscreen ? 'pb-2 border-b border-white/10' : ''}>
          <CardTitle className="text-lg flex items-center justify-between">
            {t('jukeboxPlayer.upNext')}
            <span className="text-white/40 text-sm font-normal">{j.playlist.length - j.currentIndex - 1} {t('jukeboxPlayer.remaining')}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className={j.isFullscreen ? 'flex-1 overflow-y-auto p-2' : ''}>
          <div className="space-y-2">
            {j.upNext.map((song, index) => (
              <button
                key={song.id}
                onClick={() => handleSongClick(song.id)}
                disabled={loadingSongId === song.id}
                className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-white/10 transition-colors text-left disabled:opacity-50"
              >
                <span className="text-white/40 w-5 text-center text-sm">{index + 1}</span>
                <div className="w-10 h-10 rounded bg-gradient-to-br from-purple-600/50 to-blue-600/50 overflow-hidden flex-shrink-0">
                  {song.coverImage ? (
                    <img src={song.coverImage} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      {loadingSongId === song.id ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <MusicIcon className="w-5 h-5 text-white/30" />
                      )}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate text-sm">{song.title}</p>
                  <p className="text-white/60 text-xs truncate">{song.artist}</p>
                </div>
                {/* #24: Use centralized duration formatter */}
                <span className="text-white/40 text-xs">
                  {formatDuration(song.duration)}
                </span>
              </button>
            ))}
          </div>
        </CardContent>

        {/* #14 FIX: Fullscreen controls — no duplicate volume */}
        {j.isFullscreen && (
          <div className="p-3 border-t border-white/10 space-y-3">
            <Button variant="outline" onClick={j.stopJukebox} className="w-full border-red-500/50 text-red-400 hover:bg-red-500/10">
              {t('jukeboxPlayer.stopJukebox')}
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}

// ==================== SONG DISPLAY ====================

/** #6 FIX: Extracted IIFE into proper component */
function SongDisplay({ j, videoRef, audioRef }: { j: UseJukeboxReturn; videoRef: React.RefObject<HTMLVideoElement | null>; audioRef: React.RefObject<HTMLAudioElement | null> }) {
  const { t } = useTranslation();
  const song = j.currentSong!;

  // #26 FIX: Unified video ID calculation
  const videoId = j.customYoutubeId || extractYouTubeId(song.youtubeUrl || '') || null;

  return (
    <div className={`${j.isFullscreen ? (j.hidePlaylist ? 'flex-1 min-h-0' : 'w-[75%] h-full') : 'flex-1'}`}>
      <Card className={`bg-black/50 border-white/10 overflow-hidden ${j.isFullscreen ? 'h-full rounded-none' : ''}`}>
        <div className={`relative ${j.isFullscreen ? 'h-full' : 'aspect-video'}`}>
          {/* #19: Transition animation wrapper */}
          <div className="absolute inset-0 transition-opacity duration-300">

            {/* Video Background — unified YouTubePlayer rendering (#26) */}
            {videoId ? (
              <YouTubePlayer
                videoId={videoId}
                videoGap={song.videoGap || 0}
                onReady={() => {}}
                onTimeUpdate={(time) => j.setYoutubeTime(time)}
                onEnded={j.handleMediaEnd}
                onAdStart={() => j.setIsAdPlaying(true)}
                onAdEnd={() => j.setIsAdPlaying(false)}
                isPlaying={j.isPlaying}
                startTime={0}
              />
            ) : song.videoBackground ? (
              <video
                ref={videoRef}
                src={song.videoBackground}
                className="absolute inset-0 w-full h-full object-cover"
                muted={!!song.audioUrl && !song.hasEmbeddedAudio}
                loop={false}
                onEnded={j.handleMediaEnd}
                playsInline
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-purple-600/30 to-blue-600/30 flex items-center justify-center">
                {song.coverImage ? (
                  <img src={song.coverImage} alt={song.title} className="max-h-full max-w-full object-contain" />
                ) : (
                  <MusicIcon className="w-32 h-32 text-white/30" />
                )}
              </div>
            )}
          </div>

          {/* Audio element for songs with separate audio file */}
          {song.audioUrl && !song.hasEmbeddedAudio && (
            <audio ref={audioRef} src={song.audioUrl} onEnded={j.handleMediaEnd} />
          )}

          <LyricsOverlay j={j} />

          {/* Song info + controls (normal mode only) */}
          {!j.isFullscreen && <VideoOverlay j={j} />}

          {/* Fullscreen button (normal mode) */}
          {!j.isFullscreen && (
            <div className="absolute top-4 right-4 flex items-center gap-2">
              {j.customYoutubeId && (
                <button
                  onClick={j.clearCustomYoutube}
                  className="p-2 rounded-lg bg-black/50 hover:bg-black/70 text-red-400 transition-colors text-xs"
                  title={t('jukeboxPlayer.youtubeRemove')}
                >
                  {t('jukeboxPlayer.youtube')}
                </button>
              )}
              <button onClick={j.toggleFullscreen} className="p-2 rounded-lg bg-black/50 hover:bg-black/70 text-white transition-colors">
                {t('jukeboxPlayer.fullscreen')}
              </button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

// ==================== MAIN PLAYER VIEW ====================

/** Main player view component */
export function JukeboxPlayerView({ j, videoRef, audioRef }: { j: UseJukeboxReturn; videoRef: React.RefObject<HTMLVideoElement | null>; audioRef: React.RefObject<HTMLAudioElement | null> }) {
  const { t } = useTranslation();

  return (
    <>
      {j.isFullscreen && <FullscreenHeader j={j} />}

      {/* Normal mode header */}
      {!j.isFullscreen && (
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">{t('jukeboxPlayer.jukeboxMode')}</h1>
          <div className="flex items-center gap-4">
            <p className="text-white/60">
              {j.isPlaying ? `${j.playlist.length} ${t('jukeboxPlayer.songsInPlaylist').replace('{n}', String(j.playlist.length))}` : t('jukeboxPlayer.sitBackEnjoy')}
            </p>
            {j.songsPlayed > 0 && (
              <span className="text-white/40 text-sm">({j.songsPlayed} {t('jukeboxPlayer.songsPlayed')})</span>
            )}
          </div>
        </div>
      )}

      <div className={`flex-1 flex min-h-0 ${j.isFullscreen ? 'flex-row' : 'flex-col space-y-6'}`}>
        {/* Video Player — #6 FIX: No more IIFE */}
        {!j.currentSong ? (
          <div className={`${j.isFullscreen ? (j.hidePlaylist ? 'flex-1 min-h-0' : 'w-[75%] h-full') : 'flex-1'}`}>
            <Card className={`bg-black/50 border-white/10 overflow-hidden ${j.isFullscreen ? 'h-full rounded-none' : ''}`}>
              <div className={`relative ${j.isFullscreen ? 'h-full' : 'aspect-video'} flex items-center justify-center`}>
                {j.isLoading ? (
                  <div className="w-12 h-12 border-3 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
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

        {/* Playlist Sidebar */}
        <PlaylistSidebar j={j} />
      </div>
    </>
  );
}
