import { PitchDetectionResult, frequencyToMidi, Difficulty } from '@/types/game';
import { VocalDetector, VocalDetectionResult } from './vocal-detector';
import { registerCleanup } from '@/lib/utils/app-cleanup';

// --- Extracted modules ---
import { PitchDetectorConfig, KARAOKE_DEFAULT_CONFIG, DIFFICULTY_PITCH_CONFIGS } from './pitch-config';
import { yinPitchDetection, calculateClarity } from './pitch-algorithm';
import { PitchStabilizer } from './pitch-smoothing';

// Re-export config types
export type { PitchDetectorConfig } from './pitch-config';

// Re-export manager
export { PitchDetectorManager, getPitchDetectorManager } from './pitch-detector-manager';

export class PitchDetector {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private mediaStream: MediaStream | null = null;
  private isListening = false;
  private animationFrame: number | null = null;
  private onPitchDetected: ((_result: PitchDetectionResult) => void) | null = null;

  // FFT buffer — 2048 samples for ~46ms latency at 44.1kHz.
  // Previously 4096 (~93ms), reduced for faster response.
  // YIN still accurate enough for singing pitch detection with this window size.
  private bufferSize = 2048;
  private buffer: Float32Array<ArrayBuffer> | null = null;
  private frequencyBuffer: Float32Array<ArrayBuffer> | null = null;

  // Pre-allocated YIN buffer to avoid ~8KB allocation per frame (GC pressure)
  private yinBuffer: Float32Array | null = null;

  // Configuration
  private config: PitchDetectorConfig;

  // Pitch stability tracking
  private pitchStabilizer: PitchStabilizer;

  // Vocal detection (singing vs. humming/noise)
  private vocalDetector: VocalDetector;
  private lastVocalResult: VocalDetectionResult | null = null;

  constructor(config: Partial<PitchDetectorConfig> = {}) {
    this.config = { ...KARAOKE_DEFAULT_CONFIG, ...config };
    this.vocalDetector = new VocalDetector();
    this.pitchStabilizer = new PitchStabilizer(this.config.pitchStabilityFrames);
  }

  // Update configuration
  setConfig(config: Partial<PitchDetectorConfig>): void {
    this.config = { ...this.config, ...config };
    this.pitchStabilizer.setStabilityFrames(this.config.pitchStabilityFrames);
    this.pitchStabilizer.reset();
  }

  // Set configuration based on difficulty
  setDifficulty(difficulty: Difficulty): void {
    this.setConfig(DIFFICULTY_PITCH_CONFIGS[difficulty]);
    // Also update vocal detector for this difficulty
    this.vocalDetector.setDifficulty(difficulty);
  }

  /**
   * Initialize the pitch detector with an optional specific microphone device.
   * @param deviceId - If provided, requests this specific audio device (multi-mic support).
   *                If omitted, uses the system default microphone.
   */
  async initialize(deviceId?: string, stereoChannel?: number): Promise<boolean> {
    try {
      // Build audio constraints — optionally target a specific device
      const audioConstraints: MediaTrackConstraints = {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: false,
      };
      if (deviceId) {
        audioConstraints.deviceId = { exact: deviceId };
      }

      // Request high-quality audio for karaoke
      // Note: sampleRate and channelCount are NOT standard getUserMedia
      // constraints and cause issues in Tauri webviews — omit them.
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints,
      });

      this.audioContext = new AudioContext();

      // CRITICAL: In Tauri webviews the AudioContext is often created in
      // a "suspended" state and must be explicitly resumed, otherwise the
      // AnalyserNode returns all-zeros and pitch detection never triggers.
      if (this.audioContext.state === 'suspended') {
        try {
          await this.audioContext.resume();
        } catch (resumeErr) {
          // eslint-disable-next-line no-console
          console.warn('AudioContext.resume() failed, retrying…', resumeErr);
          // Retry once after a short delay (some webviews need a tick)
          await new Promise<void>(resolve => setTimeout(resolve, 100));
          await this.audioContext.resume();
        }
      }

