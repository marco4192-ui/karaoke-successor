'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { getAllSongsAsync } from '@/lib/game/song-library';
import { YouTubePlayer, extractYouTubeId } from '@/components/game/youtube-player';
import { Song } from '@/types/game';

// ===================== ICONS =====================
function PlayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function MusicIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  );
}

// ===================== JUKEBOX SCREEN =====================
export function JukeboxScreen() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [playlist, setPlaylist] = useState<Song[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [filterGenre, setFilterGenre] = useState<string>('all');
  const [filterArtist, setFilterArtist] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [shuffle, setShuffle] = useState(true);
  const [repeat, setRepeat] = useState<'none' | 'one' | 'all'>('all');
  // Custom YouTube video for Jukebox
  const [customYoutubeUrl, setCustomYoutubeUrl] = useState('');
  const [customYoutubeId, setCustomYoutubeId] = useState<string | null>(null);
  const [youtubeTime, setYoutubeTime] = useState(0);
  const [isAdPlaying, setIsAdPlaying] = useState(false);
  const [volume, setVolume] = useState(0.7);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hidePlaylist, setHidePlaylist] = useState(false); // Toggle to hide playlist in fullscreen
  const [showLyrics, setShowLyrics] = useState(false); // Sing-Along Mode: Show lyrics overlay
  const [currentLyricIndex, setCurrentLyricIndex] = useState(0); // Current lyric line index
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Load songs asynchronously with media URL restoration
  const [songs, setSongs] = useState<Song[]>([]);
  
  useEffect(() => {
    const loadSongs = async () => {
      const allSongs = await getAllSongsAsync();
      setSongs(allSongs);
    };
    loadSongs();
  }, []);
  
  // Get unique genres and artists
  const genres = useMemo(() => {
    const genreSet = new Set<string>();
    songs.forEach(s => {
      if (s.genre) genreSet.add(s.genre);
    });
    return ['all', ...Array.from(genreSet).sort()];
  }, [songs]);
  
  const artists = useMemo(() => {
    const artistSet = new Set<string>();
    songs.forEach(s => {
      if (s.artist) artistSet.add(s.artist);
    });
    return Array.from(artistSet).sort();
  }, [songs]);
  
  // Filter songs
  const filteredSongs = useMemo(() => {
    let filtered = songs;
    if (filterGenre !== 'all') {
      filtered = filtered.filter(s => s.genre === filterGenre);
    }
    if (filterArtist) {
      filtered = filtered.filter(s => s.artist === filterArtist);
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(s => 
        s.title.toLowerCase().includes(query) ||
        s.artist.toLowerCase().includes(query) ||
        s.album?.toLowerCase().includes(query)
      );
    }
    return filtered;
  }, [songs, filterGenre, filterArtist, searchQuery]);
  
  // Generate playlist
  const generatePlaylist = useCallback(() => {
    if (filteredSongs.length === 0) return;
    
    let newPlaylist = [...filteredSongs];
    if (shuffle) {
      // Fisher-Yates shuffle
      for (let i = newPlaylist.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newPlaylist[i], newPlaylist[j]] = [newPlaylist[j], newPlaylist[i]];
      }
    }
    setPlaylist(newPlaylist);
    setCurrentIndex(0);
    setCurrentSong(newPlaylist[0] || null);
  }, [filteredSongs, shuffle]);
  
  // Play next song
  const playNext = useCallback(() => {
    if (playlist.length === 0) return;
    
    let nextIndex = currentIndex + 1;
    
    if (nextIndex >= playlist.length) {
      if (repeat === 'all') {
        nextIndex = 0;
      } else {
        setIsPlaying(false);
        return;
      }
    }
    
    setCurrentIndex(nextIndex);
    setCurrentSong(playlist[nextIndex]);
  }, [playlist, currentIndex, repeat]);
  
  // Play previous song
  const playPrevious = useCallback(() => {
    if (playlist.length === 0) return;
    
    let prevIndex = currentIndex - 1;
    if (prevIndex < 0) {
      prevIndex = playlist.length - 1;
    }
    
    setCurrentIndex(prevIndex);
    setCurrentSong(playlist[prevIndex]);
  }, [playlist, currentIndex]);
  
  // Handle video end
  const handleMediaEnd = useCallback(() => {
    if (repeat === 'one' && currentSong) {
      // Restart current song
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
        videoRef.current.play();
      }
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play();
      }
    } else {
      playNext();
    }
  }, [repeat, currentSong, playNext]);
  
  // Start jukebox
  const startJukebox = () => {
    generatePlaylist();
    setIsPlaying(true);
  };
  
  // Stop jukebox
  const stopJukebox = () => {
    setIsPlaying(false);
    if (videoRef.current) {
      videoRef.current.pause();
    }
    if (audioRef.current) {
      audioRef.current.pause();
    }
  };
  
  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };
  
  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);
  
  // CRITICAL: Cleanup on unmount - stop all media when leaving Jukebox
  useEffect(() => {
    return () => {
      // Stop video - DON'T clear src, just pause and reset
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
      }
      // Stop audio - DON'T clear src, just pause and reset
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      // Clear playlist state
      setPlaylist([]);
      setCurrentSong(null);
      setCurrentIndex(0);
      setIsPlaying(false);
    };
  }, []);
  
  // Update volume
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume;
    }
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume, currentSong]);
  
  // Auto-play when song changes - FIXED: properly start audio/video playback
  useEffect(() => {
    if (isPlaying && currentSong) {
      // Small delay to allow refs to be set
      const playTimer = setTimeout(() => {
        // Determine if video has embedded audio (should play with sound)
        const videoHasEmbeddedAudio = currentSong.hasEmbeddedAudio || !currentSong.audioUrl;
        
        // Play video if available
        if (currentSong.videoBackground && videoRef.current) {
          videoRef.current.currentTime = 0;
          videoRef.current.play().catch(() => {});
        }
        
        // Play separate audio only if there's a dedicated audioUrl and video doesn't have embedded audio
        if (currentSong.audioUrl && !videoHasEmbeddedAudio && audioRef.current) {
          audioRef.current.currentTime = 0;
          audioRef.current.play().catch(() => {});
        }
      }, 100);
      return () => clearTimeout(playTimer);
    }
  }, [isPlaying, currentSong]);
  
  // Track current lyric line based on time (for Sing-Along Mode)
  useEffect(() => {
    if (!showLyrics || !currentSong || !currentSong.lyrics?.length) return;
    
    const updateCurrentLyric = () => {
      // Get current time from audio or video
      const currentTime = (audioRef.current?.currentTime || videoRef.current?.currentTime || 0) * 1000; // Convert to ms
      
      // Find the current lyric line
      for (let i = currentSong.lyrics.length - 1; i >= 0; i--) {
        if (currentTime >= currentSong.lyrics[i].startTime) {
          setCurrentLyricIndex(i);
          break;
        }
      }
    };
    
    const interval = setInterval(updateCurrentLyric, 100); // Update every 100ms
    return () => clearInterval(interval);
  }, [showLyrics, currentSong]);
  
  // Up next songs
  const upNext = useMemo(() => {
    return playlist.slice(currentIndex + 1, currentIndex + 6);
  }, [playlist, currentIndex]);
  
  
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
            {/* Sing-Along Mode: Lyrics Toggle */}
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
      
      {/* Search and Filters */}
      {!isPlaying && (
        <div className="mb-6 space-y-4">
          {/* Search */}
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <Input
              id="library-search"
              name="library-search"
              type="text"
              placeholder="Search songs, artists, albums..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/40"
            />
          </div>
          
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <select
              value={filterGenre}
              onChange={(e) => setFilterGenre(e.target.value)}
              className="bg-gray-800 border border-white/20 rounded-lg px-3 py-2 text-white appearance-none cursor-pointer hover:border-cyan-500/50"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='white'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center', backgroundSize: '16px', paddingRight: '32px' }}
            >
              {genres.map(g => (
                <option key={g} value={g} className="bg-gray-800 text-white">{g === 'all' ? 'All Genres' : g}</option>
              ))}
            </select>
            
            <select
              value={filterArtist}
              onChange={(e) => setFilterArtist(e.target.value)}
              className="bg-gray-800 border border-white/20 rounded-lg px-3 py-2 text-white appearance-none cursor-pointer hover:border-cyan-500/50"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='white'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center', backgroundSize: '16px', paddingRight: '32px' }}
            >
              <option value="" className="bg-gray-800 text-white">All Artists</option>
              {artists.map(a => (
                <option key={a} value={a} className="bg-gray-800 text-white">{a}</option>
              ))}
            </select>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShuffle(!shuffle)}
                className={`p-2 rounded-lg transition-colors ${shuffle ? 'bg-cyan-500 text-white' : 'bg-white/5 text-white/60 hover:text-white'}`}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />
                </svg>
              </button>
            </div>
          </div>
          
          {/* Song count and start button */}
          <div className="flex items-center justify-between">
            <p className="text-white/60">{filteredSongs.length} songs found</p>
            <Button
              onClick={startJukebox}
              disabled={filteredSongs.length === 0}
              className="bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50"
            >
              <PlayIcon className="w-4 h-4 mr-2" /> Start Jukebox
            </Button>
          </div>
        </div>
      )}
      
      {/* Now Playing / Setup */}
      {isPlaying && currentSong ? (
        <div className={`flex-1 flex ${isFullscreen ? 'flex-row' : 'flex-col space-y-6'}`}>
          {/* Video Player */}
          <div className={`${isFullscreen ? (hidePlaylist ? 'flex-1' : 'w-[75%] h-full') : 'flex-1'}`}>
            <Card className={`bg-black/50 border-white/10 overflow-hidden ${isFullscreen ? 'h-full rounded-none' : ''}`}>
              <div className={`relative ${isFullscreen ? 'h-full' : 'aspect-video'}`}>
                {/* Video Background */}
                {/* Custom YouTube video takes priority */}
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
                    // Mute video only if there's a separate audio file AND video doesn't have embedded audio
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
                {/* Only render separate audio if there's an audioUrl and it's NOT the same as videoBackground */}
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
                      {/* Previous line (faded) */}
                      {currentLyricIndex > 0 && (
                        <p className="text-white/40 text-lg md:text-xl mb-2 transition-opacity">
                          {currentSong.lyrics[currentLyricIndex - 1]?.text}
                        </p>
                      )}
                      {/* Current line (highlighted) */}
                      <p className="text-white text-2xl md:text-4xl font-bold drop-shadow-lg animate-pulse">
                        {currentSong.lyrics[currentLyricIndex]?.text}
                      </p>
                      {/* Next line (faded) */}
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
                          onClick={() => {
                            if (videoRef.current) {
                              if (videoRef.current.paused) {
                                videoRef.current.play();
                              } else {
                                videoRef.current.pause();
                              }
                            }
                            if (audioRef.current) {
                              if (audioRef.current.paused) {
                                audioRef.current.play();
                              } else {
                                audioRef.current.pause();
                              }
                            }
                          }}
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
                            setCurrentIndex(songIndex);
                            setCurrentSong(playlist[songIndex]);
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
      ) : (
        /* Setup Screen */
        <div className="space-y-6">
          {/* Filter Options */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle>Playlist Settings</CardTitle>
              <CardDescription>Customize your music experience</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Genre Filter */}
              <div>
                <label className="text-sm text-white/60 mb-2 block">Filter by Genre</label>
                <select
                  value={filterGenre}
                  onChange={(e) => setFilterGenre(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white"
                >
                  {genres.map(genre => (
                    <option key={genre} value={genre}>
                      {genre === 'all' ? 'All Genres' : genre}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Artist Filter */}
              <div>
                <label className="text-sm text-white/60 mb-2 block">Filter by Artist</label>
                <select
                  value={filterArtist}
                  onChange={(e) => setFilterArtist(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white"
                >
                  <option value="">All Artists</option>
                  {artists.map(artist => (
                    <option key={artist} value={artist}>{artist}</option>
                  ))}
                </select>
              </div>
              
              {/* Options */}
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={shuffle}
                    onChange={(e) => setShuffle(e.target.checked)}
                    className="w-4 h-4 accent-cyan-500"
                  />
                  <span className="text-white">Shuffle</span>
                </label>
                
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="repeat"
                    checked={repeat === 'none'}
                    onChange={() => setRepeat('none')}
                    className="w-4 h-4 accent-cyan-500"
                  />
                  <span className="text-white">No Repeat</span>
                </label>
                
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="repeat"
                    checked={repeat === 'all'}
                    onChange={() => setRepeat('all')}
                    className="w-4 h-4 accent-cyan-500"
                  />
                  <span className="text-white">Repeat All</span>
                </label>
                
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="repeat"
                    checked={repeat === 'one'}
                    onChange={() => setRepeat('one')}
                    className="w-4 h-4 accent-cyan-500"
                  />
                  <span className="text-white">Repeat One</span>
                </label>
              </div>
              
              {/* Song count */}
              <div className="text-center py-4 bg-white/5 rounded-lg">
                <p className="text-2xl font-bold text-cyan-400">{filteredSongs.length}</p>
                <p className="text-white/60 text-sm">songs available</p>
              </div>
            </CardContent>
          </Card>
          
          {/* Start Button */}
          <Button
            onClick={startJukebox}
            disabled={filteredSongs.length === 0}
            className="w-full py-6 text-lg bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-white"
          >
            <PlayIcon className="w-6 h-6 mr-2" /> Start Jukebox
          </Button>
          
          {filteredSongs.length === 0 && (
            <p className="text-center text-white/60">
              No songs match your filters. Try different settings or import some songs.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
