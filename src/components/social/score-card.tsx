'use client';

import { useCallback, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { RATING_HEX_COLORS } from '@/lib/game/rating-utils';
import { useTranslation } from '@/lib/i18n/translations';
import { renderScoreCardCanvas, createShareableCard } from '@/lib/game/share-results';
import type { HighscoreEntry, Song } from '@/types/game';

interface ScoreCardProps {
  song: Song;
  score: HighscoreEntry;
  playerName: string;
  playerAvatar?: string;
  /** R42: compact mode for the results ShareBox — hides the internal action
   *  buttons (the ShareBox provides ONE unified action row) and shrinks the
   *  preview so the whole results screen fits one 1080p view. */
  compact?: boolean;
}

export function ScoreCard({ song, score, playerName, playerAvatar, compact }: ScoreCardProps) {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // R42: preview shows EXACTLY the image that download/copy/share produce
  // (unified renderScoreCardCanvas) — WYSIWYG instead of a DOM approximation.
  const previewUrl = useMemo<string | null>(() => {
    try {
      const card = createShareableCard(score);
      const canvas = renderScoreCardCanvas(card);
      return canvas.toDataURL('image/png');
    } catch {
      return null;
    }
  }, [score]);

  const generateCard = useCallback((): string | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    try {
      const card = createShareableCard(score);
      const rendered = renderScoreCardCanvas(card);
      // Copy the rendered card onto the (hidden) export canvas
      canvas.width = rendered.width;
      canvas.height = rendered.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      ctx.drawImage(rendered, 0, 0);
      return canvas.toDataURL('image/png');
    } catch {
      return null;
    }
  }, [score]);

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
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      const file = new File([blob], 'score-card.png', { type: 'image/png' });
      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: t('scoreCardSocial.shareTitle'),
          files: [file],
        });
      } else {
        downloadCard();
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Share failed:', err);
      downloadCard();
    }
  }, [generateCard, downloadCard, t]);

  const ratingColor = RATING_HEX_COLORS[score.rating] || '#ffd700';
  const ratingLabel = t(`scoreVisualization.${score.rating}`);
  const ratingText = ratingLabel === `scoreVisualization.${score.rating}` ? score.rating : ratingLabel;

  return (
    <div className="space-y-3">
      {/* Hidden canvas for export */}
      <canvas ref={canvasRef} className="hidden" aria-hidden />

      {/* WYSIWYG preview — the exact PNG that gets shared */}
      {previewUrl ? (
        <div className={compact ? 'max-w-[280px] mx-auto' : 'max-w-md mx-auto'}>
          <img
            src={previewUrl}
            alt={`${t('shareSection.scoreCard')} — ${song.title}`}
            className="w-full rounded-xl border border-white/10 shadow-lg"
          />
        </div>
      ) : (
        /* Fallback: DOM approximation (e.g. canvas blocked) */
        <div className={`relative aspect-[1200/630] w-full ${compact ? 'max-w-[280px]' : 'max-w-md'} mx-auto rounded-xl overflow-hidden bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] border border-white/10`}>
          <div className="relative p-4 h-full flex flex-col">
            <div className="text-white/60 text-[10px] font-medium">{t('scoreCardSocial.branding')}</div>
            <div className="mt-2 flex-1 min-w-0">
              <div className="text-white text-base font-bold truncate">{song.title}</div>
              <div className="text-white/60 text-xs truncate">{song.artist}</div>
              <div className="mt-2 bg-white/10 rounded-lg p-2 text-center">
                <div className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">
                  {score.score.toLocaleString()}
                </div>
                <div className="text-white/60 text-[10px] mt-0.5">{t('scoreCardSocial.points')}</div>
              </div>
              <div className="mt-2 flex justify-between text-[10px] text-white/80">
                <span>🎯 {score.accuracy.toFixed(1)}%</span>
                <span>⚡ {score.maxCombo}x</span>
                <span>📊 {score.difficulty}</span>
              </div>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <div className="flex items-center gap-1.5 min-w-0">
                {playerAvatar ? (
                  <img src={playerAvatar} alt={playerName} className="w-6 h-6 rounded-full object-cover" />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-500 to-purple-500 flex items-center justify-center text-white font-bold text-[10px]">
                    {playerName[0]?.toUpperCase() || '?'}
                  </div>
                )}
                <span className="text-white font-medium text-xs truncate">{playerName}</span>
              </div>
              <div className="text-sm font-bold uppercase" style={{ color: ratingColor }}>{ratingText}!</div>
            </div>
          </div>
        </div>
      )}

      {/* Actions — hidden in compact mode (ShareBox provides its own row) */}
      {!compact && (
        <div className="flex gap-2">
          <Button onClick={downloadCard} className="flex-1 bg-gradient-to-r from-cyan-500 to-purple-500">
            {t('scoreCardSocial.download')}
          </Button>
          <Button onClick={shareCard} variant="outline" className="flex-1 border-white/20 text-white">
            {t('scoreCardSocial.share')}
          </Button>
        </div>
      )}
    </div>
  );
}
