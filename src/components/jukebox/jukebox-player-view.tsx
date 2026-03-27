'use client';

import React, { RefObject } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { YouTubePlayer, extractYouTubeId } from '@/components/game/youtube-player';
import { PlayIcon, MusicIcon } from '@/components/icons';
import { Song } from '@/types/game';

export interface JukeboxPlayerViewProps {
  // Current song
  currentSong: Song | null;

  // Playlist
  playlist: Song[];
  upNext: Song[];

  // State
  isPlaying: boolean;
  isFullscreen: boolean;
  hidePlaylist: boolean;
  showLyrics: boolean;
  currentLyricIndex: number;
  volume: number;
  shuffle: boolean;
  repeat: 'none' | 'all' | 'one';
  customYoutubeId: string | null;
  youtubeTime: number;
  isAdPlaying: boolean;

  // Refs
  videoRef: RefObject<HTMLVideoElement | null>;
  audioRef: RefObject<HTMLAudioElement | null>;

  // Actions
  playNext: () => void;
  playPrevious: () => void;
  playSongAtIndex: (index: number) => void;
  handleMediaEnd: () => void;
  stopJukebox: () => void;
  toggleFullscreen: () => void;
  togglePlayPause: () => void;
  setShuffle: (value: boolean) => void;
  setRepeat: (value: 'none' | 'all' | 'one') => void;
  setVolume: (value: number) => void;
  setShowLyrics: (value: boolean) => void;
  setHidePlaylist: (value: boolean) => void;
  setYoutubeTime: (value: number) => void;
  setIsAdPlaying: (value: boolean) => void;
}

