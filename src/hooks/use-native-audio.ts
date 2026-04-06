'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  type AudioDeviceInfo,
  type AudioPlaybackState,
  listAudioDevices,
  playAudioFile,
  pauseAudio,
  resumeAudio,
  seekAudio,
  setAudioVolume,
  stopAudio,
  getAudioState,
  onAudioTimeUpdate,
  onAudioEnded,
} from '@/lib/audio/native-audio';

const STORAGE_KEY = 'karaoke-native-audio-device';
const ENABLED_KEY = 'karaoke-native-audio-enabled';

export interface UseNativeAudioResult {
  /** Whether native audio is enabled in settings. */
  enabled: boolean;
  /** Set native audio enabled/disabled. */
  setEnabled: (value: boolean) => void;
  /** Currently selected device ID (persisted in localStorage). */
  deviceId: string;
  /** Set the device ID. */
  setDeviceId: (id: string) => void;
  /** List of available audio output devices. */
  devices: AudioDeviceInfo[];
  /** Refresh the device list. */
  refreshDevices: () => Promise<void>;
  /** Current playback state (null when idle). */
  playbackState: AudioPlaybackState | null;
  /** Current position in ms, updated via Tauri events. */
  currentPosition: number;
  /** Whether native audio is currently playing. */
  isPlaying: boolean;
  /** Play an audio file through native output. */
  play: (filePath: string) => Promise<void>;
  /** Pause playback. */
  pause: () => Promise<void>;
  /** Resume playback. */
  resume: () => Promise<void>;
  /** Seek to position (ms). */
  seek: (positionMs: number) => Promise<void>;
  /** Set volume (0.0 – 1.0). */
  setVolume: (volume: number) => Promise<void>;
  /** Stop playback and reset. */
  stop: () => Promise<void>;
  /** Whether the device list is currently loading. */
  loading: boolean;
}

export function useNativeAudio(): UseNativeAudioResult {
  const [enabled, setEnabledState] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(ENABLED_KEY) === 'true';
  });
  const [deviceId, setDeviceIdState] = useState(() => {
    if (typeof window === 'undefined') return 'default';
    return localStorage.getItem(STORAGE_KEY) || 'default';
  });
  const [devices, setDevices] = useState<AudioDeviceInfo[]>([]);
  const [playbackState, setPlaybackState] = useState<AudioPlaybackState | null>(null);
  const [currentPosition, setCurrentPosition] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(false);

  // Refs for unlisten cleanup
  const unlistenTimeRef = useRef<(() => void) | null>(null);
  const unlistenEndedRef = useRef<(() => void) | null>(null);

  // Persist settings
  const setEnabled = useCallback((value: boolean) => {
    setEnabledState(value);
    localStorage.setItem(ENABLED_KEY, String(value));
  }, []);

  const setDeviceId = useCallback((id: string) => {
    setDeviceIdState(id);
    localStorage.setItem(STORAGE_KEY, id);
  }, []);

  // Load devices on mount
  const refreshDevices = useCallback(async () => {
    setLoading(true);
    try {
      const list = await listAudioDevices();
      setDevices(list);
      console.log('[NativeAudio] Devices loaded:', list.length);
    } catch (err) {
      console.error('[NativeAudio] Failed to list devices:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshDevices();

    // Setup event listeners
    onAudioTimeUpdate((pos) => {
      setCurrentPosition(pos);
    }).then((unlisten) => {
      unlistenTimeRef.current = unlisten;
    });

    onAudioEnded(() => {
      setIsPlaying(false);
      setCurrentPosition(0);
      setPlaybackState(null);
    }).then((unlisten) => {
      unlistenEndedRef.current = unlisten;
    });

    return () => {
      unlistenTimeRef.current?.();
      unlistenEndedRef.current?.();
    };
  }, [refreshDevices]);

  // Playback controls
  const play = useCallback(async (filePath: string) => {
    try {
      await playAudioFile(filePath, deviceId);
      setIsPlaying(true);
      // Poll state briefly to get duration
      const state = await getAudioState();
      setPlaybackState(state);
    } catch (err) {
      console.error('[NativeAudio] Play failed:', err);
      throw err;
    }
  }, [deviceId]);

  const pause = useCallback(async () => {
    await pauseAudio();
    setIsPlaying(false);
  }, []);

  const resume = useCallback(async () => {
    await resumeAudio();
    setIsPlaying(true);
  }, []);

  const seek = useCallback(async (positionMs: number) => {
    await seekAudio(positionMs);
  }, []);

  const setVolume = useCallback(async (volume: number) => {
    await setAudioVolume(volume);
  }, []);

  const stop = useCallback(async () => {
    await stopAudio();
    setIsPlaying(false);
    setCurrentPosition(0);
    setPlaybackState(null);
  }, []);

  return {
    enabled,
    setEnabled,
    deviceId,
    setDeviceId,
    devices,
    refreshDevices,
    playbackState,
    currentPosition,
    isPlaying,
    play,
    pause,
    resume,
    seek,
    setVolume,
    stop,
    loading,
  };
}
