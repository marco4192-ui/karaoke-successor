import { PitchDetectionResult, frequencyToMidi, Difficulty, DIFFICULTY_SETTINGS } from '@/types/game';

// Karaoke-optimized pitch detection settings
export interface PitchDetectorConfig {
  volumeThreshold: number;        // Minimum volume to register (0-1)
  pitchStabilityFrames: number;   // Consecutive frames required for stable pitch
  yinThreshold: number;           // YIN algorithm threshold (0.1-0.3, lower = more sensitive)
  noiseGateEnabled: boolean;      // Enable noise gate
  noiseGateThreshold: number;     // Noise gate threshold in dB (-60 to -20)
  minFrequency: number;           // Minimum frequency to detect (Hz)
  maxFrequency: number;           // Maximum frequency to detect (Hz)
}

// Karaoke-optimized defaults - more lenient for casual singing
export const KARAOKE_DEFAULT_CONFIG: PitchDetectorConfig = {
  volumeThreshold: 0.03,          // Sensitive - picks up normal singing
  pitchStabilityFrames: 3,        // Quick response (~50ms at 60fps)
  yinThreshold: 0.12,             // Lenient YIN threshold for better detection
  noiseGateEnabled: true,
  noiseGateThreshold: -45,        // -45dB noise gate
  minFrequency: 65,               // C2
  maxFrequency: 1047,             // C6
};

