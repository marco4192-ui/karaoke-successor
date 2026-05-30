'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { getSharedMediaSource } from '@/lib/audio/shared-media-source';

// ===================== PARTICLE SYSTEM (Canvas-based) =====================

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  type: 'spark' | 'golden' | 'firework' | 'star' | 'confetti';
  rotation?: number;
  rotationSpeed?: number;
}

interface ParticleSystemProps {
  particles: Particle[];
}

/**
 * Canvas-based particle renderer. Renders all particles on a single <canvas>
 * element instead of creating individual DOM nodes per particle. This is
 * significantly faster — especially when 50+ particles are active during
 * combo firework bursts.
 */
export const ParticleSystem = React.memo(function ParticleSystem({ particles }: ParticleSystemProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    // Resize to window (only on change)
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    let animating = true;

    const draw = () => {
      if (!animating) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const lifeRatio = p.life / p.maxLife;
        const alpha = p.alpha * lifeRatio;

        if (alpha <= 0.01) continue;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(p.x, p.y);
        ctx.rotate(((p.rotation || 0) * Math.PI) / 180);

        switch (p.type) {
          case 'spark': {
            // Glowing circle
            const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, p.size);
            grad.addColorStop(0, p.color);
            grad.addColorStop(0.7, 'transparent');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(0, 0, p.size, 0, Math.PI * 2);
            ctx.fill();
            break;
          }
          case 'golden': {
            // Star shape
            drawStar(ctx, 0, 0, 5, p.size * 0.5, p.size * 0.25);
            ctx.fillStyle = '#FDE601';
            ctx.shadowBlur = 6;
            ctx.shadowColor = '#FDE601';
            ctx.fill();
            ctx.shadowBlur = 0;
            break;
          }
          case 'firework': {
            // Glowing square
            ctx.fillStyle = p.color;
            ctx.shadowBlur = 8;
            ctx.shadowColor = p.color;
            ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
            ctx.shadowBlur = 0;
            break;
          }
          case 'star': {
            drawStar(ctx, 0, 0, 5, p.size * 0.5, p.size * 0.2);
            ctx.fillStyle = p.color;
            ctx.fill();
            break;
          }
          case 'confetti': {
            // Rectangle
            ctx.fillStyle = p.color;
            ctx.fillRect(-p.size * 0.2, -p.size * 0.5, p.size * 0.4, p.size);
            break;
          }
        }

        ctx.restore();
      }

      frameRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      animating = false;
      window.removeEventListener('resize', resize);
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [particles]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none z-30"
      style={{ width: '100%', height: '100%' }}
    />
  );
});

/** Draw a star path on a 2D context. */
function drawStar(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number,
  spikes: number,
  outerRadius: number,
  innerRadius: number,
) {
  let rot = (Math.PI / 2) * 3;
  const step = Math.PI / spikes;
  ctx.beginPath();
  ctx.moveTo(cx, cy - outerRadius);
  for (let i = 0; i < spikes; i++) {
    ctx.lineTo(cx + Math.cos(rot) * outerRadius, cy + Math.sin(rot) * outerRadius);
    rot += step;
    ctx.lineTo(cx + Math.cos(rot) * innerRadius, cy + Math.sin(rot) * innerRadius);
    rot += step;
  }
  ctx.lineTo(cx, cy - outerRadius);
  ctx.closePath();
}

// ===================== PARTICLE EMITTER =====================

