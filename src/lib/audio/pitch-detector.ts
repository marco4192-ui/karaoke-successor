import { PitchDetectionResult, frequencyToMidi, Difficulty } from '@/types/game';
import { VocalDetector, VocalDetectionResult } from './vocal-detector';

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

  // Pre-allocated YIN buffer to avoid ~8KB allocation per frame (GC pressure)
  private yinBuffer: Float32Array | null = null;

  // Configuration
  private config: PitchDetectorConfig;
  
  // Pitch stability tracking
  private recentPitches: number[] = [];
  private lastStablePitch: number | null = null;

  // Vocal detection (singing vs. humming/noise)
  private vocalDetector: VocalDetector;
  private lastVocalResult: VocalDetectionResult | null = null;
  
  constructor(config: Partial<PitchDetectorConfig> = {}) {
    this.config = { ...KARAOKE_DEFAULT_CONFIG, ...config };
    this.vocalDetector = new VocalDetector();
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
    // Also update vocal detector for this difficulty
    this.vocalDetector.setDifficulty(difficulty);
  }

  /**
   * Initialize the pitch detector with an optional specific microphone device.
   * @param deviceId - If provided, requests this specific audio device (multi-mic support).
   *                If omitted, uses the system default microphone.
   */
  async initialize(deviceId?: string): Promise<boolean> {
    try {
      // Build audio constraints — optionally target a specific device
      const audioConstraints: MediaTrackConstraints = {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
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
          console.warn('AudioContext.resume() failed, retrying…', resumeErr);
          // Retry once after a short delay (some webviews need a tick)
          await new Promise<void>(resolve => setTimeout(resolve, 100));
          await this.audioContext.resume();
        }
      }

      const source = this.audioContext.createMediaStreamSource(this.mediaStream);

      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = this.bufferSize;
      this.analyser.smoothingTimeConstant = 0.8;

      source.connect(this.analyser);

      this.buffer = new Float32Array(this.analyser.fftSize);
      this.frequencyBuffer = new Float32Array(this.analyser.frequencyBinCount);
      this.yinBuffer = new Float32Array(Math.floor(this.analyser.fftSize / 2));

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
    this.recentPitches = [];
    this.lastStablePitch = null;
    this.vocalDetector.reset();
    this.lastVocalResult = null;
  }

  private detect(): void {
    if (!this.isListening || !this.analyser || !this.buffer || !this.frequencyBuffer) {
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
    const frequency = this.yinPitchDetection(this.buffer, this.audioContext!.sampleRate, this.config.yinThreshold);

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
      const clarity = this.calculateClarity(this.buffer, frequency, this.audioContext!.sampleRate);
      
      // Pitch stability check
      const stablePitch = this.checkPitchStability(note);

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
    const yinBuffer = this.yinBuffer!;
    const yinBufferLength = yinBuffer.length;

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
      const denominator = 2 * s1 - s2 - s0;
      betterTau = Math.abs(denominator) < 1e-10
        ? tauEstimate
        : tauEstimate + (s2 - s0) / (2 * denominator);
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

  async destroy(): Promise<void> {
    this.stop();
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
    if (this.audioContext) {
      // Set to null BEFORE closing to prevent double-close race condition
      const ctx = this.audioContext;
      this.audioContext = null;
      try {
        await ctx.close();
      } catch {
        // Already closed or closing — safe to ignore
      }
    }
    this.analyser = null;
    this.buffer = null;
    this.frequencyBuffer = null;
    this.yinBuffer = null;
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
export async function resetPitchDetector(): Promise<void> {
  if (pitchDetectorInstance) {
    await pitchDetectorInstance.destroy();
    pitchDetectorInstance = null;
  }
}

// Re-export PitchDetectionResult for convenience
export type { PitchDetectionResult } from '@/types/game';

// ===================== PITCH DETECTOR MANAGER =====================
// Manages multiple PitchDetector instances for multi-player karaoke

interface PitchDetectorManagerCallbacks {
  onPitchDetected: (playerId: string, result: import('@/types/game').PitchDetectionResult) => void;
}

type PlayerType = 'local' | 'mobile';

interface ManagedPlayer {
  id: string;
  type: PlayerType;
  detector: PitchDetector | null;
  mobileClientId?: string;
  pollingInterval?: ReturnType<typeof setInterval>;
}

export class PitchDetectorManager {
  private players: Map<string, ManagedPlayer> = new Map();
  private callbacks: PitchDetectorManagerCallbacks | null = null;
  private difficulty: Difficulty = 'medium';
  private isRunning = false;

  setCallbacks(callbacks: PitchDetectorManagerCallbacks): void {
    this.callbacks = callbacks;
  }

  setDifficulty(difficulty: Difficulty): void {
    this.difficulty = difficulty;
    this.players.forEach((player) => {
      player.detector?.setDifficulty(difficulty);
    });
  }

  /**
   * Add a local player with their own pitch detector.
   * @param playerId - Unique identifier for this player
   * @param deviceId - Optional specific microphone device ID (multi-mic support)
   */
  async addLocalPlayer(playerId: string, deviceId?: string): Promise<boolean> {
    if (this.players.has(playerId)) {
      return true; // Already exists
    }

    const detector = new PitchDetector();
    detector.setDifficulty(this.difficulty);

    const success = await detector.initialize(deviceId);
    if (success) {
      this.players.set(playerId, {
        id: playerId,
        type: 'local',
        detector,
      });

      // If already running, start this detector immediately
      if (this.isRunning) {
        detector.start((result) => {
          this.callbacks?.onPitchDetected(playerId, result);
        });
      }

      return true;
    }

    return false;
  }

  addMobilePlayer(playerId: string, mobileClientId: string): void {
    if (this.players.has(playerId)) {
      return; // Already exists
    }

    this.players.set(playerId, {
      id: playerId,
      type: 'mobile',
      detector: null,
      mobileClientId,
    });

    // Start polling for mobile player pitch if already running
    if (this.isRunning) {
      this.startMobilePolling(playerId, mobileClientId);
    }
  }

  async removePlayer(playerId: string): Promise<void> {
    const player = this.players.get(playerId);
    if (!player) return;

    // Stop and destroy detector for local players
    if (player.detector) {
      player.detector.stop();
      await player.detector.destroy();
    }

    // Clear polling interval for mobile players
    if (player.pollingInterval) {
      clearInterval(player.pollingInterval);
    }

    this.players.delete(playerId);
  }

  start(): void {
    this.isRunning = true;
    this.players.forEach((player, playerId) => {
      if (player.type === 'local' && player.detector) {
        player.detector.start((result) => {
          this.callbacks?.onPitchDetected(playerId, result);
        });
      } else if (player.type === 'mobile' && player.mobileClientId) {
        this.startMobilePolling(playerId, player.mobileClientId);
      }
    });
  }

  stop(): void {
    this.isRunning = false;
    this.players.forEach((player) => {
      player.detector?.stop();
      if (player.pollingInterval) {
        clearInterval(player.pollingInterval);
        player.pollingInterval = undefined;
      }
    });
  }

  getPlayerIds(): string[] {
    return Array.from(this.players.keys());
  }

  private startMobilePolling(playerId: string, _mobileClientId: string): void {
    const player = this.players.get(playerId);
    if (!player) return;

    // Clear existing interval if any
    if (player.pollingInterval) {
      clearInterval(player.pollingInterval);
    }

    player.pollingInterval = setInterval(async () => {
      try {
        const response = await fetch('/api/mobile?action=getpitch');
        const data = await response.json();
        // Server returns "pitches" array, not "pitch" object
        if (data.success && Array.isArray(data.pitches) && data.pitches.length > 0) {
          const pitchData = data.pitches[0].data;
          this.callbacks?.onPitchDetected(playerId, {
            frequency: pitchData.frequency,
            note: pitchData.note,
            clarity: pitchData.clarity || 0,
            volume: pitchData.volume || 0,
            isSinging: pitchData.isSinging,
            singingConfidence: pitchData.singingConfidence,
          });
        }
      } catch {
        // Ignore polling errors
      }
    }, 100); // Poll every 100ms — sufficient for real-time sync, reduces server load
  }

  async destroy(): Promise<void> {
    this.stop();
    const destroyPromises = Array.from(this.players.entries()).map(async ([, player]) => {
      if (player.detector) {
        await player.detector.destroy();
      }
    });
    await Promise.all(destroyPromises);
    this.players.clear();
    this.callbacks = null;
  }
}

// Singleton instance for PitchDetectorManager
let pitchDetectorManagerInstance: PitchDetectorManager | null = null;
let pitchDetectorManagerCleanupRegistered = false;

export function getPitchDetectorManager(): PitchDetectorManager {
  if (!pitchDetectorManagerInstance) {
    pitchDetectorManagerInstance = new PitchDetectorManager();

    // Cleanup on page unload (only register once)
    if (typeof window !== 'undefined' && !pitchDetectorManagerCleanupRegistered) {
      pitchDetectorManagerCleanupRegistered = true;
      window.addEventListener('beforeunload', () => {
        pitchDetectorManagerInstance?.destroy();
        pitchDetectorManagerInstance = null;
      });
    }
  }
  return pitchDetectorManagerInstance;
}