// Difficulty-based configurations - optimized for karaoke
export const DIFFICULTY_PITCH_CONFIGS: Record<Difficulty, PitchDetectorConfig> = {
  easy: {
    volumeThreshold: 0.02,        // Very sensitive - picks up quiet singing
    pitchStabilityFrames: 2,      // Quick response
    yinThreshold: 0.10,           // Very lenient pitch detection
    noiseGateEnabled: true,
    noiseGateThreshold: -50,      // Lenient noise gate
    minFrequency: 65,
    maxFrequency: 1047,
  },
  medium: {
    volumeThreshold: 0.04,        // Sensitive
    pitchStabilityFrames: 3,      // Quick but stable
    yinThreshold: 0.12,           // Standard detection
    noiseGateEnabled: true,
    noiseGateThreshold: -45,
    minFrequency: 65,
    maxFrequency: 1047,
  },
  hard: {
    volumeThreshold: 0.06,        // Moderate sensitivity
    pitchStabilityFrames: 5,      // More stable pitch required
    yinThreshold: 0.15,           // Stricter detection
    noiseGateEnabled: true,
    noiseGateThreshold: -40,
    minFrequency: 65,
    maxFrequency: 1047,
  },
};

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

  // Configuration
  private config: PitchDetectorConfig;
  
  // Pitch stability tracking
  private recentPitches: number[] = [];
  private lastStablePitch: number | null = null;
  
  constructor(config: Partial<PitchDetectorConfig> = {}) {
    this.config = { ...KARAOKE_DEFAULT_CONFIG, ...config };
  }

  // Update configuration
  setConfig(config: Partial<PitchDetectorConfig>): void {
    this.config = { ...this.config, ...config };
    // Clear stability buffer when config changes
    this.recentPitches = [];
    this.lastStablePitch = null;
  }

  // Set configuration based on difficulty
  setDifficulty(difficulty: Difficulty): void {
    this.setConfig(DIFFICULTY_PITCH_CONFIGS[difficulty]);
  }

  async initialize(): Promise<boolean> {
    try {
      // Request high-quality audio for karaoke
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100,  // CD quality
          channelCount: 1,    // Mono for karaoke
        },
      });

      this.audioContext = new AudioContext({ sampleRate: 44100 });
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
    this.recentPitches = [];
    this.lastStablePitch = null;
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

    this.analyser.getFloatTimeDomainData(this.buffer as Float32Array<ArrayBuffer>);
    this.analyser.getFloatFrequencyData(this.frequencyBuffer as Float32Array<ArrayBuffer>);

    // Calculate volume (RMS)
    let sum = 0;
    for (let i = 0; i < this.buffer.length; i++) {
      sum += this.buffer[i] * this.buffer[i];
    }
    const rms = Math.sqrt(sum / this.buffer.length);
    const volume = Math.min(1, rms * 5); // Normalize to 0-1

    // Noise gate check
    if (this.config.noiseGateEnabled && rms < 0.01) {
      this.onPitchDetected?.({
        frequency: null,
        note: null,
        clarity: 0,
        volume,
      });
      this.animationFrame = requestAnimationFrame(() => this.detect());
      return;
    }

    // Volume threshold check (configurable)
    if (rms < this.config.volumeThreshold / 5) {
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
    const frequency = this.yinPitchDetection(this.buffer, this.audioContext!.sampleRate, this.config.yinThreshold);

    if (frequency !== null && frequency >= this.config.minFrequency && frequency <= this.config.maxFrequency) {
      const note = frequencyToMidi(frequency);
      const clarity = this.calculateClarity(this.buffer, frequency, this.audioContext!.sampleRate);
      
      // Pitch stability check
      const stablePitch = this.checkPitchStability(note);

      if (stablePitch !== null) {
        this.onPitchDetected?.({
          frequency,
          note: stablePitch,
          clarity,
          volume,
        });
      } else {
        // Still updating stability, use current pitch
        this.onPitchDetected?.({
          frequency,
          note,
          clarity,
          volume,
        });
      }
    } else {
      this.onPitchDetected?.({
        frequency: null,
        note: null,
        clarity: 0,
        volume,
      });
      // Reset stability on no pitch
      this.recentPitches = [];
    }

    this.animationFrame = requestAnimationFrame(() => this.detect());
  }

  // Check if pitch has been stable for required frames
  private checkPitchStability(currentPitch: number): number | null {
    // Add current pitch to history
    this.recentPitches.push(currentPitch);
    
    // Keep only required number of frames
    if (this.recentPitches.length > this.config.pitchStabilityFrames) {
      this.recentPitches.shift();
    }
    
    // Not enough frames yet
    if (this.recentPitches.length < this.config.pitchStabilityFrames) {
      return this.lastStablePitch;
    }
    
    // Check if all recent pitches are within 1 semitone
    const avgPitch = this.recentPitches.reduce((a, b) => a + b, 0) / this.recentPitches.length;
    const maxDiff = Math.max(...this.recentPitches.map(p => Math.abs(p - avgPitch)));
    
    if (maxDiff <= 1) {
      this.lastStablePitch = Math.round(avgPitch * 10) / 10; // Round to 0.1 semitone
      return this.lastStablePitch;
    }
    
    return this.lastStablePitch;
  }

  private yinPitchDetection(buffer: Float32Array<ArrayBufferLike>, sampleRate: number, threshold: number = 0.15): number | null {
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

  private calculateClarity(buffer: Float32Array<ArrayBufferLike>, frequency: number, sampleRate: number): number {
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

  async destroy(): Promise<void> {
    this.stop();
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
    if (this.audioContext) {
      await this.audioContext.close();
      this.audioContext = null;
    }
    this.analyser = null;
    this.buffer = null;
    this.frequencyBuffer = null;
  }
}

// Singleton instance
let pitchDetectorInstance: PitchDetector | null = null;
let pitchDetectorCleanupRegistered = false;

export function getPitchDetector(): PitchDetector {
  if (!pitchDetectorInstance) {
    pitchDetectorInstance = new PitchDetector();

    // Cleanup on page unload (only register once)
    if (typeof window !== 'undefined' && !pitchDetectorCleanupRegistered) {
      pitchDetectorCleanupRegistered = true;
      window.addEventListener('beforeunload', () => {
        pitchDetectorInstance?.destroy();
        pitchDetectorInstance = null;
      });
    }
  }
  return pitchDetectorInstance;
}

// Function to reset the singleton (useful for testing or manual cleanup)
export function resetPitchDetector(): void {
  if (pitchDetectorInstance) {
    pitchDetectorInstance.destroy();
    pitchDetectorInstance = null;
  }
}
