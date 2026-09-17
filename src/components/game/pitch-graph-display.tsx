'use client';

import { useEffect, useRef, useCallback } from 'react';
import {
  PitchGraphRenderer,
  PitchGraphConfig,
} from '@/lib/game/pitch-graph';
import { useTranslation } from '@/lib/i18n/translations';

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
  const { t } = useTranslation();

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
      // Destroy previous renderer before creating a new one
      rendererRef.current?.destroy();
      rendererRef.current = new PitchGraphRenderer(config);
      rendererRef.current.attachCanvas(canvas, true);
      // Apply DPR scaling — use setTransform to avoid cumulative scaling on resize
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
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
      {/* Current pitch indicator — status chip with live dot */}
      <div
        className={`absolute bottom-1.5 right-2 flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium border backdrop-blur-sm ${
          currentPitch !== null
            ? 'bg-cyan-500/15 border-cyan-400/30 text-cyan-300'
            : 'bg-white/5 border-white/10 text-white/45'
        }`}
        data-testid="pitch-status-chip"
      >
        <span
          className={`inline-block w-1.5 h-1.5 rounded-full ${currentPitch !== null ? 'bg-cyan-400 animate-pulse' : 'bg-white/30'}`}
          aria-hidden="true"
        />
        {currentPitch !== null ? t('pitchGraph.pitch').replace('{n}', currentPitch.toFixed(1)) : t('pitchGraph.noPitch')}
      </div>
    </div>
  );
}
