'use client';

/**
 * Battle Royale game screen — extracted 1:1 from party-game-screens.tsx
 * (task R9). Includes the brSongPool useMemo (user rule 6.5: the pool mirrors
 * the setup filters so EVERY round respects the configured restrictions) with
 * its original comment; JSX and inline handlers are byte-identical.
 */

import { useMemo } from 'react';
import { useGameStore } from '@/lib/game/store';
import { usePartyStore } from '@/lib/game/party-store';
import { getNonDuetSongs, filterSongs } from '@/lib/game/song-library';
import { BattleRoyaleGameView } from '@/components/game/battle-royale-screen';
import type { Screen } from '@/types/screens';

export interface BattleRoyaleGameSectionProps {
  screen: Screen;
  setScreen: (_s: Screen) => void;
}

export function BattleRoyaleGameSection({ screen, setScreen }: BattleRoyaleGameSectionProps) {
  const { resetGame, setGameMode } = useGameStore();
  const party = usePartyStore();

  // ── Battle Royale song pool (user rule 6.5) ──
  // BR used to receive ALL non-duet songs, so the genre/era/language filters
  // from the party setup only applied to round 1 (the host-voted song) and
  // every follow-up round pulled from the unfiltered library. The pool now
  // mirrors the setup filters (same filterSongs call as party-setup-section)
  // so EVERY round — random picks, vote options, medley snippets — respects
  // the configured restrictions.
  const brSongPool = useMemo(() => {
    const all = getNonDuetSongs();
    const s = party.unifiedSetupResult?.settings as
      | { filterGenre?: string; filterLanguage?: string; filterCombined?: boolean; filterReleaseYear?: string; filterEra?: string; filterSearch?: string }
      | undefined;
    const hasFilter = !!(
      s && (s.filterGenre || s.filterLanguage || s.filterReleaseYear || s.filterEra || s.filterSearch)
    );
    if (!s || !hasFilter) return all;
    const filtered = filterSongs(
      all,
      s.filterGenre,
      s.filterLanguage,
      s.filterCombined,
      s.filterReleaseYear,
      s.filterEra,
      s.filterSearch,
    );
    // Degenerate filter (nothing matches) → fall back to the full pool so a
    // running game never runs out of songs mid-match.
    return filtered.length > 0 ? filtered : all;
  }, [party.unifiedSetupResult]);

  return (
    <>
      {/* Battle Royale Game Screen */}
      {screen === 'battle-royale-game' && party.battleRoyaleGame && (
        <BattleRoyaleGameView
          game={party.battleRoyaleGame}
          songs={brSongPool}
          onUpdateGame={(game) => party.setBattleRoyaleGame(game)}
          onEndGame={() => {
            // TERMINATE the mode (user report): back = full party reset, no
            // lingering selectedGameMode that would re-route Library picks.
            // resetGame+standard also clears the game-store gameMode that the
            // start handler set (resetGame alone preserves it by design).
            party.resetPartyState(true);
            resetGame();
            setGameMode('standard');
            setScreen('home');
          }}
          onBack={() => {
            // Round-setup BACK used to only clear battleRoyaleGame —
            // selectedGameMode survived, so the party stayed "active"
            // (Library picks re-routed to party setup, ESC re-opened the
            // leave dialog). Back here terminates too (user report: back
            // must end the mode).
            party.resetPartyState(true);
            resetGame();
            setGameMode('standard');
            setScreen('party');
          }}
        />
      )}
    </>
  );
}
