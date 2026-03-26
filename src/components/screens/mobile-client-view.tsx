'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/lib/api-client';
import { useMobileMicrophone } from '@/hooks/use-mobile-microphone';
import { useMobileConnection, MobileGameState } from '@/hooks/use-mobile-connection';
import { useMobileProfile, MobileProfile } from '@/hooks/use-mobile-profile';
import {
  MobileHomeView,
  MobileMicView,
  MobileSongsView,
  MobileQueueView,
  MobileResultsView,
  MobileJukeboxView,
  MobileProfileView,
  RemoteControlView,
} from '@/components/mobile';

// ===================== TYPES =====================
type MobileView = 'home' | 'profile' | 'songs' | 'queue' | 'mic' | 'results' | 'jukebox' | 'remote';

interface MobileSong {
  id: string;
  title: string;
  artist: string;
  duration: number;
  genre?: string;
  language?: string;
  coverImage?: string;
}

interface GameResults {
  songId: string;
  songTitle: string;
  songArtist: string;
  score: number;
  accuracy: number;
  maxCombo: number;
  rating: string;
  playedAt: number;
}

interface QueueItem {
  id: string;
  songId: string;
  songTitle: string;
  songArtist: string;
  addedBy: string;
  status: string;
}

interface JukeboxWishlistItem {
  songId: string;
  songTitle: string;
  songArtist: string;
  addedBy: string;
}

