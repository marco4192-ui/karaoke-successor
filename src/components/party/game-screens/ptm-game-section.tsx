'use client';

/**
 * Pass the Mic game screen — extracted 1:1 from party-game-screens.tsx
 * (task R9). JSX, inline handlers (onUpdateGame / onEndGame / onNavigate with
 * the PTM next-round logic) and comments are byte-identical; the party store,
 * translation and the game-store actions are read via the same hooks the
 * orchestrator used. setIsPreparingNextSong (Item 5 loading feedback) and
 * setScreen remain orchestrator-owned state and are passed in as props.
 */

import { useGameStore } from '@/lib/game/store';
import { usePartyStore } from '@/lib/game/party-store';
import { useTranslation } from '@/lib/i18n/translations';
import { toast } from '@/hooks/use-toast';
import { PtmGameScreen } from '@/components/game/ptm-game-screen';
import { preparePtmNextSong } from '@/lib/game/ptm-next-song';
import { pickRandomVotingSongs } from '../party-game-helpers';
import type { Dispatch, SetStateAction } from 'react';
import type { Screen } from '@/types/screens';

export interface PtmGameSectionProps {
  screen: Screen;
  setScreen: (_s: Screen) => void;
  setIsPreparingNextSong: Dispatch<SetStateAction<boolean>>;
}

export function PtmGameSection({ screen, setScreen, setIsPreparingNextSong }: PtmGameSectionProps) {
  const { resetGame, setGameMode } = useGameStore();
  const party = usePartyStore();
  const { t } = useTranslation();

  return (
    <>
      {/* Pass the Mic Game Screen — dedicated PTM screen with note highway */}
      {screen === 'pass-the-mic-game' && party.passTheMicSong && (
        <PtmGameScreen
          players={party.passTheMicPlayers}
          song={party.passTheMicSong}
          segments={party.passTheMicSegments}
          settings={party.passTheMicSettings}
          onUpdateGame={(players, segments) => {
            party.setPassTheMicPlayers(players);
            party.setPassTheMicSegments(segments);
          }}
          onEndGame={() => {
            // User report: leaving a party mode via BACK must TERMINATE it.
            // Round 2 of this fix: the previous version still called
            // setGameMode('pass-the-mic') for series with history — but
            // resetGame() deliberately PRESERVES the game-store gameMode, so
            // that stale 'pass-the-mic' survived the party reset and every
            // Library song pick afterwards started a broken "pass-the-mic"
            // GameScreen (the ended mode re-routed the pick). Back ALWAYS
            // terminates now: full party reset + game store back to standard.
            party.resetPartyState(true);
            resetGame();
            setGameMode('standard');
            setScreen('party-setup');
          }}
          onNavigate={async (targetScreen) => {
            // Handle special PTM next-song navigation
            if (targetScreen === 'ptm-next-random' || targetScreen === 'ptm-next-medley') {
              setIsPreparingNextSong(true);
              try {
                const playerCount = party.passTheMicPlayers.length || 2;
                const segDur = party.passTheMicSettings?.segmentDuration;
                const action = await preparePtmNextSong(
                  targetScreen === 'ptm-next-random' ? 'random' : 'medley',
                  playerCount,
                  segDur,
                );

                if (action.mode === 'random') {
                  party.setPassTheMicSegments(action.result.segments);
                  party.setPassTheMicSong(action.result.song);
                  party.setPassTheMicSettings({
                    ...(party.passTheMicSettings || { segmentDuration: 30, difficulty: 'medium', micId: '', micName: '' }),
                    segmentDuration: action.result.segmentDuration,
                  });
                  party.setPtmMedleySnippets([]);
                  party.setIsSongPlaying(false);
                  setScreen('pass-the-mic-game');
                } else if (action.mode === 'medley') {
                  party.setPtmMedleySnippets(action.result.medleySnippets);
                  party.setPassTheMicSegments(action.result.segments);
                  party.setPassTheMicSong(action.result.song);
                  party.setPassTheMicSettings({
                    ...(party.passTheMicSettings || { segmentDuration: 30, difficulty: 'medium', micId: '', micName: '' }),
                    segmentDuration: action.result.segmentDuration,
                  });
                  party.setIsSongPlaying(false);
                  setScreen('pass-the-mic-game');
                } else {
                  // Fallback to library — still a next-round pick
                  party.setNextRoundPick('ptm');
                  setScreen('library');
                }
              } catch (err) {
                // eslint-disable-next-line no-console
                console.error('[PTM] Failed to prepare next song:', err);
                toast({ title: t('common.error') || 'Error', description: t('partyGameScreens.nextSongFailedDesc') || 'Could not load next song.', variant: 'destructive' });
                party.setNextRoundPick('ptm');
                setScreen('library');
              } finally {
                setIsPreparingNextSong(false);
              }
            } else if (targetScreen === 'song-voting') {
              // Next-round vote: picking a song returns DIRECTLY into the PTM
              // game (intro phase) with the same players — no setup detour.
              const filters = party.unifiedSetupResult?.settings;
              const suggested = pickRandomVotingSongs(filters?.filterGenre, filters?.filterLanguage, filters?.filterCombined, 'all', 3, filters?.filterSearch);
              party.setVotingSongs(suggested);
              party.setNextRoundPick('ptm');
              setScreen('song-voting');
            } else if (targetScreen === 'library') {
              // Next-round library pick: returns directly into the PTM game
              party.setNextRoundPick('ptm');
              setScreen('library');
            } else {
              setScreen(targetScreen as Screen);
            }
          }}

        />
      )}
    </>
  );
}
