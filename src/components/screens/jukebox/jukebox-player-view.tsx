'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getSongByIdWithLyrics } from '@/lib/game/song-library';
import { ensureSongUrls } from '@/lib/game/song-url-restore';
import { YouTubePlayer, extractYouTubeId } from '@/components/game/youtube-player';
import { DailymotionPlayer } from '@/components/game/dailymotion-player';
import { VimeoPlayer } from '@/components/game/vimeo-player';
import { RutubePlayer } from '@/components/game/rutube-player';
import { VKPlayer } from '@/components/game/vk-player';
import { BilibiliPlayer } from '@/components/game/bilibili-player';
import { NiconicoPlayer } from '@/components/game/niconico-player';
import { MANUAL_START_PLATFORMS, type VideoPlatform } from '@/lib/url-utils';
import { PlayIcon, PauseIcon, MusicIcon } from '@/components/icons';
import { useTranslation } from '@/lib/i18n/translations';
import { getPlaylists } from '@/lib/playlist-manager';
import { StorageKeys, getJson, setJson, removeItem } from '@/lib/storage';
import type { Song } from '@/types/game';
import type { UseJukeboxReturn } from './jukebox-types';
import { getSongPlatformVideo, isVideoBreak, parseVideoLinkInput, videoBreakPlatform, platformDisplayName } from './video-break';
import { EqualizerBars, VinylDisc } from './jukebox-visuals';

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

// ==================== PLATFORM VIDEO DISPATCH ====================

/**
 * Renders the correct streaming-platform player for a song with a platform
 * video URL — for video breaks (link queue) AND karaoke songs with #VIDEO.
 *
 * - Video break: video + SOUND (the link is the audio source).
 * - Karaoke song with separate #MP3: video muted, audio via <audio> (fixes
 *   the former double-audio issue for YouTube songs in the jukebox).
 */
function JukeboxPlatformVideo({
  j,
  song,
  platformVideo,
}: {
  j: UseJukeboxReturn;
  song: Song;
  platformVideo: { platform: NonNullable<VideoPlatform>; url: string };
}) {
  const { t } = useTranslation();
  const { platform, url } = platformVideo;
  const videoGap = song.videoGap || 0;
  const startTime = song.start || 0;

  // Karaoke songs with a separate audio track keep their audio master (MP3);
  // the platform video stays muted in that case.
  const hasSeparateAudio = !!song.audioUrl && !song.hasEmbeddedAudio;
  const effectiveMuted = hasSeparateAudio || j.isMuted || j.volume === 0;
  const playerIsPlaying = j.isPlaying && !j.platformPaused;

  // Manual start gate (Bilibili always; Niconico when its API is dead).
  // Reset happens via the key-based remount in SongDisplay (url change).
  const [gateConfirmed, setGateConfirmed] = useState(false);
  const [gateRequired, setGateRequired] = useState((MANUAL_START_PLATFORMS as readonly string[]).includes(platform));

  // Auto-skip broken videos: a jukebox must keep running — after a player
  // error (embed-disabled, deleted, geo-blocked…) advance to the next item.
  // jRef keeps the LATEST hook state so a stale timeout never skips a song
  // the user selected in the meantime.
  const jRef = useRef(j);
  jRef.current = j;
  const skipScheduledRef = useRef(false);
  const handleError = useCallback(() => {
    if (skipScheduledRef.current) return;
    skipScheduledRef.current = true;
    setTimeout(() => {
      skipScheduledRef.current = false;
      if (jRef.current.currentSong?.id === song.id) {
        jRef.current.playNext();
      }
    }, 3500);
  }, [song]);

  // Only video breaks take the player-reported duration (karaoke songs use
  // their TXT duration — the platform video may be longer than the song).
  const handleDuration = useCallback((seconds: number) => {
    if (isVideoBreak(song)) j.setDuration(seconds);
  }, [j, song]);

  const commonProps = {
    videoGap,
    onReady: () => {},
    onTimeUpdate: (time: number) => j.setYoutubeTime(time),
    onEnded: j.handleMediaEnd,
    onAdStart: () => j.setIsAdPlaying(true),
    onAdEnd: () => j.setIsAdPlaying(false),
    isPlaying: playerIsPlaying,
    startTime,
  };

  let player: React.ReactNode = null;
  if (platform === 'youtube') {
    const videoId = extractYouTubeId(url) || '';
    player = (
      <YouTubePlayer
        videoId={videoId}
        {...commonProps}
        muted={effectiveMuted}
        volume={j.volume}
        onDuration={handleDuration}
        interactive={j.isAdPlaying}
        onError={handleError}
      />
    );
  } else if (platform === 'rutube') {
    player = <RutubePlayer videoUrl={url} {...commonProps} muted={effectiveMuted} interactive={j.isAdPlaying} onError={handleError} />;
  } else if (platform === 'vk') {
    player = <VKPlayer videoUrl={url} {...commonProps} muted={effectiveMuted} interactive={j.isAdPlaying} onError={handleError} />;
  } else if (platform === 'dailymotion') {
    player = <DailymotionPlayer videoUrl={url} {...commonProps} muted={effectiveMuted} interactive={j.isAdPlaying} onError={handleError} />;
  } else if (platform === 'vimeo') {
    player = <VimeoPlayer videoUrl={url} {...commonProps} muted={effectiveMuted} interactive={j.isAdPlaying} onError={handleError} />;
  } else if (platform === 'bilibili') {
    player = <BilibiliPlayer videoUrl={url} {...commonProps} manualStartConfirmed={gateConfirmed} onError={handleError} />;
  } else if (platform === 'nicovideo') {
    player = (
      <NiconicoPlayer
        videoUrl={url}
        {...commonProps}
        manualStartConfirmed={gateConfirmed}
        onManualGateRequired={() => setGateRequired(true)}
        onError={handleError}
      />
    );
  }

  return (
    <>
      {player}
      {/* Manual start gate — "music is running" confirmation for platforms
          without a playback API (Bilibili) or with a dead API (Niconico). */}
      {gateRequired && !gateConfirmed && (
        <div className="absolute inset-x-0 top-14 z-20 flex justify-center px-4 pointer-events-none">
          <button
            onClick={() => setGateConfirmed(true)}
            className="pointer-events-auto px-4 py-2.5 rounded-xl bg-cyan-500/90 hover:bg-cyan-400 text-white text-sm font-semibold shadow-[0_0_25px_rgba(34,211,238,0.5)] border border-cyan-300/50 backdrop-blur-sm transition-all hover:scale-[1.02] active:scale-95 flex items-center gap-2"
          >
            <span aria-hidden>▶️</span>
            {t('jukeboxPlayer.gateStart')}
          </button>
        </div>
      )}
    </>
  );
}

