'use client';

import { useTranslation } from '@/lib/i18n/translations';

/**
 * ModeWarningBanner — in-game warning cue for Blind Karaoke and Missing Words.
 *
 * useGameModes reports two phases per mode:
 *   1. COUNTDOWN (countdown > 0, active): the next blind/hidden section starts
 *      in N seconds → prominent animated banner so the singer can prepare.
 *      The countdown digit re-mounts on each tick (key prop) and pops in,
 *      matching the audible cue from useModeWarningCues.
 *   2. ACTIVE (countdown === 0, active): the singer is currently inside a
 *      blind/hidden section → compact persistent status pill with a pulsing
 *      dot so it reads as "live" at a glance.
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

  // Shared visual language, tinted per mode (amber = words, purple = blind)
  const tint = {
    mw: {
      border: 'border-amber-400/70',
      bg: 'bg-gradient-to-br from-amber-500/25 via-amber-500/10 to-orange-500/15',
      pillBg: 'bg-amber-500/25',
      ring: 'ring-amber-400/40',
      shadow: 'shadow-amber-500/30',
      text: 'text-amber-100',
      digitBg: 'bg-amber-400/25',
      digitText: 'text-amber-100',
      icon: '📝',
    },
    blind: {
      border: 'border-purple-400/70',
      bg: 'bg-gradient-to-br from-purple-500/25 via-purple-500/10 to-fuchsia-500/15',
      pillBg: 'bg-purple-500/25',
      ring: 'ring-purple-400/40',
      shadow: 'shadow-purple-500/30',
      text: 'text-purple-100',
      digitBg: 'bg-purple-400/25',
      digitText: 'text-purple-100',
      icon: '🙈',
    },
  } as const;

  const renderCountdown = (w: ModeWarning, c: typeof tint.mw, warningId: string, incomingKey: string, hintKey: string) => (
    <div
      role="status"
      aria-live="assertive"
      data-testid="mode-warning-banner"
      data-warning={warningId}
      data-countdown={w.countdown}
      className="absolute top-16 left-1/2 -translate-x-1/2 z-30 pointer-events-none"
    >
      <div
        className={`flex items-center gap-3 rounded-2xl border-2 ${c.border} ${c.bg} ring-1 ${c.ring} backdrop-blur-md px-5 py-3 shadow-xl ${c.shadow} animate-in fade-in slide-in-from-top-4 duration-300 mode-warning-pulse`}
      >
        <span className="text-3xl animate-bounce drop-shadow-lg" aria-hidden="true">{c.icon}</span>
        <div className="text-left">
          <p className={`${c.text} font-bold text-sm tracking-wide uppercase drop-shadow`}>
            {t(incomingKey).replace('{n}', String(w.countdown))}
          </p>
          <p className="text-white/60 text-xs mt-0.5">
            {t(hintKey)}
          </p>
        </div>
        <span
          key={w.countdown}
          className={`warning-countdown-pop ml-2 w-9 h-9 rounded-full ${c.digitBg} border ${c.border} flex items-center justify-center ${c.digitText} font-mono font-bold text-lg tabular-nums`}
          aria-hidden="true"
        >
          {w.countdown}
        </span>
        {/* Screen-reader friendly live value (the visible digit is aria-hidden) */}
        <span className="sr-only">{w.countdown}</span>
      </div>
    </div>
  );

  const renderActive = (w: ModeWarning, c: typeof tint.mw, warningId: string, activeKey: string) => (
    <div
      role="status"
      aria-live="off"
      data-testid="mode-warning-banner"
      data-warning={warningId}
      className="absolute top-16 left-1/2 -translate-x-1/2 z-30 pointer-events-none"
    >
      <div className={`flex items-center gap-2 rounded-full border ${c.border} ${c.pillBg} ring-1 ${c.ring} backdrop-blur-md px-4 py-1.5 shadow-lg ${c.shadow} animate-in fade-in duration-300`}>
        {/* Pulsing live dot — reads as "currently inside a blind/hidden passage" */}
        <span className={`relative flex h-2.5 w-2.5 ${c.text}`} aria-hidden="true">
          <span className={`absolute inline-flex h-full w-full rounded-full ${c.digitBg} animate-ping`} />
          <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${c.border} border`} />
        </span>
        <span className="text-lg" aria-hidden="true">{c.icon}</span>
        <span className={`${c.text}/90 font-semibold text-xs tracking-wide uppercase`}>
          {t(activeKey)}
        </span>
      </div>
    </div>
  );

  // ── Missing Words warning ──
  if (isMwModeRelevant) {
    if (isCountdownPhase(missingWordsWarning)) {
      return renderCountdown(missingWordsWarning, tint.mw, 'missing-words-countdown', 'game.mwWarningIncoming', 'game.mwWarningHint');
    }
    if (isActivePhase(missingWordsWarning)) {
      return renderActive(missingWordsWarning, tint.mw, 'missing-words-active', 'game.mwWarningActive');
    }
  }

  // ── Blind Karaoke warning ──
  if (isBlindModeRelevant) {
    if (isCountdownPhase(blindWarning)) {
      return renderCountdown(blindWarning, tint.blind, 'blind-countdown', 'game.blindWarningIncoming', 'game.blindWarningHint');
    }
    if (isActivePhase(blindWarning)) {
      return renderActive(blindWarning, tint.blind, 'blind-active', 'game.blindWarningActive');
    }
  }

  return null;
}
