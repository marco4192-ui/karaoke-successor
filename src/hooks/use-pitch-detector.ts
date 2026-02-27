'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { PitchDetector, getPitchDetector } from '@/lib/audio/pitch-detector';
import { PitchDetectionResult } from '@/types/game';

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

  useEffect(() => {
    return () => {
      if (detectorRef.current) {
        detectorRef.current.destroy();
      }
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
  };
}
