'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { PitchDetector, getPitchDetector, resetPitchDetector, setPitchDetectorInstance } from '@/lib/audio/pitch-detector';
import { resolveMicDeviceId } from '@/lib/audio/mic-device-resolver';
import { PitchDetectionResult, Difficulty } from '@/types/game';

export function usePitchDetector() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pitchResult, setPitchResult] = useState<PitchDetectionResult | null>(null);
  const detectorRef = useRef<PitchDetector | null>(null);
  const initializingRef = useRef(false);
  // The REAL browser deviceId the active detector was opened with (after
  // internal-id resolution). Used by switchMicrophone to skip the expensive
  // destroy/re-init round-trip when the requested mic is ALREADY open —
  // PTM player changes on a shared mic then cost zero getUserMedia calls.
  const activeDeviceIdRef = useRef<string | undefined>(undefined);

  const initialize = useCallback(async (deviceId?: string, stereoChannel?: number) => {
    if (initializingRef.current) return false;
    initializingRef.current = true;

    try {
      const detector = getPitchDetector();
      const resolvedId = resolveMicDeviceId(deviceId);
      const success = await detector.initialize(resolvedId, stereoChannel);
      if (success) activeDeviceIdRef.current = resolvedId;

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
   *
   * Fast path: when the resolved target device is ALREADY the active one
   * (e.g. PTM player changes where everyone shares one mic), the destroy /
   * getUserMedia / AudioContext cycle is skipped entirely — that cycle is
   * what caused the 1-2 short stutters at every player handoff.
   *
   * R44 (overlap-free handoff): when the device actually CHANGES (per-player
   * mics in PTM), the NEW detector is opened FIRST while the old one keeps
   * running; only after the new stream is live is the old detector destroyed.
   * The previous order (stop old → destroy → getUserMedia → new AudioContext)
   * left an audio-device gap on Windows/WebView2 that briefly stalled the
   * whole audio pipeline — the visible jerk at every player switch, plus a
   * second one when the new context spun up. React state (pitchResult /
   * isListening) is no longer nulled mid-switch either — the display stays
   * stable and the new frames simply take over.
   */
  const switchMicrophone = useCallback(async (deviceId?: string, stereoChannel?: number) => {
    try {
      const resolvedId = resolveMicDeviceId(deviceId);
      // NOTE: no React state in this condition — switchMicrophone has a
      // stable identity (empty deps), so state values would be stale
      // closures. detectorRef.current is only set after a successful
      // initialize(), which is exactly the "already initialized" signal.
      if (
        detectorRef.current &&
        activeDeviceIdRef.current === resolvedId
      ) {
        // Same device already open — nothing to switch. When the detection
        // loop was stopped (e.g. between PTM rounds), (re)start it — start()
        // is safe here because a listening detector is left untouched.
        // eslint-disable-next-line no-console
        console.log(`[PitchDetector] switchMicrophone: device already active (${resolvedId ?? 'default'}) — skipping re-init`);
        if (!detectorRef.current.isDetectorListening()) {
          detectorRef.current.start((result) => {
            setPitchResult(result);
          });
          setIsListening(true);
        }
        return true;
      }

      // ── Overlap-free device change ──
      // Open the NEW detector first; keep the old stream alive until the new
      // one is ready (never a closed-device gap).
      const fresh = new PitchDetector();
      const success = await fresh.initialize(resolvedId, stereoChannel);
      if (success) {
        const old = detectorRef.current;
        detectorRef.current = fresh;
        activeDeviceIdRef.current = resolvedId;

        // Make the fresh instance the module singleton BEFORE retiring the
        // old one — concurrent getPitchDetector() callers must never receive
        // the destroyed instance.
        setPitchDetectorInstance(fresh);

        // Start the fresh detection loop, THEN close the old device.
        fresh.start((result) => {
          setPitchResult(result);
        });
        old?.destroy();

        setIsInitialized(true);
        setIsListening(true);
        // eslint-disable-next-line no-console
        console.log(`[PitchDetector] switchMicrophone succeeded (overlap-free) with deviceId=${deviceId ?? 'default'}`);
        return true;
      }

      // New device failed to open → the OLD detector keeps running (a failed
      // handoff target must not leave the game microphone-less).
      fresh.destroy();
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
