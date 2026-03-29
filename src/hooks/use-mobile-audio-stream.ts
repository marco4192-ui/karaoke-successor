'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

// ===================== TYPES =====================
export type TransmissionMode = 'pitch-only' | 'audio-stream';

export interface AudioStreamConfig {
  sampleRate: number;
  channels: number;
  chunkInterval: number; // ms between chunks
}

export interface AudioChunk {
  data: string; // base64 encoded
  sampleRate: number;
  channels: number;
  sequenceNumber: number;
}

export interface MobileAudioStreamResult {
  isStreaming: boolean;
  transmissionMode: TransmissionMode;
  startStreaming: () => Promise<void>;
  stopStreaming: () => void;
  error: string | null;
  bytesSent: number;
  chunksSent: number;
}

const DEFAULT_CONFIG: AudioStreamConfig = {
  sampleRate: 22050, // Lower sample rate for mobile
  channels: 1,
  chunkInterval: 100, // 100ms chunks
};

// ===================== HOOK =====================
export function useMobileAudioStream(
  clientId: string | null,
  config: AudioStreamConfig = DEFAULT_CONFIG
): MobileAudioStreamResult {
  const [isStreaming, setIsStreaming] = useState(false);
  const [transmissionMode, setTransmissionMode] = useState<TransmissionMode>('pitch-only');
  const [error, setError] = useState<string | null>(null);
  const [bytesSent, setBytesSent] = useState(0);
  const [chunksSent, setChunksSent] = useState(0);

  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const sequenceNumberRef = useRef(0);
  const audioBufferRef = useRef<Float32Array[]>([]);

  // Fetch transmission mode from server
  const fetchTransmissionMode = useCallback(async () => {
    if (!clientId) return;
    
    try {
      const response = await fetch('/api/mobile?action=transmissionmode');
      const data = await response.json();
      if (data.success) {
        setTransmissionMode(data.transmissionMode);
      }
    } catch {
      // Ignore errors
    }
  }, [clientId]);

  // Poll transmission mode periodically
  useEffect(() => {
    if (!clientId) return;
    
    fetchTransmissionMode();
    const interval = setInterval(fetchTransmissionMode, 2000);
    
    return () => clearInterval(interval);
  }, [clientId, fetchTransmissionMode]);

  // Convert Float32Array to base64
  const float32ToBase64 = useCallback((buffer: Float32Array): string => {
    // Convert to Int16 for smaller size
    const int16Buffer = new Int16Array(buffer.length);
    for (let i = 0; i < buffer.length; i++) {
      // Clamp and convert to 16-bit
      const sample = Math.max(-1, Math.min(1, buffer[i]));
      int16Buffer[i] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
    }
    
    // Convert to base64
    const uint8Buffer = new Uint8Array(int16Buffer.buffer);
    let binary = '';
    for (let i = 0; i < uint8Buffer.length; i++) {
      binary += String.fromCharCode(uint8Buffer[i]);
    }
    return btoa(binary);
  }, []);

  // Send audio chunk to server
  const sendAudioChunk = useCallback(async (audioData: Float32Array) => {
    if (!clientId || transmissionMode !== 'audio-stream') return;
    
    const base64Data = float32ToBase64(audioData);
    const chunk: AudioChunk = {
      data: base64Data,
      sampleRate: config.sampleRate,
      channels: config.channels,
      sequenceNumber: sequenceNumberRef.current++,
    };
    
    try {
      const response = await fetch('/api/mobile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'audiochunk',
          clientId,
          payload: chunk,
        }),
      });
      
      const data = await response.json();
      if (data.success) {
        setBytesSent(prev => prev + base64Data.length);
        setChunksSent(prev => prev + 1);
      }
    } catch {
      // Ignore send errors
    }
  }, [clientId, transmissionMode, config, float32ToBase64]);

  // Start audio streaming
  const startStreaming = useCallback(async () => {
    if (!clientId || transmissionMode !== 'audio-stream') {
      setError('Cannot start streaming: wrong mode or not connected');
      return;
    }

    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: config.sampleRate,
          channelCount: config.channels,
        },
      });
      mediaStreamRef.current = stream;

      // Create audio context
      const audioContext = new AudioContext({ sampleRate: config.sampleRate });
      audioContextRef.current = audioContext;

      // Notify server that streaming is starting
      await fetch('/api/mobile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'startaudiostream',
          clientId,
          payload: {
            sampleRate: config.sampleRate,
            channels: config.channels,
          },
        }),
      });

      // Create source from microphone
      const source = audioContext.createMediaStreamSource(stream);
      
      // Create script processor for capturing audio data
      // Using ScriptProcessorNode as AudioWorklet may not be available on all mobile browsers
      const bufferSize = config.sampleRate * config.chunkInterval / 1000;
      const processor = audioContext.createScriptProcessor(bufferSize, config.channels, config.channels);
      
      processor.onaudioprocess = (event) => {
        if (!isStreaming) return;
        const inputData = event.inputBuffer.getChannelData(0);
        // Clone the data as it will be reused
        const clonedData = new Float32Array(inputData);
        audioBufferRef.current.push(clonedData);
        
        // Send if we have accumulated enough data
        if (audioBufferRef.current.length >= 1) {
          const combinedLength = audioBufferRef.current.reduce((sum, arr) => sum + arr.length, 0);
          const combined = new Float32Array(combinedLength);
          let offset = 0;
          for (const arr of audioBufferRef.current) {
            combined.set(arr, offset);
            offset += arr.length;
          }
          audioBufferRef.current = [];
          sendAudioChunk(combined);
        }
      };

      source.connect(processor);
      processor.connect(audioContext.destination);

      setIsStreaming(true);
      setError(null);
      sequenceNumberRef.current = 0;
      setBytesSent(0);
      setChunksSent(0);

      console.log('[Mobile Audio Stream] Started streaming');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start streaming');
      console.error('[Mobile Audio Stream] Error:', err);
    }
  }, [clientId, transmissionMode, config, isStreaming, sendAudioChunk]);

  // Stop audio streaming
  const stopStreaming = useCallback(async () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }

    if (audioContextRef.current) {
      await audioContextRef.current.close();
      audioContextRef.current = null;
    }

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    workletNodeRef.current = null;
    audioBufferRef.current = [];
    setIsStreaming(false);

    // Notify server that streaming stopped
    if (clientId) {
      await fetch('/api/mobile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'stopaudiostream',
          clientId,
        }),
      }).catch(() => {});
    }

    console.log('[Mobile Audio Stream] Stopped streaming');
  }, [clientId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isStreaming) {
        stopStreaming();
      }
    };
  }, [isStreaming, stopStreaming]);

  // Auto-start/stop based on transmission mode
  useEffect(() => {
    if (transmissionMode === 'pitch-only' && isStreaming) {
      stopStreaming();
    }
  }, [transmissionMode, isStreaming, stopStreaming]);

  return {
    isStreaming,
    transmissionMode,
    startStreaming,
    stopStreaming,
    error,
    bytesSent,
    chunksSent,
  };
}
