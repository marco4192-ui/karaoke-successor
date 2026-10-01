'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useTranslation } from '@/lib/i18n/translations';
import { RATING_HEX_COLORS, RATING_TAILWIND_CLASSES } from '@/lib/game/rating-utils';
import type { GameResult } from '@/types/game';

type PlayerResultEntry = GameResult['players'][number];

interface ResultsStatsPanelProps {
  playerResult: PlayerResultEntry;
  player2Result?: PlayerResultEntry | null;
  player2Name?: string;
  player1Name: string;
  isDuel?: boolean;
  maxScore: number;
  /** Song duration in seconds (results.duration) */
  durationSeconds?: number;
  difficulty?: string;
  isBlindMode?: boolean;
}

/** mm:ss for the details row */
function formatDuration(seconds?: number): string | null {
  if (!seconds || seconds <= 0) return null;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** One compact stat tile */
function StatTile({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="rounded-xl bg-white/[0.04] border border-white/[0.08] px-3 py-2.5 text-center min-w-0">
      <div className={`text-lg xl:text-xl font-bold tabular-nums truncate ${accent}`}>{value}</div>
      <div className="text-[10px] xl:text-[11px] text-white/40 uppercase tracking-wide truncate">{label}</div>
    </div>
  );
}

/**
 * R42 — the ESSENTIAL statistics, replacing the former 5-mode score
 * visualization (barometer/speedometer/radar/table/comparison). One clear
 * layout: big score, rating-colored progress bar, four key tiles, and an
 * optional "all details" accordion for the numbers enthusiasts.
 */
export function ResultsStatsPanel({
  playerResult,
  player2Result,
  player1Name,
  player2Name,
  isDuel,
  maxScore,
  durationSeconds,
  difficulty,
  isBlindMode,
}: ResultsStatsPanelProps) {
  const { t } = useTranslation();
  const [showDetails, setShowDetails] = useState(false);

  const percentage = maxScore > 0 ? (playerResult.score / maxScore) * 100 : 0;
  const ratingColor = RATING_HEX_COLORS[playerResult.rating] || '#00d9ff';
  const ratingGradient = RATING_TAILWIND_CLASSES[playerResult.rating] || RATING_TAILWIND_CLASSES.good;

  const detailRows = [
    { label: t('resultsScreen.perfectNotes'), value: String(playerResult.perfectNotesCount) },
    { label: t('resultsScreen.goldenNotes'), value: String(playerResult.goldenNotesCount) },
    playerResult.tickAccuracy != null
      ? { label: t('resultsScreen.tickAccuracy'), value: `${playerResult.tickAccuracy.toFixed(1)}%` }
      : null,
    playerResult.blindBonusPoints
      ? { label: t('resultsScreen.blindBonus'), value: `+${playerResult.blindBonusPoints.toLocaleString()}` }
      : null,
    durationSeconds ? { label: t('resultsScreen.duration'), value: formatDuration(durationSeconds) || '-' } : null,
    difficulty ? { label: t('resultsScreen.difficultyLabel'), value: difficulty.toUpperCase() } : null,
    isBlindMode ? { label: t('resultsScreen.blindMode'), value: '🎭' } : null,
  ].filter((row): row is { label: string; value: string } => row !== null);

  return (
    <Card className="bg-white/5 border-white/10">
      <CardContent className="py-4 px-4 xl:px-6">
        {/* ── Single player: one big score + progress ── */}
        {!isDuel && (
          <>
            <div className="text-center mb-3">
              <span
                className="text-4xl xl:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 tabular-nums"
                style={{ textShadow: `0 0 32px ${ratingColor}44` }}
              >
                {playerResult.score.toLocaleString()}
              </span>
              <span className="text-white/40 ml-2 text-lg">/ {maxScore.toLocaleString()}</span>
            </div>

            {/* Rating-colored progress bar */}
            <div className="relative h-8 bg-white/[0.06] rounded-full overflow-hidden border border-white/10">
              <div
                className={`absolute inset-y-0 left-0 bg-gradient-to-r ${ratingGradient} transition-all duration-1000 flex items-center justify-end pr-2`}
                style={{ width: `${Math.min(100, percentage)}%` }}
              >
                {percentage > 18 && (
                  <span className="text-white font-bold text-xs drop-shadow">{percentage.toFixed(1)}%</span>
                )}
              </div>
              {/* Threshold ticks at the 8-level scale boundaries */}
              <div className="absolute inset-0 flex items-center pointer-events-none" aria-hidden>
                {[32, 50, 65, 78, 88, 95, 99.5].map((tick) => (
                  <div key={tick} className="absolute inset-y-0 w-px bg-white/15" style={{ left: `${tick}%` }} />
                ))}
              </div>
            </div>

            {/* Four essential tiles */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
              <StatTile label={t('results.accuracy')} value={`${playerResult.accuracy.toFixed(1)}%`} accent="text-cyan-400" />
              <StatTile
                label={t('scoreVisualization.notesHit')}
                value={`${playerResult.notesHit}/${playerResult.notesHit + playerResult.notesMissed}`}
                accent="text-green-400"
              />
              <StatTile label={t('scoreVisualization.notesMissed')} value={String(playerResult.notesMissed)} accent="text-red-400" />
              <StatTile label={t('scoreVisualization.maxComboLabel')} value={`${playerResult.maxCombo}x`} accent="text-purple-400" />
            </div>
          </>
        )}

        {/* ── Duel: compact head-to-head ── */}
        {isDuel && (
          <div className="space-y-3">
            {/* Score battle bar */}
            <div className="relative h-8 bg-white/[0.06] rounded-full overflow-hidden flex border border-white/10">
              <div
                className="bg-gradient-to-r from-cyan-500 to-cyan-400 flex items-center justify-start pl-2 min-w-0"
                style={{ width: `${playerResult.score + (player2Result?.score ?? 0) > 0 ? (playerResult.score / Math.max(1, playerResult.score + (player2Result?.score ?? 0))) * 100 : 50}%` }}
              >
                <span className="text-xs font-bold text-white tabular-nums">{playerResult.score.toLocaleString()}</span>
              </div>
              <div
                className="bg-gradient-to-l from-pink-500 to-pink-400 flex items-center justify-end pr-2 min-w-0"
                style={{ width: `${playerResult.score + (player2Result?.score ?? 0) > 0 ? ((player2Result?.score ?? 0) / Math.max(1, playerResult.score + (player2Result?.score ?? 0))) * 100 : 50}%` }}
              >
                <span className="text-xs font-bold text-white tabular-nums">{player2Result?.score.toLocaleString() ?? '0'}</span>
              </div>
            </div>

            {/* Per-player tiles */}
            <div className="grid grid-cols-2 gap-2">
              {([playerResult, player2Result] as Array<PlayerResultEntry | null | undefined>).map((p, i) => {
                if (!p) return null;
                const winner = isDuel && player2Result
                  ? playerResult.score > player2Result.score ? 'p1' : playerResult.score < player2Result.score ? 'p2' : 'draw'
                  : null;
                const isWinner = i === 0 ? winner === 'p1' : winner === 'p2';
                return (
                  <div
                    key={i}
                    className={`rounded-xl border px-3 py-2.5 min-w-0 ${isWinner ? 'border-yellow-400/50 bg-yellow-400/5' : 'border-white/[0.08] bg-white/[0.04]'}`}
                  >
                    <div className={`text-xs font-semibold truncate mb-1.5 ${i === 0 ? 'text-cyan-400' : 'text-pink-400'}`}>
                      {i === 0 ? player1Name : (player2Name || t('resultsScreen.player'))}
                      {isWinner ? ' 🏆' : ''}
                    </div>
                    <div className="grid grid-cols-3 gap-1.5 text-center">
                      <div>
                        <div className="text-sm font-bold text-cyan-400 tabular-nums">{p.accuracy.toFixed(1)}%</div>
                        <div className="text-[9px] text-white/35 uppercase">{t('results.accuracy')}</div>
                      </div>
                      <div>
                        <div className="text-sm font-bold text-green-400 tabular-nums">{p.notesHit}</div>
                        <div className="text-[9px] text-white/35 uppercase">{t('scoreVisualization.notesHit')}</div>
                      </div>
                      <div>
                        <div className="text-sm font-bold text-purple-400 tabular-nums">{p.maxCombo}x</div>
                        <div className="text-[9px] text-white/35 uppercase">{t('scoreVisualization.combo')}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Details accordion (collapsed by default — keeps the screen calm) ── */}
        {detailRows.length > 0 && (
          <div className="mt-3">
            <button
              type="button"
              onClick={() => setShowDetails((v) => !v)}
              className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white/80 transition-colors mx-auto"
              aria-expanded={showDetails}
            >
              {showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              {showDetails ? t('resultsScreen.detailsHide') : t('resultsScreen.detailsShow')}
            </button>
            {showDetails && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1.5 mt-2.5 pt-2.5 border-t border-white/[0.08]">
                {detailRows.map((row) => (
                  <div key={row.label} className="flex items-baseline justify-between gap-2 text-xs">
                    <span className="text-white/40 truncate">{row.label}</span>
                    <span className="text-white/80 font-semibold tabular-nums">{row.value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
