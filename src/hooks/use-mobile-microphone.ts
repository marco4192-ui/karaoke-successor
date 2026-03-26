'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { PitchDetector, KARAOKE_DEFAULT_CONFIG } from '@/lib/audio/pitch-detector';
import { apiClient } from '@/lib/api-client';
import { logger } from '@/lib/logger';

export interface MobilePitchData {
  frequency: number | null;
  note: number | null;
  volume: number;
}

export interface UseMobileMicrophoneOptions {
  clientId: string | null;
  isPlaying: boolean;
  songEnded: boolean;
  onPitchDetected?: (data: MobilePitchData) => void;
}

export interface UseMobileMicrophoneReturn {
  isListening: boolean;
  currentPitch: MobilePitchData;
  startMicrophone: () => Promise<void>;
  stopMicrophone: () => void;
  error: string | null;
}

/**
 * Hook for mobile microphone with pitch detection
 * Uses the existing PitchDetector class with YIN algorithm
 */
export function useMobileMicrophone({
  clientId,
  isPlaying,
  songEnded,
  onPitchDetected,
}: UseMobileMicrophoneOptions): UseMobileMicrophoneReturn {
  const [isListening, setIsListening] = useState(false);
  const [currentPitch, setCurrentPitch] = useState<MobilePitchData>({
    frequency: null,
    note: null,
    volume: 0,
  });
  const [error, setError] = useState<string | null>(null);

  const pitchDetectorRef = useRef<PitchDetector | null>(null);

  // Start microphone and pitch detection
  const startMicrophone = useCallback(async () => {
    if (!clientId) return;

    try {
      // Create new pitch detector with mobile-optimized settings
      const detector = new PitchDetector({
        ...KARAOKE_DEFAULT_CONFIG,
        volumeThreshold: 0.01, // More sensitive for mobile
        pitchStabilityFrames: 2, // Faster response for mobile
      });

      const initialized = await detector.initialize();
      if (!initialized) {
        setError('Failed to initialize microphone');
        return;
      }

      pitchDetectorRef.current = detector;
      setIsListening(true);
      setError(null);

      detector.start((result) => {
        const pitchData: MobilePitchData = {
          frequency: result.frequency,
          note: result.note,
          volume: result.volume,
        };

        setCurrentPitch(pitchData);
        onPitchDetected?.(pitchData);

        // Send pitch to server if song is playing and not ended
        if (clientId && isPlaying && !songEnded && (result.volume > 0.01 || result.frequency !== null)) {
          apiClient.mobilePitch(clientId, {
            frequency: result.frequency,
            note: result.note,
            clarity: result.clarity,
            volume: result.volume,
            timestamp: Date.now(),
          }).catch(() => {
            // Ignore pitch send errors
          });
        }
      });
    } catch (err) {
      logger.error('[useMobileMicrophone]', 'Microphone access denied:', err);
      setError('Microphone access denied');
    }
  }, [clientId, isPlaying, songEnded, onPitchDetected]);

  // Stop microphone
  const stopMicrophone = useCallback(async () => {
    if (pitchDetectorRef.current) {
      pitchDetectorRef.current.stop();
      await pitchDetectorRef.current.destroy();
      pitchDetectorRef.current = null;
    }
    setIsListening(false);
    setCurrentPitch({ frequency: null, note: null, volume: 0 });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pitchDetectorRef.current) {
        pitchDetectorRef.current.stop();
        pitchDetectorRef.current.destroy();
      }
    };
  }, []);

  // Stop microphone when song ends
  useEffect(() => {
    if ((!isPlaying || songEnded) && isListening) {
      stopMicrophone();
    }
  }, [isPlaying, songEnded, isListening, stopMicrophone]);

  return {
    isListening,
    currentPitch,
    startMicrophone,
    stopMicrophone,
    error,
  };
}

export default useMobileMicrophone;
