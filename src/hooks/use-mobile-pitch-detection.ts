'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { PitchData } from '@/components/screens/mobile/mobile-types';
import { VocalDetector } from '@/lib/audio/vocal-detector';

// YIN pitch detection algorithm
function yinPitchDetection(buffer: Float32Array, sampleRate: number): number | null {
  const yinBuffer = new Float32Array(buffer.length / 2);
  const yinThreshold = 0.15;
  const yinBufferLength = buffer.length / 2;

  for (let tau = 0; tau < yinBufferLength; tau++) {
    yinBuffer[tau] = 0;
    for (let i = 0; i < yinBufferLength; i++) {
      const delta = buffer[i] - buffer[i + tau];
      yinBuffer[tau] += delta * delta;
    }
  }

  yinBuffer[0] = 1;
  let runningSum = 0;
  for (let tau = 1; tau < yinBufferLength; tau++) {
    runningSum += yinBuffer[tau];
    yinBuffer[tau] *= tau / runningSum;
  }

  let tauEstimate = -1;
  for (let tau = 2; tau < yinBufferLength; tau++) {
    if (yinBuffer[tau] < yinThreshold) {
      while (tau + 1 < yinBufferLength && yinBuffer[tau + 1] < yinBuffer[tau]) {
        tau++;
      }
      tauEstimate = tau;
      break;
    }
  }

  if (tauEstimate === -1) return null;

  let betterTau: number;
  const x0 = tauEstimate < 1 ? tauEstimate : tauEstimate - 1;
  const x2 = tauEstimate + 1 < yinBufferLength ? tauEstimate + 1 : tauEstimate;

  if (x0 === tauEstimate) {
    betterTau = yinBuffer[tauEstimate] <= yinBuffer[x2] ? tauEstimate : x2;
  } else if (x2 === tauEstimate) {
    betterTau = yinBuffer[tauEstimate] <= yinBuffer[x0] ? tauEstimate : x0;
  } else {
    const s0 = yinBuffer[x0];
    const s1 = yinBuffer[tauEstimate];
    const s2 = yinBuffer[x2];
    betterTau = tauEstimate + (s2 - s0) / (2 * (2 * s1 - s2 - s0));
  }

  return betterTau > 0 ? sampleRate / betterTau : 0;
}

interface UseMobilePitchDetectionOptions {
  clientId: string | null;
  isPlaying: boolean;
  songEnded: boolean;
  onError?: (message: string) => void;
}

