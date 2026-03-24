// Share Results Feature - Export score cards to social media
import { HighscoreEntry } from '@/types/game';

export interface ShareableScoreCard {
  playerName: string;
  songTitle: string;
  artist: string;
  score: number;
  accuracy: number;
  maxCombo: number;
  rankTitle: string;
  difficulty: string;
  gameMode: string;
  rating: string;
  playedAt: number;
}

export function createShareableCard(entry: HighscoreEntry): ShareableScoreCard {
  return {
    playerName: entry.playerName,
    songTitle: entry.songTitle,
    artist: entry.artist,
    score: entry.score,
    accuracy: entry.accuracy,
    maxCombo: entry.maxCombo,
    rankTitle: entry.rankTitle,
    difficulty: entry.difficulty,
    gameMode: entry.gameMode,
    rating: entry.rating,
    playedAt: entry.playedAt,
  };
}

// Generate shareable text
export function generateShareText(card: ShareableScoreCard): string {
  return `🎤 I just scored ${card.score.toLocaleString()} points on "${card.songTitle}" by ${card.artist}!

${card.rankTitle}
📊 Accuracy: ${card.accuracy.toFixed(1)}%
🔥 Max Combo: ${card.maxCombo}x
⭐ Rating: ${card.rating.toUpperCase()}
🎮 Mode: ${card.difficulty.toUpperCase()}

Play Karaoke Successor and try to beat my score!`;
}

// Generate shareable image (returns canvas)
export function generateShareImage(card: ShareableScoreCard): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 600;
  canvas.height = 400;
  const ctx = canvas.getContext('2d')!;
  
  // Background gradient
  const gradient = ctx.createLinearGradient(0, 0, 600, 400);
  gradient.addColorStop(0, '#1a0a2e');
  gradient.addColorStop(0.5, '#2d1b4e');
  gradient.addColorStop(1, '#0a1628');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 600, 400);
  
  // Add decorative elements
  ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
  for (let i = 0; i < 50; i++) {
    const x = Math.random() * 600;
    const y = Math.random() * 400;
    const size = Math.random() * 3 + 1;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }
  
  // Header
  ctx.fillStyle = '#00ffff';
  ctx.font = 'bold 32px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Karaoke Successor', 300, 50);
  
  // Song info
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 28px Inter, sans-serif';
  ctx.fillText(card.songTitle, 300, 100);
  ctx.font = '18px Inter, sans-serif';
  ctx.fillStyle = '#8888aa';
  ctx.fillText(card.artist, 300, 130);
  
  // Rank title
  ctx.font = 'bold 36px Inter, sans-serif';
  ctx.fillStyle = '#ffd700';
  ctx.fillText(card.rankTitle, 300, 180);
  
  // Score
  ctx.font = 'bold 48px Inter, sans-serif';
  ctx.fillStyle = '#00ff88';
  ctx.fillText(card.score.toLocaleString(), 300, 240);
  ctx.font = '16px Inter, sans-serif';
  ctx.fillStyle = '#8888aa';
  ctx.fillText('POINTS', 300, 265);
  
  // Stats row
  const stats = [
    { label: 'Accuracy', value: `${card.accuracy.toFixed(1)}%` },
    { label: 'Max Combo', value: `${card.maxCombo}x` },
    { label: 'Rating', value: card.rating.toUpperCase() },
  ];
  
  stats.forEach((stat, i) => {
    const x = 120 + i * 180;
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(stat.value, x, 310);
    ctx.fillStyle = '#8888aa';
    ctx.font = '14px Inter, sans-serif';
    ctx.fillText(stat.label, x, 335);
  });
  
  // Player name
  ctx.fillStyle = '#ff00ff';
  ctx.font = '18px Inter, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`Player: ${card.playerName}`, 20, 380);
  
  // Date
  const date = new Date(card.playedAt).toLocaleDateString();
  ctx.fillStyle = '#666666';
  ctx.textAlign = 'right';
  ctx.fillText(date, 580, 380);
  
  return canvas;
}

// Download as image
export function downloadScoreCard(card: ShareableScoreCard): void {
  const canvas = generateShareImage(card);
  const link = document.createElement('a');
  link.download = `karaoke-score-${card.songTitle.replace(/\s+/g, '-')}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

// Copy to clipboard
export async function copyScoreToClipboard(card: ShareableScoreCard): Promise<boolean> {
  const text = generateShareText(card);
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

// Copy image to clipboard
export async function copyScoreImageToClipboard(card: ShareableScoreCard): Promise<boolean> {
  try {
    const canvas = generateShareImage(card);
    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((b) => resolve(b!), 'image/png');
    });
    await navigator.clipboard.write([
      new ClipboardItem({ 'image/png': blob }),
    ]);
    return true;
  } catch {
    return false;
  }
}

// Share via Web Share API
export async function shareScoreCard(card: ShareableScoreCard): Promise<boolean> {
  if (!navigator.share) return false;
  
  const text = generateShareText(card);
  const canvas = generateShareImage(card);
  
  try {
    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((b) => resolve(b!), 'image/png');
    });
    const file = new File([blob], 'score-card.png', { type: 'image/png' });
    
    await navigator.share({
      title: 'Karaoke Successor Score',
      text,
      files: [file],
    });
    return true;
  } catch {
    // Fallback to text only
    try {
      await navigator.share({
        title: 'Karaoke Successor Score',
        text,
      });
      return true;
    } catch {
      return false;
    }
  }
}

// Social media share URLs
export function getShareUrls(card: ShareableScoreCard): {
  twitter: string;
  facebook: string;
  reddit: string;
  whatsapp: string;
} {
  const text = encodeURIComponent(generateShareText(card));
  const url = encodeURIComponent(window.location.origin);
  
  return {
    twitter: `https://twitter.com/intent/tweet?text=${text}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}&quote=${text}`,
    reddit: `https://www.reddit.com/submit?title=${encodeURIComponent(`My ${card.songTitle} score!`)}&text=${text}`,
    whatsapp: `https://wa.me/?text=${text}`,
  };
}
