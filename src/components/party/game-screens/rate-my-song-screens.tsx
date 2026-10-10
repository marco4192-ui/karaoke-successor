'use client';

/**
 * Rate my Song screens — extracted 1:1 from party-game-screens.tsx (task R9):
 * mode starting screen, challenge pre-singing overlay, rating screen and
 * (series) results screens. JSX, inline handlers and comments are
 * byte-identical; the party store, profiles/gameMode from the game store and
 * the translation are read via the same hooks the orchestrator used. The
 * rateMySong* / challengeOverlayDismissed state remains orchestrator-owned
 * (it must survive screen switches) and is passed in as props.
 */

import { useGameStore } from '@/lib/game/store';
import { usePartyStore } from '@/lib/game/party-store';
import { useTranslation } from '@/lib/i18n/translations';
import { getAllSongs } from '@/lib/game/song-library';
import { toast } from '@/hooks/use-toast';
import { RateMySongRatingScreen, RateMySongResultsScreen, RateMySongSeriesResultsScreen } from '@/components/game/rate-my-song-screen';
import type { RateMySongResult } from '@/components/game/rate-my-song-screen';
import { getRandomChallenge } from '@/lib/game/rate-my-song-ranking';
import { RmsStartingScreen } from './rms-starting-screen';
import type { Dispatch, SetStateAction } from 'react';
import type { Screen } from '@/types/screens';

export interface RateMySongScreensProps {
  screen: Screen;
  setScreen: (_s: Screen) => void;
  rateMySongResult: RateMySongResult | null;
  setRateMySongResult: Dispatch<SetStateAction<RateMySongResult | null>>;
  rateMySongSeriesRound: number;
  setRateMySongSeriesRound: Dispatch<SetStateAction<number>>;
  challengeOverlayDismissed: boolean;
  setChallengeOverlayDismissed: Dispatch<SetStateAction<boolean>>;
}

