'use client';

import React, { useCallback, useMemo, useState } from 'react';
import type { GameResults, MobileView, MobileProfile } from '../mobile-types';
import { useTranslation } from '@/lib/i18n/translations';
import { RATING_HEX_COLORS, RATING_LEVELS, type Rating } from '@/lib/game/rating-utils';
import type { Song, HighscoreEntry, GameMode, Difficulty } from '@/types/game';
// R60/4: Wiederverwendung der REINEN Desktop-Share-Bausteine — der Canvas-
// Renderer + Download/Copy/Share-Helfer leben in src/lib/game/share-results.ts,
// der Video-Short-Stack in src/components/social/* (shorts-canvas renderer +
// MediaRecorder, garantiert ohne Ton). NICHTS davon wurde dupliziert.
import {
  createShareableCard,
  renderScoreCardCanvas,
  downloadScoreCard,
  shareScoreCard,
  copyScoreImageToClipboard,
} from '@/lib/game/share-results';
import { ShortsCreator } from '@/components/social/shorts-creator';
import { safeAlert } from '@/lib/safe-dialog';

// ===================== Props =====================

interface MirrorResultsLiteProps {
  gameResults: GameResults | null;
  onNavigate: (v: MobileView) => void;
  /** Sendet einen Navigations-/Aktions-Command an den Desktop */
  onSendDesktopCommand: (command: string) => void;
  /** R60/4: Eigenes Companion-Profil — Fallback für Name/Farbe/Avatar auf
   *  der ScoreCard, wenn der Desktop keine Spieler-Info mitgeschickt hat
   *  (ältere Payloads). */
  profile?: MobileProfile | null;
}

// ===================== Hilfsfunktionen =====================

function haptic() {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(10);
  }
}

/** i18n with a hard fallback (mirror views load a lite dictionary — keys
 *  can be missing; then the German fallback keeps the UI usable). */
function tOr(t: (_key: string) => string, key: string, fallback: string): string {
  return t(key) === key ? fallback : t(key);
}

/** Zulässige GameMode-Werte der HighscoreEntry-Typisierung. */
const VALID_GAME_MODES: readonly GameMode[] = [
  'standard', 'pass-the-mic', 'companion-singalong', 'medley', 'missing-words',
  'duel', 'blind', 'tournament', 'battle-royale', 'duet', 'online', 'rate-my-song',
];

const VALID_DIFFICULTIES: readonly Difficulty[] = ['easy', 'medium', 'hard'];

// ===================== Component =====================

