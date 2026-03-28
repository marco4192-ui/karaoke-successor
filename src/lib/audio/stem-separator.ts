// AI Stem Separator - Voice/Instrument Separation using ONNX Runtime
// Supports local inference with ONNX models (Spleeter-style architecture)

import * as ort from 'onnxruntime-web';

export type StemType = 'vocals' | 'drums' | 'bass' | 'other' | 'accompaniment';

export interface SeparationResult {
  stems: Map<StemType, AudioBuffer>;
  originalDuration: number;
  processingTime: number;
}

export interface SeparationProgress {
  stage: 'loading' | 'processing' | 'encoding' | 'complete';
  progress: number; // 0-100
  message: string;
  currentTime?: number;
  totalTime?: number;
}

export interface StemSeparatorConfig {
  modelPath: string;
  chunkSize: number; // samples per chunk
  overlap: number; // overlap between chunks (0-1)
  onProgress?: (progress: SeparationProgress) => void;
}

// Default configuration for 2-stem model (vocals/accompaniment)
const DEFAULT_CONFIG: Partial<StemSeparatorConfig> = {
  chunkSize: 44100 * 30, // 30 seconds at 44.1kHz
  overlap: 0.1, // 10% overlap
};

// Model URLs - using pre-converted ONNX models
const MODEL_URLS = {
  'spleeter-2stems': 'https://huggingface.co/rwightman/spleeter-onnx/resolve/main/spleeter-2stems.onnx',
  'spleeter-4stems': 'https://huggingface.co/rwightman/spleeter-onnx/resolve/main/spleeter-4stems.onnx',
  // Fallback to a smaller model for faster loading
  'spleeter-mini': '/models/stem-separator-mini.onnx',
};

export class StemSeparator {
  private session: ort.InferenceSession | null = null;
  private audioContext: AudioContext | null = null;
  private config: StemSeparatorConfig;
  private modelLoaded = false;
  private loadingPromise: Promise<void> | null = null;

