'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ensureSongUrls, getSongByIdWithLyrics } from '@/lib/game/song-library';
import { YouTubePlayer, extractYouTubeId } from '@/components/game/youtube-player';
import { PlayIcon, MusicIcon } from '@/components/icons';
import type { UseJukeboxReturn } from './jukebox-types';

/** Fullscreen header overlay */
function FullscreenHeader({ j }: { j: UseJukeboxReturn }) {
  return (
    <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/80 to-transparent p-4 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <span className="text-cyan-400 text-sm font-medium">NOW PLAYING</span>
        <h2 className="text-xl font-bold text-white">{j.currentSong?.title}</h2>
        <span className="text-white/60">{j.currentSong?.artist}</span>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          onClick={() => j.setShowLyrics(!j.showLyrics)}
          className={`border-white/20 ${j.showLyrics ? 'bg-purple-500/50 border-purple-500' : 'text-white'}`}
        >
          🎤 Lyrics
        </Button>
        <Button
          variant="outline"
          onClick={() => j.setHidePlaylist(!j.hidePlaylist)}
          className="border-white/20 text-white"
        >
          {j.hidePlaylist ? '📖 Show Playlist' : '📖 Hide Playlist'}
        </Button>
        <Button variant="outline" onClick={j.toggleFullscreen} className="border-white/20 text-white">
          ⤓ Exit Fullscreen
        </Button>
      </div>
    </div>
  );
}

