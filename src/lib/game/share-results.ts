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
  /** R44: accent color chosen in the ShareBox — flows into the generated PNG
   *  (decorative circle, main score text, playerColor fallback). */
  accentColor?: string;
}

/** R93: rivalry card options — duel (⚔️, winner highlight) vs duet (🎤,
 *  cooperative — no winner, both sides equal). */
export interface RivalCardOptions {
  isDraw: boolean;
  /** 'duel' → ⚔️ VS badge + WINNER chip; 'duet' → 🎤 badge, no winner. */
  mode: 'duel' | 'duet';
}

export function createShareableCard(entry: HighscoreEntry & { playerAvatar?: string; playerColor?: string; accentColor?: string }): ShareableScoreCard {
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
    accentColor: entry.accentColor,
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

/** Rivalry share text (R93): both scores + winner line. */
function generateRivalShareText(a: ShareableScoreCard, b: ShareableScoreCard, opts: RivalCardOptions): string {
  const lines = [
    `⚔️ ${a.songTitle} — ${a.artist}`,
    `${a.playerName}: ${a.score.toLocaleString()} (${ratingWord(a.rating)})`,
    `${b.playerName}: ${b.score.toLocaleString()} (${ratingWord(b.rating)})`,
  ];
  if (opts.mode === 'duel') {
    if (opts.isDraw) lines.push(`🤝 ${tt('results.draw')}!`);
    else lines.push(`👑 ${a.score > b.score ? a.playerName : b.playerName} — ${tt('shareSection.winner')}!`);
  }
  lines.push('', tt('share.callToAction').replace('{branding}', tt('core.branding')));
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// R93 design helpers (theme-aware canvas rendering)
// ---------------------------------------------------------------------------

interface ThemePalette {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
}

const FALLBACK_PALETTE: ThemePalette = {
  primary: '#4fc3f7',
  secondary: '#7c4dc4',
  accent: '#7dd8f5',
  background: '#0d1b2e',
};

/** Reads the ACTIVE karaoke theme's CSS variables (set by applyTheme on
 *  :root/body). Falls back to the official AfterTen palette when the vars
 *  are unavailable (SSR, tests, exotic environments). */
function readThemePalette(): ThemePalette {
  try {
    if (typeof window === 'undefined' || typeof document === 'undefined') return FALLBACK_PALETTE;
    const styles = getComputedStyle(document.body);
    const read = (name: string, fallback: string) => {
      const value = styles.getPropertyValue(name).trim();
      return /^#[0-9a-f]{3,8}$/i.test(value) || /^(rgb|hsl)a?\(/i.test(value) ? value : fallback;
    };
    return {
      primary: read('--theme-primary', FALLBACK_PALETTE.primary),
      secondary: read('--theme-secondary', FALLBACK_PALETTE.secondary),
      accent: read('--theme-accent', FALLBACK_PALETTE.accent),
      background: read('--theme-background', FALLBACK_PALETTE.background),
    };
  } catch {
    return FALLBACK_PALETTE;
  }
}

/** With-transparency helper for both #hex and rgb() theme values. */
function withAlpha(color: string, alpha: number): string {
  const a = Math.max(0, Math.min(1, alpha));
  if (color.startsWith('#')) {
    const clean = color.slice(1);
    const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean.slice(0, 6);
    const r = parseInt(full.substring(0, 2), 16);
    const g = parseInt(full.substring(2, 4), 16);
    const b = parseInt(full.substring(4, 6), 16);
    if ([r, g, b].every(Number.isFinite)) return `rgba(${r}, ${g}, ${b}, ${a})`;
    return `rgba(255, 255, 255, ${a})`;
  }
  if (color.startsWith('rgb(')) return color.replace('rgb(', 'rgba(').replace(')', `, ${a})`);
  if (color.startsWith('rgba(')) return color.replace(/[\d.]+\)$/, `${a})`);
  return `rgba(255, 255, 255, ${a})`;
}

/** Soft radial glow orb (additive light, no darkening). */
function drawGlowOrb(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, color: string, alpha: number): void {
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, withAlpha(color, alpha));
  gradient.addColorStop(1, withAlpha(color, 0));
  ctx.fillStyle = gradient;
  ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
}

