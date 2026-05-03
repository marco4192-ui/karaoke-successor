'use client';

import { useRef, useEffect } from 'react';

/**
 * Mini waveform visualization that renders real-time frequency bars
 * from an HTMLAudioElement using the Web Audio API AnalyserNode.
 *
 * Only mounts when a valid audio element is provided (i.e., during preview).
 * Renders ~24 bars in a small canvas at the bottom of the SongCard.
 */
export function WaveformBar({ audio, isActive }: { audio: HTMLAudioElement | null; isActive: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (!audio || !isActive || !canvasRef.current) {
      // Clean up previous analyser
      if (analyserRef.current) { analyserRef.current.disconnect(); analyserRef.current = null; }
      if (ctxRef.current) { ctxRef.current.close().catch(() => {}); ctxRef.current = null; }
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size once
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    // Create AudioContext + AnalyserNode (reuse if possible)
    if (!ctxRef.current || ctxRef.current.state === 'closed') {
      ctxRef.current = new AudioContext();
    }
    const audioCtx = ctxRef.current;

    if (!analyserRef.current || !audio.src) {
      try {
        const source = audioCtx.createMediaElementSource(audio);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64; // Small for performance — 32 frequency bins
        analyser.smoothingTimeConstant = 0.8;
        source.connect(analyser);
        analyser.connect(audioCtx.destination);
        analyserRef.current = analyser;
      } catch {
        // AudioContext may already be connected for this element
        return;
      }
    }

    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const barCount = Math.min(bufferLength, 24);
    const barGap = 2;
    const totalGap = barGap * (barCount - 1);
    const barWidth = Math.max(1, (rect.width - totalGap) / barCount);

    const draw = () => {
      analyser.getByteFrequencyData(dataArray);
      ctx.clearRect(0, 0, rect.width, rect.height);

      for (let i = 0; i < barCount; i++) {
        const value = dataArray[i] / 255;
        const barHeight = Math.max(2, value * rect.height);
        const x = i * (barWidth + barGap);
        const y = rect.height - barHeight;

        // Gradient from cyan to purple
        const hue = 180 + (i / barCount) * 80; // 180 (cyan) → 260 (purple)
        ctx.fillStyle = `hsla(${hue}, 80%, 60%, ${0.6 + value * 0.4})`;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, 1);
        ctx.fill();
      }

      animFrameRef.current = requestAnimationFrame(draw);
    };

    animFrameRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      // M2: Also disconnect analyser and close AudioContext on normal unmount
      // to prevent resource leaks when the song card disappears while active.
      if (analyserRef.current) { analyserRef.current.disconnect(); analyserRef.current = null; }
      if (ctxRef.current) { ctxRef.current.close().catch(() => {}); ctxRef.current = null; }
    };
  }, [audio, isActive]);

  if (!audio || !isActive) return null;

  return (
    <canvas
      ref={canvasRef}
      className="absolute bottom-0 left-0 right-0 w-full h-8 pointer-events-none opacity-80"
      style={{ imageRendering: 'pixelated' }}
    />
  );
}