export function MirrorResultsLite({ gameResults, onSendDesktopCommand, profile }: MirrorResultsLiteProps) {
    const { t } = useTranslation();
    // R60/4: Welches Share-Overlay offen ist (null = keins).
    const [shareOverlay, setShareOverlay] = useState<null | 'card' | 'video'>(null);

    const handleCommand = useCallback(
      (cmd: string) => {
        haptic();
        onSendDesktopCommand(cmd);
      },
      [onSendDesktopCommand],
    );

    // R42: translated rating word (8-level scale) instead of raw English
    const ratingKey = `scoreVisualization.${gameResults?.rating}`;
    const ratingText = gameResults
      ? (t(ratingKey) === ratingKey ? gameResults.rating : t(ratingKey))
      : '';
    const ratingColor = RATING_HEX_COLORS[gameResults?.rating || ''] || '#ffd700';

    // ── R60/4: Spieler-Identität — Merge aus Results-Payload (neu, R60:
    //    playerName/Color/Avatar/difficulty/gameMode werden vom Desktop
    //    mitgeschickt) und dem EIGENEN Companion-Profil als Fallback. ──
    const playerName = gameResults?.playerName || profile?.name || tOr(t, 'mobile.mirrorProfileYou', 'Du');
    const playerColor = gameResults?.playerColor || profile?.color || '#06B6D4';
    const playerAvatar = gameResults?.playerAvatar ?? profile?.avatar ?? undefined;
    const difficulty: Difficulty = (gameResults?.difficulty && VALID_DIFFICULTIES.includes(gameResults.difficulty)
      ? gameResults.difficulty
      : 'medium');
    const gameMode: GameMode = (gameResults?.gameMode && VALID_GAME_MODES.includes(gameResults.gameMode as GameMode)
      ? gameResults.gameMode as GameMode
      : 'standard');
    const rating: Rating = (gameResults?.rating && RATING_LEVELS.includes(gameResults.rating as Rating)
      ? gameResults.rating as Rating
      : 'okay');

    // ── R60/4: Synthetisches Song-Objekt für ShortsCreator/ScoreCard — die
    //    Companion kennt Lyrics/BPM etc. nicht, aber der Renderer braucht
    //    nur id/title/artist. ──
    const synthSong = useMemo<Song>(() => ({
      id: gameResults?.songId || 'shared-song',
      title: gameResults?.songTitle || '',
      artist: gameResults?.songArtist || '',
      duration: 0,
      bpm: 0,
      difficulty: 'medium',
      rating: 0,
      lyrics: [],
      gap: 0,
    }), [gameResults?.songId, gameResults?.songTitle, gameResults?.songArtist]);

    // HighscoreEntry aus den Results + gemergter Spieler-Identität — dieselbe
    // Basis, die die Desktop-ShareBox (share-section.tsx) benutzt.
    const scoreEntry = useMemo<HighscoreEntry | null>(() => {
      if (!gameResults) return null;
      return {
        id: 'current',
        playerId: profile?.id || '',
        playerName,
        playerAvatar,
        playerColor,
        songId: gameResults.songId || '',
        songTitle: gameResults.songTitle,
        artist: gameResults.songArtist,
        score: gameResults.score,
        accuracy: gameResults.accuracy,
        maxCombo: gameResults.maxCombo,
        difficulty,
        gameMode,
        rating,
        rankTitle: '',
        playedAt: gameResults.playedAt,
      };
    }, [gameResults, profile?.id, playerName, playerAvatar, playerColor, difficulty, gameMode, rating]);

    // WYSIWYG-Preview (genau das PNG, das geteilt/geladen wird) — Muster wie
    // score-card.tsx (previewUrl-Memo über renderScoreCardCanvas).
    const cardPreviewUrl = useMemo<string | null>(() => {
      if (!scoreEntry) return null;
      try {
        const card = createShareableCard(scoreEntry);
        const canvas = renderScoreCardCanvas(card);
        return canvas.toDataURL('image/png');
      } catch {
        return null;
      }
    }, [scoreEntry]);

    // Web-Share-API nur anbieten, wenn der Browser sie kennt (iOS/Android:
    // ja; Desktop-WebViews: teils) — sonst nur Download/Kopieren.
    const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
    const canCopyImage = typeof window !== 'undefined'
      && 'ClipboardItem' in window
      && !!navigator.clipboard?.write;

    const handleCardShare = useCallback(async () => {
      if (!scoreEntry) return;
      haptic();
      const card = createShareableCard(scoreEntry);
      const ok = await shareScoreCard(card);
      if (!ok) {
        safeAlert(tOr(t, 'shareSection.sharingNotSupported', 'Teilen nicht unterstützt. Karte wurde stattdessen heruntergeladen.'));
        downloadScoreCard(card);
      }
    }, [scoreEntry, t]);

    const handleCardDownload = useCallback(() => {
      if (!scoreEntry) return;
      haptic();
      downloadScoreCard(createShareableCard(scoreEntry));
    }, [scoreEntry]);

    const handleCardCopyImage = useCallback(async () => {
      if (!scoreEntry) return;
      haptic();
      const card = createShareableCard(scoreEntry);
      const ok = await copyScoreImageToClipboard(card);
      safeAlert(ok
        ? tOr(t, 'shareSection.imageCopied', 'Punktekarte kopiert!')
        : tOr(t, 'shareSection.imageCopyFailed', 'Bild kopieren fehlgeschlagen'));
    }, [scoreEntry, t]);

    if (!gameResults) {
      return (
        <div className="flex flex-col items-center justify-center gap-4 px-4 py-16">
          <div className="flex flex-col items-center gap-3 rounded-xl bg-white/5 border border-white/10 p-8">
            <span className="text-4xl">📊</span>
            <h2 className="text-lg font-semibold text-white">
              {t('mobile.mirrorResults')}
            </h2>
            <p className="text-sm text-white/40">
              {t('mobile.mirrorNoResults')}
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-4 px-4 pb-8">
        {/* Song info */}
        <div className="flex flex-col items-center gap-2 rounded-xl bg-white/5 border border-white/10 p-6">
          <p className="text-xs font-medium uppercase tracking-wider text-white/40">
            {t('mobile.mirrorLastPlayed')}
          </p>
          <p className="text-lg font-bold text-white">{gameResults.songTitle}</p>
          <p className="text-sm text-white/60">{gameResults.songArtist}</p>
        </div>

        {/* Score */}
        <div className="flex flex-col items-center gap-2 rounded-xl bg-gradient-to-br from-cyan-500/15 to-purple-500/15 border border-cyan-400/20 p-6">
          <p className="text-4xl font-bold tabular-nums text-white">
            {gameResults.score.toLocaleString()}
          </p>
          <p className="text-sm text-white/60">
            {t('mobile.mirrorPoints')}
          </p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2">
          <div className="flex flex-col items-center gap-1 rounded-xl bg-white/5 border border-white/10 p-3">
            <span className="text-lg font-semibold text-white">
              {Math.round(gameResults.accuracy * 100)}%
            </span>
            <span className="text-[10px] text-white/40">
              {t('mobile.mirrorAccuracy')}
            </span>
          </div>
          <div className="flex flex-col items-center gap-1 rounded-xl bg-white/5 border border-white/10 p-3">
            <span className="text-lg font-semibold text-white">
              {gameResults.maxCombo}x
            </span>
            <span className="text-[10px] text-white/40">
              {t('mobile.mirrorMaxCombo')}
            </span>
          </div>
          <div className="flex flex-col items-center gap-1 rounded-xl bg-white/5 border border-white/10 p-3">
            <span className="text-lg font-semibold uppercase" style={{ color: ratingColor }}>
              {ratingText}
            </span>
            <span className="text-[10px] text-white/40">
              {t('mobile.mirrorRating')}
            </span>
          </div>
        </div>

        {/* ── R60/4: Teilen — ScoreCard + Video-Short direkt auf dem Handy
            (volle Overlays, kein Desktop nötig; Wiederverwendung der reinen
            Share-Bausteine vom Desktop) ── */}
        <div className="flex flex-col gap-2 mt-2">
          {/* Hinweis: shareSection.*-Keys tragen ihre Emojis selbst (📸/🎬/📤) */}
          <p className="text-xs font-semibold uppercase tracking-wider text-white/40 px-1">
            {tOr(t, 'shareSection.title', 'Ergebnis teilen')}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => { haptic(); setShareOverlay('card'); }}
              data-testid="mirror-results-share-card"
              className={
                'flex items-center justify-center gap-2 rounded-xl p-4 ' +
                'bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 ' +
                'font-semibold active:scale-[0.97] transition-transform'
              }
            >
              <span className="text-sm">{tOr(t, 'shareSection.scoreCard', 'Punktekarte')}</span>
            </button>
            <button
              onClick={() => { haptic(); setShareOverlay('video'); }}
              data-testid="mirror-results-share-video"
              className={
                'flex items-center justify-center gap-2 rounded-xl p-4 ' +
                'bg-purple-500/10 border border-purple-400/30 text-purple-300 ' +
                'font-semibold active:scale-[0.97] transition-transform'
              }
            >
              <span className="text-sm">{tOr(t, 'shareSection.videoShort', 'Video-Short')}</span>
            </button>
          </div>
        </div>

        {/* ── Action Buttons ── */}
        <div className="flex flex-col gap-2 mt-2">
          {/* Highscores (Trophy) */}
          <button
            onClick={() => handleCommand('scores')}
            className={
              'w-full flex items-center justify-center gap-2 rounded-xl p-4 ' +
              'bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 ' +
              'font-semibold active:scale-[0.97] transition-transform'
            }
          >
            <span>🏆</span>
            <span className="text-sm">{t('resultsScreen.scores')}</span>
          </button>

          {/* Play Again */}
          <button
            onClick={() => handleCommand('play_again')}
            className={
              'w-full flex items-center justify-center gap-2 rounded-xl p-4 ' +
              'bg-gradient-to-r from-cyan-500/25 to-purple-500/25 border border-cyan-400/30 text-white ' +
              'font-semibold active:scale-[0.97] transition-transform'
            }
          >
            <span>🔄</span>
            <span className="text-sm">{t('results.playAgain')}</span>
          </button>

          {/* Back to Home */}
          <button
            onClick={() => handleCommand('home')}
            className={
              'w-full flex items-center justify-center gap-2 rounded-xl p-4 ' +
              'bg-white/5 border border-white/20 text-white/80 ' +
              'font-medium active:scale-[0.97] transition-transform'
            }
          >
            <span>🏠</span>
            <span className="text-sm">{t('results.backToHome')}</span>
          </button>
        </div>

        {/* ═══════════ R60/4: 📸 SCORE-CARD OVERLAY (fullscreen, Photo-Booth-
            Muster: fixed inset-0 über allem Mirror-Content) ═══════════ */}
        {shareOverlay === 'card' && (
          <div className="fixed inset-0 z-[60] bg-black/95 flex flex-col" data-testid="mirror-results-card-overlay">
            {/* Header */}
            <div className="shrink-0 flex items-center gap-3 px-4 py-3 border-b border-white/10">
              <button
                onClick={() => { haptic(); setShareOverlay(null); }}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 text-white text-xl active:scale-95 transition-transform"
                aria-label={tOr(t, 'mobile.mirrorCancel', 'Abbrechen')}
                data-testid="mirror-results-card-close"
              >
                {'\u2715'}
              </button>
              <p className="text-sm font-semibold text-white">
                {tOr(t, 'shareSection.scoreCard', 'Punktekarte')}
              </p>
            </div>

            {/* WYSIWYG-Preview — genau das PNG, das geteilt/geladen wird */}
            <div className="flex-1 min-h-0 overflow-y-auto kz-scroll px-4 py-3 flex items-center justify-center">
              {cardPreviewUrl ? (
                <img
                  src={cardPreviewUrl}
                  alt={`${tOr(t, 'shareSection.scoreCard', 'Punktekarte')} — ${gameResults.songTitle}`}
                  className="max-w-full max-h-full object-contain rounded-xl border border-white/10 shadow-lg"
                />
              ) : (
                <p className="text-sm text-white/40 px-6 text-center">
                  {tOr(t, 'shareSection.imageCopyFailed', 'Vorschau nicht verfügbar — nutze Download.')}
                </p>
              )}
            </div>

            {/* Aktionen */}
            <div className={'shrink-0 grid gap-2 px-4 pt-2 pb-6 ' + (canShare ? 'grid-cols-3' : 'grid-cols-2')}>
              {canShare && (
                <button
                  onClick={handleCardShare}
                  className={
                    'flex items-center justify-center gap-1.5 rounded-xl p-3.5 text-xs font-semibold ' +
                    'bg-cyan-500/15 border border-cyan-400/40 text-cyan-300 ' +
                    'active:scale-[0.97] transition-transform'
                  }
                >
                  <span>{tOr(t, 'shareSection.shareScore', 'Teilen')}</span>
                </button>
              )}
              <button
                onClick={handleCardDownload}
                className={
                  'flex items-center justify-center gap-1.5 rounded-xl p-3.5 text-xs font-semibold ' +
                  'bg-purple-500/15 border border-purple-400/40 text-purple-300 ' +
                  'active:scale-[0.97] transition-transform'
                }
              >
                <span>{tOr(t, 'shareSection.downloadCard', 'Karte herunterladen')}</span>
              </button>
              {canCopyImage && (
                <button
                  onClick={handleCardCopyImage}
                  className={
                    'flex items-center justify-center gap-1.5 rounded-xl p-3.5 text-xs font-semibold ' +
                    'bg-green-500/15 border border-green-400/40 text-green-300 ' +
                    'active:scale-[0.97] transition-transform'
                  }
                >
                  <span>{tOr(t, 'shareSection.copyImage', 'Bild kopieren')}</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* ═══════════ R60/4: 🎬 VIDEO-SHORT OVERLAY — Wiederverwendung des
            kompletten ShortsCreator-Stacks (shorts-canvas-Renderer +
            MediaRecorder, ohne Ton wie am Desktop). "📲 Mobile Camera" ist
            auf dem Handy sinnlos (das Handy IST das Gerät) → ausgeblendet,
            die eigene Kamera läuft über "Use Device Camera" direkt lokal. ═══════════ */}
        {shareOverlay === 'video' && scoreEntry && (
          <div className="fixed inset-0 z-[60] bg-black flex flex-col" data-testid="mirror-results-video-overlay">
            {/* Header */}
            <div className="shrink-0 flex items-center gap-3 px-4 py-3 border-b border-white/10">
              <button
                onClick={() => { haptic(); setShareOverlay(null); }}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 text-white text-xl active:scale-95 transition-transform"
                aria-label={tOr(t, 'mobile.mirrorCancel', 'Abbrechen')}
                data-testid="mirror-results-video-close"
              >
                {'\u2715'}
              </button>
              <p className="text-sm font-semibold text-white">
                {tOr(t, 'shareSection.videoShort', 'Video-Short')}
              </p>
            </div>

            {/* ShortsCreator (compact) — Canvas ist höhengetrieben, Controls
                darunter; bei sehr kleinen Viewports scrollt der Bereich. */}
            <div className="flex-1 min-h-0 overflow-y-auto kz-scroll">
              <div className="h-full min-h-[420px] flex flex-col px-4 py-3">
                <ShortsCreator
                  song={synthSong}
                  score={scoreEntry}
                  compact
                  hideMobileCameraOption
                />
              </div>
            </div>

            {/* Rechtlicher Hinweis — Video-Shorts sind immer stumm (wie Desktop) */}
            <p className="shrink-0 text-[10px] leading-snug text-white/40 text-center px-4 pt-2 pb-6 border-t border-white/10">
              {tOr(t, 'shareSection.noAudioNote', '🔇 Video-Shorts werden zum Schutz vor Urheberrechtsverletzungen ohne Sound erstellt. Musik kannst du in der Social-Media-App wieder hinzufügen.')}
            </p>
          </div>
        )}
      </div>
    );
}
MirrorResultsLite.displayName = 'MirrorResultsLite';
