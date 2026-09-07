// Native Audio - TypeScript wrappers for Tauri native audio commands.
// Supports ASIO and WASAPI output devices for low-latency audio playback.
//
// Events (time-update, ended, error) are delivered via Tauri Channel IPC,
// which bypasses plugin:event ACL restrictions in Tauri v2.

import { invoke, Channel } from '@tauri-apps/api/core';

// ---- Types ----

/** Whether the Tauri IPC bridge is available (i.e. we run inside the desktop app). */
function isTauriAvailable(): boolean {
  return typeof window !== 'undefined'
    && ('__TAURI__' in window || '__TAURI_INTERNALS__' in window);
}

/**
 * Guard: no-op outside Tauri. Prevents "Cannot read properties of undefined
 * (reading 'invoke')" TypeErrors when playback cleanup calls run in the browser.
 */
function tauriInvoke<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  if (!isTauriAvailable()) {
    return Promise.resolve(undefined as unknown as T);
  }
  return invoke<T>(command, args);
}

export interface AudioDeviceInfo {
  id: string;
  name: string;
  host_name: string;
  default_sample_rate: number;
  max_channels: number;
}

export interface AudioPlaybackState {
  position_ms: number;
  duration_ms: number;
  is_playing: boolean;
  volume: number;
}

/** Callbacks for native audio streaming events. */
export interface AudioEventCallbacks {
  /** Called ~20 times/sec with the current position in milliseconds. */
  onTimeUpdate?: (_positionMs: number) => void;
  /** Called once when playback reaches the end of the track. */
  onEnded?: () => void;
  /** Called when the backend encounters a playback error. */
  onError?: (_message: string) => void;
}

// ---- Device Management ----

/** List all available audio output devices (ASIO + WASAPI). Empty outside Tauri. */
export async function listAudioDevices(): Promise<AudioDeviceInfo[]> {
  if (!isTauriAvailable()) return [];
  return tauriInvoke<AudioDeviceInfo[]>('audio_list_devices');
}

// ---- Playback Control ----

/**
 * Play an audio file on the specified device.
 *
 * Streaming events (time-update, ended, error) are delivered via Tauri
 * Channels passed as parameters. This bypasses the plugin:event ACL that
 * blocks `listen()` in Tauri v2.
 */
export async function playAudioFile(
  filePath: string,
  deviceId: string = 'default',
  callbacks?: AudioEventCallbacks
): Promise<void> {
  // Outside Tauri there is no native output — resolve immediately so callers
  // fall back to the regular HTMLAudioElement pipeline.
  if (!isTauriAvailable()) return;

  // Create Tauri Channels for streaming events
  const onTimeUpdate = new Channel<number>();
  if (callbacks?.onTimeUpdate) {
    onTimeUpdate.onmessage = (positionMs) => callbacks.onTimeUpdate!(positionMs);
  }

  const onEnded = new Channel<void>();
  if (callbacks?.onEnded) {
    onEnded.onmessage = () => callbacks.onEnded!();
  }

  const onError = new Channel<string>();
  if (callbacks?.onError) {
    onError.onmessage = (message) => callbacks.onError!(message);
  }

  return tauriInvoke<void>('audio_play_file', {
    filePath,
    deviceId,
    onTimeUpdate,
    onEnded,
    onError,
  });
}

/** Pause native audio playback. */
export async function pauseAudio(): Promise<void> {
  return tauriInvoke<void>('audio_pause');
}

/** Resume native audio playback. */
export async function resumeAudio(): Promise<void> {
  return tauriInvoke<void>('audio_resume');
}

/** Seek to a position in milliseconds. */
export async function seekAudio(positionMs: number): Promise<void> {
  return tauriInvoke<void>('audio_seek', { positionMs });
}

/** Set volume (0.0 – 1.0). */
export async function setAudioVolume(volume: number): Promise<void> {
  return tauriInvoke<void>('audio_set_volume', { volume });
}

/** Stop native audio playback. */
export async function stopAudio(): Promise<void> {
  return tauriInvoke<void>('audio_stop');
}

/** Get full playback state. Null outside Tauri. */
export async function getAudioState(): Promise<AudioPlaybackState> {
  if (!isTauriAvailable()) {
    return { position_ms: 0, duration_ms: 0, is_playing: false, volume: 1 };
  }
  return tauriInvoke<AudioPlaybackState>('audio_get_state');
}
