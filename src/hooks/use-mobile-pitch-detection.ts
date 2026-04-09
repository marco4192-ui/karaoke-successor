'use client';

import { useState, useCallback, useRef } from 'react';
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

  return sampleRate / betterTau;
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

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const vocalDetectorRef = useRef<VocalDetector | null>(null);

  const startMicrophone = useCallback(async () => {
    if (!clientId) return;
    
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
        
        // STOP if song ended
        if (songEnded || !isPlaying) {
          // Don't stop immediately, just don't send data
          // The effect will handle stopping
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
        
        // Only send pitch if song is playing and not ended
        if (clientId && isPlaying && !songEnded && (volume > 0.01 || frequency !== null)) {
          fetch('/api/mobile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'pitch',
              clientId,
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
    } catch {
      onError?.('Microphone access denied');
    }
  }, [clientId, isPlaying, songEnded, onError]);

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

  return {
    isListening,
    currentPitch,
    startMicrophone,
    stopMicrophone,
  };
}
