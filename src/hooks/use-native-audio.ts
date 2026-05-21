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
} from '@/lib/audio/native-audio';

import { StorageKeys, getBool, getString, setBool, setItem } from '@/lib/storage';

export interface UseNativeAudioResult {
  /** Whether native audio is enabled in settings. */
  enabled: boolean;
  /** Set native audio enabled/disabled. */
  setEnabled: (_value: boolean) => void;
  /** Currently selected device ID (persisted in localStorage). */
  deviceId: string;
  /** Set the device ID. */
  setDeviceId: (_id: string) => void;
  /** List of available audio output devices. */
  devices: AudioDeviceInfo[];
  /** Refresh the device list. */
  refreshDevices: () => Promise<void>;
  /** Current playback state (null when idle). */
  playbackState: AudioPlaybackState | null;
  /** Current position in ms, updated via Tauri Channel IPC. */
  currentPosition: number;
  /** Whether native audio is currently playing. */
  isPlaying: boolean;
  /** Play an audio file through native output. */
  play: (_filePath: string) => Promise<void>;
  /** Pause playback. */
  pause: () => Promise<void>;
  /** Resume playback. */
  resume: () => Promise<void>;
  /** Seek to position (ms). */
  seek: (_positionMs: number) => Promise<void>;
  /** Set volume (0.0 – 1.0). */
  setVolume: (_volume: number) => Promise<void>;
  /** Stop playback and reset. */
  stop: () => Promise<void>;
  /** Whether the device list is currently loading. */
  loading: boolean;
}

export function useNativeAudio(): UseNativeAudioResult {
  const [enabled, setEnabledState] = useState(() => getBool(StorageKeys.NATIVE_AUDIO_ENABLED, false));
  const [deviceId, setDeviceIdState] = useState(() => getString(StorageKeys.NATIVE_AUDIO_DEVICE, 'default'));
  const [devices, setDevices] = useState<AudioDeviceInfo[]>([]);
  const [playbackState, setPlaybackState] = useState<AudioPlaybackState | null>(null);
  const [currentPosition, setCurrentPosition] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(false);

  // Mounted guard + play generation counter to prevent stale channel callbacks
  // from overwriting state after unmount or after a newer play() call.
  const mountedRef = useRef(true);
  const playGenRef = useRef(0);

  // Persist settings
  const setEnabled = useCallback((value: boolean) => {
    setEnabledState(value);
    setBool(StorageKeys.NATIVE_AUDIO_ENABLED, value);
  }, []);

  const setDeviceId = useCallback((id: string) => {
    setDeviceIdState(id);
    setItem(StorageKeys.NATIVE_AUDIO_DEVICE, id);
  }, []);

  // Load devices on mount
  const refreshDevices = useCallback(async () => {
    setLoading(true);
    try {
      const list = await listAudioDevices();
      setDevices(list);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[NativeAudio] Failed to list devices:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    refreshDevices();
    return () => {
      mountedRef.current = false;
    };
  }, [refreshDevices]);

  // Playback controls
  const play = useCallback(async (filePath: string) => {
    const gen = ++playGenRef.current;
    try {
      setIsPlaying(true);

      // Pass Channel-based callbacks to playAudioFile.
      // Channels bypass the plugin:event ACL restriction in Tauri v2.
      await playAudioFile(filePath, deviceId, {
        onTimeUpdate: (pos) => {
          if (playGenRef.current !== gen || !mountedRef.current) return;
          setCurrentPosition(pos);
        },
        onEnded: () => {
          if (playGenRef.current !== gen || !mountedRef.current) return;
          setIsPlaying(false);
          setCurrentPosition(0);
          setPlaybackState(null);
        },
        onError: (message) => {
          if (playGenRef.current !== gen || !mountedRef.current) return;
          // eslint-disable-next-line no-console
          console.error('[NativeAudio] Backend error:', message);
        },
      });

      // Poll state briefly to get duration
      if (playGenRef.current === gen && mountedRef.current) {
        const state = await getAudioState();
        if (playGenRef.current === gen && mountedRef.current) {
          setPlaybackState(state);
        }
      }
    } catch (err) {
      if (playGenRef.current === gen && mountedRef.current) {
        setIsPlaying(false);
      }
      // eslint-disable-next-line no-console
      console.error('[NativeAudio] Play failed:', err);
      throw err;
    }
  }, [deviceId]);

  const pause = useCallback(async () => {
    try {
      await pauseAudio();
      setIsPlaying(false);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[NativeAudio] Pause failed:', err);
    }
  }, []);

  const resume = useCallback(async () => {
    try {
      await resumeAudio();
      setIsPlaying(true);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[NativeAudio] Resume failed:', err);
    }
  }, []);

  const seek = useCallback(async (positionMs: number) => {
    try {
      await seekAudio(positionMs);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[NativeAudio] Seek failed:', err);
    }
  }, []);

  const setVolume = useCallback(async (volume: number) => {
    try {
      await setAudioVolume(volume);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[NativeAudio] Set volume failed:', err);
    }
  }, []);

  const stop = useCallback(async () => {
    ++playGenRef.current; // Invalidate any in-flight play() callbacks
    try {
      await stopAudio();
      setIsPlaying(false);
      setCurrentPosition(0);
      setPlaybackState(null);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[NativeAudio] Stop failed:', err);
    }
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
