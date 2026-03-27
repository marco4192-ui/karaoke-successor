'use client';

import { useEffect, useRef } from 'react';

// ===================== VOICE VISUALIZATION =====================

interface VoiceVisualizerProps {
  analyserData: number[]; // Frequency data from analyser
  volume: number; // 0-1
  isSinging: boolean;
  pitch?: number | null; // Detected pitch frequency
  position?: { x: number; y: number }; // Position on screen
  mode?: 'waveform' | 'spectrum' | 'circular';
}

export function VoiceVisualizer({
  analyserData,
  volume,
  isSinging,
  pitch,
  position = { x: 50, y: 50 },
  mode = 'spectrum',
}: VoiceVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 300;
    canvas.height = 150;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (!isSinging || analyserData.length === 0) {
        // Draw idle state
        ctx.strokeStyle = 'rgba(100, 200, 255, 0.3)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, canvas.height / 2);
        ctx.lineTo(canvas.width, canvas.height / 2);
        ctx.stroke();
        return;
      }

      if (mode === 'waveform') {
        // Waveform visualization
        ctx.beginPath();
        ctx.strokeStyle = `rgba(34, 211, 238, ${0.5 + volume * 0.5})`;
        ctx.lineWidth = 2;

        const sliceWidth = canvas.width / analyserData.length;
        let x = 0;

        for (let i = 0; i < analyserData.length; i++) {
          const v = analyserData[i] / 128.0;
          const y = (v * canvas.height) / 2;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }

          x += sliceWidth;
        }

        ctx.lineTo(canvas.width, canvas.height / 2);
        ctx.stroke();

        // Glow effect
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#22D3EE';
      } else if (mode === 'spectrum') {
        // Spectrum bars
        const barWidth = canvas.width / analyserData.length;
        const barSpacing = 2;

        for (let i = 0; i < analyserData.length; i++) {
          const barHeight = (analyserData[i] / 255) * canvas.height * volume;
          const x = i * (barWidth + barSpacing);
          const hue = (i / analyserData.length) * 60 + 180; // Cyan to blue

          // Gradient bar
          const gradient = ctx.createLinearGradient(x, canvas.height, x, canvas.height - barHeight);
          gradient.addColorStop(0, `hsla(${hue}, 100%, 50%, 0.8)`);
          gradient.addColorStop(1, `hsla(${hue}, 100%, 70%, 0.3)`);

          ctx.fillStyle = gradient;
          ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        }
      } else if (mode === 'circular') {
        // Circular visualizer
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const baseRadius = 30;

        for (let i = 0; i < analyserData.length; i++) {
          const angle = (i / analyserData.length) * Math.PI * 2;
          const amplitude = (analyserData[i] / 255) * 40 * volume;
          const radius = baseRadius + amplitude;

          const x1 = centerX + Math.cos(angle) * baseRadius;
          const y1 = centerY + Math.sin(angle) * baseRadius;
          const x2 = centerX + Math.cos(angle) * radius;
          const y2 = centerY + Math.sin(angle) * radius;

          const hue = (i / analyserData.length) * 60 + 180;
          ctx.strokeStyle = `hsla(${hue}, 100%, 60%, 0.8)`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        }

        // Center circle
        ctx.beginPath();
        ctx.arc(centerX, centerY, baseRadius * 0.8, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(34, 211, 238, 0.3)';
        ctx.fill();
      }

      // Pitch indicator
      if (pitch) {
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 14px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`${Math.round(pitch)} Hz`, canvas.width / 2, 20);
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [analyserData, volume, isSinging, pitch, mode]);

  return (
    <div
      className="absolute pointer-events-none z-20"
      style={{
        left: `${position.x}%`,
        top: `${position.y}%`,
        transform: 'translate(-50%, -50%)',
      }}
    >
      <canvas
        ref={canvasRef}
        className="rounded-lg"
        style={{
          boxShadow: isSinging ? '0 0 30px rgba(34, 211, 238, 0.3)' : 'none',
        }}
      />
    </div>
  );
}

// ===================== LIVE WAVEFORM (Microphone Input) =====================

interface LiveWaveformProps {
  audioStream?: MediaStream;
  isActive: boolean;
  color?: string;
  height?: number;
  className?: string;
}

export function LiveWaveform({
  audioStream,
  isActive,
  color = '#22D3EE',
  height = 60,
  className = '',
}: LiveWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | undefined>(undefined);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  useEffect(() => {
    if (!audioStream || !isActive) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Setup audio analysis
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }
    const audioContext = audioContextRef.current;

    if (!sourceRef.current) {
      sourceRef.current = audioContext.createMediaStreamSource(audioStream);
    }
    const source = sourceRef.current;

    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    source.connect(analyser);
    analyserRef.current = analyser;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    canvas.width = 400;
    canvas.height = height;

    const draw = () => {
      if (!analyserRef.current) return;

      analyser.getByteTimeDomainData(dataArray);

      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw waveform
      ctx.lineWidth = 2;
      ctx.strokeStyle = color;
      ctx.shadowBlur = 10;
      ctx.shadowColor = color;
      ctx.beginPath();

      const sliceWidth = canvas.width / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }

        x += sliceWidth;
      }

      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
      ctx.shadowBlur = 0;

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [audioStream, isActive, color, height]);

  return (
    <canvas
      ref={canvasRef}
      className={`rounded-lg ${className}`}
      style={{ height: `${height}px` }}
    />
  );
}
