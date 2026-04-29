'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import {
  PitchGraphRenderer,
  PitchGraphConfig,
  DEFAULT_PITCH_GRAPH_CONFIG,
} from '@/lib/game/pitch-graph';

export interface PitchGraphDisplayProps {
  currentPitch: number | null;
  targetPitch: number | null;
  currentTime: number;
  isPlaying: boolean;
  accuracy?: number;
  width?: number;
  height?: number;
  colorScheme?: 'default' | 'neon' | 'retro';
  showTargetLine?: boolean;
  minPitch?: number;
  maxPitch?: number;
}

/**
 * Pitch Graph Display Component
 * Uses the previously unused PitchGraphRenderer to show a real-time pitch curve.
 * Canvas resolution automatically adapts to container size and device pixel ratio.
 */
export function PitchGraphDisplay({
  currentPitch,
  targetPitch,
  currentTime,
  isPlaying,
  accuracy,
  width = 300,
  height = 100,
  colorScheme = 'neon',
  showTargetLine = true,
  minPitch = 48,
  maxPitch = 72,
}: PitchGraphDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<PitchGraphRenderer | null>(null);

  // Measure container and resize canvas to match (with devicePixelRatio)
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const displayWidth = Math.round(rect.width);
    const displayHeight = Math.round(rect.height);

    // Only resize if dimensions actually changed
    if (canvas.width !== displayWidth * dpr || canvas.height !== displayHeight * dpr) {
      canvas.width = displayWidth * dpr;
      canvas.height = displayHeight * dpr;
      canvas.style.width = `${displayWidth}px`;
      canvas.style.height = `${displayHeight}px`;

      // Update renderer with new logical dimensions
      const config: Partial<PitchGraphConfig> = {
        width: displayWidth,
        height: displayHeight,
        minPitch,
        maxPitch,
        showTargetLine,
        colorScheme,
        timeWindow: 5000,
      };
      rendererRef.current = new PitchGraphRenderer(config);
      rendererRef.current.attachCanvas(canvas, true);
      // Apply DPR scaling so the renderer draws at the right resolution
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.scale(dpr, dpr);
    }
  }, [minPitch, maxPitch, showTargetLine, colorScheme]);

  // Initialize and handle resize
  useEffect(() => {
    resizeCanvas();

    const observer = new ResizeObserver(resizeCanvas);
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      observer.disconnect();
      rendererRef.current?.destroy();
    };
  }, [resizeCanvas]);

  // Update pitch data
  useEffect(() => {
    if (!rendererRef.current || !isPlaying) return;

    // Add current pitch point
    if (currentPitch !== null) {
      rendererRef.current.addPoint(currentPitch, currentTime, false, accuracy);
    }

    // Add target pitch line if provided
    if (targetPitch !== null && showTargetLine) {
      rendererRef.current.addTargetNote(targetPitch, currentTime, 100);
    }

    // Render
    rendererRef.current.render(currentTime);
  }, [currentPitch, targetPitch, currentTime, isPlaying, accuracy, showTargetLine]);

  // Clear when not playing
  useEffect(() => {
    if (!isPlaying && rendererRef.current) {
      rendererRef.current.clear();
    }
  }, [isPlaying]);

  return (
    <div
      ref={containerRef}
      className="relative rounded-lg overflow-hidden bg-black/30 backdrop-blur-sm border border-white/10"
      style={{ width, height, minHeight: height }}
    >
      <canvas
        ref={canvasRef}
        className="block"
      />
      {/* Current pitch indicator */}
      <div className="absolute bottom-1 right-2 text-xs text-white/60">
        {currentPitch !== null ? `Pitch: ${currentPitch.toFixed(1)}` : 'No pitch detected'}
      </div>
    </div>
  );
}
