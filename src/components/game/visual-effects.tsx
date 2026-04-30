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
            ctx.fillStyle = '#FFD700';
            ctx.shadowBlur = 6;
            ctx.shadowColor = 'gold';
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
  // This prevents 60 React re-renders/sec from the physics setInterval.
  const particlesRef = useRef<Particle[]>([]);
  const particleIdRef = useRef(0);
  const [, forceRender] = useState(0); // trigger re-render only when needed

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
    emitParticles(x, y, 'spark', 8, { color: '#22D3EE', speed: 1.5 });
    emitParticles(x, y, 'star', 3, { color: '#FFD700', size: 12, life: 40 });
  }, [emitParticles]);

  const emitGoldenNote = useCallback((x: number, y: number) => {
    emitParticles(x, y, 'golden', 12, { color: '#FFD700', speed: 2, size: 10 });
    emitParticles(x, y, 'spark', 6, { color: '#FFA500', speed: 1.5 });
  }, [emitParticles]);

  const emitComboFirework = useCallback((x: number, y: number, combo: number) => {
    const intensity = Math.min(combo / 10, 3);
    const colors = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#95E1D3', '#F38181'];

    for (let burst = 0; burst < Math.ceil(intensity); burst++) {
      setTimeout(() => {
        const offsetX = (Math.random() - 0.5) * 100;
        const offsetY = (Math.random() - 0.5) * 50;
        emitParticles(
          x + offsetX,
          y + offsetY,
          'firework',
          Math.min(10 + combo, 25), // Cap total particles per burst
          {
            color: colors[Math.floor(Math.random() * colors.length)],
            speed: 2 + intensity,
            life: 60,
          }
        );
      }, burst * 150);
    }
  }, [emitParticles]);

  const emitConfetti = useCallback((x: number, y: number) => {
    const colors = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#95E1D3', '#AA96DA', '#FF9F43'];
    for (let i = 0; i < 30; i++) { // Reduced from 50
      setTimeout(() => {
        emitParticles(
          Math.random() * window.innerWidth,
          -20,
          'confetti',
          1,
          {
            color: colors[Math.floor(Math.random() * colors.length)],
            speed: 0.5,
            size: 10 + Math.random() * 10,
            life: 150,
          }
        );
      }, i * 30);
    }
  }, [emitParticles]);

  // Physics update loop: runs via rAF, mutates ref array in-place.
  // Re-renders are triggered at ~30fps (every other frame) to keep visuals
  // smooth without excessive React overhead.
  useEffect(() => {
    let frameCount = 0;
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

      // Trigger React re-render at ~30fps (every 2nd frame)
      frameCount++;
      if (frameCount % 2 === 0) {
        forceRender(n => n + 1);
      }

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => { if (animId) cancelAnimationFrame(animId); };
  }, []);

  // Expose a snapshot of particles for the canvas renderer
  const particles = particlesRef.current;

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
      return '#22D3EE';
    case 'golden':
      return '#FFD700';
    case 'firework':
      return '#FF6B6B';
    case 'star':
      return '#FFD700';
    case 'confetti':
      return '#4ECDC4';
    default:
      return '#FFFFFF';
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

    const animate = () => {
      timeRef.current += 0.016;
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

      // Disco lights effect (reduced from 5 to 3)
      const numLights = 3;
      for (let i = 0; i < numLights; i++) {
        const angle = (time * 0.5 + (i * Math.PI * 2) / numLights) % (Math.PI * 2);
        const x = canvas.width / 2 + Math.cos(angle) * 200;
        const y = canvas.height / 2 + Math.sin(angle) * 100;
        const radius = 150 + energy * 100;

        const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
        const hue = (i * 80 + time * 30) % 360;
        gradient.addColorStop(0, `hsla(${hue}, 100%, 50%, ${0.1 + energy * 0.1})`);
        gradient.addColorStop(1, 'transparent');

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // Floating particles (only while playing, reduced from 3 to 2 per frame)
      if (playing) {
        for (let i = 0; i < 2; i++) {
          const px = Math.random() * canvas.width;
          const py = canvas.height + 10;
          const size = 2 + Math.random() * 4;
          const hue = Math.random() * 360;

          ctx.beginPath();
          ctx.arc(px, py, size, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${hue}, 100%, 70%, 0.5)`;
          ctx.fill();
        }
      }

      // Rising particles animation (reduced from 20 to 12)
      const particleCount = 12;
      for (let i = 0; i < particleCount; i++) {
        const baseX = (i / particleCount) * canvas.width;
        const px = baseX + Math.sin(time + i) * 30;
        const py = canvas.height - ((time * 50 + i * 50) % canvas.height);
        const size = 2 + Math.sin(time + i) * 1;
        const alpha = 0.3 + Math.sin(time * 2 + i) * 0.2;

        ctx.beginPath();
        ctx.arc(px, py, size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(100, 200, 255, ${alpha})`;
        ctx.fill();
      }

      // Pulsing circles from center
      const pulseRadius = (time * 100) % 500;
      ctx.beginPath();
      ctx.arc(canvas.width / 2, canvas.height / 2, pulseRadius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(150, 100, 255, ${1 - pulseRadius / 500})`;
      ctx.lineWidth = 2;
      ctx.stroke();

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
      style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)' }}
    />
  );
}

// ===================== VOICE VISUALIZATION =====================

interface VoiceVisualizerProps {
  analyserData: number[]; // Frequency data from analyser
  volume: number; // 0-1
  isSinging: boolean;
  pitch?: number | null; // Detected pitch frequency
  position?: { x: number; y: number }; // Position on screen
  mode?: 'waveform' | 'spectrum' | 'circular';
}

export function VoiceVisualizer({
  analyserData,
  volume,
  isSinging,
  pitch,
  position = { x: 50, y: 50 },
  mode = 'spectrum',
}: VoiceVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 300;
    canvas.height = 150;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (!isSinging || analyserData.length === 0) {
        // Draw idle state
        ctx.strokeStyle = 'rgba(100, 200, 255, 0.3)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, canvas.height / 2);
        ctx.lineTo(canvas.width, canvas.height / 2);
        ctx.stroke();
        animationRef.current = requestAnimationFrame(draw);
        return;
      }

      if (mode === 'waveform') {
        // Waveform visualization
        ctx.beginPath();
        ctx.strokeStyle = `rgba(34, 211, 238, ${0.5 + volume * 0.5})`;
        ctx.lineWidth = 2;

        const sliceWidth = canvas.width / analyserData.length;
        let x = 0;

        for (let i = 0; i < analyserData.length; i++) {
          const v = analyserData[i] / 128.0;
          const y = (v * canvas.height) / 2;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }

          x += sliceWidth;
        }

        ctx.lineTo(canvas.width, canvas.height / 2);
        ctx.stroke();

        // Glow effect
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#22D3EE';
      } else if (mode === 'spectrum') {
        // Spectrum bars
        const barWidth = canvas.width / analyserData.length;
        const barSpacing = 2;

        for (let i = 0; i < analyserData.length; i++) {
          const barHeight = (analyserData[i] / 255) * canvas.height * volume;
          const x = i * (barWidth + barSpacing);
          const hue = (i / analyserData.length) * 60 + 180; // Cyan to blue

          // Gradient bar
          const gradient = ctx.createLinearGradient(x, canvas.height, x, canvas.height - barHeight);
          gradient.addColorStop(0, `hsla(${hue}, 100%, 50%, 0.8)`);
          gradient.addColorStop(1, `hsla(${hue}, 100%, 70%, 0.3)`);

          ctx.fillStyle = gradient;
          ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        }
      } else if (mode === 'circular') {
        // Circular visualizer
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const baseRadius = 30;

        for (let i = 0; i < analyserData.length; i++) {
          const angle = (i / analyserData.length) * Math.PI * 2;
          const amplitude = (analyserData[i] / 255) * 40 * volume;
          const radius = baseRadius + amplitude;

          const x1 = centerX + Math.cos(angle) * baseRadius;
          const y1 = centerY + Math.sin(angle) * baseRadius;
          const x2 = centerX + Math.cos(angle) * radius;
          const y2 = centerY + Math.sin(angle) * radius;

          const hue = (i / analyserData.length) * 60 + 180;
          ctx.strokeStyle = `hsla(${hue}, 100%, 60%, 0.8)`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        }

        // Center circle
        ctx.beginPath();
        ctx.arc(centerX, centerY, baseRadius * 0.8, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(34, 211, 238, 0.3)';
        ctx.fill();
      }

      // Pitch indicator
      if (pitch) {
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 14px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`${Math.round(pitch)} Hz`, canvas.width / 2, 20);
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [analyserData, volume, isSinging, pitch, mode]);

  return (
    <div
      className="absolute pointer-events-none z-20"
      style={{
        left: `${position.x}%`,
        top: `${position.y}%`,
        transform: 'translate(-50%, -50%)',
      }}
    >
      <canvas
        ref={canvasRef}
        className="rounded-lg"
        style={{
          boxShadow: isSinging ? '0 0 30px rgba(34, 211, 238, 0.3)' : 'none',
        }}
      />
    </div>
  );
}

// ===================== LIVE WAVEFORM (Microphone Input) =====================

interface LiveWaveformProps {
  audioStream?: MediaStream;
  isActive: boolean;
  color?: string;
  height?: number;
  className?: string;
}

export function LiveWaveform({
  audioStream,
  isActive,
  color = '#22D3EE',
  height = 60,
  className = '',
}: LiveWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | undefined>(undefined);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  useEffect(() => {
    if (!audioStream || !isActive) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Setup audio analysis
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }
    const audioContext = audioContextRef.current;

    if (!sourceRef.current) {
      sourceRef.current = audioContext.createMediaStreamSource(audioStream);
    }
    const source = sourceRef.current;

    // Disconnect previous analyser if stream changed
    if (analyserRef.current) {
      try { analyserRef.current.disconnect(); } catch {}
    }
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    source.connect(analyser);
    analyserRef.current = analyser;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    canvas.width = 400;
    canvas.height = height;

    const draw = () => {
      if (!analyserRef.current) return;

      analyser.getByteTimeDomainData(dataArray);

      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw waveform
      ctx.lineWidth = 2;
      ctx.strokeStyle = color;
      ctx.shadowBlur = 10;
      ctx.shadowColor = color;
      ctx.beginPath();

      const sliceWidth = canvas.width / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }

        x += sliceWidth;
      }

      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
      ctx.shadowBlur = 0;

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = undefined;
      }
      // Cleanup audio resources when component unmounts
      if (analyserRef.current) {
        try { analyserRef.current.disconnect(); } catch {}
        analyserRef.current = null;
      }
      if (sourceRef.current) {
        try { sourceRef.current.disconnect(); } catch {}
        sourceRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
    };
  }, [audioStream, isActive, color, height]);

  return (
    <canvas
      ref={canvasRef}
      className={`rounded-lg ${className}`}
      style={{ height: `${height}px` }}
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
          rgba(255, 100, 50, ${intensity * 0.3}) 0%,
          rgba(255, 50, 0, ${intensity * 0.2}) 30%,
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

    // Use shared source — avoids duplicate createMediaElementSource calls
    // (SpectrogramDisplay and other consumers use the same source node).
    const { context: audioContext, source } = getSharedMediaSource(audioElement);

    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    // Connect to destination so the audio element still produces sound
    // through the Web Audio graph after createMediaElementSource redirects it.
    analyser.connect(audioContext.destination);
    analyserRef.current = analyser;

    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    const updateEnergy = () => {
      if (!analyserRef.current) return;

      analyser.getByteFrequencyData(dataArray);

      // Calculate average energy in bass frequencies (first 1/4 of spectrum)
      let bassEnergy = 0;
      const bassRange = Math.floor(dataArray.length / 4);
      for (let i = 0; i < bassRange; i++) {
        bassEnergy += dataArray[i];
      }
      bassEnergy /= bassRange * 255;

      setEnergy((prev) => prev * 0.9 + bassEnergy * 0.1); // Smooth transition
    };

    // Reduced from 50ms to 100ms — less state updates, still smooth enough
    const interval = setInterval(updateEnergy, 100);

    return () => {
      clearInterval(interval);
      // Disconnect old analyser to prevent AudioNode leak.
      // Do NOT close the shared AudioContext — other consumers may still use it.
      try { analyser.disconnect(); } catch { /* already disconnected */ }
      analyserRef.current = null;
    };
  }, [audioElement]);

  return energy;
}