// ==================== POOL SELECTOR (desktop player view) ====================

/** Inline pool/playlist switcher for the jukebox player view */
function PoolSelector({ j }: { j: UseJukeboxReturn }) {
  const { t } = useTranslation();
  const [selectedPlaylistId, setSelectedPlaylistId] = useState('');
  const [enqueueState, setEnqueueState] = useState<'idle' | 'busy' | 'done'>('idle');

  // Restore selection on mount
  useEffect(() => {
    const stored = getJson<string[] | null>(StorageKeys.JUKEBOX_PLAYLIST, null);
    if (stored && Array.isArray(stored) && stored.length > 0) {
      const playlists = getPlaylists();
      const match = playlists.find(p => !p.isSystem && JSON.stringify(p.songIds) === JSON.stringify(stored));
      if (match) setSelectedPlaylistId(match.id);
    }
  }, []);

  const handleChange = (playlistId: string) => {
    setSelectedPlaylistId(playlistId);
    if (!playlistId) {
      removeItem(StorageKeys.JUKEBOX_PLAYLIST);
    } else {
      const playlists = getPlaylists();
      const pl = playlists.find(p => p.id === playlistId);
      if (pl) setJson(StorageKeys.JUKEBOX_PLAYLIST, pl.songIds);
    }
    // Notify useJukebox to re-filter via custom event
    window.dispatchEvent(new CustomEvent('jukebox-pool-changed'));
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

  if (playlists.length === 0) return null;

  return (
    <div className="flex items-center gap-2">
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
    </div>
  );
}

// ==================== FULLSCREEN HEADER ====================

function FullscreenHeader({ j }: { j: UseJukeboxReturn }) {
  const { t } = useTranslation();
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
  const progress = j.duration > 0 ? j.currentTime / j.duration : 0;

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const fraction = (e.clientX - rect.left) / rect.width;
    j.seekTo(fraction);
  };

  return (
    <div className="flex items-center gap-3 w-full group/pb">
      <span className="text-white/60 text-xs font-mono w-10 text-right tabular-nums">
        {formatDurationSec(j.currentTime)}
      </span>
      <div
        className="flex-1 h-1.5 group-hover/pb:h-2.5 bg-white/15 rounded-full cursor-pointer group relative transition-all"
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
        {/* Filled portion with glow */}
        <div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-500 to-cyan-300 rounded-full shadow-[0_0_10px_rgba(34,211,238,0.5)] transition-colors"
          style={{ width: `${Math.max(0, Math.min(100, progress * 100))}%` }}
        />
        {/* Playhead dot */}
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-white rounded-full shadow-[0_0_12px_rgba(34,211,238,0.7)] scale-0 group-hover:scale-100 transition-transform"
          style={{ left: `${Math.max(0, Math.min(100, progress * 100))}%` }}
        />
      </div>
      <span className="text-white/60 text-xs font-mono w-10 tabular-nums">
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
        className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
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
        className="w-24 accent-cyan-500"
        aria-label="Volume"
      />
    </div>
  );
}

