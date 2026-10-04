'use client';

import { useRef, useEffect } from 'react';
import { getSharedMediaSource } from '@/lib/audio/shared-media-source';

/**
 * Mini waveform visualization that renders real-time frequency bars
 * from an HTMLAudioElement using the Web Audio API AnalyserNode.
 *
 * Only mounts when a valid audio element is provided (i.e., during preview).
 * Renders ~24 bars in a small canvas at the bottom of the SongCard.
 *
 * R51/Bug2 — IMPORTANT: this component must NOT create its own
 * AudioContext/MediaElementSource for the preview element. Web Audio allows
 * only ONE createMediaElementSource() per element; a second call throws
 * InvalidStateError. The old private-context version therefore HIJACKED the
 * preview element and silently broke the loudness normalization boost path
 * (which needs createMediaElementSource for its GainNode) — and its own
 * graph (source → analyser → destination) bypassed the shared gain node.
 * Instead we tap the SHARED source (source → analyser, no destination
 * connection) provided by getSharedMediaSource() and only disconnect our
 * analyser on unmount — the shared context/graph stays alive.
 */
export function WaveformBar({ audio, isActive }: { audio: HTMLAudioElement | null; isActive: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const analyserRef = useRef<AnalyserNode | null>(null);

  useEffect(() => {
    if (!audio || !isActive || !canvasRef.current) {
      // Clean up previous analyser (never close the shared context!)
      if (analyserRef.current) { analyserRef.current.disconnect(); analyserRef.current = null; }
      return;
    }

    let cancelled = false;
    let analyser: AnalyserNode | null = null;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size once
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    void (async () => {
      // Shared graph: context + source + gain are owned by the shared cache
      // (also used by the loudness normalization). We only attach an analyser.
      let source: MediaElementAudioSourceNode;
      try {
        ({ source } = await getSharedMediaSource(audio));
      } catch {
        // Element already connected in a foreign context → no waveform, but
        // never break playback or the loudness graph.
        return;
      }
      if (cancelled) return;

      try {
        analyser = source.context.createAnalyser();
        analyser.fftSize = 64; // Small for performance — 32 frequency bins
        analyser.smoothingTimeConstant = 0.8;
        // Tap only: source → analyser. Do NOT connect to destination —
        // the shared source already feeds destination via its gain node.
        source.connect(analyser);
        analyserRef.current = analyser;
      } catch {
        return;
      }

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      const barCount = Math.min(bufferLength, 24);
      const barGap = 2;
      const totalGap = barGap * (barCount - 1);
      const barWidth = Math.max(1, (rect.width - totalGap) / barCount);

      const draw = () => {
        analyser!.getByteFrequencyData(dataArray);
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
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(animFrameRef.current);
      // M2: Disconnect our analyser tap on unmount to prevent resource leaks
      // when the song card disappears while active. The shared context and
      // its source/gain graph stay alive (owned by the shared cache).
      if (analyserRef.current) { analyserRef.current.disconnect(); analyserRef.current = null; }
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
