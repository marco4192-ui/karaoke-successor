import type { Song, HighscoreEntry } from '@/types/game';
import { VideoStyle, CameraPosition, VideoStyleConfig } from './types';

export function drawShortsFrame(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  timestamp: number,
  song: Song,
  score: HighscoreEntry,
  style: VideoStyle,
  styleConfig: VideoStyleConfig,
  cameraPosition: CameraPosition,
  hasCamera: boolean,
  cameraVideo: HTMLVideoElement | null,
  isRecording: boolean,
  duration: number,
  recordingStartTime: number,
  onProgress?: (progress: number) => void
) {
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
  if (hasCamera && cameraPosition !== 'none' && cameraVideo) {
    if (cameraPosition === 'fullscreen') {
      // Full screen camera with overlay
      ctx.globalAlpha = 0.9;
      ctx.drawImage(cameraVideo, 0, 0, width, height);
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
      ctx.drawImage(cameraVideo, pipX, pipY, pipWidth, pipHeight);
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
  const ratingColors: Record<string, string> = {
    perfect: '#ffd700',
    excellent: '#00ff88',
    good: '#00d9ff',
    okay: '#a0a0a0',
    poor: '#ff4444',
  };
  ctx.fillStyle = ratingColors[score.rating] || styleConfig.accent;
  ctx.font = 'bold 48px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(score.rating.toUpperCase() + '!', width / 2, cameraPosition === 'fullscreen' ? height - 30 : height - 100);

  // App branding
  ctx.fillStyle = style === 'minimal' ? '#cccccc' : '#ffffff66';
  ctx.font = '20px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Karaoke Successor', width / 2, cameraPosition === 'fullscreen' ? 30 : height - 40);

  // Progress bar (during recording)
  if (isRecording && duration > 0 && recordingStartTime > 0) {
    const elapsed = (Date.now() - recordingStartTime) / 1000;
    const progressPercent = Math.min(elapsed / duration, 1);
    
    ctx.fillStyle = style === 'minimal' ? '#00000033' : '#ffffff33';
    ctx.fillRect(0, height - 8, width, 8);
    ctx.fillStyle = styleConfig.accent;
    ctx.fillRect(0, height - 8, width * progressPercent, 8);
    
    onProgress?.(progressPercent * 100);
  }
}