export function JukeboxPlayerView({
  currentSong,
  playlist,
  upNext,
  isPlaying,
  isFullscreen,
  hidePlaylist,
  showLyrics,
  currentLyricIndex,
  volume,
  shuffle,
  repeat,
  customYoutubeId,
  youtubeTime,
  isAdPlaying,
  videoRef,
  audioRef,
  playNext,
  playPrevious,
  playSongAtIndex,
  handleMediaEnd,
  stopJukebox,
  toggleFullscreen,
  togglePlayPause,
  setShuffle,
  setRepeat,
  setVolume,
  setShowLyrics,
  setHidePlaylist,
  setYoutubeTime,
  setIsAdPlaying,
}: JukeboxPlayerViewProps) {
  if (!currentSong) return null;

  return (
    <div className={`flex-1 flex ${isFullscreen ? 'flex-row' : 'flex-col space-y-6'}`}>
      {/* Video Player */}
      <div className={`${isFullscreen ? (hidePlaylist ? 'flex-1' : 'w-[75%] h-full') : 'flex-1'}`}>
        <Card className={`bg-black/50 border-white/10 overflow-hidden ${isFullscreen ? 'h-full rounded-none' : ''}`}>
          <div className={`relative ${isFullscreen ? 'h-full' : 'aspect-video'}`}>
            {/* Video Background */}
            {customYoutubeId ? (
              <YouTubePlayer
                videoId={customYoutubeId}
                videoGap={0}
                onReady={() => {}}
                onTimeUpdate={(time) => setYoutubeTime(time)}
                onEnded={handleMediaEnd}
                onAdStart={() => setIsAdPlaying(true)}
                onAdEnd={() => setIsAdPlaying(false)}
                isPlaying={isPlaying}
                startTime={0}
              />
            ) : currentSong.videoBackground ? (
              <video
                ref={videoRef}
                src={currentSong.videoBackground}
                className="absolute inset-0 w-full h-full object-cover"
                muted={!!currentSong.audioUrl && !currentSong.hasEmbeddedAudio}
                loop={false}
                onEnded={handleMediaEnd}
                playsInline
              />
            ) : currentSong.youtubeUrl ? (
              <iframe
                src={`https://www.youtube.com/embed/${extractYouTubeId(currentSong.youtubeUrl)}?autoplay=1&mute=0&controls=0&showinfo=0&rel=0`}
                className="absolute inset-0 w-full h-full"
                allow="autoplay; encrypted-media"
                allowFullScreen
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-purple-600/30 to-blue-600/30 flex items-center justify-center">
                {currentSong.coverImage ? (
                  <img src={currentSong.coverImage} alt={currentSong.title} className="max-h-full max-w-full object-contain" />
                ) : (
                  <MusicIcon className="w-32 h-32 text-white/30" />
                )}
              </div>
            )}

            {/* Audio element for songs with separate audio file */}
            {currentSong.audioUrl && !currentSong.hasEmbeddedAudio && (
              <audio
                ref={audioRef}
                src={currentSong.audioUrl}
                onEnded={handleMediaEnd}
              />
            )}

            {/* Sing-Along Mode: Lyrics Overlay */}
            {showLyrics && currentSong.lyrics && currentSong.lyrics.length > 0 && (
              <div className="absolute inset-0 flex items-end justify-center pb-24 pointer-events-none">
                <div className="text-center max-w-4xl px-8">
                  {currentLyricIndex > 0 && (
                    <p className="text-white/40 text-lg md:text-xl mb-2 transition-opacity">
                      {currentSong.lyrics[currentLyricIndex - 1]?.text}
                    </p>
                  )}
                  <p className="text-white text-2xl md:text-4xl font-bold drop-shadow-lg animate-pulse">
                    {currentSong.lyrics[currentLyricIndex]?.text}
                  </p>
                  {currentLyricIndex < currentSong.lyrics.length - 1 && (
                    <p className="text-white/40 text-lg md:text-xl mt-2 transition-opacity">
                      {currentSong.lyrics[currentLyricIndex + 1]?.text}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Overlay with song info - only show in non-fullscreen */}
            {!isFullscreen && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-6">
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-cyan-400 text-sm font-medium">NOW PLAYING</p>
                    <h2 className="text-3xl font-bold text-white">{currentSong.title}</h2>
                    <p className="text-white/70 text-lg">{currentSong.artist}</p>
                  </div>

                  {/* Controls */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={playPrevious}
                      className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                    >
                      <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
                      </svg>
                    </button>

                    <button
                      onClick={togglePlayPause}
                      className="w-16 h-16 rounded-full bg-cyan-500 hover:bg-cyan-400 flex items-center justify-center transition-colors"
                    >
                      <PlayIcon className="w-8 h-8 text-white ml-1" />
                    </button>

                    <button
                      onClick={playNext}
                      className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                    >
                      <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Fullscreen button in normal mode */}
            {!isFullscreen && (
              <button
                onClick={toggleFullscreen}
                className="absolute top-4 right-4 p-2 rounded-lg bg-black/50 hover:bg-black/70 text-white transition-colors"
              >
                ⤢ Fullscreen
              </button>
            )}
          </div>
        </Card>
      </div>

      {/* Controls Bar - only in normal mode */}
      {!isFullscreen && (
        <div className="flex items-center justify-between bg-white/5 rounded-xl p-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShuffle(!shuffle)}
              className={`p-2 rounded-lg transition-colors ${shuffle ? 'bg-cyan-500 text-white' : 'text-white/60 hover:text-white'}`}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />
              </svg>
            </button>

            <button
              onClick={() => setRepeat(repeat === 'none' ? 'all' : repeat === 'all' ? 'one' : 'none')}
              className={`p-2 rounded-lg transition-colors ${repeat !== 'none' ? 'bg-cyan-500 text-white' : 'text-white/60 hover:text-white'}`}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 1l4 4-4 4" />
                <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                <path d="M7 23l-4-4 4-4" />
                <path d="M21 13v2a4 4 0 0 1-4 4H3" />
              </svg>
              {repeat === 'one' && <span className="absolute text-xs">1</span>}
            </button>

            {/* Sing-Along Mode: Show Lyrics Toggle */}
            <button
              onClick={() => setShowLyrics(!showLyrics)}
              className={`p-2 rounded-lg transition-colors flex items-center gap-1 ${showLyrics ? 'bg-purple-500 text-white' : 'text-white/60 hover:text-white'}`}
              title="Sing-Along Mode: Show Lyrics"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 18V5l12-2v13" />
                <circle cx="6" cy="18" r="3" />
                <circle cx="18" cy="16" r="3" />
              </svg>
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
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="w-24 accent-cyan-500"
            />
          </div>

          <Button variant="outline" onClick={stopJukebox} className="border-red-500/50 text-red-400 hover:bg-red-500/10">
            Stop Jukebox
          </Button>
        </div>
      )}

      {/* Playlist Sidebar - in fullscreen mode combined with controls */}
      {upNext.length > 0 && !hidePlaylist && (
        <div className={`${isFullscreen ? 'w-[25%] h-full flex flex-col bg-black/80' : ''}`}>
          <Card className={`bg-white/5 border-white/10 ${isFullscreen ? 'flex-1 rounded-none border-0 flex flex-col' : ''}`}>
            <CardHeader className={isFullscreen ? 'pb-2 border-b border-white/10' : ''}>
              <CardTitle className="text-lg flex items-center justify-between">
                Up Next
                {isFullscreen && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShuffle(!shuffle)}
                      className={`p-1.5 rounded transition-colors ${shuffle ? 'bg-cyan-500 text-white' : 'text-white/60 hover:text-white'}`}
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />
                      </svg>
                    </button>
                  </div>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className={isFullscreen ? 'flex-1 overflow-y-auto p-2' : ''}>
              <div className="space-y-2">
                {upNext.map((song, index) => (
                  <button
                    key={song.id}
                    onClick={() => {
                      const songIndex = playlist.findIndex(s => s.id === song.id);
                      if (songIndex !== -1) {
                        playSongAtIndex(songIndex);
                      }
                    }}
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
            {isFullscreen && (
              <div className="p-3 border-t border-white/10 space-y-3">
                {/* Volume */}
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-white/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
                  </svg>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={volume}
                    onChange={(e) => setVolume(parseFloat(e.target.value))}
                    className="flex-1 accent-cyan-500"
                  />
                </div>
                {/* Stop button */}
                <Button variant="outline" onClick={stopJukebox} className="w-full border-red-500/50 text-red-400 hover:bg-red-500/10">
                  Stop Jukebox
                </Button>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
