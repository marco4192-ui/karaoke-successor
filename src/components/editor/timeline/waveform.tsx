'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import type { Note } from '@/types/game';

interface WaveformProps {
  audioUrl?: string;
  /** Visible viewport width in CSS pixels — the canvas only renders this window */
  width: number;
  height: number;
  /** Pixels per second at current zoom (must match the timeline grid) */
  pixelsPerSecond: number;
  /** Horizontal scroll offset in pixels */
  scrollOffset: number;
  /** Notes to overlay as boundary lines on the waveform */
  notes?: Note[];
  /** Currently selected note ID (highlighted differently) */
  selectedNoteId?: string;
  /** Click on waveform — seek to that time in ms */
  onSeek?: (_timeMs: number) => void;
  /** Double-click on waveform — add a note at that position */
  onNoteAdd?: (_timeMs: number, _pitch: number) => void;
  className?: string;
}

export function Waveform({
  audioUrl,
  width,
  height,
  pixelsPerSecond,
  scrollOffset,
  notes = [],
  selectedNoteId,
  onSeek,
  onNoteAdd,
  className = ''
}: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const bufferRef = useRef<AudioBuffer | null>(null);

  // ── Derived: visible time range ──
  const startTimeSec = scrollOffset / pixelsPerSecond;
  const visibleDuration = width / pixelsPerSecond;

  // ── Click handler: convert pixel position to time and seek ──
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation(); // Don't bubble to the timeline container (would deselect/add notes)
    if (!onSeek) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const timeMs = ((scrollOffset + x) / pixelsPerSecond) * 1000;
    onSeek(timeMs);
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
    const targetWidth = Math.max(1, Math.round(width));
    const targetHeight = Math.max(1, Math.round(height));
    // Only resize when needed (assigning canvas.width resets the context state)
    if (canvas.width !== targetWidth * dpr || canvas.height !== targetHeight * dpr) {
      canvas.width = targetWidth * dpr;
      canvas.height = targetHeight * dpr;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Clear
    ctx.clearRect(0, 0, targetWidth, targetHeight);

    const rawData = buffer.getChannelData(0);
    const sampleRate = buffer.sampleRate;
    const startSample = Math.floor(startTimeSec * sampleRate);

    // ── Waveform rendering ──
    const centerY = targetHeight / 2;
    const amplitude = targetHeight * 0.4;
    // Correct samples-per-pixel: totalSamples / totalPixels → sampleRate / pixelsPerSecond.
    // (The old formula divided by totalDuration as well, which was off by the
    // song length factor and rendered only a few milliseconds of audio.)
    const samplesPerPixel = sampleRate / pixelsPerSecond;

    // Gradient fill
    const gradient = ctx.createLinearGradient(0, centerY - amplitude, 0, centerY + amplitude);
    gradient.addColorStop(0, 'rgba(6, 182, 212, 0.8)');
    gradient.addColorStop(0.5, 'rgba(34, 211, 238, 0.6)');
    gradient.addColorStop(1, 'rgba(6, 182, 212, 0.8)');

    ctx.fillStyle = gradient;
    ctx.beginPath();

    // First pass: collect the min/max envelope per pixel
    const topVals: number[] = new Array(targetWidth);
    const bottomVals: number[] = new Array(targetWidth);
    for (let i = 0; i < targetWidth; i++) {
      const from = startSample + Math.floor(i * samplesPerPixel);
      const to = startSample + Math.floor((i + 1) * samplesPerPixel);
      let max = 0;
      let min = 0;
      const fromC = Math.max(0, from);
      const toC = Math.min(to, rawData.length);
      for (let j = fromC; j < toC; j++) {
        const v = rawData[j];
        if (v > max) max = v;
        if (v < min) min = v;
      }
      topVals[i] = centerY - max * amplitude;
      bottomVals[i] = centerY - min * amplitude;
    }

    // Outline: top chain forward, bottom chain backward → clean filled envelope
    for (let i = 0; i < targetWidth; i++) {
      if (i === 0) ctx.moveTo(i, topVals[i]); else ctx.lineTo(i, topVals[i]);
    }
    for (let i = targetWidth - 1; i >= 0; i--) {
      ctx.lineTo(i, bottomVals[i]);
    }

    ctx.closePath();
    ctx.fill();

    // Center line
    ctx.strokeStyle = 'rgba(168, 85, 247, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(targetWidth, centerY);
    ctx.stroke();

    // ── Note boundary overlays ──
    if (notes.length > 0) {
      ctx.save();

      for (const note of notes) {
        const noteStartPx = (note.startTime / 1000) * pixelsPerSecond - scrollOffset;
        const noteEndPx = ((note.startTime + note.duration) / 1000) * pixelsPerSecond - scrollOffset;

        // Skip notes entirely outside visible range
        if (noteEndPx < 0 || noteStartPx > targetWidth) continue;

        const isSelected = note.id === selectedNoteId;

        // Note start line
        ctx.strokeStyle = isSelected ? 'rgba(250, 204, 21, 0.9)' : 'rgba(34, 211, 238, 0.5)';
        ctx.lineWidth = isSelected ? 1.5 : 0.75;
        ctx.beginPath();
        ctx.moveTo(Math.max(0, noteStartPx), 0);
        ctx.lineTo(Math.max(0, noteStartPx), targetHeight);
        ctx.stroke();

        // Note end line
        ctx.beginPath();
        ctx.moveTo(Math.min(targetWidth, noteEndPx), 0);
        ctx.lineTo(Math.min(targetWidth, noteEndPx), targetHeight);
        ctx.stroke();

        // Semi-transparent fill for selected note
        if (isSelected) {
          ctx.fillStyle = 'rgba(250, 204, 21, 0.08)';
          ctx.fillRect(Math.max(0, noteStartPx), 0, Math.min(targetWidth, noteEndPx) - Math.max(0, noteStartPx), targetHeight);
        }
      }

      ctx.restore();
    }

    // ── Time markers ──
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';

    const zoom = pixelsPerSecond / 100;
    const markerInterval = zoom < 1 ? 10 : zoom < 2 ? 5 : 2;
    const firstMarker = Math.max(0, Math.ceil(startTimeSec / markerInterval) * markerInterval);

    for (let time = firstMarker; time < startTimeSec + visibleDuration; time += markerInterval) {
      const x = (time - startTimeSec) * pixelsPerSecond;
      ctx.fillText(formatTime(time), x, targetHeight - 2);
    }
  }, [width, height, scrollOffset, pixelsPerSecond, startTimeSec, visibleDuration, notes, selectedNoteId]);

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
      // eslint-disable-next-line no-console
      console.error('[Waveform] Failed to load audio:', error);
    }
  }, [drawWaveform]);

  // ── Effects ──
  useEffect(() => {
    if (audioUrl) {
      loadAudio(audioUrl);
    }
  }, [audioUrl, loadAudio]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const buffer = bufferRef.current;
    if (canvas && buffer) drawWaveform(buffer, canvas);
  }, [width, height, scrollOffset, pixelsPerSecond, notes, selectedNoteId, drawWaveform]);

  useEffect(() => {
    return () => { audioContextRef.current?.close(); };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`${className}${onSeek ? ' cursor-pointer' : ''}`}
      style={{ width: Math.max(1, width), height }}
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
