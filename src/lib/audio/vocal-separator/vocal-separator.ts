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
  SeparationModel,
} from './types';
import {
  loadAudioFile,
  normalizeAudioBuffer,
  calculateAudioHash,
  getStemDisplayName,
  resampleAudioBuffer,
} from './audio-utils';
import { getModelManager, ModelInfo, ModelDownloadProgress } from '../model-manager';
import { OnnxInferenceEngine, getInferenceEngine, InferenceProgress } from '../onnx-inference';
import { logger } from '@/lib/logger';

type ProgressCallback = (progress: SeparationProgress) => void;

/**
 * Vocal Separator class for separating vocals from instrumental
 */
export class VocalSeparator {
  private config: VocalSeparatorConfig;
  private inferenceEngine: OnnxInferenceEngine | null = null;
  private audioContext: AudioContext | null = null;
  private isInitialized = false;
  private isModelLoaded = false;
  private cache: Map<string, CachedSeparation> = new Map();
  private currentProgress: SeparationProgress | null = null;
  private onProgressCallback: ProgressCallback | undefined;
  private currentModel: ModelInfo | null = null;

  constructor(config: Partial<VocalSeparatorConfig> = {}) {
    this.config = { ...DEFAULT_SEPARATOR_CONFIG, ...config };
  }

