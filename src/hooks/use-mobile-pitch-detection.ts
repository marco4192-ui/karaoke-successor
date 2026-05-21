'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { PitchData } from '@/components/screens/mobile/mobile-types';
import { VocalDetector } from '@/lib/audio/vocal-detector';
import { yinPitchDetection } from '@/lib/audio/pitch-algorithm';

interface UseMobilePitchDetectionOptions {
  clientId: string | null;
  isPlaying: boolean;
  songEnded: boolean;
  onError?: (_message: string) => void;
}

// Ring buffer for pitch history (60 entries ≈ 3 seconds at 20fps)
const PITCH_HISTORY_LENGTH = 60;
const EMPTY_PITCH: PitchData = { frequency: null, note: null, volume: 0 };

class PitchHistoryBuffer {
  private buffer: PitchData[];
  private writeIndex = 0;
  private count = 0;

  constructor() {
    this.buffer = Array.from({ length: PITCH_HISTORY_LENGTH }, () => ({ ...EMPTY_PITCH }));
  }

  push(data: PitchData): void {
    this.buffer[this.writeIndex] = { ...data };
    this.writeIndex = (this.writeIndex + 1) % PITCH_HISTORY_LENGTH;
    if (this.count < PITCH_HISTORY_LENGTH) {
      this.count++;
    }
  }

  toArray(): PitchData[] {
    if (this.count < PITCH_HISTORY_LENGTH) {
      return this.buffer.slice(0, this.count);
    }
    // Return oldest-first order
    const start = this.writeIndex;
    return [...this.buffer.slice(start), ...this.buffer.slice(0, start)];
  }

  reset(): void {
    this.buffer.fill({ ...EMPTY_PITCH });
    this.writeIndex = 0;
    this.count = 0;
  }
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
  const abortControllerRef = useRef<AbortController | null>(null);
  const pitchHistoryRef = useRef<PitchHistoryBuffer>(new PitchHistoryBuffer());
  // Throttle setCurrentPitch to ~20fps to avoid excessive re-renders
  const lastPitchUpdateRef = useRef<number>(0);

  // === Batch pitch upload (5 requests/sec instead of 20) ===
  const pitchBatchRef = useRef<Array<{
    frequency: number | null;
    note: number | null;
    clarity: number;
    volume: number;
    timestamp: number;
    isSinging: boolean;
    singingConfidence: number;
  }>>([]);
  const MAX_BATCH_SIZE = 10;
  const BATCH_FLUSH_INTERVAL = 200; // ms — 5 flushes/sec
  const batchTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const useFallbackRef = useRef(false); // fall back to single pitch if batch fails
  const lastPitchSendRef = useRef<number>(0); // used only in fallback mode
  const PITCH_SEND_INTERVAL = 50;

  // Refs for values consumed inside the requestAnimationFrame loop.
  // Without these, detectPitch would capture stale snapshots of
  // isPlaying / songEnded / clientId at the time startMicrophone was called.
  const isPlayingRef = useRef(isPlaying);
  const songEndedRef = useRef(songEnded);
  const clientIdRef = useRef(clientId);
  useEffect(() => {
    isPlayingRef.current = isPlaying;
    songEndedRef.current = songEnded;
    clientIdRef.current = clientId;
  }, [isPlaying, songEnded, clientId]);