export function useMobilePitchDetection({
  clientId,
  isPlaying,
  songEnded,
  onError,
}: UseMobilePitchDetectionOptions) {
  const [isListening, setIsListening] = useState(false);
  const [currentPitch, setCurrentPitch] = useState<PitchData>({ frequency: null, note: null, volume: 0 });
  const [micPermissionDenied, setMicPermissionDenied] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const vocalDetectorRef = useRef<VocalDetector | null>(null);
  // Throttle pitch uploads to max ~20 requests/second (50ms interval)
  const lastPitchSendRef = useRef<number>(0);
  const PITCH_SEND_INTERVAL = 50;

  // Refs for values consumed inside the requestAnimationFrame loop.
  // Without these, detectPitch would capture stale snapshots of
  // isPlaying / songEnded / clientId at the time startMicrophone was called.
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;
  const songEndedRef = useRef(songEnded);
  songEndedRef.current = songEnded;
  const clientIdRef = useRef(clientId);
  clientIdRef.current = clientId;

  const startMicrophone = useCallback(async () => {
    if (!clientIdRef.current) return;
    
    // Reset permission denied state on retry so the user gets another chance
    setMicPermissionDenied(false);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      mediaStreamRef.current = stream;
      
      audioContextRef.current = new AudioContext();

      // CRITICAL: On iOS Safari and some Android browsers, the AudioContext
      // starts in a "suspended" state and the AnalyserNode returns all-zeros.
      // Must resume within the same user-gesture callback (tap on mic button).
      if (audioContextRef.current.state === 'suspended') {
        try {
          await audioContextRef.current.resume();
        } catch (resumeErr) {
          console.warn('[MobilePitch] AudioContext.resume() failed, retrying…', resumeErr);
          await new Promise<void>(resolve => setTimeout(resolve, 100));
          await audioContextRef.current.resume();
        }
      }

      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 4096;
      analyserRef.current.smoothingTimeConstant = 0.8;
      source.connect(analyserRef.current);
      
      // Initialize vocal detector for humming detection
      vocalDetectorRef.current = new VocalDetector();
      
      setIsListening(true);
      
      const buffer = new Float32Array(analyserRef.current.fftSize);
      const freqBuffer = new Float32Array(analyserRef.current.frequencyBinCount);
      
      const detectPitch = () => {
        if (!analyserRef.current || !audioContextRef.current) return;

        // Guard: if AudioContext was suspended (e.g. phone locked/unlocked),
        // try to resume — otherwise getFloatTimeDomainData returns all zeros.
        if (audioContextRef.current.state === 'suspended') {
          audioContextRef.current.resume().catch(() => {});
        }
        
        // STOP loop if song ended or not playing (read from ref to avoid stale closure)
        // Prevents wasting CPU/battery analysing silence after song finishes.
        const currentlyPlaying = isPlayingRef.current;
        const currentlyEnded = songEndedRef.current;
        if (currentlyEnded || !currentlyPlaying) {
          // Stop the animation frame loop — the effect will handle full cleanup
          // when the component unmounts or a new song starts.
          if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
          }
          return;
        }
        
        analyserRef.current.getFloatTimeDomainData(buffer);
        analyserRef.current.getFloatFrequencyData(freqBuffer);
        
        let sum = 0;
        for (let i = 0; i < buffer.length; i++) {
          sum += buffer[i] * buffer[i];
        }
        const rms = Math.sqrt(sum / buffer.length);
        const volume = Math.min(1, rms * 5);
        
        const frequency = yinPitchDetection(buffer, audioContextRef.current.sampleRate);
        
        let note: number | null = null;
        if (frequency !== null && frequency >= 65 && frequency <= 1047) {
          note = 69 + 12 * Math.log2(frequency / 440);
        }
        
        // Run vocal detection to distinguish singing from humming
        const vocalResult = vocalDetectorRef.current?.processFrame(
          note,
          volume,
          freqBuffer,
          audioContextRef.current.sampleRate,
          performance.now()
        );
        const isSinging = vocalResult?.isSinging ?? true;
        const singingConfidence = vocalResult?.singingConfidence ?? 1;
        
        setCurrentPitch({ frequency, note, volume });
        
        // Only send pitch if song is playing and not ended (via refs)
        // Throttled to max ~20 requests/second to avoid server overload
        const now = performance.now();
        const activeClientId = clientIdRef.current;
        if (activeClientId && currentlyPlaying && !currentlyEnded && (volume > 0.01 || frequency !== null)
            && (now - lastPitchSendRef.current) >= PITCH_SEND_INTERVAL) {
          lastPitchSendRef.current = now;
          fetch('/api/mobile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'pitch',
              clientId: activeClientId,
              payload: {
                frequency,
                note,
                clarity: 0,
                volume,
                timestamp: Date.now(),
                isSinging,
                singingConfidence,
              },
            }),
          }).catch(() => {});
        }
        
        animationFrameRef.current = requestAnimationFrame(detectPitch);
      };
      
      detectPitch();
    } catch (err) {
      const isPermissionDenied = err instanceof DOMException && (
        err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError'
      );
      if (isPermissionDenied) {
        setMicPermissionDenied(true);
        // Provide platform-specific instructions
        const ua = navigator.userAgent;
        if (/iPad|iPhone|iPod/.test(ua)) {
          onError?.('Microphone access denied. On iOS: Settings > Safari > Microphone > allow access, then reload the page.');
        } else if (/Android/.test(ua)) {
          onError?.('Microphone access denied. On Android: tap the lock/permissions icon in the address bar > Microphone > Allow, then reload.');
        } else {
          onError?.('Microphone access denied. Please allow microphone access in your browser settings and reload the page.');
        }
      } else {
        const isSecureContext = typeof window !== 'undefined' && window.isSecureContext;
        onError?.(
          `Could not access microphone (${isSecureContext ? 'permission or hardware issue' : 'insecure HTTP context'}). ` +
          `Make sure a microphone is connected and this page is served over HTTPS.`
        );
      }
    }
  }, [onError]);

  const stopMicrophone = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    setIsListening(false);
    setCurrentPitch({ frequency: null, note: null, volume: 0 });
  }, []);

  // Clean up microphone resources on unmount to prevent leaking
  // the media stream, audio context, and animation frame loop.
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
    };
  }, []);

  return {
    isListening,
    currentPitch,
    micPermissionDenied,
    startMicrophone,
    stopMicrophone,
  };
}
