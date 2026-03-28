/**
 * Types for Vocal Separator
 * AI-powered vocal/instrumental separation for karaoke
 */

/** Stem types that can be extracted */
export type StemType = 'vocals' | 'instrumental' | 'drums' | 'bass' | 'other';

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

// Pre-defined models
export const AVAILABLE_MODELS: SeparationModel[] = [
  {
    id: 'mdx23c',
    name: 'MDX23C (Recommended)',
    source: 'models/mdx23c.onnx',
    sizeMB: 150,
    supportedStems: ['vocals', 'instrumental', 'drums', 'bass', 'other'],
    supportsGpu: true,
    quality: 'high',
  },
  {
    id: 'vr-depeg',
    name: 'VR DeEcho-DeReverb',
    source: 'models/vr_depeg.onnx',
    sizeMB: 45,
    supportedStems: ['vocals', 'instrumental'],
    supportsGpu: false,
    quality: 'fast',
  },
  {
    id: 'spleeter-2stems',
    name: 'Spleeter 2-Stems (Fast)',
    source: 'models/spleeter_2stems.onnx',
    sizeMB: 85,
    supportedStems: ['vocals', 'instrumental'],
    supportsGpu: true,
    quality: 'balanced',
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