  // Flush the accumulated pitch batch to the server
  const flushPitchBatch = useCallback(async (activeClientId: string) => {
    const batch = pitchBatchRef.current;
    if (batch.length === 0) return;
    pitchBatchRef.current = []; // clear immediately to avoid re-sending
    try {
      if (abortControllerRef.current) abortControllerRef.current.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;
      const res = await fetch('/api/mobile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          type: 'batch_pitch',
          clientId: activeClientId,
          payload: { frames: batch },
        }),
      });
      if (!res.ok) {
        useFallbackRef.current = true;
      }
    } catch {
      // Network error or abort — switch to fallback
      useFallbackRef.current = true;
    }
  }, []);

  // Send a single pitch frame (fallback when batch approach fails)
  const sendSinglePitch = useCallback((
    activeClientId: string,
    frame: { frequency: number | null; note: number | null; clarity: number; volume: number; timestamp: number; isSinging: boolean; singingConfidence: number },
  ) => {
    if (abortControllerRef.current) abortControllerRef.current.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    fetch('/api/mobile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        type: 'pitch',
        clientId: activeClientId,
        payload: frame,
      }),
    }).catch(() => {});
  }, []);

  const stopMicrophone = useCallback(() => {
    // Flush any remaining batch before stopping
    const cid = clientIdRef.current;
    if (cid && pitchBatchRef.current.length > 0) {
      flushPitchBatch(cid);
    }
    if (batchTimerRef.current) {
      clearInterval(batchTimerRef.current);
      batchTimerRef.current = null;
    }
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
    pitchHistoryRef.current.reset();
    pitchBatchRef.current = [];
    useFallbackRef.current = false;
  }, [flushPitchBatch]);

  const startMicrophone = useCallback(async () => {
    if (!clientIdRef.current) return;

    // Guard: if already running, stop first
    if (audioContextRef.current && mediaStreamRef.current) {
      stopMicrophone();
    }
    
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
          // eslint-disable-next-line no-console
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
      
      // Reset batch state for this session
      pitchBatchRef.current = [];
      useFallbackRef.current = false;

      // Start batch flush timer: every 200ms, send accumulated pitch frames
      if (batchTimerRef.current) clearInterval(batchTimerRef.current);
      const startBatchTimer = () => {
        batchTimerRef.current = setInterval(() => {
          const cid = clientIdRef.current;
          if (cid && !useFallbackRef.current) {
            flushPitchBatch(cid);
          }
        }, BATCH_FLUSH_INTERVAL);
      };
      startBatchTimer();

      const buffer = new Float32Array(analyserRef.current.fftSize);
      const freqBuffer = new Float32Array(analyserRef.current.frequencyBinCount);
      // Pre-allocate YIN scratch buffer outside the RAF loop to avoid GC pressure
      const yinBuffer = new Float32Array(Math.floor(buffer.length / 2));
      
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
        
        const frequency = yinPitchDetection(buffer, yinBuffer, audioContextRef.current.sampleRate);
        
        let note: number | null = null;
        if (frequency !== null && frequency >= 65 && frequency <= 1047) {
          note = 69 + 12 * Math.log2(frequency / 440);
        }
        
        // Run vocal detection to distinguish singing from humming
        const vocalResult = vocalDetectorRef.current?.processFrame(
          note,
          volume,
          freqBuffer,
          performance.now()
        );
        const isSinging = vocalResult?.isSinging ?? true;
        const singingConfidence = vocalResult?.singingConfidence ?? 1;
        
        // Throttle setCurrentPitch to ~20fps to avoid excessive re-renders from 60fps RAF loop
        const pitchNow = performance.now();
        if (pitchNow - lastPitchUpdateRef.current >= 50) {
          const pitchData: PitchData = { frequency, note, volume };
          setCurrentPitch(pitchData);
          pitchHistoryRef.current.push(pitchData);
          lastPitchUpdateRef.current = pitchNow;
        }
        
        // Only send pitch if song is playing and not ended (via refs)
        const now = performance.now();
        const activeClientId = clientIdRef.current;
        if (activeClientId && currentlyPlaying && !currentlyEnded && (volume > 0.01 || frequency !== null)) {
          const frame = {
            frequency,
            note,
            clarity: 0,
            volume,
            timestamp: Date.now(),
            isSinging,
            singingConfidence,
          };

          if (useFallbackRef.current) {
            // Fallback: individual POST per frame (throttled to ~20 req/sec)
            if (now - lastPitchSendRef.current >= PITCH_SEND_INTERVAL) {
              lastPitchSendRef.current = now;
              sendSinglePitch(activeClientId, frame);
            }
          } else {
            // Batch mode: accumulate frames, flush every 200ms or when batch is full
            pitchBatchRef.current.push(frame);
            if (pitchBatchRef.current.length >= MAX_BATCH_SIZE) {
              flushPitchBatch(activeClientId);
            }
          }
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
  }, [onError, stopMicrophone]);

  // Clean up microphone resources on unmount to prevent leaking
  // the media stream, audio context, animation frame loop, and batch timer.
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
      // Flush remaining pitch batch
      const cid = clientIdRef.current;
      if (cid && pitchBatchRef.current.length > 0) {
        // Synchronous flush via sendBeacon — best-effort, no await
        try {
          navigator.sendBeacon('/api/mobile', JSON.stringify({
            type: 'batch_pitch',
            clientId: cid,
            payload: { frames: pitchBatchRef.current },
          }));
        } catch { /* ignore — page is unloading */ }
        pitchBatchRef.current = [];
      }
      if (batchTimerRef.current) {
        clearInterval(batchTimerRef.current);
        batchTimerRef.current = null;
      }
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
    getPitchHistory: () => pitchHistoryRef.current.toArray(),
  };
}
