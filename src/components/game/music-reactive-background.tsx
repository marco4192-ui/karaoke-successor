'use client';

import { useEffect, useRef } from 'react';

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
  const volumeRef = useRef(volume);
  const intensityRef = useRef(intensity);
  const isPlayingRef = useRef(isPlaying);
  const bpmRef = useRef(bpm);

  // Keep refs in sync with props
  volumeRef.current = volume;
  intensityRef.current = intensity;
  isPlayingRef.current = isPlaying;
  bpmRef.current = bpm;

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
        if (isPlayingRef.current && volumeRef.current > 0.05) {
          const vol = volumeRef.current;
          const inten = intensityRef.current;
          const particleCount = Math.floor(vol * 5 * inten);

          for (let i = 0; i < particleCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = (0.5 + Math.random() * 2) * vol * inten;
            const hue = (Date.now() / 50 + Math.random() * 60) % 360;
            
            particlesRef.current.push({
              x: canvas.width / 2 + (Math.random() - 0.5) * 200,
              y: canvas.height / 2 + (Math.random() - 0.5) * 200,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              size: 2 + Math.random() * 4 * vol,
              color: `hsla(${hue}, 80%, 60%, ${0.5 + vol * 0.5})`,
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
        if (isPlayingRef.current && volumeRef.current > 0.1) {
          const vol = volumeRef.current;
          const inten = intensityRef.current;
          const gradient = ctx.createRadialGradient(
            canvas.width / 2, canvas.height / 2, 0,
            canvas.width / 2, canvas.height / 2, 150 + vol * 100
          );
          gradient.addColorStop(0, `rgba(34, 211, 238, ${vol * 0.2 * inten})`);
          gradient.addColorStop(0.5, `rgba(139, 92, 246, ${vol * 0.1 * inten})`);
          gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        // Draw beat pulse effect based on BPM
        if (isPlayingRef.current && bpmRef.current > 0) {
          const beatPhase = (Date.now() / 1000) * (bpmRef.current / 60) * Math.PI * 2;
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
  }, []); // Only set up once — all dynamic values are read from refs
  
  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ background: 'linear-gradient(135deg, #0a0a1a 0%, #1a1a2e 50%, #16213e 100%)' }}
    />
  );
}
