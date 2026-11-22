'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { RATING_HEX_COLORS } from '@/lib/game/rating-utils';
import { useTranslation } from '@/lib/i18n/translations';
import {
  renderScoreCardCanvas,
  renderRivalScoreCardCanvas,
  createShareableCard,
  preloadShareAvatar,
  type RivalCardOptions,
} from '@/lib/game/share-results';
import type { HighscoreEntry, Song } from '@/types/game';

interface ScoreCardProps {
  song: Song;
  /** R44: may carry `accentColor` from the ShareBox swatch picker — it flows
   *  straight into the unified card renderer (WYSIWYG with the shared PNG). */
  score: HighscoreEntry & { accentColor?: string };
  playerName: string;
  playerAvatar?: string;
  /** R42: compact mode for the results ShareBox — hides the internal action
   *  buttons (the ShareBox provides ONE unified action row) and lets the
   *  preview fill the whole ShareBox content area (R44: no more 280px cap). */
  compact?: boolean;
}

export function ScoreCard({ song, score, playerName, playerAvatar, compact }: ScoreCardProps) {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // R93: avatar images decode asynchronously — bump a counter when the cached
  // avatar is ready so the WYSIWYG preview re-renders with the real photo.
  const [avatarReadyTick, setAvatarReadyTick] = useState(0);
  useEffect(() => {
    let cancelled = false;
    if (playerAvatar) {
      void preloadShareAvatar(playerAvatar).then(() => {
        if (!cancelled) setAvatarReadyTick((n) => n + 1);
      });
    }
    return () => { cancelled = true; };
  }, [playerAvatar]);

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
  }, [score, avatarReadyTick]);

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

  // R44: compact mode — the preview is allowed to claim ALL the space the
  // ShareBox offers (fills width AND height, letterboxed via object-contain).
  const previewWrapperClass = compact
    ? 'flex-1 min-h-0 flex items-center justify-center'
    : 'max-w-md mx-auto';
  const previewImgClass = compact
    ? 'max-h-full max-w-full object-contain rounded-xl border border-white/10 shadow-lg'
    : 'w-full rounded-xl border border-white/10 shadow-lg';

  return (
    <div className={compact ? 'flex-1 min-h-0 flex flex-col' : 'space-y-3'}>
      {/* Hidden canvas for export */}
      <canvas ref={canvasRef} className="hidden" aria-hidden />

      {/* WYSIWYG preview — the exact PNG that gets shared */}
      {previewUrl ? (
        <div className={previewWrapperClass}>
          <img
            src={previewUrl}
            alt={`${t('shareSection.scoreCard')} — ${song.title}`}
            className={previewImgClass}
          />
        </div>
      ) : (
        /* Fallback: DOM approximation (e.g. canvas blocked) — R93 restyled to
           match the new canvas design (dark navy + rating stripe + progress). */
        <div className={`relative aspect-[1200/630] w-full ${compact ? 'max-h-full' : 'max-w-md'} mx-auto rounded-xl overflow-hidden bg-gradient-to-b from-[#0b1220] to-[#0d1b2e] border border-white/10`}>
          <div className="absolute inset-0 p-4 h-full flex flex-col">
            <div className="flex items-center justify-between">
              <span className="text-theme-accent/80 text-[10px] font-semibold tracking-widest">{t('scoreCardSocial.branding')}</span>
              <span className="text-[10px] font-semibold text-yellow-400">{score.rankTitle}</span>
            </div>
            <div className="mt-1 min-w-0">
              <div className="text-white text-base font-bold truncate">{song.title}</div>
              <div className="text-white/55 text-xs truncate">{song.artist}</div>
            </div>
            <div className="relative mt-2 rounded-xl bg-white/5 border-l-4 p-2 overflow-hidden" style={{ borderColor: ratingColor }}>
              <div className="flex items-center justify-between gap-2">
                <div className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-cyan-300 tabular-nums">
                  {score.score.toLocaleString()}
                </div>
                <div className="text-sm font-black uppercase px-2 py-0.5 rounded-full" style={{ backgroundColor: ratingColor, color: '#0b1220' }}>
                  {ratingText}!
                </div>
              </div>
              <div className="mt-1.5 h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${Math.min(100, (score.score / 10000) * 100)}%`, background: `linear-gradient(90deg, #4fc3f7, ${ratingColor})` }} />
              </div>
              <div className="text-white/50 text-[10px] mt-1">{t('scoreCardSocial.points')}</div>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-1.5 text-center">
              <div className="rounded-lg bg-white/5 py-1">
                <div className="text-white text-xs font-bold">🎯 {score.accuracy.toFixed(1)}%</div>
                <div className="text-white/45 text-[9px]">{t('share.accuracy')}</div>
              </div>
              <div className="rounded-lg bg-white/5 py-1">
                <div className="text-white text-xs font-bold">⚡ {score.maxCombo}x</div>
                <div className="text-white/45 text-[9px]">{t('share.maxCombo')}</div>
              </div>
              <div className="rounded-lg bg-white/5 py-1">
                <div className="text-white text-xs font-bold">📊 {score.difficulty}</div>
                <div className="text-white/45 text-[9px]">{t('share.difficulty')}</div>
              </div>
            </div>
            <div className="mt-auto flex items-center justify-between">
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
              <div className="text-white/35 text-[10px]">{t('scoreCardSocial.hashtags')}</div>
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

// ---------------------------------------------------------------------------
// R93 — RivalScoreCard: both players on ONE card, winner highlighted
// ---------------------------------------------------------------------------

interface RivalScoreCardProps {
  song: Song;
  /** Player 1's entry (may carry accentColor — unused here, theme wins). */
  scoreA: HighscoreEntry;
  scoreB: HighscoreEntry;
  options: RivalCardOptions;
  compact?: boolean;
}

export function RivalScoreCard({ song, scoreA, scoreB, options, compact }: RivalScoreCardProps) {
  const { t } = useTranslation();
  // Both avatars must be in the decode cache before the canvas renders them
  const [avatarReadyTick, setAvatarReadyTick] = useState(0);
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      preloadShareAvatar(scoreA.playerAvatar),
      preloadShareAvatar(scoreB.playerAvatar),
    ]).then(() => {
      if (!cancelled) setAvatarReadyTick((n) => n + 1);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- entries change identity per results screen mount
  }, [scoreA.playerAvatar, scoreB.playerAvatar]);

  const previewUrl = useMemo<string | null>(() => {
    try {
      const canvas = renderRivalScoreCardCanvas(createShareableCard(scoreA), createShareableCard(scoreB), options);
      return canvas.toDataURL('image/png');
    } catch {
      return null;
    }
  }, [scoreA, scoreB, options, avatarReadyTick]);

  const wrapperClass = compact ? 'flex-1 min-h-0 flex items-center justify-center' : 'max-w-2xl mx-auto';
  const imgClass = compact
    ? 'max-h-full max-w-full object-contain rounded-xl border border-white/10 shadow-lg'
    : 'w-full rounded-xl border border-white/10 shadow-lg';

  if (!previewUrl) {
    return (
      <div className="flex-1 min-h-0 flex items-center justify-center text-white/40 text-sm p-6 text-center">
        {t('shareSection.rivalCard')}
      </div>
    );
  }

  return (
    <div className={wrapperClass}>
      <img
        src={previewUrl}
        alt={`${t('shareSection.rivalCard')} — ${song.title}`}
        className={imgClass}
        data-testid="rival-scorecard-preview"
      />
    </div>
  );
}
