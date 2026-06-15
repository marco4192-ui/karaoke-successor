/**
 * Rate my Song — Results Screen & Series Results Screen
 */

'use client';

import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from '@/lib/i18n/translations';
import {
  addRateMySongEntry,
  addDailyRateMySongEntry,
  getRateMySongTopN,
  getDailyRateMySongTopN,
  getAICriticComment,
  getRateMySongPlayerStats,
  getSongSuggestions,
  updateRateMySongPlayerStats,
  addAudienceRatingToStats,
  getPlayerRank,
  getAchievementById,
  type RateMySongEntry,
  type RateMySongDailyEntry,
  type RateMySongPlayerStats,
  type SongSuggestion,
  type Achievement,
} from '@/lib/game/rate-my-song-ranking';
import type { RateMySongResult, RateMySongResultsScreenProps, RateMySongSeriesResultsScreenProps } from './rate-my-song-types';
import type { RateMySongRating } from './rate-my-song-types';
import { CATEGORY_WEIGHTS, CATEGORY_KEYS, type CategoryKey } from './rate-my-song-types';

// ===================== RESULTS SCREEN =====================

export function RateMySongResultsScreen({
  result,
  songId,
  songGenre,
  categoriesEnabled = false,
  challengesEnabled = false,
  seriesRound,
  seriesTotalRounds,
  onPlayAgain,
  onEnd,
}: RateMySongResultsScreenProps) {
  const { t, language } = useTranslation();
  const [topRanking, setTopRanking] = useState<RateMySongEntry[]>([]);
  const [dailyRanking, setDailyRanking] = useState<RateMySongDailyEntry[]>([]);
  const [activeTab, setActiveTab] = useState<'daily' | 'alltime'>('daily');
  const [playerStatsMap, setPlayerStatsMap] = useState<Map<string, RateMySongPlayerStats>>(new Map());
  const [newAchievementsMap, setNewAchievementsMap] = useState<Map<string, Achievement[]>>(new Map());
  const [songSuggestions, setSongSuggestions] = useState<SongSuggestion[]>([]);
  const [displayedScore, setDisplayedScore] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [displayedComment, setDisplayedComment] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    // Save each player's rating and update stats
    for (const r of result.ratings) {
      const entryBase = {
        songId: songId || 'unknown',
        songTitle: result.songTitle,
        songArtist: result.songArtist,
        playerId: r.playerId,
        playerName: r.playerName,
        playerColor: r.playerColor,
        rating: r.rating,
        ratingCount: 1,
      };
      addRateMySongEntry(entryBase);
      addDailyRateMySongEntry(entryBase);

      // Get previous achievement count before update
      const prevStats = getRateMySongPlayerStats(r.playerId);
      const prevAchCount = prevStats.achievements.length;

      // Update player stats
      const updatedStats = updateRateMySongPlayerStats(
        r.playerId,
        r.playerName,
        r.playerColor,
        r.rating,
        result.songTitle,
        songGenre || '',
      );

      addAudienceRatingToStats(r.playerId, 1);

      setPlayerStatsMap(prev => {
        const next = new Map(prev);
        next.set(r.playerId, updatedStats);
        return next;
      });

      // Check for new achievements
      if (updatedStats.achievements.length > prevAchCount) {
        const freshIds = updatedStats.achievements.slice(prevAchCount);
        const freshAchs = freshIds
          .map(id => getAchievementById(id))
          .filter((a): a is Achievement => a !== undefined);
        if (freshAchs.length > 0) {
          setNewAchievementsMap(prev => {
            const next = new Map(prev);
            next.set(r.playerId, freshAchs);
            return next;
          });
        }
      }
    }

    setTopRanking(getRateMySongTopN(5));
    setDailyRanking(getDailyRateMySongTopN(5));

    // Song suggestions
    if (songId) {
      setSongSuggestions(getSongSuggestions(songGenre || '', songId, 3));
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state sync
  }, [result, songId, songGenre]);

  // ── AI critic comment (needed before typewriter effect) ──
  const topRating = result.ratings.length > 0
    ? Math.max(...result.ratings.map(r => r.rating))
    : 5;
  const aiComment = useMemo(() => getAICriticComment(topRating, language), [topRating, language]);

  // ── Animated Score Counter ──
  useEffect(() => {
    const target = result.averageRating;
    const duration = 1500;
    const start = performance.now();

    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayedScore(eased * target);
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [result.averageRating]);

  // ── Confetti Trigger (9.0+) ──
  useEffect(() => {
    if (result.averageRating >= 9.0) {
      const timer = setTimeout(() => setShowConfetti(true), 800);
      return () => clearTimeout(timer);
    }
  }, [result.averageRating]);

  // ── AI-Critic Typewriter Animation ──
  useEffect(() => {
    const fullComment = aiComment;
    if (!fullComment) return;
    setDisplayedComment('');
    setIsTyping(true);
    let idx = 0;
    const interval = setInterval(() => {
      idx++;
      setDisplayedComment(fullComment.slice(0, idx));
      if (idx >= fullComment.length) {
        clearInterval(interval);
        setIsTyping(false);
      }
    }, 30);
    return () => clearInterval(interval);
  }, [aiComment]);

  // ── Dynamic Score Color ──
  const scoreColor = result.averageRating >= 9.0 ? 'text-yellow-300' :
                    result.averageRating >= 7.0 ? 'text-amber-400' :
                    result.averageRating >= 5.0 ? 'text-orange-400' :
                    result.averageRating >= 3.0 ? 'text-red-400' : 'text-gray-400';

  // ── Wall of Fame: top 3 all-time players by best rating ──
  const allTimeRanking = useMemo(() => {
    const bestByPlayer = new Map<string, { playerId: string; playerName: string; bestRating: number }>();
    for (const entry of topRanking) {
      const existing = bestByPlayer.get(entry.playerId);
      if (!existing || entry.rating > existing.bestRating) {
        bestByPlayer.set(entry.playerId, {
          playerId: entry.playerId,
          playerName: entry.playerName,
          bestRating: entry.rating,
        });
      }
    }
    return Array.from(bestByPlayer.values()).sort((a, b) => b.bestRating - a.bestRating);
  }, [topRanking]);

  const wallOfFameEntries = useMemo(() => {
    return allTimeRanking.slice(0, 3);
  }, [allTimeRanking]);

  const categoryLabels: Record<CategoryKey, { icon: string; label: string }> = {
    voice: { icon: '🎤', label: t('rateMySong.voice') },
    stage: { icon: '💃', label: t('rateMySong.stage') },
    rhythm: { icon: '🎵', label: t('rateMySong.rhythm') },
    entertainment: { icon: '🔥', label: t('rateMySong.entertainment') },
  };

  // Helper to get localized achievement text
  const achName = (a: Achievement) => t(`rateMySong.achievements.${a.id}.name`);
  const achDesc = (a: Achievement) => t(`rateMySong.achievements.${a.id}.description`);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-amber-900/10 to-gray-900 text-white p-4 md:p-8 flex items-center justify-center">
      <div className="max-w-lg w-full text-center">
        {/* Series round indicator */}
        {seriesRound && seriesTotalRounds && seriesTotalRounds > 1 && (
          <div className="mb-4 text-sm text-gray-400">
            {t('rateMySong.roundOf').replace('{n}', String(seriesRound)).replace('{m}', String(seriesTotalRounds))}
          </div>
        )}

        <div className="text-6xl mb-4">🏆</div>
        <h1 className="text-3xl font-bold mb-2">{t('rateMySong.ratingComplete')}</h1>
        <p className="text-gray-400 mb-2">{result.songTitle}</p>
        <div className={`text-5xl font-bold ${scoreColor} mb-6 animate-rms-score-reveal`}>
          {displayedScore.toFixed(1)}
          <span className="text-2xl text-gray-400"> / 10</span>
        </div>

        {showConfetti && (
          <div className="fixed inset-0 pointer-events-none z-50">
            {Array.from({ length: 50 }).map((_, i) => (
              <div
                key={i}
                className="absolute animate-rms-confetti-fall"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: '-20px',
                  animationDelay: `${Math.random() * 2}s`,
                  animationDuration: `${2 + Math.random() * 3}s`,
                  width: '8px',
                  height: '8px',
                  borderRadius: Math.random() > 0.5 ? '50%' : '0',
                  backgroundColor: ['#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#22c55e', '#ec4899'][Math.floor(Math.random() * 6)],
                }}
              />
            ))}
          </div>
        )}

        {/* AI Critic Comment */}
        <div className="mb-6 mx-auto max-w-md">
          <div className="relative bg-gray-700/30 rounded-2xl p-4 border border-white/10">
            <div className="text-sm font-semibold text-amber-400 mb-2">{t('rateMySong.aiCritic')}</div>
            <p className="text-white/80 italic text-sm">
              &ldquo;{displayedComment}&rdquo;
              {isTyping && <span className="inline-block w-0.5 h-4 bg-white/60 ml-0.5 animate-pulse" />}
            </p>
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-gray-700/30 border-b border-r border-white/10 rotate-45" />
          </div>
        </div>

        {/* Individual Ratings */}
        <div className="space-y-3 mb-6 text-left">
          {result.ratings.map((r, i) => {
            const emoji = r.rating >= 9 ? '🌟' : r.rating >= 7 ? '⭐' : r.rating >= 5 ? '👍' : r.rating >= 3 ? '😐' : '💔';
            const stats = playerStatsMap.get(r.playerId);
            const avgRating = stats && stats.totalPerformances > 0
              ? stats.totalRatingSum / stats.totalPerformances
              : 0;
            const rankResult = stats ? getPlayerRank(stats) : null;

            return (
              <div key={r.playerId} className="p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-center gap-4">
                  <div className="text-2xl">{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</div>
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
                    style={{ backgroundColor: r.playerColor }}
                  >
                    {r.playerName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{r.playerName}</div>
                    {rankResult && (
                      <div className="text-xs text-gray-400 mt-0.5">
                        {t(`rateMySong.ranks.${rankResult.rank}`)} · {t('rateMySong.performances')}: {stats?.totalPerformances || 0} · {t('rateMySong.avgRating')}: {avgRating.toFixed(1)}
                      </div>
                    )}
                    {/* Challenge result */}
                    {challengesEnabled && r.challengeMastered !== undefined && (
                      <div className={`text-xs mt-0.5 ${r.challengeMastered ? 'text-green-400' : 'text-red-400'}`}>
                        {r.challengeMastered ? `✅ ${t('rateMySong.challengeMastered')}` : `❌ ${t('rateMySong.challengeFailed')}`}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-bold text-amber-400">{r.rating.toFixed(1)}</span>
                    <span className="text-lg ml-1">{emoji}</span>
                  </div>
                </div>

                {/* Rank progress bar */}
                {rankResult && rankResult.progress < 1 && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-[10px] text-gray-500 mb-0.5">
                      <span>{t(`rateMySong.ranks.${rankResult.rank}`)}</span>
                      <span>{rankResult.nextRank ? t(`rateMySong.ranks.${rankResult.nextRank}`) : ''}</span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all"
                        style={{ width: `${rankResult.progress * 100}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Category breakdown */}
                {categoriesEnabled && r.categories && (
                  <div className="mt-3 pt-3 border-t border-white/10">
                    <div className="grid grid-cols-2 gap-2">
                      {CATEGORY_KEYS.map(cat => {
                        const catLabel = categoryLabels[cat];
                        const value = r.categories![cat];
                        return (
                          <div key={cat} className="flex items-center justify-between text-xs">
                            <span className="text-gray-400">{catLabel.icon} {catLabel.label}</span>
                            <span className="font-medium">{value.toFixed(1)}</span>
                          </div>
                        );
                      })}
                    </div>
                    {/* Category bars visualization */}
                    <div className="mt-2 flex gap-1 h-2 rounded-full overflow-hidden bg-gray-700">
                      {CATEGORY_KEYS.map(cat => (
                        <div
                          key={cat}
                          className="bg-amber-400 rounded-full"
                          style={{ width: `${r.categories![cat] * 10}%` }}
                          title={`${categoryLabels[cat].label}: ${r.categories![cat].toFixed(1)}`}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Best / Worst Genre Display */}
        {songGenre && (
          <div className="bg-white/5 border border-white/10 rounded-lg p-4 mb-4">
            <h3 className="font-bold text-sm mb-2 text-purple-400">{t('rateMySong.genreStats')}</h3>
            {Object.entries(playerStatsMap).map(([playerId, stats]) => {
              if (!stats?.genresPerformed || Object.keys(stats.genresPerformed).length === 0) return null;
              const genres = Object.entries(stats.genresPerformed) as [string, number][];
              const sorted = genres.sort((a, b) => b[1] - a[1]);
              const best = sorted[0];
              const worst = sorted[sorted.length - 1];
              return (
                <div key={playerId} className="text-sm text-white/70">
                  <span className="font-medium text-white/90">{stats.playerName}:</span>{' '}
                  Best: <span className="text-green-400">{best[0]}</span> ({best[1]}x) |{' '}
                  Worst: <span className="text-red-400">{worst[0]}</span> ({worst[1]}x)
                </div>
              );
            })}
          </div>
        )}

        {/* New Achievements */}
        {newAchievementsMap.size > 0 && (
          <div className="mb-6 text-left">
            <h3 className="text-lg font-semibold mb-3 text-center">🎉 {t('rateMySong.newAchievement')}</h3>
            <div className="space-y-2">
              {Array.from(newAchievementsMap.entries()).map(([playerId, achs]) => (
                achs.map(ach => (
                  <div key={`${playerId}-${ach.id}`} className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 animate-rms-achievement-pop">
                    <span className="text-2xl">{ach.icon}</span>
                    <div>
                      <div className="font-medium text-sm text-amber-300">{achName(ach)}</div>
                      <div className="text-xs text-gray-400">{achDesc(ach)}</div>
                    </div>
                  </div>
                ))
              ))}
            </div>
          </div>
        )}

        {/* Song Suggestions */}
        {songSuggestions.length > 0 && (
          <div className="mb-6 text-left">
            <h3 className="text-lg font-semibold mb-3 text-center">🎵 {t('rateMySong.songSuggestions')}</h3>
            <div className="space-y-2">
              {songSuggestions.map(song => (
                <div key={song.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                  <span className="text-sm">🎵</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{song.title}</div>
                    <div className="text-xs text-gray-400 truncate">{song.artist}</div>
                  </div>
                  {song.genre && song.genre !== 'Unknown' && (
                    <span className="text-[10px] text-gray-500 bg-gray-700/50 px-1.5 py-0.5 rounded">{song.genre}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Highscore Leaderboard */}
        {(topRanking.length > 0 || dailyRanking.length > 0) && (
          <div className="mb-8 text-left">
            <div className="flex gap-2 mb-4 justify-center">
              <button
                onClick={() => setActiveTab('daily')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'daily'
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                    : 'bg-white/5 text-gray-400 border border-transparent hover:bg-white/10'
                }`}
              >
                {t('rateMySong.dailyHighscore')}
              </button>
              <button
                onClick={() => setActiveTab('alltime')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'alltime'
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                    : 'bg-white/5 text-gray-400 border border-transparent hover:bg-white/10'
                }`}
              >
                {t('rateMySong.allTimeHighscore')}
              </button>
            </div>

            {activeTab === 'daily' && (
              <>
                {dailyRanking.length > 0 ? (
                  <div className="space-y-2">
                    {dailyRanking.map((entry, i) => (
                      <div key={entry.id} className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
                        <span className="text-lg w-6 text-center">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}</span>
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                          style={{ backgroundColor: entry.playerColor }}
                        >
                          {entry.playerName.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{entry.playerName}</div>
                          <div className="text-[11px] text-gray-400 truncate">{entry.songTitle}</div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-sm font-bold text-amber-400">{entry.rating.toFixed(1)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-500 text-sm py-4">{t('rateMySong.noDailyRatings')}</p>
                )}
                <p className="text-[10px] text-gray-500 text-center mt-2">{t('rateMySong.dailyLeaderboardNote')}</p>
              </>
            )}

            {activeTab === 'alltime' && (
              <>
                {topRanking.length > 0 ? (
                  <div className="space-y-2">
                    {topRanking.map((entry, i) => {
                      const score = entry.rating * Math.log2(entry.ratingCount + 1);
                      return (
                        <div key={entry.id} className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
                          <span className="text-lg w-6 text-center">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}</span>
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                            style={{ backgroundColor: entry.playerColor }}
                          >
                            {entry.playerName.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">{entry.playerName}</div>
                            <div className="text-[11px] text-gray-400 truncate">{entry.songTitle}</div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="text-sm font-bold text-amber-400">{entry.rating.toFixed(1)}</div>
                            <div className="text-[10px] text-gray-500">Score: {score.toFixed(1)}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-center text-gray-500 text-sm py-4">{t('rateMySong.noAllTimeRatings')}</p>
                )}
                <p className="text-[10px] text-gray-500 text-center mt-2">{t('rateMySong.scoreFormula')}</p>
              </>
            )}
          </div>
        )}

        {/* Wall of Fame */}
        {wallOfFameEntries.length > 0 && (
          <div className="bg-gradient-to-br from-amber-900/20 to-purple-900/20 border border-amber-500/30 rounded-lg p-4 mb-6">
            <h3 className="font-bold text-sm mb-3 text-amber-400">🏆 {t('rateMySong.wallOfFame')}</h3>
            <div className="flex justify-center gap-6">
              {wallOfFameEntries.map((entry, idx) => (
                <div key={entry.playerId} className="text-center">
                  <div className="text-2xl mb-1">{idx === 0 ? '\u{1F947}' : idx === 1 ? '\u{1F948}' : '\u{1F949}'}</div>
                  <div className="text-sm font-medium text-white">{entry.playerName}</div>
                  <div className="text-xs text-amber-400">{entry.bestRating.toFixed(1)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onPlayAgain}
            className="flex-1 py-3 rounded-xl font-medium bg-purple-600 text-white hover:bg-purple-500 transition-all"
          >
            {t('rateMySong.playAgain')}
          </button>
          <button
            onClick={onEnd}
            className="flex-1 py-3 rounded-xl font-medium bg-gray-700/50 text-gray-300 hover:bg-gray-600/50 transition-all"
          >
            {t('rateMySong.backToMenu')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ===================== SERIES RESULTS SCREEN =====================

export function RateMySongSeriesResultsScreen({ seriesHistory, onEnd }: RateMySongSeriesResultsScreenProps) {
  const { t } = useTranslation();

  // Calculate cumulative scores per player
  const cumulativeScores = useMemo(() => {
    const scores: Record<string, { name: string; color: string; total: number; rounds: number[] }> = {};
    for (let roundIdx = 0; roundIdx < seriesHistory.length; roundIdx++) {
      const round = seriesHistory[roundIdx];
      for (const rating of round) {
        if (!scores[rating.playerId]) {
          scores[rating.playerId] = { name: rating.playerName, color: rating.playerColor, total: 0, rounds: [] };
        }
        scores[rating.playerId].total += rating.rating;
        scores[rating.playerId].rounds.push(rating.rating);
      }
    }
    return scores;
  }, [seriesHistory]);

  // Find winner
  const sortedPlayers = useMemo(() => {
    return Object.entries(cumulativeScores)
      .map(([id, data]) => ({ id, ...data, avg: data.total / data.rounds.length }))
      .sort((a, b) => b.total - a.total);
  }, [cumulativeScores]);

  const winner = sortedPlayers[0];

  // "Song des Abends" — best single rating across all rounds
  const bestSinglePerformance = useMemo(() => {
    let best: { rating: RateMySongRating; round: number } | null = null;
    for (let i = 0; i < seriesHistory.length; i++) {
      for (const r of seriesHistory[i]) {
        if (!best || r.rating > best.rating.rating) {
          best = { rating: r, round: i + 1 };
        }
      }
    }
    return best;
  }, [seriesHistory]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-amber-900/20 to-gray-900 text-white p-4 md:p-8 flex items-center justify-center">
      <div className="max-w-lg w-full text-center">
        <div className="text-6xl mb-4 animate-rms-score-reveal">👑</div>
        <h1 className="text-3xl font-bold mb-2">{t('rateMySong.seriesWinner')}</h1>
        {winner && (
          <div className="mb-6">
            <div
              className="w-16 h-16 rounded-full mx-auto flex items-center justify-center text-2xl font-bold mb-2"
              style={{ backgroundColor: winner.color }}
            >
              {winner.name.charAt(0).toUpperCase()}
            </div>
            <div className="text-xl font-bold">{winner.name}</div>
            <div className="text-3xl font-bold text-amber-400">{winner.total.toFixed(1)}</div>
            <div className="text-sm text-gray-400">{t('rateMySong.totalScore')}</div>
          </div>
        )}

        {/* Round History */}
        <div className="mb-6 text-left">
          <h3 className="text-lg font-semibold mb-3">{t('rateMySong.roundHistory')}</h3>
          <div className="space-y-3">
            {seriesHistory.map((round, roundIdx) => (
              <div key={roundIdx} className="p-3 rounded-xl bg-white/5 border border-white/10">
                <div className="text-xs text-gray-400 mb-2">
                  {t('rateMySong.roundOf').replace('{n}', String(roundIdx + 1)).replace('{m}', String(seriesHistory.length))}
                </div>
                <div className="space-y-1">
                  {round.map(r => {
                    const rank = round.slice().sort((a, b) => b.rating - a.rating).findIndex(x => x.playerId === r.playerId);
                    const medal = rank === 0 ? '🥇' : rank === 1 ? '🥈' : '🥉';
                    return (
                      <div key={r.playerId} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span>{round.length > 1 ? medal : '⭐'}</span>
                          <div
                            className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                            style={{ backgroundColor: r.playerColor }}
                          >
                            {r.playerName.charAt(0).toUpperCase()}
                          </div>
                          <span>{r.playerName}</span>
                          {r.challengeMastered !== undefined && (
                            <span className={r.challengeMastered ? 'text-green-400' : 'text-red-400'}>
                              {r.challengeMastered ? '✅' : '❌'}
                            </span>
                          )}
                        </div>
                        <span className="font-bold text-amber-400">{r.rating.toFixed(1)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Cumulative Leaderboard */}
        <div className="mb-6 text-left">
          <h3 className="text-lg font-semibold mb-3">{t('rateMySong.cumulativeScore')}</h3>
          <div className="space-y-2">
            {sortedPlayers.map((p, i) => (
              <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                <span className="text-lg w-6 text-center">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}</span>
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ backgroundColor: p.color }}
                >
                  {p.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-sm">{p.name}</div>
                  <div className="text-[11px] text-gray-400">Ø {p.avg.toFixed(1)} / {p.rounds.length} {t('rateMySong.rounds')}</div>
                </div>
                <div className="text-lg font-bold text-amber-400">{p.total.toFixed(1)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Awards */}
        <div className="mb-6 text-left">
          <h3 className="text-lg font-semibold mb-3">{t('rateMySong.awards')}</h3>
          <div className="space-y-2">
            {/* Best Performance */}
            {bestSinglePerformance && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
                <div className="text-xs text-amber-400 font-semibold">{t('rateMySong.awardBestPerformance')}</div>
                <div className="flex items-center gap-2 mt-1">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
                    style={{ backgroundColor: bestSinglePerformance.rating.playerColor }}
                  >
                    {bestSinglePerformance.rating.playerName.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-medium">{bestSinglePerformance.rating.playerName}</span>
                  <span className="text-sm text-amber-400 font-bold ml-auto">{bestSinglePerformance.rating.rating.toFixed(1)}</span>
                </div>
              </div>
            )}
            {/* Funniest Moment */}
            {/* TODO: Implement real "Funniest Moment" based on audience reactions or ratings */}
            <div className="p-3 rounded-xl bg-pink-500/10 border border-pink-500/30">
              <div className="text-xs text-pink-400 font-semibold">{t('rateMySong.awardFunniest')}</div>
              <div className="text-sm text-gray-300 mt-1">🎉 {winner?.name || t('rateMySong.voteSongOfEvening')}</div>
            </div>
            {/* Biggest Surprise */}
            {/* TODO: Implement real "Biggest Surprise" based on score deviation from expected */}
            <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/30">
              <div className="text-xs text-purple-400 font-semibold">{t('rateMySong.awardBiggestSurprise')}</div>
              <div className="text-sm text-gray-300 mt-1">🎊 {t('rateMySong.songOfTheEvening')}</div>
            </div>
          </div>
        </div>

        <button
          onClick={onEnd}
          className="w-full py-4 rounded-xl font-bold bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-400 hover:to-orange-400 transition-all shadow-lg"
        >
          {t('rateMySong.backToMenu')}
        </button>
      </div>
    </div>
  );
}
