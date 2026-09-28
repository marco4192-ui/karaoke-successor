'use client';

/**
 * Timer bar + round info (layout section 1) — extracted 1:1 from
 * battle-royale/playing-view.tsx (task R12): round title, players-left badge
 * and the #1 medley snippet progress bar (pt-24: below the fixed top HUD
 * chrome, Fix 17 / Item 8 spacing comments preserved).
 */
import { Badge } from '@/components/ui/badge';
import type { BattleRoyaleGame, BattleRoyalePlayer, MedleySnippet } from '@/lib/game/battle-royale';
import { useTranslation } from '@/lib/i18n/translations';

export interface TimerBarProps {
  game: BattleRoyaleGame;
  activePlayers: BattleRoyalePlayer[];
  totalSnippets: number;
  snippetTimeLeft: number | null;
  currentSnippetIndex: number;
  currentSnippet: MedleySnippet | null;
}

export function TimerBar({
  game,
  activePlayers,
  totalSnippets,
  snippetTimeLeft,
  currentSnippetIndex,
  currentSnippet,
}: TimerBarProps) {
  const { t } = useTranslation();

  return (
    <>
      {/* ─────────── 1. TIMER BAR + ROUND INFO (pt-24: below the fixed top HUD chrome) ─────────── */}
      {/* Item 8: pb-2 (was pb-1) — extra clearance so the player badges below
          sit a bit lower and no longer crowd the top HUD. */}
      {/* Fix 17: pt-24 (was pt-16) — clears the GameHudChrome top-left pause
          panel + song banner (~68px) AND the top-right difficulty/webcam/fullscreen
          cluster so the Round badge and PlayersLeft badge are fully visible. */}
      <div className="flex-shrink-0 px-3 pt-24 pb-2">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-sm font-bold shrink-0">
              {game.isGrandFinale
                ? `🏆 ${t('battleRoyale.grandFinaleRound').replace('{n}', String(game.currentRound))}`
                : t('battleRoyale.round').replace('{n}', String(game.currentRound))
              }
            </h1>
            {/* Fix 16: duplicate song-title span removed — the HUD song banner
                (top-left, next to the pause panel) already shows "Title — Artist"
                exactly once. */}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-red-500 text-red-400 text-[10px] px-1.5 py-0">
              {t('battleRoyale.playersLeft').replace('{n}', String(activePlayers.length))}
            </Badge>
          </div>
        </div>

        {/* #1 Medley: Snippet progress bar (medley-only segment info, not the round countdown) */}
        {totalSnippets > 1 && snippetTimeLeft !== null && currentSnippet && (
          <div className="flex gap-1 mt-1.5">
            {game.medleySnippetList.map((_, i) => (
              <div
                key={i}
                className={`h-0.5 flex-1 rounded-full transition-all ${
                  i < currentSnippetIndex
                    ? 'bg-purple-500/40'
                    : i === currentSnippetIndex
                      ? 'bg-purple-400 animate-pulse'
                      : 'bg-white/10'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
