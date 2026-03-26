'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { midiToNoteName } from '@/types/game';
import { apiClient } from '@/lib/api-client';
import { RemoteControlView } from '@/components/mobile/remote-control-view';

// ===================== TYPES =====================
type MobileView = 'home' | 'profile' | 'songs' | 'queue' | 'mic' | 'results' | 'jukebox' | 'remote';

interface MobileProfile {
  id: string;
  name: string;
  avatar?: string;
  color: string;
  createdAt: number;
}

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

// ===================== ICONS =====================
function MusicIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  );
}

function MicIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}

// ===================== MOBILE CLIENT VIEW =====================
export function MobileClientView() {
  // Connection state
  const [clientId, setClientId] = useState<string | null>(null);
  const [connectionCode, setConnectionCode] = useState<string>('');
  const [isConnected, setIsConnected] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPitch, setCurrentPitch] = useState<{ frequency: number | null; note: number | null; volume: number }>({ frequency: null, note: null, volume: 0 });
  const [gameState, setGameState] = useState<{ 
    currentSong: { title: string; artist: string } | null; 
    isPlaying: boolean;
    songEnded: boolean;
    queueLength: number;
    isAdPlaying: boolean;
  }>({ currentSong: null, isPlaying: false, songEnded: false, queueLength: 0, isAdPlaying: false });
  const [currentView, setCurrentView] = useState<MobileView>('home');
  
  // Profile state
  const [profile, setProfile] = useState<MobileProfile | null>(null);
  const [profileName, setProfileName] = useState('');
  const [profileColor, setProfileColor] = useState('#06B6D4');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  
  // Song library state
  const [songs, setSongs] = useState<MobileSong[]>([]);
  const [songSearch, setSongSearch] = useState('');
  const [songsLoading, setSongsLoading] = useState(true);
  
  // Queue state - max 3 songs per companion
  const [queue, setQueue] = useState<Array<{ id: string; songId: string; songTitle: string; songArtist: string; addedBy: string; status: string }>>([]);
  const [slotsRemaining, setSlotsRemaining] = useState(3);
  const [queueError, setQueueError] = useState<string | null>(null);
  
  // Game results for social features
  const [gameResults, setGameResults] = useState<GameResults | null>(null);
  const [showScoreCard, setShowScoreCard] = useState(false);
  
  // Jukebox wishlist
  const [jukeboxWishlist, setJukeboxWishlist] = useState<Array<{ songId: string; songTitle: string; songArtist: string; addedBy: string }>>([]);
  
  // Camera state for shorts recording
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const cameraVideoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  
  // Audio context and analyzer
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Available profile colors
  const profileColors = [
    '#06B6D4', '#8B5CF6', '#EC4899', '#F59E0B', 
    '#10B981', '#EF4444', '#3B82F6', '#F97316'
  ];

  // Connect to the server
  const connect = useCallback(async () => {
    try {
      // First, check if we have a saved connection code to reconnect
      const savedConnectionCode = localStorage.getItem('karaoke-connection-code');
      const savedProfile = localStorage.getItem('karaoke-mobile-profile');
      
      if (savedConnectionCode && savedProfile) {
        // Try to reconnect with existing code
        const reconnectData = await apiClient.mobileReconnect(savedConnectionCode);
        
        if (reconnectData.success) {
          setClientId(reconnectData.clientId as string);
          setConnectionCode(savedConnectionCode);
          setIsConnected(true);
          if (reconnectData.profile) {
            const profileData = reconnectData.profile as MobileProfile;
            setProfile(profileData);
            setProfileName(profileData.name);
            setProfileColor(profileData.color);
            setAvatarPreview(profileData.avatar || null);
          }
          if (reconnectData.gameState) {
            const gs = reconnectData.gameState as { currentSong: { title: string; artist: string } | null; isPlaying: boolean; songEnded?: boolean; queueLength?: number; isAdPlaying?: boolean };
            setGameState({
              currentSong: gs.currentSong,
              isPlaying: gs.isPlaying,
              songEnded: gs.songEnded || false,
              queueLength: gs.queueLength || 0,
              isAdPlaying: gs.isAdPlaying || false,
            });
          }
          return; // Successfully reconnected
        }
      }
      
      // Fresh connection
      const data = await apiClient.mobileConnect();
      if (data.success) {
        const newClientId = data.clientId as string;
        const newConnectionCode = data.connectionCode as string;
        setClientId(newClientId);
        setConnectionCode(newConnectionCode);
        setIsConnected(true);
        
        // Save connection code for reconnection
        localStorage.setItem('karaoke-connection-code', newConnectionCode);
        
        if (data.gameState) {
          const gs = data.gameState as { currentSong: { title: string; artist: string } | null; isPlaying: boolean; songEnded?: boolean; queueLength?: number; isAdPlaying?: boolean };
          setGameState({
            currentSong: gs.currentSong,
            isPlaying: gs.isPlaying,
            songEnded: gs.songEnded || false,
            queueLength: gs.queueLength || 0,
            isAdPlaying: gs.isAdPlaying || false,
          });
        }
        
        // Load saved profile from localStorage and sync
        if (savedProfile) {
          const parsed = JSON.parse(savedProfile);
          setProfile(parsed);
          setProfileName(parsed.name);
          setProfileColor(parsed.color);
          setAvatarPreview(parsed.avatar || null);
          // Sync profile to server after connection
          try {
            const syncData = await apiClient.mobileProfile(newClientId, parsed);
            if (syncData.connectionCode) {
              setConnectionCode(syncData.connectionCode as string);
              localStorage.setItem('karaoke-connection-code', syncData.connectionCode as string);
            }
          } catch {
            // Ignore sync errors
          }
        }
      } else {
        setError('Failed to connect to server');
      }
    } catch {
      setError('Connection failed - is the server running?');
    }
  }, []);

  // Sync profile to server
  const syncProfile = useCallback(async (profileData: MobileProfile) => {
    if (!clientId) return;
    try {
      const data = await apiClient.mobileProfile(clientId, profileData);
      if (data.connectionCode) {
        setConnectionCode(data.connectionCode as string);
        localStorage.setItem('karaoke-connection-code', data.connectionCode as string);
      }
    } catch {
      // Ignore sync errors
    }
  }, [clientId]);

  // Create profile
  const handleCreateProfile = useCallback(() => {
    if (!profileName.trim()) return;
    
    const newProfile: MobileProfile = {
      id: `profile-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
      name: profileName.trim(),
      avatar: avatarPreview || undefined,
      color: profileColor,
      createdAt: Date.now(),
    };
    
    setProfile(newProfile);
    localStorage.setItem('karaoke-mobile-profile', JSON.stringify(newProfile));
    syncProfile(newProfile);
    setCurrentView('home');
  }, [profileName, avatarPreview, profileColor, syncProfile]);

  // Handle photo upload
  const handlePhotoUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setAvatarPreview(base64);
    };
    reader.readAsDataURL(file);
  }, []);

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

  // Add song to queue (max 3 per companion)
  const addToQueue = useCallback(async (song: MobileSong) => {
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
        setQueue(prev => [...prev, {
          id: (data.queueItem as { id: string }).id,
          songId: song.id,
          songTitle: song.title,
          songArtist: song.artist,
          addedBy: profile.name,
          status: 'pending',
        }]);
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
  }, [profile, clientId, slotsRemaining]);

  // Get queue from server
  const loadQueue = useCallback(async () => {
    try {
      const data = await apiClient.mobileGetQueue();
      if (data.success) {
        const serverQueue = (data.queue || []) as Array<{ status: string }>;
        setQueue(serverQueue as typeof queue);
        // Calculate remaining slots
        const pendingCount = serverQueue.filter((q) => q.status === 'pending').length;
        setSlotsRemaining(Math.max(0, 3 - pendingCount));
      }
    } catch {
      // Ignore errors
    }
  }, []);

  // Load game results for social features
  const loadGameResults = useCallback(async () => {
    try {
      const data = await apiClient.mobileGetResults();
      if (data.success && data.results) {
        setGameResults(data.results as GameResults);
        setShowScoreCard(true);
      }
    } catch {
      // Ignore errors
    }
  }, []);

  // Add to Jukebox wishlist
  const addToJukeboxWishlist = useCallback(async (song: MobileSong) => {
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
      
      setJukeboxWishlist(prev => [...prev, {
        songId: song.id,
        songTitle: song.title,
        songArtist: song.artist,
        addedBy: profile.name,
      }]);
    } catch {
      // Ignore errors
    }
  }, [profile, clientId]);

  // Load Jukebox wishlist
  const loadJukeboxWishlist = useCallback(async () => {
    try {
      const data = await apiClient.mobileGetJukebox();
      if (data.success) {
        setJukeboxWishlist((data.wishlist || []) as typeof jukeboxWishlist);
      }
    } catch {
      // Ignore errors
    }
  }, []);

  // YIN pitch detection algorithm
  const yinPitchDetection = useCallback((buffer: Float32Array, sampleRate: number): number | null => {
    const yinBuffer = new Float32Array(buffer.length / 2);
    const yinThreshold = 0.15;
    const yinBufferLength = buffer.length / 2;

    for (let tau = 0; tau < yinBufferLength; tau++) {
      yinBuffer[tau] = 0;
      for (let i = 0; i < yinBufferLength; i++) {
        const delta = buffer[i] - buffer[i + tau];
        yinBuffer[tau] += delta * delta;
      }
    }

    yinBuffer[0] = 1;
    let runningSum = 0;
    for (let tau = 1; tau < yinBufferLength; tau++) {
      runningSum += yinBuffer[tau];
      yinBuffer[tau] *= tau / runningSum;
    }

    let tauEstimate = -1;
    for (let tau = 2; tau < yinBufferLength; tau++) {
      if (yinBuffer[tau] < yinThreshold) {
        while (tau + 1 < yinBufferLength && yinBuffer[tau + 1] < yinBuffer[tau]) {
          tau++;
        }
        tauEstimate = tau;
        break;
      }
    }

    if (tauEstimate === -1) return null;

    let betterTau: number;
    const x0 = tauEstimate < 1 ? tauEstimate : tauEstimate - 1;
    const x2 = tauEstimate + 1 < yinBufferLength ? tauEstimate + 1 : tauEstimate;

    if (x0 === tauEstimate) {
      betterTau = yinBuffer[tauEstimate] <= yinBuffer[x2] ? tauEstimate : x2;
    } else if (x2 === tauEstimate) {
      betterTau = yinBuffer[tauEstimate] <= yinBuffer[x0] ? tauEstimate : x0;
    } else {
      const s0 = yinBuffer[x0];
      const s1 = yinBuffer[tauEstimate];
      const s2 = yinBuffer[x2];
      betterTau = tauEstimate + (s2 - s0) / (2 * (2 * s1 - s2 - s0));
    }

    return sampleRate / betterTau;
  }, []);

  // Start microphone and pitch detection
  const startMicrophone = useCallback(async () => {
    if (!clientId) return;
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      mediaStreamRef.current = stream;
      
      audioContextRef.current = new AudioContext();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 4096;
      analyserRef.current.smoothingTimeConstant = 0.8;
      source.connect(analyserRef.current);
      
      setIsListening(true);
      
      const buffer = new Float32Array(analyserRef.current.fftSize);
      
      const detectPitch = () => {
        if (!analyserRef.current || !audioContextRef.current) return;
        
        // STOP if song ended
        if (gameState.songEnded || !gameState.isPlaying) {
          // Don't stop immediately, just don't send data
          // The effect will handle stopping
        }
        
        analyserRef.current.getFloatTimeDomainData(buffer);
        
        let sum = 0;
        for (let i = 0; i < buffer.length; i++) {
          sum += buffer[i] * buffer[i];
        }
        const rms = Math.sqrt(sum / buffer.length);
        const volume = Math.min(1, rms * 5);
        
        const frequency = yinPitchDetection(buffer, audioContextRef.current.sampleRate);
        
        let note: number | null = null;
        if (frequency !== null && frequency >= 65 && frequency <= 1047) {
          note = 69 + 12 * Math.log2(frequency / 440);
        }
        
        setCurrentPitch({ frequency, note, volume });
        
        // Only send pitch if song is playing and not ended
        if (clientId && gameState.isPlaying && !gameState.songEnded && (volume > 0.01 || frequency !== null)) {
          apiClient.mobilePitch(clientId, {
            frequency,
            note,
            clarity: 0,
            volume,
            timestamp: Date.now(),
          }).catch(() => {});
        }
        
        animationFrameRef.current = requestAnimationFrame(detectPitch);
      };
      
      detectPitch();
    } catch {
      setError('Microphone access denied');
    }
  }, [clientId, yinPitchDetection, gameState.isPlaying, gameState.songEnded]);

  // Stop microphone
  const stopMicrophone = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    setIsListening(false);
    setCurrentPitch({ frequency: null, note: null, volume: 0 });
  }, []);

  // Filter songs by search
  const filteredSongs = useMemo(() => {
    if (!songSearch) return songs;
    const query = songSearch.toLowerCase();
    return songs.filter(s => 
      s.title.toLowerCase().includes(query) ||
      s.artist.toLowerCase().includes(query)
    );
  }, [songs, songSearch]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopMicrophone();
      if (clientId) {
        apiClient.mobileDisconnect(clientId).catch(() => {});
      }
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
    };
  }, [clientId, stopMicrophone]);

  // Auto-connect on mount
  useEffect(() => {
    queueMicrotask(() => connect());
  }, [connect]);

  // Heartbeat to keep connection alive
  useEffect(() => {
    if (!isConnected || !clientId) return;
    
    const sendHeartbeat = async () => {
      try {
        await apiClient.mobileHeartbeat(clientId);
      } catch {
        // Ignore heartbeat errors
      }
    };
    
    // Send heartbeat every 30 seconds
    heartbeatIntervalRef.current = setInterval(sendHeartbeat, 30000);
    
    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
    };
  }, [isConnected, clientId]);

  // Sync game state periodically and detect song end
  useEffect(() => {
    if (!isConnected) return;
    
    const syncInterval = setInterval(async () => {
      try {
        const data = await apiClient.mobileGetGameState();
        if (data.success && data.gameState) {
          const gs = data.gameState as { currentSong: { title: string; artist: string } | null; isPlaying: boolean; songEnded?: boolean; queueLength?: number; isAdPlaying?: boolean };
          const prevSongEnded = gameState.songEnded;
          const newSongEnded = gs.songEnded || false;
          const wasPlaying = gameState.isPlaying;
          
          setGameState({
            currentSong: gs.currentSong,
            isPlaying: gs.isPlaying,
            songEnded: newSongEnded,
            queueLength: gs.queueLength || 0,
            isAdPlaying: gs.isAdPlaying || false,
          });
          
          // Stop microphone when song ends
          if (!wasPlaying || newSongEnded) {
            if (isListening) {
              stopMicrophone();
            }
          }
          
          // Load game results when song ends
          if (newSongEnded && !prevSongEnded) {
            loadGameResults();
            loadQueue(); // Refresh queue to update slots
          }
        }
      } catch {
        // Ignore sync errors
      }
    }, 1000);
    
    return () => clearInterval(syncInterval);
  }, [isConnected, gameState.isPlaying, gameState.songEnded, isListening, stopMicrophone, loadGameResults, loadQueue]);

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

  // Format duration
  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-black/30 backdrop-blur-xl border-b border-white/10">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            {profile && currentView !== 'home' && (
              <button onClick={() => setCurrentView('home')} className="text-white/60 hover:text-white">
                ← Back
              </button>
            )}
            <h1 className="text-lg font-bold">Karaoke Successor</h1>
          </div>
          <div className="flex items-center gap-3">
            {/* Connection Code Badge */}
            {connectionCode && (
              <Badge variant="outline" className="border-cyan-500/50 text-cyan-400 font-mono">
                {connectionCode}
              </Badge>
            )}
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            {profile && (
              <button onClick={() => setCurrentView('profile')} className="w-8 h-8 rounded-full overflow-hidden" style={{ backgroundColor: profile.color }}>
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
              <p className="text-center text-white/40 text-sm mt-2">Your profile will sync with the main app</p>
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
                <label htmlFor="profile-name" className="text-sm text-white/60 mb-2 block">Your Name</label>
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
                      className={`w-10 h-10 rounded-full transition-transform ${profileColor === color ? 'ring-2 ring-white scale-110' : ''}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
              
              {/* Create Button */}
              <Button 
                onClick={handleCreateProfile}
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
          {/* Home View */}
          {currentView === 'home' && (
            <div className="p-4 space-y-4">
              {/* Now Playing */}
              {gameState.currentSong && (
                <Card className="bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border-cyan-500/30">
                  <CardContent className="py-4">
                    <p className="text-xs text-white/60 mb-1">Now Playing</p>
                    <p className="font-semibold text-lg">{gameState.currentSong.title}</p>
                    <p className="text-white/60">{gameState.currentSong.artist}</p>
                  </CardContent>
                </Card>
              )}
              
              {/* Quick Actions */}
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => setCurrentView('mic')}
                  className="bg-white/10 rounded-xl p-4 text-center hover:bg-white/15 transition-colors"
                >
                  <span className="text-3xl mb-2 block">🎤</span>
                  <span className="text-sm">Sing</span>
                </button>
                <button 
                  onClick={() => setCurrentView('songs')}
                  className="bg-white/10 rounded-xl p-4 text-center hover:bg-white/15 transition-colors"
                >
                  <span className="text-3xl mb-2 block">🎵</span>
                  <span className="text-sm">Songs</span>
                </button>
                <button 
                  onClick={() => setCurrentView('queue')}
                  className="bg-white/10 rounded-xl p-4 text-center hover:bg-white/15 transition-colors"
                >
                  <span className="text-3xl mb-2 block">📋</span>
                  <span className="text-sm">Queue</span>
                  {queue.length > 0 && (
                    <Badge className="ml-2 bg-cyan-500">{queue.length}</Badge>
                  )}
                </button>
                <button 
                  onClick={() => setCurrentView('remote')}
                  className="bg-gradient-to-br from-purple-500/20 to-cyan-500/20 rounded-xl p-4 text-center hover:from-purple-500/30 hover:to-cyan-500/30 transition-colors border border-purple-500/30"
                >
                  <span className="text-3xl mb-2 block">🎮</span>
                  <span className="text-sm font-medium">Remote</span>
                </button>
                <button 
                  onClick={() => setCurrentView('profile')}
                  className="bg-white/10 rounded-xl p-4 text-center hover:bg-white/15 transition-colors"
                >
                  <span className="text-3xl mb-2 block">👤</span>
                  <span className="text-sm">Profile</span>
                </button>
                <button 
                  onClick={() => setCurrentView('jukebox')}
                  className="bg-white/10 rounded-xl p-4 text-center hover:bg-white/15 transition-colors"
                >
                  <span className="text-3xl mb-2 block">📻</span>
                  <span className="text-sm">Jukebox</span>
                </button>
              </div>
              
              {/* Queue Preview */}
              {queue.length > 0 && (
                <Card className="bg-white/5 border-white/10">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Up Next</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {queue.slice(0, 3).map((item, i) => (
                      <div key={i} className="flex items-center gap-3 p-2 bg-white/5 rounded-lg">
                        <span className="text-white/40 text-sm">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{item.songTitle}</p>
                          <p className="text-xs text-white/40">{item.songArtist}</p>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          )}
          
          {/* Microphone View */}
          {currentView === 'mic' && (
            <div className="p-4">
              {/* Ad Playing Banner */}
              {gameState.isAdPlaying && (
                <Card className="bg-gradient-to-r from-orange-500/30 to-red-500/30 border-orange-500/50 mb-4">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-orange-500 rounded-full animate-pulse" />
                        <div>
                          <p className="font-bold text-orange-300">Werbung läuft</p>
                          <p className="text-sm text-white/70">Spiel pausiert</p>
                        </div>
                      </div>
                      <Button
                        onClick={async () => {
                          try {
                            await apiClient.mobileAction('skipAd', clientId || undefined);
                          } catch (error) {
                            console.error('Skip ad failed:', error);
                          }
                        }}
                        className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-white font-bold px-6 py-3"
                      >
                        ⏭️ Werbung überspringen
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              <Card className="bg-white/10 border-white/20">
                <CardContent className="py-8">
                  <div className="flex flex-col items-center">
                    {/* Volume Indicator */}
                    <div className="w-full h-4 bg-white/10 rounded-full overflow-hidden mb-6">
                      <div 
                        className="h-full bg-gradient-to-r from-green-400 to-cyan-400 transition-all duration-75"
                        style={{ width: `${currentPitch.volume * 100}%` }}
                      />
                    </div>
                    
                    {/* Pitch Display */}
                    {currentPitch.note !== null && (
                      <div className="text-center mb-6">
                        <div className="text-6xl font-bold text-cyan-400">
                          {midiToNoteName(Math.round(currentPitch.note))}
                        </div>
                        <div className="text-sm text-white/60">
                          {currentPitch.frequency?.toFixed(1)} Hz
                        </div>
                      </div>
                    )}
                    
                    {/* Microphone Button */}
                    <button
                      onClick={isListening ? stopMicrophone : startMicrophone}
                      className={`w-40 h-40 rounded-full flex items-center justify-center transition-all ${
                        isListening 
                          ? 'bg-red-500 hover:bg-red-400 animate-pulse shadow-lg shadow-red-500/50' 
                          : 'bg-gradient-to-br from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 shadow-lg shadow-purple-500/30'
                      }`}
                    >
                      <MicIcon className="w-20 h-20 text-white" />
                    </button>
                    <p className="mt-6 text-lg text-white/60">
                      {isListening ? 'Tap to stop' : 'Tap to sing'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          
          {/* Songs View */}
          {currentView === 'songs' && (
            <div className="p-4">
              {/* Search */}
              <div className="relative mb-4">
                <Input
                  id="song-search-modal"
                  name="song-search-modal"
                  value={songSearch}
                  onChange={(e) => setSongSearch(e.target.value)}
                  placeholder="Search songs..."
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
                />
              </div>
              
              {/* Song List */}
              {songsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full mr-2" />
                  <span className="text-white/60">Loading songs...</span>
                </div>
              ) : (
                <div className="space-y-2 max-h-[calc(100vh-200px)] overflow-y-auto">
                  {filteredSongs.map((song) => (
                    <div 
                      key={song.id}
                      className="flex items-center gap-3 p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors"
                    >
                      {/* Cover */}
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-600/50 to-blue-600/50 overflow-hidden flex-shrink-0">
                        {song.coverImage ? (
                          <img src={song.coverImage} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <MusicIcon className="w-6 h-6 text-white/30" />
                          </div>
                        )}
                      </div>
                      
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{song.title}</p>
                        <p className="text-sm text-white/40 truncate">{song.artist}</p>
                      </div>
                      
                      {/* Duration */}
                      <span className="text-xs text-white/30">{formatDuration(song.duration)}</span>
                      
                      {/* Add to Queue Button */}
                      <Button
                        size="sm"
                        onClick={() => addToQueue(song)}
                        className="bg-cyan-500 hover:bg-cyan-400 text-white px-3"
                      >
                        +
                      </Button>
                    </div>
                  ))}
                  
                  {filteredSongs.length === 0 && (
                    <div className="text-center py-12 text-white/40">
                      No songs found
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          
          {/* Queue View */}
          {currentView === 'queue' && (
            <div className="p-4">
              {/* Queue Header with Slots */}
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Song Queue</h2>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-white/40">Slots:</span>
                  <div className="flex gap-1">
                    {[1, 2, 3].map((slot) => (
                      <div 
                        key={slot}
                        className={`w-4 h-4 rounded-full ${slot <= slotsRemaining ? 'bg-cyan-500' : 'bg-white/20'}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
              
              {/* Queue Error */}
              {queueError && (
                <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3 mb-4 text-red-400 text-sm">
                  {queueError}
                </div>
              )}
              
              {queue.length === 0 ? (
                <div className="text-center py-12 text-white/40">
                  <span className="text-4xl mb-4 block">📋</span>
                  <p>No songs in queue</p>
                  <p className="text-sm mt-2">You can add up to 3 songs</p>
                  <Button 
                    onClick={() => setCurrentView('songs')}
                    variant="outline"
                    className="mt-4 border-white/20 text-white"
                  >
                    Browse Songs
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {queue.filter(q => q.status !== 'completed').map((item, i) => (
                    <div 
                      key={item.id || i}
                      className={`flex items-center gap-3 p-3 rounded-xl ${
                        item.status === 'playing' ? 'bg-cyan-500/20 border border-cyan-500/30' : 'bg-white/5'
                      }`}
                    >
                      <span className="text-white/40 font-bold w-6">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{item.songTitle}</p>
                        <p className="text-sm text-white/40">{item.songArtist} • Added by {item.addedBy}</p>
                      </div>
                      {item.status === 'playing' && (
                        <Badge className="bg-cyan-500 text-xs">Playing</Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {/* Results View - Social Features */}
          {currentView === 'results' && (
            <div className="p-4 max-w-md mx-auto">
              {gameResults ? (
                <div className="space-y-4">
                  {/* Score Card */}
                  <Card className="bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border-cyan-500/30">
                    <CardContent className="py-6">
                      <div className="text-center">
                        <p className="text-sm text-white/60 mb-1">You just played</p>
                        <h2 className="text-xl font-bold mb-1">{gameResults.songTitle}</h2>
                        <p className="text-white/60">{gameResults.songArtist}</p>
                      </div>
                      
                      <div className="mt-6 grid grid-cols-2 gap-4">
                        <div className="text-center">
                          <p className="text-3xl font-bold text-cyan-400">{gameResults.score.toLocaleString()}</p>
                          <p className="text-xs text-white/40">Score</p>
                        </div>
                        <div className="text-center">
                          <p className="text-3xl font-bold text-purple-400">{gameResults.accuracy.toFixed(1)}%</p>
                          <p className="text-xs text-white/40">Accuracy</p>
                        </div>
                        <div className="text-center">
                          <p className="text-3xl font-bold text-yellow-400">{gameResults.maxCombo}x</p>
                          <p className="text-xs text-white/40">Best Combo</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xl font-bold">{gameResults.rating}</p>
                          <p className="text-xs text-white/40">Rating</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* Social Actions */}
                  <div className="grid grid-cols-2 gap-3">
                    <Button 
                      onClick={() => {
                        // Generate scorecard image
                        // For now, just show a message
                        alert('Score card saved to your photos! (Feature coming soon)');
                      }}
                      className="bg-gradient-to-r from-cyan-500 to-purple-500"
                    >
                      📸 Save Score Card
                    </Button>
                    <Button 
                      onClick={() => {
                        // Share functionality
                        const text = `🎤 I scored ${gameResults.score.toLocaleString()} points on "${gameResults.songTitle}" by ${gameResults.songArtist}! 🎵\n\n#KaraokeSuccessor`;
                        if (navigator.share) {
                          navigator.share({ text }).catch(() => {});
                        } else {
                          navigator.clipboard.writeText(text);
                          alert('Score copied to clipboard!');
                        }
                      }}
                      variant="outline"
                      className="border-white/20"
                    >
                      📤 Share Score
                    </Button>
                  </div>
                  
                  {/* Quick Actions */}
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => setCurrentView('home')}
                      variant="outline"
                      className="flex-1 border-white/20"
                    >
                      🏠 Home
                    </Button>
                    <Button 
                      onClick={() => setCurrentView('queue')}
                      variant="outline"
                      className="flex-1 border-white/20"
                    >
                      📋 Queue
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-white/40">
                  <span className="text-4xl mb-4 block">📊</span>
                  <p>No recent results</p>
                  <p className="text-sm mt-2">Sing a song to see your results here!</p>
                  <Button 
                    onClick={() => setCurrentView('home')}
                    variant="outline"
                    className="mt-4 border-white/20"
                  >
                    Go Home
                  </Button>
                </div>
              )}
            </div>
          )}
          
          {/* Jukebox Wishlist View */}
          {currentView === 'jukebox' && (
            <div className="p-4">
              <h2 className="text-lg font-semibold mb-4">Jukebox Wishlist</h2>
              <p className="text-sm text-white/40 mb-4">Add songs to the jukebox playlist</p>
              
              {/* Quick Add */}
              <Button 
                onClick={() => setCurrentView('songs')}
                variant="outline"
                className="w-full border-white/20 mb-4"
              >
                + Add Songs to Wishlist
              </Button>
              
              {jukeboxWishlist.length === 0 ? (
                <div className="text-center py-12 text-white/40">
                  <span className="text-4xl mb-4 block">🎵</span>
                  <p>No songs in wishlist</p>
                  <p className="text-sm mt-2">Songs you add will appear here</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {jukeboxWishlist.map((item, i) => (
                    <div 
                      key={i}
                      className="flex items-center gap-3 p-3 bg-white/5 rounded-xl"
                    >
                      <span className="text-white/40 font-bold w-6">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{item.songTitle}</p>
                        <p className="text-sm text-white/40">{item.songArtist} • Added by {item.addedBy}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {/* Remote Control View */}
          {currentView === 'remote' && (
            <RemoteControlView 
              clientId={clientId} 
              profile={profile}
              onBack={() => setCurrentView('home')}
            />
          )}
          
          {/* Profile View */}
          {currentView === 'profile' && (
            <div className="p-4 max-w-md mx-auto">
              <Card className="bg-white/10 border-white/20">
                <CardContent className="py-6">
                  <div className="flex flex-col items-center mb-6">
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="w-24 h-24 rounded-full overflow-hidden border-4 border-white/20 hover:border-white/40 transition-colors"
                      style={{ backgroundColor: profile.color }}
                    >
                      {profile.avatar ? (
                        <img src={profile.avatar} alt={profile.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-4xl font-bold flex items-center justify-center h-full">{profile.name[0]}</span>
                      )}
                    </button>
                    <input 
                      ref={fileInputRef}
                      type="file" 
                      accept="image/*" 
                      onChange={handlePhotoUpload}
                      className="hidden" 
                    />
                    <h2 className="text-xl font-bold mt-4">{profile.name}</h2>
                    {/* Show connection code */}
                    {connectionCode && (
                      <Badge variant="outline" className="mt-2 border-cyan-500/50 text-cyan-400 font-mono">
                        Code: {connectionCode}
                      </Badge>
                    )}
                  </div>
                  
                  {/* Name Edit */}
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="edit-profile-name" className="text-sm text-white/60 mb-2 block">Name</label>
                      <Input
                        id="edit-profile-name"
                        name="edit-profile-name"
                        value={profileName}
                        onChange={(e) => setProfileName(e.target.value)}
                        className="bg-white/5 border-white/10 text-white"
                      />
                    </div>
                    
                    {/* Color Edit */}
                    <div>
                      <label className="text-sm text-white/60 mb-2 block">Color</label>
                      <div className="flex flex-wrap gap-2">
                        {profileColors.map((color) => (
                          <button
                            key={color}
                            onClick={() => setProfileColor(color)}
                            className={`w-10 h-10 rounded-full transition-transform ${profileColor === color ? 'ring-2 ring-white scale-110' : ''}`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </div>
                    
                    {/* Save Button */}
                    <Button 
                      onClick={() => {
                        const updated = { ...profile, name: profileName, color: profileColor, avatar: avatarPreview || undefined };
                        setProfile(updated);
                        localStorage.setItem('karaoke-mobile-profile', JSON.stringify(updated));
                        syncProfile(updated);
                      }}
                      className="w-full bg-gradient-to-r from-cyan-500 to-purple-500"
                    >
                      Save Changes
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}
      
      {/* Bottom Navigation */}
      {isConnected && profile && (
        <div className="fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-xl border-t border-white/10">
          <div className="flex justify-around py-2">
            <button 
              onClick={() => setCurrentView('home')}
              className={`flex flex-col items-center p-2 ${currentView === 'home' ? 'text-cyan-400' : 'text-white/40'}`}
            >
              <span className="text-xl">🏠</span>
              <span className="text-xs mt-1">Home</span>
            </button>
            <button 
              onClick={() => setCurrentView('mic')}
              className={`flex flex-col items-center p-2 ${currentView === 'mic' ? 'text-cyan-400' : 'text-white/40'}`}
            >
              <span className="text-xl">🎤</span>
              <span className="text-xs mt-1">Sing</span>
            </button>
            <button 
              onClick={() => setCurrentView('songs')}
              className={`flex flex-col items-center p-2 ${currentView === 'songs' ? 'text-cyan-400' : 'text-white/40'}`}
            >
              <span className="text-xl">🎵</span>
              <span className="text-xs mt-1">Songs</span>
            </button>
            <button 
              onClick={() => setCurrentView('remote')}
              className={`flex flex-col items-center p-2 ${currentView === 'remote' ? 'text-purple-400' : 'text-white/40'}`}
            >
              <span className="text-xl">🎮</span>
              <span className="text-xs mt-1">Remote</span>
            </button>
            <button 
              onClick={() => setCurrentView('profile')}
              className={`flex flex-col items-center p-2 ${currentView === 'profile' ? 'text-cyan-400' : 'text-white/40'}`}
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
