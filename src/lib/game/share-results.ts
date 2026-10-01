// Share Results Feature - Export score cards to social media
import { HighscoreEntry } from '@/types/game';
import { t, getStoredLanguage } from '@/lib/i18n/translations';
import { RATING_HEX_COLORS } from '@/lib/game/rating-utils';

interface ShareableScoreCard {
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
  /** R42: avatar data-URL + profile color — used by the unified card renderer */
  playerAvatar?: string;
  playerColor?: string;
}

export function createShareableCard(entry: HighscoreEntry & { playerAvatar?: string; playerColor?: string }): ShareableScoreCard {
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
    playerAvatar: entry.playerAvatar,
    playerColor: entry.playerColor,
  };
}

/** Language-aware translate for share texts/cards (R42: honors the app
 *  language incl. the companion override instead of always English). */
function tt(key: string): string {
  return t(key, getStoredLanguage());
}

/** Translated rating word for share texts/cards (R42: 8-level scale). */
function ratingWord(rating: string): string {
  const label = tt(`scoreVisualization.${rating}`);
  return label === `scoreVisualization.${rating}` ? rating : label;
}

// Generate shareable text
function generateShareText(card: ShareableScoreCard): string {
  const lines = [
    `🎤 ${tt('share.scoredPoints').replace('{score}', card.score.toLocaleString()).replace('{title}', card.songTitle).replace('{artist}', card.artist)}`,
  ];
  if (card.rankTitle) lines.push(card.rankTitle);
  lines.push(
    `📊 ${tt('share.accuracy')}: ${card.accuracy.toFixed(1)}%`,
    `🔥 ${tt('share.maxCombo')}: ${card.maxCombo}x`,
    `⭐ ${tt('share.rating')}: ${ratingWord(card.rating)}`,
    `🎮 ${tt('share.mode')}: ${card.gameMode.toUpperCase()}`,
    `💬 ${tt('share.difficulty')}: ${card.difficulty.toUpperCase()}`,
    '',
    tt('share.callToAction').replace('{branding}', tt('core.branding')),
  );
  return lines.join('\n');
}

/**
 * R42 — UNIFIED score card renderer (1200×630). Used by BOTH the ShareBox
 * preview canvas and the download/copy/share actions, so the image you see
 * is exactly the image you share. Design merged from the former ScoreCard
 * canvas (social branding look) and the old 600×400 share image.
 */
export function renderScoreCardCanvas(card: ShareableScoreCard): HTMLCanvasElement {
  const width = 1200;
  const height = 630;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get 2D canvas context');

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

  // App branding (top-left)
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(tt('core.branding'), 40, 50);

  // Rank title (top-right, gold) — e.g. "Karaoke King"
  if (card.rankTitle) {
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 26px Arial, sans-serif';
    ctx.textAlign = 'right';
    const rank = card.rankTitle.length > 28 ? card.rankTitle.substring(0, 27) + '…' : card.rankTitle;
    ctx.fillText(rank, width - 40, 50);
  }

  // Song info
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 48px Arial, sans-serif';
  ctx.fillText(card.songTitle.substring(0, 25) + (card.songTitle.length > 25 ? '…' : ''), 40, 140);

  ctx.fillStyle = '#a0a0a0';
  ctx.font = '32px Arial, sans-serif';
  ctx.fillText(card.artist.substring(0, 30) + (card.artist.length > 30 ? '…' : ''), 40, 185);

  // Score box
  ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.roundRect(40, 225, width - 80, 150, 20);
  ctx.fill();

  // Main score
  ctx.fillStyle = '#00d9ff';
  ctx.font = 'bold 72px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(card.score.toLocaleString(), width / 2, 310);
  ctx.fillStyle = '#a0a0a0';
  ctx.font = '24px Arial, sans-serif';
  ctx.fillText(tt('share.points'), width / 2, 348);
  ctx.textAlign = 'left';

  // Stats row
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 26px Arial, sans-serif';
  const statsY = 415;
  ctx.fillText(`${card.accuracy.toFixed(1)}%`, 80, statsY);
  ctx.fillText(`${card.maxCombo}x`, 400, statsY);
  ctx.fillText(card.difficulty.toUpperCase(), 680, statsY);

  ctx.fillStyle = '#8888aa';
  ctx.font = '20px Arial, sans-serif';
  ctx.fillText(tt('share.accuracy'), 80, statsY + 30);
  ctx.fillText(tt('share.maxCombo'), 400, statsY + 30);
  ctx.fillText(tt('share.difficulty'), 680, statsY + 30);

  // Player info (initial circle in profile color + name)
  const playerColor = card.playerColor || '#00d9ff';
  ctx.fillStyle = playerColor;
  ctx.beginPath();
  ctx.arc(66, 505, 24, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 26px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText((card.playerName[0] || '?').toUpperCase(), 66, 514);
  ctx.textAlign = 'left';
  ctx.font = 'bold 32px Arial, sans-serif';
  ctx.fillText(card.playerName.substring(0, 20), 105, 515);

  // Rating badge (translated, rating-colored)
  const badgeColor = RATING_HEX_COLORS[card.rating] || '#ffffff';
  ctx.fillStyle = badgeColor;
  ctx.font = 'bold 36px Arial, sans-serif';
  ctx.fillText(`${ratingWord(card.rating).toUpperCase()}!`, 40, 580);

  // Date (bottom-right)
  const date = new Date(card.playedAt).toLocaleDateString();
  ctx.fillStyle = '#666666';
  ctx.font = '22px Arial, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(date, width - 40, 580);

  // Hashtags
  ctx.textAlign = 'left';
  ctx.fillStyle = '#556677';
  ctx.font = '22px Arial, sans-serif';
  ctx.fillText(tt('scoreCardSocial.hashtags'), 340, 580);

  return canvas;
}

// Kept for API compatibility — now renders the unified branded card
function generateShareImage(card: ShareableScoreCard): HTMLCanvasElement {
  return renderScoreCardCanvas(card);
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
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), 'image/png');
    });
    if (!blob) return false;
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
      canvas.toBlob((b) => resolve(b ?? new Blob()), 'image/png');
    });
    const file = new File([blob], 'score-card.png', { type: 'image/png' });

    await navigator.share({
      title: tt('share.shareTitle'),
      text,
      files: [file],
    });
    return true;
  } catch {
    // Fallback to text only
    try {
      await navigator.share({
        title: tt('share.shareTitle'),
        text,
      });
      return true;
    } catch {
      return false;
    }
  }
}
