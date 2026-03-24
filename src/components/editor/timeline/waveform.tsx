'use client';

import React, { useEffect, useRef, useCallback } from 'react';

interface WaveformProps {
  audioUrl?: string;
  audioBuffer?: AudioBuffer;
  width: number;
  height: number;
  zoom: number;
  scrollOffset: number;
  className?: string;
}

export function Waveform({
  audioUrl,
  audioBuffer: providedBuffer,
  width,
  height,
  zoom,
  scrollOffset,
  className = ''
}: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const bufferRef = useRef<AudioBuffer | null>(providedBuffer || null);

  const drawWaveform = useCallback((buffer: AudioBuffer, canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // Clear canvas
    ctx.fillStyle = 'transparent';
    ctx.fillRect(0, 0, width, height);

    // Get audio data
    const rawData = buffer.getChannelData(0);
    const samples = buffer.sampleRate;
    const totalDuration = buffer.duration;
    
    // Calculate visible portion based on zoom and scroll
    const pixelsPerSecond = 100 * zoom; // Base: 100px per second
    const visibleDuration = width / pixelsPerSecond;
    const startTime = scrollOffset / pixelsPerSecond;
    
    // Draw waveform
    const centerY = height / 2;
    const amplitude = height * 0.4;

    // Create gradient for waveform
    const gradient = ctx.createLinearGradient(0, centerY - amplitude, 0, centerY + amplitude);
    gradient.addColorStop(0, 'rgba(6, 182, 212, 0.8)'); // cyan-500
    gradient.addColorStop(0.5, 'rgba(34, 211, 238, 0.6)'); // cyan-400
    gradient.addColorStop(1, 'rgba(6, 182, 212, 0.8)');

    ctx.fillStyle = gradient;
    ctx.strokeStyle = 'rgba(34, 211, 238, 0.4)';
    ctx.lineWidth = 0.5;

    // Sample the audio data for visualization
    const samplesPerPixel = Math.floor(samples / (totalDuration * pixelsPerSecond));
    const startSample = Math.floor(startTime * samples);
    const endSample = Math.min(startSample + Math.floor(visibleDuration * samples), samples);

    ctx.beginPath();
    
    // Draw upper half
    for (let i = 0; i < width; i++) {
      const sampleIndex = startSample + Math.floor(i * samplesPerPixel);
      if (sampleIndex >= 0 && sampleIndex < rawData.length) {
        let max = 0;
        let min = 0;
        
        // Average over the samples for this pixel
        for (let j = 0; j < samplesPerPixel && sampleIndex + j < rawData.length; j++) {
          const value = rawData[sampleIndex + j];
          if (value > max) max = value;
          if (value < min) min = value;
        }
        
        const x = i;
        const upperY = centerY - max * amplitude;
        const lowerY = centerY - min * amplitude;
        
        if (i === 0) {
          ctx.moveTo(x, upperY);
        } else {
          ctx.lineTo(x, upperY);
        }
      }
    }

    // Draw lower half (reverse)
    for (let i = width - 1; i >= 0; i--) {
      const sampleIndex = startSample + Math.floor(i * samplesPerPixel);
      if (sampleIndex >= 0 && sampleIndex < rawData.length) {
        let min = 0;
        
        for (let j = 0; j < samplesPerPixel && sampleIndex + j < rawData.length; j++) {
          const value = rawData[sampleIndex + j];
          if (value < min) min = value;
        }
        
        const x = i;
        const lowerY = centerY - min * amplitude;
        ctx.lineTo(x, lowerY);
      }
    }

    ctx.closePath();
    ctx.fill();

    // Draw center line
    ctx.strokeStyle = 'rgba(168, 85, 247, 0.3)'; // purple-500 with opacity
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(width, centerY);
    ctx.stroke();

    // Draw time markers
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    
    const markerInterval = zoom < 1 ? 10 : zoom < 2 ? 5 : 2; // seconds between markers
    const firstMarker = Math.ceil(startTime / markerInterval) * markerInterval;
    
    for (let time = firstMarker; time < startTime + visibleDuration; time += markerInterval) {
      const x = (time - startTime) * pixelsPerSecond;
      ctx.fillText(formatTime(time), x, height - 2);
    }
  }, [width, height, zoom, scrollOffset]);

  const loadAudio = useCallback(async (url: string) => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }

    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
      bufferRef.current = audioBuffer;
      
      const canvas = canvasRef.current;
      if (canvas) {
        drawWaveform(audioBuffer, canvas);
      }
    } catch (error) {
      console.error('Failed to load audio for waveform:', error);
    }
  }, [drawWaveform]);

  useEffect(() => {
    if (providedBuffer) {
      bufferRef.current = providedBuffer;
      const canvas = canvasRef.current;
      if (canvas) {
        drawWaveform(providedBuffer, canvas);
      }
    } else if (audioUrl) {
      loadAudio(audioUrl);
    }
  }, [audioUrl, providedBuffer, drawWaveform, loadAudio]);

  // Redraw on dimension/zoom changes
  useEffect(() => {
    const canvas = canvasRef.current;
    const buffer = bufferRef.current;
    if (canvas && buffer) {
      drawWaveform(buffer, canvas);
    }
  }, [width, height, zoom, scrollOffset, drawWaveform]);

  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`${className}`}
      style={{ width, height }}
    />
  );
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default Waveform;
