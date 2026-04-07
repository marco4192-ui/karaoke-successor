// Native Audio - TypeScript wrappers for Tauri native audio commands.
// Supports ASIO and WASAPI output devices for low-latency audio playback.

import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';

// ---- Types ----

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

// ---- Device Management ----

/** List all available audio output devices (ASIO + WASAPI). */
export async function listAudioDevices(): Promise<AudioDeviceInfo[]> {
  return invoke<AudioDeviceInfo[]>('audio_list_devices');
}

/** Get the system default output device. */
export async function getDefaultAudioDevice(): Promise<AudioDeviceInfo> {
  return invoke<AudioDeviceInfo>('audio_get_default_device');
}

// ---- Playback Control ----

/** Play an audio file on the specified device. */
export async function playAudioFile(
  filePath: string,
  deviceId: string = 'default'
): Promise<void> {
  return invoke<void>('audio_play_file', { filePath, deviceId });
}

/** Pause native audio playback. */
export async function pauseAudio(): Promise<void> {
  return invoke<void>('audio_pause');
}

/** Resume native audio playback. */
export async function resumeAudio(): Promise<void> {
  return invoke<void>('audio_resume');
}

/** Seek to a position in milliseconds. */
export async function seekAudio(positionMs: number): Promise<void> {
  return invoke<void>('audio_seek', { positionMs });
}

/** Set volume (0.0 – 1.0). */
export async function setAudioVolume(volume: number): Promise<void> {
  return invoke<void>('audio_set_volume', { volume });
}

/** Stop native audio playback. */
export async function stopAudio(): Promise<void> {
  return invoke<void>('audio_stop');
}

/** Get current playback position in ms. */
export async function getAudioPosition(): Promise<number> {
  return invoke<number>('audio_get_position');
}

/** Get full playback state. */
export async function getAudioState(): Promise<AudioPlaybackState> {
  return invoke<AudioPlaybackState>('audio_get_state');
}

// ---- Event Listeners ----

/** Subscribe to time-update events from native audio. */
export async function onAudioTimeUpdate(
  callback: (positionMs: number) => void
): Promise<UnlistenFn> {
  return listen<number>('audio:time-update', (event) => {
    callback(event.payload);
  });
}

/** Subscribe to playback-ended events from native audio. */
export async function onAudioEnded(
  callback: () => void
): Promise<UnlistenFn> {
  return listen<void>('audio:ended', () => {
    callback();
  });
}
