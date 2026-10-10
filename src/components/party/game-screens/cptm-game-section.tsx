'use client';

/**
 * Companion Sing-A-Long game screen (powered by the CPTM segment engine) —
 * extracted 1:1 from party-game-screens.tsx (task R9). JSX, inline handlers
 * (onUpdateGame / onEndGame / onNavigate with the next-round logic) and
 * comments are byte-identical; the party store, translation and the
 * game-store actions are read via the same hooks the orchestrator used.
 * setIsPreparingNextSong (Item 5 loading feedback) and setScreen remain
 * orchestrator-owned state and are passed in as props.
 */

import { useGameStore } from '@/lib/game/store';
import { usePartyStore } from '@/lib/game/party-store';
import { useTranslation } from '@/lib/i18n/translations';
import { toast } from '@/hooks/use-toast';
import { CptmGameScreen } from '@/components/game/cptm-singalong-screen';
import { preparePtmNextSong } from '@/lib/game/ptm-next-song';
import { pickRandomVotingSongs } from '../party-game-helpers';
import type { Dispatch, SetStateAction } from 'react';
import type { Screen } from '@/types/screens';

export interface CptmGameSectionProps {
  screen: Screen;
  setScreen: (_s: Screen) => void;
  setIsPreparingNextSong: Dispatch<SetStateAction<boolean>>;
}

export function CptmGameSection({ screen, setScreen, setIsPreparingNextSong }: CptmGameSectionProps) {
  const { resetGame, setGameMode } = useGameStore();
  const party = usePartyStore();
  const { t } = useTranslation();

  return (
    <>
      {/* Companion Sing-A-Long Game Screen (powered by CPTM segment engine) */}
      {screen === 'companion-singalong-game' && party.cptmSong && party.cptmSegments.length > 0 && (
        <CptmGameScreen
          players={party.cptmPlayers}
          song={party.cptmSong}
          segments={party.cptmSegments}
          settings={party.cptmSettings}
          onUpdateGame={(players, segments) => {
            party.setCptmPlayers(players);
            party.setCptmSegments(segments);
          }}
          onEndGame={() => {
            // TERMINATE the mode (user report): back = full party reset.
            // Round 2: the old hasSeriesHistory branch routed to the Library
            // WITHOUT clearing the game-store gameMode — cptm-series.ts sets
            // 'companion-singalong' there, and resetGame() preserves gameMode,
            // so Library picks afterwards started a broken companion-mode
            // GameScreen. Terminate unconditionally now.
            party.resetPartyState(true);
            resetGame();
            setGameMode('standard');
            setScreen('party-setup');
          }}
          onNavigate={async (targetScreen) => {
            // Handle next-song navigation (same pattern as PtM)
            if (targetScreen === 'ptm-next-random' || targetScreen === 'ptm-next-medley') {
              setIsPreparingNextSong(true);
              try {
                const playerCount = party.cptmPlayers.length || 2;
                const segDur = party.cptmSettings?.segmentDuration;
                const action = await preparePtmNextSong(
                  targetScreen === 'ptm-next-random' ? 'random' : 'medley',
                  playerCount,
                  segDur,
                );
                if (action.mode === 'random') {
                  party.setCptmSegments(action.result.segments);
                  party.setCptmSong(action.result.song);
                  party.setIsSongPlaying(false);
                  setScreen('companion-singalong-game');
                } else if (action.mode === 'medley') {
                  party.setPtmMedleySnippets(action.result.medleySnippets);
                  party.setCptmSegments(action.result.segments);
                  party.setCptmSong(action.result.song);
                  party.setIsSongPlaying(false);
                  setScreen('companion-singalong-game');
                } else {
                  // Fallback to library — still a next-round pick
                  party.setNextRoundPick('cptm');
                  setScreen('library');
                }
              } catch (err) {
                // eslint-disable-next-line no-console
                console.error('[CompanionSingAlong] Failed to prepare next song:', err);
                toast({ title: t('common.error') || 'Error', description: t('partyGameScreens.nextSongFailedDesc') || 'Could not load next song.', variant: 'destructive' });
                party.setNextRoundPick('cptm');
                setScreen('library');
              } finally {
                setIsPreparingNextSong(false);
              }
            } else if (targetScreen === 'song-voting') {
              const filters = party.unifiedSetupResult?.settings;
              const suggested = pickRandomVotingSongs(filters?.filterGenre, filters?.filterLanguage, filters?.filterCombined, 'all', 3, filters?.filterSearch);
              party.setVotingSongs(suggested);
              party.setNextRoundPick('cptm');
              setScreen('song-voting');
            } else if (targetScreen === 'library') {
              // Next-round library pick: returns directly into the CPTM game
              party.setNextRoundPick('cptm');
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