      const source = this.audioContext.createMediaStreamSource(this.mediaStream);

      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = this.bufferSize;
      // Reduced smoothing: 0.5 (was 0.8) for faster transient response.
      // The YIN algorithm works on raw time-domain data, so FFT smoothing
      // mainly affects the frequency-domain spectral flatness analysis used
      // by VocalDetector, not the core pitch detection.
      this.analyser.smoothingTimeConstant = 0.5;

      if (stereoChannel !== undefined && stereoChannel >= 0) {
        // Stereo split mode — extract a single channel for this player
        const splitter = this.audioContext.createChannelSplitter(2);
        source.connect(splitter);
        splitter.connect(this.analyser, stereoChannel);
      } else {
        // Mono / default mode
        source.connect(this.analyser);
      }

      this.buffer = new Float32Array(this.analyser.fftSize);
      this.frequencyBuffer = new Float32Array(this.analyser.frequencyBinCount);
      this.yinBuffer = new Float32Array(Math.floor(this.analyser.fftSize / 2));

      return true;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to initialize pitch detector:', error);
      return false;
    }
  }

  start(callback: (_result: PitchDetectionResult) => void): void {
    if (!this.analyser || !this.buffer) {
      // eslint-disable-next-line no-console
      console.error('Pitch detector not initialized');
      return;
    }

    this.onPitchDetected = callback;
    this.isListening = true;
    this.pitchStabilizer.reset();
    this.vocalDetector.reset();
    this.lastVocalResult = null;
    this.detect();
  }

  stop(): void {
    this.isListening = false;
    if (this.animationFrame !== null) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
    // Clear pitch history to prevent stale data on next start
    this.pitchStabilizer.reset();
    this.vocalDetector.reset();
    this.lastVocalResult = null;
  }

  private detect(): void {
    if (!this.isListening || !this.analyser || !this.buffer || !this.frequencyBuffer) {
      return;
    }

    // Guard against destroyed AudioContext — destroy() may set audioContext
    // to null while a currently executing rAF callback is still running detect().
    // Just return without scheduling — stop() has already set isListening=false.
    if (!this.audioContext) {
      return;
    }

    // Guard: if AudioContext was suspended (e.g. Tauri window lost focus),
    // resume it — otherwise getFloatTimeDomainData returns all zeros.
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume().catch(() => {});
    }

    this.analyser.getFloatTimeDomainData(this.buffer as Float32Array<ArrayBuffer>);
    this.analyser.getFloatFrequencyData(this.frequencyBuffer as Float32Array<ArrayBuffer>);

    // Calculate volume (RMS)
    let sum = 0;
    for (let i = 0; i < this.buffer.length; i++) {
      sum += this.buffer[i] * this.buffer[i];
    }
    const rms = Math.sqrt(sum / this.buffer.length);
    // Amplify RMS for volume display: raw RMS is typically 0.001–0.2 for singing,
    // so we multiply by 5 to map into a useful 0-1 range.
    const VOLUME_AMPLIFICATION = 5;
    const volume = Math.min(1, rms * VOLUME_AMPLIFICATION);

    // Noise gate check — convert dB threshold to RMS for comparison
    if (this.config.noiseGateEnabled) {
      const rmsThreshold = Math.pow(10, this.config.noiseGateThreshold / 20);
      if (rms < rmsThreshold) {
        this.onPitchDetected?.({
          frequency: null,
          note: null,
          clarity: 0,
          volume,
          isSinging: false,
          singingConfidence: 0,
        });
        this.animationFrame = requestAnimationFrame(() => this.detect());
        return;
      }
    }

    // Volume threshold check (configurable)
    if (rms < this.config.volumeThreshold / 5) {
      this.onPitchDetected?.({
        frequency: null,
        note: null,
        clarity: 0,
        volume,
        isSinging: false,
        singingConfidence: 0,
      });
      this.animationFrame = requestAnimationFrame(() => this.detect());
      return;
    }

    // Use YIN algorithm for pitch detection
    const sampleRate = this.audioContext.sampleRate;
    const frequency = this.yinBuffer
      ? yinPitchDetection(this.buffer, this.yinBuffer, sampleRate, this.config.yinThreshold)
      : null;

    // Re-run vocal detection now with known pitch for better accuracy
    const detectedNote = (frequency !== null && frequency >= this.config.minFrequency && frequency <= this.config.maxFrequency)
      ? frequencyToMidi(frequency)
      : null;
    this.lastVocalResult = this.vocalDetector.processFrame(
      detectedNote,
      volume,
      this.frequencyBuffer as Float32Array<ArrayBuffer>,
      this.audioContext?.sampleRate ?? 44100,
      performance.now()
    );

    if (frequency !== null && frequency >= this.config.minFrequency && frequency <= this.config.maxFrequency) {
      const note = frequencyToMidi(frequency);
      const clarity = calculateClarity(this.buffer, frequency, sampleRate);

      // Pitch stability check
      const stablePitch = this.pitchStabilizer.process(note);

      // Attach vocal detection result
      const vocalIsSinging = this.lastVocalResult?.isSinging ?? true;
      const vocalConfidence = this.lastVocalResult?.singingConfidence ?? 1;

      if (stablePitch !== null) {
        this.onPitchDetected?.({
          frequency,
          note: stablePitch,
          clarity,
          volume,
          isSinging: vocalIsSinging,
          singingConfidence: vocalConfidence,
        });
      } else {
        // Still updating stability, use current pitch
        this.onPitchDetected?.({
          frequency,
          note,
          clarity,
          volume,
          isSinging: vocalIsSinging,
          singingConfidence: vocalConfidence,
        });
      }
    } else {
      this.onPitchDetected?.({
        frequency: null,
        note: null,
        clarity: 0,
        volume,
        isSinging: false,
        singingConfidence: 0,
      });
      // Reset stability on no pitch
      this.pitchStabilizer.reset();
    }

    // Only schedule next frame if still listening — prevents infinite rAF chains
    // after stop()/destroy() is called during an active detect() cycle.
    if (this.isListening) {
      this.animationFrame = requestAnimationFrame(() => this.detect());
    }
  }

  /** Return the current MediaStream so other components (e.g. audio effects)
   *  can reuse it without requesting a second getUserMedia(). */
  getMediaStream(): MediaStream | null {
    return this.mediaStream;
  }

  /** Return the existing AudioContext so other components (e.g. audio effects)
   *  can reuse it. Creating a second AudioContext on Tauri/WebView can steal
   *  audio focus from <audio>/<video> media elements, stopping playback. */
  getAudioContext(): AudioContext | null {
    return this.audioContext;
  }

  /** Synchronous cleanup — stops monitoring, releases tracks, nulls refs. Safe for beforeunload. */
  destroySync(): void {
    this.stop();
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
    if (this.audioContext) {
      try { this.audioContext.close(); } catch { /* already closed */ }
      this.audioContext = null;
    }
    this.analyser = null;
    this.buffer = null;
    this.frequencyBuffer = null;
    this.yinBuffer = null;
  }

  async destroy(): Promise<void> {
    this.destroySync();
  }
}

// Singleton instance
let pitchDetectorInstance: PitchDetector | null = null;

export function getPitchDetector(): PitchDetector {
  if (!pitchDetectorInstance) {
    pitchDetectorInstance = new PitchDetector();
    registerCleanup('pitch-detector', () => {
      pitchDetectorInstance?.destroySync();
      pitchDetectorInstance = null;
    });
  }
  return pitchDetectorInstance;
}

// Function to reset the singleton (useful for testing or manual cleanup)
export async function resetPitchDetector(): Promise<void> {
  if (pitchDetectorInstance) {
    await pitchDetectorInstance.destroy();
    pitchDetectorInstance = null;
  }
}