// ===================== MOBILE CLIENT VIEW =====================
export function MobileClientView() {
  const [currentView, setCurrentView] = useState<MobileView>('home');
  
  // Song library state
  const [songs, setSongs] = useState<MobileSong[]>([]);
  const [songSearch, setSongSearch] = useState('');
  const [songsLoading, setSongsLoading] = useState(true);

  // Queue state - max 3 songs per companion
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [slotsRemaining, setSlotsRemaining] = useState(3);
  const [queueError, setQueueError] = useState<string | null>(null);

  // Game results for social features
  const [gameResults, setGameResults] = useState<GameResults | null>(null);

  // Jukebox wishlist
  const [jukeboxWishlist, setJukeboxWishlist] = useState<JukeboxWishlistItem[]>([]);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Connection hook
  const {
    clientId,
    connectionCode,
    isConnected,
    error,
    gameState,
    connect,
  } = useMobileConnection({
    onGameEnd: () => {
      loadGameResults();
      loadQueue();
    },
  });

  // Profile hook
  const {
    profile,
    profileName,
    profileColor,
    avatarPreview,
    profileColors,
    setProfileName,
    setProfileColor,
    createProfile,
    saveProfile,
    handlePhotoUpload,
    loadSavedProfile,
  } = useMobileProfile({
    clientId,
    onConnectionCodeUpdate: (code) => {
      // Connection code is managed by the connection hook
    },
  });

  // Microphone hook
  const {
    isListening,
    currentPitch,
    startMicrophone,
    stopMicrophone,
    error: micError,
  } = useMobileMicrophone({
    clientId,
    isPlaying: gameState.isPlaying,
    songEnded: gameState.songEnded,
  });

  // Load songs from main app
  const loadSongs = useCallback(async () => {
    setSongsLoading(true);
    try {
      const data = await apiClient.getSongs();
      if (data.success) {
        setSongs((data.songs || []) as MobileSong[]);
      } else {
        const savedSongs = localStorage.getItem('karaoke-songs');
        if (savedSongs) {
          setSongs(JSON.parse(savedSongs));
        }
      }
    } catch {
      const savedSongs = localStorage.getItem('karaoke-songs');
      if (savedSongs) {
        setSongs(JSON.parse(savedSongs));
      }
    }
    setSongsLoading(false);
  }, []);

  // Add song to queue
  const addToQueue = useCallback(
    async (song: MobileSong) => {
      if (!profile || !clientId) {
        setCurrentView('profile');
        return;
      }

      if (slotsRemaining <= 0) {
        setQueueError('Maximum 3 songs in queue. Wait for a song to finish!');
        setTimeout(() => setQueueError(null), 3000);
        return;
      }

      setQueueError(null);

      try {
        const data = await apiClient.mobileQueue(clientId, {
          songId: song.id,
          songTitle: song.title,
          songArtist: song.artist,
        });

        if (data.success) {
          setQueue((prev) => [
            ...prev,
            {
              id: (data.queueItem as { id: string }).id,
              songId: song.id,
              songTitle: song.title,
              songArtist: song.artist,
              addedBy: profile.name,
              status: 'pending',
            },
          ]);
          setSlotsRemaining((data.slotsRemaining as number) ?? Math.max(0, slotsRemaining - 1));
        } else if ((data as { queueFull?: boolean }).queueFull) {
          setQueueError('Maximum 3 songs in queue!');
          setSlotsRemaining(0);
          setTimeout(() => setQueueError(null), 3000);
        }
      } catch {
        setQueueError('Failed to add song');
        setTimeout(() => setQueueError(null), 3000);
      }
    },
    [profile, clientId, slotsRemaining]
  );

  // Get queue from server
  const loadQueue = useCallback(async () => {
    try {
      const data = await apiClient.mobileGetQueue();
      if (data.success) {
        const serverQueue = (data.queue || []) as QueueItem[];
        setQueue(serverQueue);
        const pendingCount = serverQueue.filter((q) => q.status === 'pending').length;
        setSlotsRemaining(Math.max(0, 3 - pendingCount));
      }
    } catch {
      // Ignore errors
    }
  }, []);

  // Load game results
  const loadGameResults = useCallback(async () => {
    try {
      const data = await apiClient.mobileGetResults();
      if (data.success && data.results) {
        setGameResults(data.results as GameResults);
      }
    } catch {
      // Ignore errors
    }
  }, []);

  // Add to Jukebox wishlist
  const addToJukeboxWishlist = useCallback(
    async (song: MobileSong) => {
      if (!profile || !clientId) {
        setCurrentView('profile');
        return;
      }

      try {
        await apiClient.mobileAction('jukebox', clientId, {
          songId: song.id,
          songTitle: song.title,
          songArtist: song.artist,
        });

        setJukeboxWishlist((prev) => [
          ...prev,
          {
            songId: song.id,
            songTitle: song.title,
            songArtist: song.artist,
            addedBy: profile.name,
          },
        ]);
      } catch {
        // Ignore errors
      }
    },
    [profile, clientId]
  );

  // Load Jukebox wishlist
  const loadJukeboxWishlist = useCallback(async () => {
    try {
      const data = await apiClient.mobileGetJukebox();
      if (data.success) {
        setJukeboxWishlist((data.wishlist || []) as JukeboxWishlistItem[]);
      }
    } catch {
      // Ignore errors
    }
  }, []);

  // Load saved profile on mount
  useEffect(() => {
    loadSavedProfile();
  }, [loadSavedProfile]);

  // Load songs when viewing songs tab
  useEffect(() => {
    if (currentView === 'songs' && songs.length === 0) {
      queueMicrotask(() => loadSongs());
    }
  }, [currentView, songs.length, loadSongs]);

  // Load queue periodically
  useEffect(() => {
    if (isConnected) {
      queueMicrotask(() => loadQueue());
      const interval = setInterval(() => loadQueue(), 5000);
      return () => clearInterval(interval);
    }
  }, [isConnected, loadQueue]);

  // Load Jukebox wishlist when viewing jukebox tab
  useEffect(() => {
    if (currentView === 'jukebox') {
      queueMicrotask(() => loadJukeboxWishlist());
    }
  }, [currentView, loadJukeboxWishlist]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-black/30 backdrop-blur-xl border-b border-white/10">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            {profile && currentView !== 'home' && (
              <button
                onClick={() => setCurrentView('home')}
                className="text-white/60 hover:text-white"
              >
                ← Back
              </button>
            )}
            <h1 className="text-lg font-bold">Karaoke Successor</h1>
          </div>
          <div className="flex items-center gap-3">
            {connectionCode && (
              <Badge variant="outline" className="border-cyan-500/50 text-cyan-400 font-mono">
                {connectionCode}
              </Badge>
            )}
            <div
              className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}
            />
            {profile && (
              <button
                onClick={() => setCurrentView('profile')}
                className="w-8 h-8 rounded-full overflow-hidden"
                style={{ backgroundColor: profile.color }}
              >
                {profile.avatar ? (
                  <img src={profile.avatar} alt={profile.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-sm font-bold">{profile.name[0]}</span>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Connection Status */}
      {!isConnected ? (
        <div className="flex flex-col items-center justify-center p-8">
          <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full mb-4" />
          <p className="text-white/60 mb-4">Connecting to server...</p>
          {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
          <Button onClick={connect} className="bg-cyan-500 hover:bg-cyan-400">
            Retry Connection
          </Button>
        </div>
      ) : !profile ? (
        /* Profile Creation Screen */
        <div className="p-4 max-w-md mx-auto">
          <Card className="bg-white/10 border-white/20">
            <CardHeader>
              <CardTitle className="text-center">Create Your Profile</CardTitle>
              <p className="text-center text-white/40 text-sm mt-2">
                Your profile will sync with the main app
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Avatar Upload */}
              <div className="flex flex-col items-center">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-24 h-24 rounded-full bg-white/10 border-2 border-dashed border-white/30 flex items-center justify-center overflow-hidden hover:border-cyan-400 transition-colors"
                >
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center">
                      <span className="text-2xl">📷</span>
                      <p className="text-xs text-white/40 mt-1">Add Photo</p>
                    </div>
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </div>

              {/* Name Input */}
              <div>
                <label htmlFor="profile-name" className="text-sm text-white/60 mb-2 block">
                  Your Name
                </label>
                <Input
                  id="profile-name"
                  name="profile-name"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  placeholder="Enter your name"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
                />
              </div>

              {/* Color Selection */}
              <div>
                <label className="text-sm text-white/60 mb-2 block">Choose Color</label>
                <div className="flex flex-wrap gap-2">
                  {profileColors.map((color) => (
                    <button
                      key={color}
                      onClick={() => setProfileColor(color)}
                      className={`w-10 h-10 rounded-full transition-transform ${
                        profileColor === color ? 'ring-2 ring-white scale-110' : ''
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              {/* Create Button */}
              <Button
                onClick={createProfile}
                disabled={!profileName.trim()}
                className="w-full bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 disabled:opacity-50"
              >
                Create Profile
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : (
        /* Main Views */
        <div className="pb-20">
          {currentView === 'home' && (
            <MobileHomeView
              currentSong={gameState.currentSong}
              queue={queue}
              onNavigate={setCurrentView}
            />
          )}

          {currentView === 'mic' && (
            <MobileMicView
              clientId={clientId}
              isAdPlaying={gameState.isAdPlaying}
              isListening={isListening}
              currentPitch={currentPitch}
              onStartMicrophone={startMicrophone}
              onStopMicrophone={stopMicrophone}
            />
          )}

          {currentView === 'songs' && (
            <MobileSongsView
              songs={songs}
              songSearch={songSearch}
              songsLoading={songsLoading}
              onSearchChange={setSongSearch}
              onAddToQueue={addToQueue}
            />
          )}

          {currentView === 'queue' && (
            <MobileQueueView
              queue={queue}
              slotsRemaining={slotsRemaining}
              queueError={queueError}
              onNavigate={setCurrentView}
            />
          )}

          {currentView === 'results' && (
            <MobileResultsView gameResults={gameResults} onNavigate={setCurrentView} />
          )}

          {currentView === 'jukebox' && (
            <MobileJukeboxView jukeboxWishlist={jukeboxWishlist} onNavigate={setCurrentView} />
          )}

          {currentView === 'remote' && (
            <RemoteControlView
              clientId={clientId}
              profile={profile}
              onBack={() => setCurrentView('home')}
            />
          )}

          {currentView === 'profile' && (
            <MobileProfileView
              profile={profile}
              profileName={profileName}
              profileColor={profileColor}
              avatarPreview={avatarPreview}
              connectionCode={connectionCode}
              profileColors={profileColors}
              onNameChange={setProfileName}
              onColorChange={setProfileColor}
              onPhotoUpload={handlePhotoUpload}
              onSave={saveProfile}
            />
          )}
        </div>
      )}

      {/* Bottom Navigation */}
      {isConnected && profile && (
        <div className="fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-xl border-t border-white/10">
          <div className="flex justify-around py-2">
            <button
              onClick={() => setCurrentView('home')}
              className={`flex flex-col items-center p-2 ${
                currentView === 'home' ? 'text-cyan-400' : 'text-white/40'
              }`}
            >
              <span className="text-xl">🏠</span>
              <span className="text-xs mt-1">Home</span>
            </button>
            <button
              onClick={() => setCurrentView('mic')}
              className={`flex flex-col items-center p-2 ${
                currentView === 'mic' ? 'text-cyan-400' : 'text-white/40'
              }`}
            >
              <span className="text-xl">🎤</span>
              <span className="text-xs mt-1">Sing</span>
            </button>
            <button
              onClick={() => setCurrentView('songs')}
              className={`flex flex-col items-center p-2 ${
                currentView === 'songs' ? 'text-cyan-400' : 'text-white/40'
              }`}
            >
              <span className="text-xl">🎵</span>
              <span className="text-xs mt-1">Songs</span>
            </button>
            <button
              onClick={() => setCurrentView('remote')}
              className={`flex flex-col items-center p-2 ${
                currentView === 'remote' ? 'text-purple-400' : 'text-white/40'
              }`}
            >
              <span className="text-xl">🎮</span>
              <span className="text-xs mt-1">Remote</span>
            </button>
            <button
              onClick={() => setCurrentView('profile')}
              className={`flex flex-col items-center p-2 ${
                currentView === 'profile' ? 'text-cyan-400' : 'text-white/40'
              }`}
            >
              <span className="text-xl">👤</span>
              <span className="text-xs mt-1">Profile</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default MobileClientView;
