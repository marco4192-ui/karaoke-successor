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
  /** R93 rivalry mode: render BOTH players (duel/duet) instead of a single
   *  score — winner highlighted, VS badge, parallel score count-up. */
  rival?: {
    opponent: HighscoreEntry;
    isDraw: boolean;
    mode: 'duel' | 'duet';
  } | null;
}

/** Rival param shape re-exported for ShortsCreator. */
export interface RivalVideoOptions {
  opponent: HighscoreEntry;
  isDraw: boolean;
  mode: 'duel' | 'duet';
}

/**
 * R65 — aspect-correct camera drawing (cover-fit, center-crop).
 *
 * The camera delivers its NATIVE aspect ratio (mostly 4:3 or 16:9 LANDSCAPE —
 * the 720×1280 request is only an ideal hint, browsers return the nearest
 * supported mode). Blind `drawImage(video, dx, dy, w, h)` STRETCHED that
 * landscape feed into the portrait 9:16 canvas / the ~4:7 PiP box — the
 * recording looked "in der Höhe langgezogen" (user report). cover-fit
 * scales the source up until it covers the box, then crops the excess —
 * like CSS object-fit: cover. Falls back to the old stretch when the video
 * has no intrinsic dimensions yet (some strict environments report 0).
 */
function drawCameraCoverFit(
  ctx: CanvasRenderingContext2D,
  camVideo: HTMLVideoElement,
  dx: number, dy: number, dw: number, dh: number,
): void {
  const srcW = camVideo.videoWidth;
  const srcH = camVideo.videoHeight;
  if (!srcW || !srcH) {
    ctx.drawImage(camVideo, dx, dy, dw, dh);
    return;
  }
  const scale = Math.max(dw / srcW, dh / srcH);
  const sw = dw / scale;
  const sh = dh / scale;
  const sx = (srcW - sw) / 2;
  const sy = (srcH - sh) / 2;
  ctx.drawImage(camVideo, sx, sy, sw, sh, dx, dy, dw, dh);
}

/** R93: reads the active karaoke theme (CSS vars on body, set by applyTheme).
 *  Falls back to the official AfterTen palette outside the browser. */
function readThemeColors(): { primary: string; secondary: string; accent: string; font: string } {
  try {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return { primary: '#4fc3f7', secondary: '#7c4dc4', accent: '#7dd8f5', font: 'Arial' };
    }
    const styles = getComputedStyle(document.body);
    const read = (name: string, fallback: string) => {
      const value = styles.getPropertyValue(name).trim();
      return value || fallback;
    };
    return {
      primary: read('--theme-primary', '#4fc3f7'),
      secondary: read('--theme-secondary', '#7c4dc4'),
      accent: read('--theme-accent', '#7dd8f5'),
      font: read('--theme-font', 'Arial'),
    };
  } catch {
    return { primary: '#4fc3f7', secondary: '#7c4dc4', accent: '#7dd8f5', font: 'Arial' };
  }
}

/** rgba from any theme value (hex or rgb()) with alpha. */
function alphaColor(color: string, alpha: number): string {
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
  return `rgba(255, 255, 255, ${a})`;
}

/** Soft moving glow orb on the video background. */
function drawVideoGlowOrb(
  ctx: CanvasRenderingContext2D,
  timestamp: number,
  width: number, height: number,
  x: number, y: number, radius: number, color: string, alpha: number, phase: number,
): void {
  const drift = Math.sin(timestamp / 2600 + phase) * 36;
  const driftY = Math.cos(timestamp / 3100 + phase) * 26;
  const cx = x + drift;
  const cy = y + driftY;
  const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
  gradient.addColorStop(0, alphaColor(color, alpha));
  gradient.addColorStop(1, alphaColor(color, 0));
  ctx.fillStyle = gradient;
  ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
}

