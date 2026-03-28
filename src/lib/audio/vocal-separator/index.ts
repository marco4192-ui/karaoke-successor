/**
 * Vocal Separator Module
 * AI-powered vocal/instrumental separation for karaoke
 *
 * This module provides functionality to separate vocals from instrumental
 * using ONNX Runtime for client-side inference.
 *
 * Usage:
 * ```typescript
 * import { VocalSeparator, getVocalSeparator } from '@/lib/audio/vocal-separator';
 *
 * const separator = getVocalSeparator();
 * await separator.initialize();
 *
 * const result = await separator.separate('/path/to/song.mp3', {
 *   stems: ['vocals', 'instrumental'],
 * }, (progress) => {
 *   console.log(progress.message);
 * });
 *
 * // Get separated vocals
 * const vocals = result.stems.get('vocals');
 * ```
 */

// Main class
export { VocalSeparator, getVocalSeparator } from './vocal-separator';

// Types
export type {
  SeparationOptions,
  SeparationResult,
  SeparationProgress,
  SeparationStage,
  StemType,
  VocalSeparatorConfig,
  SeparatorStatus,
  CachedSeparation,
  SeparationModel,
} from './types';

// Constants
export {
  AVAILABLE_MODELS,
  DEFAULT_SEPARATOR_CONFIG,
  DEFAULT_SEPARATION_OPTIONS,
} from './types';

// Utilities
export {
  audioBufferToWav,
  blobToAudioBuffer,
  loadAudioFile,
  normalizeAudioBuffer,
  getStemDisplayName,
  getStemIcon,
} from './audio-utils';
