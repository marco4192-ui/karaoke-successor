'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

export interface Particle {
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

export function ParticleSystem({ particles }: ParticleSystemProps) {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-30">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute"
          style={{
            left: p.x,
            top: p.y,
            width: p.size,
            height: p.size,
            transform: `translate(-50%, -50%) rotate(${p.rotation || 0}deg)`,
            opacity: p.alpha * (p.life / p.maxLife),
          }}
        >
          {p.type === 'spark' && (
            <div
              className="w-full h-full rounded-full"
              style={{
                background: `radial-gradient(circle, ${p.color} 0%, transparent 70%)`,
                boxShadow: `0 0 ${p.size * 2}px ${p.color}`,
              }}
            />
          )}
          {p.type === 'golden' && (
            <div
              className="w-full h-full"
              style={{
                background: `linear-gradient(135deg, #FFD700, #FFA500)`,
                clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)',
                filter: 'drop-shadow(0 0 4px gold)',
              }}
            />
          )}
          {p.type === 'firework' && (
            <div
              className="w-full h-full rounded-sm"
              style={{
                background: p.color,
                boxShadow: `0 0 8px ${p.color}, 0 0 16px ${p.color}`,
              }}
            />
          )}
          {p.type === 'star' && (
            <div
              className="w-full h-full"
              style={{
                background: p.color,
                clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)',
              }}
            />
          )}
          {p.type === 'confetti' && (
            <div
              className="w-full h-full rounded-sm"
              style={{
                background: p.color,
                width: p.size * 0.4,
                height: p.size,
              }}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ===================== PARTICLE EMITTER HOOK =====================

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

export function useParticleEmitter() {
  const [particles, setParticles] = useState<Particle[]>([]);
  const particleIdRef = useRef(0);

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
    const newParticles: Particle[] = [];
    const spread = options?.spread ?? 1;
    const speed = options?.speed ?? 1;
    const size = options?.size ?? 8;
    const life = options?.life ?? 60;

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * spread;
      const velocity = (2 + Math.random() * 3) * speed;

      newParticles.push({
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

    setParticles((prev) => [...prev, ...newParticles]);
  }, []);

  const emitPerfectHit = useCallback((x: number, y: number) => {
    emitParticles(x, y, 'spark', 12, { color: '#22D3EE', speed: 1.5 });
    emitParticles(x, y, 'star', 4, { color: '#FFD700', size: 12, life: 40 });
  }, [emitParticles]);

  const emitGoldenNote = useCallback((x: number, y: number) => {
    emitParticles(x, y, 'golden', 20, { color: '#FFD700', speed: 2, size: 10 });
    emitParticles(x, y, 'spark', 10, { color: '#FFA500', speed: 1.5 });
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
          15 + combo,
          {
            color: colors[Math.floor(Math.random() * colors.length)],
            speed: 2 + intensity,
            life: 80,
          }
        );
      }, burst * 150);
    }
  }, [emitParticles]);

  const emitConfetti = useCallback((x: number, y: number) => {
    const colors = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#95E1D3', '#AA96DA', '#FF9F43'];
    for (let i = 0; i < 50; i++) {
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
            life: 200,
          }
        );
      }, i * 20);
    }
  }, [emitParticles]);

  // Update particles physics
  useEffect(() => {
    const interval = setInterval(() => {
      setParticles((prev) =>
        prev
          .map((p) => ({
            ...p,
            x: p.x + p.vx,
            y: p.y + p.vy,
            vy: p.vy + 0.15, // gravity
            vx: p.vx * 0.99, // friction
            life: p.life - 1,
            rotation: (p.rotation || 0) + (p.rotationSpeed || 0),
          }))
          .filter((p) => p.life > 0)
      );
    }, 16);

    return () => clearInterval(interval);
  }, []);

  return {
    particles,
    emitParticles,
    emitPerfectHit,
    emitGoldenNote,
    emitComboFirework,
    emitConfetti,
  };
}
