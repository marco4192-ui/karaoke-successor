'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { safeAlert } from '@/lib/safe-dialog';
import { Song, HighscoreEntry, GameMode, Difficulty } from '@/types/game';
import { createShareableCard, downloadScoreCard, shareScoreCard, copyScoreToClipboard, copyScoreImageToClipboard } from '@/lib/game/share-results';
import { ScoreCard } from '@/components/social/score-card';
import { ShortsCreator } from '@/components/social/shorts-creator';
import { useTranslation } from '@/lib/i18n/translations';

/** R44/5.2: accent color presets for the score card PNG (cyan = default). */
const ACCENT_PRESETS = ['#00d9ff', '#ffd700', '#ff006e', '#22c55e', '#a78bfa', '#fb923c'] as const;
const DEFAULT_ACCENT = '#00d9ff';

interface ShareSectionProps {
  song: Song;
  playerResult: {
    score: number;
    accuracy: number;
    maxCombo: number;
    notesHit: number;
    notesMissed: number;
    rating: string;
  };
  activeProfileId: string | null;
  playerName: string;
  playerAvatar: string | undefined;
  playerColor: string;
  difficulty: Difficulty;
  gameMode: GameMode;
  /** R42: compact one-screen variant for the results layout */
  compact?: boolean;
}

/**
 * R42 — ShareBox: the whole social-media area condensed into ONE tidy card.
 * Before: a big tab card + a separate loose row of four buttons below it +
 * duplicate download/share buttons inside the ScoreCard (six buttons total).
 * Now: one card containing the tab switch (Score-Card / Video-Short), a
 * compact WYSIWYG preview, and a single unified 2×2 action grid.
 *
 * R44 — space & feedback rework (5.1–5.9): compact header, preview fills the
 * available space WITHOUT scrolling, action grid + 🔇 note pinned to the
 * bottom, accent color picker for the score card, video tab fits fully
 * (height-driven canvas, bigger PiP, neutral camera buttons), recorded video
 * replaces the live view, silent recordings (legal), pressed-state feedback.
 */
