'use client';

import React, { useEffect, useRef, useState } from 'react';

interface MusicReactiveBackgroundProps {
  volume?: number; // 0-1 volume level
  isPlaying?: boolean;
  bpm?: number;
  intensity?: number; // 0-1, how reactive the background should be
}

// Music-reactive background animation that responds to audio volume
// Uses canvas-based particle effects for visual feedback
export function MusicReactiveBackground({ 
  volume = 0, 
  isPlaying = false, 
  bpm = 120,
  intensity = 1 
}: MusicReactiveBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const particlesRef = useRef<Array<{
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    color: string;
    life: number;
    maxLife: number;
  }>>([]);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    let lastTime = 0;
    const targetFPS = 60;
    const frameTime = 1000 / targetFPS;
    
    const animate = (currentTime: number) => {
      const deltaTime = currentTime - lastTime;
      
      if (deltaTime >= frameTime) {
        lastTime = currentTime - (deltaTime % frameTime);
        
        // Clear canvas with fade effect
        ctx.fillStyle = 'rgba(10, 10, 26, 0.1)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Add new particles based on volume
        if (isPlaying && volume > 0.05) {
          const particleCount = Math.floor(volume * 5 * intensity);
          
          for (let i = 0; i < particleCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = (0.5 + Math.random() * 2) * volume * intensity;
            const hue = (Date.now() / 50 + Math.random() * 60) % 360;
            
            particlesRef.current.push({
              x: canvas.width / 2 + (Math.random() - 0.5) * 200,
              y: canvas.height / 2 + (Math.random() - 0.5) * 200,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              size: 2 + Math.random() * 4 * volume,
              color: `hsla(${hue}, 80%, 60%, ${0.5 + volume * 0.5})`,
              life: 0,
              maxLife: 60 + Math.random() * 60,
            });
          }
        }
        
        // Add ambient particles even when not playing
        if (Math.random() < 0.1) {
          particlesRef.current.push({
            x: Math.random() * canvas.width,
            y: canvas.height + 10,
            vx: (Math.random() - 0.5) * 0.5,
            vy: -0.5 - Math.random() * 1.5,
            size: 1 + Math.random() * 2,
            color: `hsla(${200 + Math.random() * 60}, 70%, 50%, 0.3)`,
            life: 0,
            maxLife: 200 + Math.random() * 200,
          });
        }
        
        // Update and draw particles
        particlesRef.current = particlesRef.current.filter(p => {
          p.life++;
          p.x += p.vx;
          p.y += p.vy;
          
          if (p.life >= p.maxLife) return false;
          
          const alpha = 1 - (p.life / p.maxLife);
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
          ctx.fillStyle = p.color.replace(/[\d.]+\)$/, `${alpha})`);
          ctx.fill();
          
          return true;
        });
        
        // Draw center glow based on volume
        if (isPlaying && volume > 0.1) {
          const gradient = ctx.createRadialGradient(
            canvas.width / 2, canvas.height / 2, 0,
            canvas.width / 2, canvas.height / 2, 150 + volume * 100
          );
          gradient.addColorStop(0, `rgba(34, 211, 238, ${volume * 0.2 * intensity})`);
          gradient.addColorStop(0.5, `rgba(139, 92, 246, ${volume * 0.1 * intensity})`);
          gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        
        // Draw beat pulse effect based on BPM
        if (isPlaying && bpm > 0) {
          const beatPhase = (Date.now() / 1000) * (bpm / 60) * Math.PI * 2;
          const beatIntensity = (Math.sin(beatPhase) + 1) / 2;
          
          if (beatIntensity > 0.9) {
            ctx.beginPath();
            ctx.arc(
              canvas.width / 2, 
              canvas.height / 2, 
              50 + beatIntensity * 100, 
              0, 
              Math.PI * 2
            );
            ctx.strokeStyle = `rgba(34, 211, 238, ${(beatIntensity - 0.9) * 3})`;
            ctx.lineWidth = 2;
            ctx.stroke();
          }
        }
      }
      
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, bpm, intensity, volume]);
  
  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ background: 'linear-gradient(135deg, #0a0a1a 0%, #1a1a2e 50%, #16213e 100%)' }}
    />
  );
}

// Simpler animated gradient background for lower-end systems
export function AnimatedGradientBackground({ 
  volume = 0, 
  isPlaying = false,
  bpm = 120 
}: MusicReactiveBackgroundProps) {
  const [offset, setOffset] = useState(0);
  
  useEffect(() => {
    if (!isPlaying) return;
    
    const interval = setInterval(() => {
      setOffset(prev => (prev + 0.5) % 360);
    }, 50);
    
    return () => clearInterval(interval);
  }, [isPlaying]);
  
  const hue1 = (offset) % 360;
  const hue2 = (offset + 120) % 360;
  const hue3 = (offset + 240) % 360;
  
  return (
    <div 
      className="absolute inset-0 w-full h-full"
      style={{
        background: `linear-gradient(${offset}deg, 
          hsl(${hue1}, 70%, 15%) 0%, 
          hsl(${hue2}, 60%, 10%) 50%, 
          hsl(${hue3}, 50%, 8%) 100%
        )`,
        transition: 'background 0.3s ease',
      }}
    >
      {/* Animated overlay based on volume */}
      {isPlaying && volume > 0.1 && (
        <div 
          className="absolute inset-0"
          style={{
            background: `radial-gradient(circle at 50% 50%, 
              rgba(34, 211, 238, ${volume * 0.15}) 0%, 
              transparent 50%
            )`,
          }}
        />
      )}
    </div>
  );
}
