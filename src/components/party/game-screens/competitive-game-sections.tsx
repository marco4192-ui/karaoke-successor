'use client';

/**
 * Competitive party game screens (Missing Words + Blind Karaoke) — extracted
 * 1:1 from party-game-screens.tsx (task R9). Both blocks were contiguous
 * fragment children and keep their original order; JSX, inline handlers
 * (onPlayMatch / onPlaySolo with the buildGameSetupResult setup logic) and
 * comments are byte-identical.
 */

import { useGameStore } from '@/lib/game/store';
import { usePartyStore } from '@/lib/game/party-store';
import { getNonDuetSongs } from '@/lib/game/song-library';
import { CompetitiveGameView } from '@/components/game/competitive-words-blind-screen';
import { freqNumberToLabel, buildGameSetupResult } from '../party-game-helpers';
import type { Screen } from '@/types/screens';

export interface CompetitiveGameSectionsProps {
  screen: Screen;
  setScreen: (_s: Screen) => void;
}

export function CompetitiveGameSections({ screen, setScreen }: CompetitiveGameSectionsProps) {
  const { setGameMode, setSong, resetGame, addPlayer, setPlayers } = useGameStore();
  const party = usePartyStore();

  return (
    <>
      {/* Missing Words Competitive Game */}
      {screen === 'missing-words-game' && party.competitiveGame && (
        <CompetitiveGameView
          game={party.competitiveGame}
          songs={getNonDuetSongs()}
          modeType='missing-words'
          onUpdateGame={(game) => party.setCompetitiveGame(game)}
          onEndGame={() => {
            // TERMINATE the mode (user report): full reset incl. selectedGameMode.
            // Round 2: resetGame+standard clears the game-store gameMode too
            // (onPlayMatch sets 'missing-words' there and resetGame preserves
            // it — stale party modes re-route Library picks into a broken
            // GameScreen).
            party.resetPartyState(true);
            resetGame();
            setGameMode('standard');
            setScreen('home');
          }}
          onPlayMatch={(p1Id, p2Id, p1Name, p2Name, song) => {
            const comp = party.competitiveGame;
            if (!comp) return;
            resetGame();
            setPlayers([]);
            const p1Color = comp.players.find(p => p.id === p1Id)?.color || '#FF6B6B';
            const p2Color = comp.players.find(p => p.id === p2Id)?.color || '#4ECDC4';
            addPlayer({ id: p1Id, name: p1Name, color: p1Color });
            addPlayer({ id: p2Id, name: p2Name, color: p2Color });
            const setupResult = buildGameSetupResult({
              mode: 'missing-words',
              players: [
                { id: p1Id, name: p1Name, color: p1Color },
                { id: p2Id, name: p2Name, color: p2Color },
              ],
              difficulty: comp.settings.difficulty,
              settings: {
                missingWordFrequency: freqNumberToLabel(comp.settings.missingWordFrequency),
                bestOf: comp.settings.bestOf,
                granularity: comp.settings.missingWordsGranularity,
                hardcoreMissingWords: comp.settings.hardcoreMissingWords,
                escalating: comp.settings.escalating,
              },
            });
            party.setUnifiedSetupResult(setupResult);
            setGameMode('missing-words');
            setSong(song);
            setScreen('game');
          }}
          onPlaySolo={(pId, pName, song) => {
            const comp = party.competitiveGame;
            if (!comp) return;
            resetGame();
            setPlayers([]);
            const pColor = comp.players.find(p => p.id === pId)?.color || '#FF6B6B';
            addPlayer({ id: pId, name: pName, color: pColor });
            const setupResult = buildGameSetupResult({
              mode: 'missing-words',
              players: [{ id: pId, name: pName, color: pColor }],
              difficulty: comp.settings.difficulty,
              settings: {
                missingWordFrequency: freqNumberToLabel(comp.settings.missingWordFrequency),
                bestOf: comp.settings.bestOf,
                granularity: comp.settings.missingWordsGranularity,
                hardcoreMissingWords: comp.settings.hardcoreMissingWords,
                escalating: comp.settings.escalating,
              },
            });
            party.setUnifiedSetupResult(setupResult);
            setGameMode('missing-words');
            setSong(song);
            setScreen('game');
          }}
        />
      )}

      {/* Blind Karaoke Competitive Game */}
      {screen === 'blind-game' && party.competitiveGame && (
        <CompetitiveGameView
          game={party.competitiveGame}
          songs={getNonDuetSongs()}
          modeType='blind'
          onUpdateGame={(game) => party.setCompetitiveGame(game)}
          onEndGame={() => {
            // TERMINATE the mode (user report): full reset incl. selectedGameMode.
            // Round 2: resetGame+standard clears the game-store gameMode too
            // (onPlayMatch sets 'blind' there and resetGame preserves it —
            // stale party modes re-route Library picks into a broken
            // GameScreen).
            party.resetPartyState(true);
            resetGame();
            setGameMode('standard');
            setScreen('home');
          }}
          onPlayMatch={(p1Id, p2Id, p1Name, p2Name, song) => {
            const comp = party.competitiveGame;
            if (!comp) return;
            resetGame();
            setPlayers([]);
            const p1Color = comp.players.find(p => p.id === p1Id)?.color || '#FF6B6B';
            const p2Color = comp.players.find(p => p.id === p2Id)?.color || '#4ECDC4';
            addPlayer({ id: p1Id, name: p1Name, color: p1Color });
            addPlayer({ id: p2Id, name: p2Name, color: p2Color });
            const setupResult = buildGameSetupResult({
              mode: 'blind',
              players: [
                { id: p1Id, name: p1Name, color: p1Color },
                { id: p2Id, name: p2Name, color: p2Color },
              ],
              difficulty: comp.settings.difficulty,
              settings: {
                blindFrequency: freqNumberToLabel(comp.settings.blindFrequency),
                bestOf: comp.settings.bestOf,
                hardcore: comp.settings.hardcore,
                escalating: comp.settings.escalating,
              },
            });
            party.setUnifiedSetupResult(setupResult);
            setGameMode('blind');
            setSong(song);
            setScreen('game');
          }}
          onPlaySolo={(pId, pName, song) => {
            const comp = party.competitiveGame;
            if (!comp) return;
            resetGame();
            setPlayers([]);
            const pColor = comp.players.find(p => p.id === pId)?.color || '#FF6B6B';
            addPlayer({ id: pId, name: pName, color: pColor });
            const setupResult = buildGameSetupResult({
              mode: 'blind',
              players: [{ id: pId, name: pName, color: pColor }],
              difficulty: comp.settings.difficulty,
              settings: {
                blindFrequency: freqNumberToLabel(comp.settings.blindFrequency),
                bestOf: comp.settings.bestOf,
                hardcore: comp.settings.hardcore,
                escalating: comp.settings.escalating,
              },
            });
            party.setUnifiedSetupResult(setupResult);
            setGameMode('blind');
            setSong(song);
            setScreen('game');
          }}
        />
      )}
    </>
  );
}
