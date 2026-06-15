/**
 * Rate my Song — Rating Screen
 */

'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useTranslation } from '@/lib/i18n/translations';
import type { RateMySongRating } from './rate-my-song-types';
import type { RateMySongRatingScreenProps } from './rate-my-song-types';
import { CATEGORY_WEIGHTS, CATEGORY_KEYS, type CategoryKey, calcWeightedTotal } from './rate-my-song-types';

// ===================== RATING SCREEN =====================
// TODO: Implement duel/duet-specific rating UI and scoring logic

export function RateMySongRatingScreen({
  songTitle,
  songArtist,
  singingPlayers,
  allProfiles,
  categoriesEnabled = false,
  anonymousRating = false,
  challengesEnabled = false,
  bettingEnabled = false,
  currentChallenge = null,
  onSubmit,
  onBack,
}: RateMySongRatingScreenProps) {
  const { t, language } = useTranslation();
  const audienceProfiles = useMemo(() => {
    const singerIds = new Set(singingPlayers.map(p => p.id));
    return allProfiles.filter(p => p.isActive !== false && !singerIds.has(p.id));
  }, [allProfiles, singingPlayers]);

  // Single rating mode (when categories OFF)
  const [audienceRatings, setAudienceRatings] = useState<Record<string, Record<string, number>>>(() => {
    const init: Record<string, Record<string, number>> = {};
    for (const singer of singingPlayers) {
      init[singer.id] = {};
      for (const audience of audienceProfiles) {
        init[singer.id][audience.id] = 5.0;
      }
    }
    if (audienceProfiles.length === 0) {
      for (const singer of singingPlayers) {
        init[singer.id] = { '__host__': 5.0 };
      }
    }
    return init;
  });

  // Category ratings mode (when categories ON)
  const [categoryRatings, setCategoryRatings] = useState<Record<string, Record<string, Record<CategoryKey, number>>>>(() => {
    const init: Record<string, Record<string, Record<CategoryKey, number>>> = {};
    for (const singer of singingPlayers) {
      init[singer.id] = {};
      for (const audience of audienceProfiles) {
        init[singer.id][audience.id] = { voice: 5, stage: 5, rhythm: 5, entertainment: 5 };
      }
    }
    if (audienceProfiles.length === 0) {
      for (const singer of singingPlayers) {
        init[singer.id] = { '__host__': { voice: 5, stage: 5, rhythm: 5, entertainment: 5 } };
      }
    }
    return init;
  });

  // Challenge mastery
  const [challengeMastery, setChallengeMastery] = useState<Record<string, boolean>>({});

  const [currentAudienceIdx, setCurrentAudienceIdx] = useState(0);

  // Live Reactions
  const [floatingEmojis, setFloatingEmojis] = useState<{ id: number; emoji: string; x: number }[]>([]);
  const [hypeLevel, setHypeLevel] = useState(0);

  // Spectator Betting
  const [betRange, setBetRange] = useState<string | null>(null);

  const updateRating = (singerId: string, audienceId: string, rating: number) => {
    setAudienceRatings(prev => ({
      ...prev,
      [singerId]: { ...prev[singerId], [audienceId]: rating },
    }));
  };

  const updateCategoryRating = (singerId: string, audienceId: string, cat: CategoryKey, value: number) => {
    setCategoryRatings(prev => ({
      ...prev,
      [singerId]: {
        ...prev[singerId],
        [audienceId]: { ...prev[singerId]?.[audienceId], [cat]: value },
      },
    }));
  };

  // Calculate average rating per singer (single mode)
  const getAverageForSinger = (singerId: string): number => {
    const singerRatings = audienceRatings[singerId];
    if (!singerRatings) return 5.0;
    const values = Object.values(singerRatings);
    if (values.length === 0) return 5.0;
    return values.reduce((sum, v) => sum + v, 0) / values.length;
  };

  // Calculate category averages for a singer
  const getCategoryAverage = (singerId: string): { voice: number; stage: number; rhythm: number; entertainment: number } | null => {
    const singerCats = categoryRatings[singerId];
    if (!singerCats) return null;
    const entries = Object.values(singerCats);
    if (entries.length === 0) return null;
    const avg = { voice: 5, stage: 5, rhythm: 5, entertainment: 5 };
    for (const entry of entries) {
      avg.voice += entry.voice;
      avg.stage += entry.stage;
      avg.rhythm += entry.rhythm;
      avg.entertainment += entry.entertainment;
    }
    avg.voice /= entries.length;
    avg.stage /= entries.length;
    avg.rhythm /= entries.length;
    avg.entertainment /= entries.length;
    return avg;
  };

  // Reaction handler
  const handleReaction = useCallback((emoji: string) => {
    const id = Date.now();
    const x = 20 + Math.random() * 60;
    setFloatingEmojis(prev => [...prev, { id, emoji, x }]);
    setHypeLevel(prev => Math.min(prev + 0.15, 1.5));
    setTimeout(() => {
      setFloatingEmojis(prev => prev.filter(e => e.id !== id));
    }, 2000);
  }, []);

  // Hype decay
  useEffect(() => {
    const interval = setInterval(() => {
      setHypeLevel(prev => Math.max(prev - 0.02, 0));
    }, 200);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = () => {
    const ratings: RateMySongRating[] = singingPlayers.map(singer => {
      const singerId = singer.id;
      if (categoriesEnabled) {
        const cats = getCategoryAverage(singerId);
        return {
          playerId: singerId,
          playerName: singer.name,
          playerColor: singer.color,
          rating: cats ? calcWeightedTotal(cats) : 5.0,
          categories: cats || undefined,
          challengeMastered: challengesEnabled ? challengeMastery[singerId] : undefined,
          betPoints: betRange ? (
            getAverageForSinger(singerId) < 5.0 && betRange === 'under' ? 1 :
            getAverageForSinger(singerId) >= 5.0 && getAverageForSinger(singerId) <= 7.0 && betRange === 'mid' ? 1 :
            getAverageForSinger(singerId) > 7.0 && betRange === 'over' ? 1 : 0
          ) : undefined,
        };
      }
      return {
        playerId: singerId,
        playerName: singer.name,
        playerColor: singer.color,
        rating: getAverageForSinger(singerId),
        challengeMastered: challengesEnabled ? challengeMastery[singerId] : undefined,
        betPoints: betRange ? (
          getAverageForSinger(singerId) < 5.0 && betRange === 'under' ? 1 :
          getAverageForSinger(singerId) >= 5.0 && getAverageForSinger(singerId) <= 7.0 && betRange === 'mid' ? 1 :
          getAverageForSinger(singerId) > 7.0 && betRange === 'over' ? 1 : 0
        ) : undefined,
      };
    });
    onSubmit(ratings);
  };

  const hasAudience = audienceProfiles.length > 0;

  const categoryLabels: Record<CategoryKey, { icon: string; label: string }> = {
    voice: { icon: '🎤', label: t('rateMySong.voice') },
    stage: { icon: '💃', label: t('rateMySong.stage') },
    rhythm: { icon: '🎵', label: t('rateMySong.rhythm') },
    entertainment: { icon: '🔥', label: t('rateMySong.entertainment') },
  };

  // Get localized challenge title/description
  const challengeTitle = currentChallenge
    ? t(`rateMySong.challenges.${currentChallenge.id}.title`)
    : '';
  const challengeDesc = currentChallenge
    ? t(`rateMySong.challenges.${currentChallenge.id}.description`)
    : '';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 text-white p-4 md:p-8 flex items-center justify-center">
      <div className="max-w-lg w-full">
        {/* Song Info */}
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">⭐</div>
          <h1 className="text-2xl font-bold">{songTitle}</h1>
          <p className="text-gray-400">{songArtist}</p>
          <p className="text-purple-400 text-sm mt-2">
            {hasAudience
              ? t('rateMySong.ratingByAudience').replace('{n}', String(audienceProfiles.length))
              : t('rateMySong.pleaseRate')}
          </p>
        </div>

        {/* Challenge Display */}
        {challengesEnabled && currentChallenge && (
          <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30">
            <div className="text-sm font-semibold text-amber-400 mb-1">{t('rateMySong.currentChallenge')}</div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">{currentChallenge.icon}</span>
              <div>
                <div className="font-medium">{challengeTitle}</div>
                <div className="text-xs text-gray-300">{challengeDesc}</div>
              </div>
            </div>
          </div>
        )}

        {/* Audience member selector */}
        {hasAudience && (
          <>
            <div className="flex items-center justify-center gap-2 mb-4">
              {audienceProfiles.map((audience, i) => (
                <button
                  key={audience.id}
                  onClick={() => setCurrentAudienceIdx(i)}
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                    i === currentAudienceIdx
                      ? 'ring-2 ring-amber-400 scale-110'
                      : 'opacity-50 hover:opacity-80'
                  }`}
                  style={{ backgroundColor: audience.color }}
                  title={anonymousRating ? undefined : audience.name}
                >
                  {anonymousRating ? `${i + 1}` : (audience.name?.[0]?.toUpperCase() || '?')}
                </button>
              ))}
            </div>
            <p className="text-center text-gray-400 text-sm mb-4">
              {anonymousRating
                ? t('rateMySong.ratedAs').replace('{n}', `${currentAudienceIdx + 1}`)
                : t('rateMySong.ratedAs').replace('{n}', audienceProfiles[currentAudienceIdx]?.name || '')}
            </p>
          </>
        )}

        {/* Live Reactions & Hype Meter */}
        {!anonymousRating && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-white/70 mb-3">{t('rateMySong.liveReactions')}</h3>

            {/* Emoji reaction buttons */}
            <div className="flex gap-3 mb-4 justify-center">
              {['🔥', '😍', '🎉', '👏', '💀'].map(emoji => (
                <button
                  key={emoji}
                  onClick={() => handleReaction(emoji)}
                  className="text-3xl hover:scale-125 active:scale-90 transition-transform"
                >
                  {emoji}
                </button>
              ))}
            </div>

            {/* Floating emojis animation */}
            <div className="relative h-16 overflow-hidden">
              {floatingEmojis.map((fe) => (
                <span
                  key={`${fe.id}`}
                  className="absolute animate-rms-float-emoji text-2xl pointer-events-none"
                  style={{ left: `${fe.x}%`, animationDuration: '2s' }}
                >
                  {fe.emoji}
                </span>
              ))}
            </div>

            {/* Hype Meter bar */}
            <div className="mt-2">
              <div className="flex justify-between text-xs text-white/50 mb-1">
                <span>{t('rateMySong.hypeMeter')}</span>
                <span>{Math.round(hypeLevel * 100)}%</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    hypeLevel >= 1.0 ? 'bg-gradient-to-r from-yellow-400 via-red-500 to-purple-500 animate-rms-hype-pulse' :
                    hypeLevel >= 0.7 ? 'bg-gradient-to-r from-orange-400 to-red-500' :
                    hypeLevel >= 0.4 ? 'bg-gradient-to-r from-yellow-400 to-orange-400' :
                    'bg-gradient-to-r from-green-400 to-yellow-400'
                  }`}
                  style={{ width: `${Math.min(hypeLevel * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Spectator Betting */}
        {bettingEnabled && (
          <div className="mb-6 bg-white/5 border border-white/10 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-amber-400 mb-3">🎯 {t('rateMySong.placeBet')}</h3>
            <p className="text-xs text-white/50 mb-3">{t('rateMySong.predictScore')}</p>
            <div className="flex gap-3">
              {[
                { label: t('rateMySong.underFive'), range: 'under', max: 5.0 },
                { label: '5.0 - 7.0', range: 'mid', max: 7.0 },
                { label: t('rateMySong.overSeven'), range: 'over', max: 10.0 },
              ].map(opt => (
                <button
                  key={opt.range}
                  onClick={() => setBetRange(opt.range)}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                    betRange === opt.range
                      ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30'
                      : 'bg-white/10 text-white/70 hover:bg-white/15'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Rating sliders — per singer, for the selected audience member */}
        <div className="space-y-6 mb-6">
          {singingPlayers.map((singer) => {
            const currentAudience = hasAudience ? audienceProfiles[currentAudienceIdx] : null;
            const audienceId = currentAudience?.id ?? '__host__';

            if (categoriesEnabled) {
              // Category mode: 4 sliders per singer
              const currentCats = categoryRatings[singer.id]?.[audienceId] || { voice: 5, stage: 5, rhythm: 5, entertainment: 5 };
              const avgCats = getCategoryAverage(singer.id);
              const weightedTotal = avgCats ? calcWeightedTotal(avgCats) : 5;

              return (
                <div key={singer.id} className="bg-gray-700/30 rounded-xl p-4 border border-white/10">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                        style={{ backgroundColor: singer.color }}
                      >
                        {singer.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium">{singer.name}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-400">{t('rateMySong.categoriesWeighted')}</div>
                      <div className="text-xl font-bold text-amber-400">{weightedTotal.toFixed(1)}</div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {CATEGORY_KEYS.map(cat => {
                      const catLabel = categoryLabels[cat];
                      return (
                        <div key={cat}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-gray-300">{catLabel.icon} {catLabel.label} ({Math.round(CATEGORY_WEIGHTS[cat] * 100)}%)</span>
                            <span className="text-xs font-medium text-amber-300">{currentCats[cat].toFixed(1)}</span>
                          </div>
                          <input
                            type="range"
                            min="1" max="10" step="0.1"
                            value={currentCats[cat]}
                            onChange={(e) => updateCategoryRating(singer.id, audienceId, cat, parseFloat(e.target.value))}
                            className="w-full accent-amber-400 h-1.5"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            }

            // Single slider mode
            const currentRating = audienceRatings[singer.id]?.[audienceId] ?? 5.0;
            const avgRating = getAverageForSinger(singer.id);

            return (
              <div key={singer.id} className="bg-gray-700/30 rounded-xl p-4 border border-white/10">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                      style={{ backgroundColor: singer.color }}
                    >
                      {singer.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium">{singer.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {hasAudience && <div className="text-xs text-gray-400">Ø {avgRating.toFixed(1)}</div>}
                    <div className="text-2xl font-bold text-amber-400">{currentRating.toFixed(1)}</div>
                  </div>
                </div>
                <input
                  type="range" min="1" max="10" step="0.1"
                  value={currentRating}
                  onChange={(e) => updateRating(singer.id, audienceId, parseFloat(e.target.value))}
                  className="w-full accent-amber-400 h-2"
                />
                <div className="flex justify-between text-xs text-white/30 mt-1">
                  <span>1.0</span><span>5.0</span><span>10.0</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Challenge Mastery Check */}
        {challengesEnabled && currentChallenge && (
          <div className="mb-6 p-3 rounded-xl bg-gray-700/30 border border-white/10">
            <p className="text-sm font-medium mb-3">{t('rateMySong.didMasterChallenge')}</p>
            <div className="space-y-2">
              {singingPlayers.map(singer => (
                <div key={singer.id} className="flex items-center gap-3">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{ backgroundColor: singer.color }}
                  >
                    {singer.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm flex-1">{singer.name}</span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setChallengeMastery(prev => ({ ...prev, [singer.id]: true }))}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                        challengeMastery[singer.id] === true
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-600/50 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      {t('rateMySong.yes')}
                    </button>
                    <button
                      onClick={() => setChallengeMastery(prev => ({ ...prev, [singer.id]: false }))}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                        challengeMastery[singer.id] === false
                          ? 'bg-red-500 text-white'
                          : 'bg-gray-600/50 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      {t('rateMySong.no')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Overall Average */}
        {singingPlayers.length > 1 && (
          <div className="text-center mb-6 bg-purple-500/10 rounded-xl p-3 border border-purple-500/20">
            <span className="text-purple-300 font-medium">{t('rateMySong.overallAverage').replace('{n}', '')} </span>
            <span className="text-xl font-bold text-white">
              {categoriesEnabled
                ? (singingPlayers.reduce((sum, s) => {
                    const cats = getCategoryAverage(s.id);
                    return sum + (cats ? calcWeightedTotal(cats) : 5);
                  }, 0) / singingPlayers.length).toFixed(1)
                : (singingPlayers.reduce((sum, s) => sum + getAverageForSinger(s.id), 0) / singingPlayers.length).toFixed(1)
              }
            </span>
            <span className="text-purple-300"> / 10</span>
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onBack}
            className="flex-1 py-3 rounded-xl font-medium bg-gray-700/50 text-gray-300 hover:bg-gray-600/50 transition-all"
          >
            {t('rateMySong.backBtn')}
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 py-3 rounded-xl font-bold bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-400 hover:to-orange-400 transition-all shadow-lg"
          >
            {t('rateMySong.saveRating')}
          </button>
        </div>
      </div>
    </div>
  );
}
