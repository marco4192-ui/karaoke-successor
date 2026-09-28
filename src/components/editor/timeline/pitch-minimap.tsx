'use client';

/**
 * Pitch minimap — footer pitch graph for fast maneuvering.
 * Extracted verbatim from timeline.tsx (R2 refactor) — only the module
 * boundary is new; the canvas drawing, pointer interaction and comments
 * are unchanged.
 */
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import type { Note } from '@/types/game';

interface PitchMinimapProps {
  notes: Note[];
  totalDuration: number;
  width: number;
  height: number;
  pixelsPerSecond: number;
  scrollOffset: number;
  viewportWidth: number;
  currentTime: number;
  /** Seek + (optionally) center the timeline viewport on the position. */
  onScrub: (_timeMs: number, _centerViewport: boolean) => void;
}

export function PitchMinimap({
  notes,
  totalDuration,
  width,
  height,
  pixelsPerSecond,
  scrollOffset,
  viewportWidth,
  currentTime,
  onScrub,
}: PitchMinimapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const draggingRef = useRef(false);

  // Pitch range of the song's notes (padded)
  const pitchRange = useMemo(() => {
    if (notes.length === 0) return { min: 48, max: 72 };
    let min = Infinity;
    let max = -Infinity;
    for (const n of notes) {
      if (n.pitch < min) min = n.pitch;
      if (n.pitch > max) max = n.pitch;
    }
    return { min: Math.max(0, min - 2), max: Math.min(127, max + 2) };
  }, [notes]);

  // ── Drawing ──
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const durationSec = totalDuration / 1000;
    const usable = durationSec > 0 ? width : 0;
    const timeToX = (ms: number) => (durationSec > 0 ? (ms / totalDuration) * usable : 0);
    const pitchToY = (pitch: number) => {
      const range = Math.max(1, pitchRange.max - pitchRange.min);
      return height - 4 - ((pitch - pitchRange.min) / range) * (height - 8);
    };

    // Background
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.fillRect(0, 0, width, height);

    // Minute grid lines
    if (durationSec > 0) {
      const minutePx = (60 / durationSec) * usable;
      if (minutePx > 8) {
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.15)';
        ctx.lineWidth = 1;
        for (let sec = 60; sec < durationSec; sec += 60) {
          const x = timeToX(sec * 1000);
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
          ctx.stroke();
        }
      }
    }

    // Notes (pitch graph)
    for (const note of notes) {
      const x = timeToX(note.startTime);
      const w = Math.max(1.5, timeToX(note.startTime + note.duration) - x);
      const y = pitchToY(note.pitch);
      const h = 2.5;
      if (note.player === 'P2') ctx.fillStyle = 'rgba(168, 85, 247, 0.85)';
      else if (note.player === 'P1') ctx.fillStyle = 'rgba(34, 211, 238, 0.85)';
      else if (note.player === 'P4') ctx.fillStyle = 'rgba(16, 185, 129, 0.85)'; // emerald — matches dropdown
      else if (note.player === 'P8') ctx.fillStyle = 'rgba(249, 115, 22, 0.85)'; // orange — matches dropdown
      else if (note.isGolden) ctx.fillStyle = 'rgba(251, 191, 36, 0.9)';
      else if (note.isBonus) ctx.fillStyle = 'rgba(236, 72, 153, 0.85)';
      else ctx.fillStyle = 'rgba(6, 182, 212, 0.8)';
      ctx.fillRect(x, y - h / 2, w, h);
    }

    // Viewport rectangle (current timeline window)
    const viewX = (scrollOffset / Math.max(1, pixelsPerSecond * (totalDuration / 1000))) * usable;
    const viewW = (viewportWidth / Math.max(1, pixelsPerSecond * (totalDuration / 1000))) * usable;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.07)';
    ctx.fillRect(viewX, 0, viewW, height);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.lineWidth = 1;
    ctx.strokeRect(viewX + 0.5, 0.5, Math.max(2, viewW - 1), height - 1);

    // Playhead
    const px = timeToX(currentTime);
    ctx.strokeStyle = 'rgba(168, 85, 247, 0.95)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(px, 0);
    ctx.lineTo(px, height);
    ctx.stroke();
  }, [notes, width, height, totalDuration, scrollOffset, pixelsPerSecond, viewportWidth, currentTime, pitchRange]);

  // ── Pointer interaction: click/drag = seek + center the viewport ──
  const timeFromEvent = useCallback((clientX: number): number => {
    const canvas = canvasRef.current;
    if (!canvas) return 0;
    const rect = canvas.getBoundingClientRect();
    const frac = Math.max(0, Math.min(1, (clientX - rect.left) / Math.max(1, rect.width)));
    return frac * totalDuration;
  }, [totalDuration]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.stopPropagation();
    draggingRef.current = true;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    onScrub(timeFromEvent(e.clientX), true);
  }, [onScrub, timeFromEvent]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!draggingRef.current) return;
    e.stopPropagation();
    onScrub(timeFromEvent(e.clientX), true);
  }, [onScrub, timeFromEvent]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    draggingRef.current = false;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
  }, []);

  return (
    <div
      className="absolute bottom-0 left-0 right-0 ml-8 border-t border-slate-700 bg-slate-900 z-20"
      style={{ height }}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-pointer touch-none"
        style={{ width: '100%', height }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      />
    </div>
  );
}
