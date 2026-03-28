/**
 * Pitch Detection Utility Functions
 * Pure functions for pitch detection algorithms - can be tested without browser dependencies
 */

import { PitchDetectorConfig, KARAOKE_DEFAULT_CONFIG } from './pitch-detector';

/**
 * YIN pitch detection algorithm
 * Detects the fundamental frequency of an audio signal
 */
export function yinPitchDetection(
  buffer: Float32Array,
  sampleRate: number,
  threshold: number = 0.15
): number | null {
  const yinBuffer = new Float32Array(buffer.length / 2);
  const yinBufferLength = buffer.length / 2;

  // Compute difference function
  for (let tau = 0; tau < yinBufferLength; tau++) {
    yinBuffer[tau] = 0;
    for (let i = 0; i < yinBufferLength; i++) {
      const delta = buffer[i] - buffer[i + tau];
      yinBuffer[tau] += delta * delta;
    }
  }

  // Cumulative mean normalized difference function
  yinBuffer[0] = 1;
  let runningSum = 0;
  for (let tau = 1; tau < yinBufferLength; tau++) {
    runningSum += yinBuffer[tau];
    yinBuffer[tau] *= tau / runningSum;
  }

  // Find the first tau where the value is below threshold
  let tauEstimate = -1;
  for (let tau = 2; tau < yinBufferLength; tau++) {
    if (yinBuffer[tau] < threshold) {
      while (tau + 1 < yinBufferLength && yinBuffer[tau + 1] < yinBuffer[tau]) {
        tau++;
      }
      tauEstimate = tau;
      break;
    }
  }

  if (tauEstimate === -1) {
    return null;
  }

  // Parabolic interpolation for better accuracy
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
}

/**
 * Calculate clarity of a detected pitch
 * Returns a value between 0 and 1 indicating how clear/periodic the signal is
 */
export function calculateClarity(
  buffer: Float32Array,
  frequency: number,
  sampleRate: number
): number {
  const period = Math.round(sampleRate / frequency);
  let correlation = 0;
  let energy = 0;

  for (let i = 0; i < buffer.length - period; i++) {
    correlation += buffer[i] * buffer[i + period];
    energy += buffer[i] * buffer[i];
  }

  if (energy === 0) return 0;
  return Math.min(1, Math.abs(correlation / energy));
}

/**
 * Check pitch stability
 * Determines if recent pitches are consistent enough to report a stable pitch
 */
export function checkPitchStability(
  recentPitches: number[],
  requiredFrames: number,
  lastStablePitch: number | null
): { stablePitch: number | null; lastStablePitch: number | null } {
  if (recentPitches.length < requiredFrames) {
    return { stablePitch: null, lastStablePitch };
  }

  const avgPitch = recentPitches.reduce((a, b) => a + b, 0) / recentPitches.length;
  const maxDiff = Math.max(...recentPitches.map(p => Math.abs(p - avgPitch)));

  if (maxDiff <= 1) {
    const newStablePitch = Math.round(avgPitch * 10) / 10;
    return { stablePitch: newStablePitch, lastStablePitch: newStablePitch };
  }

  return { stablePitch: lastStablePitch, lastStablePitch };
}

/**
 * Create a pitch detector config with defaults
 */
export function createPitchDetectorConfig(
  overrides: Partial<PitchDetectorConfig>
): PitchDetectorConfig {
  return { ...KARAOKE_DEFAULT_CONFIG, ...overrides };
}

/**
 * Generate a sine wave buffer for testing
 */
export function generateSineWaveBuffer(
  frequency: number,
  sampleRate: number,
  length: number
): Float32Array {
  const buffer = new Float32Array(length);
  const period = sampleRate / frequency;

  for (let i = 0; i < length; i++) {
    buffer[i] = Math.sin((2 * Math.PI * i) / period);
  }

  return buffer;
}

/**
 * Calculate RMS (Root Mean Square) of a buffer
 * Used for volume detection
 */
export function calculateRMS(buffer: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < buffer.length; i++) {
    sum += buffer[i] * buffer[i];
  }
  return Math.sqrt(sum / buffer.length);
}

/**
 * Convert dB to linear value
 */
export function dbToLinear(db: number): number {
  return Math.pow(10, db / 20);
}

/**
 * Convert linear value to dB
 */
export function linearToDb(linear: number): number {
  if (linear <= 0) return -Infinity;
  return 20 * Math.log10(linear);
}

/**
 * Estimate the optimal buffer size for a target latency
 */
export function estimateBufferSize(sampleRate: number, targetLatencyMs: number): number {
  const samplesNeeded = (sampleRate * targetLatencyMs) / 1000;
  // Round up to nearest power of 2
  const powerOf2 = Math.ceil(Math.log2(samplesNeeded));
  return Math.pow(2, powerOf2);
}

/**
 * Calculate the latency in milliseconds for a given buffer size
 */
export function calculateBufferLatency(bufferSize: number, sampleRate: number): number {
  return (bufferSize / sampleRate) * 1000;
}
