'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import type { Note } from '@/types/game';

interface WaveformProps {
  audioUrl?: string;
  audioBuffer?: AudioBuffer;
  width: number;
  height: number;
  zoom: number;
  scrollOffset: number;
  /** Notes to overlay as boundary lines on the waveform */
  notes?: Note[];
  /** Currently selected note ID (highlighted differently) */
  selectedNoteId?: string;
  /** Click on waveform — seek to that time in ms */
  onSeek?: (timeMs: number) => void;
  /** Double-click on waveform — add a note at that position */
  onNoteAdd?: (timeMs: number, pitch: number) => void;
  className?: string;
}

export function Waveform({
  audioUrl,
  audioBuffer: providedBuffer,
  width,
  height,
  zoom,
  scrollOffset,
  notes = [],
  selectedNoteId,
  onSeek,
  onNoteAdd,
  className = ''
}: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const bufferRef = useRef<AudioBuffer | null>(providedBuffer || null);

  // ── Derived: pixels-per-second and visible range ──
  const pixelsPerSecond = 100 * zoom;
  const startTimeSec = scrollOffset / pixelsPerSecond;

  // ── Click handler: convert pixel position to time and seek ──
  const handleClick = useCallback((e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const timeMs = ((scrollOffset + x) / pixelsPerSecond) * 1000;
    onSeek?.(timeMs);
  }, [scrollOffset, pixelsPerSecond, onSeek]);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    if (!onNoteAdd) return;
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const timeMs = ((scrollOffset + x) / pixelsPerSecond) * 1000;
    // Default pitch: C4 (MIDI 60)
    onNoteAdd(timeMs, 60);
  }, [scrollOffset, pixelsPerSecond, onNoteAdd]);

  // ── Draw waveform + note overlays ──
  const drawWaveform = useCallback((buffer: AudioBuffer, canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // Clear
    ctx.clearRect(0, 0, width, height);

    const rawData = buffer.getChannelData(0);
    const sampleRate = buffer.sampleRate;
    const totalDuration = buffer.duration;
    const visibleDuration = width / pixelsPerSecond;

    // ── Waveform rendering ──
    const centerY = height / 2;
    const amplitude = height * 0.4;
    const samplesPerPixel = Math.max(1, Math.floor(sampleRate / (totalDuration * pixelsPerSecond)));
    const startSample = Math.floor(startTimeSec * sampleRate);

    // Gradient fill
    const gradient = ctx.createLinearGradient(0, centerY - amplitude, 0, centerY + amplitude);
    gradient.addColorStop(0, 'rgba(6, 182, 212, 0.8)');
    gradient.addColorStop(0.5, 'rgba(34, 211, 238, 0.6)');
    gradient.addColorStop(1, 'rgba(6, 182, 212, 0.8)');

    ctx.fillStyle = gradient;
    ctx.beginPath();

    // Upper half
    for (let i = 0; i < width; i++) {
      const sampleIndex = startSample + Math.floor(i * samplesPerPixel);
      if (sampleIndex >= 0 && sampleIndex < rawData.length) {
        let max = 0;
        for (let j = 0; j < samplesPerPixel && sampleIndex + j < rawData.length; j++) {
          const v = rawData[sampleIndex + j];
          if (v > max) max = v;
        }
        const y = centerY - max * amplitude;
        if (i === 0) ctx.moveTo(i, y); else ctx.lineTo(i, y);
      }
    }

    // Lower half (reverse)
    for (let i = width - 1; i >= 0; i--) {
      const sampleIndex = startSample + Math.floor(i * samplesPerPixel);
      if (sampleIndex >= 0 && sampleIndex < rawData.length) {
        let min = 0;
        for (let j = 0; j < samplesPerPixel && sampleIndex + j < rawData.length; j++) {
          const v = rawData[sampleIndex + j];
          if (v < min) min = v;
        }
        ctx.lineTo(i, centerY - min * amplitude);
      }
    }

    ctx.closePath();
    ctx.fill();

    // Center line
    ctx.strokeStyle = 'rgba(168, 85, 247, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(width, centerY);
    ctx.stroke();

    // ── Note boundary overlays ──
    if (notes.length > 0) {
      ctx.save();

      for (const note of notes) {
        const noteStartPx = (note.startTime / 1000) * pixelsPerSecond - scrollOffset;
        const noteEndPx = ((note.startTime + note.duration) / 1000) * pixelsPerSecond - scrollOffset;

        // Skip notes entirely outside visible range
        if (noteEndPx < 0 || noteStartPx > width) continue;

        const isSelected = note.id === selectedNoteId;

        // Note start line
        ctx.strokeStyle = isSelected ? 'rgba(250, 204, 21, 0.9)' : 'rgba(34, 211, 238, 0.5)';
        ctx.lineWidth = isSelected ? 1.5 : 0.75;
        ctx.beginPath();
        ctx.moveTo(Math.max(0, noteStartPx), 0);
        ctx.lineTo(Math.max(0, noteStartPx), height);
        ctx.stroke();

        // Note end line
        ctx.beginPath();
        ctx.moveTo(Math.min(width, noteEndPx), 0);
        ctx.lineTo(Math.min(width, noteEndPx), height);
        ctx.stroke();

        // Semi-transparent fill for selected note
        if (isSelected) {
          ctx.fillStyle = 'rgba(250, 204, 21, 0.08)';
          ctx.fillRect(Math.max(0, noteStartPx), 0, Math.min(width, noteEndPx) - Math.max(0, noteStartPx), height);
        }
      }

      ctx.restore();
    }

    // ── Time markers ──
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';

    const markerInterval = zoom < 1 ? 10 : zoom < 2 ? 5 : 2;
    const firstMarker = Math.ceil(startTimeSec / markerInterval) * markerInterval;

    for (let time = firstMarker; time < startTimeSec + visibleDuration; time += markerInterval) {
      const x = (time - startTimeSec) * pixelsPerSecond;
      ctx.fillText(formatTime(time), x, height - 2);
    }
  }, [width, height, zoom, scrollOffset, pixelsPerSecond, startTimeSec, notes, selectedNoteId]);

  // ── Load audio buffer ──
  const loadAudio = useCallback(async (url: string) => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }
    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
      bufferRef.current = audioBuffer;
      const canvas = canvasRef.current;
      if (canvas) drawWaveform(audioBuffer, canvas);
    } catch (error) {
      console.error('[Waveform] Failed to load audio:', error);
    }
  }, [drawWaveform]);

  // ── Effects ──
  useEffect(() => {
    if (providedBuffer) {
      bufferRef.current = providedBuffer;
      const canvas = canvasRef.current;
      if (canvas) drawWaveform(providedBuffer, canvas);
    } else if (audioUrl) {
      loadAudio(audioUrl);
    }
  }, [audioUrl, providedBuffer, drawWaveform, loadAudio]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const buffer = bufferRef.current;
    if (canvas && buffer) drawWaveform(buffer, canvas);
  }, [width, height, zoom, scrollOffset, notes, selectedNoteId, drawWaveform]);

  useEffect(() => {
    return () => { audioContextRef.current?.close(); };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`${className}${onSeek ? ' cursor-pointer' : ''}`}
      style={{ width, height }}
      onClick={onSeek ? handleClick : undefined}
      onDoubleClick={onNoteAdd ? handleDoubleClick : undefined}
    />
  );
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default Waveform;