export function ShareSection({
  song,
  playerResult,
  activeProfileId,
  playerName,
  playerAvatar,
  playerColor,
  difficulty,
  gameMode,
  compact,
}: ShareSectionProps) {
  const { t } = useTranslation();
  const [playedAt] = useState(() => Date.now());
  // R44/5.2: user-chosen accent color — flows into preview AND shared PNG
  const [accentColor, setAccentColor] = useState<string>(DEFAULT_ACCENT);

  // Memoized so the ScoreCard preview canvas doesn't regenerate every render
  const scoreEntry = useMemo<HighscoreEntry>(() => ({
    id: 'current',
    playerId: activeProfileId || '',
    playerName,
    playerAvatar,
    playerColor,
    songId: song.id,
    songTitle: song.title,
    artist: song.artist,
    score: playerResult.score,
    accuracy: playerResult.accuracy,
    maxCombo: playerResult.maxCombo,
    difficulty,
    gameMode,
    rating: playerResult.rating as HighscoreEntry['rating'],
    rankTitle: '',
    playedAt,
  }), [activeProfileId, playerName, playerAvatar, playerColor, song, playerResult, difficulty, gameMode, playedAt]);

  // R44/5.2: the chosen accent color rides along on the score entry — the
  // preview (ScoreCard) AND every cardAction below render the SAME colored
  // PNG (WYSIWYG).
  const scoreEntryWithAccent = useMemo<HighscoreEntry & { accentColor: string }>(
    () => ({ ...scoreEntry, accentColor }),
    [scoreEntry, accentColor]
  );

  const cardAction = async (action: 'copyText' | 'copyImage' | 'download' | 'share') => {
    const card = createShareableCard(scoreEntryWithAccent);
    if (action === 'copyText') {
      const ok = await copyScoreToClipboard(card);
      safeAlert(ok ? t('shareSection.textCopied') : t('shareSection.textCopyFailed'));
    } else if (action === 'copyImage') {
      const ok = await copyScoreImageToClipboard(card);
      safeAlert(ok ? t('shareSection.imageCopied') : t('shareSection.imageCopyFailed'));
    } else if (action === 'download') {
      downloadScoreCard(card);
    } else {
      const ok = await shareScoreCard(card);
      if (!ok) {
        safeAlert(t('shareSection.sharingNotSupported'));
        downloadScoreCard(card);
      }
    }
  };

  const actionButton = (action: 'copyText' | 'copyImage' | 'download' | 'share', label: string, className: string) => (
    <Button
      variant="outline"
      size={compact ? 'sm' : 'default'}
      onClick={() => cardAction(action)}
      className={`active:scale-95 transition-all duration-150 ${className}`}
    >
      {label}
    </Button>
  );

  const isCustomAccent = !ACCENT_PRESETS.includes(accentColor as (typeof ACCENT_PRESETS)[number]);

  return (
    <Card className="bg-white/5 border-white/10 h-full flex flex-col min-h-0">
      {/* R44/5.1: slim header — less padding, smaller title */}
      <CardHeader className={compact ? 'py-3 pb-1 px-4' : 'pb-2 py-4'}>
        <CardTitle className={`${compact ? 'text-sm' : 'text-base'} flex items-center gap-2`}>
          📤 {t('shareSection.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 flex flex-col">
        <Tabs defaultValue="card" className="w-full flex flex-col flex-1 min-h-0">
          <TabsList className={`grid w-full grid-cols-2 ${compact ? 'h-8 mb-2' : 'mb-4 h-9'}`}>
            <TabsTrigger value="card" className="text-xs">📸 {t('shareSection.scoreCard')}</TabsTrigger>
            <TabsTrigger value="video" className="text-xs">🎬 {t('shareSection.videoShort')}</TabsTrigger>
          </TabsList>

          {/* R44/5.1: preview area — claims ALL remaining space, NO scrolling
              and NO max-height cap (the former max-h-[420px] overflow area is
              gone). The action grid is pinned to the bottom via mt-auto. */}
          <div className="flex-1 min-h-0 flex flex-col">
            <TabsContent value="card" className="flex-1 min-h-0 flex flex-col mt-0">
              <ScoreCard
                song={song}
                score={scoreEntryWithAccent}
                playerName={playerName}
                playerAvatar={playerAvatar}
                compact={compact}
              />

              {/* R44/5.2: accent color picker — tints preview AND shared PNG */}
              <div
                className="shrink-0 pt-2 flex items-center justify-center gap-2 flex-wrap"
                role="group"
                aria-label={t('shareSection.accentColor')}
              >
                <span className="text-[10px] text-white/50">{t('shareSection.accentColor')}:</span>
                {ACCENT_PRESETS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setAccentColor(color)}
                    aria-label={`${t('shareSection.accentColor')} ${color}`}
                    aria-pressed={accentColor === color}
                    className={`w-6 h-6 rounded-full shrink-0 active:scale-95 transition-all duration-150 hover:scale-110 ${
                      accentColor === color ? 'ring-2 ring-white/80' : 'ring-1 ring-white/20'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
                {/* Custom color — color-wheel swatch wrapping a hidden input */}
                <label
                  className={`relative w-6 h-6 rounded-full shrink-0 cursor-pointer overflow-hidden active:scale-95 transition-all duration-150 ${
                    isCustomAccent ? 'ring-2 ring-white/80' : 'ring-1 ring-white/20 hover:scale-110'
                  }`}
                  style={isCustomAccent ? { backgroundColor: accentColor } : undefined}
                  title={t('shareSection.accentColor')}
                >
                  {!isCustomAccent && (
                    <span
                      className="absolute inset-0 rounded-full"
                      style={{ background: 'conic-gradient(#ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)' }}
                      aria-hidden
                    />
                  )}
                  <input
                    type="color"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    aria-label={t('shareSection.accentColor')}
                  />
                </label>
              </div>
            </TabsContent>

            <TabsContent value="video" className="flex-1 min-h-0 mt-0">
              <ShortsCreator
                song={song}
                score={scoreEntry}
                compact={compact}
              />
            </TabsContent>
          </div>

          {/* R44/5.1: ONE unified action row, pinned to the BOTTOM of the box */}
          <div className={`grid grid-cols-2 gap-2 ${compact ? 'mt-auto pt-3 border-t border-white/10' : 'mt-4'}`}>
            {actionButton('copyText', t('shareSection.copyText'), 'border-green-500/40 text-green-400 hover:bg-green-500/10')}
            {actionButton('copyImage', t('shareSection.copyImage'), 'border-green-500/40 text-green-400 hover:bg-green-500/10')}
            {actionButton('download', t('shareSection.downloadCard'), 'border-purple-500/40 text-purple-400 hover:bg-purple-500/10')}
            {actionButton('share', t('shareSection.shareScore'), 'border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/10')}
          </div>

          {/* R44/5.9: legal note — recorded video shorts are always silent */}
          <p className="text-[10px] leading-snug text-white/40 text-center px-2 pt-1.5">
            {t('shareSection.noAudioNote')}
          </p>
        </Tabs>
      </CardContent>
    </Card>
  );
}
