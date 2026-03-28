/**
 * ONNX Inference Engine for Audio Separation
 * Real-time inference using ONNX Runtime Web
 */

import * as ort from 'onnxruntime-web';
import { logger } from '@/lib/logger';

export interface InferenceConfig {
  modelId: string;
  device: 'cpu' | 'wasm' | 'webgl';
  numThreads: number;
  chunkSize: number; // samples per chunk
  overlap: number; // 0-1
}

export interface InferenceProgress {
  stage: 'loading' | 'initializing' | 'processing' | 'encoding' | 'complete' | 'error';
  progress: number;
  message: string;
  currentTime?: number;
  totalTime?: number;
  estimatedTimeRemaining?: number;
}

export interface SeparationOutput {
  stems: Map<string, Float32Array>;
  sampleRate: number;
  processingTime: number;
}

const DEFAULT_CONFIG: Partial<InferenceConfig> = {
  device: 'wasm',
  numThreads: 4,
  chunkSize: 44100 * 30, // 30 seconds at 44.1kHz
  overlap: 0.1,
};

type ProgressCallback = (progress: InferenceProgress) => void;

export class OnnxInferenceEngine {
  private session: ort.InferenceSession | null = null;
  private config: InferenceConfig;
  private isInitialized = false;
  private inputName: string = '';
  private outputNames: string[] = [];

  constructor(config: Partial<InferenceConfig> & { modelId: string }) {
    this.config = { ...DEFAULT_CONFIG, ...config } as InferenceConfig;
  }

