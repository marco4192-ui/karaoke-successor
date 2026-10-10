'use client';

/**
 * Tournament JSX blocks — extracted 1:1 from party-game-screens.tsx (task R9):
 *
 * - TournamentStartingScreenBlock: the mic-overlay "starting screen" (was the
 *   FIRST fragment child of PartyGameScreens' return).
 * - TournamentGameScreens: song-voting overlay (#8), bracket view and results
 *   screen (#7) (were fragment children #3–#5, directly after the PTM screen
 *   — the orchestrator keeps this render order).
 *
 * Store reads (party store, translation, game-store actions) moved WITH the
 * blocks via the same hooks the orchestrator used, so every JSX body and
 * every inline handler stayed byte-identical. Props are the orchestrator-owned
 * state + handlers from use-tournament-screens.ts.
 */

import { useGameStore } from '@/lib/game/store';
import { usePartyStore } from '@/lib/game/party-store';
import { useTranslation } from '@/lib/i18n/translations';
import { recordMatchResult } from '@/lib/game/tournament';
import { TournamentBracketView, TournamentResultsScreen } from '@/components/game/tournament-screen';
import { TournamentSongVoteOverlay } from '@/components/game/tournament-song-vote-overlay';
import { PartyStartingScreen } from '@/components/game/party-starting-screen';
import type { Dispatch, SetStateAction } from 'react';
import type { Screen } from '@/types/screens';
import type { MicOverlayState } from './types';

export interface TournamentStartingScreenBlockProps {
  micOverlay: MicOverlayState | null;
  launchTournamentMatch: () => void;
}

export function TournamentStartingScreenBlock({ micOverlay, launchTournamentMatch }: TournamentStartingScreenBlockProps) {
  const party = usePartyStore();
  const { t } = useTranslation();

  return (
    <>
      {/* Tournament Starting Screen — shown after selecting the next pairing.
          Shows both players with their mic assignment and the voted song (if any).
          The match starts via the explicit Start button.
          NOTE: no "starts first" highlight — a DUEL is sung by both players
          simultaneously, so both duelists are shown equally. */}
      {micOverlay && party.currentTournamentMatch?.player1 && party.currentTournamentMatch?.player2 && (
        <PartyStartingScreen
          overlay
          modeIcon="🏆"
          modeTitle={t('tournament.startingTitle')}
          modeColor="from-amber-500 to-yellow-500"
          players={[
            {
              id: party.currentTournamentMatch.player1.id,
              name: micOverlay.p1Name,
              avatar: party.currentTournamentMatch.player1.avatar,
              color: party.currentTournamentMatch.player1.color || '#FF6B6B',
              micName: micOverlay.p1Mic,
              playerType: micOverlay.p1Mic === t('partyGameScreens.companion') ? 'companion' : 'microphone',
            },
            {
              id: party.currentTournamentMatch.player2.id,
              name: micOverlay.p2Name,
              avatar: party.currentTournamentMatch.player2.avatar,
              color: party.currentTournamentMatch.player2.color || '#4ECDC4',
              micName: micOverlay.p2Mic,
              playerType: micOverlay.p2Mic === t('partyGameScreens.companion') ? 'companion' : 'microphone',
            },
          ]}
          song={micOverlay.votedSong}
          subtitle={t('tournament.roundOfOf').replace('{n}', String(party.tournamentBracket?.currentRound ?? 1)).replace('{m}', String(party.tournamentBracket?.totalRounds ?? 1))}
          onStart={launchTournamentMatch}
          testId="tournament-starting-screen"
        />
      )}
    </>
  );
}

export interface TournamentGameScreensProps {
  screen: Screen;
  setScreen: (_s: Screen) => void;
  tournamentVotingActive: boolean;
  setTournamentVotingActive: Dispatch<SetStateAction<boolean>>;
  startMatchWithMicOverlay: (
    match: import('@/lib/game/tournament').TournamentMatch,
    preSelectedSong?: import('@/types/game').Song | null,
  ) => Promise<void>;
  handlePlayTournamentMatch: (match: import('@/lib/game/tournament').TournamentMatch) => void;
  pickTournamentSong: () => import('@/types/game').Song | null;
  showTournamentResults: boolean;
  setShowTournamentResults: Dispatch<SetStateAction<boolean>>;
  handleTournamentExitToMenu: () => void;
  handleTournamentNew: () => void;
}

