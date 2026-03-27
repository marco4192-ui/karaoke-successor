'use client';

import React, { useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useJukeboxState } from '@/hooks/use-jukebox-state';
import { useJukeboxMedia } from '@/hooks/use-jukebox-media';
import { JukeboxSetupView } from '@/components/jukebox/jukebox-setup-view';
import { JukeboxPlayerView } from '@/components/jukebox/jukebox-player-view';

// ===================== JUKEBOX SCREEN =====================
export function JukeboxScreen() {
  // Use custom hook for state management
  const {
    // Playlist management
    playlist,
    currentSong,
    shuffle,
    repeat,
    upNext,
    setShuffle,
    setRepeat,
    generatePlaylist,
    playNext,
    playPrevious,
    playSongAtIndex,
    clearPlaylist,

    // Filters
    filterGenre,
    setFilterGenre,
    filterArtist,
    setFilterArtist,
    searchQuery,
    setSearchQuery,

    // YouTube custom video
    customYoutubeId,
    setCustomYoutubeId,

    // Media state
    youtubeTime,
    setYoutubeTime,
    isAdPlaying,
    setIsAdPlaying,

    // View state
    isFullscreen,
    setIsFullscreen,
    hidePlaylist,
    setHidePlaylist,
    showLyrics,
    setShowLyrics,
    currentLyricIndex,
    setCurrentLyricIndex,

    // Container ref
    containerRef,

    // Songs data
    genres,
    artists,
    filteredSongs,
  } = useJukeboxState();

  // Use custom hook for media management
  const {
    videoRef,
    audioRef,
    volume,
    isPlaying,
    setVolume,
    play,
    pause,
    stop,
    playSong,
  } = useJukeboxMedia({
    onMediaEnd: () => {
      if (repeat === 'one' && currentSong) {
        playSong(currentSong);
      } else {
        playNext();
      }
    },
  });

  // Start jukebox with filtered songs
  const startJukebox = useCallback(() => {
    if (filteredSongs.length === 0) return;
    generatePlaylist(filteredSongs);
  }, [filteredSongs, generatePlaylist]);

  // Stop jukebox
  const stopJukebox = useCallback(() => {
    stop();
    clearPlaylist();
  }, [stop, clearPlaylist]);

  // Toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, [containerRef, setIsFullscreen]);

  // Toggle play/pause
  const togglePlayPause = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, play, pause]);

  // Auto-play when song changes
  useEffect(() => {
    if (currentSong) {
      playSong(currentSong);
    }
  }, [currentSong, playSong]);

  // Track current lyric line based on time (for Sing-Along Mode)
  useEffect(() => {
    if (!showLyrics || !currentSong || !currentSong.lyrics?.length) return;

    const updateCurrentLyric = () => {
      const currentTime = (audioRef.current?.currentTime || videoRef.current?.currentTime || 0) * 1000;

      for (let i = currentSong.lyrics.length - 1; i >= 0; i--) {
        if (currentTime >= currentSong.lyrics[i].startTime) {
          setCurrentLyricIndex(i);
          break;
        }
      }
    };

    const interval = setInterval(updateCurrentLyric, 100);
    return () => clearInterval(interval);
  }, [showLyrics, currentSong, setCurrentLyricIndex, videoRef, audioRef]);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [setIsFullscreen]);

  // Handle media end for player view
  const handleMediaEnd = useCallback(() => {
    if (repeat === 'one' && currentSong) {
      playSong(currentSong);
    } else {
      playNext();
    }
  }, [repeat, currentSong, playSong, playNext]);

  return (
    <div ref={containerRef} className={`max-w-6xl mx-auto ${isFullscreen ? 'fixed inset-0 z-50 bg-black flex' : ''}`}>
      {/* Fullscreen Header Overlay */}
      {isFullscreen && (
        <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/80 to-transparent p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-cyan-400 text-sm font-medium">NOW PLAYING</span>
            <h2 className="text-xl font-bold text-white">{currentSong?.title}</h2>
            <span className="text-white/60">{currentSong?.artist}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setShowLyrics(!showLyrics)}
              className={`border-white/20 ${showLyrics ? 'bg-purple-500/50 border-purple-500' : 'text-white'}`}
            >
              🎤 Lyrics
            </Button>
            <Button
              variant="outline"
              onClick={() => setHidePlaylist(!hidePlaylist)}
              className="border-white/20 text-white"
            >
              {hidePlaylist ? '📖 Show Playlist' : '📖 Hide Playlist'}
            </Button>
            <Button variant="outline" onClick={toggleFullscreen} className="border-white/20 text-white">
              ⤓ Exit Fullscreen
            </Button>
          </div>
        </div>
      )}

      {/* Normal mode header */}
      {!isFullscreen && (
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">🎵 Jukebox Mode</h1>
          <p className="text-white/60">
            {isPlaying ? `${playlist.length} songs in playlist` : 'Sit back and enjoy the music!'}
          </p>
        </div>
      )}

      {/* Now Playing / Setup */}
      {isPlaying && currentSong ? (
        <JukeboxPlayerView
          currentSong={currentSong}
          playlist={playlist}
          upNext={upNext}
          isPlaying={isPlaying}
          isFullscreen={isFullscreen}
          hidePlaylist={hidePlaylist}
          showLyrics={showLyrics}
          currentLyricIndex={currentLyricIndex}
          volume={volume}
          shuffle={shuffle}
          repeat={repeat}
          customYoutubeId={customYoutubeId}
          youtubeTime={youtubeTime}
          isAdPlaying={isAdPlaying}
          videoRef={videoRef}
          audioRef={audioRef}
          playNext={playNext}
          playPrevious={playPrevious}
          playSongAtIndex={playSongAtIndex}
          handleMediaEnd={handleMediaEnd}
          stopJukebox={stopJukebox}
          toggleFullscreen={toggleFullscreen}
          togglePlayPause={togglePlayPause}
          setShuffle={setShuffle}
          setRepeat={setRepeat}
          setVolume={setVolume}
          setShowLyrics={setShowLyrics}
          setHidePlaylist={setHidePlaylist}
          setYoutubeTime={setYoutubeTime}
          setIsAdPlaying={setIsAdPlaying}
        />
      ) : (
        <JukeboxSetupView
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          filterGenre={filterGenre}
          setFilterGenre={setFilterGenre}
          filterArtist={filterArtist}
          setFilterArtist={setFilterArtist}
          shuffle={shuffle}
          setShuffle={setShuffle}
          repeat={repeat}
          setRepeat={setRepeat}
          genres={genres}
          artists={artists}
          filteredSongs={filteredSongs}
          startJukebox={startJukebox}
        />
      )}
    </div>
  );
}
