/**
 * Vocal Detector — Distinguishes actual singing from humming/noise.
 *
 * Approach: Real-time analysis of three signals already available
 * inside the pitch-detection loop:
 *
 *  1. **Pitch Variance** — singing has natural vibrato & melody movement
 *     (±0.3–2 semitones within a short window). Pure humming stays
 *     within ±0.15 semitones almost indefinitely.
 *
 *  2. **Spectral Flatness (Wiener Entropy)** — the ratio of geometric
 *     mean to arithmetic mean of the power spectrum. Singing has strong
 *     harmonic peaks (low flatness ≈ 0.01–0.1), while humming can be
 *     surprisingly tonal too, so this is a secondary indicator.
 *
 *  3. **Energy Onset Rate** — singing contains syllable onsets
 *     (consonants, vowel changes) that cause rapid energy spikes.
 *     Humming is a continuous drone with few onsets.
 *
 * The detector runs a sliding window (~400 ms) and outputs an overall
 * `isSinging` boolean along with a `singingConfidence` (0–1).
 *
 * NOTE: This module does NOT run its own AudioContext or requestAnimationFrame.
 * It is called from within the PitchDetector.detect() loop.
 */

// ===================== TYPES =====================

export interface VocalDetectionResult {
  /** True when the input is classified as singing */
  isSinging: boolean;
  /** 0–1 confidence value (higher = more certainly singing) */
  singingConfidence: number;
  /** Current pitch variance in semitones (for debugging) */
  pitchVariance: number;
  /** Current spectral flatness (for debugging) */
  spectralFlatness: number;
  /** Current onset rate (onsets per second, for debugging) */
  onsetRate: number;
}

interface VocalDetectorConfig {
  /** Minimum confidence to classify as singing (default: 0.35) */
  singingThreshold: number;
  /** Window size in frames for pitch variance (default: 24 ≈ 400 ms at 60 fps) */
  pitchVarianceWindowSize: number;
  /** Minimum pitch variance (semitones²) to count as singing (default: 0.08) */
  minPitchVariance: number;
  /** Minimum spectral flatness ratio — lower = more tonal (default: 0.02) */
  minSpectralFlatness: number;
  /** Maximum spectral flatness — higher = noisy/flat (default: 0.5) */
  maxSpectralFlatness: number;
  /** Window size in frames for onset detection (default: 12 ≈ 200 ms) */
  onsetWindowSize: number;
  /** Minimum onset rate (onsets per second) to help classify singing (default: 1.5) */
  minOnsetRate: number;
  /** Weight for pitch variance in final confidence (default: 0.4) */
  pitchVarianceWeight: number;
  /** Weight for spectral flatness in final confidence (default: 0.25) */
  spectralFlatnessWeight: number;
  /** Weight for onset rate in final confidence (default: 0.35) */
  onsetRateWeight: number;
  /** Enable/disable the vocal detector (default: true) */
  enabled: boolean;
}

// ===================== DEFAULTS =====================

const DEFAULT_VOCAL_CONFIG: VocalDetectorConfig = {
  singingThreshold: 0.35,
  pitchVarianceWindowSize: 24,
  minPitchVariance: 0.08,
  minSpectralFlatness: 0.02,
  maxSpectralFlatness: 0.5,
  onsetWindowSize: 12,
  minOnsetRate: 1.5,
  pitchVarianceWeight: 0.4,
  spectralFlatnessWeight: 0.25,
  onsetRateWeight: 0.35,
  enabled: true,
};

/** Slightly relaxed config for 'easy' difficulty */
const VOCAL_CONFIG_EASY: VocalDetectorConfig = {
  ...DEFAULT_VOCAL_CONFIG,
  singingThreshold: 0.25,
  minPitchVariance: 0.05,
  minOnsetRate: 1.0,
  pitchVarianceWeight: 0.3,
  spectralFlatnessWeight: 0.3,
  onsetRateWeight: 0.4,
};

/** Default config for 'medium' difficulty */
const VOCAL_CONFIG_MEDIUM: VocalDetectorConfig = {
  ...DEFAULT_VOCAL_CONFIG,
};

/** Stricter config for 'hard' difficulty */
const VOCAL_CONFIG_HARD: VocalDetectorConfig = {
  ...DEFAULT_VOCAL_CONFIG,
  singingThreshold: 0.45,
  minPitchVariance: 0.12,
  minOnsetRate: 2.0,
};

const VOCAL_CONFIGS: Record<string, VocalDetectorConfig> = {
  easy: VOCAL_CONFIG_EASY,
  medium: VOCAL_CONFIG_MEDIUM,
  hard: VOCAL_CONFIG_HARD,
};

// ===================== VOCAL DETECTOR CLASS =====================

export class VocalDetector {
  private config: VocalDetectorConfig;

