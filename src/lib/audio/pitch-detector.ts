import { PitchDetectionResult, frequencyToMidi, Difficulty } from '@/types/game';
import { logger } from '@/lib/logger';

// Re-export PitchDetectionResult for convenience
export type { PitchDetectionResult } from '@/types/game';

// ==================== CONFIGURATION ====================

export interface PitchDetectorConfig {
  volumeThreshold: number;
  pitchStabilityFrames: number;
  yinThreshold: number;
  noiseGateEnabled: boolean;
  noiseGateThreshold: number;
  minFrequency: number;
  maxFrequency: number;
  // Performance settings
  bufferSize: number;  // Smaller = lower latency but more CPU
  useWorklet: boolean; // Use AudioWorklet if available
}

// Low-latency defaults optimized for karaoke
export const KARAOKE_DEFAULT_CONFIG: PitchDetectorConfig = {
  volumeThreshold: 0.03,
  pitchStabilityFrames: 3,
  yinThreshold: 0.12,
  noiseGateEnabled: true,
  noiseGateThreshold: -45,
  minFrequency: 65,
  maxFrequency: 1047,
  bufferSize: 2048,  // Reduced from 4096 for lower latency (~46ms at 44.1kHz)
  useWorklet: true,
};

// Difficulty-based configurations
export const DIFFICULTY_PITCH_CONFIGS: Record<Difficulty, Omit<PitchDetectorConfig, 'bufferSize' | 'useWorklet'>> = {
  easy: {
    volumeThreshold: 0.02,
    pitchStabilityFrames: 2,
    yinThreshold: 0.10,
    noiseGateEnabled: true,
    noiseGateThreshold: -50,
    minFrequency: 65,
    maxFrequency: 1047,
  },
  medium: {
    volumeThreshold: 0.04,
    pitchStabilityFrames: 3,
    yinThreshold: 0.12,
    noiseGateEnabled: true,
    noiseGateThreshold: -45,
    minFrequency: 65,
    maxFrequency: 1047,
  },
  hard: {
    volumeThreshold: 0.06,
    pitchStabilityFrames: 5,
    yinThreshold: 0.15,
    noiseGateEnabled: true,
    noiseGateThreshold: -40,
    minFrequency: 65,
    maxFrequency: 1047,
  },
};

// ==================== LATENCY METRICS ====================

export interface LatencyMetrics {
  audioContextLatency: number;  // AudioContext base latency
  bufferLatency: number;        // Buffer size latency
  processingLatency: number;    // YIN processing time
  totalLatency: number;         // Estimated total latency
  timestamp: number;
}

// ==================== AUDIO WORKLET PROCESSOR CODE ====================
// This is injected as a Blob URL for the AudioWorklet

const PITCH_WORKLET_CODE = `
class PitchWorkletProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.bufferSize = 2048;
    this.buffer = new Float32Array(this.bufferSize);
    this.writeIndex = 0;
    this.processing = false;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (!input || !input[0]) return true;
    
    const channel = input[0];
    
    // Copy input to circular buffer
    for (let i = 0; i < channel.length; i++) {
      this.buffer[this.writeIndex] = channel[i];
      this.writeIndex = (this.writeIndex + 1) % this.bufferSize;
    }
    
    // Send buffer to main thread every buffer fill
    if (this.writeIndex === 0 && !this.processing) {
      this.processing = true;
      const bufferCopy = new Float32Array(this.buffer);
      this.port.postMessage({
        type: 'audioData',
        buffer: bufferCopy,
        sampleRate: sampleRate
      });
      this.processing = false;
    }
    
    return true;
  }
}

registerProcessor('pitch-worklet-processor', PitchWorkletProcessor);
`;

// ==================== LOW LATENCY PITCH DETECTOR ====================

export class PitchDetector {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaStream: MediaStream | null = null;
  private isListening = false;
  private onPitchDetected: ((result: PitchDetectionResult) => void) | null = null;

  // Buffers
  private bufferSize: number;
  private buffer: Float32Array | null = null;
  private frequencyBuffer: Float32Array | null = null;

  // AudioWorklet
  private workletNode: AudioWorkletNode | null = null;
  private useWorklet: boolean;
  private animationFrame: number | null = null;

  // Configuration
  private config: PitchDetectorConfig;

  // Pitch stability tracking
  private recentPitches: number[] = [];
  private lastStablePitch: number | null = null;

  // Latency metrics
  private latencyMetrics: LatencyMetrics = {
    audioContextLatency: 0,
    bufferLatency: 0,
    processingLatency: 0,
    totalLatency: 0,
    timestamp: 0,
  };