/** Lyrics overlay for sing-along mode */
function LyricsOverlay({ j }: { j: UseJukeboxReturn }) {
  if (!j.showLyrics) return null;
  if (!j.currentSong?.lyrics?.length) return null;
  const lyrics = j.currentSong.lyrics;
  const currentText = lyrics[j.currentLyricIndex]?.text;
  const prevText = j.currentLyricIndex > 0 ? lyrics[j.currentLyricIndex - 1]?.text : null;
  const nextText = j.currentLyricIndex < lyrics.length - 1 ? lyrics[j.currentLyricIndex + 1]?.text : null;

  // Don't render if all relevant texts are empty
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

/** Song info + controls overlay at bottom of video (normal mode) */
function VideoOverlay({ j }: { j: UseJukeboxReturn }) {
  return (
    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-6">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-cyan-400 text-sm font-medium">NOW PLAYING</p>
          <h2 className="text-3xl font-bold text-white">{j.currentSong!.title}</h2>
          <p className="text-white/70 text-lg">{j.currentSong!.artist}</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={j.playPrevious} className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
            <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
            </svg>
          </button>
          <button onClick={j.togglePlayPause} className="w-16 h-16 rounded-full bg-cyan-500 hover:bg-cyan-400 flex items-center justify-center transition-colors">
            <PlayIcon className="w-8 h-8 text-white ml-1" />
          </button>
          <button onClick={j.playNext} className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
            <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

/** Controls bar (shuffle, repeat, lyrics, volume, stop) in normal mode */
function ControlsBar({ j }: { j: UseJukeboxReturn }) {
  return (
    <div className="flex items-center justify-between bg-white/5 rounded-xl p-4">
      <div className="flex items-center gap-4">
        <button
          onClick={() => j.setShuffle(!j.shuffle)}
          className={`p-2 rounded-lg transition-colors ${j.shuffle ? 'bg-cyan-500 text-white' : 'text-white/60 hover:text-white'}`}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />
          </svg>
        </button>

        <button
          onClick={() => j.setRepeat(j.repeat === 'none' ? 'all' : j.repeat === 'all' ? 'one' : 'none')}
          className={`p-2 rounded-lg transition-colors ${j.repeat !== 'none' ? 'bg-cyan-500 text-white' : 'text-white/60 hover:text-white'}`}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 1l4 4-4 4" />
            <path d="M3 11V9a4 4 0 0 1 4-4h14" />
            <path d="M7 23l-4-4 4-4" />
            <path d="M21 13v2a4 4 0 0 1-4 4H3" />
          </svg>
          {j.repeat === 'one' && <span className="absolute text-xs">1</span>}
        </button>

        <button
          onClick={() => j.setShowLyrics(!j.showLyrics)}
          className={`p-2 rounded-lg transition-colors flex items-center gap-1 ${j.showLyrics ? 'bg-purple-500 text-white' : 'text-white/60 hover:text-white'}`}
          title="Sing-Along Mode: Show Lyrics"
        >
          <MusicIcon className="w-5 h-5" />
          <span className="text-xs">Lyrics</span>
        </button>
      </div>

      {/* Volume */}
      <div className="flex items-center gap-3">
        <svg className="w-5 h-5 text-white/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
        </svg>
        <input
          type="range" min="0" max="1" step="0.1"
          value={j.volume}
          onChange={(e) => j.setVolume(parseFloat(e.target.value))}
          className="w-24 accent-cyan-500"
        />
      </div>

      <Button variant="outline" onClick={j.stopJukebox} className="border-red-500/50 text-red-400 hover:bg-red-500/10">
        Stop Jukebox
      </Button>
    </div>
  );
}

/** Playlist sidebar (Up Next) */
function PlaylistSidebar({ j }: { j: UseJukeboxReturn }) {
  if (j.upNext.length === 0 || j.hidePlaylist) return null;

  const handleSongClick = async (songId: string) => {
    const songIndex = j.playlist.findIndex(s => s.id === songId);
    if (songIndex !== -1) {
      const preparedSong = await getSongByIdWithLyrics(songId) || await ensureSongUrls(j.playlist[songIndex]);
      j.setCurrentIndex(songIndex);
      j.setCurrentSong(preparedSong);
    }
  };

  return (
    <div className={`${j.isFullscreen ? 'w-[25%] h-full flex flex-col bg-black/80' : ''}`}>
      <Card className={`bg-white/5 border-white/10 ${j.isFullscreen ? 'flex-1 rounded-none border-0 flex flex-col' : ''}`}>
        <CardHeader className={j.isFullscreen ? 'pb-2 border-b border-white/10' : ''}>
          <CardTitle className="text-lg flex items-center justify-between">
            Up Next
            {j.isFullscreen && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => j.setShuffle(!j.shuffle)}
                  className={`p-1.5 rounded transition-colors ${j.shuffle ? 'bg-cyan-500 text-white' : 'text-white/60 hover:text-white'}`}
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />
                  </svg>
                </button>
              </div>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className={j.isFullscreen ? 'flex-1 overflow-y-auto p-2' : ''}>
          <div className="space-y-2">
            {j.upNext.map((song, index) => (
              <button
                key={song.id}
                onClick={() => handleSongClick(song.id)}
                className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-white/10 transition-colors text-left"
              >
                <span className="text-white/40 w-5 text-center text-sm">{index + 1}</span>
                <div className="w-10 h-10 rounded bg-gradient-to-br from-purple-600/50 to-blue-600/50 overflow-hidden flex-shrink-0">
                  {song.coverImage ? (
                    <img src={song.coverImage} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <MusicIcon className="w-5 h-5 text-white/30" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate text-sm">{song.title}</p>
                  <p className="text-white/60 text-xs truncate">{song.artist}</p>
                </div>
                <span className="text-white/40 text-xs">
                  {Math.floor(song.duration / 60000)}:{String(Math.floor((song.duration % 60000) / 1000)).padStart(2, '0')}
                </span>
              </button>
            ))}
          </div>
        </CardContent>

        {/* Fullscreen mode controls at bottom of playlist */}
        {j.isFullscreen && (
          <div className="p-3 border-t border-white/10 space-y-3">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-white/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
              </svg>
              <input
                type="range" min="0" max="1" step="0.1"
                value={j.volume}
                onChange={(e) => j.setVolume(parseFloat(e.target.value))}
                className="flex-1 accent-cyan-500"
              />
            </div>
            <Button variant="outline" onClick={j.stopJukebox} className="w-full border-red-500/50 text-red-400 hover:bg-red-500/10">
              Stop Jukebox
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}

/** Main player view component */
export function JukeboxPlayerView({ j }: { j: UseJukeboxReturn }) {
  return (
    <>
      {j.isFullscreen && <FullscreenHeader j={j} />}

      {/* Normal mode header */}
      {!j.isFullscreen && (
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">🎵 Jukebox Mode</h1>
          <p className="text-white/60">
            {j.isPlaying ? `${j.playlist.length} songs in playlist` : 'Sit back and enjoy the music!'}
          </p>
        </div>
      )}

      <div className={`flex-1 flex ${j.isFullscreen ? 'flex-row' : 'flex-col space-y-6'}`}>
        {/* Video Player */}
        <div className={`${j.isFullscreen ? (j.hidePlaylist ? 'flex-1' : 'w-[75%] h-full') : 'flex-1'}`}>
          <Card className={`bg-black/50 border-white/10 overflow-hidden ${j.isFullscreen ? 'h-full rounded-none' : ''}`}>
            <div className={`relative ${j.isFullscreen ? 'h-full' : 'aspect-video'}`}>
              {/* Video Background */}
              {j.customYoutubeId ? (
                <YouTubePlayer
                  videoId={j.customYoutubeId}
                  videoGap={0}
                  onReady={() => {}}
                  onTimeUpdate={(time) => j.setYoutubeTime(time)}
                  onEnded={j.handleMediaEnd}
                  onAdStart={() => j.setIsAdPlaying(true)}
                  onAdEnd={() => j.setIsAdPlaying(false)}
                  isPlaying={j.isPlaying}
                  startTime={0}
                />
              ) : j.currentSong!.youtubeUrl ? (
                <YouTubePlayer
                  videoId={extractYouTubeId(j.currentSong!.youtubeUrl) || ''}
                  videoGap={j.currentSong!.videoGap || 0}
                  onReady={() => {}}
                  onTimeUpdate={(time) => j.setYoutubeTime(time)}
                  onEnded={j.handleMediaEnd}
                  onAdStart={() => j.setIsAdPlaying(true)}
                  onAdEnd={() => j.setIsAdPlaying(false)}
                  isPlaying={j.isPlaying}
                  startTime={0}
                />
              ) : j.currentSong!.videoBackground ? (
                <video
                  ref={j.videoRef}
                  src={j.currentSong!.videoBackground}
                  className="absolute inset-0 w-full h-full object-cover"
                  muted={!!j.currentSong!.audioUrl && !j.currentSong!.hasEmbeddedAudio}
                  loop={false}
                  onEnded={j.handleMediaEnd}
                  playsInline
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-purple-600/30 to-blue-600/30 flex items-center justify-center">
                  {j.currentSong!.coverImage ? (
                    <img src={j.currentSong!.coverImage} alt={j.currentSong!.title} className="max-h-full max-w-full object-contain" />
                  ) : (
                    <MusicIcon className="w-32 h-32 text-white/30" />
                  )}
                </div>
              )}

              {/* Audio element for songs with separate audio file */}
              {j.currentSong!.audioUrl && !j.currentSong!.hasEmbeddedAudio && (
                <audio ref={j.audioRef} src={j.currentSong!.audioUrl} onEnded={j.handleMediaEnd} />
              )}

              <LyricsOverlay j={j} />

              {/* Song info + controls (normal mode only) */}
              {!j.isFullscreen && <VideoOverlay j={j} />}

              {/* Fullscreen button (normal mode) */}
              {!j.isFullscreen && (
                <button onClick={j.toggleFullscreen} className="absolute top-4 right-4 p-2 rounded-lg bg-black/50 hover:bg-black/70 text-white transition-colors">
                  ⤢ Fullscreen
                </button>
              )}
            </div>
          </Card>
        </div>

        {/* Controls Bar (normal mode) */}
        {!j.isFullscreen && <ControlsBar j={j} />}

        {/* Playlist Sidebar */}
        <PlaylistSidebar j={j} />
      </div>
    </>
  );
}
