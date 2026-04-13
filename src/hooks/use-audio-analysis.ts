'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';

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

export const CONFIDENCE_COLORS: Record<ConfidenceLevel, { bg: string; border: string; text: string; label: string }> = {
  High: { bg: 'bg-green-500/20', border: 'border-green-500/40', text: 'text-green-400', label: 'Grün — Zuverlässig' },
  Medium: { bg: 'bg-yellow-500/20', border: 'border-yellow-500/40', text: 'text-yellow-400', label: 'Gelb — Wahrscheinlich korrekt' },
  Low: { bg: 'bg-orange-500/20', border: 'border-orange-500/40', text: 'text-orange-400', label: 'Orange — Unsicher' },
  VeryLow: { bg: 'bg-red-500/20', border: 'border-red-500/40', text: 'text-red-400', label: 'Rot — Manuelle Prüfung empfohlen' },
};

// ============================================================================
// Hook
// ============================================================================

export type AnalysisStatus = 'idle' | 'loading' | 'analyzing' | 'complete' | 'error';

interface UseAudioAnalysisReturn {
  status: AnalysisStatus;
  progress: AnalysisProgress | null;
  result: PitchAnalysisResult | null;
  bpmResult: BpmDetectionResult | null;
  error: string | null;
  crepeAvailable: boolean;
  analyzePitch: (filePath: string, options?: AnalysisOptions) => void;
  detectBpm: (filePath: string) => void;
  reset: () => void;
}

export function useAudioAnalysis(): UseAudioAnalysisReturn {
  const [status, setStatus] = useState<AnalysisStatus>('idle');
  const [progress, setProgress] = useState<AnalysisProgress | null>(null);
  const [result, setResult] = useState<PitchAnalysisResult | null>(null);
  const [bpmResult, setBpmResult] = useState<BpmDetectionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [crepeAvailable, setCrepeAvailable] = useState(false);

  const cleanupRef = useRef<UnlistenFn[]>([]);

  // Check CREPE availability on mount
  useEffect(() => {
    invoke<{ available: boolean; info: string }>('audio_crepe_info')
      .then((info) => setCrepeAvailable(info.available))
      .catch(() => setCrepeAvailable(false));

    return () => {
      cleanupRef.current.forEach(fn => fn());
    };
  }, []);

  // Register Tauri event listeners
  useEffect(() => {
    const unlisteners: UnlistenFn[] = [];

    const setup = async () => {
      try {
      // Analysis progress
      const unlistenProgress = await listen<AnalysisProgress>('analysis:progress', (event) => {
        setProgress(event.payload);
        if (event.payload.stage !== 'loading') {
          setStatus('analyzing');
        }
      });
      unlisteners.push(unlistenProgress);

      // Analysis complete
      const unlistenComplete = await listen<PitchAnalysisResult>('analysis:complete', (event) => {
        setResult(event.payload);
        setStatus('complete');
        setProgress(null);
      });
      unlisteners.push(unlistenComplete);

      // Analysis error
      const unlistenError = await listen<string>('analysis:error', (event) => {
        setError(event.payload);
        setStatus('error');
        setProgress(null);
      });
      unlisteners.push(unlistenError);

      // BPM complete
      const unlistenBpm = await listen<BpmDetectionResult>('bpm:complete', (event) => {
        setBpmResult(event.payload);
        setStatus('complete');
      });
      unlisteners.push(unlistenBpm);

      // BPM error
      const unlistenBpmError = await listen<string>('bpm:error', (event) => {
        setError(event.payload);
        setStatus('error');
      });
      unlisteners.push(unlistenBpmError);
      } catch (err) {
        console.warn('[AudioAnalysis] Event listeners not available (non-fatal, analysis may not work):', err);
      }
    };

    setup();
    cleanupRef.current = unlisteners;

    return () => {
      unlisteners.forEach(fn => fn());
    };
  }, []);

  const analyzePitch = useCallback((filePath: string, options?: AnalysisOptions) => {
    setStatus('loading');
    setError(null);
    setResult(null);
    setProgress(null);

    invoke('audio_analyze_pitch', { filePath, options })
      .catch((e) => {
        setError(e instanceof Error ? e.message : String(e));
        setStatus('error');
      });
  }, []);

  const detectBpm = useCallback((filePath: string) => {
    setStatus('loading');
    setError(null);
    setBpmResult(null);

    invoke('audio_detect_bpm', { filePath })
      .catch((e) => {
        setError(e instanceof Error ? e.message : String(e));
        setStatus('error');
      });
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
