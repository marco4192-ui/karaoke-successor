/**
 * Types for Vocal Separator
 * AI-powered vocal/instrumental separation for karaoke
 */

/** Stem types that can be extracted */
export type StemType = 'vocals' | 'instrumental' | 'drums' | 'bass' | 'other' | 'accompaniment';

export interface SeparationOptions {
  /** Output format for separated audio */
  outputFormat: 'wav' | 'mp3' | 'flac';
  /** Quality preset */
  quality: 'fast' | 'balanced' | 'high';
  /** Specific stems to extract */
  stems: StemType[];
  /** Whether to normalize output audio */
  normalize: boolean;
}

export interface SeparationResult {
  /** Original file path or ID */
  sourceId: string;
  /** Separated audio data by stem type */
  stems: Map<StemType, AudioBuffer>;
  /** Processing time in milliseconds */
  processingTime: number;
  /** Sample rate of output */
  sampleRate: number;
  /** Duration in seconds */
  duration: number;
}

export interface SeparationProgress {
  /** Current processing stage */
  stage: SeparationStage;
  /** Progress percentage (0-100) */
  progress: number;
  /** Current step description */
  message: string;
  /** Estimated time remaining in seconds */
  estimatedTimeRemaining?: number;
}

export type SeparationStage =
  | 'idle'
  | 'loading_model'
  | 'loading_audio'
  | 'processing'
  | 'encoding'
  | 'complete'
  | 'error';

export interface VocalSeparatorConfig {
  /** Model to use for separation */
  model: SeparationModel;
  /** Device to run inference on */
  device: 'cpu' | 'gpu';
  /** Number of threads for CPU inference */
  numThreads: number;
  /** Cache directory for processed files */
  cacheDir?: string;
  /** Maximum cache size in MB */
  maxCacheSizeMB: number;
}

export interface SeparationModel {
  /** Model identifier */
  id: string;
  /** Display name */
  name: string;
  /** Model source (local path or URL) */
  source: string;
  /** Model size in MB */
  sizeMB: number;
  /** Supported stem types */
  supportedStems: StemType[];
  /** Whether model supports GPU acceleration */
  supportsGpu: boolean;
  /** Quality tier */
  quality: 'fast' | 'balanced' | 'high';
}

export interface CachedSeparation {
  /** Cache entry ID */
  id: string;
  /** Original source file hash */
  sourceHash: string;
  /** When separation was performed */
  timestamp: number;
  /** Model used for separation */
  modelId: string;
  /** Paths to cached stem files */
  stems: Map<StemType, string>;
  /** Total size in MB */
  sizeMB: number;
}

export interface SeparatorStatus {
  /** Whether separator is ready */
  isReady: boolean;
  /** Currently loaded model */
  loadedModel: string | null;
  /** Whether GPU is available */
  gpuAvailable: boolean;
  /** Memory usage in MB */
  memoryUsageMB: number;
  /** Number of cached separations */
  cachedCount: number;
  /** Current progress if processing */
  currentProgress: SeparationProgress | null;
}

// Pre-defined models - IDs must match model-manager.ts
export const AVAILABLE_MODELS: SeparationModel[] = [
  {
    id: 'mdx23c-instvoc',
    name: 'MDX23C InstVoc',
    source: 'https://huggingface.co/onnx-models/mdx23c-instvoc/resolve/main/model.onnx',
    sizeMB: 148,
    supportedStems: ['vocals', 'instrumental'],
    supportsGpu: true,
    quality: 'high',
  },
  {
    id: 'spleeter-2stems-44k',
    name: 'Spleeter 2-Stems',
    source: 'https://huggingface.co/onnx-models/spleeter-2stems-44k/resolve/main/model.onnx',
    sizeMB: 89,
    supportedStems: ['vocals', 'accompaniment'],
    supportsGpu: true,
    quality: 'balanced',
  },
  {
    id: 'demucs-htdemucs',
    name: 'Demucs HTDemucs',
    source: 'https://huggingface.co/onnx-models/htdemucs/resolve/main/model.onnx',
    sizeMB: 285,
    supportedStems: ['vocals', 'drums', 'bass', 'other'],
    supportsGpu: true,
    quality: 'high',
  },
  {
    id: 'vr-deecho',
    name: 'VR DeEcho-DeReverb',
    source: 'https://huggingface.co/onnx-models/vr-deecho/resolve/main/model.onnx',
    sizeMB: 42,
    supportedStems: ['vocals', 'instrumental'],
    supportsGpu: false,
    quality: 'fast',
  },
];

export const DEFAULT_SEPARATOR_CONFIG: VocalSeparatorConfig = {
  model: AVAILABLE_MODELS[0],
  device: 'cpu',
  numThreads: 4,
  maxCacheSizeMB: 500,
};

export const DEFAULT_SEPARATION_OPTIONS: SeparationOptions = {
  outputFormat: 'wav',
  quality: 'balanced',
  stems: ['vocals', 'instrumental'],
  normalize: true,
};