  constructor(config: Partial<StemSeparatorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config } as StemSeparatorConfig;
  }

  /**
   * Initialize the separator with an ONNX model
   */
  async initialize(modelType: keyof typeof MODEL_URLS = 'spleeter-2stems'): Promise<void> {
    if (this.modelLoaded) return;
    
    // Prevent parallel initialization
    if (this.loadingPromise) {
      return this.loadingPromise;
    }

    this.loadingPromise = this.doInitialize(MODEL_URLS[modelType]);
    await this.loadingPromise;
    this.loadingPromise = null;
  }

  private async doInitialize(modelUrl: string): Promise<void> {
    this.config.onProgress?.({
      stage: 'loading',
      progress: 0,
      message: 'Initializing ONNX Runtime...',
    });

    // Create audio context
    this.audioContext = new AudioContext({ sampleRate: 44100 });

    // Configure ONNX Runtime for WebAssembly
    ort.env.wasm.numThreads = navigator.hardwareConcurrency || 4;
    ort.env.wasm.simd = true;

    this.config.onProgress?.({
      stage: 'loading',
      progress: 20,
      message: 'Loading AI model...',
    });

    try {
      // Create inference session with WebGL or WASM backend
      const options: ort.InferenceSession.SessionOptions = {
        executionProviders: ['wasm'],
        graphOptimizationLevel: 'all',
      };

      this.session = await ort.InferenceSession.create(modelUrl, options);
      this.modelLoaded = true;

      this.config.onProgress?.({
        stage: 'loading',
        progress: 100,
        message: 'Model loaded successfully!',
      });
    } catch (error) {
      console.error('Failed to load ONNX model:', error);
      throw new Error(`Failed to load stem separation model: ${error}`);
    }
  }

  /**
   * Separate audio into stems
   */
  async separate(audioBuffer: AudioBuffer): Promise<SeparationResult> {
    if (!this.modelLoaded || !this.session) {
      throw new Error('Model not loaded. Call initialize() first.');
    }

    const startTime = performance.now();
    const sampleRate = audioBuffer.sampleRate;
    const numChannels = audioBuffer.numberOfChannels;
    const length = audioBuffer.length;

    // Convert to mono if stereo (model expects mono)
    const monoAudio = this.toMono(audioBuffer);

    this.config.onProgress?.({
      stage: 'processing',
      progress: 0,
      message: 'Starting stem separation...',
      totalTime: length / sampleRate,
    });

    // Process in chunks
    const chunkSize = Math.min(this.config.chunkSize, length);
    const overlap = Math.floor(chunkSize * this.config.overlap);
    const hopSize = chunkSize - overlap;
    const numChunks = Math.ceil((length - overlap) / hopSize);

    // Output buffers
    const vocalsBuffer = new Float32Array(length);
    const accompanimentBuffer = new Float32Array(length);
    const window = this.createWindow(chunkSize);

    for (let i = 0; i < numChunks; i++) {
      const start = i * hopSize;
      const end = Math.min(start + chunkSize, length);
      const actualChunkSize = end - start;

      // Extract chunk with windowing
      const chunk = new Float32Array(chunkSize);
      for (let j = 0; j < actualChunkSize; j++) {
        chunk[j] = monoAudio[start + j] * window[j];
      }

      // Run inference
      const { vocals, accompaniment } = await this.runInference(chunk);

      // Overlap-add to output
      for (let j = 0; j < actualChunkSize; j++) {
        vocalsBuffer[start + j] += vocals[j] * window[j];
        accompanimentBuffer[start + j] += accompaniment[j] * window[j];
      }

      this.config.onProgress?.({
        stage: 'processing',
        progress: (i + 1) / numChunks * 100,
        message: `Processing chunk ${i + 1}/${numChunks}`,
        currentTime: start / sampleRate,
        totalTime: length / sampleRate,
      });
    }

    // Normalize (due to overlap-add)
    const normalizeFactor = 1.5; // Adjust based on overlap
    for (let i = 0; i < length; i++) {
      vocalsBuffer[i] /= normalizeFactor;
      accompanimentBuffer[i] /= normalizeFactor;
    }

    // Create output AudioBuffers
    const stems = new Map<StemType, AudioBuffer>();

    // Create stereo output for vocals
    const vocalsAudioBuffer = this.audioContext!.createBuffer(
      numChannels,
      length,
      sampleRate
    );
    for (let ch = 0; ch < numChannels; ch++) {
      vocalsAudioBuffer.copyToChannel(vocalsBuffer, ch);
    }
    stems.set('vocals', vocalsAudioBuffer);

    // Create stereo output for accompaniment
    const accAudioBuffer = this.audioContext!.createBuffer(
      numChannels,
      length,
      sampleRate
    );
    for (let ch = 0; ch < numChannels; ch++) {
      accAudioBuffer.copyToChannel(accompanimentBuffer, ch);
    }
    stems.set('accompaniment', accAudioBuffer);

    const processingTime = performance.now() - startTime;

    this.config.onProgress?.({
      stage: 'complete',
      progress: 100,
      message: 'Stem separation complete!',
    });

    return {
      stems,
      originalDuration: length / sampleRate,
      processingTime,
    };
  }

  /**
   * Run ONNX inference on a chunk
   */
  private async runInference(chunk: Float32Array): Promise<{
    vocals: Float32Array;
    accompaniment: Float32Array;
  }> {
    if (!this.session) {
      throw new Error('Session not initialized');
    }

    // Compute STFT (Short-Time Fourier Transform)
    const stft = this.computeSTFT(chunk);

    // Create ONNX tensor
    const inputName = this.session.inputNames[0];
    const inputTensor = new ort.Tensor('float32', stft.data, stft.shape);

    // Run inference
    const outputs = await this.session.run({ [inputName]: inputTensor });

    // Get output tensors
    const outputNames = this.session.outputNames;
    const vocalsSTFT = outputs[outputNames[0]].data as Float32Array;
    const accompanimentSTFT = outputs[outputNames[1]].data as Float32Array;

    // Inverse STFT
    const vocals = this.inverseSTFT(vocalsSTFT, chunk.length);
    const accompaniment = this.inverseSTFT(accompanimentSTFT, chunk.length);

    return { vocals, accompaniment };
  }

  /**
   * Compute Short-Time Fourier Transform
   */
  private computeSTFT(audio: Float32Array): { data: Float32Array; shape: number[] } {
    const fftSize = 4096;
    const hopLength = 1024;
    const numFrames = Math.floor((audio.length - fftSize) / hopLength) + 1;
    const numFreqBins = fftSize / 2 + 1;

    // Output shape: [1, 2, numFrames, numFreqBins] (real and imaginary parts)
    const stft = new Float32Array(2 * numFrames * numFreqBins);
    const window = this.createWindow(fftSize);

    for (let frame = 0; frame < numFrames; frame++) {
      const start = frame * hopLength;

      // Apply window and compute FFT
      for (let k = 0; k < numFreqBins; k++) {
        let real = 0;
        let imag = 0;

        for (let n = 0; n < fftSize; n++) {
          const sample = (audio[start + n] || 0) * window[n];
          const angle = (2 * Math.PI * k * n) / fftSize;
          real += sample * Math.cos(angle);
          imag -= sample * Math.sin(angle);
        }

        const idx = frame * numFreqBins + k;
        stft[idx] = real / fftSize;
        stft[numFrames * numFreqBins + idx] = imag / fftSize;
      }
    }

    return {
      data: stft,
      shape: [1, 2, numFrames, numFreqBins],
    };
  }

  /**
   * Inverse Short-Time Fourier Transform
   */
  private inverseSTFT(stft: Float32Array, outputLength: number): Float32Array {
    const fftSize = 4096;
    const hopLength = 1024;
    const numFreqBins = fftSize / 2 + 1;
    const numFrames = stft.length / (2 * numFreqBins);

    const output = new Float32Array(outputLength);
    const window = this.createWindow(fftSize);
    const windowSum = new Float32Array(outputLength);

    for (let frame = 0; frame < numFrames; frame++) {
      const start = frame * hopLength;

      // Inverse FFT
      for (let n = 0; n < fftSize && start + n < outputLength; n++) {
        let sample = 0;

        for (let k = 0; k < numFreqBins; k++) {
          const idx = frame * numFreqBins + k;
          const real = stft[idx] || 0;
          const imag = stft[numFrames * numFreqBins + idx] || 0;

          const angle = (2 * Math.PI * k * n) / fftSize;
          sample += real * Math.cos(angle) - imag * Math.sin(angle);
        }

        output[start + n] += sample * window[n] * fftSize;
        windowSum[start + n] += window[n] * window[n];
      }
    }

    // Normalize by window sum
    for (let i = 0; i < outputLength; i++) {
      if (windowSum[i] > 1e-8) {
        output[i] /= windowSum[i];
      }
    }

    return output;
  }

  /**
   * Convert AudioBuffer to mono
   */
  private toMono(buffer: AudioBuffer): Float32Array {
    if (buffer.numberOfChannels === 1) {
      return buffer.getChannelData(0);
    }

    const mono = new Float32Array(buffer.length);
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);

    for (let i = 0; i < buffer.length; i++) {
      mono[i] = (left[i] + right[i]) / 2;
    }

    return mono;
  }

  /**
   * Create Hann window
   */
  private createWindow(size: number): Float32Array {
    const window = new Float32Array(size);
    for (let i = 0; i < size; i++) {
      window[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (size - 1)));
    }
    return window;
  }

  /**
   * Check if model is loaded
   */
  isReady(): boolean {
    return this.modelLoaded;
  }

  /**
   * Cleanup resources
   */
  async dispose(): Promise<void> {
    if (this.session) {
      await this.session.release();
      this.session = null;
    }
    if (this.audioContext) {
      await this.audioContext.close();
      this.audioContext = null;
    }
    this.modelLoaded = false;
  }
}

