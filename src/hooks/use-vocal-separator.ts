/**
 * React Hook for Vocal Separation
 * Provides easy integration of vocal separation in React components
 */

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  VocalSeparator,
  getVocalSeparator,
  SeparationOptions,
  SeparationResult,
  SeparationProgress,
  SeparatorStatus,
  StemType,
  AVAILABLE_MODELS,
  DEFAULT_SEPARATION_OPTIONS,
  audioBufferToWav,
} from '@/lib/audio/vocal-separator';
import { logger } from '@/lib/logger';

export interface UseVocalSeparatorOptions {
  /** Auto-initialize on mount */
  autoInit?: boolean;
  /** Model ID to use */
  modelId?: string;
  /** Callback for progress updates */
  onProgress?: (progress: SeparationProgress) => void;
  /** Callback when separation completes */
  onComplete?: (result: SeparationResult) => void;
  /** Callback on error */
  onError?: (error: Error) => void;
}

export interface SeparatedStem {
  /** Stem type */
  type: StemType;
  /** Audio buffer */
  buffer: AudioBuffer;
  /** WAV blob for download/playback */
  blob: Blob;
  /** Object URL for audio element */
  url: string;
}

export interface UseVocalSeparatorReturn {
  /** Current status */
  status: SeparatorStatus;
  /** Whether separator is ready */
  isReady: boolean;
  /** Whether currently processing */
  isProcessing: boolean;
  /** Current progress */
  progress: SeparationProgress | null;
  /** Last separation result */
  result: SeparationResult | null;
  /** Separated stems with URLs */
  stems: SeparatedStem[];
  /** Error if any */
  error: string | null;
  /** Initialize the separator */
  initialize: () => Promise<boolean>;
  /** Separate audio file */
  separate: (source: string | File, options?: Partial<SeparationOptions>) => Promise<SeparationResult | null>;
  /** Switch to a different model */
  switchModel: (modelId: string) => Promise<boolean>;
  /** Get stem URL for playback */
  getStemUrl: (stem: StemType) => string | null;
  /** Clear current result */
  clearResult: () => void;
  /** Revoke URLs and cleanup */
  cleanup: () => void;
}

/**
 * Hook for vocal separation in React components
 */
export function useVocalSeparator(
  options: UseVocalSeparatorOptions = {}
): UseVocalSeparatorReturn {
  const {
    autoInit = false,
    modelId,
    onProgress,
    onComplete,
    onError,
  } = options;

  const separatorRef = useRef<VocalSeparator | null>(null);

  const [status, setStatus] = useState<SeparatorStatus>({
    isReady: false,
    loadedModel: null,
    gpuAvailable: false,
    memoryUsageMB: 0,
    cachedCount: 0,
    currentProgress: null,
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<SeparationProgress | null>(null);
  const [result, setResult] = useState<SeparationResult | null>(null);
  const [stems, setStems] = useState<SeparatedStem[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Object URLs for cleanup
  const urlsRef = useRef<string[]>([]);

  /**
   * Initialize the separator
   */
  const initialize = useCallback(async (): Promise<boolean> => {
    if (separatorRef.current && status.isReady) {
      return true;
    }

    try {
      const model = modelId
        ? AVAILABLE_MODELS.find(m => m.id === modelId) ?? AVAILABLE_MODELS[0]
        : AVAILABLE_MODELS[0];

      separatorRef.current = getVocalSeparator({ model });

      const success = await separatorRef.current.initialize((p) => {
        setProgress(p);
        onProgress?.(p);
      });

      if (success) {
        setStatus(separatorRef.current.getStatus());
      }

      return success;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Initialization failed';
      setError(errorMsg);
      onError?.(new Error(errorMsg));
      return false;
    }
  }, [modelId, status.isReady, onProgress, onError]);

  /**
   * Separate audio file
   */
  const separate = useCallback(async (
    source: string | File,
    opts: Partial<SeparationOptions> = {}
  ): Promise<SeparationResult | null> => {
    if (!separatorRef.current || !status.isReady) {
      const initialized = await initialize();
      if (!initialized) {
        return null;
      }
    }

    setIsProcessing(true);
    setError(null);
    setResult(null);

    // Cleanup old URLs
    cleanupUrls();

    try {
      const separationResult = await separatorRef.current!.separate(
        source,
        opts,
        (p) => {
          setProgress(p);
          onProgress?.(p);
        }
      );

      setResult(separationResult);

      // Create stem URLs
      const newStems: SeparatedStem[] = [];
      for (const [stemType, buffer] of separationResult.stems) {
        const blob = audioBufferToWav(buffer);
        const url = URL.createObjectURL(blob);
        urlsRef.current.push(url);

        newStems.push({
          type: stemType,
          buffer,
          blob,
          url,
        });
      }

      setStems(newStems);
      onComplete?.(separationResult);

      return separationResult;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Separation failed';
      setError(errorMsg);
      onError?.(new Error(errorMsg));
      return null;
    } finally {
      setIsProcessing(false);
      setProgress(null);
    }
  }, [status.isReady, initialize, onProgress, onComplete, onError]);

  /**
   * Get URL for a specific stem
   */
  const getStemUrl = useCallback((stem: StemType): string | null => {
    const found = stems.find(s => s.type === stem);
    return found?.url ?? null;
  }, [stems]);

  /**
   * Switch to a different model
   */
  const switchModel = useCallback(async (modelId: string): Promise<boolean> => {
    if (!separatorRef.current) {
      return false;
    }

    try {
      const success = await separatorRef.current.switchModel(modelId, (p) => {
        setProgress(p);
        onProgress?.(p);
      });

      if (success) {
        setStatus(separatorRef.current.getStatus());
      }

      return success;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to switch model';
      setError(errorMsg);
      onError?.(new Error(errorMsg));
      return false;
    }
  }, [onProgress, onError]);

  /**
   * Clear current result
   */
  const clearResult = useCallback(() => {
    cleanupUrls();
    setResult(null);
    setStems([]);
    setError(null);
    setProgress(null);
  }, []);

  /**
   * Cleanup URLs
   */
  const cleanupUrls = useCallback(() => {
    for (const url of urlsRef.current) {
      URL.revokeObjectURL(url);
    }
    urlsRef.current = [];
  }, []);

  /**
   * Full cleanup
   */
  const cleanup = useCallback(() => {
    cleanupUrls();
    setStems([]);
    setResult(null);
  }, [cleanupUrls]);

  // Auto-initialize on mount if requested
  useEffect(() => {
    if (autoInit && !status.isReady) {
      initialize();
    }
  }, [autoInit, status.isReady, initialize]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupUrls();
    };
  }, [cleanupUrls]);

  // Update status periodically
  useEffect(() => {
    if (!separatorRef.current) return;

    const interval = setInterval(() => {
      if (separatorRef.current) {
        setStatus(separatorRef.current.getStatus());
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [status.isReady]);

  return {
    status,
    isReady: status.isReady,
    isProcessing,
    progress,
    result,
    stems,
    error,
    initialize,
    separate,
    switchModel,
    getStemUrl,
    clearResult,
    cleanup,
  };
}

export default useVocalSeparator;
