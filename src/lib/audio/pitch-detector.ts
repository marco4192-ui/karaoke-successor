import { PitchDetectionResult, frequencyToMidi } from '@/types/game';

export class PitchDetector {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaStream: MediaStream | null = null;
  private isListening = false;
  private animationFrame: number | null = null;
  private onPitchDetected: ((result: PitchDetectionResult) => void) | null = null;

  // FFT buffer
  private bufferSize = 4096;
  private buffer: Float32Array | null = null;
  private frequencyBuffer: Float32Array | null = null;

  // Pitch detection settings
  private minFrequency = 65; // C2
  private maxFrequency = 1047; // C6

  async initialize(): Promise<boolean> {
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      this.audioContext = new AudioContext();
      const source = this.audioContext.createMediaStreamSource(this.mediaStream);

      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = this.bufferSize;
      this.analyser.smoothingTimeConstant = 0.8;

      source.connect(this.analyser);

      this.buffer = new Float32Array(this.analyser.fftSize);
      this.frequencyBuffer = new Float32Array(this.analyser.frequencyBinCount);

      return true;
    } catch (error) {
      console.error('Failed to initialize pitch detector:', error);
      return false;
    }
  }

  start(callback: (result: PitchDetectionResult) => void): void {
    if (!this.analyser || !this.buffer) {
      console.error('Pitch detector not initialized');
      return;
    }

    this.onPitchDetected = callback;
    this.isListening = true;
    this.detect();
  }

  stop(): void {
    this.isListening = false;
    if (this.animationFrame !== null) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }

  private detect(): void {
    if (!this.isListening || !this.analyser || !this.buffer || !this.frequencyBuffer) {
      return;
    }

    this.analyser.getFloatTimeDomainData(this.buffer);
    this.analyser.getFloatFrequencyData(this.frequencyBuffer);

    // Calculate volume (RMS)
    let sum = 0;
    for (let i = 0; i < this.buffer.length; i++) {
      sum += this.buffer[i] * this.buffer[i];
    }
    const rms = Math.sqrt(sum / this.buffer.length);
    const volume = Math.min(1, rms * 5); // Normalize to 0-1

    // Only detect pitch if there's enough signal
    if (rms < 0.01) {
      this.onPitchDetected?.({
        frequency: null,
        note: null,
        clarity: 0,
        volume,
      });
      this.animationFrame = requestAnimationFrame(() => this.detect());
      return;
    }

    // Use YIN algorithm for pitch detection
    const frequency = this.yinPitchDetection(this.buffer, this.audioContext!.sampleRate);

    if (frequency !== null && frequency >= this.minFrequency && frequency <= this.maxFrequency) {
      const note = frequencyToMidi(frequency);
      const clarity = this.calculateClarity(this.buffer, frequency, this.audioContext!.sampleRate);

      this.onPitchDetected?.({
        frequency,
        note,
        clarity,
        volume,
      });
    } else {
      this.onPitchDetected?.({
        frequency: null,
        note: null,
        clarity: 0,
        volume,
      });
    }

    this.animationFrame = requestAnimationFrame(() => this.detect());
  }

  private yinPitchDetection(buffer: Float32Array, sampleRate: number): number | null {
    const yinBuffer = new Float32Array(buffer.length / 2);
    const yinThreshold = 0.15;
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
      if (yinBuffer[tau] < yinThreshold) {
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

  private calculateClarity(buffer: Float32Array, frequency: number, sampleRate: number): number {
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

  destroy(): void {
    this.stop();
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.analyser = null;
    this.buffer = null;
    this.frequencyBuffer = null;
  }
}

// Singleton instance
let pitchDetectorInstance: PitchDetector | null = null;

export function getPitchDetector(): PitchDetector {
  if (!pitchDetectorInstance) {
    pitchDetectorInstance = new PitchDetector();
  }
  return pitchDetectorInstance;
}
