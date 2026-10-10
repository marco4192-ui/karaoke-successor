'use client';

/**
 * Medley Contest game screen (dedicated screen with multi-pitch detection) —
 * extracted 1:1 from party-game-screens.tsx (task R9). JSX, inline handlers
 * (onRoundComplete leaderboard save / onEndGame / onPrepareNextRoundSongs)
 * and comments are byte-identical; prepareNextMedleyRound (Fix 7) is imported
 * from its own module (prepare-next-medley-round.ts, also verbatim).
 */

import { useGameStore } from '@/lib/game/store';
import { usePartyStore } from '@/lib/game/party-store';
import { MedleyGameScreen } from '@/components/game/medley/medley-game-screen';
import { addMedleyEntry, addDailyMedleyEntry } from '@/lib/game/medley-ranking';
import { prepareNextMedleyRound } from './prepare-next-medley-round';
import type { Screen } from '@/types/screens';

export interface MedleyGameSectionProps {
  screen: Screen;
  setScreen: (_s: Screen) => void;
}

export function MedleyGameSection({ screen, setScreen }: MedleyGameSectionProps) {
  const { resetGame, setGameMode } = useGameStore();
  const party = usePartyStore();

  return (
    <>
      {/* Medley Contest Game Screen — dedicated screen with multi-pitch detection */}
      {screen === 'medley-game' && party.medleySongs.length > 0 && party.medleySettings && (
        <MedleyGameScreen
          players={party.medleyPlayers}
          songs={party.medleySongs}
          settings={party.medleySettings}
          matchups={party.medleyMatches}
          _seriesHistory={party.medleySeriesHistory}
          onRoundComplete={(result, updatedPlayers) => {
            party.setMedleyPlayers(updatedPlayers);
            party.setMedleySeriesHistory([...party.medleySeriesHistory, result]);
            // Feature #13: Save to leaderboard
            try {
              for (const p of updatedPlayers) {
                const scores = result.playerScores[p.id];
                if (!scores) continue;
                const entry = {
                  playerId: p.id,
                  playerName: p.name,
                  playerColor: p.color,
                  score: scores.score,
                  notesHit: scores.notesHit,
                  notesMissed: scores.notesMissed,
                  maxCombo: scores.maxCombo,
                  snippetsSung: scores.snippetsSung,
                  snippetCount: result.snippetCount,
                  playMode: party.medleySettings?.playMode || 'ffa',
                };
                addMedleyEntry(entry);
                addDailyMedleyEntry(entry);
              }
            } catch { /* ignore storage errors */ }
          }}
          onEndGame={() => {
            // User report ("Mode terminieren"): back after the final results
            // used to leave selectedGameMode='medley' set — the Library then
            // re-routed every song pick back INTO the Medley Contest. The
            // forced reset terminates the whole party context.
            // Round 2: also clear the GAME-STORE gameMode — resetGame()
            // preserves it by design, and a stale party mode there re-routes
            // Library picks into a broken GameScreen after the reset.
            party.resetPartyState(true);
            resetGame();
            setGameMode('standard');
            setScreen('home');
          }}
          // Fix 7: "Next Round" regenerates a snippet list with DIFFERENT
          // songs (when the pool allows) before the next round starts.
          onPrepareNextRoundSongs={() => prepareNextMedleyRound(party)}
        />
      )}
    </>
  );
}
