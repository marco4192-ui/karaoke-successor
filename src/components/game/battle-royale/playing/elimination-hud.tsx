'use client';

/**
 * Elimination HUD overlays — extracted 1:1 from
 * battle-royale/playing-view.tsx (task R12): #10 elimination-camera red
 * vignette, R16 alarm frame (R19 amber showdown variant), the prominent
 * R16/R19 elimination-countdown / showdown clock and the non-blocking
 * mid-round elimination banner (2.2-R3, R19 coin-flip variant).
 */
import { useTranslation } from '@/lib/i18n/translations';

export interface EliminationHudProps {
  isEliminationCamera: boolean;
  elimCountdownSec: number | null;
  showdownActive: boolean;
  isElimCritical: boolean;
  midRoundEliminationNotice?: { id: string; name: string; byCoinFlip?: boolean } | null;
}

export function EliminationHud({
  isEliminationCamera,
  elimCountdownSec,
  showdownActive,
  isElimCritical,
  midRoundEliminationNotice,
}: EliminationHudProps) {
  const { t } = useTranslation();

  return (
    <>
      {/* #10 Elimination Camera: Red vignette overlay — last 10 seconds of the
          ELIMINATION countdown (R16: intensity follows the elimination clock) */}
      {isEliminationCamera && elimCountdownSec != null && (
        <div className="absolute inset-0 pointer-events-none z-30 transition-opacity duration-1000"
          style={{
            background: `radial-gradient(ellipse at center, transparent 40%, rgba(220, 38, 38, ${0.3 * (1 - elimCountdownSec / 10)}) 100%)`,
          }}
        />
      )}

      {/* ─────────── R16 (user request 1): ALARM FRAME ───────────
          During the last 5 seconds of EVERY elimination countdown a narrow
          red frame around the ENTIRE screen blinks like an alarm beacon —
          hard on/off, ~1.05s cycle (dramatic, not frantic). Always on: this
          is the core elimination warning, not an optional camera effect.
          R19: while a tie-break SHOWDOWN runs, the frame blinks AMBER for
          its entire duration (⚔️ — the tied players get their own visual
          language, distinct from the red elimination warning). */}
      {showdownActive ? (
        <div
          data-testid="br-showdown-frame"
          className="fixed inset-0 z-40 pointer-events-none animate-br-alarm-frame border-[6px] border-amber-400"
          style={{ boxShadow: 'inset 0 0 70px rgba(251, 191, 36, 0.30), 0 0 26px rgba(251, 191, 36, 0.45)' }}
        />
      ) : isElimCritical ? (
        <div
          data-testid="br-alarm-frame"
          className="fixed inset-0 z-40 pointer-events-none animate-br-alarm-frame border-[6px] border-red-500"
          style={{ boxShadow: 'inset 0 0 70px rgba(239, 68, 68, 0.35), 0 0 26px rgba(239, 68, 68, 0.5)' }}
        />
      ) : null}

      {/* ─────────── R16/R19: ELIMINATION COUNTDOWN / SHOWDOWN ───────────
          Prominent, large, centered at the top edge. Shows the ONE clock
          that decides who drops out next (rhythm interval in full-song
          rounds / round timer in medley rounds; hidden in the grand finale).
          Critical (≤ 5s): the number beats in sync with the alarm frame.
          R19 showdown: amber ⚔️ variant counting down the 10s extension —
          "sing now or the coin decides!" */}
      {elimCountdownSec != null && (
        <div
          data-testid={showdownActive ? 'br-showdown-countdown' : 'br-elim-countdown'}
          className="absolute top-2.5 left-1/2 -translate-x-1/2 z-30 pointer-events-none"
          role="timer"
          aria-label={showdownActive
            ? t('battleRoyale.showdownAria').replace('{n}', String(elimCountdownSec))
            : t('battleRoyale.nextEliminationIn').replace('{n}', String(elimCountdownSec))}
        >
          <div
            className={`flex items-center gap-3 rounded-2xl border px-5 py-1.5 backdrop-blur-md shadow-xl transition-all duration-300 ${
              showdownActive
                ? isElimCritical
                  ? 'bg-amber-950/90 border-amber-300 shadow-amber-400/40'
                  : 'bg-amber-950/70 border-amber-500/70 shadow-amber-950/50'
                : isElimCritical
                  ? 'bg-red-950/85 border-red-500 shadow-red-600/40'
                  : 'bg-black/55 border-red-500/50 shadow-red-950/50'
            }`}
          >
            <span
              aria-hidden="true"
              className={`text-2xl select-none ${isElimCritical ? 'animate-br-countdown-critical' : ''}`}
            >
              {showdownActive ? '⚔️' : '💀'}
            </span>
            <span
              className={`font-mono font-black tabular-nums leading-none select-none ${
                isElimCritical
                  ? showdownActive
                    ? 'text-5xl text-amber-300 animate-br-countdown-critical drop-shadow-[0_0_16px_rgba(252,211,77,0.9)]'
                    : 'text-5xl text-red-400 animate-br-countdown-critical drop-shadow-[0_0_16px_rgba(248,113,113,0.9)]'
                  : showdownActive
                    ? 'text-4xl text-amber-400'
                    : 'text-4xl text-red-500'
              }`}
            >
              {elimCountdownSec}
            </span>
            <span className={`max-w-[110px] text-[10px] font-bold uppercase tracking-widest leading-tight text-left ${
              showdownActive ? 'text-amber-200/90' : 'text-red-300/80'
            }`}>
              {showdownActive
                ? t('battleRoyale.showdownLabel')
                : t('battleRoyale.eliminationCountdownLabel')}
            </span>
          </div>
        </div>
      )}

      {/* ─────────── 2.2-R3 / R19: Mid-round elimination banner (non-blocking) ───────────
          Surfaces WHO just went out in the configured rhythm — the inline ✕ on
          the player card alone was easy to miss (user follow-up: "keine
          Veränderung im Spiel"). Auto-clears after a few seconds (hook-side).
          R19: coin-flip eliminations get their own amber 🪙 variant. */}
      {midRoundEliminationNotice && (
        <div
          className="absolute top-16 left-1/2 -translate-x-1/2 z-40 pointer-events-none animate-in fade-in slide-in-from-top-2 duration-300"
          role="status"
          aria-live="polite"
        >
          <div
            data-testid={midRoundEliminationNotice.byCoinFlip ? 'br-coinflip-notice' : 'br-elimination-notice'}
            className={`flex items-center gap-2 rounded-full px-4 py-2 shadow-lg backdrop-blur-sm border ${
              midRoundEliminationNotice.byCoinFlip
                ? 'bg-amber-950/90 border-amber-400/60 shadow-amber-950/50'
                : 'bg-red-950/85 border-red-500/50 shadow-red-950/50'
            }`}
          >
            <span
              aria-hidden="true"
              className="text-lg inline-block"
              style={midRoundEliminationNotice.byCoinFlip ? { animation: 'brCoinFlip 0.9s ease-out' } : undefined}
            >
              {midRoundEliminationNotice.byCoinFlip ? '🪙' : '💀'}
            </span>
            <span className={`text-sm font-semibold ${
              midRoundEliminationNotice.byCoinFlip ? 'text-amber-200' : 'text-red-200'
            }`}>
              {midRoundEliminationNotice.byCoinFlip
                ? t('battleRoyale.coinFlipEliminated').replace('{name}', midRoundEliminationNotice.name)
                : t('battleRoyale.midRoundEliminated').replace('{name}', midRoundEliminationNotice.name)}
            </span>
          </div>
        </div>
      )}
    </>
  );
}