  /**
   * Initialize the inference engine with a model blob
   */
  async initialize(
    modelBlob: Blob,
    onProgress?: ProgressCallback
  ): Promise<boolean> {
    if (this.isInitialized) {
      return true;
    }

    const startTime = Date.now();

    try {
      onProgress?.({
        stage: 'loading',
        progress: 0,
        message: 'Loading ONNX model into memory...',
      });

      // Convert blob to ArrayBuffer
      const modelBuffer = await modelBlob.arrayBuffer();

      onProgress?.({
        stage: 'loading',
        progress: 30,
        message: 'Configuring ONNX Runtime...',
      });

      // Configure ONNX Runtime
      ort.env.wasm.numThreads = this.config.numThreads;
      ort.env.wasm.simd = true;

      // Create session options
      const sessionOptions: ort.InferenceSession.SessionOptions = {
        executionProviders: [this.config.device],
        graphOptimizationLevel: 'all',
        enableCpuMemArena: true,
        enableMemPattern: true,
      };

      onProgress?.({
        stage: 'initializing',
        progress: 50,
        message: 'Creating inference session...',
      });

      // Create inference session
      this.session = await ort.InferenceSession.create(modelBuffer, sessionOptions);

      // Get input/output names
      this.inputName = this.session.inputNames[0];
      this.outputNames = [...this.session.outputNames];

      this.isInitialized = true;

      const loadTime = Date.now() - startTime;
      logger.info('[OnnxInference]', `Model loaded in ${loadTime}ms`);

      onProgress?.({
        stage: 'initializing',
        progress: 100,
        message: 'Model ready for inference',
      });

      return true;
    } catch (error) {
      logger.error('[OnnxInference]', 'Initialization failed:', error);
      onProgress?.({
        stage: 'error',
        progress: 0,
        message: `Failed to initialize: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
      return false;
    }
  }

  /**
   * Run inference on audio data
   */
  async runInference(
    audioData: Float32Array,
    sampleRate: number,
    onProgress?: ProgressCallback
  ): Promise<SeparationOutput> {
    if (!this.isInitialized || !this.session) {
      throw new Error('Engine not initialized. Call initialize() first.');
    }

    const startTime = Date.now();
    const numSamples = audioData.length;
    const duration = numSamples / sampleRate;

    onProgress?.({
      stage: 'processing',
      progress: 0,
      message: 'Starting separation...',
      totalTime: duration,
    });

    // Process in chunks with overlap
    const chunkSize = Math.min(this.config.chunkSize, numSamples);
    const overlap = Math.floor(chunkSize * this.config.overlap);
    const hopSize = chunkSize - overlap;
    const numChunks = Math.ceil((numSamples - overlap) / hopSize);

    // Output buffers (assuming 2 stems for now)
    const outputBuffers: Map<string, Float32Array> = new Map();
    for (const name of this.outputNames) {
      outputBuffers.set(name, new Float32Array(numSamples));
    }

    // Window function for overlap-add
    const window = this.createHannWindow(chunkSize);
    const windowSum = new Float32Array(numSamples);

    for (let i = 0; i < numChunks; i++) {
      const startSample = i * hopSize;
      const endSample = Math.min(startSample + chunkSize, numSamples);
      const actualChunkSize = endSample - startSample;

      // Extract chunk with windowing
      const chunk = new Float32Array(chunkSize);
      for (let j = 0; j < actualChunkSize; j++) {
        chunk[j] = audioData[startSample + j] * window[j];
      }

      // Run inference on chunk
      const chunkOutputs = await this.runChunkInference(chunk);

      // Overlap-add to output
      for (const [name, output] of chunkOutputs) {
        const outputBuffer = outputBuffers.get(name);
        if (outputBuffer && output.length >= actualChunkSize) {
          for (let j = 0; j < actualChunkSize; j++) {
            outputBuffer[startSample + j] += output[j] * window[j];
          }
        }
      }

      // Update window sum for normalization
      for (let j = 0; j < actualChunkSize; j++) {
        windowSum[startSample + j] += window[j] * window[j];
      }

      const progress = Math.round(((i + 1) / numChunks) * 100);
      onProgress?.({
        stage: 'processing',
        progress,
        message: `Processing chunk ${i + 1}/${numChunks}`,
        currentTime: startSample / sampleRate,
        totalTime: duration,
        estimatedTimeRemaining: Math.round(((numChunks - i - 1) * 0.5)), // Rough estimate
      });
    }

    // Normalize by window sum (overlap-add)
    for (const [name, buffer] of outputBuffers) {
      for (let i = 0; i < numSamples; i++) {
        if (windowSum[i] > 1e-8) {
          buffer[i] /= windowSum[i];
        }
      }
    }

    const processingTime = Date.now() - startTime;

    onProgress?.({
      stage: 'complete',
      progress: 100,
      message: 'Separation complete!',
      totalTime: duration,
    });

    return {
      stems: outputBuffers,
      sampleRate,
      processingTime,
    };
  }

  /**
   * Run inference on a single chunk
   */
  private async runChunkInference(chunk: Float32Array): Promise<Map<string, Float32Array>> {
    if (!this.session) {
      throw new Error('Session not initialized');
    }

    // For models that expect STFT input, we need to compute it
    // For now, assume model expects raw audio or compute STFT based on model type

    // Create input tensor
    // Shape depends on model: typically [batch, channels, samples] or [batch, samples]
    const inputShape = [1, chunk.length]; // Adjust based on model requirements
    const inputTensor = new ort.Tensor('float32', chunk, inputShape);

    // Run inference
    const feeds: Record<string, ort.Tensor> = {};
    feeds[this.inputName] = inputTensor;

    const outputs = await this.session.run(feeds);

    // Extract outputs
    const result = new Map<string, Float32Array>();
    for (const name of this.outputNames) {
      const tensor = outputs[name];
      result.set(name, tensor.data as Float32Array);
    }

    return result;
  }

  /**
   * Create Hann window function
   */
  private createHannWindow(size: number): Float32Array {
    const window = new Float32Array(size);
    for (let i = 0; i < size; i++) {
      window[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (size - 1)));
    }
    return window;
  }

  /**
   * Check if engine is initialized
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Get output names from loaded model
   */
  getOutputNames(): string[] {
    return this.outputNames;
  }

  /**
   * Release resources
   */
  async dispose(): Promise<void> {
    if (this.session) {
      await this.session.release();
      this.session = null;
    }
    this.isInitialized = false;
    this.inputName = '';
    this.outputNames = [];
  }
}

// Singleton per model
const engineInstances: Map<string, OnnxInferenceEngine> = new Map();

export function getInferenceEngine(modelId: string, config?: Partial<InferenceConfig>): OnnxInferenceEngine {
  let engine = engineInstances.get(modelId);
  if (!engine) {
    engine = new OnnxInferenceEngine({ modelId, ...config });
    engineInstances.set(modelId, engine);
  }
  return engine;
}

export async function disposeAllEngines(): Promise<void> {
  for (const engine of engineInstances.values()) {
    await engine.dispose();
  }
  engineInstances.clear();
}
