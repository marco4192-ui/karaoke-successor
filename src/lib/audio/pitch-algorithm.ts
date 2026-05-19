/**
 * Core pitch detection algorithms.
 *
 * Pure functions operating on audio buffers — no class state, no DOM APIs.
 * This makes them easy to test and portable (e.g. to an AudioWorklet).
 */

/**
 * YIN pitch detection algorithm.
 *
 * Takes a pre-allocated `yinBuffer` (half the length of `buffer`) to avoid
 * per-frame heap allocations.  Returns the detected frequency in Hz or `null`
 * if no clear pitch is found.
 *
 * @param buffer   - Time-domain audio samples
 * @param yinBuffer - Pre-allocated scratch buffer (length ≥ ⌊buffer.length / 2⌋)
 * @param sampleRate - Audio sample rate in Hz
 * @param threshold  - YIN threshold (0.1–0.3, lower = more sensitive)
 */
export function yinPitchDetection(
  buffer: Float32Array<ArrayBufferLike>,
  yinBuffer: Float32Array,
  sampleRate: number,
  threshold: number = 0.15,
): number | null {
  const yinBufferLength = yinBuffer.length;

  // Compute difference function
  for (let tau = 0; tau < yinBufferLength; tau++) {
    yinBuffer[tau] = 0;
    for (let i = 0; i + tau < buffer.length; i++) {
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
    const denominator = 2 * s1 - s2 - s0;
    betterTau = Math.abs(denominator) < 1e-10
      ? tauEstimate
      : tauEstimate + (s2 - s0) / (2 * denominator);
  }

  return sampleRate / betterTau;
}

/**
 * Calculate pitch clarity (0–1) via autocorrelation at the detected period.
 *
 * High clarity means the audio is very periodic (pure tone); low clarity
 * means noisy / aperiodic sound.
 */
export function calculateClarity(
  buffer: Float32Array<ArrayBufferLike>,
  frequency: number,
  sampleRate: number,
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