/** Subtle dot grid texture for the card background. */
function drawDotGrid(ctx: CanvasRenderingContext2D, width: number, height: number, color: string): void {
  ctx.save();
  ctx.fillStyle = withAlpha(color, 0.07);
  const step = 28;
  for (let y = step; y < height; y += step) {
    for (let x = step; x < width; x += step) {
      ctx.beginPath();
      ctx.arc(x, y, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

/** R93 themed card background: deep vertical gradient + diagonal theme tint
 *  + glow orbs + dot grid + hairline inner frame. Shared by the single and
 *  the rivalry card renderers. */
function drawCardBackground(ctx: CanvasRenderingContext2D, width: number, height: number, palette: ThemePalette): void {
  const base = ctx.createLinearGradient(0, 0, 0, height);
  base.addColorStop(0, '#0b1220');
  base.addColorStop(1, mixHex(palette.background, '#05070d', 0.55));
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, width, height);

  // Diagonal secondary tint
  const diagonal = ctx.createLinearGradient(0, height, width, 0);
  diagonal.addColorStop(0, withAlpha(palette.secondary, 0.22));
  diagonal.addColorStop(0.55, withAlpha(palette.secondary, 0));
  ctx.fillStyle = diagonal;
  ctx.fillRect(0, 0, width, height);

  drawGlowOrb(ctx, width - 60, 40, 340, palette.primary, 0.28);
  drawGlowOrb(ctx, 40, height - 30, 300, palette.secondary, 0.26);
  drawDotGrid(ctx, width, height, palette.primary);

  // Hairline inner frame
  ctx.strokeStyle = withAlpha(palette.primary, 0.22);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(14, 14, width - 28, height - 28, 22);
  ctx.stroke();
}

/** Blends two hex colors (t at 0 = a, 1 = b). Returns hex. */
function mixHex(a: string, b: string, t: number): string {
  const parse = (hex: string): [number, number, number] => {
    const clean = hex.replace('#', '');
    const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean.slice(0, 6);
    const r = parseInt(full.substring(0, 2), 16);
    const g = parseInt(full.substring(2, 4), 16);
    const bl = parseInt(full.substring(4, 6), 16);
    return [Number.isFinite(r) ? r : 0, Number.isFinite(g) ? g : 0, Number.isFinite(bl) ? bl : 0];
  };
  const [ar, ag, ab] = parse(a);
  const [br, bg, bb] = parse(b);
  const mix = (x: number, y: number) => Math.round(x + (y - x) * t);
  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex(mix(ar, br))}${toHex(mix(ag, bg))}${toHex(mix(ab, bb))}`;
}

/** Truncates text with an ellipsis to fit maxWidth. */
function ellipsize(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let cut = text.length;
  while (cut > 1 && ctx.measureText(text.substring(0, cut) + '…').width > maxWidth) cut--;
  return text.substring(0, cut) + '…';
}

/** Rounded pill with centered text. Returns the drawn width. */
function drawPill(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  text: string, font: string,
  textColor: string, fillColor: string,
  paddingX = 16, height = 36, align: 'left' | 'center' = 'left',
): { x: number; width: number; height: number } {
  ctx.font = font;
  const textWidth = ctx.measureText(text).width;
  const width = textWidth + paddingX * 2;
  const drawX = align === 'center' ? x - width / 2 : x;
  ctx.fillStyle = fillColor;
  ctx.beginPath();
  ctx.roundRect(drawX, y, width, height, height / 2);
  ctx.fill();
  ctx.fillStyle = textColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, drawX + width / 2, y + height / 2 + 1);
  ctx.textBaseline = 'alphabetic';
  return { x: drawX, width, height };
}

// ---------------------------------------------------------------------------
// Avatar image cache (data-URL avatars drawn into the share cards)
// ---------------------------------------------------------------------------

/** R93: cache of decoded avatar images. renderScoreCardCanvas reads it
 *  synchronously; components call preloadShareAvatar() first so the preview
 *  and the exported PNG show the real avatar image instead of an initial. */
const avatarImageCache = new Map<string, HTMLImageElement>();

export function preloadShareAvatar(url: string | null | undefined): Promise<void> {
  if (!url || avatarImageCache.has(url)) return Promise.resolve();
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      avatarImageCache.set(url, img);
      resolve();
    };
    img.onerror = () => resolve();
    img.src = url;
  });
}

/** Draws a circular avatar: the cached image (cover-fit) when available,
 *  otherwise a colored initial disc. */
function drawAvatar(
  ctx: CanvasRenderingContext2D,
  cx: number, cy: number, radius: number,
  playerName: string, fallbackColor: string,
  avatarUrl?: string, borderWidth = 0, borderColor = '#ffffff',
): void {
  const cached = avatarUrl ? avatarImageCache.get(avatarUrl) : undefined;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius + borderWidth, 0, Math.PI * 2);
  ctx.fillStyle = borderColor;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  if (cached && cached.width > 0 && cached.height > 0) {
    ctx.clip();
    const scale = Math.max((radius * 2) / cached.width, (radius * 2) / cached.height);
    const sw = (radius * 2) / scale;
    const sh = (radius * 2) / scale;
    ctx.drawImage(cached, (cached.width - sw) / 2, (cached.height - sh) / 2, sw, sh, cx - radius, cy - radius, radius * 2, radius * 2);
  } else {
    ctx.fillStyle = fallbackColor;
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.round(radius * 1.05)}px Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText((playerName[0] || '?').toUpperCase(), cx, cy + 1);
    ctx.textBaseline = 'alphabetic';
  }
  ctx.restore();
}

/** Small stat chip: value (bold) + label underneath, inside a rounded
 *  translucent panel. Returns the chip width. */
function drawStatChip(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, width: number, height: number,
  value: string, label: string,
  valueColor: string, panelFill: string, labelColor: string,
): void {
  ctx.fillStyle = panelFill;
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, 14);
  ctx.fill();
  ctx.textAlign = 'center';
  ctx.fillStyle = valueColor;
  ctx.font = 'bold 28px Arial, sans-serif';
  ctx.fillText(value, x + width / 2, y + height / 2 - 2);
  ctx.fillStyle = labelColor;
  ctx.font = '15px Arial, sans-serif';
  ctx.fillText(label, x + width / 2, y + height / 2 + 22);
}

// ---------------------------------------------------------------------------
// Single score card renderer (R93 redesign)
// ---------------------------------------------------------------------------

/**
 * R42 — UNIFIED score card renderer (1200×630). Used by BOTH the ShareBox
 * preview canvas and the download/copy/share actions, so the image you see
 * is exactly the image you share.
 *
 * R93 — redesign: theme-aware palette (active karaoke theme flows into
 * background glow, frame and score gradient), real avatar images (cache),
 * score progress bar toward 10,000 with rating-colored fill, rating pill,
 * stat chips and a cleaner typographic hierarchy.
 */
export function renderScoreCardCanvas(card: ShareableScoreCard): HTMLCanvasElement {
  const width = 1200;
  const height = 630;
  const palette = readThemePalette();
  // R44: user-chosen accent color (ShareBox swatch picker) beats the theme
  const accent = card.accentColor || palette.primary;
  const ratingColor = RATING_HEX_COLORS[card.rating] || accent;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get 2D canvas context');

  drawCardBackground(ctx, width, height, palette);

  // ── Top row: branding pill (left) + rank title pill (right, gold) ──
  ctx.save();
  try { ctx.letterSpacing = '2px'; } catch { /* not supported everywhere */ }
  drawPill(
    ctx, 40, 36,
    tt('core.branding').toUpperCase(),
    'bold 17px Arial, sans-serif',
    withAlpha(palette.accent, 0.95), withAlpha(palette.primary, 0.14),
    18, 34,
  );
  try { ctx.letterSpacing = '0px'; } catch { /* ignore */ }
  if (card.rankTitle) {
    ctx.font = 'bold 20px Arial, sans-serif';
    const rank = ellipsize(ctx, card.rankTitle, 330);
    const rankWidth = ctx.measureText(rank).width + 36;
    drawPill(ctx, width - 40 - rankWidth, 36, rank, 'bold 20px Arial, sans-serif', '#ffd700', 'rgba(255, 215, 0, 0.12)', 18, 34);
  }
  ctx.restore();

  // ── Song title + artist ──
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 54px Arial, sans-serif';
  ctx.fillText(ellipsize(ctx, card.songTitle, 870), 48, 148);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.font = '29px Arial, sans-serif';
  ctx.fillText(ellipsize(ctx, card.artist, 700), 50, 192);

  // ── Hero score panel (glass card with rating-colored left stripe) ──
  const panelX = 40;
  const panelY = 222;
  const panelW = width - 80;
  const panelH = 176;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.055)';
  ctx.beginPath();
  ctx.roundRect(panelX, panelY, panelW, panelH, 22);
  ctx.fill();
  // Left stripe in rating color
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(panelX, panelY, panelW, panelH, 22);
  ctx.clip();
  const stripe = ctx.createLinearGradient(panelX, panelY, panelX, panelY + panelH);
  stripe.addColorStop(0, withAlpha(ratingColor, 0.95));
  stripe.addColorStop(1, withAlpha(ratingColor, 0.35));
  ctx.fillStyle = stripe;
  ctx.fillRect(panelX, panelY, 8, panelH);
  // Score progress bar track (bottom of the panel)
  const barX = panelX + 40;
  const barY = panelY + panelH - 34;
  const barW = panelW - 80;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.beginPath();
  ctx.roundRect(barX, barY, barW, 10, 5);
  ctx.fill();
  const progress = Math.max(0, Math.min(1, card.score / 10000));
  const fill = ctx.createLinearGradient(barX, 0, barX + barW, 0);
  fill.addColorStop(0, withAlpha(accent, 0.9));
  fill.addColorStop(1, ratingColor);
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.roundRect(barX, barY, Math.max(12, barW * progress), 10, 5);
  ctx.fill();
  ctx.restore();

  // Big score with accent→white gradient fill
  ctx.save();
  ctx.textAlign = 'left';
  ctx.font = 'bold 84px Arial, sans-serif';
  const scoreText = card.score.toLocaleString();
  const scoreGradient = ctx.createLinearGradient(64, 0, 560, 0);
  scoreGradient.addColorStop(0, '#ffffff');
  scoreGradient.addColorStop(1, accent);
  ctx.fillStyle = scoreGradient;
  ctx.fillText(scoreText, 64, panelY + 92);
  // Points label
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.font = 'bold 16px Arial, sans-serif';
  try { ctx.letterSpacing = '3px'; } catch { /* ignore */ }
  ctx.fillText(tt('share.points').toUpperCase(), 66, panelY + 122);
  try { ctx.letterSpacing = '0px'; } catch { /* ignore */ }
  ctx.restore();

  // Rating pill (right side of the panel, rating-colored)
  const ratingLabel = ratingWord(card.rating).toUpperCase();
  ctx.font = 'bold 34px Arial, sans-serif';
  const ratingWidth = ctx.measureText(ratingLabel + '!').width + 48;
  drawPill(
    ctx, width - 40 - 28 - ratingWidth, panelY + panelH / 2 - 26,
    `${ratingLabel}!`, 'bold 34px Arial, sans-serif',
    '#0b1220', ratingColor, 24, 52,
  );

  // ── Stat chips row ──
  const chipY = 424;
  const chipH = 74;
  const chipW = 340;
  const chipGap = (width - 80 - chipW * 3) / 2;
  const chipFill = 'rgba(255, 255, 255, 0.05)';
  drawStatChip(ctx, 40, chipY, chipW, chipH, `${card.accuracy.toFixed(1)}%`, tt('share.accuracy'), '#ffffff', chipFill, 'rgba(255,255,255,0.45)');
  drawStatChip(ctx, 40 + chipW + chipGap, chipY, chipW, chipH, `${card.maxCombo}x`, tt('share.maxCombo'), '#ffffff', chipFill, 'rgba(255,255,255,0.45)');
  drawStatChip(ctx, 40 + (chipW + chipGap) * 2, chipY, chipW, chipH, card.difficulty.toUpperCase(), tt('share.difficulty'), '#ffffff', chipFill, 'rgba(255,255,255,0.45)');

  // ── Player row: avatar + name (left), date (right) ──
  const playerColor = card.playerColor || accent;
  drawAvatar(ctx, 74, 566, 26, card.playerName, playerColor, card.playerAvatar, 2, withAlpha(playerColor, 0.8));
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 31px Arial, sans-serif';
  ctx.fillText(ellipsize(ctx, card.playerName, 420), 114, 577);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.font = '20px Arial, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(new Date(card.playedAt).toLocaleDateString(), width - 44, 570);
  ctx.textAlign = 'left';
  ctx.fillStyle = withAlpha(palette.primary, 0.55);
  ctx.fillText(tt('scoreCardSocial.hashtags'), 114, 602);

  return canvas;
}

// ---------------------------------------------------------------------------
// Rivalry score card renderer (R93 — duels & duets)
// ---------------------------------------------------------------------------

/**
 * R93 — rivalry card renderer (1200×630): both players side by side, winner
 * highlighted with a gold glow + crown (duel), draw chip when tied, duet
 * shows both equally with a 🎤 badge. Theme-aware like the single card.
 */
export function renderRivalScoreCardCanvas(
  a: ShareableScoreCard,
  b: ShareableScoreCard,
  opts: RivalCardOptions,
): HTMLCanvasElement {
  const width = 1200;
  const height = 630;
  const palette = readThemePalette();
  const aRating = RATING_HEX_COLORS[a.rating] || palette.primary;
  const bRating = RATING_HEX_COLORS[b.rating] || palette.secondary;
  const aWins = opts.mode === 'duel' && !opts.isDraw && a.score > b.score;
  const bWins = opts.mode === 'duel' && !opts.isDraw && b.score > a.score;
  const winnerColor = '#ffd700';

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get 2D canvas context');

  drawCardBackground(ctx, width, height, palette);

  // ── Header: branding pill (left) + song title/artist (centered block) ──
  ctx.save();
  try { ctx.letterSpacing = '2px'; } catch { /* ignore */ }
  drawPill(ctx, 40, 36, tt('core.branding').toUpperCase(), 'bold 17px Arial, sans-serif', withAlpha(palette.accent, 0.95), withAlpha(palette.primary, 0.14), 18, 34);
  try { ctx.letterSpacing = '0px'; } catch { /* ignore */ }
  ctx.restore();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 40px Arial, sans-serif';
  ctx.fillText(ellipsize(ctx, `${a.songTitle}`, 760), width / 2, 84);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.font = '24px Arial, sans-serif';
  ctx.fillText(ellipsize(ctx, a.artist, 560), width / 2, 118);

  // Draw / Winner chip (centered under the title)
  if (opts.mode === 'duel') {
    const chipText = opts.isDraw ? `🤝 ${tt('results.draw').toUpperCase()}` : `👑 ${tt('shareSection.winner').toUpperCase()}: ${(aWins ? a : b).playerName.toUpperCase()}`;
    ctx.font = 'bold 19px Arial, sans-serif';
    const w = ctx.measureText(chipText).width + 40;
    drawPill(ctx, width / 2 - w / 2, 132, chipText, 'bold 19px Arial, sans-serif', winnerColor, 'rgba(255, 215, 0, 0.13)', 20, 32);
  }

  // ── Player panels ──
  const panelTop = 184;
  const panelH = 340;
  const panelW = 520;
  const panelAX = 44;
  const panelBX = width - 44 - panelW;
  const drawPlayerPanel = (card: ShareableScoreCard, x: number, ratingColor: string, isWinner: boolean, isLoser: boolean) => {
    // Panel body
    ctx.save();
    if (isWinner) {
      ctx.shadowColor = withAlpha(winnerColor, 0.45);
      ctx.shadowBlur = 42;
    }
    ctx.fillStyle = isLoser ? 'rgba(255, 255, 255, 0.035)' : 'rgba(255, 255, 255, 0.06)';
    ctx.beginPath();
    ctx.roundRect(x, panelTop, panelW, panelH, 24);
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = isWinner ? withAlpha(winnerColor, 0.85) : withAlpha(ratingColor, 0.3);
    ctx.lineWidth = isWinner ? 3 : 1.5;
    ctx.beginPath();
    ctx.roundRect(x, panelTop, panelW, panelH, 24);
    ctx.stroke();

    // Avatar + name + crown
    const avatarCx = x + panelW / 2;
    const avatarCy = panelTop + 78;
    drawAvatar(ctx, avatarCx, avatarCy, 42, card.playerName, card.playerColor || ratingColor, card.playerAvatar, 3, isWinner ? winnerColor : withAlpha(card.playerColor || ratingColor, 0.8));
    if (isWinner) {
      ctx.font = '34px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('👑', avatarCx + 44, avatarCy - 34);
    }
    ctx.textAlign = 'center';
    ctx.fillStyle = isLoser ? 'rgba(255,255,255,0.55)' : '#ffffff';
    ctx.font = 'bold 28px Arial, sans-serif';
    ctx.fillText(ellipsize(ctx, card.playerName, panelW - 70), avatarCx, avatarCy + 88);

    // Big score
    ctx.fillStyle = isLoser ? 'rgba(255,255,255,0.55)' : '#ffffff';
    ctx.font = 'bold 62px Arial, sans-serif';
    ctx.fillText(card.score.toLocaleString(), avatarCx, avatarCy + 158);

    // Rating mini pill
    const ratingLabel = ratingWord(card.rating).toUpperCase();
    ctx.font = 'bold 18px Arial, sans-serif';
    const rw = ctx.measureText(ratingLabel).width + 32;
    drawPill(ctx, avatarCx - rw / 2, avatarCy + 178, ratingLabel, 'bold 18px Arial, sans-serif', '#0b1220', ratingColor, 16, 30);

    // Mini stats: accuracy + combo
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.font = 'bold 21px Arial, sans-serif';
    ctx.fillText(`🎯 ${card.accuracy.toFixed(1)}%   ⚡ ${card.maxCombo}x`, avatarCx, panelTop + panelH - 26);
  };
  drawPlayerPanel(a, panelAX, aRating, aWins, bWins);
  drawPlayerPanel(b, panelBX, bRating, bWins, aWins);

  // ── Center VS badge ──
  const vsCx = width / 2;
  const vsCy = panelTop + panelH / 2;
  ctx.save();
  ctx.shadowColor = withAlpha(palette.primary, 0.6);
  ctx.shadowBlur = 30;
  const vsGradient = ctx.createLinearGradient(vsCx - 46, vsCy - 46, vsCx + 46, vsCy + 46);
  vsGradient.addColorStop(0, palette.primary);
  vsGradient.addColorStop(1, palette.secondary);
  ctx.fillStyle = vsGradient;
  ctx.beginPath();
  ctx.arc(vsCx, vsCy, 46, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 30px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const vsLabel = opts.mode === 'duet' ? '🎤' : 'VS';
  ctx.fillText(vsLabel, vsCx, vsCy + 1);
  ctx.textBaseline = 'alphabetic';

  // ── Footer: date (left) + hashtags (right) ──
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.font = '20px Arial, sans-serif';
  ctx.fillText(new Date(a.playedAt).toLocaleDateString(), 48, 594);
  ctx.textAlign = 'right';
  ctx.fillStyle = withAlpha(palette.primary, 0.55);
  ctx.fillText(tt('scoreCardSocial.hashtags'), width - 48, 594);

  return canvas;
}

// ---------------------------------------------------------------------------
// Export actions (canvas-based)
// ---------------------------------------------------------------------------

/** Kept for API compatibility — now renders the unified branded card */
function generateShareImage(card: ShareableScoreCard): HTMLCanvasElement {
  return renderScoreCardCanvas(card);
}

function downloadCanvas(canvas: HTMLCanvasElement, filename: string): void {
  const link = document.createElement('a');
  link.download = filename;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

async function copyCanvasToClipboard(canvas: HTMLCanvasElement): Promise<boolean> {
  try {
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

async function shareCanvas(canvas: HTMLCanvasElement, title: string, text: string): Promise<boolean> {
  if (!navigator.share) return false;
  try {
    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((b) => resolve(b ?? new Blob()), 'image/png');
    });
    const file = new File([blob], 'score-card.png', { type: 'image/png' });
    await navigator.share({ title, text, files: [file] });
    return true;
  } catch {
    // Fallback to text only
    try {
      await navigator.share({ title, text });
      return true;
    } catch {
      return false;
    }
  }
}

// Download as image
export function downloadScoreCard(card: ShareableScoreCard): void {
  downloadCanvas(generateShareImage(card), `karaoke-score-${card.songTitle.replace(/\s+/g, '-')}.png`);
}

// Rivalry download (R93)
export function downloadRivalScoreCard(a: ShareableScoreCard, b: ShareableScoreCard, opts: RivalCardOptions): void {
  downloadCanvas(
    renderRivalScoreCardCanvas(a, b, opts),
    `karaoke-${opts.mode}-${a.songTitle.replace(/\s+/g, '-')}.png`,
  );
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

// Rivalry text copy (R93)
export async function copyRivalScoreToClipboard(a: ShareableScoreCard, b: ShareableScoreCard, opts: RivalCardOptions): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(generateRivalShareText(a, b, opts));
    return true;
  } catch {
    return false;
  }
}

// Copy image to clipboard
export async function copyScoreImageToClipboard(card: ShareableScoreCard): Promise<boolean> {
  return copyCanvasToClipboard(generateShareImage(card));
}

// Rivalry image copy (R93)
export async function copyRivalScoreImageToClipboard(a: ShareableScoreCard, b: ShareableScoreCard, opts: RivalCardOptions): Promise<boolean> {
  return copyCanvasToClipboard(renderRivalScoreCardCanvas(a, b, opts));
}

// Share via Web Share API
export async function shareScoreCard(card: ShareableScoreCard): Promise<boolean> {
  return shareCanvas(generateShareImage(card), tt('share.shareTitle'), generateShareText(card));
}

// Rivalry share (R93)
export async function shareRivalScoreCard(a: ShareableScoreCard, b: ShareableScoreCard, opts: RivalCardOptions): Promise<boolean> {
  return shareCanvas(renderRivalScoreCardCanvas(a, b, opts), tt('share.shareTitle'), generateRivalShareText(a, b, opts));
}
