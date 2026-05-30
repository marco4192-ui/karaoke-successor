'use client';

import { RATING_TAILWIND_CLASSES } from '@/lib/game/rating-utils';
import type { GameResult } from '@/types/game';

type PlayerResultEntry = GameResult['players'][number];

interface ResultsRatingHeaderProps {
  isMultiplayer: boolean;
  isDuel: boolean;
  isDuet: boolean;
  playerResult: PlayerResultEntry;
  player2Result: PlayerResultEntry | null;
  activeProfileName: string;
  player2ProfileName?: string;
  duetPlayerNames?: [string, string];
  /** Translated fallback label, e.g. "Player" */
  playerLabel: string;
  /** Translated draw label */
  drawLabel: string;
  /** Translation function */
  t: (key: string) => string;
}

/**
 * Displays the rating banner for single player mode, or the side-by-side
 * comparison cards for duel/duet multiplayer modes.
 */
export function ResultsRatingHeader({
  isMultiplayer,
  isDuel,
  isDuet,
  playerResult,
  player2Result,
  activeProfileName,
  player2ProfileName,
  duetPlayerNames,
  playerLabel,
  drawLabel,
  t,
}: ResultsRatingHeaderProps) {
  const ratingColors = RATING_TAILWIND_CLASSES;

  // Determine winner for duel only (duet is cooperative — no winner)
  const winnerSide = isDuel && player2Result
    ? playerResult.score > player2Result.score ? 'p1' : playerResult.score < player2Result.score ? 'p2' : 'draw'
    : null;

  // Single player rating banner
  if (!isMultiplayer) {
    const glowClass = playerResult.rating === 'perfect'
      ? 'shadow-[0_0_30px_rgba(255,214,10,0.5)]'
      : playerResult.rating === 'excellent'
        ? 'shadow-[0_0_25px_rgba(0,229,255,0.4)]'
        : 'shadow-[0_0_20px_rgba(191,90,242,0.3)]';
    return (
      <div className="text-center mb-8">
        <div className={`inline-block px-8 py-4 rounded-2xl bg-gradient-to-r ${ratingColors[playerResult.rating] || ratingColors.good} mb-4 backdrop-blur-sm ${glowClass}`}>
          <h1 className="text-4xl font-black text-white uppercase drop-shadow-[0_0_12px_rgba(255,255,255,0.8)]">{playerResult.rating}!</h1>
        </div>
      </div>
    );
  }

  // Multiplayer: show both players side by side
  if (!player2Result) return null;

  return (
    <div className="flex justify-center items-stretch gap-6 mb-8">
      {/* Player 1 rating card */}
      <div className={`flex-1 max-w-xs rounded-2xl p-6 text-center bg-[#0a0014]/80 backdrop-blur-sm border border-white/10 ${
        winnerSide === 'p1' ? 'ring-2 ring-[#ffd60a] shadow-[0_0_25px_rgba(255,214,10,0.3)]' : ''
      }`}>
        <div className={`inline-block px-6 py-3 rounded-xl bg-gradient-to-r ${ratingColors[playerResult.rating] || ratingColors.good} mb-3 shadow-[0_0_15px_rgba(0,229,255,0.2)]`}>
          <h2 className="text-2xl font-black text-white uppercase drop-shadow-[0_0_8px_rgba(255,255,255,0.7)]">{playerResult.rating}!</h2>
        </div>
        <div className="text-[#00e5ff] font-semibold text-lg drop-shadow-[0_0_8px_rgba(0,229,255,0.4)]">{activeProfileName || playerLabel + ' 1'}</div>
        <div className="text-3xl font-black text-white mt-2 drop-shadow-[0_0_10px_rgba(0,229,255,0.3)]">{playerResult.score.toLocaleString()}</div>
        <div className="text-white/40 text-sm">{t('resultsScreen.accuracyLabel').replace('{n}', playerResult.accuracy.toFixed(1))}</div>
        {playerResult.tickAccuracy != null && (
          <div className="text-white/25 text-xs mt-1">Tick: {playerResult.tickAccuracy.toFixed(1)}%</div>
        )}
        {winnerSide === 'p1' && <div className="mt-3 text-xl">🏆</div>}
      </div>

      {/* VS / Duet indicator */}
      <div className="flex flex-col items-center justify-center">
        <span className="text-4xl font-black text-white/30">{isDuet ? '🎤' : '⚔️'}</span>
        {winnerSide === 'draw' && <span className="mt-2 text-sm text-[#bf5af2] font-bold drop-shadow-[0_0_8px_rgba(191,90,242,0.4)]">{drawLabel}</span>}
      </div>

      {/* Player 2 rating card */}
      <div className={`flex-1 max-w-xs rounded-2xl p-6 text-center bg-[#0a0014]/80 backdrop-blur-sm border border-white/10 ${
        winnerSide === 'p2' ? 'ring-2 ring-[#ffd60a] shadow-[0_0_25px_rgba(255,214,10,0.3)]' : ''
      }`}>
        <div className={`inline-block px-6 py-3 rounded-xl bg-gradient-to-r ${ratingColors[player2Result.rating] || ratingColors.good} mb-3 shadow-[0_0_15px_rgba(255,45,149,0.2)]`}>
          <h2 className="text-2xl font-black text-white uppercase drop-shadow-[0_0_8px_rgba(255,255,255,0.7)]">{player2Result.rating}!</h2>
        </div>
        <div className="text-[#ff2d95] font-semibold text-lg drop-shadow-[0_0_8px_rgba(255,45,149,0.4)]">{player2ProfileName || duetPlayerNames?.[1] || playerLabel + ' 2'}</div>
        <div className="text-3xl font-black text-white mt-2 drop-shadow-[0_0_10px_rgba(255,45,149,0.3)]">{player2Result.score.toLocaleString()}</div>
        <div className="text-white/40 text-sm">{t('resultsScreen.accuracyLabel').replace('{n}', player2Result.accuracy.toFixed(1))}</div>
        {player2Result.tickAccuracy != null && (
          <div className="text-white/25 text-xs mt-1">Tick: {player2Result.tickAccuracy.toFixed(1)}%</div>
        )}
        {winnerSide === 'p2' && <div className="mt-3 text-xl">🏆</div>}
      </div>
    </div>
  );
}
