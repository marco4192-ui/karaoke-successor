'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { safeAlert } from '@/lib/safe-dialog';
import { Song, HighscoreEntry, GameMode, Difficulty } from '@/types/game';
import {
  createShareableCard,
  downloadScoreCard,
  shareScoreCard,
  copyScoreToClipboard,
  copyScoreImageToClipboard,
  downloadRivalScoreCard,
  shareRivalScoreCard,
  copyRivalScoreToClipboard,
  copyRivalScoreImageToClipboard,
  type RivalCardOptions,
} from '@/lib/game/share-results';
import { ScoreCard, RivalScoreCard } from '@/components/social/score-card';
import { ShortsCreator } from '@/components/social/shorts-creator';
import type { RivalVideoOptions } from '@/components/social/shorts-canvas';
import { useTranslation } from '@/lib/i18n/translations';

/** R44/5.2: accent color presets for the score card PNG (cyan = default). */
const ACCENT_PRESETS = ['#00d9ff', '#ffd700', '#ff006e', '#22c55e', '#a78bfa', '#fb923c'] as const;
const DEFAULT_ACCENT = '#00d9ff';

/** R93: one shareable subject in multiplayer mode (P1 / P2 / rivalry). */
type ShareSubject = 'p1' | 'p2' | 'rival';

