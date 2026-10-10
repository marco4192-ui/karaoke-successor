'use client';

/**
 * Unified bottom HUD — extracted 1:1 from battle-royale/playing-view.tsx
 * (task R12): round/song countdown badge (R16: hidden when it would duplicate
 * the top elimination countdown), #1 medley snippet indicator and the
 * B3.5 playtime/duration line (bottom-right).
 */
import { Badge } from '@/components/ui/badge';
import { TimeDisplay } from '@/components/game/game-hud';
import type { Song } from '@/types/game';
import { useTranslation } from '@/lib/i18n/translations';

export interface BottomHudProps {
  elimFromRoundTimer: boolean;
  showdownActive: boolean;
  roundTimeLeft: number;
  totalSnippets: number;
  currentSnippetIndex: number;
  snippetTimeLeft: number | null;
  currentTime: number;
  currentSong: Song | null;
}

export function BottomHud({
  elimFromRoundTimer,
  showdownActive,
  roundTimeLeft,
  totalSnippets,
  currentSnippetIndex,
  snippetTimeLeft,
  currentTime,
  currentSong,
}: BottomHudProps) {
  const { t } = useTranslation();

  return (
    <>
      {/* ─────────── Unified bottom HUD: round countdown + snippet timer (bottom-left, above the progress bar) + playtime/duration (bottom-right, ONE LINE) ─────────── */}
      <div className="absolute bottom-2 left-3 z-30 pointer-events-none flex items-center gap-2">
        {/* Round/song countdown — bottom-left (unified HUD spec, Muster F).
            R16: hidden when it would duplicate the prominent top elimination
            countdown (medley rounds — round timer IS the elimination clock;
            showdown — the ⚔️ countdown owns the display, round timer is 0). */}
        {!elimFromRoundTimer && !showdownActive && (
          <Badge
            className={`font-mono text-xs ${
              roundTimeLeft <= 5
                ? 'bg-red-500 text-white animate-pulse'
                : roundTimeLeft <= 10
                  ? 'bg-orange-500/25 text-orange-300 border border-orange-400/40'
                  : 'bg-purple-500/20 text-purple-400'
            }`}
            aria-label={t('battleRoyale.timeLeft').replace('{n}', String(roundTimeLeft))}
          >
            {roundTimeLeft}s
          </Badge>
        )}
        {/* #1 Medley snippet indicator — bottom-left (unified HUD spec) */}
        {totalSnippets > 1 && (
          <Badge variant="outline" className="border-purple-500 text-purple-400 text-[10px] px-1.5 py-0 bg-black/40">
            🎵 {currentSnippetIndex + 1}/{totalSnippets}
            {snippetTimeLeft !== null && ` (${snippetTimeLeft}s)`}
          </Badge>
        )}
        {/* 2.2-R3 / R16: the elimination countdown moved to the prominent
            top-center display (br-elim-countdown) — no duplicate badge here. */}
      </div>
      {/* B3.5: playtime/duration — single line, right-aligned, no wrapping */}
      <div className="absolute bottom-2 right-3 z-30 pointer-events-none whitespace-nowrap text-right">
        <TimeDisplay currentTime={currentTime} duration={currentSong?.duration ?? 0} inline />
      </div>
    </>
  );
}
