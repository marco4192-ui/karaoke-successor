/**
 * Audio Utilities for Vocal Separator
 * Helper functions for audio processing
 */

import { StemType } from './types';

/**
 * Convert AudioBuffer to WAV blob
 */
export function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const length = buffer.length;

  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = length * blockAlign;
  const headerSize = 44;
  const totalSize = headerSize + dataSize;

  const arrayBuffer = new ArrayBuffer(totalSize);
  const view = new DataView(arrayBuffer);

  // WAV header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, totalSize - 8, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // fmt chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bytesPerSample * 8, true);
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  // Interleave channels and write samples
  const channels: Float32Array[] = [];
  for (let i = 0; i < numChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }

  let offset = 44;
  for (let i = 0; i < length; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = Math.max(-1, Math.min(1, channels[ch][i]));
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      view.setInt16(offset, intSample, true);
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

/**
 * Convert Blob to AudioBuffer
 */
export async function blobToAudioBuffer(blob: Blob, audioContext: AudioContext): Promise<AudioBuffer> {
  const arrayBuffer = await blob.arrayBuffer();
  return audioContext.decodeAudioData(arrayBuffer);
}

/**
 * Load audio file from URL or File
 */
export async function loadAudioFile(
  source: string | File,
  audioContext: AudioContext
): Promise<AudioBuffer> {
  let blob: Blob;

  if (typeof source === 'string') {
    const response = await fetch(source);
    if (!response.ok) {
      throw new Error(`Failed to load audio: ${response.statusText}`);
    }
    blob = await response.blob();
  } else {
    blob = source;
  }

  return blobToAudioBuffer(blob, audioContext);
}

/**
 * Create a stereo AudioBuffer from mono
 */
export function monoToStereo(monoBuffer: AudioBuffer, audioContext: AudioContext): AudioBuffer {
  const stereoBuffer = audioContext.createBuffer(2, monoBuffer.length, monoBuffer.sampleRate);
  const monoData = monoBuffer.getChannelData(0);

  stereoBuffer.copyToChannel(monoData, 0);
  stereoBuffer.copyToChannel(monoData, 1);

  return stereoBuffer;
}

/**
 * Mix multiple AudioBuffers together
 */
export function mixAudioBuffers(
  buffers: AudioBuffer[],
  audioContext: AudioContext,
  gains: number[] = []
): AudioBuffer {
  if (buffers.length === 0) {
    throw new Error('No buffers to mix');
  }

  const maxLength = Math.max(...buffers.map(b => b.length));
  const numChannels = Math.max(...buffers.map(b => b.numberOfChannels));
  const sampleRate = buffers[0].sampleRate;

  const result = audioContext.createBuffer(numChannels, maxLength, sampleRate);

  for (let ch = 0; ch < numChannels; ch++) {
    const resultData = result.getChannelData(ch);

    for (let i = 0; i < buffers.length; i++) {
      const buffer = buffers[i];
      const gain = gains[i] ?? 1;
      const channelData = buffer.getChannelData(Math.min(ch, buffer.numberOfChannels - 1));

      for (let j = 0; j < channelData.length; j++) {
        resultData[j] += channelData[j] * gain;
      }
    }
  }

  return result;
}

/**
 * Normalize audio buffer to target peak
 */
export function normalizeAudioBuffer(buffer: AudioBuffer, targetPeak: number = 0.95): AudioBuffer {
  let maxPeak = 0;

  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < data.length; i++) {
      maxPeak = Math.max(maxPeak, Math.abs(data[i]));
    }
  }

  if (maxPeak === 0) return buffer;

  const gain = targetPeak / maxPeak;
  const result = new AudioBuffer({
    length: buffer.length,
    numberOfChannels: buffer.numberOfChannels,
    sampleRate: buffer.sampleRate,
  });

  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const sourceData = buffer.getChannelData(ch);
    const destData = result.getChannelData(ch);
    for (let i = 0; i < sourceData.length; i++) {
      destData[i] = sourceData[i] * gain;
    }
  }

  return result;
}

/**
 * Calculate hash for audio file (for caching)
 */
export async function calculateAudioHash(source: string | File): Promise<string> {
  let buffer: ArrayBuffer;

  if (typeof source === 'string') {
    const response = await fetch(source);
    buffer = await response.arrayBuffer();
  } else {
    buffer = await source.arrayBuffer();
  }

  // Simple hash using first 1MB + size + last 1MB
  const hashBuffer = new Uint8Array(8);
  const view = new DataView(hashBuffer.buffer);

  // Use first 8 bytes and last 8 bytes + size
  const arr = new Uint8Array(buffer);
  view.setUint32(0, arr.slice(0, 4).reduce((a, b) => a + b, 0), true);
  view.setUint32(4, buffer.byteLength, true);

  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Resample audio buffer to target sample rate
 */
export function resampleAudioBuffer(
  buffer: AudioBuffer,
  targetSampleRate: number,
  audioContext: AudioContext
): AudioBuffer {
  if (buffer.sampleRate === targetSampleRate) {
    return buffer;
  }

  const ratio = targetSampleRate / buffer.sampleRate;
  const newLength = Math.ceil(buffer.length * ratio);

  const result = audioContext.createBuffer(
    buffer.numberOfChannels,
    newLength,
    targetSampleRate
  );

  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const sourceData = buffer.getChannelData(ch);
    const destData = result.getChannelData(ch);

    // Simple linear interpolation resampling
    for (let i = 0; i < newLength; i++) {
      const sourceIndex = i / ratio;
      const index = Math.floor(sourceIndex);
      const fraction = sourceIndex - index;

      if (index + 1 < sourceData.length) {
        destData[i] = sourceData[index] * (1 - fraction) + sourceData[index + 1] * fraction;
      } else {
        destData[i] = sourceData[index] ?? 0;
      }
    }
  }

  return result;
}

/**
 * Split stereo buffer to two mono buffers
 */
export function splitStereo(buffer: AudioBuffer, audioContext: AudioContext): [AudioBuffer, AudioBuffer] {
  if (buffer.numberOfChannels < 2) {
    const mono = buffer.numberOfChannels === 1 ? buffer : monoToStereo(buffer, audioContext);
    return [mono, mono];
  }

  const left = audioContext.createBuffer(1, buffer.length, buffer.sampleRate);
  const right = audioContext.createBuffer(1, buffer.length, buffer.sampleRate);

  left.copyToChannel(buffer.getChannelData(0), 0);
  right.copyToChannel(buffer.getChannelData(1), 0);

  return [left, right];
}

/**
 * Get stem display name
 */
export function getStemDisplayName(stem: StemType): string {
  const names: Record<StemType, string> = {
    vocals: 'Vocals',
    instrumental: 'Instrumental',
    drums: 'Drums',
    bass: 'Bass',
    other: 'Other',
    accompaniment: 'Accompaniment',
  };
  return names[stem] || stem;
}

/**
 * Get stem icon
 */
export function getStemIcon(stem: StemType): string {
  const icons: Record<StemType, string> = {
    vocals: '🎤',
    instrumental: '🎸',
    drums: '🥁',
    bass: '🎸',
    other: '🎵',
    accompaniment: '🎹',
  };
  return icons[stem] || '🎵';
}

// Helper function
function writeString(view: DataView, offset: number, string: string): void {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}