/** R93: second-player slot for duel/duet sharing. */
export interface SharePlayer2Slot {
  name: string;
  avatar?: string;
  color: string;
  profileId: string | null;
  companionConnected: boolean;
  result: {
    score: number;
    accuracy: number;
    maxCombo: number;
    notesHit: number;
    notesMissed: number;
    rating: string;
  };
}

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
  /** R93: player 2 slot — presence switches the box into multiplayer mode
   *  (subject selector: P1 / P2 / rivalry card + video). */
  player2?: SharePlayer2Slot | null;
  /** R93: P1 is connected via companion app (their personal card lives on
   *  the phone — the desktop shows a hint instead). */
  player1Companion?: boolean;
  /** R93: duel (⚔️ winner) vs duet (🎤 cooperative) rivalry framing. */
  rivalMode?: 'duel' | 'duet';
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
 *
 * R93 — multiplayer: with `player2` the box grows a subject selector
 * (👤 P1 / 👤 P2 / ⚔️-🎤 rivalry). Companion-connected players get a 📱 hint
 * instead of their card (it lives on their phone); the rivalry card shows
 * both scores with the winner highlighted and also drives the video short.
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
  player2,
  player1Companion,
  rivalMode,
}: ShareSectionProps) {
  const { t } = useTranslation();
  const [playedAt] = useState(() => Date.now());
  // R44/5.2: user-chosen accent color — flows into preview AND shared PNG
  const [accentColor, setAccentColor] = useState<string>(DEFAULT_ACCENT);
  // R93: multiplayer subject selection (defaults to the rivalry card)
  const [subject, setSubject] = useState<ShareSubject>(player2 ? 'rival' : 'p1');

  const isMultiplayer = !!player2;
  const effectiveRivalMode = rivalMode === 'duet' ? 'duet' : 'duel';
  const isDraw = isMultiplayer && playerResult.score === player2.result.score;

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

  // R93: P2's highscore entry for their personal card / video
  const score2Entry = useMemo<HighscoreEntry | null>(() => {
    if (!player2) return null;
    return {
      id: 'current-p2',
      playerId: player2.profileId || '',
      playerName: player2.name,
      playerAvatar: player2.avatar,
      playerColor: player2.color,
      songId: song.id,
      songTitle: song.title,
      artist: song.artist,
      score: player2.result.score,
      accuracy: player2.result.accuracy,
      maxCombo: player2.result.maxCombo,
      difficulty,
      gameMode,
      rating: player2.result.rating as HighscoreEntry['rating'],
      rankTitle: '',
      playedAt,
    };
  }, [player2, song, difficulty, gameMode, playedAt]);

  // R44/5.2: the chosen accent color rides along on the score entry — the
  // preview (ScoreCard) AND every cardAction below render the SAME colored
  // PNG (WYSIWYG).
  const scoreEntryWithAccent = useMemo<HighscoreEntry & { accentColor: string }>(
    () => ({ ...scoreEntry, accentColor }),
    [scoreEntry, accentColor]
  );

  const cardAction = async (action: 'copyText' | 'copyImage' | 'download' | 'share') => {
    if (subject === 'rival' && score2Entry) {
      const a = createShareableCard(scoreEntry);
      const b = createShareableCard(score2Entry);
      const opts: RivalCardOptions = { isDraw, mode: effectiveRivalMode };
      if (action === 'copyText') {
        const ok = await copyRivalScoreToClipboard(a, b, opts);
        safeAlert(ok ? t('shareSection.textCopied') : t('shareSection.textCopyFailed'));
      } else if (action === 'copyImage') {
        const ok = await copyRivalScoreImageToClipboard(a, b, opts);
        safeAlert(ok ? t('shareSection.imageCopied') : t('shareSection.imageCopyFailed'));
      } else if (action === 'download') {
        downloadRivalScoreCard(a, b, opts);
      } else {
        const ok = await shareRivalScoreCard(a, b, opts);
        if (!ok) {
          safeAlert(t('shareSection.sharingNotSupported'));
          downloadRivalScoreCard(a, b, opts);
        }
      }
      return;
    }
    const card = createShareableCard(subject === 'p2' && score2Entry ? score2Entry : scoreEntryWithAccent);
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

  // R93: subject chip factory for the multiplayer selector
  const subjectChip = (value: ShareSubject, label: string, sublabel?: string, avatarNode?: React.ReactNode, crown?: boolean) => {
    const active = subject === value;
    return (
      <button
        key={value}
        type="button"
        onClick={() => setSubject(value)}
        aria-pressed={active}
        data-testid={`share-subject-${value}`}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all duration-150 active:scale-95 truncate ${
          active
            ? 'bg-gradient-to-r from-cyan-500/25 to-purple-500/25 border border-cyan-400/50 text-white'
            : 'bg-white/5 border border-white/10 text-white/60 hover:text-white hover:border-white/25'
        }`}
      >
        {avatarNode}
        <span className="truncate max-w-[90px]">{label}</span>
        {crown && <span aria-hidden>👑</span>}
        {sublabel && <span className="text-white/40 tabular-nums">{sublabel}</span>}
      </button>
    );
  };

  const avatarDot = (color: string, avatar?: string, name?: string) =>
    avatar ? (
      <img src={avatar} alt="" className="w-4 h-4 rounded-full object-cover shrink-0" />
    ) : (
      <span
        className="w-4 h-4 rounded-full shrink-0 flex items-center justify-center text-[9px] font-bold text-white"
        style={{ backgroundColor: color }}
        aria-hidden
      >
        {(name || '?')[0]?.toUpperCase()}
      </span>
    );

  // R93: companion hint box replaces a companion player's personal card
  const companionHint = (name: string) => (
    <div className="flex-1 min-h-0 flex flex-col items-center justify-center text-center gap-3 p-6" data-testid="companion-card-hint">
      <span className="text-4xl" aria-hidden>📱</span>
      <p className="text-sm text-white/60 max-w-xs leading-relaxed">
        {t('shareSection.companionHint').replace('{name}', name)}
      </p>
    </div>
  );

  const p1Companion = !!player1Companion;
  const p2Companion = !!player2?.companionConnected;
  const activeEntry = subject === 'p2' && score2Entry ? score2Entry : scoreEntry;
  const rivalOptions: RivalCardOptions = { isDraw, mode: effectiveRivalMode };
  const rivalVideoOptions: RivalVideoOptions | null = score2Entry
    ? { opponent: score2Entry, isDraw, mode: effectiveRivalMode }
    : null;

  return (
    <Card className="bg-white/5 border-white/10 h-full flex flex-col min-h-0">
      {/* R44/5.1: slim header — less padding, smaller title */}
      <CardHeader className={compact ? 'py-3 pb-1 px-4' : 'pb-2 py-4'}>
        <CardTitle className={`${compact ? 'text-sm' : 'text-base'} flex items-center gap-2`}>
          📤 {t('shareSection.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 flex flex-col">
        {/* R93: multiplayer subject selector — P1 / P2 / rivalry */}
        {isMultiplayer && (
          <div className="flex items-center gap-1.5 flex-wrap mb-2 shrink-0" role="group" aria-label={t('shareSection.title')}>
            {subjectChip(
              'p1',
              playerName,
              p1Companion ? '📱' : playerResult.score.toLocaleString(),
              avatarDot(playerColor, playerAvatar, playerName),
              effectiveRivalMode === 'duel' && !isDraw && playerResult.score > player2.result.score,
            )}
            {subjectChip(
              'p2',
              player2.name,
              p2Companion ? '📱' : player2.result.score.toLocaleString(),
              avatarDot(player2.color, player2.avatar, player2.name),
              effectiveRivalMode === 'duel' && !isDraw && player2.result.score > playerResult.score,
            )}
            {subjectChip(
              'rival',
              effectiveRivalMode === 'duet' ? `🎤 ${t('shareSection.rivalCard').replace('⚔️ ', '')}` : t('shareSection.rivalCard'),
              isDraw && effectiveRivalMode === 'duel' ? '🤝' : undefined,
              undefined,
              false,
            )}
          </div>
        )}

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
              {subject === 'rival' && score2Entry ? (
                <RivalScoreCard
                  song={song}
                  scoreA={scoreEntry}
                  scoreB={score2Entry}
                  options={rivalOptions}
                  compact={compact}
                />
              ) : subject === 'p2' ? (
                p2Companion && player2 ? (
                  companionHint(player2.name)
                ) : (
                  score2Entry && player2 && (
                    <ScoreCard
                      song={song}
                      score={score2Entry}
                      playerName={player2.name}
                      playerAvatar={player2.avatar}
                      compact={compact}
                    />
                  )
                )
              ) : p1Companion ? (
                companionHint(playerName)
              ) : (
                <>
                  <ScoreCard
                    song={song}
                    score={scoreEntryWithAccent}
                    playerName={playerName}
                    playerAvatar={playerAvatar}
                    compact={compact}
                  />

                  {/* R44/5.2: accent color picker — tints preview AND shared PNG
                      (single player cards only; the rivalry card is themed). */}
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
                </>
              )}
            </TabsContent>

            <TabsContent value="video" className="flex-1 min-h-0 mt-0">
              {subject === 'p2' ? (
                p2Companion && player2 ? (
                  companionHint(player2.name)
                ) : (
                  score2Entry && (
                    <ShortsCreator
                      song={song}
                      score={score2Entry}
                      compact={compact}
                    />
                  )
                )
              ) : p1Companion && subject === 'p1' ? (
                companionHint(playerName)
              ) : (
                <ShortsCreator
                  song={song}
                  score={activeEntry}
                  compact={compact}
                  rival={subject === 'rival' ? rivalVideoOptions : null}
                />
              )}
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