  // Circular buffers
  private pitchHistory: number[] = [];
  private energyHistory: number[] = [];
  private timeHistory: number[] = [];

  // Onset detection state
  private prevEnergy: number = 0;
  private onsetTimes: number[] = [];

  // Hysteresis: avoid rapid toggling between singing/non-singing.
  // We require N consecutive frames below threshold before blocking scoring.
  private nonSingingFrameCount: number = 0;
  private readonly HYSTERESIS_FRAMES = 5; // ~83 ms at 60 fps
  private isCurrentlySinging: boolean = true; // Start as singing (don't block on first frames)

  public constructor(config: Partial<VocalDetectorConfig> = {}) {
    this.config = { ...DEFAULT_VOCAL_CONFIG, ...config };
  }

  /** Update config (e.g., on difficulty change) */
  public setConfig(config: Partial<VocalDetectorConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /** Set config from a difficulty level */
  public setDifficulty(difficulty: string): void {
    const cfg = VOCAL_CONFIGS[difficulty];
    if (cfg) {
      this.config = { ...cfg };
    }
  }

  /** Reset all internal buffers */
  public reset(): void {
    this.pitchHistory = [];
    this.energyHistory = [];
    this.timeHistory = [];
    this.prevEnergy = 0;
    this.onsetTimes = [];
    this.nonSingingFrameCount = 0;
    this.isCurrentlySinging = true;
  }

  /**
   * Process one frame of audio data and return a singing assessment.
   *
   * @param pitch  — current detected MIDI note (null if no pitch)
   * @param volume — current RMS volume (0–1)
   * @param frequencyData — the frequency-domain buffer from AnalyserNode (optional, for spectral flatness)
   * @param sampleRate — audio sample rate (needed for onset rate calculation)
   * @param currentTimeMs — timestamp in ms for onset tracking
   */
  public processFrame(
    pitch: number | null,
    volume: number,
    frequencyData: Float32Array | null = null,
    sampleRate: number = 44100,
    currentTimeMs: number = Date.now()
  ): VocalDetectionResult {
    const defaultResult: VocalDetectionResult = {
      isSinging: true, // Default to true when disabled
      singingConfidence: 1,
      pitchVariance: 0,
      spectralFlatness: 0,
      onsetRate: 0,
    };

    // If disabled, always return "singing"
    if (!this.config.enabled) {
      return defaultResult;
    }

    // No pitch detected → not singing
    if (pitch === null || volume < 0.01) {
      this.pitchHistory = [];
      this.energyHistory = [];
      this.timeHistory = [];
      this.prevEnergy = 0;
      return { isSinging: false, singingConfidence: 0, pitchVariance: 0, spectralFlatness: 0, onsetRate: 0 };
    }

    // ---- 1. Update pitch history ----
    this.pitchHistory.push(pitch);
    if (this.pitchHistory.length > this.config.pitchVarianceWindowSize) {
      this.pitchHistory.shift();
    }

    // ---- 2. Update energy history for onset detection ----
    this.energyHistory.push(volume);
    this.timeHistory.push(currentTimeMs);
    if (this.energyHistory.length > this.config.onsetWindowSize) {
      this.energyHistory.shift();
      this.timeHistory.shift();
    }

    // ---- 3. Detect onsets ----
    this.detectOnset(volume, currentTimeMs);

    // ---- Calculate metrics ----
    const pitchVariance = this.calculatePitchVariance();
    const spectralFlatness = frequencyData ? this.calculateSpectralFlatness(frequencyData) : 0.5;
    const onsetRate = this.calculateOnsetRate(currentTimeMs);

    // ---- Combine into confidence score ----
    const pitchScore = this.scorePitchVariance(pitchVariance);
    const spectralScore = this.scoreSpectralFlatness(spectralFlatness);
    const onsetScore = this.scoreOnsetRate(onsetRate);

    const confidence =
      this.config.pitchVarianceWeight * pitchScore +
      this.config.spectralFlatnessWeight * spectralScore +
      this.config.onsetRateWeight * onsetScore;

    // ---- Hysteresis: smooth isSinging transitions ----
    const rawIsSinging = confidence >= this.config.singingThreshold;
    if (rawIsSinging) {
      // Immediately resume singing on any good frame
      this.nonSingingFrameCount = 0;
      this.isCurrentlySinging = true;
    } else {
      // Require HYSTERESIS_FRAMES consecutive non-singing frames before blocking
      this.nonSingingFrameCount++;
      if (this.nonSingingFrameCount >= this.HYSTERESIS_FRAMES) {
        this.isCurrentlySinging = false;
      }
    }

    return {
      isSinging: this.isCurrentlySinging,
      singingConfidence: confidence,
      pitchVariance,
      spectralFlatness,
      onsetRate,
    };
  }

  // ===================== PITCH VARIANCE =====================

  /** Calculate variance of recent pitch values in semitones² */
  private calculatePitchVariance(): number {
    const pitches = this.pitchHistory;
    if (pitches.length < 4) return 0;

    // Calculate mean
    const mean = pitches.reduce((a, b) => a + b, 0) / pitches.length;

    // Calculate variance
    let sumSqDiff = 0;
    for (const p of pitches) {
      const diff = p - mean;
      sumSqDiff += diff * diff;
    }
    return sumSqDiff / pitches.length;
  }

  /** Convert pitch variance to a 0–1 score */
  private scorePitchVariance(variance: number): number {
    if (variance < this.config.minPitchVariance) {
      // Very low variance → humming
      return variance / this.config.minPitchVariance * 0.3;
    }
    if (variance > 0.5) {
      // High variance → likely singing with vibrato/melody changes
      return 1.0;
    }
    // Linear interpolation between min and ideal
    return 0.3 + ((variance - this.config.minPitchVariance) / (0.5 - this.config.minPitchVariance)) * 0.7;
  }

  // ===================== SPECTRAL FLATNESS =====================

  /**
   * Calculate Wiener entropy (spectral flatness) from frequency data.
   * Values near 0 = tonal (singing or humming)
   * Values near 1 = noise-like
   */
  private calculateSpectralFlatness(frequencyData: Float32Array): number {
    if (!frequencyData || frequencyData.length === 0) return 0.5;

    // Work only with the musically relevant range (roughly 80 Hz – 4 kHz)
    // and use the magnitude spectrum (convert from dB)
    let logSum = 0;
    let linSum = 0;
    let count = 0;

    for (let i = 0; i < frequencyData.length; i++) {
      const db = frequencyData[i];
      // Skip very low energy bins (noise floor)
      if (db < -80) continue;

      // Convert dB to linear power
      const power = Math.pow(10, db / 10);
      if (power <= 0) continue;

      logSum += Math.log(power);
      linSum += power;
      count++;
    }

    if (count === 0 || linSum === 0) return 0.5;

    const geometricMean = Math.exp(logSum / count);
    const arithmeticMean = linSum / count;

    return arithmeticMean > 0 ? geometricMean / arithmeticMean : 0.5;
  }

  /** Score spectral flatness: singing typically 0.01–0.2 */
  private scoreSpectralFlatness(flatness: number): number {
    // Very low flatness = very tonal → could be humming OR singing
    // Sweet spot for singing is 0.02–0.15 (more complex harmonics than humming)
    if (flatness >= this.config.minSpectralFlatness && flatness <= 0.15) {
      return 0.8; // Good singing range
    }
    if (flatness > 0.15 && flatness <= this.config.maxSpectralFlatness) {
      return 0.5; // Some harmonic complexity
    }
    if (flatness > this.config.maxSpectralFlatness) {
      return 0.1; // Too noisy
    }
    // Below min → very tonal, could be humming
    return 0.3;
  }

  // ===================== ONSET DETECTION =====================

  /** Detect an onset (sudden energy increase) */
  private detectOnset(currentEnergy: number, currentTimeMs: number): void {
    // Simple high-pass energy difference
    const energyDiff = currentEnergy - this.prevEnergy;

    if (energyDiff > 0.015 && this.prevEnergy > 0.005) {
      // Only register onset if enough time has passed since last one
      // (minimum 80 ms between onsets to avoid double-triggers)
      const lastOnset = this.onsetTimes[this.onsetTimes.length - 1] ?? 0;
      if (currentTimeMs - lastOnset > 80) {
        this.onsetTimes.push(currentTimeMs);
        // Keep only last 30 onsets
        if (this.onsetTimes.length > 30) {
          this.onsetTimes.shift();
        }
      }
    }

    this.prevEnergy = currentEnergy;
  }

  /** Calculate onset rate (onsets per second) over the last ~2 seconds */
  private calculateOnsetRate(currentTimeMs: number): number {
    const windowMs = 2000;
    const cutoffTime = currentTimeMs - windowMs;

    // Remove old onsets
    while (this.onsetTimes.length > 0 && this.onsetTimes[0] < cutoffTime) {
      this.onsetTimes.shift();
    }

    return this.onsetTimes.length / (windowMs / 1000);
  }

  /** Score onset rate: singing typically 2–8 onsets per second */
  private scoreOnsetRate(rate: number): number {
    if (rate >= this.config.minOnsetRate && rate <= 10) {
      return Math.min(1.0, rate / 5); // Peaks at 5 onsets/s
    }
    if (rate < this.config.minOnsetRate) {
      // Low onset rate → likely humming
      return (rate / this.config.minOnsetRate) * 0.3;
    }
    // Very high rate → possibly noise/clicks
    return 0.3;
  }
}
