'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { PitchDetector, getPitchDetector, resetPitchDetector } from '@/lib/audio/pitch-detector';
import { PitchDetectionResult, Difficulty } from '@/types/game';

export function usePitchDetector() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pitchResult, setPitchResult] = useState<PitchDetectionResult | null>(null);
  const detectorRef = useRef<PitchDetector | null>(null);

  const initialize = useCallback(async () => {
    if (isInitialized) return true;

    try {
      const detector = getPitchDetector();
      const success = await detector.initialize();

      if (success) {
        detectorRef.current = detector;
        setIsInitialized(true);
        return true;
      } else {
        setError('Failed to initialize microphone');
        return false;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    }
  }, [isInitialized]);

  const start = useCallback(() => {
    if (!detectorRef.current) {
      console.error('Pitch detector not initialized');
      return;
    }

    detectorRef.current.start((result) => {
      setPitchResult(result);
    });
    setIsListening(true);
  }, []);

  const stop = useCallback(() => {
    if (!detectorRef.current) return;

    detectorRef.current.stop();
    setIsListening(false);
    setPitchResult(null);
  }, []);

  // Update pitch detector configuration based on difficulty
  const setDifficulty = useCallback((difficulty: Difficulty) => {
    if (!detectorRef.current) return;
    detectorRef.current.setDifficulty(difficulty);
  }, []);

  // Cleanup on unmount: destroy the detector AND reset the singleton
  // so that a fresh PitchDetector is created on next mount (avoids
  // re-using a destroyed instance whose AudioContext is closed).
  useEffect(() => {
    return () => {
      detectorRef.current?.destroy();
      resetPitchDetector();
    };
  }, []);

  return {
    isInitialized,
    isListening,
    error,
    pitchResult,
    initialize,
    start,
    stop,
    setDifficulty,
  };
}
