'use client';

import { useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import type { HighscoreEntry, Song } from '@/types/game';

interface ScoreCardProps {
  song: Song;
  score: HighscoreEntry;
  playerName: string;
  playerAvatar?: string;
  onClose?: () => void;
}

export function ScoreCard({ song, score, playerName, playerAvatar, onClose }: ScoreCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const generateCard = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Card dimensions (1080x1920 for Instagram Story / 1200x630 for Twitter)
    const width = 1200;
    const height = 630;
    canvas.width = width;
    canvas.height = height;

    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(0.5, '#16213e');
    gradient.addColorStop(1, '#0f3460');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Decorative circles
    ctx.globalAlpha = 0.1;
    ctx.fillStyle = '#00d9ff';
    ctx.beginPath();
    ctx.arc(width - 100, 100, 200, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ff006e';
    ctx.beginPath();
    ctx.arc(100, height - 100, 150, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // App name / logo area
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px Arial, sans-serif';
    ctx.fillText('Karaoke Successor', 40, 50);

    // Song info
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 48px Arial, sans-serif';
    ctx.fillText(song.title.substring(0, 25) + (song.title.length > 25 ? '...' : ''), 40, 140);
    
    ctx.fillStyle = '#a0a0a0';
    ctx.font = '32px Arial, sans-serif';
    ctx.fillText(song.artist.substring(0, 30) + (song.artist.length > 30 ? '...' : ''), 40, 185);

    // Score box
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.roundRect(40, 230, width - 80, 180, 20);
    ctx.fill();

    // Main score
    ctx.fillStyle = '#00d9ff';
    ctx.font = 'bold 80px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(score.score.toLocaleString(), width / 2, 320);
    ctx.textAlign = 'left';

    // Stats row
    ctx.fillStyle = '#ffffff';
    ctx.font = '28px Arial, sans-serif';
    const statsY = 380;
    ctx.fillText(`Accuracy: ${score.accuracy.toFixed(1)}%`, 80, statsY);
    ctx.fillText(`Max Combo: ${score.maxCombo}x`, 350, statsY);
    ctx.fillText(`Difficulty: ${score.difficulty}`, 680, statsY);

    // Player info
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px Arial, sans-serif';
    ctx.fillText(`🎤 ${playerName}`, 40, 480);

    // Rating badge
    const ratingColors: Record<string, string> = {
      perfect: '#ffd700',
      excellent: '#00ff88',
      good: '#00d9ff',
      okay: '#a0a0a0',
      poor: '#ff4444',
    };
    const badgeColor = ratingColors[score.rating] || '#ffffff';
    ctx.fillStyle = badgeColor;
    ctx.font = 'bold 36px Arial, sans-serif';
    ctx.fillText(score.rating.toUpperCase() + '!', 40, 540);

    // Hashtags
    ctx.fillStyle = '#666666';
    ctx.font = '24px Arial, sans-serif';
    ctx.fillText('#KaraokeSuccessor #Karaoke #Singing', 40, 600);

    return canvas.toDataURL('image/png');
  }, [song, score, playerName]);

  const downloadCard = useCallback(() => {
    const dataUrl = generateCard();
    if (!dataUrl) return;

    const link = document.createElement('a');
    link.download = `karaoke-score-${song.title.replace(/[^a-z0-9]/gi, '-')}.png`;
    link.href = dataUrl;
    link.click();
  }, [generateCard, song.title]);

  const shareCard = useCallback(async () => {
    const dataUrl = generateCard();
    if (!dataUrl) return;

    try {
      // Convert data URL to blob
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      const file = new File([blob], 'score-card.png', { type: 'image/png' });

      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: 'My Karaoke Score!',
          text: `I scored ${score.score.toLocaleString()} points on "${song.title}" by ${song.artist}!`,
          files: [file],
        });
      } else {
        // Fallback: copy to clipboard or download
        downloadCard();
      }
    } catch (err) {
      console.error('Share failed:', err);
      downloadCard();
    }
  }, [generateCard, downloadCard, score.score, song.title, song.artist]);

  return (
    <div className="space-y-4">
      {/* Hidden canvas for generation */}
      <canvas ref={canvasRef} className="hidden" />
      
      {/* Preview */}
      <div className="relative aspect-[1200/630] w-full max-w-md mx-auto rounded-xl overflow-hidden bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] border border-white/10">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-pink-500/10 rounded-full blur-2xl" />
        
        {/* Content */}
        <div className="relative p-6 h-full flex flex-col">
          <div className="text-white/60 text-xs font-medium">Karaoke Successor</div>
          
          <div className="mt-4 flex-1">
            <div className="text-white text-2xl font-bold truncate">{song.title}</div>
            <div className="text-white/60 text-sm">{song.artist}</div>
            
            <div className="mt-6 bg-white/10 rounded-xl p-4 text-center">
              <div className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">
                {score.score.toLocaleString()}
              </div>
              <div className="text-white/60 text-sm mt-1">points</div>
            </div>
            
            <div className="mt-4 flex justify-between text-sm text-white/80">
              <span>🎯 {score.accuracy.toFixed(1)}%</span>
              <span>⚡ {score.maxCombo}x combo</span>
              <span>📊 {score.difficulty}</span>
            </div>
          </div>
          
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                {playerName[0].toUpperCase()}
              </div>
              <span className="text-white font-medium">{playerName}</span>
            </div>
            <div className="text-lg font-bold text-yellow-400 uppercase">{score.rating}!</div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button onClick={downloadCard} className="flex-1 bg-gradient-to-r from-cyan-500 to-purple-500">
          📥 Download
        </Button>
        <Button onClick={shareCard} variant="outline" className="flex-1 border-white/20 text-white">
          📤 Share
        </Button>
      </div>
    </div>
  );
}

// Mini version for inline display
export function ScoreCardMini({ song, score, playerName }: { song: Song; score: HighscoreEntry; playerName: string }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-[#1a1a2e] to-[#16213e] border border-white/10">
      <div className="flex-1 min-w-0">
        <div className="text-white font-medium truncate">{song.title}</div>
        <div className="text-white/60 text-xs">{song.artist}</div>
      </div>
      <div className="text-right">
        <div className="text-cyan-400 font-bold">{score.score.toLocaleString()}</div>
        <div className="text-xs text-white/60">{score.accuracy.toFixed(1)}%</div>
      </div>
      <div className="text-yellow-400 font-bold uppercase text-sm">{score.rating}</div>
    </div>
  );
}
