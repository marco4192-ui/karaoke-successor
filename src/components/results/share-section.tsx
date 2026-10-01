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

  const cardAction = async (action: 'copyText' | 'copyImage' | 'download' | 'share') => {
    const card = createShareableCard(scoreEntry);
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
      className={className}
    >
      {label}
    </Button>
  );

  return (
    <Card className="bg-white/5 border-white/10 h-full flex flex-col">
      <CardHeader className={compact ? 'pb-2 py-4' : 'pb-2'}>
        <CardTitle className="text-base flex items-center gap-2">
          📤 {t('shareSection.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 flex flex-col">
        <Tabs defaultValue="card" className="w-full flex flex-col flex-1 min-h-0">
          <TabsList className={`grid w-full grid-cols-2 ${compact ? 'mb-3 h-9' : 'mb-4'}`}>
            <TabsTrigger value="card" className="text-xs">📸 {t('shareSection.scoreCard')}</TabsTrigger>
            <TabsTrigger value="video" className="text-xs">🎬 {t('shareSection.videoShort')}</TabsTrigger>
          </TabsList>

          {/* Preview area — constrained so the results screen never overflows;
              vertically centered so the stretched share box looks balanced */}
          <div className={`flex-1 min-h-0 flex items-center justify-center ${compact ? 'overflow-y-auto kz-scroll max-h-[420px]' : ''}`}>
            <TabsContent value="card" className="w-full mt-0">
              <ScoreCard
                song={song}
                score={scoreEntry}
                playerName={playerName}
                playerAvatar={playerAvatar}
                compact={compact}
              />
            </TabsContent>
            <TabsContent value="video" className="w-full mt-0">
              <ShortsCreator
                song={song}
                score={scoreEntry}
                audioUrl={song.audioUrl}
              />
            </TabsContent>
          </div>

          {/* ONE unified action row inside the box */}
          <div className={`grid grid-cols-2 gap-2 ${compact ? 'mt-3 pt-3 border-t border-white/10' : 'mt-4'}`}>
            {actionButton('copyText', t('shareSection.copyText'), 'border-green-500/40 text-green-400 hover:bg-green-500/10')}
            {actionButton('copyImage', t('shareSection.copyImage'), 'border-green-500/40 text-green-400 hover:bg-green-500/10')}
            {actionButton('download', t('shareSection.downloadCard'), 'border-purple-500/40 text-purple-400 hover:bg-purple-500/10')}
            {actionButton('share', t('shareSection.shareScore'), 'border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/10')}
          </div>
        </Tabs>
      </CardContent>
    </Card>
  );
}
