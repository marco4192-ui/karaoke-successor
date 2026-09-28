'use client';

// Daily Challenge Screen — TAB: Leaderboard (local + online)

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from '@/lib/i18n/translations';
import { DAILY_DIFFICULTIES, getDailyType } from '@/lib/game/daily-challenge';
import { formatDailyValue, metricLabel, TIER_LABEL_KEYS } from './helpers';
import type { DailyChallengeScreenData } from './use-daily-challenge-data';

interface LeaderboardTabProps {
  data: DailyChallengeScreenData;
}

export function LeaderboardTab({ data }: LeaderboardTabProps) {
  const { t } = useTranslation();
  const {
    boardSource,
    setBoardSource,
    loadOnlineBoard,
    sortedLeaderboard,
    challenge,
    typeDef,
    sortMetric,
    onlineEntries,
    onlineLoading,
    onlineError,
  } = data;

  return (
    <Card className="bg-white/5 border-white/10 mb-6">
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center justify-between gap-3">
          <span>{t('dailyChallengeScreen.todayLeaderboard')}</span>
          {/* Local / Online switch */}
          <div className="flex gap-1 bg-white/5 rounded-lg p-1 border border-white/10">
            <button
              onClick={() => setBoardSource('local')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                boardSource === 'local' ? 'bg-cyan-500 text-white' : 'text-white/60 hover:text-white'
              }`}
            >
              {t('dailyChallengeScreen.localBoard')}
            </button>
            <button
              onClick={() => { setBoardSource('online'); loadOnlineBoard(); }}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                boardSource === 'online' ? 'bg-cyan-500 text-white' : 'text-white/60 hover:text-white'
              }`}
            >
              🌐 {t('dailyChallengeScreen.onlineBoard')}
            </button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {boardSource === 'local' ? (
          <>
            {sortedLeaderboard.length === 0 ? (
              <div className="text-center py-8 text-white/40">
                <div className="text-4xl mb-2">🎯</div>
                <p>{t('dailyChallengeScreen.noLeaderboardEntries')}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {sortedLeaderboard.slice(0, 10).map((entry, idx) => (
                  <div
                    key={entry.playerId}
                    className={`flex items-center gap-3 p-3 rounded-lg ${
                      idx === 0 ? 'bg-amber-500/20 border border-amber-500/30' :
                      idx === 1 ? 'bg-gray-400/20 border border-gray-400/30' :
                      idx === 2 ? 'bg-orange-700/20 border border-orange-700/30' :
                      'bg-white/5'
                    }`}
                  >
                    <div className="text-xl font-bold w-8">
                      {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                    </div>
                    {entry.playerAvatar ? (
                      <img src={entry.playerAvatar} alt={entry.playerName} className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                        style={{ backgroundColor: entry.playerColor }}
                      >
                        {entry.playerName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="font-medium flex items-center gap-2">
                        {entry.playerName}
                        {entry.dailyBadge && (
                          <span title={t(TIER_LABEL_KEYS[entry.dailyBadge])} aria-label={t(TIER_LABEL_KEYS[entry.dailyBadge])}>
                            {entry.dailyBadge === 'gold' ? '🥇' : entry.dailyBadge === 'silver' ? '🥈' : '🥉'}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-white/60">
                        {t('dailyChallengeScreen.slotsCompletedLabel').replace('{n}', String(entry.slotsCompletedToday ?? 0))}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-lg flex items-center gap-2 justify-end">
                        {formatDailyValue(typeDef.metricKey, sortMetric(entry))}
                        {entry.difficulty && DAILY_DIFFICULTIES.some(d => d.id === entry.difficulty) && (
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded border border-white/15 text-white/60"
                            title={t(DAILY_DIFFICULTIES.find(d => d.id === entry.difficulty)!.labelKey)}
                          >
                            {DAILY_DIFFICULTIES.find(d => d.id === entry.difficulty)!.icon}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-white/40">{metricLabel(challenge.type, t)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 text-center text-sm text-white/40">
              {challenge.totalParticipants} {challenge.totalParticipants !== 1 ? t('dailyChallengeScreen.participants') : t('dailyChallengeScreen.participant')} {t('dailyChallengeScreen.dayStreak').toLowerCase()}
            </div>
          </>
        ) : (
          /* ── Online daily leaderboard ── */
          <>
            {onlineLoading && (
              <div className="text-center py-8 text-white/50">
                <div className="animate-spin inline-block w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full mb-3" />
                <p className="text-sm">{t('dailyChallengeScreen.onlineBoardLoading')}</p>
              </div>
            )}
            {!onlineLoading && onlineError && (
              <div className="text-center py-8">
                <div className="text-4xl mb-2">📡</div>
                <p className="text-sm text-amber-400/90 mb-3">{t('dailyChallengeScreen.onlineBoardUnavailable')}</p>
                <p className="text-xs text-white/40 mb-4">{onlineError}</p>
                <Button size="sm" variant="outline" className="border-white/20" onClick={loadOnlineBoard}>
                  {t('dailyChallengeScreen.onlineBoardRefresh')}
                </Button>
              </div>
            )}
            {!onlineLoading && !onlineError && onlineEntries && onlineEntries.length === 0 && (
              <div className="text-center py-8 text-white/40">
                <div className="text-4xl mb-2">🌐</div>
                <p>{t('dailyChallengeScreen.onlineBoardEmpty')}</p>
              </div>
            )}
            {!onlineLoading && !onlineError && onlineEntries && onlineEntries.length > 0 && (
              <div className="space-y-2">
                {onlineEntries.map((entry) => (
                  <div
                    key={entry.profile_uid}
                    className={`flex items-center gap-3 p-3 rounded-lg ${
                      entry.rank === 1 ? 'bg-amber-500/20 border border-amber-500/30' :
                      entry.rank === 2 ? 'bg-gray-400/20 border border-gray-400/30' :
                      entry.rank === 3 ? 'bg-orange-700/20 border border-orange-700/30' :
                      'bg-white/5'
                    }`}
                  >
                    <div className="text-xl font-bold w-8">
                      {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : `#${entry.rank}`}
                    </div>
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                      style={{ backgroundColor: entry.color || '#8B5CF6' }}
                    >
                      {entry.display_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{entry.display_name}</div>
                      <div className="text-xs text-white/60">{metricLabel(entry.challenge_type, t)}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-lg flex items-center gap-2 justify-end">
                        {formatDailyValue(getDailyType(entry.challenge_type).metricKey, entry.metric_value)}
                        {entry.difficulty && DAILY_DIFFICULTIES.some(d => d.id === entry.difficulty) && (
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded border border-white/15 text-white/60"
                            title={t(DAILY_DIFFICULTIES.find(d => d.id === entry.difficulty)!.labelKey)}
                          >
                            {DAILY_DIFFICULTIES.find(d => d.id === entry.difficulty)!.icon}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
