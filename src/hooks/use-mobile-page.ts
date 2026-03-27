'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';

type MobileMode = 'mic' | 'remote' | 'library';

interface RemoteControlState {
  isLocked: boolean;
  lockedBy: string | null;
  lockedByName: string | null;
  lockedAt: number | null;
  myClientId: string | null;
  iHaveControl: boolean;
}

interface GameState {
  currentSong: { id: string; title: string; artist: string } | null;
  isPlaying: boolean;
  currentTime: number;
  songEnded: boolean;
  isAdPlaying: boolean;
  queueLength: number;
}

interface LibrarySong {
  id: string;
  title: string;
  artist: string;
  duration?: number;
  genre?: string;
  language?: string;
  coverImage?: string;
}

interface MobilePageState {
  isConnected: boolean;
  clientId: string | null;
  connectionCode: string | null;
  mode: MobileMode;
  volume: number;
  pitch: number | null;
  error: string | null;
  successMessage: string | null;
  isMicActive: boolean;
  remoteControl: RemoteControlState;
  isAcquiringControl: boolean;
  gameState: GameState;
  librarySongs: LibrarySong[];
  libraryLoading: boolean;
  librarySearch: string;
  queueSlots: { used: number; max: number };
  addingSongId: string | null;
}

interface MobilePageActions {
  setMode: (mode: MobileMode) => void;
  setLibrarySearch: (search: string) => void;
  toggleMic: () => void;
  acquireControl: () => Promise<void>;
  releaseControl: () => Promise<void>;
  sendRemoteCommand: (command: string, data?: unknown) => Promise<void>;
  skipAd: () => Promise<void>;
  addSongToQueue: (song: LibrarySong) => Promise<void>;
  setError: (error: string | null) => void;
  setSuccessMessage: (message: string | null) => void;
}

interface UseMobilePageReturn extends MobilePageState, MobilePageActions {
  filteredSongs: LibrarySong[];
}

/**
 * Custom hook for mobile page state management
 * Handles connection, microphone, remote control, and library functionality
 */
