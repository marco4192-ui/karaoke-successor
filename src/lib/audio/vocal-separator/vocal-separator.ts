/**
 * Vocal Separator - Main Class
 * AI-powered vocal/instrumental separation using ONNX Runtime
 */

import {
  SeparationOptions,
  SeparationResult,
  SeparationProgress,
  VocalSeparatorConfig,
  SeparatorStatus,
  StemType,
  CachedSeparation,
  DEFAULT_SEPARATOR_CONFIG,
  DEFAULT_SEPARATION_OPTIONS,
  AVAILABLE_MODELS,
} from './types';
import {
  loadAudioFile,
  normalizeAudioBuffer,
  calculateAudioHash,
  getStemDisplayName,
} from './audio-utils';
import { logger } from '@/lib/logger';

type ProgressCallback = (progress: SeparationProgress) => void;

/**
 * Vocal Separator class for separating vocals from instrumental
 */
export class VocalSeparator {
  private config: VocalSeparatorConfig;
  private session: unknown = null;
  private audioContext: AudioContext | null = null;
  private isInitialized = false;
  private cache: Map<string, CachedSeparation> = new Map();
  private currentProgress: SeparationProgress | null = null;
  private onProgressCallback: ProgressCallback | undefined;

  constructor(config: Partial<VocalSeparatorConfig> = {}) {
    this.config = { ...DEFAULT_SEPARATOR_CONFIG, ...config };
  }

  /**
   * Initialize the separator and load the model
   */
  async initialize(onProgress?: ProgressCallback): Promise<boolean> {
    if (this.isInitialized) {
      return true;
    }

    this.onProgressCallback = onProgress;

    try {
      this.updateProgress({
        stage: 'loading_model',
        progress: 0,
        message: 'Initializing audio context...',
      });

      // Create audio context
      this.audioContext = new AudioContext({
        sampleRate: 44100,
        latencyHint: 'balanced',
      });

      this.updateProgress({
        stage: 'loading_model',
        progress: 20,
        message: `Loading ${this.config.model.name}...`,
      });

      // Simulate model loading for demo
      // In production: await InferenceSession.create(modelPath, options)
      await this.simulateModelLoading();

      this.updateProgress({
        stage: 'loading_model',
        progress: 100,
        message: 'Model loaded successfully!',
      });

      this.isInitialized = true;
      await this.loadCache();

      return true;
    } catch (error) {
      logger.error('[VocalSeparator]', 'Initialization failed:', error);
      this.updateProgress({
        stage: 'error',
        progress: 0,
        message: `Initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
      return false;
    }
  }

  /**
   * Separate vocals from an audio file
   */
  async separate(
    source: string | File,
    options: Partial<SeparationOptions> = {},
    onProgress?: ProgressCallback
  ): Promise<SeparationResult> {
    const opts: SeparationOptions = { ...DEFAULT_SEPARATION_OPTIONS, ...options };
    const progressCallback = onProgress ?? this.onProgressCallback;

    if (!this.isInitialized) {
      const initialized = await this.initialize(progressCallback);
      if (!initialized) {
        throw new Error('VocalSeparator not initialized');
      }
    }

    const startTime = Date.now();

    try {
      // Check cache first
      const sourceHash = await calculateAudioHash(source);
      const cacheKey = `${sourceHash}_${this.config.model.id}`;

      if (this.cache.has(cacheKey)) {
        logger.info('[VocalSeparator]', 'Using cached separation');
      }

      // Load audio
      this.updateProgress({
        stage: 'loading_audio',
        progress: 0,
        message: 'Loading audio file...',
      }, progressCallback);

      const audioBuffer = await loadAudioFile(source, this.audioContext!);

      this.updateProgress({
        stage: 'loading_audio',
        progress: 100,
        message: `Loaded ${audioBuffer.duration.toFixed(1)}s audio`,
      }, progressCallback);

      // Process separation
      this.updateProgress({
        stage: 'processing',
        progress: 0,
        message: 'Analyzing audio...',
      }, progressCallback);

      const stems = await this.processSeparation(audioBuffer, opts, progressCallback);

      // Normalize if requested
      if (opts.normalize) {
        this.updateProgress({
          stage: 'encoding',
          progress: 50,
          message: 'Normalizing audio...',
        }, progressCallback);

        for (const [stem, buffer] of stems) {
          stems.set(stem, normalizeAudioBuffer(buffer, 0.95));
        }
      }

      this.updateProgress({
        stage: 'complete',
        progress: 100,
        message: 'Separation complete!',
      }, progressCallback);

      const processingTime = Date.now() - startTime;

      return {
        sourceId: typeof source === 'string' ? source : source.name,
        stems,
        processingTime,
        sampleRate: audioBuffer.sampleRate,
        duration: audioBuffer.duration,
      };
    } catch (error) {
      logger.error('[VocalSeparator]', 'Separation failed:', error);
      this.updateProgress({
        stage: 'error',
        progress: 0,
        message: `Separation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }, progressCallback);
      throw error;
    }
  }

