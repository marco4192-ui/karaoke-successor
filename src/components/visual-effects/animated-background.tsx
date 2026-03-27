'use client';

import { useEffect, useRef } from 'react';

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

  useEffect(() => {
    if (hasVideo) return; // Don't animate if video is playing

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

    // Background animation loop
    const animate = () => {
      timeRef.current += 0.016;
      const time = timeRef.current;

      // Clear with fade effect
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw background image if available
      if (hasBackgroundImage && backgroundImage) {
        const img = new Image();
        img.src = backgroundImage;
        // Draw with pulsing opacity
        ctx.globalAlpha = 0.3 + Math.sin(time * 0.5) * 0.1;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        ctx.globalAlpha = 1;
      }

      // Disco lights effect
      const numLights = 5;
      for (let i = 0; i < numLights; i++) {
        const angle = (time * 0.5 + (i * Math.PI * 2) / numLights) % (Math.PI * 2);
        const x = canvas.width / 2 + Math.cos(angle) * 200;
        const y = canvas.height / 2 + Math.sin(angle) * 100;
        const radius = 150 + songEnergy * 100;

        const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
        const hue = (i * 60 + time * 30) % 360;
        gradient.addColorStop(0, `hsla(${hue}, 100%, 50%, ${0.1 + songEnergy * 0.1})`);
        gradient.addColorStop(1, 'transparent');

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // Floating particles
      if (isPlaying) {
        for (let i = 0; i < 3; i++) {
          const x = Math.random() * canvas.width;
          const y = canvas.height + 10;
          const size = 2 + Math.random() * 4;
          const hue = Math.random() * 360;

          ctx.beginPath();
          ctx.arc(x, y, size, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${hue}, 100%, 70%, 0.5)`;
          ctx.fill();
        }
      }

      // Rising particles animation
      const particles = 20;
      for (let i = 0; i < particles; i++) {
        const baseX = (i / particles) * canvas.width;
        const x = baseX + Math.sin(time + i) * 30;
        const y = canvas.height - ((time * 50 + i * 50) % canvas.height);
        const size = 2 + Math.sin(time + i) * 1;
        const alpha = 0.3 + Math.sin(time * 2 + i) * 0.2;

        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
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
  }, [hasVideo, hasBackgroundImage, backgroundImage, songEnergy, isPlaying]);

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