export function RateMySongScreens({
  screen,
  setScreen,
  rateMySongResult,
  setRateMySongResult,
  rateMySongSeriesRound,
  setRateMySongSeriesRound,
  challengeOverlayDismissed,
  setChallengeOverlayDismissed,
}: RateMySongScreensProps) {
  const { profiles, resetGame, setGameMode } = useGameStore();
  const rmsGameMode = useGameStore((s) => s.gameState.gameMode);
  const party = usePartyStore();
  const { t } = useTranslation();

  return (
    <>
      {/* Rate my Song — Mode Starting Screen (before the game screen).
          Shown after "Ready to Play": singers get into position, then press Start. */}
      {screen === 'rate-my-song-game' && party.rateMySongSettings && (
        <RmsStartingScreen
          setScreen={setScreen}
        />
      )}

      {/* Challenge Pre-Singing Overlay (Rate my Song) */}
      {screen === 'game' && rmsGameMode === 'rate-my-song' && party.rateMySongCurrentChallenge && !challengeOverlayDismissed && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-gradient-to-br from-purple-900/90 to-pink-900/90 border border-purple-500/30 rounded-2xl p-8 max-w-md text-center animate-fade-in">
            <div className="text-5xl mb-4">{party.rateMySongCurrentChallenge.icon}</div>
            <h2 className="text-xl font-bold text-white mb-2">
              {t(`rateMySong.challenges.${party.rateMySongCurrentChallenge.id}.title`)}
            </h2>
            <p className="text-white/70 text-sm mb-6">
              {t(`rateMySong.challenges.${party.rateMySongCurrentChallenge.id}.description`)}
            </p>
            <p className="text-amber-400 text-xs mb-4">{t('rateMySong.bonusPointsIfMastered')}</p>
            <button
              onClick={() => setChallengeOverlayDismissed(true)}
              className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg text-white font-medium hover:from-purple-400 hover:to-pink-400 transition-all"
              data-testid="party-rms-challenge-dismiss-button"
            >
              {t('rateMySong.letsGo')}
            </button>
          </div>
        </div>
      )}

      {/* Rate my Song — After song ends, go to rating screen */}
      {screen === 'rate-my-song-rating' && party.rateMySongSettings && (
        (() => {
          const rms = party.rateMySongSettings;
          const rmsSong = getAllSongs().find(s => s.id === rms.songId);
          return (
        <RateMySongRatingScreen
          songTitle={rmsSong?.title || ''}
          songArtist={rmsSong?.artist || ''}
          singingPlayers={party.rateMySongPlayerIds.map(id => {
            const p = profiles.find(pr => pr.id === id);
            return { id, name: p?.name || t('game.player'), color: p?.color || '#FF6B6B' };
          })}
          allProfiles={profiles}
          categoriesEnabled={rms.categoriesEnabled}
          anonymousRating={rms.anonymousRating}
          challengesEnabled={rms.challengesEnabled}
          currentChallenge={party.rateMySongCurrentChallenge}
          onSubmit={(ratings) => {
            const avg = ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;
            // Resolve spectator bets
            if (party.rateMySongSettings?.bettingEnabled) {
              const totalBetPoints = ratings.reduce((sum, r) => sum + (r.betPoints || 0), 0);
              if (totalBetPoints > 0) {
                toast({ title: t('rateMySong.bettingResultTitle'), description: t('rateMySong.bettingResultDesc').replace('{n}', String(totalBetPoints)) });
              }
            }
            const result: RateMySongResult = {
              songTitle: rmsSong?.title || '',
              songArtist: rmsSong?.artist || '',
              ratings,
              averageRating: Math.round(avg * 10) / 10,
              challengeBonus: ratings.some(r => r.challengeMastered) ? 50 : 0,
            };
            // Notify if challenge bonus earned
            if (result.challengeBonus && result.challengeBonus > 0) {
              toast({ title: '🏆 ' + t('rateMySong.challengeMastered'), description: t('rateMySong.challengeBonusDesc').replace('{n}', String(result.challengeBonus)) });
            }
            setRateMySongResult(result);
            // Save round to series history ONCE at submit time, not during render
            const totalRounds = rms.seriesRounds || 1;
            const isSeries = totalRounds > 1;
            if (isSeries && ratings.length > 0) {
              party.addRateMySongSeriesRound(ratings);
            }
            setScreen('rate-my-song-results');
          }}
          onBack={() => setScreen('party')}
        />
          );
        })()
      )}

      {/* Rate my Song — Results */}
      {screen === 'rate-my-song-results' && (() => {
        if (!rateMySongResult || !party.rateMySongSettings) return null;
        const rms = party.rateMySongSettings;
        const rmsSong = getAllSongs().find(s => s.id === rms.songId);
        const totalRounds = rms.seriesRounds || 1;
        const isLastRound = rateMySongSeriesRound >= totalRounds;
        const isSeries = totalRounds > 1;

        // If last round of a series, show series results
        if (isSeries && isLastRound) {
          return (
            <RateMySongSeriesResultsScreen
              seriesHistory={party.rateMySongSeriesHistory}
              onEnd={() => {
                // TERMINATE the mode (user report): full reset incl. selectedGameMode.
                // Round 2: resetGame+standard also clears the game-store
                // gameMode ('rate-my-song' — set by the start handler and
                // preserved by resetGame, re-routing Library picks).
                party.resetPartyState(true);
                resetGame();
                setGameMode('standard');
                setRateMySongResult(null);
                setRateMySongSeriesRound(1);
                setScreen('home');
              }}
            />
          );
        }

        return (
          <RateMySongResultsScreen
            result={rateMySongResult}
            songId={rms.songId}
            songGenre={rmsSong?.genre}
            categoriesEnabled={rms.categoriesEnabled}
            challengesEnabled={rms.challengesEnabled}
            seriesRound={rateMySongSeriesRound}
            seriesTotalRounds={totalRounds}
            onPlayAgain={() => {
              setRateMySongResult(null);
              // Advance series round
              if (isSeries && !isLastRound) {
                setRateMySongSeriesRound(prev => prev + 1);
              } else {
                setRateMySongSeriesRound(1);
              }
              // Draw new challenge for next round
              if (rms.challengesEnabled) {
                const prevChallenge = party.rateMySongCurrentChallenge;
                const challenge = getRandomChallenge(prevChallenge?.id);
                party.setRateMySongCurrentChallenge(challenge);
              }
              // Unified flow: "Play Again" returns to the unified party setup
              // (mode, players, song selection, "Ready to Play") instead of the
              // legacy setup screen — the flow stays identical every round.
              party.setSelectedGameMode('rate-my-song');
              setScreen('party-setup');
            }}
            onEnd={() => {
              // TERMINATE the mode (user report): full reset incl. selectedGameMode.
              // Round 2: resetGame+standard also clears the game-store gameMode
              // ('rate-my-song' — preserved by resetGame, re-routing picks).
              party.resetPartyState(true);
              resetGame();
              setGameMode('standard');
              setRateMySongResult(null);
              setRateMySongSeriesRound(1);
              setScreen('home');
            }}
          />
        );
      })()}
    </>
  );
}
