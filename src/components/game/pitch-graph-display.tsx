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
 * Uses the previously unused PitchGraphRenderer to show a real-time pitch curve
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
  const rendererRef = useRef<PitchGraphRenderer | null>(null);

  // Initialize renderer
  useEffect(() => {
    if (!canvasRef.current) return;

    const config: Partial<PitchGraphConfig> = {
      width,
      height,
      minPitch,
      maxPitch,
      showTargetLine,
      colorScheme,
      timeWindow: 5000, // 5 seconds of history
    };

    rendererRef.current = new PitchGraphRenderer(config);
    rendererRef.current.attachCanvas(canvasRef.current);

    return () => {
      rendererRef.current?.destroy();
    };
  }, [width, height, minPitch, maxPitch, showTargetLine, colorScheme]);

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
    <div className="relative rounded-lg overflow-hidden bg-black/30 backdrop-blur-sm border border-white/10">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="w-full h-full"
      />
      {/* Current pitch indicator */}
      <div className="absolute bottom-1 right-2 text-xs text-white/60">
        {currentPitch !== null ? `Pitch: ${currentPitch.toFixed(1)}` : 'No pitch detected'}
      </div>
    </div>
  );
}

/**
 * Hook to use the pitch graph renderer directly
 */
export function usePitchGraphRenderer(config?: Partial<PitchGraphConfig>) {
  const rendererRef = useRef<PitchGraphRenderer | null>(null);

  const initialize = useCallback((canvas: HTMLCanvasElement) => {
    const finalConfig = { ...DEFAULT_PITCH_GRAPH_CONFIG, ...config };
    rendererRef.current = new PitchGraphRenderer(finalConfig);
    rendererRef.current.attachCanvas(canvas);
  }, [config]);

  const addPoint = useCallback((pitch: number | null, time: number, isTarget: boolean, accuracy?: number) => {
    rendererRef.current?.addPoint(pitch, time, isTarget, accuracy);
  }, []);

  const addTargetNote = useCallback((pitch: number, startTime: number, duration: number) => {
    rendererRef.current?.addTargetNote(pitch, startTime, duration);
  }, []);

  const render = useCallback((currentTime: number) => {
    rendererRef.current?.render(currentTime);
  }, []);

  const clear = useCallback(() => {
    rendererRef.current?.clear();
  }, []);

  const destroy = useCallback(() => {
    rendererRef.current?.destroy();
    rendererRef.current = null;
  }, []);

  return {
    initialize,
    addPoint,
    addTargetNote,
    render,
    clear,
    destroy,
  };
}
