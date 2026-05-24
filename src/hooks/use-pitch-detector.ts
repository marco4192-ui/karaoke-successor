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
  const initializingRef = useRef(false);

  const initialize = useCallback(async (deviceId?: string) => {
    if (initializingRef.current) return false;
    initializingRef.current = true;

    try {
      const detector = getPitchDetector();
      const success = await detector.initialize(deviceId);

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
    } finally {
      initializingRef.current = false;
    }
  }, []);

  /**
   * Re-initialize the pitch detector with a different microphone device.
   * Destroys the current instance and creates a new one with the given deviceId.
   */
  const switchMicrophone = useCallback(async (deviceId?: string) => {
    try {
      // Stop current detector
      detectorRef.current?.stop();
      // Destroy and reset singleton so a fresh instance is created.
      // MUST await resetPitchDetector() — it is async and sets the module-level
      // singleton to null. Without awaiting, getPitchDetector() on the next line
      // returns the still-non-null (destroying) instance.
      await resetPitchDetector();
      detectorRef.current = null;
      setIsInitialized(false);
      setIsListening(false);
      setPitchResult(null);

      // Re-initialize with new (or no) deviceId
      const detector = getPitchDetector();
      const success = await detector.initialize(deviceId);
      if (success) {
        detectorRef.current = detector;
        setIsInitialized(true);
        // Auto-start if we were listening before
        detector.start((result) => {
          setPitchResult(result);
        });
        setIsListening(true);
        // eslint-disable-next-line no-console
        console.log(`[PitchDetector] switchMicrophone succeeded with deviceId=${deviceId ?? 'default'}`);
        return true;
      }
      // eslint-disable-next-line no-console
      console.error(`[PitchDetector] switchMicrophone FAILED: initialize() returned false for deviceId=${deviceId ?? 'default'}`);
      return false;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      // eslint-disable-next-line no-console
      console.error(`[PitchDetector] switchMicrophone threw error for deviceId=${deviceId ?? 'default'}:`, msg);
      setError(msg);
      return false;
    }
  }, []);

  const start = useCallback(() => {
    if (!detectorRef.current) {
      // eslint-disable-next-line no-console
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
    switchMicrophone,
    start,
    stop,
    setDifficulty,
  };
}