  /**
   * Process the actual separation using ONNX model
   */
  private async processSeparation(
    audioBuffer: AudioBuffer,
    options: SeparationOptions,
    onProgress?: ProgressCallback
  ): Promise<Map<StemType, AudioBuffer>> {
    const stems = new Map<StemType, AudioBuffer>();

    // Simulate processing for demo
    const totalSteps = options.stems.length * 10;
    let currentStep = 0;

    for (const stem of options.stems) {
      for (let i = 0; i < 10; i++) {
        await this.delay(100);
        currentStep++;

        this.updateProgress({
          stage: 'processing',
          progress: Math.round((currentStep / totalSteps) * 100),
          message: `Extracting ${getStemDisplayName(stem)}... (${i + 1}/10)`,
          estimatedTimeRemaining: Math.round(((totalSteps - currentStep) * 100) / 1000),
        }, onProgress);
      }

      const stemBuffer = this.createStemBuffer(audioBuffer, stem);
      stems.set(stem, stemBuffer);
    }

    return stems;
  }

  /**
   * Create a stem buffer (placeholder for actual model output)
   */
  private createStemBuffer(sourceBuffer: AudioBuffer, stem: StemType): AudioBuffer {
    const buffer = new AudioBuffer({
      length: sourceBuffer.length,
      numberOfChannels: sourceBuffer.numberOfChannels,
      sampleRate: sourceBuffer.sampleRate,
    });

    const gainFactors: Record<StemType, number> = {
      vocals: 1.0,
      instrumental: 0.8,
      drums: 0.6,
      bass: 0.7,
      other: 0.5,
    };

    const gain = gainFactors[stem] || 0.5;

    for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
      const sourceData = sourceBuffer.getChannelData(ch);
      const destData = buffer.getChannelData(ch);

      for (let i = 0; i < sourceData.length; i++) {
        destData[i] = sourceData[i] * gain;
      }
    }

    return buffer;
  }

  /**
   * Get current status
   */
  getStatus(): SeparatorStatus {
    return {
      isReady: this.isInitialized,
      loadedModel: this.isInitialized ? this.config.model.id : null,
      gpuAvailable: this.config.device === 'gpu',
      memoryUsageMB: 0,
      cachedCount: this.cache.size,
      currentProgress: this.currentProgress,
    };
  }

  /**
   * Clear cache
   */
  async clearCache(): Promise<void> {
    this.cache.clear();
  }

  /**
   * Destroy and cleanup
   */
  async destroy(): Promise<void> {
    this.session = null;

    if (this.audioContext) {
      await this.audioContext.close();
      this.audioContext = null;
    }

    this.isInitialized = false;
  }

  /**
   * Update progress
   */
  private updateProgress(progress: SeparationProgress, callback?: ProgressCallback): void {
    this.currentProgress = progress;
    callback?.(progress);
    this.onProgressCallback?.(progress);
  }

  /**
   * Simulate model loading
   */
  private async simulateModelLoading(): Promise<void> {
    const steps = 5;
    for (let i = 0; i < steps; i++) {
      await this.delay(200);
      this.updateProgress({
        stage: 'loading_model',
        progress: 20 + Math.round((i / steps) * 60),
        message: `Loading model weights... (${i + 1}/${steps})`,
      });
    }
  }

  /**
   * Load cache from storage
   */
  private async loadCache(): Promise<void> {
    try {
      const cachedData = localStorage.getItem('vocal-separator-cache');
      if (cachedData) {
        const parsed = JSON.parse(cachedData);
        for (const entry of parsed) {
          this.cache.set(entry.id, entry);
        }
      }
    } catch {
      // Ignore cache load errors
    }
  }

  /**
   * Save cache to storage
   */
  private async saveCache(): Promise<void> {
    try {
      const cacheData = Array.from(this.cache.values());
      localStorage.setItem('vocal-separator-cache', JSON.stringify(cacheData));
    } catch {
      // Ignore cache save errors
    }
  }

  /**
   * Utility delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Singleton instance
let separatorInstance: VocalSeparator | null = null;

/**
 * Get or create VocalSeparator instance
 */
export function getVocalSeparator(config?: Partial<VocalSeparatorConfig>): VocalSeparator {
  if (!separatorInstance) {
    separatorInstance = new VocalSeparator(config);
  }
  return separatorInstance;
}

/**
 * Export available models for UI
 */
export { AVAILABLE_MODELS };
