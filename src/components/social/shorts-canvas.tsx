'use client';

import { useCallback, useEffect, useRef } from 'react';
import { RATING_HEX_COLORS } from '@/lib/game/rating-utils';
import { useTranslation } from '@/lib/i18n/translations';
import type { Song, HighscoreEntry } from '@/types/game';
import { VIDEO_STYLES, type VideoStyle, type CameraPosition } from './shorts-types';

// ---------------------------------------------------------------------------
// useCanvasRenderer – draws animated / static frames on a <canvas>
// ---------------------------------------------------------------------------

interface UseCanvasRendererParams {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  cameraVideoRef: React.RefObject<HTMLVideoElement | null>;
  song: Song;
  score: HighscoreEntry;
  style: VideoStyle;
  cameraPosition: CameraPosition;
  hasCamera: boolean;
  isRecording: boolean;
  duration: number;
  recordingStartTime: number;
  /** Called with 0–100 to report recording progress (throttled internally). */
  onProgress?: (percent: number) => void;
}

export function useCanvasRenderer({
  canvasRef,
  cameraVideoRef,
  song,
  score,
  style,
  cameraPosition,
  hasCamera,
  isRecording,
  duration,
  recordingStartTime,
  onProgress,
}: UseCanvasRendererParams): void {
  const { t } = useTranslation();
  const styleConfig = VIDEO_STYLES.find(s => s.id === style) || VIDEO_STYLES[0];
  const progressLastUpdateRef = useRef(0);

  const drawFrame = useCallback((timestamp: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Background
    if (styleConfig.bg.startsWith('linear-gradient')) {
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, '#667eea');
      gradient.addColorStop(1, '#764ba2');
      ctx.fillStyle = gradient;
    } else {
      ctx.fillStyle = styleConfig.bg;
    }
    ctx.fillRect(0, 0, width, height);

    // Animated background particles
    ctx.globalAlpha = 0.3;
    for (let i = 0; i < 20; i++) {
      const x = (Math.sin(timestamp / 1000 + i) * 0.5 + 0.5) * width;
      const y = (Math.cos(timestamp / 800 + i * 2) * 0.5 + 0.5) * height;
      ctx.beginPath();
      ctx.arc(x, y, 20 + Math.sin(timestamp / 500 + i) * 10, 0, Math.PI * 2);
      ctx.fillStyle = styleConfig.accent;
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Draw camera feed (PiP or fullscreen)
    if (hasCamera && cameraPosition !== 'none' && cameraVideoRef.current) {
      const camVideo = cameraVideoRef.current;

      if (cameraPosition === 'fullscreen') {
        // Full screen camera with overlay
        ctx.globalAlpha = 0.9;
        ctx.drawImage(camVideo, 0, 0, width, height);
        ctx.globalAlpha = 1;

        // Dark overlay for text readability
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(0, height - 300, width, 300);
      } else {
        // Picture-in-Picture
        const pipWidth = 280;
        const pipHeight = 500;
        const margin = 20;

        let pipX = margin;
        let pipY = margin;

        switch (cameraPosition) {
          case 'pip-top-right':
            pipX = width - pipWidth - margin;
            break;
          case 'pip-bottom-left':
            pipY = height - pipHeight - margin;
            break;
          case 'pip-bottom-right':
            pipX = width - pipWidth - margin;
            pipY = height - pipHeight - margin;
            break;
        }

        // PiP border
        ctx.fillStyle = styleConfig.accent;
        ctx.beginPath();
        ctx.roundRect(pipX - 4, pipY - 4, pipWidth + 8, pipHeight + 8, 20);
        ctx.fill();

        // PiP video
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(pipX, pipY, pipWidth, pipHeight, 16);
        ctx.clip();
        ctx.drawImage(camVideo, pipX, pipY, pipWidth, pipHeight);
        ctx.restore();
      }
    }

    // Score circle (skip if fullscreen camera)
    if (cameraPosition !== 'fullscreen') {
      const scoreScale = 1 + Math.sin(timestamp / 200) * 0.05;
      ctx.save();
      ctx.translate(width / 2, height / 3);
      ctx.scale(scoreScale, scoreScale);

      // Outer ring
      ctx.strokeStyle = styleConfig.accent;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, 120, 0, Math.PI * 2);
      ctx.stroke();

      // Score text
      ctx.fillStyle = styleConfig.accent;
      ctx.font = 'bold 80px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(score.score.toLocaleString(), 0, 0);

      ctx.restore();
    } else {
      // Smaller score for fullscreen camera mode
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 60px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(score.score.toLocaleString(), width / 2, height - 200);
    }

    // Song title
    ctx.fillStyle = style === 'minimal' ? '#000000' : '#ffffff';
    ctx.font = 'bold 36px Arial, sans-serif';
    ctx.textAlign = 'center';

    const titleY = cameraPosition === 'fullscreen' ? height - 140 : height / 2 + 60;
    ctx.fillText(song.title.substring(0, 20), width / 2, titleY);

    ctx.fillStyle = style === 'minimal' ? '#666666' : '#aaaaaa';
    ctx.font = '28px Arial, sans-serif';
    ctx.fillText(song.artist.substring(0, 25), width / 2, titleY + 40);

    // Stats bar
    const statsY = cameraPosition === 'fullscreen' ? height - 80 : height / 2 + 160;
    ctx.font = '24px Arial, sans-serif';
    ctx.fillStyle = style === 'minimal' ? '#000000' : '#ffffff';

    ctx.textAlign = 'left';
    ctx.fillText(`🎯 ${score.accuracy.toFixed(1)}%`, width / 4, statsY);
    ctx.fillText(`⚡ ${score.maxCombo}x`, width / 2, statsY);
    ctx.textAlign = 'right';
    ctx.fillText(score.difficulty.toUpperCase(), (width * 3) / 4, statsY);

    // Rating badge
    ctx.fillStyle = RATING_HEX_COLORS[score.rating] || styleConfig.accent;
    ctx.font = 'bold 48px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(score.rating.toUpperCase() + '!', width / 2, cameraPosition === 'fullscreen' ? height - 30 : height - 100);

    // App branding
    ctx.fillStyle = style === 'minimal' ? '#cccccc' : '#ffffff66';
    ctx.font = '20px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(t('shortsCreator.branding'), width / 2, cameraPosition === 'fullscreen' ? 30 : height - 40);

    // Progress bar (during recording)
    if (isRecording && duration > 0 && recordingStartTime > 0) {
      const elapsed = (Date.now() - recordingStartTime) / 1000;
      const progressPercent = Math.min(elapsed / duration, 1);

      ctx.fillStyle = style === 'minimal' ? '#00000033' : '#ffffff33';
      ctx.fillRect(0, height - 8, width, 8);
      ctx.fillStyle = styleConfig.accent;
      ctx.fillRect(0, height - 8, width * progressPercent, 8);

      // Throttle progress state updates to ~10fps to reduce re-renders
      const now = performance.now();
      if (now - progressLastUpdateRef.current > 100) {
        progressLastUpdateRef.current = now;
        onProgress?.(progressPercent * 100);
      }
    }
  }, [song, score, style, styleConfig, cameraPosition, hasCamera, isRecording, duration, recordingStartTime, t, onProgress]);

  // Animation loop — only run continuous rAF during recording; draw single static preview otherwise
  useEffect(() => {
    let animationId: number;

    if (!isRecording) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync
      drawFrame(performance.now());
      return undefined;
    }

    const animate = (timestamp: number) => {
      drawFrame(timestamp);
      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [drawFrame, isRecording]);
}

// ---------------------------------------------------------------------------
// ShortsCanvas – presentational canvas + hidden camera video + REC badge
// ---------------------------------------------------------------------------

interface ShortsCanvasProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  cameraVideoRef: React.RefObject<HTMLVideoElement | null>;
  isRecording: boolean;
}

export function ShortsCanvas({ canvasRef, cameraVideoRef, isRecording }: ShortsCanvasProps) {
  return (
    <div className="relative mx-auto" style={{ maxWidth: 360 }}>
      <canvas
        ref={canvasRef}
        width={720}
        height={1280}
        className="w-full rounded-xl border border-white/10"
        style={{ aspectRatio: '9/16' }}
      />

      {/* Hidden camera video element */}
      <video
        ref={cameraVideoRef}
        autoPlay
        playsInline
        muted
        className="hidden"
      />

      {/* Recording indicator */}
      {isRecording && (
        <div className="absolute top-4 right-4 flex items-center gap-2 bg-red-500 px-3 py-1 rounded-full">
          <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
          <span className="text-white text-sm font-medium">REC</span>
        </div>
      )}
    </div>
  );
}
