'use client';

import { useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from '@/lib/i18n/translations';
import type { GameState, CompanionScoreEntry } from './mobile-types';

interface MobileLeaderboardProps {
  gameState: GameState;
}

/** Derive the profileId of the currently active singer from game state */
function getActiveSingerId(gameState: GameState): string | null {
  if (gameState.singalongTurn?.isActive && gameState.singalongTurn.profileId) {
    return gameState.singalongTurn.profileId;
  }
  return null;
}

/** Rank medal data (labels are set dynamically via i18n) */
const MEDAL: Record<number, { emoji: string; ring: string; bg: string }> = {
  1: { emoji: '\u{1F947}', ring: 'ring-amber-400', bg: 'bg-gradient-to-r from-amber-500/15 to-yellow-500/5' },
  2: { emoji: '\u{1F948}', ring: 'ring-gray-300', bg: 'bg-gradient-to-r from-gray-400/10 to-gray-300/5' },
  3: { emoji: '\u{1F949}', ring: 'ring-amber-700', bg: 'bg-gradient-to-r from-amber-800/10 to-amber-700/5' },
};

const MEDAL_LABELS: Record<number, string> = {
  1: 'mobileLeaderboard.medalGold',
  2: 'mobileLeaderboard.medalSilver',
  3: 'mobileLeaderboard.medalBronze',
};

export function MobileLeaderboard({ gameState }: MobileLeaderboardProps) {
  const { t } = useTranslation();

  // Only show during companion-singalong with a song playing
  const isActive =
    gameState.gameMode === 'companion-singalong' &&
    gameState.currentSong !== null &&
    gameState.companionScores !== null &&
    gameState.companionScores.length > 0;

  // Sort players by score descending
  const sorted = useMemo(() => {
    if (!gameState.companionScores) return [];
    return [...gameState.companionScores].sort((a, b) => b.score - a.score);
  }, [gameState.companionScores]);

  // Track previous ranks for trend indicators
  const prevRankRef = useRef<Map<string, number>>(new Map());

  const ranks = useMemo(() => {
    const current = new Map<string, number>();
    sorted.forEach((p, i) => current.set(p.profileId, i));
    return current;
  }, [sorted]);

  // Compute trends: compare current rank to previous rank
  const trends = useMemo(() => {
    const result = new Map<string, 'up' | 'down' | 'same'>();
    sorted.forEach((p) => {
      const prev = prevRankRef.current.get(p.profileId);
      const curr = ranks.get(p.profileId) ?? 0;
      if (prev === undefined || prev === curr) {
        result.set(p.profileId, 'same');
      } else if (curr < prev) {
        result.set(p.profileId, 'up');
      } else {
        result.set(p.profileId, 'down');
      }
    });
    return result;
  }, [sorted, ranks]);

  // Update prevRankRef after computing trends (so next render sees these as "previous")
  // We use a separate effect to avoid re-computing trends within the same render
  useRef(() => {
    prevRankRef.current = ranks;
  });
  // Manual ref update — use current render's ranks for next comparison
  prevRankRef.current = ranks;

  if (!isActive) return null;

  const activeSingerId = getActiveSingerId(gameState);

  return (
    <Card className="bg-white/5 border-white/10 overflow-hidden">
      <CardHeader className="pb-2 pt-3 px-4">
        <CardTitle className="text-sm flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          {t('mobileLeaderboard.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3">
        {sorted.length === 0 ? (
          <p className="text-center text-white/30 text-sm py-4">{t('mobileLeaderboard.noPlayers')}</p>
        ) : (
          <div className="space-y-1">
            {sorted.map((player, index) => {
              const rank = index + 1;
              const medal = MEDAL[rank];
              const isActiveSinger = player.profileId === activeSingerId;
              const trend = trends.get(player.profileId) ?? 'same';

              return (
                <div
                  key={player.profileId}
                  className={`
                    flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-500
                    ${medal?.bg ?? 'bg-white/[0.03]'}
                    ${isActiveSinger ? 'ring-1 ring-emerald-500/40 bg-emerald-500/10' : ''}
                  `}
                >
                  {/* Rank */}
                  <div className="w-7 flex-shrink-0 text-center">
                    {medal ? (
                      <span className="text-lg" title={t(MEDAL_LABELS[rank] ?? '')}>{medal.emoji}</span>
                    ) : (
                      <span className="text-sm font-bold text-white/40">#{rank}</span>
                    )}
                  </div>

                  {/* Avatar / Color dot */}
                  <div className="relative flex-shrink-0">
                    {player.avatar ? (
                      <img
                        src={player.avatar}
                        alt={player.name}
                        className={`w-8 h-8 rounded-full object-cover ${medal?.ring ?? ''}`}
                      />
                    ) : (
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${medal?.ring ?? 'ring-1 ring-white/10'}`}
                        style={{ backgroundColor: player.color }}
                      >
                        {player.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    {/* Pulsing mic icon for active singer */}
                    {isActiveSinger && (
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center animate-pulse">
                        <span className="text-[8px] leading-none">&#x1F3A4;</span>
                      </div>
                    )}
                  </div>

                  {/* Name + trend */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-sm truncate">{player.name}</span>
                      <TrendIcon trend={trend} t={t} />
                    </div>
                    {isActiveSinger && (
                      <span className="text-[10px] text-emerald-400/70">{t('mobileLeaderboard.currentSinger')}</span>
                    )}
                  </div>

                  {/* Score */}
                  <div className="text-right flex-shrink-0">
                    <span className={`text-sm font-bold tabular-nums ${rank === 1 ? 'text-amber-400' : 'text-white/80'}`}>
                      {player.score.toLocaleString()}
                    </span>
                    <span className="block text-[10px] text-white/30">{t('mobileLeaderboard.score')}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TrendIcon({ trend, t }: { trend: 'up' | 'down' | 'same'; t: (key: string) => string }) {
  if (trend === 'up') {
    return (
      <span className="text-emerald-400 text-xs leading-none" title={t('mobileLeaderboard.trendUp')}>&#x2191;</span>
    );
  }
  if (trend === 'down') {
    return (
      <span className="text-red-400 text-xs leading-none" title={t('mobileLeaderboard.trendDown')}>&#x2193;</span>
    );
  }
  return (
    <span className="text-white/20 text-xs leading-none" title={t('mobileLeaderboard.trendSame')}>&mdash;</span>
  );
}
