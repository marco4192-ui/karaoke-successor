'use client';

import { Card } from '@/components/ui/card';
import { MusicIcon } from '@/components/icons';
import { useTranslation } from '@/lib/i18n/translations';
import type { UseJukeboxReturn } from '../jukebox-types';
import { getSongPlatformVideo } from '../video-break';
import { JukeboxPlatformVideo } from './jukebox-platform-video';
import { LyricsOverlay } from './lyrics-overlay';
import { VideoOverlay } from './video-overlay';

// ==================== SONG DISPLAY ====================

/** #6 FIX: Extracted IIFE into proper component */
export function SongDisplay({ j, videoRef, audioRef }: { j: UseJukeboxReturn; videoRef: React.RefObject<HTMLVideoElement | null>; audioRef: React.RefObject<HTMLAudioElement | null> }) {
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