/** Count-up easing (0 → 1 over `ms`, cubic ease-out). */
function countUpFraction(elapsedMs: number, ms = 1800): number {
  if (elapsedMs >= ms) return 1;
  const t = Math.max(0, elapsedMs) / ms;
  return 1 - Math.pow(1 - t, 3);
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
  rival,
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
    const theme = readThemeColors();
    const isDark = style !== 'minimal';
    const mainText = isDark ? '#ffffff' : '#0a0a0a';
    const subText = isDark ? 'rgba(255,255,255,0.62)' : 'rgba(0,0,0,0.6)';
    const glassFill = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';
    const glassStroke = isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.12)';
    const font = `${theme.font}, Arial, sans-serif`;
    const ratingColor = RATING_HEX_COLORS[score.rating] || styleConfig.accent;
    const recordingElapsed = isRecording && recordingStartTime > 0 ? Date.now() - recordingStartTime : Infinity;
    const reveal = recordingElapsed === Infinity ? 1 : countUpFraction(recordingElapsed);
    const winnerColor = '#ffd700';

    const ratingLabel = (rating: string): string => {
      const label = t(`scoreVisualization.${rating}`);
      return label === `scoreVisualization.${rating}` ? rating : label;
    };

    // ── Background ──
    if (styleConfig.bg.startsWith('linear-gradient')) {
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, '#667eea');
      gradient.addColorStop(1, '#764ba2');
      ctx.fillStyle = gradient;
    } else {
      ctx.fillStyle = styleConfig.bg;
    }
    ctx.fillRect(0, 0, width, height);

    // R93: theme-tinted glow orbs (subtle, works with every style)
    if (isDark) {
      drawVideoGlowOrb(ctx, timestamp, width, height, width * 0.75, height * 0.18, 320, theme.primary, 0.2, 0);
      drawVideoGlowOrb(ctx, timestamp, width, height, width * 0.2, height * 0.72, 340, theme.secondary, 0.18, 2.1);
    }

    // R93: twinkling sparkles (smaller + softer than the old 20 blob circles)
    if (isDark) {
      for (let i = 0; i < 24; i++) {
        const x = (Math.sin(timestamp / 1400 + i * 1.7) * 0.5 + 0.5) * width;
        const y = (Math.cos(timestamp / 1100 + i * 2.3) * 0.5 + 0.5) * height;
        const twinkle = 0.5 + Math.sin(timestamp / 420 + i * 1.3) * 0.5;
        ctx.globalAlpha = 0.05 + twinkle * 0.16;
        ctx.beginPath();
        ctx.arc(x, y, 2 + twinkle * 3, 0, Math.PI * 2);
        ctx.fillStyle = i % 3 === 0 ? ratingColor : theme.accent;
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // ── Camera feed (PiP or fullscreen) — only when the video element
    // actually has frame data (R44: freshly (re-)attached streams need a
    // moment; drawing a frameless video would paint nothing/transparent).
    const fullscreenCam = hasCamera && cameraPosition === 'fullscreen' && cameraVideoRef.current && cameraVideoRef.current.readyState >= 2;
    if (fullscreenCam && cameraVideoRef.current) {
      const camVideo = cameraVideoRef.current;
      // Full screen camera with overlay — R65: cover-fit statt Streckung
      ctx.globalAlpha = 0.9;
      drawCameraCoverFit(ctx, camVideo, 0, 0, width, height);
      ctx.globalAlpha = 1;

      // Dark overlay for text readability (taller, covers the whole lower
      // R93 layout with a soft gradient instead of a hard-edged band)
      const overlay = ctx.createLinearGradient(0, height - 560, 0, height - 260);
      overlay.addColorStop(0, 'rgba(5,8,16,0)');
      overlay.addColorStop(1, 'rgba(5,8,16,0.88)');
      ctx.fillStyle = overlay;
      ctx.fillRect(0, height - 560, width, 560);
    } else if (hasCamera && cameraPosition !== 'none' && cameraVideoRef.current && cameraVideoRef.current.readyState >= 2) {
      const camVideo = cameraVideoRef.current;
      // Picture-in-Picture (R44/5.5: enlarged so the camera overlay is
      // clearly visible on the 720×1280 canvas)
      const pipWidth = 300;
      const pipHeight = 520;
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

      // PiP border — R93: theme-tinted double frame
      ctx.fillStyle = alphaColor(theme.primary, 0.9);
      ctx.beginPath();
      ctx.roundRect(pipX - 4, pipY - 4, pipWidth + 8, pipHeight + 8, 22);
      ctx.fill();

      // PiP video — R65: cover-fit statt Streckung (4:3/16:9-Kamera in die
      // ~4:7-PiP-Box gezogen = Höhen-Verzerrung, Nutzer-Feedback 2)
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(pipX, pipY, pipWidth, pipHeight, 18);
      ctx.clip();
      drawCameraCoverFit(ctx, camVideo, pipX, pipY, pipWidth, pipHeight);
      ctx.restore();
    }

    // ── Song info glass card ──
    const infoCardX = 36;
    const infoCardW = width - 72;
    const infoCardH = 150;
    const infoCardY = fullscreenCam ? height - 540 : 96;
    ctx.fillStyle = glassFill;
    ctx.strokeStyle = glassStroke;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(infoCardX, infoCardY, infoCardW, infoCardH, 26);
    ctx.fill();
    ctx.stroke();
    // Rating-colored top accent line on the card
    ctx.fillStyle = alphaColor(ratingColor, 0.9);
    ctx.beginPath();
    ctx.roundRect(infoCardX + 28, infoCardY - 3, infoCardW - 56, 5, 3);
    ctx.fill();

    ctx.textAlign = 'center';
    ctx.fillStyle = mainText;
    ctx.font = `bold 40px ${font}`;
    let titleText = song.title;
    while (ctx.measureText(titleText).width > infoCardW - 72 && titleText.length > 4) titleText = titleText.slice(0, -2);
    ctx.fillText(titleText + (titleText.length < song.title.length ? '…' : ''), width / 2, infoCardY + 62);

    ctx.fillStyle = subText;
    ctx.font = `27px ${font}`;
    let artistText = song.artist;
    while (ctx.measureText(artistText).width > infoCardW - 100 && artistText.length > 4) artistText = artistText.slice(0, -2);
    ctx.fillText(artistText + (artistText.length < song.artist.length ? '…' : ''), width / 2, infoCardY + 102);

    // Difficulty chip inside the card
    ctx.font = `bold 19px ${font}`;
    const diffText = score.difficulty.toUpperCase();
    const diffW = ctx.measureText(diffText).width + 36;
    ctx.fillStyle = alphaColor(theme.primary, isDark ? 0.22 : 0.14);
    ctx.beginPath();
    ctx.roundRect(width / 2 - diffW / 2, infoCardY + 114, diffW, 27, 14);
    ctx.fill();
    ctx.fillStyle = isDark ? theme.accent : '#0a5a72';
    ctx.fillText(diffText, width / 2, infoCardY + 133);

    if (rival) {
      // ──────────────────────────────────────────────────────────────────
      // R93 RIVAL layout: two player panels + VS badge
      // ──────────────────────────────────────────────────────────────────
      const opponent = rival.opponent;
      const bRating = RATING_HEX_COLORS[opponent.rating] || theme.secondary;
      const aWins = rival.mode === 'duel' && !rival.isDraw && score.score > opponent.score;
      const bWins = rival.mode === 'duel' && !rival.isDraw && opponent.score > score.score;

      const panelTop = fullscreenCam ? height - 370 : infoCardY + infoCardH + 36;
      const panelW = 310;
      const panelH = 330;
      const panelAX = 34;
      const panelBX = width - 34 - panelW;

      const drawPlayerPanel = (entry: HighscoreEntry, x: number, rColor: string, isWinner: boolean, isLoser: boolean) => {
        // Panel body (+ winner glow)
        ctx.save();
        if (isWinner) {
          ctx.shadowColor = alphaColor(winnerColor, 0.55);
          ctx.shadowBlur = 36;
        }
        ctx.fillStyle = isLoser ? alphaColor(isDark ? '#ffffff' : '#000000', isDark ? 0.035 : 0.04) : glassFill;
        ctx.beginPath();
        ctx.roundRect(x, panelTop, panelW, panelH, 24);
        ctx.fill();
        ctx.restore();
        ctx.strokeStyle = isWinner ? alphaColor(winnerColor, 0.9) : glassStroke;
        ctx.lineWidth = isWinner ? 3 : 1.5;
        ctx.beginPath();
        ctx.roundRect(x, panelTop, panelW, panelH, 24);
        ctx.stroke();

        const cx = x + panelW / 2;

        // Winner crown
        if (isWinner) {
          ctx.font = `36px ${font}`;
          ctx.fillText('👑', cx + 66, panelTop + 42);
        }

        // Player name
        ctx.fillStyle = isLoser ? subText : mainText;
        ctx.font = `bold 26px ${font}`;
        let nameText = entry.playerName || 'Player';
        while (ctx.measureText(nameText).width > panelW - 48 && nameText.length > 3) nameText = nameText.slice(0, -2);
        ctx.fillText(nameText + (nameText.length < (entry.playerName || 'Player').length ? '…' : ''), cx, panelTop + 52);

        // Score with count-up
        const animated = Math.round(entry.score * reveal);
        ctx.fillStyle = isLoser ? subText : mainText;
        ctx.font = `bold 56px ${font}`;
        ctx.fillText(animated.toLocaleString(), cx, panelTop + 132);

        // Rating pill
        const rLabel = ratingLabel(entry.rating).toUpperCase();
        ctx.font = `bold 17px ${font}`;
        const rW = ctx.measureText(rLabel).width + 30;
        ctx.fillStyle = rColor;
        ctx.beginPath();
        ctx.roundRect(cx - rW / 2, panelTop + 158, rW, 30, 15);
        ctx.fill();
        ctx.fillStyle = '#0b1220';
        ctx.fillText(rLabel, cx, panelTop + 178);

        // Mini stats
        ctx.fillStyle = isLoser ? subText : isDark ? 'rgba(255,255,255,0.78)' : 'rgba(0,0,0,0.7)';
        ctx.font = `bold 21px ${font}`;
        ctx.fillText(`🎯 ${entry.accuracy.toFixed(1)}%`, cx, panelTop + 232);
        ctx.fillText(`⚡ ${entry.maxCombo}x`, cx, panelTop + 266);
      };

      drawPlayerPanel(score, panelAX, ratingColor, aWins, bWins);
      drawPlayerPanel(opponent, panelBX, bRating, bWins, aWins);

      // VS badge between the panels
      const vsCx = width / 2;
      const vsCy = panelTop + panelH / 2;
      ctx.save();
      ctx.shadowColor = alphaColor(theme.primary, 0.65);
      ctx.shadowBlur = 30;
      const vsGradient = ctx.createLinearGradient(vsCx - 34, vsCy - 34, vsCx + 34, vsCy + 34);
      vsGradient.addColorStop(0, theme.primary);
      vsGradient.addColorStop(1, theme.secondary);
      ctx.fillStyle = vsGradient;
      ctx.beginPath();
      ctx.arc(vsCx, vsCy, 34, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold 22px ${font}`;
      ctx.textBaseline = 'middle';
      ctx.fillText(rival.mode === 'duet' ? '🎤' : 'VS', vsCx, vsCy + 1);
      ctx.textBaseline = 'alphabetic';

      // Draw chip (duel, tied)
      if (rival.mode === 'duel' && rival.isDraw) {
        ctx.font = `bold 22px ${font}`;
        const drawText = `🤝 ${t('results.draw').toUpperCase()}`;
        const dW = ctx.measureText(drawText).width + 40;
        ctx.fillStyle = alphaColor(winnerColor, isDark ? 0.16 : 0.12);
        ctx.beginPath();
        ctx.roundRect(width / 2 - dW / 2, panelTop + panelH + 18, dW, 36, 18);
        ctx.fill();
        ctx.fillStyle = winnerColor;
        ctx.fillText(drawText, width / 2, panelTop + panelH + 43);
      }

      // Branding + progress (bottom)
      ctx.textAlign = 'center';
      ctx.fillStyle = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)';
      ctx.font = `19px ${font}`;
      ctx.fillText(t('shortsCreator.branding'), width / 2, height - 44);
    } else {
      // ──────────────────────────────────────────────────────────────────
      // SINGLE score layout: accuracy ring hero + rating + stat chips
      // ──────────────────────────────────────────────────────────────────
      const heroCy = fullscreenCam ? height - 210 : infoCardY + infoCardH + 250;
      const heroCx = width / 2;
      const ringR = 138;
      const pulse = 1 + Math.sin(timestamp / 620) * 0.018;

      ctx.save();
      ctx.translate(heroCx, heroCy);
      ctx.scale(pulse, pulse);

      // Ring track
      ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)';
      ctx.lineWidth = 13;
      ctx.beginPath();
      ctx.arc(0, 0, ringR, 0, Math.PI * 2);
      ctx.stroke();

      // Accuracy arc (reveals with the count-up)
      const arcFraction = Math.max(0.005, Math.min(1, score.accuracy / 100)) * reveal;
      ctx.strokeStyle = ratingColor;
      ctx.lineWidth = 13;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(0, 0, ringR, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * arcFraction);
      ctx.stroke();
      ctx.lineCap = 'butt';

      // Score (count-up) inside the ring
      const animatedScore = Math.round(score.score * reveal);
      ctx.textAlign = 'center';
      ctx.fillStyle = mainText;
      const scoreFont = `bold 64px ${font}`;
      ctx.font = scoreFont;
      const scoreStr = animatedScore.toLocaleString();
      if (ctx.measureText(scoreStr).width > ringR * 2 - 44) {
        ctx.font = `bold 52px ${font}`;
      }
      ctx.fillText(scoreStr, 0, -6);
      ctx.fillStyle = subText;
      ctx.font = `bold 17px ${font}`;
      ctx.fillText(`${Math.round(score.accuracy * reveal)}% · ${t('share.accuracy')}`, 0, 34);
      ctx.restore();

      // Rating pill under the ring (R93 fix: TRANSLATED rating word —
      // the old canvas drew the raw English key)
      const rLabel = ratingLabel(score.rating).toUpperCase();
      ctx.font = `bold 30px ${font}`;
      const rW = ctx.measureText(`${rLabel}!`).width + 44;
      const rY = heroCy + ringR + 26;
      ctx.fillStyle = ratingColor;
      ctx.beginPath();
      ctx.roundRect(heroCx - rW / 2, rY, rW, 44, 22);
      ctx.fill();
      ctx.fillStyle = '#0b1220';
      ctx.fillText(`${rLabel}!`, heroCx, rY + 31);

      // Stat chips (combo + mode)
      if (!fullscreenCam) {
        const chipY = rY + 66;
        ctx.font = `bold 20px ${font}`;
        const comboText = `⚡ ${score.maxCombo}x ${t('share.maxCombo')}`;
        const comboW = ctx.measureText(comboText).width + 36;
        ctx.fillStyle = glassFill;
        ctx.strokeStyle = glassStroke;
        ctx.beginPath();
        ctx.roundRect(heroCx - comboW / 2, chipY, comboW, 32, 16);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = subText;
        ctx.fillText(comboText, heroCx, chipY + 22);
      }

      // App branding
      ctx.textAlign = 'center';
      ctx.fillStyle = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)';
      ctx.font = `19px ${font}`;
      ctx.fillText(t('shortsCreator.branding'), width / 2, height - 44);
    }

    // ── Progress bar (during recording) — R93: gradient fill ──
    if (isRecording && duration > 0 && recordingStartTime > 0) {
      const elapsed = (Date.now() - recordingStartTime) / 1000;
      const progressPercent = Math.min(elapsed / duration, 1);

      ctx.fillStyle = isDark ? '#ffffff26' : '#00000026';
      ctx.fillRect(0, height - 8, width, 8);
      const barGradient = ctx.createLinearGradient(0, 0, width, 0);
      barGradient.addColorStop(0, theme.primary);
      barGradient.addColorStop(1, theme.secondary);
      ctx.fillStyle = barGradient;
      ctx.fillRect(0, height - 8, width * progressPercent, 8);

      // Throttle progress state updates to ~10fps to reduce re-renders
      const now = performance.now();
      if (now - progressLastUpdateRef.current > 100) {
        progressLastUpdateRef.current = now;
        onProgress?.(progressPercent * 100);
      }
    }
  }, [song, score, style, styleConfig, cameraPosition, hasCamera, isRecording, duration, recordingStartTime, t, onProgress, rival]);

  // Animation loop — continuous rAF while recording (progress bar) AND
  // while a camera feed is active (R44: live camera preview instead of a
  // frozen frame; also covers the fresh <video> remount after "Neu");
  // single static preview frame otherwise.
  useEffect(() => {
    let animationId: number;
    const liveCamera = hasCamera && cameraPosition !== 'none';

    if (!isRecording && !liveCamera) {
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
  }, [drawFrame, isRecording, hasCamera, cameraPosition]);
}

// ---------------------------------------------------------------------------
// ShortsCanvas – presentational canvas + hidden camera video + REC badge
// R44: `compact` sizes the canvas by the AVAILABLE HEIGHT so the 9:16 preview
// never gets clipped inside the ShareBox; non-compact keeps the old
// width-driven 360px look for any other usage.
// ---------------------------------------------------------------------------

interface ShortsCanvasProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  cameraVideoRef: React.RefObject<HTMLVideoElement | null>;
  isRecording: boolean;
  /** R44: height-driven sizing — the canvas claims the full slot height and
   *  derives its width from the intrinsic 9:16 ratio (never clipped). */
  compact?: boolean;
}

export function ShortsCanvas({ canvasRef, cameraVideoRef, isRecording, compact }: ShortsCanvasProps) {
  const recBadge = isRecording && (
    <div className="absolute top-3 right-3 flex items-center gap-2 bg-red-500 px-3 py-1 rounded-full">
      <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
      <span className="text-white text-sm font-medium">REC</span>
    </div>
  );

  if (compact) {
    return (
      // h-full/w-full root with the canvas in an OUT-OF-FLOW sizing layer:
      // the 720×1280 canvas has a 1280px intrinsic min-content height that
      // would otherwise blow up the whole (content-driven) results height
      // chain. Kept out of flow, the ShareBox stays viewport-bound and the
      // absolute layer's definite height sizes the canvas instead.
      <div className="relative h-full w-full overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          {/* w-fit + h-full: shrink-wraps around the canvas so the REC badge
              tracks the canvas corner, while the canvas itself is sized by
              the slot height (h-full) with its width from the 720×1280 ratio. */}
          <div className="relative h-full w-fit flex items-center justify-center">
            <canvas
              ref={canvasRef}
              width={720}
              height={1280}
              className="block h-full w-auto rounded-xl border border-white/10"
            />
            {recBadge}
          </div>
        </div>

        {/* Hidden camera video element */}
        <video
          ref={cameraVideoRef}
          autoPlay
          playsInline
          muted
          className="hidden"
        />
      </div>
    );
  }

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
      {recBadge}
    </div>
  );
}
