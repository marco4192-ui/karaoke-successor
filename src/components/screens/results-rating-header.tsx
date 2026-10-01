'use client';

import { RATING_TAILWIND_CLASSES, RATING_HEX_COLORS } from '@/lib/game/rating-utils';
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
  duetPlayerNames?: string[];
  /** Translated fallback label, e.g. "Player" */
  playerLabel: string;
  /** Translated draw label */
  drawLabel: string;
  /** Translation function */
  t: (key: string) => string;
}

/** Translated, localized rating word (R42: 8-level scale, no more raw English). */
function ratingWord(t: (key: string) => string, rating: string): string {
  const label = t(`scoreVisualization.${rating}`);
  // t() returns the key itself when missing → fall back to the raw rating
  return label === `scoreVisualization.${rating}` ? rating : label;
}

/**
 * R42 — compact rating banner for the one-screen results layout.
 * Single player: one gradient banner with the translated rating word.
 * Duel/Duet: two side-by-side cards with winner highlight.
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
    return (
      <div className="text-center">
        <div
          className={`inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-gradient-to-r ${ratingColors[playerResult.rating] || ratingColors.good} shadow-lg`}
          style={{ boxShadow: `0 8px 32px -12px ${RATING_HEX_COLORS[playerResult.rating] || '#00d9ff'}` }}
        >
          <h1 className="text-3xl xl:text-4xl font-black text-white uppercase tracking-wide">
            {ratingWord(t, playerResult.rating)}!
          </h1>
        </div>
      </div>
    );
  }

  // Multiplayer: show both players side by side
  if (!player2Result) return null;

  return (
    <div className="flex justify-center items-stretch gap-4">
      {/* Player 1 rating card */}
      <div className={`flex-1 max-w-xs rounded-2xl p-4 text-center bg-white/5 border border-white/10 ${
        winnerSide === 'p1' ? 'ring-2 ring-yellow-400 shadow-lg shadow-yellow-400/20' : ''
      }`}>
        <div className={`inline-block px-5 py-2 rounded-xl bg-gradient-to-r ${ratingColors[playerResult.rating] || ratingColors.good} mb-2`}>
          <h2 className="text-xl xl:text-2xl font-black text-white uppercase">{ratingWord(t, playerResult.rating)}!</h2>
        </div>
        <div className="text-cyan-400 font-semibold text-base truncate">{activeProfileName || playerLabel + ' 1'}</div>
        <div className="text-2xl font-black text-white mt-1">{playerResult.score.toLocaleString()}</div>
        <div className="text-white/40 text-xs">{t('resultsScreen.accuracyLabel').replace('{n}', playerResult.accuracy.toFixed(1))}</div>
        {winnerSide === 'p1' && <div className="mt-2 text-xl">🏆</div>}
      </div>

      {/* VS / Duet indicator */}
      <div className="flex flex-col items-center justify-center">
        <span className="text-3xl font-black text-white/30">{isDuet ? '🎤' : '⚔️'}</span>
        {winnerSide === 'draw' && <span className="mt-1 text-xs text-purple-400 font-bold">{drawLabel}</span>}
      </div>

      {/* Player 2 rating card */}
      <div className={`flex-1 max-w-xs rounded-2xl p-4 text-center bg-white/5 border border-white/10 ${
        winnerSide === 'p2' ? 'ring-2 ring-yellow-400 shadow-lg shadow-yellow-400/20' : ''
      }`}>
        <div className={`inline-block px-5 py-2 rounded-xl bg-gradient-to-r ${ratingColors[player2Result.rating] || ratingColors.good} mb-2`}>
          <h2 className="text-xl xl:text-2xl font-black text-white uppercase">{ratingWord(t, player2Result.rating)}!</h2>
        </div>
        <div className="text-pink-400 font-semibold text-base truncate">{player2ProfileName || duetPlayerNames?.[1] || playerLabel + ' 2'}</div>
        <div className="text-2xl font-black text-white mt-1">{player2Result.score.toLocaleString()}</div>
        <div className="text-white/40 text-xs">{t('resultsScreen.accuracyLabel').replace('{n}', player2Result.accuracy.toFixed(1))}</div>
        {winnerSide === 'p2' && <div className="mt-2 text-xl">🏆</div>}
      </div>
    </div>
  );
}
