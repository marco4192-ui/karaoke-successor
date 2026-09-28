'use client';

/**
 * PARTY GAME MODE SCREENS — orchestrator (task R9 split).
 *
 * Public surface unchanged: `export function PartyGameScreens` (imported by
 * karaoke-app.tsx). This file owns the cross-screen state (Rate my Song
 * results/series round, challenge overlay, next-song preparation feedback)
 * and the tournament state/handlers via useTournamentScreens, then composes
 * the screen blocks from ./game-screens/ in the EXACT original fragment
 * order (starting screen → PTM → tournament voting/bracket/results →
 * Battle Royale → CPTM → Medley → Missing Words/Blind → Rate my Song →
 * preparation overlay), so the rendered DOM is identical.
 *
 * Modules (all JSX/handler bodies extracted byte-identically):
 * - game-screens/use-tournament-screens.ts  — tournament state + handlers
 * - game-screens/tournament-screens.tsx     — starting screen + voting/bracket/results
 * - game-screens/ptm-game-section.tsx       — Pass the Mic game screen
 * - game-screens/battle-royale-section.tsx  — Battle Royale screen + brSongPool
 * - game-screens/cptm-game-section.tsx      — Companion Sing-A-Long screen
 * - game-screens/medley-game-section.tsx    — Medley Contest screen
 * - game-screens/competitive-game-sections.tsx — Missing Words + Blind screens
 * - game-screens/rate-my-song-screens.tsx   — Rate my Song screens (+ rms-starting-screen.tsx)
 * - game-screens/prepare-next-medley-round.ts — Medley Fix 7 next-round snippets
 * - game-screens/types.ts                   — shared types (props, MicOverlayState)
 */

import { useState } from 'react';
import { useTranslation } from '@/lib/i18n/translations';
import type { RateMySongResult } from '@/components/game/rate-my-song-screen';
import { useTournamentScreens } from './game-screens/use-tournament-screens';
import { TournamentStartingScreenBlock, TournamentGameScreens } from './game-screens/tournament-screens';
import { PtmGameSection } from './game-screens/ptm-game-section';
import { BattleRoyaleGameSection } from './game-screens/battle-royale-section';
import { CptmGameSection } from './game-screens/cptm-game-section';
import { MedleyGameSection } from './game-screens/medley-game-section';
import { CompetitiveGameSections } from './game-screens/competitive-game-sections';
import { RateMySongScreens } from './game-screens/rate-my-song-screens';
import type { PartyGameScreensProps } from './game-screens/types';

// ===================== PARTY GAME MODE SCREENS =====================
export function PartyGameScreens({ screen, setScreen }: PartyGameScreensProps) {
  const { t } = useTranslation();

  // State for Rate my Song results
  const [rateMySongResult, setRateMySongResult] = useState<RateMySongResult | null>(null);
  // Track current series round (1-based)
  const [rateMySongSeriesRound, setRateMySongSeriesRound] = useState(1);
  // Track whether the challenge pre-singing overlay has been dismissed
  const [challengeOverlayDismissed, setChallengeOverlayDismissed] = useState(true);

  // Item 5: visible loading feedback while the next song / medley snippets
  // are being prepared (PTM & Companion-Sing-Along next-round picks). The
  // preparation (song pick + snippet building + URL/lyrics restore) takes a
  // moment and previously froze the results screen with NO indication.
  const [isPreparingNextSong, setIsPreparingNextSong] = useState(false);

  // Tournament state + handlers (#7 results screen, #8 song voting, mic-overlay
  // starting screen, companion remote triggers) — moved verbatim into
  // use-tournament-screens (game-screens/use-tournament-screens.ts); the hook
  // keeps the orchestrator's store subscriptions, so re-render behavior and
  // callback freshness are unchanged.
  const {
    micOverlay,
    showTournamentResults,
    setShowTournamentResults,
    tournamentVotingActive,
    setTournamentVotingActive,
    startMatchWithMicOverlay,
    handlePlayTournamentMatch,
    pickTournamentSong,
    launchTournamentMatch,
    handleTournamentExitToMenu,
    handleTournamentNew,
  } = useTournamentScreens({ screen, setScreen });

  return (
    <>
      {/* Tournament Starting Screen — shown after selecting the next pairing
          (game-screens/tournament-screens.tsx: TournamentStartingScreenBlock). */}
      <TournamentStartingScreenBlock
        micOverlay={micOverlay}
        launchTournamentMatch={launchTournamentMatch}
      />

      {/* Pass the Mic Game Screen — dedicated PTM screen with note highway
          (game-screens/ptm-game-section.tsx). */}
      <PtmGameSection
        screen={screen}
        setScreen={setScreen}
        setIsPreparingNextSong={setIsPreparingNextSong}
      />

      {/* Tournament Song Voting Overlay (#8), Tournament Game Screen and
          Results Screen (#7) (game-screens/tournament-screens.tsx). */}
      <TournamentGameScreens
        screen={screen}
        setScreen={setScreen}
        tournamentVotingActive={tournamentVotingActive}
        setTournamentVotingActive={setTournamentVotingActive}
        startMatchWithMicOverlay={startMatchWithMicOverlay}
        handlePlayTournamentMatch={handlePlayTournamentMatch}
        pickTournamentSong={pickTournamentSong}
        showTournamentResults={showTournamentResults}
        setShowTournamentResults={setShowTournamentResults}
        handleTournamentExitToMenu={handleTournamentExitToMenu}
        handleTournamentNew={handleTournamentNew}
      />

      {/* Battle Royale Game Screen (game-screens/battle-royale-section.tsx). */}
      <BattleRoyaleGameSection screen={screen} setScreen={setScreen} />

      {/* Companion Sing-A-Long Game Screen, powered by the CPTM segment engine
          (game-screens/cptm-game-section.tsx). */}
      <CptmGameSection
        screen={screen}
        setScreen={setScreen}
        setIsPreparingNextSong={setIsPreparingNextSong}
      />

      {/* Medley Contest Game Screen — dedicated screen with multi-pitch
          detection (game-screens/medley-game-section.tsx). */}
      <MedleyGameSection screen={screen} setScreen={setScreen} />

      {/* Missing Words + Blind Karaoke Competitive Games
          (game-screens/competitive-game-sections.tsx). */}
      <CompetitiveGameSections screen={screen} setScreen={setScreen} />

      {/* Rate my Song — mode starting screen, challenge overlay, rating and
          results screens (game-screens/rate-my-song-screens.tsx). */}
      <RateMySongScreens
        screen={screen}
        setScreen={setScreen}
        rateMySongResult={rateMySongResult}
        setRateMySongResult={setRateMySongResult}
        rateMySongSeriesRound={rateMySongSeriesRound}
        setRateMySongSeriesRound={setRateMySongSeriesRound}
        challengeOverlayDismissed={challengeOverlayDismissed}
        setChallengeOverlayDismissed={setChallengeOverlayDismissed}
      />

      {/* Item 5: next-song / medley-snippet preparation overlay (PTM & CPTM).
          Fixed + high z so it covers the frozen results screen while the
          next round's songs/snippets are being built. */}
      {isPreparingNextSong && (
        <div className="fixed inset-0 z-[90] flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm pointer-events-auto" data-testid="ptm-next-song-loading">
          <div className="animate-spin w-10 h-10 border-2 border-cyan-400 border-t-transparent rounded-full mb-4" />
          <p className="text-white/70 text-sm font-medium">{t('medley.preparingNextRound')}</p>
        </div>
      )}
    </>
  );
}