export function useParticleEmitter() {
  // Use ref-based particle array — physics runs outside React render cycle.
  // The ParticleSystem canvas reads directly from particlesRef.current via its
  // own rAF loop, so NO React re-render is needed to propagate particle updates.
  const particlesRef = useRef<Particle[]>([]);
  const particleIdRef = useRef(0);
  // Track pending setTimeout IDs so we can clear them on unmount.
  // Without this, emitComboFirework / emitConfetti timers keep firing
  // after the component is gone, potentially calling stale emitParticles.
  const pendingTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const activeRef = useRef(true);

  const emitParticles = useCallback((
    x: number,
    y: number,
    type: Particle['type'],
    count: number,
    options?: {
      color?: string;
      spread?: number;
      speed?: number;
      size?: number;
      life?: number;
    }
  ) => {
    // Guard: if component unmounted, skip emission (pending timers may still fire)
    if (!activeRef.current) return;
    const spread = options?.spread ?? 1;
    const speed = options?.speed ?? 1;
    const size = options?.size ?? 8;
    const life = options?.life ?? 60;

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * spread;
      const velocity = (2 + Math.random() * 3) * speed;

      particlesRef.current.push({
        id: particleIdRef.current++,
        x,
        y,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity - 2,
        size: size + Math.random() * 4,
        color: options?.color ?? getDefaultColor(type),
        alpha: 1,
        life,
        maxLife: life,
        type,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 10,
      });
    }
  }, []);

  const emitPerfectHit = useCallback((x: number, y: number) => {
    emitParticles(x, y, 'spark', 14, { color: '#00F3B2', speed: 1.8 });
    emitParticles(x, y, 'star', 5, { color: '#FDE601', size: 14, life: 50 });
    emitParticles(x, y, 'golden', 4, { color: '#6B2E77', speed: 1.2, size: 8 });
  }, [emitParticles]);

  const emitGoldenNote = useCallback((x: number, y: number) => {
    emitParticles(x, y, 'golden', 18, { color: '#FDE601', speed: 2.2, size: 12 });
    emitParticles(x, y, 'spark', 10, { color: '#FC6B48', speed: 1.8 });
    emitParticles(x, y, 'firework', 6, { color: '#FDE601', speed: 1.5, size: 6, life: 45 });
  }, [emitParticles]);

  const emitComboFirework = useCallback((x: number, y: number, combo: number) => {
    const intensity = Math.min(combo / 10, 3);
    const colors = ['#F939A3', '#00F3B2', '#FDE601', '#BA279D', '#FC6B48'];

    for (let burst = 0; burst < Math.ceil(intensity); burst++) {
      const id = setTimeout(() => {
        // Remove this timer from tracking
        pendingTimersRef.current = pendingTimersRef.current.filter(t => t !== id);
        if (!activeRef.current) return;
        const offsetX = (Math.random() - 0.5) * 100;
        const offsetY = (Math.random() - 0.5) * 50;
        emitParticles(
          x + offsetX,
          y + offsetY,
          'firework',
          Math.min(15 + combo, 35), // More particles per burst
          {
            color: colors[Math.floor(Math.random() * colors.length)],
            speed: 2.5 + intensity,
            life: 70,
          }
        );
      }, burst * 150);
      pendingTimersRef.current.push(id);
    }
  }, [emitParticles]);

  const emitConfetti = useCallback((_x: number, _y: number) => {
    const colors = ['#F939A3', '#00F3B2', '#FDE601', '#BA279D', '#6B2E77', '#FC6B48'];
    for (let i = 0; i < 50; i++) {
      const id = setTimeout(() => {
        pendingTimersRef.current = pendingTimersRef.current.filter(t => t !== id);
        if (!activeRef.current) return;
        emitParticles(
          Math.random() * window.innerWidth,
          -20,
          'confetti',
          1,
          {
            color: colors[Math.floor(Math.random() * colors.length)],
            speed: 0.6,
            size: 10 + Math.random() * 12,
            life: 180,
          }
        );
      }, i * 30);
      pendingTimersRef.current.push(id);
    }
  }, [emitParticles]);

  // Physics update loop: runs via rAF, mutates ref array in-place.
  // No React re-render is triggered — the ParticleSystem canvas reads from
  // particlesRef.current directly in its own rAF draw loop.
  useEffect(() => {
    let animId: number | undefined;

    const tick = () => {
      const arr = particlesRef.current;
      let writeIdx = 0;

      for (let i = 0; i < arr.length; i++) {
        const p = arr[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.15; // gravity
        p.vx *= 0.99; // friction
        p.life -= 1;
        p.rotation = (p.rotation || 0) + (p.rotationSpeed || 0);

        if (p.life > 0) {
          arr[writeIdx++] = p;
        }
      }
      arr.length = writeIdx; // trim dead particles

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => {
      if (animId) cancelAnimationFrame(animId);
      // M1: Clear any pending emission timers to prevent post-unmount fires
      activeRef.current = false;
      for (const t of pendingTimersRef.current) clearTimeout(t);
      pendingTimersRef.current = [];
    };
  }, []);

  // Expose a snapshot of particles for the canvas renderer
  // eslint-disable-next-line react-hooks/refs -- animation hook: imperative canvas reads ref without triggering React re-renders
  const particles = particlesRef.current;

  // eslint-disable-next-line react-hooks/refs -- particles ref consumed by imperative canvas renderer, not JSX
  return {
    particles,
    emitParticles,
    emitPerfectHit,
    emitGoldenNote,
    emitComboFirework,
    emitConfetti,
  };
}

function getDefaultColor(type: Particle['type']): string {
  switch (type) {
    case 'spark':
      return '#00F3B2';
    case 'golden':
      return '#FDE601';
    case 'firework':
      return '#F939A3';
    case 'star':
      return '#FDE601';
    case 'confetti':
      return '#00F3B2';
    default:
      return '#FDFEFD';
  }
}

// ===================== ANIMATED BACKGROUND =====================

interface AnimatedBackgroundProps {
  hasVideo: boolean;
  hasBackgroundImage?: boolean;
  backgroundImage?: string;
  songEnergy?: number; // 0-1, affects intensity
  isPlaying: boolean;
}

export function AnimatedBackground({
  hasVideo,
  hasBackgroundImage,
  backgroundImage,
  songEnergy = 0.5,
  isPlaying,
}: AnimatedBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | undefined>(undefined);
  const timeRef = useRef(0);
  // Store songEnergy in a ref to avoid recreating the animation loop
  const songEnergyRef = useRef(songEnergy);
  const isPlayingRef = useRef(isPlaying);
  const bgImageRef = useRef<HTMLImageElement | null>(null);

  // Keep refs in sync without restarting the animation loop
  useEffect(() => { songEnergyRef.current = songEnergy; }, [songEnergy]);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);

  // Reset bgImageRef when backgroundImage changes so the new image gets loaded
  useEffect(() => {
    bgImageRef.current = null;
  }, [backgroundImage]);

  useEffect(() => {
    if (hasVideo) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Preload background image once (not every frame)
    if (hasBackgroundImage && backgroundImage && !bgImageRef.current) {
      const img = new Image();
      img.src = backgroundImage;
      img.onload = () => { bgImageRef.current = img; };
    }

    let frameCount = 0;

    const animate = () => {
      // Throttle to ~30fps (every 2nd frame) — background effects don't need 60fps.
    // DO-NOT-CHANGE: Canvas animations are the heaviest per-frame work in the game loop.
    // Running at 60fps here doubles CPU usage vs 30fps with no visible quality
    // difference (particles are blurred/faded by design). If you increase this, you
    // MUST profile — the combined rAF loops (game loop + pitch + particles + this)
    // can easily exceed the 16ms frame budget.
      frameCount++;
      if (frameCount % 2 !== 0) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }

      timeRef.current += 0.032; // ~30fps → double time step to maintain animation speed
      const time = timeRef.current;
      const energy = songEnergyRef.current;
      const playing = isPlayingRef.current;

      // Clear with fade effect
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw preloaded background image
      if (bgImageRef.current) {
        ctx.globalAlpha = 0.3 + Math.sin(time * 0.5) * 0.1;
        ctx.drawImage(bgImageRef.current, 0, 0, canvas.width, canvas.height);
        ctx.globalAlpha = 1;
      }

      // Disco lights effect (5 lights for richer visuals)
      const numLights = 5;
      for (let i = 0; i < numLights; i++) {
        const angle = (time * 0.5 + (i * Math.PI * 2) / numLights) % (Math.PI * 2);
        const x = canvas.width / 2 + Math.cos(angle) * 200;
        const y = canvas.height / 2 + Math.sin(angle) * 100;
        const radius = 150 + energy * 100;

        const comicColors = ['#F939A3', '#00F3B2', '#FDE601', '#BA279D', '#FC6B48'];
        const comicAlpha = 0.1 + energy * 0.1;
        ctx.fillStyle = comicColors[i % comicColors.length];
        ctx.globalAlpha = comicAlpha;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      // Floating particles (only while playing, 4 per frame)
      if (playing) {
        for (let i = 0; i < 4; i++) {
          const px = Math.random() * canvas.width;
          const py = canvas.height + 10;
          const size = 2 + Math.random() * 4;
          const comicParticleColors = ['#F939A3', '#00F3B2', '#FDE601', '#BA279D', '#FC6B48', '#6B2E77'];
          ctx.beginPath();
          ctx.arc(px, py, size, 0, Math.PI * 2);
          ctx.fillStyle = comicParticleColors[Math.floor(Math.random() * comicParticleColors.length)];
          ctx.globalAlpha = 0.6;
          ctx.fill();
          ctx.globalAlpha = 1;
        }
      }

      // Rising particles animation (25 columns)
      const particleCount = 25;
      for (let i = 0; i < particleCount; i++) {
        const baseX = (i / particleCount) * canvas.width;
        const px = baseX + Math.sin(time + i) * 30;
        const py = canvas.height - ((time * 50 + i * 50) % canvas.height);
        const size = 2 + Math.sin(time + i) * 1;
        const alpha = 0.3 + Math.sin(time * 2 + i) * 0.2;

        ctx.beginPath();
        ctx.arc(px, py, size, 0, Math.PI * 2);
        const risingColors = ['#F939A3', '#00F3B2', '#FDE601', '#BA279D', '#FC6B48'];
        ctx.fillStyle = risingColors[i % risingColors.length];
        ctx.globalAlpha = alpha;
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      // Pulsing circles from center (3 rings)
      for (let r = 0; r < 3; r++) {
        const pulseRadius = ((time * 100) + r * 170) % 510;
        const alpha = (1 - pulseRadius / 510) * (1 - r * 0.3);
        ctx.beginPath();
        ctx.arc(canvas.width / 2, canvas.height / 2, pulseRadius, 0, Math.PI * 2);
        const ringColors = ['#F939A3', '#00F3B2', '#BA279D'];
        ctx.strokeStyle = ringColors[r % ringColors.length];
        ctx.lineWidth = 3;
        ctx.globalAlpha = alpha;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [hasVideo, hasBackgroundImage, backgroundImage]);

  if (hasVideo) {
    return null;
  }

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ background: '#1a0a2e' }}
    />
  );
}

// ===================== COMBO FIRE EFFECT =====================

interface ComboFireEffectProps {
  combo: number;
  isLarge?: boolean;
}

export function ComboFireEffect({ combo, isLarge = false }: ComboFireEffectProps) {
  const intensity = Math.min(combo / 20, 1);
  const size = isLarge ? 200 : 100;

  if (combo < 5) return null;

  return (
    <div
      className="absolute pointer-events-none"
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle,
          rgba(249, 57, 163, ${intensity * 0.3}) 0%,
          rgba(186, 39, 157, ${intensity * 0.2}) 30%,
          transparent 70%)`,
        filter: `blur(${10 + intensity * 20}px)`,
        animation: 'pulse 0.5s ease-in-out infinite',
      }}
    />
  );
}

// ===================== SONG ENERGY DETECTOR =====================

export function useSongEnergy(audioRef?: React.RefObject<HTMLAudioElement | null>) {
  const [energy, setEnergy] = useState(0.5);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  // Sync ref.current into state so the effect re-runs when the element appears
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync
    setAudioElement(audioRef?.current ?? null);
    // Check periodically until element is available (audio loads async)
    if (!audioRef?.current) {
      const check = setInterval(() => {
        if (audioRef?.current) {
          setAudioElement(audioRef.current);
          clearInterval(check);
        }
      }, 200);
      return () => clearInterval(check);
    }
  }, [audioRef]);

  useEffect(() => {
    if (!audioElement) return;

    let cancelled = false;
    let analyser: AnalyserNode | null = null;
    let rafId: number | undefined;
    let lastEnergyTime = 0;

    const init = async () => {
      try {
        // Use shared source — avoids duplicate createMediaElementSource calls.
        // getSharedMediaSource connects source → destination once, so we
        // only need to tap the signal with our analyser.
        const { source } = await getSharedMediaSource(audioElement);
        if (cancelled) return;

        analyser = source.context.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        // Do NOT connect analyser → destination — getSharedMediaSource already
        // connected source → destination. Connecting again would duplicate audio.
        analyserRef.current = analyser;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const updateEnergy = (timestamp: number) => {
          if (cancelled) return;
          // DO-NOT-CHANGE: Using rAF instead of setInterval(100) to synchronize with
          // the display refresh rate. setInterval fires at arbitrary points within a frame,
          // causing visual jitter when the energy value updates mid-frame. ~10fps (100ms
          // throttle) is sufficient for background reactivity — no need for higher rate.
          if (timestamp - lastEnergyTime >= 100) {
            lastEnergyTime = timestamp;
            if (analyserRef.current) {
              analyserRef.current.getByteFrequencyData(dataArray);

              // Calculate average energy in bass frequencies (first 1/4 of spectrum)
              let bassEnergy = 0;
              const bassRange = Math.floor(dataArray.length / 4);
              for (let i = 0; i < bassRange; i++) {
                bassEnergy += dataArray[i];
              }
              bassEnergy /= bassRange * 255;

              setEnergy((prev) => prev * 0.9 + bassEnergy * 0.1); // Smooth transition
            }
          }
          rafId = requestAnimationFrame(updateEnergy);
        };

        rafId = requestAnimationFrame(updateEnergy);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('[useSongEnergy] Failed to initialize:', error);
      }
    };

    init();

    return () => {
      cancelled = true;
      if (rafId !== undefined) cancelAnimationFrame(rafId);
      // Disconnect old analyser to prevent AudioNode leak.
      // Do NOT close the shared AudioContext — other consumers may still use it.
      if (analyser) {
        try { analyser.disconnect(); } catch { /* already disconnected */ }
      }
      analyserRef.current = null;
    };
  }, [audioElement]);

  return energy;
}
