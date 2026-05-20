'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { invoke, Channel } from '@tauri-apps/api/core';

// ============================================================================
// Types matching the Rust backend
// ============================================================================

export type ConfidenceLevel = 'High' | 'Medium' | 'Low' | 'VeryLow';

export interface AnalysisFrame {
  time_ms: number;
  frequency: number | null;
  midi_note: number | null;
  voicing_confidence: number;
  pitch_confidence: number;
  overall_confidence: number;
}

export interface DetectedNote {
  start_time_ms: number;
  duration_ms: number;
  midi_note: number;
  frequency: number;
  confidence: number;
  confidence_level: ConfidenceLevel;
}

export interface PitchAnalysisResult {
  frames: AnalysisFrame[];
  notes: DetectedNote[];
  bpm: number;
  algorithm: string;
  analysis_duration_ms: number;
  sample_rate: number;
  audio_duration_ms: number;
}

export interface AnalysisProgress {
  stage: string;
  progress: number;
  message: string;
}

export interface BpmDetectionResult {
  bpm: number;
  file_path: string;
  duration_ms: number;
}

export interface AnalysisOptions {
  algorithm?: string;
  min_frequency?: number;
  max_frequency?: number;
  voicing_threshold?: number;
  yin_threshold?: number;
  enable_octave_correction?: boolean;
  hop_size_override?: number;
}

// ============================================================================
// Confidence colour mapping
// ============================================================================

export const CONFIDENCE_COLORS: Record<ConfidenceLevel, { bg: string; border: string; text: string; label: string; labelKey: string }> = {
  High: { bg: 'bg-green-500/20', border: 'border-green-500/40', text: 'text-green-400', label: 'Green — Reliable', labelKey: 'audioAnalysis.confidenceHigh' },
  Medium: { bg: 'bg-yellow-500/20', border: 'border-yellow-500/40', text: 'text-yellow-400', label: 'Yellow — Probably correct', labelKey: 'audioAnalysis.confidenceMedium' },
  Low: { bg: 'bg-orange-500/20', border: 'border-orange-500/40', text: 'text-orange-400', label: 'Orange — Uncertain', labelKey: 'audioAnalysis.confidenceLow' },
  VeryLow: { bg: 'bg-red-500/20', border: 'border-red-500/40', text: 'text-red-400', label: 'Red — Manual check recommended', labelKey: 'audioAnalysis.confidenceVeryLow' },
};

// ============================================================================
// Hook
// ============================================================================

type AnalysisStatus = 'idle' | 'loading' | 'analyzing' | 'complete' | 'error';

interface UseAudioAnalysisReturn {
  status: AnalysisStatus;
  progress: AnalysisProgress | null;
  result: PitchAnalysisResult | null;
  bpmResult: BpmDetectionResult | null;
  error: string | null;
  crepeAvailable: boolean;
  analyzePitch: (_filePath: string, options?: AnalysisOptions) => void;
  detectBpm: (_filePath: string) => void;
  reset: () => void;
}

export function useAudioAnalysis(): UseAudioAnalysisReturn {
  const [status, setStatus] = useState<AnalysisStatus>('idle');
  const [progress, setProgress] = useState<AnalysisProgress | null>(null);
  const [result, setResult] = useState<PitchAnalysisResult | null>(null);
  const [bpmResult, setBpmResult] = useState<BpmDetectionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [crepeAvailable, setCrepeAvailable] = useState(false);

  const channelsRef = useRef<{
    progress: Channel<AnalysisProgress> | null;
    complete: Channel<PitchAnalysisResult> | null;
    bpmComplete: Channel<BpmDetectionResult> | null;
    errorCh: Channel<string> | null;
  }>({ progress: null, complete: null, bpmComplete: null, errorCh: null });

  // Mounted guard + analysis generation counter to prevent stale callbacks
  // from overwriting state after unmount or after a newer analysis starts.
  const mountedRef = useRef(true);
  const analysisGenRef = useRef(0);

  // Check CREPE availability on mount
  useEffect(() => {
    invoke<{ available: boolean; info: string }>('audio_crepe_info')
      .then((info) => setCrepeAvailable(info.available))
      .catch(() => setCrepeAvailable(false));
  }, []);

  // Cleanup on unmount: mark as unmounted so Tauri channel callbacks
  // don't call setState on an unmounted component.
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      channelsRef.current.progress = null;
      channelsRef.current.complete = null;
      channelsRef.current.bpmComplete = null;
      channelsRef.current.errorCh = null;
    };
  }, []);

  const analyzePitch = useCallback((filePath: string, options?: AnalysisOptions) => {
    const gen = ++analysisGenRef.current;
    setStatus('loading');
    setError(null);
    setResult(null);
    setBpmResult(null); // Clear stale BPM result
    setProgress(null);

    try {
      const onProgress = new Channel<AnalysisProgress>();
      onProgress.onmessage = (payload) => {
        if (analysisGenRef.current !== gen || !mountedRef.current) return;
        setProgress(payload);
        if (payload.stage !== 'Loading') {
          setStatus('analyzing');
        }
      };

      const onComplete = new Channel<PitchAnalysisResult>();
      onComplete.onmessage = (payload) => {
        if (analysisGenRef.current !== gen || !mountedRef.current) return;
        setResult(payload);
        setStatus('complete');
        setProgress(null);
      };

      const onError = new Channel<string>();
      onError.onmessage = (payload) => {
        if (analysisGenRef.current !== gen || !mountedRef.current) return;
        setError(payload);
        setStatus('error');
        setProgress(null);
      };

      channelsRef.current.progress = onProgress;
      channelsRef.current.complete = onComplete;
      channelsRef.current.errorCh = onError;

      invoke('audio_analyze_pitch', {
        filePath,
        options: options || {},
        onProgress,
        onComplete,
        onError,
      }).catch((e) => {
        if (analysisGenRef.current !== gen || !mountedRef.current) return;
        setError(e instanceof Error ? e.message : String(e));
        setStatus('error');
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus('error');
    }
  }, []);

  const detectBpm = useCallback((filePath: string) => {
    const gen = ++analysisGenRef.current;
    setStatus('loading');
    setError(null);
    setBpmResult(null);
    setResult(null); // Clear stale pitch analysis result

    try {
      const onComplete = new Channel<BpmDetectionResult>();
      onComplete.onmessage = (payload) => {
        if (analysisGenRef.current !== gen || !mountedRef.current) return;
        setBpmResult(payload);
        setStatus('complete');
      };

      const onError = new Channel<string>();
      onError.onmessage = (payload) => {
        if (analysisGenRef.current !== gen || !mountedRef.current) return;
        setError(payload);
        setStatus('error');
      };

      channelsRef.current.bpmComplete = onComplete;
      channelsRef.current.errorCh = onError;

      invoke('audio_detect_bpm', {
        filePath,
        onComplete,
        onError,
      }).catch((e) => {
        if (analysisGenRef.current !== gen || !mountedRef.current) return;
        setError(e instanceof Error ? e.message : String(e));
        setStatus('error');
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus('error');
    }
  }, []);

  const reset = useCallback(() => {
    setStatus('idle');
    setProgress(null);
    setResult(null);
    setBpmResult(null);
    setError(null);
  }, []);

  return {
    status,
    progress,
    result,
    bpmResult,
    error,
    crepeAvailable,
    analyzePitch,
    detectBpm,
    reset,
  };
}