  constructor(config: Partial<PitchDetectorConfig> = {}) {
    this.config = { ...KARAOKE_DEFAULT_CONFIG, ...config };
    this.bufferSize = this.config.bufferSize;
    this.useWorklet = this.config.useWorklet;
  }

  // Get current latency metrics
  getLatencyMetrics(): LatencyMetrics {
    return { ...this.latencyMetrics };
  }

  // Update configuration
  setConfig(config: Partial<PitchDetectorConfig>): void {
    this.config = { ...this.config, ...config };
    this.recentPitches = [];
    this.lastStablePitch = null;
  }

  // Set configuration based on difficulty
  setDifficulty(difficulty: Difficulty): void {
    this.setConfig(DIFFICULTY_PITCH_CONFIGS[difficulty]);
  }

  async initialize(): Promise<boolean> {
    try {
      // Request high-quality audio with low latency settings
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100,
          channelCount: 1,
        },
      });

      // Create AudioContext with low latency settings
      this.audioContext = new AudioContext({
        sampleRate: 44100,
        latencyHint: 'interactive',  // Request lowest possible latency
      });

      // Calculate base latency
      const baseLatency = this.audioContext.baseLatency || 0;
      const outputLatency = this.audioContext.outputLatency || 0;
      this.latencyMetrics.audioContextLatency = (baseLatency + outputLatency) * 1000;

      const source = this.audioContext.createMediaStreamSource(this.mediaStream);

      // Try to use AudioWorklet for lower latency
      if (this.useWorklet && typeof AudioWorkletNode !== 'undefined') {
        try {
          await this.initializeWorklet(source);
          logger.info('[PitchDetector]', 'AudioWorklet initialized successfully');
          return true;
        } catch (workletError) {
          logger.warn('[PitchDetector]', 'AudioWorklet failed, falling back to AnalyserNode:', workletError);
          // Fall through to AnalyserNode fallback
        }
      }

      // Fallback to AnalyserNode
      return this.initializeAnalyser(source);
    } catch (error) {
      logger.error('[PitchDetector]', 'Failed to initialize pitch detector:', error);
      return false;
    }
  }

  private async initializeWorklet(source: MediaStreamAudioSourceNode): Promise<void> {
    // Create blob URL for worklet code
    const blob = new Blob([PITCH_WORKLET_CODE], { type: 'application/javascript' });
    const workletUrl = URL.createObjectURL(blob);

    // Register and load worklet
    await this.audioContext!.audioWorklet.addModule(workletUrl);

    // Create worklet node
    this.workletNode = new AudioWorkletNode(this.audioContext!, 'pitch-worklet-processor');

    // Handle messages from worklet
    this.workletNode.port.onmessage = (event) => {
      if (event.data.type === 'audioData') {
        this.processAudioBuffer(event.data.buffer, event.data.sampleRate);
      }
    };

    // Connect source to worklet
    source.connect(this.workletNode);

    // Calculate buffer latency
    this.bufferSize = 2048;
    this.latencyMetrics.bufferLatency = (this.bufferSize / 44100) * 1000;

    // Cleanup blob URL after a delay
    setTimeout(() => URL.revokeObjectURL(workletUrl), 1000);
  }

  private initializeAnalyser(source: MediaStreamAudioSourceNode): boolean {
    this.analyser = this.audioContext!.createAnalyser();
    this.analyser.fftSize = this.bufferSize;
    this.analyser.smoothingTimeConstant = 0.1;  // Lower for faster response

    source.connect(this.analyser);

    this.buffer = new Float32Array(this.analyser.fftSize);
    this.frequencyBuffer = new Float32Array(this.analyser.frequencyBinCount);

    // Calculate buffer latency
    this.latencyMetrics.bufferLatency = (this.bufferSize / 44100) * 1000;

    return true;
  }

  start(callback: (result: PitchDetectionResult) => void): void {
    if (!this.audioContext) {
      logger.error('[PitchDetector]', 'Pitch detector not initialized');
      return;
    }

    this.onPitchDetected = callback;
    this.isListening = true;
    this.recentPitches = [];
    this.lastStablePitch = null;

    // If using AnalyserNode (not worklet), start polling
    if (this.analyser && !this.workletNode) {
      this.detect();
    }
  }

  stop(): void {
    this.isListening = false;
    if (this.animationFrame !== null) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }

  // Process audio buffer from worklet or analyser
  private processAudioBuffer(buffer: Float32Array, sampleRate: number): void {
    if (!this.isListening) return;

    const startTime = performance.now();

    // Calculate volume (RMS)
    let sum = 0;
    for (let i = 0; i < buffer.length; i++) {
      sum += buffer[i] * buffer[i];
    }
    const rms = Math.sqrt(sum / buffer.length);
    const volume = Math.min(1, rms * 5);

    // Noise gate check
    if (this.config.noiseGateEnabled && rms < 0.01) {
      this.emitResult(null, null, 0, volume);
      return;
    }

    // Volume threshold check
    if (rms < this.config.volumeThreshold / 5) {
      this.emitResult(null, null, 0, volume);
      return;
    }

    // YIN pitch detection
    const frequency = this.yinPitchDetection(buffer, sampleRate, this.config.yinThreshold);

    if (frequency !== null && frequency >= this.config.minFrequency && frequency <= this.config.maxFrequency) {
      const note = frequencyToMidi(frequency);
      const clarity = this.calculateClarity(buffer, frequency, sampleRate);
      const stablePitch = this.checkPitchStability(note);

      if (stablePitch !== null) {
        this.emitResult(frequency, stablePitch, clarity, volume);
      } else {
        this.emitResult(frequency, note, clarity, volume);
      }
    } else {
      this.emitResult(null, null, 0, volume);
      this.recentPitches = [];
    }

    // Update latency metrics
    this.latencyMetrics.processingLatency = performance.now() - startTime;
    this.latencyMetrics.totalLatency = 
      this.latencyMetrics.audioContextLatency + 
      this.latencyMetrics.bufferLatency + 
      this.latencyMetrics.processingLatency;
    this.latencyMetrics.timestamp = Date.now();
  }

  private emitResult(
    frequency: number | null,
    note: number | null,
    clarity: number,
    volume: number
  ): void {
    this.onPitchDetected?.({
      frequency,
      note,
      clarity,
      volume,
    });
  }

  // AnalyserNode polling (fallback)
  private detect(): void {
    if (!this.isListening || !this.analyser || !this.buffer) {
      return;
    }

    this.analyser.getFloatTimeDomainData(this.buffer as Float32Array<ArrayBuffer>);
    this.processAudioBuffer(this.buffer, this.audioContext!.sampleRate);

    this.animationFrame = requestAnimationFrame(() => this.detect());
  }

  private checkPitchStability(currentPitch: number): number | null {
    this.recentPitches.push(currentPitch);

    if (this.recentPitches.length > this.config.pitchStabilityFrames) {
      this.recentPitches.shift();
    }

    if (this.recentPitches.length < this.config.pitchStabilityFrames) {
      return this.lastStablePitch;
    }

    const avgPitch = this.recentPitches.reduce((a, b) => a + b, 0) / this.recentPitches.length;
    const maxDiff = Math.max(...this.recentPitches.map(p => Math.abs(p - avgPitch)));

    if (maxDiff <= 1) {
      this.lastStablePitch = Math.round(avgPitch * 10) / 10;
      return this.lastStablePitch;
    }

    return this.lastStablePitch;
  }

  private yinPitchDetection(
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

  async destroy(): Promise<void> {
    this.stop();

    if (this.workletNode) {
      this.workletNode.port.close();
      this.workletNode.disconnect();
      this.workletNode = null;
    }

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

// ==================== SINGLETON ====================

let pitchDetectorInstance: PitchDetector | null = null;
let pitchDetectorCleanupRegistered = false;

export function getPitchDetector(): PitchDetector {
  if (!pitchDetectorInstance) {
    pitchDetectorInstance = new PitchDetector();

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

export function resetPitchDetector(): void {
  if (pitchDetectorInstance) {
    pitchDetectorInstance.destroy();
    pitchDetectorInstance = null;
  }
}

// ==================== PITCH DETECTOR MANAGER ====================

export class PitchDetectorManager {
  private detectors: Map<string, PitchDetector> = new Map();

  async createDetector(id: string): Promise<PitchDetector> {
    const detector = new PitchDetector();
    await detector.initialize();
    this.detectors.set(id, detector);
    return detector;
  }

  getDetector(id: string): PitchDetector | undefined {
    return this.detectors.get(id);
  }

  removeDetector(id: string): void {
    const detector = this.detectors.get(id);
    if (detector) {
      detector.destroy();
      this.detectors.delete(id);
    }
  }

  destroyAll(): void {
    this.detectors.forEach(d => d.destroy());
    this.detectors.clear();
  }
}

let managerInstance: PitchDetectorManager | null = null;

export function getPitchDetectorManager(): PitchDetectorManager {
  if (!managerInstance) {
    managerInstance = new PitchDetectorManager();
  }
  return managerInstance;
}

export function resetPitchDetectorManager(): void {
  if (managerInstance) {
    managerInstance.destroyAll();
    managerInstance = null;
  }
}

// ==================== PURE FUNCTIONS (For Testing) ====================

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

export { yinPitchDetection, calculateClarity, checkPitchStability, createPitchDetectorConfig } from './pitch-detector-utils';
