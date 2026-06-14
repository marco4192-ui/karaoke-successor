'use client';

import { useRef, useEffect } from 'react';
import { useTranslation } from '@/lib/i18n/translations';
import type { PitchData } from './mobile-types';

interface MobilePitchVisualizerProps {
  pitchHistory: PitchData[];
  isListening: boolean;
}

// Musical range: C3 (MIDI 48) to C6 (MIDI 84)
const MIN_FREQ = 130.81; // C3
const MAX_FREQ = 1046.50; // C6

// How many data points to display (60 at ~20fps = 3 seconds)
const HISTORY_LENGTH = 60;

// Grid lines: one per octave boundary (C3, C4, C5, C6)
const NOTE_NAMES = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function freqToY(freq: number | null, height: number, padding: number): number {
  if (freq === null || freq <= 0) return height / 2;
  // Log scale mapping
  const minLog = Math.log2(MIN_FREQ);
  const maxLog = Math.log2(MAX_FREQ);
  const logFreq = Math.log2(Math.max(MIN_FREQ, Math.min(MAX_FREQ, freq)));
  const ratio = (logFreq - minLog) / (maxLog - minLog);
  // Invert Y (higher pitch = higher on screen)
  return padding + (1 - ratio) * (height - 2 * padding);
}

function getCentsOffPitch(frequency: number | null): number {
  if (frequency === null || frequency <= 0) return Infinity;
  // Convert frequency to MIDI note
  const midi = 69 + 12 * Math.log2(frequency / 440);
  const roundedMidi = Math.round(midi);
  // Cents deviation from nearest note
  return 1200 * Math.log2(frequency / midiToFreq(roundedMidi));
}

function getPitchColor(cents: number): string {
  const absCents = Math.abs(cents);
  if (absCents <= 20) return '#22c55e'; // green-500
  if (absCents <= 50) return '#eab308'; // yellow-500
  return '#ef4444'; // red-500
}

function getGlowColor(cents: number): string {
  const absCents = Math.abs(cents);
  if (absCents <= 20) return 'rgba(34, 197, 94, 0.6)';
  if (absCents <= 50) return 'rgba(234, 179, 8, 0.6)';
  return 'rgba(239, 68, 68, 0.6)';
}

export function MobilePitchVisualizer({ pitchHistory, isListening }: MobilePitchVisualizerProps) {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  // Use refs for values consumed in the RAF loop so we always read the latest data
  const pitchHistoryRef = useRef(pitchHistory);
  const isListeningRef = useRef(isListening);

  // Keep refs in sync with props
  pitchHistoryRef.current = pitchHistory;
  isListeningRef.current = isListening;

  // Set up RAF loop once — reads from refs so it always has latest data
  useEffect(() => {
    const draw = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const { width, height } = canvas;
      const currentHistory = pitchHistoryRef.current;
      const currentlyListening = isListeningRef.current;
      const padding = { top: 24, bottom: 24, left: 36, right: 16 };
      const plotWidth = width - padding.left - padding.right;
      const plotHeight = height - padding.top - padding.bottom;

      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      // Semi-transparent dark background
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.beginPath();
      ctx.roundRect(0, 0, width, height, 12);
      ctx.fill();

      // Draw octave gridlines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);

      for (let midi = 48; midi <= 84; midi += 12) {
        const freq = midiToFreq(midi);
        const y = freqToY(freq, height, padding.top);
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(width - padding.right, y);
        ctx.stroke();

        // Draw note label
        const octave = Math.floor(midi / 12) - 1;
        const noteName = NOTE_NAMES[midi % 12];
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.font = '10px monospace';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${noteName}${octave}`, padding.left - 4, y);
      }
      ctx.setLineDash([]);

      // Draw the pitch history line
      if (currentlyListening && currentHistory.length > 0) {
        const startIdx = Math.max(0, currentHistory.length - HISTORY_LENGTH);
        const data = currentHistory.slice(startIdx);
        const stepX = plotWidth / (HISTORY_LENGTH - 1);

        // Draw colored line segments
        for (let i = 1; i < data.length; i++) {
          const prev = data[i - 1];
          const curr = data[i];

          if (prev.frequency === null || curr.frequency === null) continue;

          const x1 = padding.left + (HISTORY_LENGTH - data.length + i - 1) * stepX;
          const x2 = padding.left + (HISTORY_LENGTH - data.length + i) * stepX;
          const y1 = freqToY(prev.frequency, height, padding.top);
          const y2 = freqToY(curr.frequency, height, padding.top);

          const cents = getCentsOffPitch(curr.frequency);
          const color = getPitchColor(cents);

          ctx.strokeStyle = color;
          ctx.lineWidth = 2.5;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        }

        // Draw glowing dot at the latest data point
        const lastPoint = data[data.length - 1];
        if (lastPoint && lastPoint.frequency !== null) {
          const lastX = padding.left + plotWidth;
          const lastY = freqToY(lastPoint.frequency, height, padding.top);
          const cents = getCentsOffPitch(lastPoint.frequency);
          const glowColor = getGlowColor(cents);
          const dotColor = getPitchColor(cents);

          // Outer glow
          const gradient = ctx.createRadialGradient(lastX, lastY, 0, lastX, lastY, 16);
          gradient.addColorStop(0, glowColor);
          gradient.addColorStop(1, 'transparent');
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(lastX, lastY, 16, 0, Math.PI * 2);
          ctx.fill();

          // Inner dot
          ctx.fillStyle = dotColor;
          ctx.beginPath();
          ctx.arc(lastX, lastY, 4, 0, Math.PI * 2);
          ctx.fill();

          // White center
          ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
          ctx.beginPath();
          ctx.arc(lastX, lastY, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Draw "Start singing" message when not listening
      if (!currentlyListening) {
        // Flat line in the middle
        const midY = padding.top + plotHeight / 2;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([8, 8]);
        ctx.beginPath();
        ctx.moveTo(padding.left, midY);
        ctx.lineTo(width - padding.right, midY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Text
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.font = '13px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(t('mobilePitchVisualizer.startSinging'), width / 2, midY - 14);

        // Small microphone icon hint
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.font = '20px sans-serif';
        ctx.fillText('\u{1F3A4}', width / 2, midY + 14);
      }

      // Continue animation loop
      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, []);

  // Handle canvas resize via ResizeObserver
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const updateCanvasSize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
      }
    };

    updateCanvasSize();

    const observer = new ResizeObserver(() => {
      updateCanvasSize();
    });

    observer.observe(container);
    resizeObserverRef.current = observer;

    return () => {
      observer.disconnect();
      resizeObserverRef.current = null;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-full h-40 mt-4"
      style={{ touchAction: 'none' }}
      role="img"
      aria-label={t('mobilePitchVisualizer.ariaPitchHistory')}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
      />
    </div>
  );
}