// ==================== VIDEO OVERLAY ====================

function VideoOverlay({ j }: { j: UseJukeboxReturn }) {
  const { t } = useTranslation();
  const videoBreak = isVideoBreak(j.currentSong);
  return (
    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent pt-16 p-6">
      {/* N8: Requester attribution as chip */}
      {j.currentSongRequestedBy && (
        <div className="inline-flex items-center gap-1.5 text-cyan-300/80 text-xs mb-2 bg-cyan-500/10 border border-cyan-500/25 rounded-full px-3 py-1 backdrop-blur-sm">
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
          </svg>
          {t('jukeboxPlayer.requestedBy').replace('{name}', j.currentSongRequestedBy)}
        </div>
      )}
      {/* Video break chip — marks a queued plain video link */}
      {videoBreak && (
        <div className="inline-flex items-center gap-1.5 text-fuchsia-300/90 text-xs mb-2 ml-2 bg-fuchsia-500/10 border border-fuchsia-400/30 rounded-full px-3 py-1 backdrop-blur-sm">
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <polygon points="5 3 19 12 5 21 5 3" strokeLinejoin="round" />
          </svg>
          {t('jukeboxPlayer.videoChip')}
        </div>
      )}
      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5 mb-0.5">
            <EqualizerBars
              active={j.isMediaPlaying && !j.isAdPlaying}
              bars={4}
              className="h-4"
              label={t('jukeboxPlayer.equalizerLabel')}
            />
            <p className="text-cyan-400 text-sm font-semibold tracking-widest">{t('jukeboxPlayer.nowPlaying')}</p>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-white truncate drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">{j.currentSong?.title ?? ''}</h2>
          <p className="text-white/70 text-lg truncate">{j.currentSong?.artist ?? ''}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {/* #19: Transition animation via opacity */}
          <button onClick={j.playPrevious} aria-label="Previous song" className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95">
            <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
            </svg>
          </button>
          <button onClick={j.togglePlayPause} aria-label={j.isMediaPlaying ? 'Pause' : 'Play'} className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-400 to-cyan-500 hover:from-cyan-300 hover:to-cyan-400 flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 shadow-[0_0_25px_rgba(34,211,238,0.45)]">
            {j.isLoading ? (
              <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : j.isMediaPlaying ? (
              <PauseIcon className="w-8 h-8 text-white" />
            ) : (
              <PlayIcon className="w-8 h-8 text-white ml-1" />
            )}
          </button>
          <button onClick={j.playNext} aria-label="Next song" className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95">
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

// ==================== PLAYLIST SIDEBAR ====================

function PlaylistSidebar({ j }: { j: UseJukeboxReturn }) {
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

// ==================== SONG DISPLAY ====================

/** #6 FIX: Extracted IIFE into proper component */
function SongDisplay({ j, videoRef, audioRef }: { j: UseJukeboxReturn; videoRef: React.RefObject<HTMLVideoElement | null>; audioRef: React.RefObject<HTMLAudioElement | null> }) {
  const { t } = useTranslation();
  const song = j.currentSong!;

  // Unified platform dispatch: ANY streaming-platform video URL (video break
  // OR karaoke song with #VIDEO) renders the matching platform player.
  const platformVideo = getSongPlatformVideo(song);

  return (
    <div className={j.isFullscreen ? 'flex-1 min-h-0' : 'flex-1'}>
      <Card className={`bg-black/50 border-white/10 overflow-hidden ${j.isFullscreen ? 'h-full rounded-none border-0' : ''}`}>
        <div className={`relative ${j.isFullscreen ? 'h-full' : 'aspect-video'}`}>
          {/* #19: Transition animation wrapper */}
          <div className="absolute inset-0 transition-opacity duration-300">

            {/* Streaming-platform video — YouTube/Dailymotion/Vimeo/Rutube/VK/Bilibili/Niconico.
                Key = url + restart counter: remounts on song change (resets the
                manual start gate) and on repeat-one restarts. */}
            {platformVideo ? (
              <JukeboxPlatformVideo key={`${platformVideo.url}|${j.platformRestartKey}`} j={j} song={song} platformVideo={platformVideo} />
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
              <div className="absolute inset-0 bg-gradient-to-br from-purple-600/30 to-fuchsia-600/30 flex items-center justify-center">
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
              <button onClick={j.toggleFullscreen} className="px-3.5 py-2 rounded-xl bg-black/60 hover:bg-black/80 backdrop-blur-sm text-white border border-white/10 hover:border-cyan-500/40 transition-all text-xs flex items-center gap-1.5">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                  <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                </svg>
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
                {j.isPlaying ? `${j.playlist.length} ${t('jukeboxPlayer.songsInPlaylist').replace('{n}', String(j.playlist.length))}` : t('jukeboxPlayer.sitBackEnjoy')}
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