export function useMobilePage(): UseMobilePageReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [clientId, setClientId] = useState<string | null>(null);
  const [connectionCode, setConnectionCode] = useState<string | null>(null);
  const [mode, setMode] = useState<MobileMode>('mic');
  const [volume, setVolume] = useState(0);
  const [pitch, setPitch] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isMicActive, setIsMicActive] = useState(false);
  const [remoteControl, setRemoteControl] = useState<RemoteControlState>({
    isLocked: false,
    lockedBy: null,
    lockedByName: null,
    lockedAt: null,
    myClientId: null,
    iHaveControl: false,
  });
  const [isAcquiringControl, setIsAcquiringControl] = useState(false);
  const [gameState, setGameState] = useState<GameState>({
    currentSong: null,
    isPlaying: false,
    currentTime: 0,
    songEnded: false,
    isAdPlaying: false,
    queueLength: 0,
  });
  const [librarySongs, setLibrarySongs] = useState<LibrarySong[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [librarySearch, setLibrarySearch] = useState('');
  const [queueSlots, setQueueSlots] = useState<{ used: number; max: number }>({ used: 0, max: 3 });
  const [addingSongId, setAddingSongId] = useState<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | null>(null);
  const isMicActiveRef = useRef(false);
  const hasConnectedRef = useRef(false);

  // Simple pitch detection using zero-crossing
  const detectPitchFn = useCallback((buffer: Float32Array, sampleRate: number): number | null => {
    const threshold = 0.01;
    let crossings = 0;
    let lastSign = buffer[0] >= 0;

    for (let i = 1; i < buffer.length; i++) {
      const currentSign = buffer[i] >= 0;
      if (currentSign !== lastSign && Math.abs(buffer[i]) > threshold) {
        crossings++;
        lastSign = currentSign;
      }
    }

    if (crossings < 2) return null;

    const frequency = (crossings * sampleRate) / (2 * buffer.length);
    
    if (frequency >= 80 && frequency <= 1000) {
      return Math.round(frequency);
    }
    return null;
  }, []);

  // Analyze audio - regular function that calls itself via requestAnimationFrame
  const analyzeAudio = useCallback(() => {
    if (!analyserRef.current || !audioContextRef.current || !isMicActiveRef.current) return;

    const bufferLength = analyserRef.current.fftSize;
    const dataArray = new Float32Array(bufferLength);
    analyserRef.current.getFloatTimeDomainData(dataArray);

    let sum = 0;
    for (let i = 0; i < bufferLength; i++) {
      sum += dataArray[i] * dataArray[i];
    }
    const rms = Math.sqrt(sum / bufferLength);
    const normalizedVolume = Math.min(1, rms * 5);
    setVolume(normalizedVolume);

    const pitchVal = detectPitchFn(dataArray, audioContextRef.current.sampleRate);
    setPitch(pitchVal);

    animationRef.current = requestAnimationFrame(analyzeAudio);
  }, [detectPitchFn]);

  // Connect to server
  const connect = useCallback(async () => {
    try {
      const data = await apiClient.mobileConnect();
      if (data.success) {
        setClientId(data.clientId as string);
        setConnectionCode(data.connectionCode as string);
        setIsConnected(true);
        setError(null);
      }
    } catch {
      setError('Failed to connect');
    }
  }, []);

  // Fetch library songs
  const fetchLibrarySongs = useCallback(async () => {
    setLibraryLoading(true);
    try {
      const data = await apiClient.getSongs();
      if (data.success) {
        setLibrarySongs((data.songs || []) as LibrarySong[]);
      }
    } catch {
      setError('Failed to load library');
    } finally {
      setLibraryLoading(false);
    }
  }, []);

  // Fetch queue status
  const fetchQueueStatus = useCallback(async () => {
    if (!clientId) return;
    try {
      const data = await apiClient.mobileGetQueue();
      if (data.success) {
        const myQueueItems = ((data.queue || []) as Array<{ companionCode: string; status: string }>).filter(
          (item) => 
            item.companionCode === connectionCode && item.status === 'pending'
        );
        setQueueSlots({ used: myQueueItems.length, max: 3 });
      }
    } catch {
      // Silently fail
    }
  }, [clientId, connectionCode]);

  // Add song to queue
  const addSongToQueue = useCallback(async (song: LibrarySong) => {
    if (!clientId || queueSlots.used >= queueSlots.max) {
      setError('Queue is full (max 3 songs)');
      return;
    }
    
    setAddingSongId(song.id);
    try {
      const data = await apiClient.mobileQueue(clientId, {
        songId: song.id,
        songTitle: song.title,
        songArtist: song.artist,
      });
      if (data.success) {
        setSuccessMessage(`Added "${song.title}" to queue`);
        setQueueSlots(prev => ({ ...prev, used: prev.used + 1 }));
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError((data as { message?: string }).message || 'Failed to add song');
      }
    } catch {
      setError('Failed to add song to queue');
    } finally {
      setAddingSongId(null);
    }
  }, [clientId, queueSlots]);

  // Check remote control status
  const checkRemoteControl = useCallback(async () => {
    if (!clientId) return;
    try {
      const data = await apiClient.mobileGetRemoteControl(clientId);
      if (data.success) {
        setRemoteControl(data.remoteControl as RemoteControlState);
      }
    } catch {
      // Silently fail
    }
  }, [clientId]);

  // Fetch game state
  const fetchGameState = useCallback(async () => {
    try {
      const data = await apiClient.mobileGetGameState();
      if (data.success) {
        setGameState(data.gameState as GameState);
      }
    } catch {
      // Silently fail
    }
  }, []);

  // Skip YouTube ad
  const skipAd = useCallback(async () => {
    if (!clientId) return;
    try {
      const data = await apiClient.mobileAction('skipAd', clientId);
      if (data.success) {
        setGameState(prev => ({ ...prev, isAdPlaying: false }));
      }
    } catch {
      setError('Failed to skip ad');
    }
  }, [clientId]);

  // Acquire remote control
  const acquireControl = useCallback(async () => {
    if (!clientId) return;
    setIsAcquiringControl(true);
    try {
      const data = await apiClient.mobileRemoteAcquire(clientId);
      if (data.success) {
        const rc = data.remoteControl as { lockedByName: string; lockedAt: number };
        setRemoteControl(prev => ({
          ...prev,
          isLocked: true,
          lockedBy: clientId,
          lockedByName: rc.lockedByName,
          lockedAt: rc.lockedAt,
          iHaveControl: true,
        }));
      } else {
        setError((data as { message?: string }).message || 'Could not acquire control');
        checkRemoteControl();
      }
    } catch {
      setError('Failed to acquire control');
    } finally {
      setIsAcquiringControl(false);
    }
  }, [clientId, checkRemoteControl]);

  // Release remote control
  const releaseControl = useCallback(async () => {
    if (!clientId) return;
    try {
      const data = await apiClient.mobileRemoteRelease(clientId);
      if (data.success) {
        setRemoteControl(prev => ({
          ...prev,
          isLocked: false,
          lockedBy: null,
          lockedByName: null,
          lockedAt: null,
          iHaveControl: false,
        }));
      }
    } catch {
      setError('Failed to release control');
    }
  }, [clientId]);

  // Send remote command
  const sendRemoteCommand = useCallback(async (command: string, data?: unknown) => {
    if (!clientId || !remoteControl.iHaveControl) return;
    try {
      const result = await apiClient.mobileRemoteCommand(clientId, command);
      if (!result.success) {
        setError((result as { message?: string }).message || 'Command failed');
        checkRemoteControl();
      }
    } catch {
      setError('Failed to send command');
    }
  }, [clientId, remoteControl.iHaveControl, checkRemoteControl]);

  // Start microphone
  const startMicrophone = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });

      streamRef.current = stream;
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 2048;

      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      
      isMicActiveRef.current = true;
      setIsMicActive(true);
      analyzeAudio();
    } catch {
      setError('Microphone access denied');
    }
  }, [analyzeAudio]);

  // Stop microphone
  const stopMicrophone = useCallback(() => {
    isMicActiveRef.current = false;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    setVolume(0);
    setPitch(null);
    setIsMicActive(false);
  }, []);

  // Toggle mic
  const toggleMic = useCallback(() => {
    if (isMicActive) stopMicrophone();
    else startMicrophone();
  }, [isMicActive, startMicrophone, stopMicrophone]);

  // Filter songs by search
  const filteredSongs = React.useMemo(() => {
    if (!librarySearch) return librarySongs;
    const search = librarySearch.toLowerCase();
    return librarySongs.filter(song => 
      song.title.toLowerCase().includes(search) ||
      song.artist.toLowerCase().includes(search)
    );
  }, [librarySongs, librarySearch]);

  // Poll for remote control state and game state when in remote mode
  useEffect(() => {
    if (mode === 'remote' && clientId) {
      checkRemoteControl();
      fetchGameState();
      const interval = setInterval(() => {
        checkRemoteControl();
        fetchGameState();
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [mode, clientId, checkRemoteControl, fetchGameState]);

  // Fetch library when switching to library mode
  useEffect(() => {
    if (mode === 'library') {
      fetchLibrarySongs();
      fetchQueueStatus();
    }
  }, [mode, fetchLibrarySongs, fetchQueueStatus]);

  // Cleanup and initial connection
  useEffect(() => {
    if (!hasConnectedRef.current) {
      hasConnectedRef.current = true;
      connect();
    }
    return () => {
      stopMicrophone();
      // Release remote control on unmount
      if (remoteControl.iHaveControl) {
        apiClient.mobileRemoteRelease(clientId || '').catch(() => {});
      }
    };
  }, [connect, stopMicrophone]);

  return {
    // State
    isConnected,
    clientId,
    connectionCode,
    mode,
    volume,
    pitch,
    error,
    successMessage,
    isMicActive,
    remoteControl,
    isAcquiringControl,
    gameState,
    librarySongs,
    libraryLoading,
    librarySearch,
    queueSlots,
    addingSongId,
    filteredSongs,
    // Actions
    setMode,
    setLibrarySearch,
    toggleMic,
    acquireControl,
    releaseControl,
    sendRemoteCommand,
    skipAd,
    addSongToQueue,
    setError,
    setSuccessMessage,
  };
}

// Need to import React for useMemo
import React from 'react';