  /**
   * Initialize the separator and load the model
   */
  async initialize(onProgress?: ProgressCallback): Promise<boolean> {
    if (this.isInitialized && this.isModelLoaded) {
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

      // Get model manager and find model
      const modelManager = getModelManager();
      const modelId = this.config.model.id;
      
      // Check if model exists in available models
      const availableModels = modelManager.getAvailableModels();
      const modelInfo = availableModels.find(m => m.id === modelId);
      
      if (!modelInfo) {
        throw new Error(`Model not found: ${modelId}`);
      }
      
      this.currentModel = modelInfo;

      this.updateProgress({
        stage: 'loading_model',
        progress: 10,
        message: `Preparing ${modelInfo.name}...`,
      });

      // Load or download the model
      const modelBlob = await modelManager.loadModel(modelId, (progress: ModelDownloadProgress) => {
        if (progress.status === 'downloading') {
          this.updateProgress({
            stage: 'loading_model',
            progress: 10 + Math.round(progress.progress * 0.4),
            message: `Downloading model... ${progress.progress}% (${progress.downloadedMB}/${progress.totalMB} MB)`,
          });
        }
      });

      this.updateProgress({
        stage: 'loading_model',
        progress: 50,
        message: 'Initializing ONNX Runtime...',
      });

      // Create inference engine
      this.inferenceEngine = getInferenceEngine(modelId, {
        device: this.config.device === 'gpu' ? 'webgl' : 'wasm',
        numThreads: this.config.numThreads,
      });

      // Initialize the engine with the model
      const initialized = await this.inferenceEngine.initialize(modelBlob, (progress: InferenceProgress) => {
        this.updateProgress({
          stage: 'loading_model',
          progress: 50 + Math.round(progress.progress * 0.5),
          message: progress.message,
        });
      });

      if (!initialized) {
        throw new Error('Failed to initialize inference engine');
      }

      this.updateProgress({
        stage: 'loading_model',
        progress: 100,
        message: 'Model loaded successfully!',
      });

      this.isInitialized = true;
      this.isModelLoaded = true;
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

    if (!this.isInitialized || !this.isModelLoaded) {
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

      const cachedResult = this.cache.get(cacheKey);
      if (cachedResult) {
        logger.info('[VocalSeparator]', 'Using cached separation');
        // TODO: Load cached stems from IndexedDB
      }

      // Load audio
      this.updateProgress({
        stage: 'loading_audio',
        progress: 0,
        message: 'Loading audio file...',
      }, progressCallback);

      let audioBuffer = await loadAudioFile(source, this.audioContext!);

      this.updateProgress({
        stage: 'loading_audio',
        progress: 100,
        message: `Loaded ${audioBuffer.duration.toFixed(1)}s audio`,
      }, progressCallback);

      // Resample if needed
      if (this.currentModel && audioBuffer.sampleRate !== this.currentModel.sampleRate) {
        this.updateProgress({
          stage: 'loading_audio',
          progress: 80,
          message: `Resampling to ${this.currentModel.sampleRate}Hz...`,
        }, progressCallback);
        
        audioBuffer = resampleAudioBuffer(audioBuffer, this.currentModel.sampleRate, this.audioContext!);
      }

      // Convert to mono for inference
      const monoData = this.toMono(audioBuffer);

      // Process separation
      this.updateProgress({
        stage: 'processing',
        progress: 0,
        message: 'Starting AI separation...',
      }, progressCallback);

      const separationOutput = await this.inferenceEngine!.runInference(
        monoData,
        audioBuffer.sampleRate,
        (progress: InferenceProgress) => {
          this.updateProgress({
            stage: 'processing',
            progress: progress.progress,
            message: progress.message,
            estimatedTimeRemaining: progress.estimatedTimeRemaining,
          }, progressCallback);
        }
      );

      // Convert output to AudioBuffers
      const stems = await this.convertOutputsToStems(
        separationOutput.stems,
        audioBuffer
      );

      // Filter to requested stems
      const filteredStems = new Map<StemType, AudioBuffer>();
      for (const [stemType, buffer] of stems) {
        if (opts.stems.includes(stemType)) {
          filteredStems.set(stemType, buffer);
        }
      }

      // Normalize if requested
      if (opts.normalize) {
        this.updateProgress({
          stage: 'encoding',
          progress: 50,
          message: 'Normalizing audio...',
        }, progressCallback);

        for (const [stem, buffer] of filteredStems) {
          filteredStems.set(stem, normalizeAudioBuffer(buffer, 0.95));
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
        stems: filteredStems,
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
   * Convert inference outputs to stem AudioBuffers
   */
  private async convertOutputsToStems(
    outputStems: Map<string, Float32Array>,
    sourceBuffer: AudioBuffer
  ): Promise<Map<StemType, AudioBuffer>> {
    const stems = new Map<StemType, AudioBuffer>();
    const outputNames = Array.from(outputStems.keys());

    // Map output names to stem types
    const stemMapping = this.mapOutputNamesToStems(outputNames);

    for (const [stemType, audioData] of outputStems) {
      const mappedType = stemMapping.get(stemType) || this.inferStemType(stemType);
      
      // Create AudioBuffer from Float32Array
      const buffer = this.audioContext!.createBuffer(
        sourceBuffer.numberOfChannels,
        audioData.length,
        sourceBuffer.sampleRate
      );

      // Copy data to all channels
      for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
        buffer.copyToChannel(audioData, ch);
      }

      stems.set(mappedType, buffer);
    }

    // If we only got vocals, create instrumental by subtracting from original
    if (stems.size === 1 && stems.has('vocals')) {
      const instrumentalBuffer = this.createInstrumental(
        sourceBuffer,
        stems.get('vocals')!
      );
      stems.set('instrumental', instrumentalBuffer);
    }

    return stems;
  }

  /**
   * Map model output names to stem types
   */
  private mapOutputNamesToStems(outputNames: string[]): Map<string, StemType> {
    const mapping = new Map<string, StemType>();

    for (const name of outputNames) {
      const lowerName = name.toLowerCase();
      
      if (lowerName.includes('vocal') || lowerName === 'output_0') {
        mapping.set(name, 'vocals');
      } else if (lowerName.includes('drum')) {
        mapping.set(name, 'drums');
      } else if (lowerName.includes('bass')) {
        mapping.set(name, 'bass');
      } else if (lowerName.includes('other') || lowerName.includes('accompaniment')) {
        mapping.set(name, 'other');
      } else if (lowerName.includes('instrumental') || lowerName === 'output_1') {
        mapping.set(name, 'instrumental');
      }
    }

    return mapping;
  }

  /**
   * Infer stem type from output name
   */
  private inferStemType(name: string): StemType {
    const mapping = this.mapOutputNamesToStems([name]);
    return mapping.get(name) || 'other';
  }

  /**
   * Create instrumental by subtracting vocals from original
   */
  private createInstrumental(original: AudioBuffer, vocals: AudioBuffer): AudioBuffer {
    const buffer = this.audioContext!.createBuffer(
      original.numberOfChannels,
      original.length,
      original.sampleRate
    );

    for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
      const originalData = original.getChannelData(ch);
      const vocalsData = vocals.getChannelData(ch);
      const destData = buffer.getChannelData(ch);

      for (let i = 0; i < buffer.length; i++) {
        // Subtract vocals from original (with safety bounds)
        destData[i] = originalData[i] - (vocalsData[i] || 0);
      }
    }

    return buffer;
  }

  /**
   * Convert AudioBuffer to mono Float32Array
   */
  private toMono(buffer: AudioBuffer): Float32Array {
    if (buffer.numberOfChannels === 1) {
      return buffer.getChannelData(0);
    }

    const mono = new Float32Array(buffer.length);
    const left = buffer.getChannelData(0);
    const right = buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : left;

    for (let i = 0; i < buffer.length; i++) {
      mono[i] = (left[i] + right[i]) / 2;
    }

    return mono;
  }

  /**
   * Get current status
   */
  getStatus(): SeparatorStatus {
    return {
      isReady: this.isInitialized && this.isModelLoaded,
      loadedModel: this.isModelLoaded ? this.config.model.id : null,
      gpuAvailable: this.config.device === 'gpu',
      memoryUsageMB: this.currentModel?.sizeMB || 0,
      cachedCount: this.cache.size,
      currentProgress: this.currentProgress,
    };
  }

  /**
   * Get available models
   */
  getAvailableModels(): (ModelInfo & { isDownloaded: boolean })[] {
    return getModelManager().getAvailableModels();
  }

  /**
   * Switch to a different model
   */
  async switchModel(modelId: string, onProgress?: ProgressCallback): Promise<boolean> {
    const modelManager = getModelManager();
    const modelInfo = modelManager.getModelInfo(modelId);
    
    if (!modelInfo) {
      throw new Error(`Model not found: ${modelId}`);
    }

    // Update config
    this.config.model = {
      id: modelInfo.id,
      name: modelInfo.name,
      source: modelInfo.source,
      sizeMB: modelInfo.sizeMB,
      supportedStems: modelInfo.supportedStems as StemType[],
      supportsGpu: true,
      quality: modelInfo.quality,
    };

    // Reset state
    this.isModelLoaded = false;
    this.currentModel = modelInfo;

    // Dispose old engine
    if (this.inferenceEngine) {
      await this.inferenceEngine.dispose();
      this.inferenceEngine = null;
    }

    // Reinitialize
    return this.initialize(onProgress);
  }

  /**
   * Clear cache
   */
  async clearCache(): Promise<void> {
    this.cache.clear();
    localStorage.removeItem('vocal-separator-cache');
  }

  /**
   * Destroy and cleanup
   */
  async destroy(): Promise<void> {
    if (this.inferenceEngine) {
      await this.inferenceEngine.dispose();
      this.inferenceEngine = null;
    }

    if (this.audioContext) {
      await this.audioContext.close();
      this.audioContext = null;
    }

    this.isInitialized = false;
    this.isModelLoaded = false;
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
 * Reset the separator instance
 */
export function resetVocalSeparator(): void {
  if (separatorInstance) {
    separatorInstance.destroy();
    separatorInstance = null;
  }
}

/**
 * Get available models for UI
 */
export function getAvailableModels(): (ModelInfo & { isDownloaded: boolean })[] {
  return getModelManager().getAvailableModels();
}