// Singleton instance for app-wide use
let separatorInstance: StemSeparator | null = null;

export function getStemSeparator(config?: Partial<StemSeparatorConfig>): StemSeparator {
  if (!separatorInstance) {
    separatorInstance = new StemSeparator(config);
  }
  return separatorInstance;
}

export function resetStemSeparator(): void {
  if (separatorInstance) {
    separatorInstance.dispose();
    separatorInstance = null;
  }
}

/**
 * Utility: Convert AudioBuffer to WAV Blob
 */
export function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const length = buffer.length;
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = length * blockAlign;
  const headerSize = 44;
  const totalSize = headerSize + dataSize;

  const arrayBuffer = new ArrayBuffer(totalSize);
  const view = new DataView(arrayBuffer);

  // RIFF header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, totalSize - 8, true);
  writeString(view, 8, 'WAVE');

  // fmt chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bytesPerSample * 8, true);

  // data chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  // Write audio data
  const channels: Float32Array[] = [];
  for (let ch = 0; ch < numChannels; ch++) {
    channels.push(buffer.getChannelData(ch));
  }

  let offset = 44;
  for (let i = 0; i < length; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = Math.max(-1, Math.min(1, channels[ch][i]));
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      view.setInt16(offset, intSample, true);
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, str: string): void {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

/**
 * Utility: Load audio file to AudioBuffer
 */
export async function loadAudioFile(file: File): Promise<AudioBuffer> {
  const audioContext = new AudioContext();
  const arrayBuffer = await file.arrayBuffer();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  await audioContext.close();
  return audioBuffer;
}
