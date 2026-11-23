import { PitchDetectionResult, frequencyToMidi, Difficulty } from '@/types/game';
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

  // FFT buffer / YIN analysis window.
  // R94-5: 4096 (~85-93 ms) — SAME window the companion phone's detector
  // uses. The previous 2048 (~43 ms) window was the main source of desktop
  // "dropouts": short windows jitter and fail YIN more often on sustained
  // karaoke notes, while the phone's 4096 window tracked them cleanly
  // (user measured ~400-500 points more via companion singing the same
  // passage). Parity of the analysis window = parity of the scoring basis.
  private bufferSize = 4096;
  private buffer: Float32Array<ArrayBuffer> | null = null;
  private frequencyBuffer: Float32Array<ArrayBuffer> | null = null;

  // Pre-allocated YIN buffer to avoid ~8KB allocation per frame (GC pressure)
  private yinBuffer: Float32Array | null = null;

  // Configuration
  private config: PitchDetectorConfig;

  // R95/2: noise/volume gate with HYSTERESIS. The previous hard threshold
  // flutters at the boundary: quiet singing right at the gate level produced
  // alternating null/valid frames — visible as scoring dropouts on clearly
  // sung tones and as "no evaluation at all" phases. The companion phone's
  // close-range gate has used attack/release hysteresis since R65 (release
  // at 0.6×gate); this port gives the desktop mic the same behavior.
  private gateOpen = false;

  // Pitch stability tracking
  private pitchStabilizer: PitchStabilizer;

  // Whether this detector owns the MediaStream (i.e. it created it via getUserMedia).
  // When false, destroy() will NOT stop the tracks — the stream is shared.
  private ownsStream = true;

  // R44: the humming/singing classifier (VocalDetector) was REMOVED entirely —
  // it misjudged sustained karaoke notes and caused scoring dropouts. Pitch
  // presence (YIN) + noise gate + volume threshold are the only gates now.

  constructor(config: Partial<PitchDetectorConfig> = {}) {
    this.config = { ...KARAOKE_DEFAULT_CONFIG, ...config };
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
  }

  /**
   * Initialize the pitch detector with an optional specific microphone device.
   * @param deviceId - If provided, requests this specific audio device (multi-mic support).
   *                If omitted, uses the system default microphone.
   */
  async initialize(deviceId?: string, stereoChannel?: number): Promise<boolean> {
    try {
      // Build audio constraints — optionally target a specific device
      // R94-5: autoGainControl true — matches the companion phone's
      // constraints. With AGC off, quiet distant-mic singing dipped below
      // the fixed volume/noise gates → null frames ("dropouts"), while the
      // phone's AGC kept the level above its gate. Same constraints on both
      // sides = same scoring basis.
      const audioConstraints: MediaTrackConstraints = {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      };
      if (deviceId) {
        // IMPORTANT: Use { exact: deviceId } first for reliable mic selection
        // (e.g. in PTM mode where each player has a dedicated mic).
        // If the device is busy or disconnected, getUserMedia throws
        // OverconstrainedError — we catch it below and retry without the
        // exact constraint so the system picks the closest available device.
        // Do NOT change to { ideal: deviceId } — that would silently
        // pick the wrong mic instead of failing fast.
        audioConstraints.deviceId = { exact: deviceId };
      }

      // Request high-quality audio for karaoke
      // Note: sampleRate and channelCount are NOT standard getUserMedia
      // constraints and cause issues in Tauri webviews — omit them.
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints,
      });

      this.audioContext = new AudioContext({ latencyHint: 'interactive' });

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
      const errorName = error instanceof DOMException ? error.name : '';

      // If OverconstrainedError and a specific deviceId was requested,
      // retry without the exact constraint (system picks the closest device).
      if (errorName === 'OverconstrainedError' && deviceId) {
        // eslint-disable-next-line no-console
        console.warn(`[PitchDetector] OverconstrainedError for deviceId=${deviceId}, retrying without exact constraint…`);
        try {
          const fallbackConstraints: MediaTrackConstraints = {
            echoCancellation: true,
            noiseSuppression: true,
            // R95/2: AGC stays ON in the retry paths too — the primary path
            // enables it for companion parity (R94-5); a fallback mic without
            // AGC loses quiet singing below the gates (asymmetric dropouts
            // depending on which code path opened the device).
            autoGainControl: true,
            deviceId: { ideal: deviceId },
          };
          this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: fallbackConstraints });

          this.audioContext = new AudioContext({ latencyHint: 'interactive' });
          if (this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
          }
          const source = this.audioContext.createMediaStreamSource(this.mediaStream);
          this.analyser = this.audioContext.createAnalyser();
          this.analyser.fftSize = this.bufferSize;
          this.analyser.smoothingTimeConstant = 0.5;
          if (stereoChannel !== undefined && stereoChannel >= 0) {
            const splitter = this.audioContext.createChannelSplitter(2);
            source.connect(splitter);
            splitter.connect(this.analyser, stereoChannel);
          } else {
            source.connect(this.analyser);
          }
          this.buffer = new Float32Array(this.analyser.fftSize);
          this.frequencyBuffer = new Float32Array(this.analyser.frequencyBinCount);
          this.yinBuffer = new Float32Array(Math.floor(this.analyser.fftSize / 2));
          // eslint-disable-next-line no-console
          console.log('[PitchDetector] Retry with ideal constraint succeeded');
          return true;
        } catch (retryError) {
          // eslint-disable-next-line no-console
          console.error('[PitchDetector] Retry also failed:', retryError);
        }
      }

      // If NotFoundError and a specific deviceId was requested, the device
      // was disconnected (e.g. USB mic unplugged during PTM). Retry with no
      // deviceId so the system falls back to the default microphone.
      if (errorName === 'NotFoundError' && deviceId) {
        // eslint-disable-next-line no-console
        console.warn(`[PitchDetector] NotFoundError for deviceId=${deviceId}, retrying with default mic…`);
        try {
          this.mediaStream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              // R95/2: AGC parity (see OverconstrainedError retry above)
              autoGainControl: true,
            },
          });

          this.audioContext = new AudioContext({ latencyHint: 'interactive' });
          if (this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
          }
          const source = this.audioContext.createMediaStreamSource(this.mediaStream);
          this.analyser = this.audioContext.createAnalyser();
          this.analyser.fftSize = this.bufferSize;
          this.analyser.smoothingTimeConstant = 0.5;
          if (stereoChannel !== undefined && stereoChannel >= 0) {
            const splitter = this.audioContext.createChannelSplitter(2);
            source.connect(splitter);
            splitter.connect(this.analyser, stereoChannel);
          } else {
            source.connect(this.analyser);
          }
          this.buffer = new Float32Array(this.analyser.fftSize);
          this.frequencyBuffer = new Float32Array(this.analyser.frequencyBinCount);
          this.yinBuffer = new Float32Array(Math.floor(this.analyser.fftSize / 2));
          // eslint-disable-next-line no-console
          console.log('[PitchDetector] Retry with default mic succeeded');
          return true;
        } catch (retryError) {
          // eslint-disable-next-line no-console
          console.error('[PitchDetector] NotFoundError retry also failed:', retryError);
        }
      }

      // eslint-disable-next-line no-console
      console.error('Failed to initialize pitch detector:', error);
      return false;
    }
  }

  /**
   * Initialize the pitch detector using an already-opened MediaStream.
   * Used when multiple players share the same microphone device — only the
   * first player calls getUserMedia(); subsequent players reuse the stream.
   * @param stream - An active MediaStream obtained from another detector.
   * @param stereoChannel - Optional stereo channel index for stereo split mode.
   */
  async initializeWithStream(stream: MediaStream, stereoChannel?: number): Promise<boolean> {
    try {
      this.mediaStream = stream;
      this.ownsStream = false; // Do not stop tracks on destroy — stream is shared

      this.audioContext = new AudioContext({ latencyHint: 'interactive' });

      if (this.audioContext.state === 'suspended') {
        try {
          await this.audioContext.resume();
        } catch (resumeErr) {
          // eslint-disable-next-line no-console
          console.warn('AudioContext.resume() failed, retrying…', resumeErr);
          await new Promise<void>(resolve => setTimeout(resolve, 100));
          await this.audioContext.resume();
        }
      }

      const source = this.audioContext.createMediaStreamSource(this.mediaStream);

      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = this.bufferSize;
      this.analyser.smoothingTimeConstant = 0.5;

      if (stereoChannel !== undefined && stereoChannel >= 0) {
        const splitter = this.audioContext.createChannelSplitter(2);
        source.connect(splitter);
        splitter.connect(this.analyser, stereoChannel);
      } else {
        source.connect(this.analyser);
      }

      this.buffer = new Float32Array(this.analyser.fftSize);
      this.frequencyBuffer = new Float32Array(this.analyser.frequencyBinCount);
      this.yinBuffer = new Float32Array(Math.floor(this.analyser.fftSize / 2));

      return true;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to initialize pitch detector with shared stream:', error);
      return false;
    }
  }

  /**
   * Initialize using a pre-created AnalyserNode from a shared AudioContext.
   * Used by PitchDetectorManager when multiple players share the same microphone:
   * instead of creating a new AudioContext per player (which fails in Tauri/WebKit),
   * we reuse the same AudioContext and only create a new AnalyserNode per player.
   * @param analyser - A connected AnalyserNode from the shared AudioContext.
   * @param audioContext - The shared AudioContext (used for sampleRate in detect()).
   * @param stream - The shared MediaStream (stored for getMediaStream() compatibility).
   */
  initializeWithSharedAnalyser(analyser: AnalyserNode, audioContext: AudioContext, stream: MediaStream): boolean {
    try {
      this.analyser = analyser;
      this.audioContext = audioContext;
      this.mediaStream = stream;
      this.ownsStream = false;

      this.buffer = new Float32Array(this.analyser.fftSize);
      this.frequencyBuffer = new Float32Array(this.analyser.frequencyBinCount);
      this.yinBuffer = new Float32Array(Math.floor(this.analyser.fftSize / 2));

      return true;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to initialize pitch detector with shared analyser:', error);
      return false;
    }
  }

  /** Whether the detection loop is currently running (used by callers to
   *  decide whether a mic switch may skip the re-init cycle entirely). */
  isDetectorListening(): boolean {
    return this.isListening;
  }

  start(callback: (_result: PitchDetectionResult) => void): void {
    if (!this.analyser || !this.buffer) {
      // eslint-disable-next-line no-console
      console.error('Pitch detector not initialized');
      return;
    }

    // ZOMBIE-LOOP GUARD: if a detect() chain is already running, calling
    // detect() again would start a SECOND self-rescheduling rAF chain —
    // this.animationFrame only ever holds the LATEST frame id, so stop()
    // can no longer cancel the older chain(s). Every unguarded start()
    // added a permanent extra 60 Hz loop (observed as growing CPU load and
    // duplicated callbacks after repeated mic handoffs). Swapping the
    // callback is all an already-listening detector needs.
    if (this.isListening) {
      this.onPitchDetected = callback;
      return;
    }

    this.onPitchDetected = callback;
    this.isListening = true;
    this.gateOpen = false; // R95/2: fresh gate state per session
    this.pitchStabilizer.reset();
    this.detect();
  }

  stop(): void {
    this.isListening = false;
    this.gateOpen = false; // R95/2: reset hysteresis state
    if (this.animationFrame !== null) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
    // Clear pitch history to prevent stale data on next start
    this.pitchStabilizer.reset();
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
    // R44: the frequency-domain read (getFloatFrequencyData) was only needed
    // by the deleted humming/singing classifier — skipping it saves a full FFT
    // spectrum copy per frame (~60 Hz per detector).

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

    // ── R95/2: combined noise-gate + volume gate WITH hysteresis ──
    // Both legacy checks compared RMS against a hard threshold (noise gate
    // in dB, volume threshold in amplified units). Effectively the stricter
    // of the two applied — preserved here as max(). The hysteresis releases
    // at 0.6× the opening threshold (same factor as the companion's
    // close-range gate): once the gate is open, brief level dips (breaths,
    // vibrato, syllable onsets) no longer produce isolated null frames that
    // punched holes into held notes.
    const GATE_RELEASE_FACTOR = 0.6;
    const noiseGateRms = this.config.noiseGateEnabled
      ? Math.pow(10, this.config.noiseGateThreshold / 20)
      : 0;
    const volumeGateRms = this.config.volumeThreshold / 5;
    const openThreshold = Math.max(noiseGateRms, volumeGateRms);
    const closeThreshold = openThreshold * GATE_RELEASE_FACTOR;
    if (this.gateOpen ? rms >= closeThreshold : rms >= openThreshold) {
      this.gateOpen = true;
    } else {
      this.gateOpen = false;
    }

    if (!this.gateOpen) {
      this.onPitchDetected?.({
        frequency: null,
        note: null,
        rawNote: null,
        clarity: 0,
        volume,
      });
      this.animationFrame = requestAnimationFrame(() => this.detect());
      return;
    }

    // Use YIN algorithm for pitch detection
    const sampleRate = this.audioContext.sampleRate;
    const frequency = this.yinBuffer
      ? yinPitchDetection(this.buffer, this.yinBuffer, sampleRate, this.config.yinThreshold)
      : null;

    const detectedNote = (frequency !== null && frequency >= this.config.minFrequency && frequency <= this.config.maxFrequency)
      ? frequencyToMidi(frequency)
      : null;

    if (detectedNote !== null) {
      const note = detectedNote;
      const clarity = calculateClarity(this.buffer, frequency!, sampleRate);

      // Pitch stability check
      const stablePitch = this.pitchStabilizer.process(note);

      // Always report the raw (un-stabilized) note for real-time visual display.
      // The stabilized `note` is used by scoring for accuracy;
      // `rawNote` provides a responsive, lag-free pitch indicator.
      const rawNote = note;

      if (stablePitch !== null) {
        this.onPitchDetected?.({
          frequency,
          note: stablePitch,
          rawNote,
          clarity,
          volume,
        });
      } else {
        // Still updating stability, use current pitch for both fields
        this.onPitchDetected?.({
          frequency,
          note,
          rawNote,
          clarity,
          volume,
        });
      }
    } else {
      this.onPitchDetected?.({
        frequency: null,
        note: null,
        rawNote: null,
        clarity: 0,
        volume,
      });
      // Reset stability on no pitch — but ONLY the history, the gate state
      // stays open (hysteresis above): a single YIN flicker must not slam
      // the gate shut on a clearly audible tone.
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

  /** Synchronous cleanup — stops monitoring, releases tracks, nulls refs. Safe for beforeunload.
   *  Only stops MediaStream tracks if this detector owns the stream (i.e. it created
   *  it via getUserMedia). Shared streams (from initializeWithStream) are left untouched. */
  destroySync(): void {
    this.stop();
    if (this.mediaStream && this.ownsStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    } else {
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

/**
 * R44 (PTM-Spielerwechsel-Rucken): swap the singleton to an ALREADY-INITIALIZED
 * detector instance. Used by usePitchDetector.switchMicrophone for an
 * overlap-free mic change: the NEW detector opens its stream FIRST, then this
 * swap makes it the singleton, and only THEN the old instance is destroyed —
 * the audio device is never left in a closed/reopened gap (that gap was the
 * audible/visible jerk at every PTM player handoff on per-player mics).
 */
export function setPitchDetectorInstance(instance: PitchDetector): void {
  pitchDetectorInstance = instance;
  registerCleanup('pitch-detector', () => {
    pitchDetectorInstance?.destroySync();
    pitchDetectorInstance = null;
  });
}
