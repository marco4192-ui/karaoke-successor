'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  SpectrogramConfig,
  DEFAULT_SPECTROGRAM_CONFIG,
  generateVisualBars,
  FREQUENCY_BANDS,
} from '@/lib/audio/spectrogram';

interface SpectrogramDisplayProps {
  audioElement?: HTMLAudioElement | null;
  audioStream?: MediaStream | null;
  isActive: boolean;
  mode?: 'bars' | 'circular' | 'waveform';
  position?: { x: number; y: number };
  size?: { width: number; height: number };
  colorScheme?: SpectrogramConfig['colorScheme'];
  numBars?: number;
  className?: string;
}

export function SpectrogramDisplay({
  audioElement,
  audioStream,
  isActive,
  mode = 'bars',
  position = { x: 50, y: 80 },
  size = { width: 300, height: 80 },
  colorScheme = 'neon',
  numBars = 32,
  className = '',
}: SpectrogramDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | MediaStreamAudioSourceNode | null>(null);
  const animationRef = useRef<number | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize audio analysis
  useEffect(() => {
    if (!isActive || (!audioElement && !audioStream)) return;

    const initAudio = async () => {
      try {
        // Create audio context if not exists
        if (!audioContextRef.current) {
          audioContextRef.current = new AudioContext();
        }
        const audioContext = audioContextRef.current;

        // Create analyser
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = DEFAULT_SPECTROGRAM_CONFIG.fftSize;
        analyser.smoothingTimeConstant = DEFAULT_SPECTROGRAM_CONFIG.smoothing;
        analyser.minDecibels = DEFAULT_SPECTROGRAM_CONFIG.minDecibels;
        analyser.maxDecibels = DEFAULT_SPECTROGRAM_CONFIG.maxDecibels;

        // Connect source
        if (audioElement && !sourceRef.current) {
          sourceRef.current = audioContext.createMediaElementSource(audioElement);
          sourceRef.current.connect(analyser);
          analyser.connect(audioContext.destination);
        } else if (audioStream && !sourceRef.current) {
          sourceRef.current = audioContext.createMediaStreamSource(audioStream);
          sourceRef.current.connect(analyser);
        }

        analyserRef.current = analyser;
        setIsInitialized(true);
      } catch (error) {
        console.error('[SpectrogramDisplay] Failed to initialize:', error);
      }
    };

    initAudio();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isActive, audioElement, audioStream]);

  // Draw visualization
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser || !isActive) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = size;
    const frequencyData = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(frequencyData);

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    if (mode === 'bars') {
      // Generate and draw bars
      const bars = generateVisualBars(frequencyData, numBars, analyser.context.sampleRate);
      const barWidth = width / numBars;
      const barSpacing = 2;

      bars.forEach((bar, i) => {
        const barHeight = bar.value * height * 0.9;
        const x = i * barWidth + barSpacing / 2;
        const y = height - barHeight;

        // Gradient bar
        const gradient = ctx.createLinearGradient(x, height, x, y);
        gradient.addColorStop(0, bar.color);
        gradient.addColorStop(1, `${bar.color}66`);

        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, barWidth - barSpacing, barHeight);

        // Glow effect
        ctx.shadowColor = bar.color;
        ctx.shadowBlur = 10;
      });
    } else if (mode === 'circular') {
      const centerX = width / 2;
      const centerY = height / 2;
      const innerRadius = Math.min(width, height) * 0.2;
      const maxRadius = Math.min(width, height) * 0.45;

      const numSegments = Math.min(64, frequencyData.length / 2);
      const angleStep = (2 * Math.PI) / numSegments;

      for (let i = 0; i < numSegments; i++) {
        const angle = i * angleStep - Math.PI / 2;
        const value = frequencyData[i] / 255;
        const outerRadius = innerRadius + value * (maxRadius - innerRadius);

        // Determine color based on frequency band
        const freq = (i / numSegments) * 20000;
        let color = '#00ffff';
        for (const band of FREQUENCY_BANDS) {
          if (freq >= band.minHz && freq < band.maxHz) {
            color = band.color;
            break;
          }
        }

        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.shadowColor = color;
        ctx.shadowBlur = 5;
        ctx.moveTo(
          centerX + Math.cos(angle) * innerRadius,
          centerY + Math.sin(angle) * innerRadius
        );
        ctx.lineTo(
          centerX + Math.cos(angle) * outerRadius,
          centerY + Math.sin(angle) * outerRadius
        );
        ctx.stroke();
      }

      // Center circle glow
      ctx.beginPath();
      ctx.arc(centerX, centerY, innerRadius * 0.8, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(34, 211, 238, 0.2)';
      ctx.fill();
    }

    ctx.shadowBlur = 0;

    animationRef.current = requestAnimationFrame(draw);
  }, [isActive, mode, numBars, size]);

  // Start animation loop
  useEffect(() => {
    if (!isInitialized || !isActive) return;

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isInitialized, isActive, draw]);

  if (!isActive) return null;

  return (
    <div
      className={`absolute pointer-events-none z-15 ${className}`}
      style={{
        left: `${position.x}%`,
        top: `${position.y}%`,
        transform: 'translate(-50%, -50%)',
      }}
    >
      <canvas
        ref={canvasRef}
        width={size.width}
        height={size.height}
        className="rounded-lg"
        style={{
          background: 'rgba(0, 0, 0, 0.3)',
          backdropFilter: 'blur(4px)',
        }}
      />
    </div>
  );
}
