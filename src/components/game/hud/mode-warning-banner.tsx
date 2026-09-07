'use client';

import { useTranslation } from '@/lib/i18n/translations';

/**
 * ModeWarningBanner — in-game warning cue for Blind Karaoke and Missing Words.
 *
 * useGameModes reports two phases per mode:
 *   1. COUNTDOWN (countdown > 0, active): the next blind/hidden section starts
 *      in N seconds → prominent animated banner so the singer can prepare.
 *   2. ACTIVE (countdown === 0, active): the singer is currently inside a
 *      blind/hidden section → compact persistent status pill.
 *
 * Previously these signals were only console.debug'ed (see game-screen-hook);
 * this component surfaces them as the visual cues the TODO asked for.
 */

export interface ModeWarning {
  countdown: number;
  active: boolean;
}

interface ModeWarningBannerProps {
  /** Blind Karaoke warning state (only relevant in 'blind' game mode) */
  blindWarning: ModeWarning;
  /** Missing Words warning state (only relevant in 'missing-words' game mode) */
  missingWordsWarning: ModeWarning;
}

export function ModeWarningBanner({ blindWarning, missingWordsWarning }: ModeWarningBannerProps) {
  const { t } = useTranslation();

  const isBlindModeRelevant = blindWarning.active;
  const isMwModeRelevant = missingWordsWarning.active;

  // Neither mode is warning → render nothing (also keeps the DOM clean)
  if (!isBlindModeRelevant && !isMwModeRelevant) return null;

  const isCountdownPhase = (w: ModeWarning) => w.countdown > 0 && w.active;
  const isActivePhase = (w: ModeWarning) => w.countdown === 0 && w.active;

  // ── Missing Words warning: countdown phase ──
  if (isMwModeRelevant) {
    if (isCountdownPhase(missingWordsWarning)) {
      return (
        <div
          role="status"
          aria-live="assertive"
          data-testid="mode-warning-banner"
          data-warning="missing-words-countdown"
          data-countdown={missingWordsWarning.countdown}
          className="absolute top-16 left-1/2 -translate-x-1/2 z-30 pointer-events-none"
        >
          <div className="flex items-center gap-3 rounded-2xl border-2 border-amber-400/60 bg-amber-500/15 backdrop-blur-md px-5 py-3 shadow-lg shadow-amber-500/20 animate-in fade-in slide-in-from-top-4 duration-300 mode-warning-pulse">
            <span className="text-3xl animate-bounce" aria-hidden="true">📝</span>
            <div className="text-left">
              <p className="text-amber-200 font-bold text-sm tracking-wide uppercase">
                {t('game.mwWarningIncoming').replace('{n}', String(missingWordsWarning.countdown))}
              </p>
              <p className="text-white/60 text-xs mt-0.5">
                {t('game.mwWarningHint')}
              </p>
            </div>
            <span className="ml-2 w-9 h-9 rounded-full bg-amber-500/30 border border-amber-400/50 flex items-center justify-center text-amber-200 font-mono font-bold text-lg tabular-nums">
              {missingWordsWarning.countdown}
            </span>
          </div>
        </div>
      );
    }
    if (isActivePhase(missingWordsWarning)) {
      return (
        <div
          role="status"
          aria-live="off"
          data-testid="mode-warning-banner"
          data-warning="missing-words-active"
          className="absolute top-16 left-1/2 -translate-x-1/2 z-30 pointer-events-none"
        >
          <div className="flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-500/10 backdrop-blur-md px-4 py-1.5 animate-in fade-in duration-300">
            <span className="text-lg" aria-hidden="true">📝</span>
            <span className="text-amber-200/90 font-semibold text-xs tracking-wide uppercase">
              {t('game.mwWarningActive')}
            </span>
          </div>
        </div>
      );
    }
  }

  // ── Blind Karaoke warning: countdown phase ──
  if (isBlindModeRelevant) {
    if (isCountdownPhase(blindWarning)) {
      return (
        <div
          role="status"
          aria-live="assertive"
          data-testid="mode-warning-banner"
          data-warning="blind-countdown"
          data-countdown={blindWarning.countdown}
          className="absolute top-16 left-1/2 -translate-x-1/2 z-30 pointer-events-none"
        >
          <div className="flex items-center gap-3 rounded-2xl border-2 border-purple-400/60 bg-purple-500/15 backdrop-blur-md px-5 py-3 shadow-lg shadow-purple-500/20 animate-in fade-in slide-in-from-top-4 duration-300 mode-warning-pulse">
            <span className="text-3xl animate-bounce" aria-hidden="true">🙈</span>
            <div className="text-left">
              <p className="text-purple-200 font-bold text-sm tracking-wide uppercase">
                {t('game.blindWarningIncoming').replace('{n}', String(blindWarning.countdown))}
              </p>
              <p className="text-white/60 text-xs mt-0.5">
                {t('game.blindWarningHint')}
              </p>
            </div>
            <span className="ml-2 w-9 h-9 rounded-full bg-purple-500/30 border border-purple-400/50 flex items-center justify-center text-purple-200 font-mono font-bold text-lg tabular-nums">
              {blindWarning.countdown}
            </span>
          </div>
        </div>
      );
    }
    if (isActivePhase(blindWarning)) {
      return (
        <div
          role="status"
          aria-live="off"
          data-testid="mode-warning-banner"
          data-warning="blind-active"
          className="absolute top-16 left-1/2 -translate-x-1/2 z-30 pointer-events-none"
        >
          <div className="flex items-center gap-2 rounded-full border border-purple-400/40 bg-purple-500/10 backdrop-blur-md px-4 py-1.5 animate-in fade-in duration-300">
            <span className="text-lg" aria-hidden="true">🙈</span>
            <span className="text-purple-200/90 font-semibold text-xs tracking-wide uppercase">
              {t('game.blindWarningActive')}
            </span>
          </div>
        </div>
      );
    }
  }

  return null;
}