export function TournamentGameScreens({
  screen,
  setScreen,
  tournamentVotingActive,
  setTournamentVotingActive,
  startMatchWithMicOverlay,
  handlePlayTournamentMatch,
  pickTournamentSong,
  showTournamentResults,
  setShowTournamentResults,
  handleTournamentExitToMenu,
  handleTournamentNew,
}: TournamentGameScreensProps) {
  const { resetGame, setPlayers, addPlayer, setGameMode, setSong } = useGameStore();
  const party = usePartyStore();
  const { t } = useTranslation();

  return (
    <>
      {/* Tournament Song Voting Overlay (#8) — unified design (VS header, animated cards, keyboard picking) */}
      {tournamentVotingActive && party.tournamentVotingSongs.length > 0 && party.tournamentVotingMatch && (
        <TournamentSongVoteOverlay
          match={party.tournamentVotingMatch}
          roundLabel={t('tournament.roundOfOf')
            .replace('{n}', String(party.tournamentVotingMatch.round))
            .replace('{m}', String(party.tournamentBracket?.totalRounds ?? 1))}
          songs={party.tournamentVotingSongs}
          onPick={(song) => {
            setTournamentVotingActive(false);
            party.setTournamentVotingSongs([]);
            party.setTournamentVotedSong(song);
            party.addTournamentUsedSongId(song.id);
            startMatchWithMicOverlay(party.tournamentVotingMatch!, song);
          }}
          onSkip={() => {
            setTournamentVotingActive(false);
            party.setTournamentVotingSongs([]);
            party.setTournamentVotingMatch(null);
          }}
        />
      )}

      {/* Tournament Game Screen */}
      {screen === 'tournament-game' && party.tournamentBracket && !showTournamentResults && (
        <TournamentBracketView
          bracket={party.tournamentBracket}
          currentMatch={party.currentTournamentMatch}
          matchAborted={party.tournamentMatchAborted}
          onPlayMatch={handlePlayTournamentMatch}
          onManualWinner={(matchId, winnerId) => {
            if (!party.tournamentBracket) return;
            // Look up the match from the bracket (works for both abort dialog and manual selection)
            const match = party.tournamentBracket.matches.find(m => m.id === matchId);
            if (!match) return;
            const isP1Winner = winnerId === match.player1?.id;
            // Use 100 for winner, 0 for loser to clearly indicate the choice
            const updated = recordMatchResult(
              party.tournamentBracket,
              matchId,
              isP1Winner ? 100 : 0,
              isP1Winner ? 0 : 100,
            );
            party.setTournamentBracket(updated);
            party.setCurrentTournamentMatch(null);
          }}
          onRepeatMatch={() => {
            if (!party.currentTournamentMatch) return;
            const match = party.currentTournamentMatch;
            if (!match.player1 || !match.player2) return;
            resetGame();
            setPlayers([]);
            addPlayer({
              id: match.player1.id,
              name: match.player1.name,
              avatar: match.player1.avatar,
              color: match.player1.color,
            });
            addPlayer({
              id: match.player2.id,
              name: match.player2.name,
              avatar: match.player2.avatar,
              color: match.player2.color,
            });
            setGameMode('duel');
            const song = pickTournamentSong();
            if (song) setSong(song);
            setScreen('game');
          }}
          onAbortHandled={() => {
            party.setTournamentMatchAborted(false);
          }}
          shortMode={party.tournamentSongDuration === 60}
          showResults={showTournamentResults}
          onShowResults={() => setShowTournamentResults(true)}
          // Bug 12c: visible way back to the menu on the immersive bracket
          // screen — opens the party-leave CONFIRMATION dialog (handled in
          // karaoke-app.tsx), never an immediate exit.
          onLeaveToMenu={() => party.setPauseDialogAction('party-leave')}
        />
      )}

      {/* #7 Tournament Results Screen */}
      {screen === 'tournament-game' && party.tournamentBracket && showTournamentResults && (
        <TournamentResultsScreen
          bracket={party.tournamentBracket}
          onBack={() => setShowTournamentResults(false)}
          onExitToMenu={handleTournamentExitToMenu}
          onNewTournament={handleTournamentNew}
        />
      )}
    </>
  );
}
